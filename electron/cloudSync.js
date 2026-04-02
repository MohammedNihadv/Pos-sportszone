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

// ─── Full Sync Orchestrator ───

export async function runFullSync(db) {
  const results = { success: false, synced: {}, errors: [], lastSync: null };

  try {
    const salesResult = await syncSales(db);
    results.synced.sales = salesResult.synced;
  } catch (err) {
    results.errors.push(`Sales: ${err.message}`);
    logError('CloudSync:Sales', err);
  }

  try {
    const expensesResult = await syncExpenses(db);
    results.synced.expenses = expensesResult.synced;
  } catch (err) {
    results.errors.push(`Expenses: ${err.message}`);
    logError('CloudSync:Expenses', err);
  }

  try {
    const productsResult = await syncProducts(db);
    results.synced.products = productsResult.synced;
  } catch (err) {
    results.errors.push(`Products: ${err.message}`);
    logError('CloudSync:Products', err);
  }

  // Mark success if at least one table synced without error
  results.success = results.errors.length === 0;
  results.lastSync = setLastSyncTime(db);

  logInfo('CloudSync', `Sync complete: ${JSON.stringify(results.synced)} | Errors: ${results.errors.length}`);
  return results;
}

export function startAutoSync(db) {
  // Sync every 30 minutes
  setInterval(() => {
    runFullSync(db).catch(err => logError('AutoSync', err));
  }, 30 * 60 * 1000);
}

export { getLastSyncTime };
