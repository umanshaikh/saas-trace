-- ========================================================
-- TRACE PLATFORM — SUPPLIERS & PURCHASES MODULE
-- ========================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  gstin VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name_snapshot VARCHAR(255),
  invoice_number VARCHAR(100) NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal_paise BIGINT NOT NULL DEFAULT 0,
  tax_paise BIGINT NOT NULL DEFAULT 0,
  total_amount_paise BIGINT NOT NULL,
  paid_amount_paise BIGINT NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID', -- PAID, PARTIALLY_PAID, UNPAID
  payment_method VARCHAR(50) DEFAULT 'BANK_TRANSFER',
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  unit_cost_paise BIGINT NOT NULL,
  tax_rate_percent NUMERIC(5, 2) DEFAULT 0,
  line_total_paise BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissive RLS Policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for suppliers" ON suppliers;
CREATE POLICY "Enable all access for suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for purchases" ON purchases;
CREATE POLICY "Enable all access for purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for purchase_items" ON purchase_items;
CREATE POLICY "Enable all access for purchase_items" ON purchase_items FOR ALL USING (true) WITH CHECK (true);
