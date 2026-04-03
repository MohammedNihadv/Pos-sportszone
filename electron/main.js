import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import getDb, { initDb, checkDatabaseIntegrity, repairDatabase } from './db.js';
import { logError, logInfo, getRecentLogs } from './logger.js';
import { createBackup, restoreBackup, getBackups, autoBackup, openBackupFolder, restoreFromCustomFile } from './backup.js';
import { startTelemetryLoop, logDeveloperError } from './telemetry.js';
import { runFullSync, pullFromCloud, getLastSyncTime, startAutoSync } from './cloudSync.js';
import { downloadReceiptPDF } from './receipt.js';

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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/logo.png'),
  });

  mainWindow.setMenu(null);

  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(url);
  if (isDev) mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  // Start Developer Telemetry
  try { startTelemetryLoop(); } catch (e) { logError('TelemetryInit', e); }

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
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      logError(`IPC:${channel}`, err);
      throw err;
    }
  });
}

// ─── IPC: App Info ───
safeHandle('get-app-version', () => app.getVersion());

safeHandle('get-system-health', () => {
  const dbPath = isDev
    ? path.join(process.cwd(), 'shop.db')
    : path.join(app.getPath('userData'), 'shop.db');
  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath).size; } catch {}

  const counts = {};
  ['products', 'sales', 'expenses', 'purchases', 'suppliers', 'categories'].forEach(t => {
    try { counts[t] = getDb().prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c; } catch { counts[t] = 0; }
  });

  return {
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform,
    dbSizeKB: (dbSize / 1024).toFixed(1),
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

// ─── IPC: Authentication & Audit Logs ───
safeHandle('verify-pin', (_, submittedPin) => {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'owner_pin'").get();
  return row && row.value === submittedPin;
});

safeHandle('update-pin', (_, newPin) => {
  getDb().prepare("UPDATE settings SET value = ? WHERE key = 'owner_pin'").run(newPin);
  getDb().prepare("INSERT INTO audit_logs (action, details) VALUES (?, ?)").run('Changed Settings', 'Owner PIN updated');
  return true;
});

safeHandle('get-audit-logs', () => {
  return getDb().prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();
});

function logAudit(action, details) {
  try {
    getDb().prepare("INSERT INTO audit_logs (action, details) VALUES (?, ?)").run(action, details);
  } catch(e) { logError('AuditLog', e); }
}

// ─── IPC: Products ───
safeHandle('get-products', () => {
  return getDb().prepare('SELECT * FROM products ORDER BY category, name').all();
});

const handleSaveProduct = async (_, p) => {
  if (p.id) {
    getDb().prepare('UPDATE products SET name=?, sku=?, barcode=?, price=?, cost=?, stock=?, category=?, emoji=? WHERE id=?')
      .run(p.name, p.sku, p.barcode, p.price, p.cost, p.stock, p.category, p.emoji, p.id);
    return p;
  } else {
    const info = getDb().prepare('INSERT INTO products (name, sku, barcode, price, cost, stock, category, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(p.name, p.sku, p.barcode, p.price, p.cost, p.stock, p.category, p.emoji);
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
  if (sale.id) {
    getDb().prepare('UPDATE sales SET total=?, discount=?, payment_method=?, amount_paid=?, change_amount=?, items=? WHERE id=?')
      .run(sale.total, sale.discount, sale.paymentMethod, sale.amountPaid !== undefined ? sale.amountPaid : sale.total, sale.changeAmount || 0, JSON.stringify(sale.items), sale.id);
    logAudit('Updated Sale', `Sale ID ${sale.id} updated (Method: ${sale.paymentMethod})`);
    return { id: sale.id };
  } else {
    const info = getDb().prepare('INSERT INTO sales (total, discount, payment_method, amount_paid, change_amount, items) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sale.total, sale.discount, sale.paymentMethod, sale.amountPaid !== undefined ? sale.amountPaid : sale.total, sale.changeAmount || 0, JSON.stringify(sale.items));

    const updateStock = getDb().prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    sale.items.forEach(item => {
      updateStock.run(item.qty, item.id);
    });
    return { id: info.lastInsertRowid };
  }
});

safeHandle('get-sales', () => {
  try {
    const rawSales = getDb().prepare('SELECT * FROM sales ORDER BY date DESC').all();
    return rawSales.map(s => {
      let items = [];
      try { items = JSON.parse(s.items || '[]'); } catch (e) { logError('ParseSaleItems', e); }
      
      return { 
        ...s, 
        items,
        amountPaid: s.amount_paid,
        changeAmount: s.change_amount,
        paymentMethod: s.payment_method
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
  const insert = getDb().prepare('INSERT OR REPLACE INTO purchases (id, date, supplier, invoice, items_count, total, paid, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insert.run(p.id, p.date, p.supplier, p.invoice, p.items, p.total, p.paid, p.status, p.paymentMethod);
  return true;
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
      .run(s.name, s.phone, s.email, s.address, s.id);
    return s;
  } else {
    const info = getDb().prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)')
      .run(s.name, s.phone, s.email, s.address);
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
  return await downloadReceiptPDF(mainWindow, sale);
});

