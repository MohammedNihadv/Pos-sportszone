-- Add missing updated_at column to cloud_sales
ALTER TABLE cloud_sales
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing updated_at column to cloud_products
ALTER TABLE cloud_products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing updated_at column to cloud_expenses (same payload includes it)
ALTER TABLE cloud_expenses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
