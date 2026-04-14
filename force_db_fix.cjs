const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * DATABASE REPAIR TOOL
 * This script forces the 'updated_at' and 'is_deleted' columns into the database.
 * 
 * Instructions:
 * 1. Close the Sports Zone application completely.
 * 2. Run: node force_db_fix.cjs
 */

function getDbPaths() {
    const paths = [
        path.join(process.cwd(), 'shop.db'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'SportsZone', 'shop.db'), // Common Electron location
        path.join(os.homedir(), 'AppData', 'Roaming', 'Sports Zone', 'shop.db'),
    ];
    return paths.filter(p => fs.existsSync(p));
}

const tableList = ['products', 'sales', 'expenses', 'purchases', 'customers', 'credits', 'categories', 'suppliers'];

async function repair() {
    console.log('--- Sports Zone Database Repair Tool ---');
    const existingPaths = getDbPaths();
    
    if (existingPaths.length === 0) {
        console.error('ERROR: Could not find shop.db file.');
        console.log('Please ensure the app has been run at least once.');
        return;
    }

    for (const dbPath of existingPaths) {
        console.log(`\nAttempting repair on: ${dbPath}`);
        let db;
        try {
            db = new Database(dbPath, { timeout: 5000 });
            db.pragma('journal_mode = WAL');
            
            for (const table of tableList) {
                try {
                    const info = db.prepare(`PRAGMA table_info(${table})`).all();
                    if (info.length === 0) {
                        console.log(`- Skipping ${table} (table not created yet)`);
                        continue;
                    }

                    const hasUpdatedAt = info.some(col => col.name === 'updated_at');
                    const hasIsDeleted = info.some(col => col.name === 'is_deleted');

                    if (!hasUpdatedAt) {
                        db.exec(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT`);
                        db.exec(`UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
                        console.log(`[FIXED] Added 'updated_at' to ${table}`);
                    }
                    if (!hasIsDeleted) {
                        db.exec(`ALTER TABLE ${table} ADD COLUMN is_deleted INTEGER DEFAULT 0`);
                        console.log(`[FIXED] Added 'is_deleted' to ${table}`);
                    }

                    if (hasUpdatedAt && hasIsDeleted) {
                        console.log(`[OK] ${table} is already healthy.`);
                    }
                } catch (err) {
                    console.error(`[FAIL] Error repairing ${table}: ${err.message}`);
                }
            }
            console.log('\nRepair complete for this file.');
        } catch (err) {
            console.error(`\nCRITICAL ERROR: Could not open database file: ${err.message}`);
            if (err.message.includes('busy') || err.message.includes('locked')) {
                console.error('TIP: Make sure the POS application is COMPLETELY CLOSED before running this script.');
            }
        } finally {
            if (db) db.close();
        }
    }
}

repair();
