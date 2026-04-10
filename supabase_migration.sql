-- ============================================================
-- Sports Zone POS — Multi-Device Cloud Sync Schema (Phase 11)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Note: This is a safe update that adds columns and composite keys.
-- ============================================================

-- 1. Helper: Add columns to existing tables safely
DO $$ 
BEGIN
  -- Sales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_sales' AND column_name='machine_id') THEN
    ALTER TABLE cloud_sales ADD COLUMN machine_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_sales' AND column_name='hostname') THEN
    ALTER TABLE cloud_sales ADD COLUMN hostname TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_sales' AND column_name='amount_paid') THEN
    ALTER TABLE cloud_sales ADD COLUMN amount_paid NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_sales' AND column_name='change_amount') THEN
    ALTER TABLE cloud_sales ADD COLUMN change_amount NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_sales' AND column_name='payment_breakdown') THEN
    ALTER TABLE cloud_sales ADD COLUMN payment_breakdown JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_sales' AND column_name='change_return_method') THEN
    ALTER TABLE cloud_sales ADD COLUMN change_return_method TEXT;
  END IF;
  -- Update Constraint
  ALTER TABLE cloud_sales DROP CONSTRAINT IF EXISTS cloud_sales_local_id_key;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cloud_sales_machine_id_local_id_key') THEN
    ALTER TABLE cloud_sales ADD CONSTRAINT cloud_sales_machine_id_local_id_key UNIQUE (machine_id, local_id);
  END IF;

  -- Expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_expenses' AND column_name='machine_id') THEN
    ALTER TABLE cloud_expenses ADD COLUMN machine_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_expenses' AND column_name='hostname') THEN
    ALTER TABLE cloud_expenses ADD COLUMN hostname TEXT;
  END IF;
  ALTER TABLE cloud_expenses DROP CONSTRAINT IF EXISTS cloud_expenses_local_id_key;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cloud_expenses_machine_id_local_id_key') THEN
    ALTER TABLE cloud_expenses ADD CONSTRAINT cloud_expenses_machine_id_local_id_key UNIQUE (machine_id, local_id);
  END IF;

  -- Products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_products' AND column_name='machine_id') THEN
    ALTER TABLE cloud_products ADD COLUMN machine_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_products' AND column_name='hostname') THEN
    ALTER TABLE cloud_products ADD COLUMN hostname TEXT;
  END IF;
  ALTER TABLE cloud_products DROP CONSTRAINT IF EXISTS cloud_products_local_id_key;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cloud_products_machine_id_local_id_key') THEN
    ALTER TABLE cloud_products ADD CONSTRAINT cloud_products_machine_id_local_id_key UNIQUE (machine_id, local_id);
  END IF;

  -- Users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_users' AND column_name='machine_id') THEN
    ALTER TABLE cloud_users ADD COLUMN machine_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cloud_users' AND column_name='hostname') THEN
    ALTER TABLE cloud_users ADD COLUMN hostname TEXT;
  END IF;
  ALTER TABLE cloud_users DROP CONSTRAINT IF EXISTS cloud_users_local_id_key;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cloud_users_machine_id_local_id_key') THEN
    ALTER TABLE cloud_users ADD CONSTRAINT cloud_users_machine_id_local_id_key UNIQUE (machine_id, local_id);
  END IF;
END $$;

-- 2. New Tables for Full Sync

-- Cloud Purchases
CREATE TABLE IF NOT EXISTS cloud_purchases (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    TEXT NOT NULL,
  machine_id  TEXT NOT NULL,
  hostname    TEXT,
  date        TEXT NOT NULL,
  supplier    TEXT NOT NULL,
  invoice     TEXT,
  items_count INTEGER DEFAULT 0,
  total       NUMERIC DEFAULT 0,
  paid        NUMERIC DEFAULT 0,
  status      TEXT,
  payment_method TEXT,
  payment_breakdown JSONB,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, local_id)
);

-- Cloud Suppliers
CREATE TABLE IF NOT EXISTS cloud_suppliers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER NOT NULL,
  machine_id  TEXT NOT NULL,
  hostname    TEXT,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, local_id)
);

-- Cloud Customers
CREATE TABLE IF NOT EXISTS cloud_customers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER NOT NULL,
  machine_id  TEXT NOT NULL,
  hostname    TEXT,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  orders      INTEGER DEFAULT 0,
  total       NUMERIC DEFAULT 0,
  last_order  TEXT,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, local_id)
);

-- Cloud Credits
CREATE TABLE IF NOT EXISTS cloud_credits (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER NOT NULL,
  machine_id  TEXT NOT NULL,
  hostname    TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  total       NUMERIC DEFAULT 0,
  paid        NUMERIC DEFAULT 0,
  pending     NUMERIC DEFAULT 0,
  date        TEXT,
  items       TEXT,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, local_id)
);

-- Cloud Categories
CREATE TABLE IF NOT EXISTS cloud_categories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER NOT NULL,
  machine_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, local_id)
);

-- Cloud Audit Logs
CREATE TABLE IF NOT EXISTS cloud_audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id    INTEGER NOT NULL,
  machine_id  TEXT NOT NULL,
  hostname    TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  details     TEXT,
  timestamp   TEXT,
  synced_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, local_id)
);

-- Cloud Commands (For remote actions like CLEAR_LOGS)
CREATE TABLE IF NOT EXISTS cloud_commands (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  machine_id  TEXT, -- NULL means ALL devices
  command     TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and Policies (Simplified for broad access)
-- 181. Enable RLS and Policies (Simplified for broad access)
ALTER TABLE cloud_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_commands ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies
DROP POLICY IF EXISTS "Full access" ON cloud_purchases;
CREATE POLICY "Full access" ON cloud_purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON cloud_suppliers;
CREATE POLICY "Full access" ON cloud_suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON cloud_customers;
CREATE POLICY "Full access" ON cloud_customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON cloud_credits;
CREATE POLICY "Full access" ON cloud_credits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON cloud_categories;
CREATE POLICY "Full access" ON cloud_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON cloud_audit_logs;
CREATE POLICY "Full access" ON cloud_audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON cloud_commands;
CREATE POLICY "Full access" ON cloud_commands FOR ALL USING (true) WITH CHECK (true);

-- 3. Developer & Device Tracking (For Developer Dashboard)

-- Developer Logs Table
CREATE TABLE IF NOT EXISTS developer_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id       TEXT NOT NULL,
  app_version     TEXT,
  error_message   TEXT,
  occurred_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Device Telemetry Table
CREATE TABLE IF NOT EXISTS device_telemetry (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  machine_id      TEXT UNIQUE NOT NULL,
  hostname        TEXT,
  os              TEXT,
  app_version     TEXT,
  last_seen       TIMESTAMPTZ DEFAULT now(),
  force_action    TEXT DEFAULT 'none' -- 'none', 'disable', 'update'
);

-- Enable RLS
ALTER TABLE developer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_telemetry ENABLE ROW LEVEL SECURITY;

-- Policies for Developer Tables
DROP POLICY IF EXISTS "Full access" ON developer_logs;
CREATE POLICY "Full access" ON developer_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON device_telemetry;
CREATE POLICY "Full access" ON device_telemetry FOR ALL USING (true) WITH CHECK (true);
