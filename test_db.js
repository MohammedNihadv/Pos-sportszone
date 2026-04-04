import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'shop.db');
console.log('Connecting to', dbPath);
const db = new Database(dbPath);

try {
  const purchases = db.prepare('SELECT * FROM purchases').all();
  console.log('Purchases:', purchases.length);
} catch (e) {
  console.error('Purchases error:', e.message);
}

try {
  const sales = db.prepare('SELECT * FROM sales').all();
  console.log('Sales:', sales.length);
  if (sales.length > 0) {
    console.log('First sale items:', sales[0].items);
  }
} catch (e) {
  console.error('Sales error:', e.message);
}
