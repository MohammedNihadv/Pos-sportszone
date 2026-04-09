import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const isDev = !app.isPackaged;
import getDb, { 
  initDb, checkDatabaseIntegrity, repairDatabase, startPeriodicCheckpoint, 
  getUsers, updateUserPin, saveUser,
  getCustomers, saveCustomer, deleteCustomer,
  getCredits, saveCredit, deleteCredit,
  clearAuditLogs, updateCustomerStats
} from './db.js';
import { logError, logInfo, getRecentLogs } from './logger.js';
import { createBackup, restoreBackup, getBackups, autoBackup, openBackupFolder, restoreFromCustomFile } from './backup.js';
import { startTelemetryLoop, logDeveloperError } from './telemetry.js';
import { runFullSync, pullFromCloud, getLastSyncTime, startAutoSync } from './cloudSync.js';
import { downloadReceiptPDF, generateReceiptImage } from './receipt.js';
import { clipboard, nativeImage } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// ─── Global error catchers ───
process.on('uncaughtException', (err) => {
  logError('UncaughtException', err);
  logDeveloperError(`UncaughtException: ${err?.stack || err?.message || err}`);
});
process.on('unhandledRejection', (reason) => {
  logError('UnhandledRejection', reason);
  logDeveloperError(`UnhandledRejection: ${reason?.stack || reason?.message || reason}`);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: 'Sports Zone',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/logo.png'),
    backgroundColor: '#0f172a',
  });

  mainWindow.setMenu(null);

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (!fs.existsSync(indexPath)) {
      dialog.showErrorBox(
        'Startup Error',
        `Required assets missing at: ${indexPath}\nPlease ensure "npm run build" was successful before packaging.`
      );
    }
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  try {
    initDb();
    createWindow();
  } catch (err) {
    logError('StartupCrash', err);
    dialog.showErrorBox(
      'System Initialization Failed',
      `Database or Window error: ${err.message}\n\nCommon fix: Run "npm install" and "npm run postinstall" to rebuild native modules.`
    );
    app.quit();
    return;
  }

  // Start Developer Telemetry
  try { startTelemetryLoop(); } catch (e) { logError('TelemetryInit', e); }

  // Start Periodic Checkpointing
  try { startPeriodicCheckpoint(); } catch (e) { logError('CheckpointInit', e); }

  // Auto-backup on startup
  try { autoBackup(); } catch (e) { logError('StartupBackup', e); }

  // Startup Database Health Check (Stage 1 Auto-Fix potential)
  try { 
    const health = checkDatabaseIntegrity();
    if (!health.success) {
       logError('DatabaseHealth', `Integrity check failed: ${health.error}`);
       // Attempt Stage 1 silent auto-repair for minor indexing issues
       const repair = repairDatabase();
       if (repair.success) {
         logInfo('DatabaseHealth', 'Stage 1 Auto-repair successful');
       } else {
         // Stage 2: Report to frontend for manual restore
         logError('DatabaseHealth', 'Critical corruption: Stage 1 repair failed.');
       }
    } else {
       logInfo('DatabaseHealth', 'Integrity check: Healthy');
    }
  } catch (e) { logError('StartupHealthCheck', e); }

  // Auto-cloud-sync loop
  try { startAutoSync(getDb()); } catch (e) { logError('StartupSync', e); }

  // Auto-updater (only in production)
  if (!isDev) {
    import('./updater.js').then(({ initAutoUpdater }) => {
      initAutoUpdater(mainWindow);
    }).catch(err => logError('UpdaterInit', err));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Helper: safe IPC wrapper ───
function safeHandle(channel, handler) {
  try {
    ipcMain.handle(channel, async (...args) => {
      try {
        return await handler(...args);
      } catch (err) {
        logError(`IPC:${channel}`, err);
        throw err;
      }
    });
  } catch (e) {
    // If a handler already exists for this channel, remove it and re-register
    if (e.message && e.message.includes('second handler')) {
      ipcMain.removeHandler(channel);
      safeHandle(channel, handler);
    } else {
      logError(`IPC:RegisterFailed:${channel}`, e);
    }
  }
}

// ─── IPC: App Info ───
safeHandle('get-app-version', () => app.getVersion());

safeHandle('get-system-health', () => {
  const dbPath = isDev
    ? path.join(process.cwd(), 'shop.db')
    : path.join(app.getPath('userData'), 'shop.db');
  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath).size; } catch (err) { /* ignore */ }

  const counts = {};
  ['products', 'sales', 'expenses', 'purchases', 'suppliers', 'categories'].forEach(t => {
    try { counts[t] = getDb().prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c; } catch { counts[t] = 0; }
  });

  return {
    version: app.getVersion() || '4.0.2',
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform,
    dbSizeKB: (dbSize / 1024).toFixed(1) || '0.0',
    recordCounts: counts,
    uptime: Math.round(process.uptime()),
  };
});

// ─── IPC: Logging ───
safeHandle('get-recent-logs', () => getRecentLogs(50));
safeHandle('log-renderer-error', (_, data) => {
  const errMsg = data.message || data.error || 'Unknown error';
  logError(`Renderer:${data.context || 'Unknown'}`, errMsg);
  logDeveloperError(`Renderer:${data.context || 'Unknown'} - ${errMsg}`);
  return true;
});

// ─── IPC: Backup & Restore ───
safeHandle('create-backup', () => createBackup());
safeHandle('get-backups', () => getBackups());
safeHandle('open-backup-folder', () => openBackupFolder());
safeHandle('restore-custom-file', async () => {
  const result = await restoreFromCustomFile();
  if (result.success) {
    app.relaunch();
    app.exit(0);
  }
  return result;
});

safeHandle('restore-backup', async (_, backupPath) => {
  const result = restoreBackup(backupPath);
  if (result.success) {
    app.relaunch();
    app.exit(0);
  }
  return result;
});

// ─── IPC: Database Health & Repair ───
safeHandle('get-db-health', () => {
  return checkDatabaseIntegrity();
});

safeHandle('repair-db', () => {
  return repairDatabase();
});

safeHandle('pull-from-cloud', async () => {
  return await pullFromCloud(getDb());
});

// ─── IPC: Updater ───
safeHandle('download-update', async () => {
  const { downloadUpdate } = await import('./updater.js');
  downloadUpdate();
  return true;
});
safeHandle('install-update', async () => {
  const { installUpdate } = await import('./updater.js');
  installUpdate();
  return true;
});
safeHandle('check-for-updates', async () => {
  const { manualCheckForUpdates } = await import('./updater.js');
  return await manualCheckForUpdates(mainWindow);
});

safeHandle('get-settings', () => {
  const rows = getDb().prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  });
  return settings;
});

safeHandle('save-settings', (_, data) => {
  const transaction = getDb().transaction((settings) => {
    const upsert = getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(settings)) {
      upsert.run(key, typeof val === 'object' ? JSON.stringify(val) : val.toString());
    }
  });
  transaction(data);
  logAudit('Settings Updated', `System configuration keys: ${Object.keys(data).join(', ')}`);
  return true;
});

safeHandle('increment-settings', (_, data) => {
  const transaction = getDb().transaction((updates) => {
    const selector = getDb().prepare('SELECT value FROM settings WHERE key = ?');
    const upsert = getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    for (const [key, delta] of Object.entries(updates)) {
      const row = selector.get(key);
      const currentVal = row ? parseFloat(row.value) || 0 : 0;
      const newVal = currentVal + (parseFloat(delta) || 0);
      upsert.run(key, newVal.toString());
    }
  });
  transaction(data);
  return true;
});

safeHandle('verify-pin', async (_, data) => {
  // Flexibility: handle both object { pin } and direct string "1234"
  const pin = typeof data === 'object' ? data.pin : data;
  const role = typeof data === 'object' ? data.role : null;
  
  const users = getUsers();
  // String comparison to ensure PINs like "0000" match correctly
  const user = users.find(u => String(u.pin) === String(pin) && (!role || u.role === role));
  return !!user;
});

safeHandle('update-pin', async (_, { userId, newPin }) => {
  const result = updateUserPin(userId, newPin);
  logAudit('Changed User PIN', `User ID ${userId} updated their security PIN`);
  
  // Real-time Cloud Sync for immediate developer recovery
  await runFullSync(getDb()).catch(err => logError('RealtimeSync:UserPin', err));
  
  return result.changes > 0;
});

safeHandle('get-users', () => getUsers());

safeHandle('save-user', async (_, user) => {
  const result = saveUser(user);
  
  // Real-time Cloud Sync for immediate developer recovery
  runFullSync(getDb()).catch(err => logError('RealtimeSync:UserEdit', err));
  
  return result.changes > 0;
});

function logAudit(action, details) {
  try {
    getDb().prepare("INSERT INTO audit_logs (action, details) VALUES (?, ?)").run(action, details);
  } catch(e) { logError('AuditLog', e); /* already logged */ }
}

// ─── IPC: Products ───
safeHandle('get-products', () => {
  return getDb().prepare('SELECT * FROM products ORDER BY category, name').all();
});

const handleSaveProduct = async (_, p) => {
  const db = getDb();
  if (p.id) {
    db.prepare('UPDATE products SET name=?, sku=?, barcode=?, price=?, cost=?, stock=?, category=?, emoji=? WHERE id=?')
      .run(p.name, p.sku, p.barcode, p.price, p.cost, p.stock, p.category, p.emoji, p.id);
    logAudit('Updated Product', `Product updated: ${p.name} (SKU: ${p.sku})`);
    return p;
  } else {
    // Check if a product with this SKU already exists to convert to an UPDATE if ID is missing from frontend
    const existing = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)').get(String(p.sku || '').trim());
    if (existing) {
      db.prepare('UPDATE products SET name=?, barcode=?, price=?, cost=?, stock=?, category=?, emoji=? WHERE id=?')
        .run(p.name, p.barcode, p.price, p.cost, p.stock, p.category, p.emoji, existing.id);
      logAudit('Updated Product (Sync)', `Product SKU ${p.sku} synced/updated`);
      return { ...p, id: existing.id };
    }
    
    const info = db.prepare('INSERT INTO products (name, sku, barcode, price, cost, stock, category, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(p.name, p.sku, p.barcode, p.price, p.cost, p.stock, p.category, p.emoji);
    logAudit('Added Product', `New product created: ${p.name} (Price: ${p.price})`);
    return { ...p, id: info.lastInsertRowid };
  }
};

safeHandle('save-product', handleSaveProduct);
safeHandle('add-product', handleSaveProduct);
safeHandle('update-product', handleSaveProduct);
safeHandle('delete-product', (_, id) => {
  const p = getDb().prepare('SELECT name FROM products WHERE id=?').get(id);
  getDb().prepare('DELETE FROM products WHERE id=?').run(id);
  if (p) logAudit('Deleted Product', `Product deleted: ${p.name}`);
  return true;
});

// ─── IPC: Expense Categories ───
safeHandle('get-expense-categories', () => {
  return getDb().prepare('SELECT * FROM expense_categories ORDER BY name').all();
});

safeHandle('save-expense-category', (_, cat) => {
  if (cat.id) {
    getDb().prepare('UPDATE expense_categories SET name=? WHERE id=?').run(cat.name, cat.id);
    return cat;
  } else {
    const info = getDb().prepare('INSERT INTO expense_categories (name) VALUES (?)').run(cat.name);
    return { ...cat, id: info.lastInsertRowid };
  }
});

safeHandle('delete-expense-category', (_, id) => {
  getDb().prepare('DELETE FROM expense_categories WHERE id=?').run(id);
  return true;
});

// ─── IPC: Sales ───
safeHandle('save-sale', (_, sale) => {
  const db = getDb();
  const saleDate = sale.date || new Date().toISOString();
  
  const transaction = db.transaction((s) => {
    if (s.id) {
      db.prepare('UPDATE sales SET total=?, discount=?, payment_method=?, amount_paid=?, change_amount=?, items=?, payment_breakdown=?, change_return_method=?, date=? WHERE id=?')
        .run(s.total, s.discount, s.paymentMethod, s.amountPaid !== undefined ? s.amountPaid : s.total, s.changeAmount || 0, JSON.stringify(s.items), s.paymentBreakdown ? JSON.stringify(s.paymentBreakdown) : null, s.changeReturnMethod || null, saleDate, s.id);
      logAudit('Updated Sale', `Sale ID ${s.id} updated (Method: ${s.paymentMethod})`);
      return { id: s.id };
    } else {
      const info = db.prepare('INSERT INTO sales (total, discount, payment_method, amount_paid, change_amount, items, payment_breakdown, change_return_method, date, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(s.total, s.discount, s.paymentMethod, s.amountPaid !== undefined ? s.amountPaid : s.total, s.changeAmount || 0, JSON.stringify(s.items), s.paymentBreakdown ? JSON.stringify(s.paymentBreakdown) : null, s.changeReturnMethod || null, saleDate, s.customerId || null);

      const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(item => {
          updateStock.run(item.qty, item.id);
        });
      }

      // Update customer stats if linked
      if (s.creditCustomer || s.customerName) {
        const cName = s.creditCustomer || s.customerName;
        updateCustomerStats(cName, s.total, saleDate);
      }

      return { id: info.lastInsertRowid };
    }
  });

  try {
    return transaction(sale);
  } catch (err) {
    logError('SaveSaleTransaction', err);
    throw err; // Ensure the frontend sees the error
  }
});

safeHandle('get-sales', () => {
  try {
    const rawSales = getDb().prepare(`
      SELECT s.*, c.name as customer_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id 
      ORDER BY s.date DESC
    `).all();
    return rawSales.map(s => {
      let items = [];
      let paymentBreakdown = [];
      try { items = JSON.parse(s.items || '[]'); } catch (e) { logError('ParseSaleItems', e); }
      try { paymentBreakdown = JSON.parse(s.payment_breakdown || '[]'); } catch (e) { /* ignore */ }
      
      return { 
        ...s, 
        items,
        amountPaid: s.amount_paid,
        changeAmount: s.change_amount,
        paymentMethod: s.payment_method,
        paymentBreakdown: paymentBreakdown.length > 0 ? paymentBreakdown : [{ method: s.payment_method || 'cash', amount: s.amount_paid || s.total }],
        changeReturnMethod: s.change_return_method
      };
    });
  } catch (err) {
    logError('GetSales', err);
    return [];
  }
});

safeHandle('delete-sale', (_, id) => {
  const sale = getDb().prepare('SELECT * FROM sales WHERE id = ?').get(id);
  if (!sale) return false;

  const items = JSON.parse(sale.items);
  const restoreStock = getDb().prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

  const transaction = getDb().transaction(() => {
    items.forEach(item => restoreStock.run(item.qty, item.id));
    getDb().prepare('DELETE FROM sales WHERE id = ?').run(id);
  });

  transaction();
  logAudit('Deleted Sale', `Sale ID ${id} deleted (Total: ${sale.total})`);
  return true;
});

// ─── IPC: Expenses ───
safeHandle('get-expenses', () => {
  return getDb().prepare('SELECT * FROM expenses ORDER BY date DESC').all();
});

safeHandle('save-expense', (_, e) => {
  const info = getDb().prepare('INSERT INTO expenses (date, category, description, amount, payment_method) VALUES (?, ?, ?, ?, ?)')
    .run(e.date, e.category, e.description, e.amount, e.paymentMethod);
  return { id: info.lastInsertRowid };
});

safeHandle('delete-expense', (_, id) => {
  getDb().prepare('DELETE FROM expenses WHERE id=?').run(id);
  return true;
});

// ─── IPC: Purchases ───
safeHandle('get-purchases', () => {
  return getDb().prepare('SELECT * FROM purchases ORDER BY date DESC').all();
});

safeHandle('save-purchase', (_, p) => {
  const info = getDb().prepare('INSERT OR REPLACE INTO purchases (id, date, supplier, invoice, items_count, total, paid, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(p.id, p.date, p.supplier, p.invoice, p.items, p.total, p.paid, p.status, p.paymentMethod);
  return { id: p.id || info.lastInsertRowid };
});

safeHandle('delete-purchase', (_, id) => {
  getDb().prepare('DELETE FROM purchases WHERE id=?').run(id);
  return true;
});

// ─── IPC: Categories ───
safeHandle('get-categories', () => {
  return getDb().prepare('SELECT * FROM categories ORDER BY name').all();
});

safeHandle('save-category', (_, cat) => {
  if (cat.id) {
    getDb().prepare('UPDATE categories SET name=? WHERE id=?').run(cat.name, cat.id);
    return cat;
  } else {
    const info = getDb().prepare('INSERT INTO categories (name) VALUES (?)').run(cat.name);
    return { ...cat, id: info.lastInsertRowid };
  }
});

safeHandle('delete-category', (_, id) => {
  getDb().prepare('DELETE FROM categories WHERE id=?').run(id);
  return true;
});

// ─── IPC: Suppliers ───
safeHandle('get-suppliers', () => {
  return getDb().prepare('SELECT * FROM suppliers ORDER BY name').all();
});

safeHandle('save-supplier', (_, s) => {
  if (s.id) {
    getDb().prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=? WHERE id=?')
      .run(s.name, s.phone || null, s.email || null, s.address || null, s.id);
    return s;
  } else {
    const info = getDb().prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)')
      .run(s.name, s.phone || null, s.email || null, s.address || null);
    return { ...s, id: info.lastInsertRowid };
  }
});

safeHandle('delete-supplier', (_, id) => {
  getDb().prepare('DELETE FROM suppliers WHERE id=?').run(id);
  return true;
});

safeHandle('add-supplier', (_, name) => {
  const info = getDb().prepare('INSERT INTO suppliers (name) VALUES (?)').run(name);
  return { id: info.lastInsertRowid };
});

// ─── IPC: Cloud Sync ───
safeHandle('sync-to-cloud', async () => {
  return await runFullSync(getDb());
});

safeHandle('get-last-sync-time', () => {
  return getLastSyncTime(getDb());
});

// ─── IPC: Receipt Download ───
safeHandle('download-receipt', async (_, sale) => {
  const rows = getDb().prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });
  return await downloadReceiptPDF(mainWindow, sale, settings);
});

safeHandle('get-receipt-preview', async (_, sale) => {
  const rows = getDb().prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });
  return await generateReceiptImage(sale, settings);
});

safeHandle('copy-image-to-clipboard', async (_, dataUrl) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
    return true;
  } catch (err) {
    logError('Clipboard', err);
    return false;
  }
});

safeHandle('download-receipt-png', async (_, sale) => {
  try {
    const rows = getDb().prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    });
    const dataUrl = await generateReceiptImage(sale, settings);
    if (!dataUrl) return { success: false, error: 'Failed to generate image' };

    const saleId = sale.id || Date.now();
    const receiptDir = path.join(app.getPath('documents'), 'SportsZone', 'Receipts');
    if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });
    const filePath = path.join(receiptDir, `receipt_INV_${saleId}_${Date.now()}.png`);
    
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, base64, 'base64');
    logInfo('Receipt', `Saved PNG: ${filePath}`);
    shell.showItemInFolder(filePath);
    return { success: true, path: filePath };
  } catch (err) {
    logError('ReceiptPNG', err);
    return { success: false, error: err.message };
  }
});

safeHandle('open-external-url', async (_, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    logError('OpenExternal', err);
    return false;
  }
});

safeHandle('get-audit-logs', () => {
  return getDb().prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();
});

// ─── IPC: Customers ───
safeHandle('get-customers', () => getCustomers());
safeHandle('save-customer', (_, customer) => {
  const res = saveCustomer(customer);
  logAudit('Customer Saved', `Customer: ${customer.name}`);
  return res;
});
safeHandle('delete-customer', (_, id) => {
  const res = deleteCustomer(id);
  logAudit('Customer Deleted', `ID: ${id}`);
  return res;
});

// ─── IPC: Credits (Pay Later) ───
safeHandle('get-credits', () => getCredits());
safeHandle('save-credit', (_, credit) => {
  const res = saveCredit(credit);
  logAudit('Credit Recorded', `Customer: ${credit.customer_name || 'Unknown'}, Amount: ${credit.pending || 0}`);
  return res;
});

safeHandle('delete-credit', (_, id) => {
  const res = deleteCredit(id);
  logAudit('Credit Deleted', `Record ID: ${id}`);
  return res;
});

// ─── IPC: Audit Logs ───
safeHandle('clear-audit-logs', async () => {
  clearAuditLogs();
  logAudit('Audit Trail Cleared', 'Local audit logs were wiped by user');
  
  // Also clear cloud logs if online
  try {
    const { supabase } = await import('./supabase.js');
    const { error } = await supabase.from('cloud_audit_logs').delete().neq('local_id', 0);
    if (error) logError('CloudAuditClear', error);
  } catch (err) {
    logError('CloudAuditClear:Import', err);
  }
  
  return true;
});

