import { supabase } from './supabase.js';
import { logError, logInfo } from './logger.js';
import { getDeviceId, getHostname } from './device.js';

/**
 * Cloud Sync Module — One-way push (local SQLite → Supabase)
 * Safe, non-destructive. Upserts rows using local IDs as keys.
 */

// ─── Helpers ───

export function getLastSyncTime(db) {
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
    machine_id: getDeviceId(),
    hostname: getHostname(),
    date: r.date,
    total: r.total,
    discount: r.discount || 0,
    payment_method: r.payment_method || 'cash',
    customer_id: r.customer_id || null,
    items: r.items, // JSON string
    amount_paid: r.amount_paid || r.total || 0,
    change_amount: r.change_amount || 0,
    payment_breakdown: r.payment_breakdown || null, // JSON string
    change_return_method: r.change_return_method || null,
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_sales')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_sales upsert failed: ${error.message}`);
  return { table: 'sales', synced: rows.length };
}

async function syncExpenses(db) {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY id').all();
  if (rows.length === 0) return { table: 'expenses', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    machine_id: getDeviceId(),
    hostname: getHostname(),
    date: r.date,
    category: r.category,
    description: r.description || '',
    amount: r.amount,
    payment_method: r.payment_method || 'cash',
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_expenses')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_expenses upsert failed: ${error.message}`);
  return { table: 'expenses', synced: rows.length };
}

async function syncProducts(db) {
  const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
  if (rows.length === 0) return { table: 'products', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    machine_id: getDeviceId(),
    hostname: getHostname(),
    name: r.name,
    sku: r.sku || '',
    barcode: r.barcode || '',
    price: r.price || 0,
    cost: r.cost || 0,
    stock: r.stock || 0,
    category: r.category || '',
    emoji: r.emoji || '📦',
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_products')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_products upsert failed: ${error.message}`);
  return { table: 'products', synced: rows.length };
}

async function syncSuppliers(db) {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY id').all();
  if (rows.length === 0) return { table: 'suppliers', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    machine_id: getDeviceId(),
    hostname: getHostname(),
    name: r.name,
    phone: r.phone || '',
    email: r.email || '',
    address: r.address || '',
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_suppliers')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_suppliers upsert failed: ${error.message}`);
  return { table: 'suppliers', synced: rows.length };
}

async function syncCategories(db) {
  const rows = db.prepare('SELECT * FROM categories ORDER BY id').all();
  if (rows.length === 0) return { table: 'categories', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    machine_id: getDeviceId(),
    name: r.name,
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_categories')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_categories upsert failed: ${error.message}`);
  return { table: 'categories', synced: rows.length };
}

async function syncPurchases(db) {
  const rows = db.prepare('SELECT * FROM purchases ORDER BY id').all();
  if (rows.length === 0) return { table: 'purchases', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    machine_id: getDeviceId(),
    hostname: getHostname(),
    date: r.date,
    supplier: r.supplier,
    invoice: r.invoice || '',
    items_count: r.items_count || 0,
    total: r.total || 0,
    paid: r.paid || 0,
    status: r.status || 'pending',
    payment_method: r.payment_method || 'cash',
    payment_breakdown: r.payment_breakdown || null,
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_purchases')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_purchases upsert failed: ${error.message}`);
  return { table: 'purchases', synced: rows.length };
}

async function syncUsers(db) {
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
  if (rows.length === 0) return { table: 'users', synced: 0 };

  const payload = rows.map(r => ({
    local_id: r.id,
    machine_id: getDeviceId(),
    hostname: getHostname(),
    name: r.name,
    role: r.role,
    pin: r.pin, // Only PIN for recovery as requested
    is_deleted: r.is_deleted || 0
  }));

  const { error } = await supabase
    .from('cloud_users')
    .upsert(payload, { onConflict: ['machine_id', 'local_id'] });

  if (error) throw new Error(`cloud_users upsert failed: ${error.message}`);
  return { table: 'users', synced: rows.length };
}

// ─── Full Sync Orchestrator ───

export async function runFullSync(db, role = 'Staff') {
  const results = { success: false, synced: {}, errors: [], lastSync: null, pulled: {} };

  // ─── Remote Command Check ───
  try {
    const { data: cmd, error: cmdErr } = await supabase
      .from('cloud_commands')
      .select('*')
      .eq('status', 'pending')
      .eq('command', 'CLEAR_LOGS')
      .and(`machine_id.is.null,machine_id.eq.${getDeviceId()}`)
      .limit(1)
      .single();
    
    if (cmd && !cmdErr) {
      logInfo('CloudSync:RemoteCommand', 'Received CLEAR_LOGS command from cloud');
      db.prepare('DELETE FROM audit_logs').run();
      await supabase.from('cloud_commands').update({ status: 'executed' }).eq('id', cmd.id);
    }
  } catch (e) {
    // Ignore if table doesn't exist yet or other syncing issues
  }

  // 1. Always Push (All Roles)
  const syncTasks = [
    { name: 'sales', fn: syncSales },
    { name: 'expenses', fn: syncExpenses },
    { name: 'products', fn: syncProducts },
    { name: 'suppliers', fn: syncSuppliers },
    { name: 'categories', fn: syncCategories },
    { name: 'purchases', fn: syncPurchases },
    { name: 'users', fn: syncUsers },
// ...
    { name: 'customers', fn: async (db) => {
      const rows = db.prepare('SELECT * FROM customers ORDER BY id').all();
      if (rows.length === 0) return { table: 'customers', synced: 0 };
      const payload = rows.map(r => ({ 
        local_id: r.id, 
        machine_id: getDeviceId(),
        hostname: getHostname(),
        name: r.name, phone: r.phone, email: r.email, orders: r.orders, total: r.total, last_order: r.last_order,
        is_deleted: r.is_deleted || 0
      }));
      const { error } = await supabase.from('cloud_customers').upsert(payload, { onConflict: ['machine_id', 'local_id'] });
      if (error) throw error;
      return { table: 'customers', synced: rows.length };
    }},
    { name: 'credits', fn: async (db) => {
      const rows = db.prepare('SELECT * FROM credits ORDER BY id').all();
      if (rows.length === 0) return { table: 'credits', synced: 0 };
      const payload = rows.map(r => ({ 
        local_id: r.id, 
        machine_id: getDeviceId(),
        hostname: getHostname(),
        customer_id: r.customer_id, customer_name: r.customer_name, total: r.total, paid: r.paid, pending: r.pending, date: r.date, items: r.items,
        is_deleted: r.is_deleted || 0
      }));
      const { error } = await supabase.from('cloud_credits').upsert(payload, { onConflict: ['machine_id', 'local_id'] });
      if (error) throw error;
      return { table: 'credits', synced: rows.length };
    }},
    { name: 'audit_logs', fn: async (db) => {
      const rows = db.prepare('SELECT * FROM audit_logs ORDER BY id').all();
      if (rows.length === 0) return { table: 'audit_logs', synced: 0 };
      const payload = rows.map(r => ({ 
        local_id: r.id, 
        machine_id: getDeviceId(),
        hostname: getHostname(),
        user_role: r.user_role, action: r.action, details: r.details, timestamp: r.timestamp 
      }));
      const { error } = await supabase.from('cloud_audit_logs').upsert(payload, { onConflict: ['machine_id', 'local_id'] });
      if (error) throw error;
      return { table: 'audit_logs', synced: rows.length };
    }}
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

  // 2. Pull if Owner (Multi-Device Refresh)
  if (role === 'Owner') {
    try {
      logInfo('CloudSync:OwnerPull', 'Starting background cloud pull for Owner');
      const pullRes = await pullFromCloud(db);
      results.pulled = pullRes.pulled;
      if (!pullRes.success) results.errors.push(...pullRes.errors);
    } catch (err) {
      logError('CloudSync:OwnerPull', err);
    }
  }

  // Mark success if no errors
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
    { local: 'sales', cloud: 'cloud_sales' },
    { local: 'purchases', cloud: 'cloud_purchases' },
    { local: 'users', cloud: 'cloud_users' },
    { local: 'credits', cloud: 'cloud_credits' },
    { local: 'customers', cloud: 'cloud_customers' }
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t.cloud).select('*');
      if (error) throw error;
      if (!data || data.length === 0) continue;

      let count = 0;
      
      // Safety: Only map Supabase columns to existing local SQLite columns
      const tableInfo = db.prepare(`PRAGMA table_info(${t.local})`).all();
      const validLocalColumns = new Set(tableInfo.map(col => col.name));

      const dataColumns = Object.keys(data[0]);
      const columns = dataColumns.filter(c => {
        // Exclude completely Supabase-only columns
        if (['id', 'created_at', 'synced_at', 'updated_at'].includes(c)) return false;
        // Check if the target local column exists
        const mappingCol = c === 'local_id' ? 'id' : c;
        return validLocalColumns.has(mappingCol);
      });
      
      const placeholders = columns.map(() => '?').join(', ');
      const colNames = columns.map(c => c === 'local_id' ? 'id' : c).join(', ');

      const upsertStmt = db.prepare(`INSERT OR REPLACE INTO ${t.local} (${colNames}) VALUES (${placeholders})`);
      
      const transaction = db.transaction((rows) => {
        for (const row of rows) {
          const vals = columns.map(c => {
            const val = row[c];
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
          });
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

let currentActiveRole = 'Staff';

export function startAutoSync(db) {
  // Initial sync
  runFullSync(db, currentActiveRole).catch(e => logError('InitialSync', e));

  // Sync every 5 minutes
  setInterval(() => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'autoSync'").get();
      const enabled = row ? (row.value === 'true' || row.value === '1') : true; 
      
      if (enabled) {
        runFullSync(db, currentActiveRole).catch(err => logError('AutoSync', err));
      }
    } catch (e) {
      logError('AutoSyncToggleCheck', e);
    }
  }, 5 * 60 * 1000);
}

export function setActiveRole(role) {
  currentActiveRole = role;
  logInfo('CloudSync:RoleUpdate', `System role updated to: ${role}`);
}
