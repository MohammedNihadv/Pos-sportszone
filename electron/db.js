import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const isDev = !app.isPackaged;

let db;

function getDbPath() {
  return isDev 
    ? path.join(process.cwd(), 'shop.db')
    : path.join(app.getPath('userData'), 'shop.db');
}

// Initialize Schema
export function initDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  // Products table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT,
      price REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      category TEXT,
      emoji TEXT
    )
  `).run();

  // Expense Categories table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `).run();

  // Migration: Add barcode if it doesn't exist (using try/catch for safety)
  try {
    db.prepare("ALTER TABLE products ADD COLUMN barcode TEXT DEFAULT ''").run();
    // Column already exists or table is new
  } catch (e) { /* ignore */ }

  // Sales table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      total REAL NOT NULL,
      discount REAL DEFAULT 0,
      payment_method TEXT,
      customer_id INTEGER,
      items JSON
    )
  `).run();

  // Migration: Add tender and change tracking
  try { db.prepare("ALTER TABLE sales ADD COLUMN amount_paid REAL DEFAULT 0").run(); } catch(e){ /* ignore */ }
  try { db.prepare("ALTER TABLE sales ADD COLUMN change_amount REAL DEFAULT 0").run(); } catch(e){ /* ignore */ }
  try { db.prepare("ALTER TABLE sales ADD COLUMN payment_breakdown JSON").run(); } catch(e){ /* ignore */ }
  try { db.prepare("ALTER TABLE sales ADD COLUMN change_return_method TEXT").run(); } catch(e){ /* ignore */ }

  // Expenses table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      payment_method TEXT
    )
  `).run();

  // Purchases table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      supplier TEXT NOT NULL,
      invoice TEXT,
      items_count INTEGER,
      total REAL NOT NULL,
      paid REAL DEFAULT 0,
      status TEXT,
      payment_method TEXT
    )
  `).run();

  try { db.prepare("ALTER TABLE purchases ADD COLUMN payment_breakdown JSON").run(); } catch(e){ /* ignore */ }

  // Categories table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `).run();

  // Suppliers table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT
    )
  `).run();

  // Settings table (for PIN etc)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL
    )
  `).run();

  // Audit Logs table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_role TEXT DEFAULT 'Owner',
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      machine_id TEXT,
      hostname TEXT
    )
  `).run();

  // Customers table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT,
      orders INTEGER DEFAULT 0,
      total REAL DEFAULT 0,
      last_order TEXT,
      machine_id TEXT,
      hostname TEXT,
      is_deleted INTEGER DEFAULT 0
    )
  `).run();

  // Credits (Pay Later) table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      total REAL NOT NULL,
      paid REAL DEFAULT 0,
      pending REAL DEFAULT 0,
      date TEXT DEFAULT CURRENT_DATE,
      items TEXT,
      machine_id TEXT,
      hostname TEXT,
      is_deleted INTEGER DEFAULT 0
    )
  `).run();

  // Remote Commands table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS remote_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, executed
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Add machine_id and hostname to tables
  const syncTables = ['sales', 'expenses', 'products', 'purchases', 'customers', 'credits', 'audit_logs', 'users', 'categories', 'suppliers', 'expense_categories'];
  syncTables.forEach(t => {
    try { db.prepare(`ALTER TABLE ${t} ADD COLUMN machine_id TEXT`).run(); } catch(e){}
    try { db.prepare(`ALTER TABLE ${t} ADD COLUMN hostname TEXT`).run(); } catch(e){}
  });

  // Soft Delete Migrations (Phase 15)
  const softDeleteTables = ['products', 'expense_categories', 'sales', 'expenses', 'purchases', 'categories', 'suppliers', 'users', 'customers', 'credits'];
  softDeleteTables.forEach(t => {
    try { db.prepare(`ALTER TABLE ${t} ADD COLUMN is_deleted INTEGER DEFAULT 0`).run(); } catch(e){}
  });

  // Seed default users if empty
  const uCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (uCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (name, role, pin) VALUES (?, ?, ?)');
    insertUser.run('Admin', 'Admin', '1234');
    insertUser.run('Cashier', 'Cashier', '0000');
    insertUser.run('Owner', 'Owner', '1111');
  }

  // Seed default settings if empty
  const stCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (stCount === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('owner_pin', '0000');
  }

  // Seed default products if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO products (name, sku, barcode, price, cost, stock, category, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const defaultProducts = [
      ['Jersey 5 Collar', 'JR001', '1001', 350, 215, 30, 'Jerseys', '👕'],
      ['Jersey Normal', 'JR002', '1002', 310, 165, 45, 'Jerseys', '👕'],
      ['Captain Metro Shorts', 'JR003', '1003', 580, 310, 12, 'Jerseys', '🥇'],
      ['Boot Focus 2.0', 'BT001', '2001', 800, 449, 8, 'Boots & Shoes', '👟'],
      ['Boot Sega Spectra', 'BT002', '2002', 860, 538, 6, 'Boots & Shoes', '👟'],
      ['Anza Boot Pythagoras', 'BT003', '2003', 1200, 800, 4, 'Boots & Shoes', '🥾'],
      ['Shorts PP', 'SH001', '3001', 100, 68, 50, 'Shorts & Tracks', '🩳'],
      ['Shorts DN Logo', 'SH002', '3002', 300, 185, 25, 'Shorts & Tracks', '🩳'],
      ['Track BB (599)', 'SH003', '3003', 599, 360, 10, 'Shorts & Tracks', '🩳'],
      ['Cap US Polo', 'CP001', '4001', 120, 75, 40, 'Caps & Accessories', '🧢'],
      ['Cricket Grip', 'CK001', '5001', 130, 65, 20, 'Cricket', '🏏'],
      ['Hand Gripper', 'CK002', '5002', 240, 115, 15, 'Cricket', '✊']
    ];
    for (const p of defaultProducts) insert.run(...p);
  }

  // Seed default suppliers if empty
  const sCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
  if (sCount === 0) {
    const insert = db.prepare('INSERT INTO suppliers (name) VALUES (?)');
    ['Scampilo', 'Catos Jersey', 'Wafa Calicut', 'Noway', 'Captain', 'Calicut Sports Jersey', 'Impact Tirur', 'Soccer Sportstrade', 'Norvas', 'M.P Traders'].forEach(s => insert.run(s));
  }

  // Seed default categories if empty
  const cCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (cCount === 0) {
    const insert = db.prepare('INSERT INTO categories (name) VALUES (?)');
    ['Jerseys', 'Boots & Shoes', 'Shorts & Tracks', 'Caps', 'Cricket', 'Sports Equipment', 'Accessories'].forEach(c => insert.run(c));
  }
  
  // Seed default expense categories if empty
  const ecCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get().count;
  if (ecCount === 0) {
    const insert = db.prepare('INSERT INTO expense_categories (name) VALUES (?)');
    ['Shop Rent', 'Salary', 'Tea / Refreshments', 'Water', 'Fuel', 'Camera / CCTV', 'Electricity', 'Other'].forEach(c => insert.run(c));
  }

  console.log('Database initialized successfully.');
}

export default function getDb() {
  if (!db) initDb();
  return db;
}

export function checkDatabaseIntegrity() {
  const currentDb = getDb();
  try {
    const result = currentDb.prepare('PRAGMA integrity_check').get();
    if (result.integrity_check !== 'ok') {
      return { success: false, error: result.integrity_check };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function repairDatabase() {
  try {
    const currentDb = getDb();
    // Stage 1: Non-destructive repair attempts
    try {
      currentDb.pragma('wal_checkpoint(TRUNCATE)');
      currentDb.prepare('REINDEX').run();
      currentDb.prepare('VACUUM').run();
    } catch (e) {
      // Continue to integrity check even if these fail
    }
    
    // Check again
    const check = checkDatabaseIntegrity();
    if (check.success) {
      return { success: true, method: 'reindex_vacuum' };
    }

    // Stage 2: Close current DB and restore from best backup
    const dbPath = getDbPath();
    closeDb();

    const backupDirs = [
      path.join(app.getPath('userData'), 'backups'),
      path.join(app.getPath('documents'), 'SportsZone', 'Backups'),
    ];

    let bestBackup = null;
    let bestSalesCount = 0;

    for (const dir of backupDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.db'));
        for (const f of files) {
          const fp = path.join(dir, f);
          try {
            const bdb = new Database(fp, { readonly: true });
            const ic = bdb.pragma('integrity_check');
            if (ic[0]?.integrity_check === 'ok') {
              let salesCount = 0;
              try { salesCount = bdb.prepare('SELECT COUNT(*) as c FROM sales').get().c; } catch (e) { /* ignore */ }
              if (salesCount >= bestSalesCount) {
                bestSalesCount = salesCount;
                bestBackup = fp;
              }
            }
            bdb.close();
          } catch (e) { /* ignore */ }
        }
      } catch {}
    }

    if (bestBackup) {
      // Safety rename corrupted DB
      const corruptedPath = dbPath + '.corrupted.' + Date.now();
      try { fs.renameSync(dbPath + '-wal', dbPath + '-wal.corrupted.' + Date.now()); } catch (e) { /* ignore */ }
      try { fs.renameSync(dbPath + '-shm', dbPath + '-shm.corrupted.' + Date.now()); } catch (e) { /* ignore */ }
      try { fs.renameSync(dbPath, corruptedPath); } catch (e) { /* ignore */ }
      
      // Copy best backup as new DB
      fs.copyFileSync(bestBackup, dbPath);
      
      // Re-open and verify
      initDb();
      const finalCheck = checkDatabaseIntegrity();
      if (finalCheck.success) {
        return { success: true, method: 'backup_restore', backup: path.basename(bestBackup), salesRecovered: bestSalesCount };
      }
    }

    // Re-open DB if it was closed
    initDb();
    return { success: false, error: 'All repair methods failed. No healthy backup found.' };
  } catch (err) {
    try { initDb(); } catch (e) { /* ignore */ }
    return { success: false, error: err.message };
  }
}

// Periodic WAL checkpoint to prevent corruption from WAL bloat
let checkpointInterval = null;
export function startPeriodicCheckpoint() {
  if (checkpointInterval) return;
  checkpointInterval = setInterval(() => {
    try {
      if (db) db.pragma('wal_checkpoint(PASSIVE)');
    } catch {}
  }, 5 * 60 * 1000); // Every 5 minutes
}

export function closeDb() {
  if (checkpointInterval) {
    clearInterval(checkpointInterval);
    checkpointInterval = null;
  }
  if (db) {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) { /* ignore */ }
    db.close();
    db = null;
  }
}

// User methods
export function getUsers() {
  return getDb().prepare('SELECT * FROM users WHERE is_deleted = 0').all();
}

export function updateUserPin(id, newPin) {
  return getDb().prepare('UPDATE users SET pin = ? WHERE id = ?').run(newPin, id);
}

export function saveUser(user) {
  if (user.id) {
    return getDb().prepare('UPDATE users SET name = ?, role = ?, pin = ? WHERE id = ?')
      .run(user.name, user.role, user.pin, user.id);
  } else {
    return getDb().prepare('INSERT INTO users (name, role, pin) VALUES (?, ?, ?)')
      .run(user.name, user.role, user.pin);
  }
}

// Customer Methods
export function getCustomers() {
  return getDb().prepare('SELECT * FROM customers WHERE is_deleted = 0 ORDER BY name').all();
}

export function saveCustomer(c) {
  const db = getDb();
  // 1. If we have an ID, it's a direct update
  if (c.id) {
    db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, orders = ?, total = ?, last_order = ?, is_deleted = 0 WHERE id = ?')
      .run(c.name, c.phone, c.email, c.orders || 0, c.total || 0, c.last_order || null, c.id);
    return c.id;
  }
  
  // 2. Check for existing (including deleted) by phone
  if (c.phone) {
    const existing = db.prepare('SELECT id, is_deleted FROM customers WHERE phone = ?').get(c.phone);
    if (existing) {
      db.prepare('UPDATE customers SET name = ?, email = ?, orders = ?, total = ?, last_order = ?, is_deleted = 0 WHERE id = ?')
        .run(c.name, c.email, c.orders || 0, c.total || 0, c.last_order || null, existing.id);
      return existing.id;
    }
  }

  // 3. Check for existing (including deleted) by name
  const existingByName = db.prepare('SELECT id, is_deleted FROM customers WHERE name = ?').get(c.name);
  if (existingByName) {
    db.prepare('UPDATE customers SET phone = ?, email = ?, orders = ?, total = ?, last_order = ?, is_deleted = 0 WHERE id = ?')
      .run(c.phone || '', c.email || '', c.orders || 0, c.total || 0, c.last_order || null, existingByName.id);
    return existingByName.id;
  }

  // 4. New customer
  const info = db.prepare('INSERT INTO customers (name, phone, email, orders, total, last_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(c.name, c.phone || '', c.email || '', c.orders || 0, c.total || 0, c.last_order || null);
  return info.lastInsertRowid;
}

export function updateCustomerStats(nameOrId, amount, date) {
  const db = getDb();
  let customer;
  if (typeof nameOrId === 'number') {
    customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(nameOrId);
  } else {
    customer = db.prepare('SELECT id FROM customers WHERE name = ?').get(nameOrId);
  }

  if (customer) {
    db.prepare(`
      UPDATE customers 
      SET orders = orders + 1, 
          total = total + ?, 
          last_order = ? 
      WHERE id = ?
    `).run(amount, date, customer.id);
  }
}

export function deleteCustomer(id) {
  return getDb().prepare('UPDATE customers SET is_deleted = 1 WHERE id = ?').run(id);
}

// Credit Methods
export function getCredits() {
  return getDb().prepare('SELECT * FROM credits WHERE is_deleted = 0 ORDER BY date DESC').all();
}

export function saveCredit(cr) {
  if (cr.id) {
    return getDb().prepare('UPDATE credits SET customer_id=?, customer_name=?, total=?, paid=?, pending=?, items=? WHERE id=?')
      .run(cr.customer_id, cr.customer_name, cr.total, cr.paid, cr.pending, cr.items, cr.id);
  }
  return getDb().prepare('INSERT INTO credits (customer_id, customer_name, total, paid, pending, date, items) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(cr.customer_id, cr.customer_name, cr.total, cr.paid, cr.pending, cr.date || new Date().toISOString().split('T')[0], cr.items);
}

export function deleteCredit(id) {
  return getDb().prepare('UPDATE credits SET is_deleted = 1 WHERE id = ?').run(id);
}

// Remote Commands
export function getPendingRemoteCommands() {
  return getDb().prepare("SELECT * FROM remote_commands WHERE status = 'pending'").all();
}

export function markRemoteCommandExecuted(id) {
  return getDb().prepare("UPDATE remote_commands SET status = 'executed' WHERE id = ?").run(id);
}

export function addRemoteCommand(command) {
  return getDb().prepare("INSERT INTO remote_commands (command) VALUES (?)").run(command);
}

// Audit Logs
export function clearAuditLogs() {
  return getDb().prepare('DELETE FROM audit_logs').run();
}


