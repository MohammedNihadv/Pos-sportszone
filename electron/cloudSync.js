import { supabase } from './supabase.js';
import { logError, logInfo } from './logger.js';

/**
 * Cloud Sync Module — One-way push (local SQLite → Supabase)
 * Safe, non-destructive. Upserts rows using local IDs as keys.
 */

// ─── Helpers ───

function getLastSyncTime(db) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'last_cloud_sync'").get();
    return row ? row.value : null;
  } catch {
    return null;
  }
}

function setLastSyncTime(db) {
  const now = new Date().toISOString();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_cloud_sync', ?)").run(now);
  return now;
}

// ─── Sync individual tables ───

async function syncSales(db) {
  const rows = db.prepare('SELECT * FROM sales ORDER BY id').all();
  if (rows.length === 0) return { table: 'sales', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    date: r.date,
    total: r.total,
    discount: r.discount || 0,
    payment_method: r.payment_method || 'cash',
    customer_id: r.customer_id || null,
    items: r.items, // JSON string
  }));

  const { error } = await supabase
    .from('cloud_sales')
    .upsert(payload, { onConflict: 'local_id' });

  if (error) throw new Error(`cloud_sales upsert failed: ${error.message}`);
  return { table: 'sales', synced: rows.length };
}

async function syncExpenses(db) {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY id').all();
  if (rows.length === 0) return { table: 'expenses', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    date: r.date,
    category: r.category,
    description: r.description || '',
    amount: r.amount,
    payment_method: r.payment_method || 'cash',
  }));

  const { error } = await supabase
    .from('cloud_expenses')
    .upsert(payload, { onConflict: 'local_id' });

  if (error) throw new Error(`cloud_expenses upsert failed: ${error.message}`);
  return { table: 'expenses', synced: rows.length };
}

async function syncProducts(db) {
  const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
  if (rows.length === 0) return { table: 'products', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    name: r.name,
    sku: r.sku || '',
    barcode: r.barcode || '',
    price: r.price || 0,
    cost: r.cost || 0,
    stock: r.stock || 0,
    category: r.category || '',
    emoji: r.emoji || '📦',
  }));

  const { error } = await supabase
    .from('cloud_products')
    .upsert(payload, { onConflict: 'local_id' });

  if (error) throw new Error(`cloud_products upsert failed: ${error.message}`);
  return { table: 'products', synced: rows.length };
}

async function syncSuppliers(db) {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY id').all();
  if (rows.length === 0) return { table: 'suppliers', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    name: r.name,
    phone: r.phone || '',
    email: r.email || '',
    address: r.address || '',
  }));

  const { error } = await supabase
    .from('cloud_suppliers')
    .upsert(payload, { onConflict: 'local_id' });

  if (error) throw new Error(`cloud_suppliers upsert failed: ${error.message}`);
  return { table: 'suppliers', synced: rows.length };
}

async function syncCategories(db) {
  const rows = db.prepare('SELECT * FROM categories ORDER BY id').all();
  if (rows.length === 0) return { table: 'categories', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    name: r.name,
  }));

  const { error } = await supabase
    .from('cloud_categories')
    .upsert(payload, { onConflict: 'local_id' });

  if (error) throw new Error(`cloud_categories upsert failed: ${error.message}`);
  return { table: 'categories', synced: rows.length };
}

// ─── Full Sync Orchestrator ───

export async function runFullSync(db) {
  const results = { success: false, synced: {}, errors: [], lastSync: null };

  const syncTasks = [
    { name: 'sales', fn: syncSales },
    { name: 'expenses', fn: syncExpenses },
    { name: 'products', fn: syncProducts },
    { name: 'suppliers', fn: syncSuppliers },
    { name: 'categories', fn: syncCategories }
  ];

  for (const task of syncTasks) {
    try {
      const res = await task.fn(db);
      results.synced[task.name] = res.synced;
    } catch (err) {
      results.errors.push(`${task.name}: ${err.message}`);
      logError(`CloudSync:${task.name}`, err);
    }
  }

  // Mark success if at least one table synced without error
  results.success = results.errors.length === 0;
  results.lastSync = setLastSyncTime(db);

  logInfo('CloudSync', `Sync complete: ${JSON.stringify(results.synced)} | Errors: ${results.errors.length}`);
  return results;
}

export async function pullFromCloud(db) {
  const results = { success: true, pulled: {}, errors: [] };
  
  const tables = [
    { local: 'categories', cloud: 'cloud_categories' },
    { local: 'suppliers', cloud: 'cloud_suppliers' },
    { local: 'products', cloud: 'cloud_products' },
    { local: 'expenses', cloud: 'cloud_expenses' },
    { local: 'sales', cloud: 'cloud_sales' }
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t.cloud).select('*');
      if (error) throw error;
      if (!data || data.length === 0) continue;

      let count = 0;
      const columns = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at');
      
      const placeholders = columns.map(c => c === 'local_id' ? '?' : '?').join(', ');
      const colNames = columns.map(c => c === 'local_id' ? 'id' : c).join(', ');

      const upsertStmt = db.prepare(`INSERT OR REPLACE INTO ${t.local} (${colNames}) VALUES (${placeholders})`);
      
      const transaction = db.transaction((rows) => {
        for (const row of rows) {
          const vals = columns.map(c => row[c]);
          upsertStmt.run(...vals);
          count++;
        }
      });

      transaction(data);
      results.pulled[t.local] = count;
    } catch (err) {
      results.success = false;
      results.errors.push(`${t.local}: ${err.message}`);
      logError(`CloudPull:${t.local}`, err);
    }
  }

  return results;
}

export function startAutoSync(db) {
  // Sync every 5 minutes (reduced from 30m for higher data safety)
  setInterval(() => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'autoSync'").get();
      const enabled = row ? (row.value === 'true' || row.value === '1') : true; // Default to true
      
      if (enabled) {
        runFullSync(db).catch(err => logError('AutoSync', err));
      }
    } catch (e) {
      logError('AutoSyncToggleCheck', e);
    }
  }, 5 * 60 * 1000);
}

export { getLastSyncTime };
