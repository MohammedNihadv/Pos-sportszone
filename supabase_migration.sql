-- ============================================================
-- Sports Zone POS — Phase 10 Cloud Sync Tables
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Cloud Sales
CREATE TABLE IF NOT EXISTS cloud_sales (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER UNIQUE NOT NULL,
  date        TEXT,
  total       NUMERIC NOT NULL DEFAULT 0,
  discount    NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  customer_id INTEGER,
  items       JSONB,
  synced_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Cloud Expenses
CREATE TABLE IF NOT EXISTS cloud_expenses (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER UNIQUE NOT NULL,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount      NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  synced_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. Cloud Products (inventory backup)
CREATE TABLE IF NOT EXISTS cloud_products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  sku         TEXT DEFAULT '',
  barcode     TEXT DEFAULT '',
  price       NUMERIC DEFAULT 0,
  cost        NUMERIC DEFAULT 0,
  stock       INTEGER DEFAULT 0,
  category    TEXT DEFAULT '',
  emoji       TEXT DEFAULT '📦',
  synced_at   TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (optional, recommended)
ALTER TABLE cloud_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_products ENABLE ROW LEVEL SECURITY;

-- Allow anon key full access (since POS uses anon key)
CREATE POLICY "Allow all for anon" ON cloud_sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cloud_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cloud_products FOR ALL USING (true) WITH CHECK (true);
