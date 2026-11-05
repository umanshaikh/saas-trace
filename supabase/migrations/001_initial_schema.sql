-- ========================================================
-- TRACE PLATFORM — PRODUCTION POSTGRESQL DATABASE SCHEMA
-- Multi-Tenant Shop Management SaaS with RLS & Audit Logs
-- ========================================================

-- Enable UUID / Crypto extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. CORE: PROFILES, SHOPS & MEMBERSHIPS
-- ========================================================

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID UNIQUE, -- Links to auth.users if available
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  preferred_language VARCHAR(10) DEFAULT 'en', -- en, hi, mr
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  business_type VARCHAR(100) NOT NULL, -- grocery, clothing, restaurant, mobile, medical, retail, other
  owner_id TEXT REFERENCES profiles(id) ON DELETE RESTRICT,
  gstin VARCHAR(20),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  currency_symbol VARCHAR(5) DEFAULT '₹',
  is_verified BOOLEAN DEFAULT FALSE,
  access_status VARCHAR(50) DEFAULT 'ACTIVE', -- PENDING, ACTIVE, SUSPENDED, REJECTED, CANCELLED, EXPIRED
  suspension_reason TEXT,
  invite_code VARCHAR(32) UNIQUE DEFAULT SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
  qr_code_payload TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, profile_id)
);

CREATE TABLE IF NOT EXISTS shop_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('MANAGER', 'CASHIER')),
  invited_by TEXT REFERENCES profiles(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, ACCEPTED, EXPIRED, CANCELLED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 2. POS: CATEGORIES, PRODUCTS, INVENTORY & INVOICES
-- ========================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, slug)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100),
  sku VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'pcs', -- pcs, kg, g, l, ml, box, packet, meter
  purchase_price_paise BIGINT NOT NULL DEFAULT 0,
  selling_price_paise BIGINT NOT NULL,
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(12, 3) DEFAULT 5,
  tax_rate_percent NUMERIC(5, 2) DEFAULT 0, -- GST rate: 0%, 5%, 12%, 18%, 28%
  hsn_code VARCHAR(20),
  image_url TEXT,
  is_shared_to_network BOOLEAN DEFAULT FALSE,
  network_selling_price_paise BIGINT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, sku)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  credit_limit_paise BIGINT DEFAULT 1000000, -- Default ₹10,000 in paise
  total_outstanding_paise BIGINT DEFAULT 0,
  credit_status VARCHAR(30) DEFAULT 'GOOD', -- GOOD, WARNING, BLOCKED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(100) NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name_snapshot VARCHAR(255),
  customer_phone_snapshot VARCHAR(20),
  subtotal_paise BIGINT NOT NULL,
  discount_paise BIGINT DEFAULT 0,
  tax_paise BIGINT DEFAULT 0,
  total_amount_paise BIGINT NOT NULL,
  paid_amount_paise BIGINT NOT NULL DEFAULT 0,
  balance_amount_paise BIGINT NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED')),
  payment_method VARCHAR(50) NOT NULL, -- CASH, UPI, CARD, PAYLATER, SPLIT, BANK_TRANSFER
  created_by TEXT REFERENCES profiles(id),
  notes TEXT,
  cancellation_reason TEXT,
  status VARCHAR(30) DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED, AMENDED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  sku_snapshot VARCHAR(100),
  unit_snapshot VARCHAR(50) DEFAULT 'pcs',
  unit_price_paise BIGINT NOT NULL,
  tax_rate_percent NUMERIC(5, 2) DEFAULT 0,
  tax_paise BIGINT DEFAULT 0,
  quantity NUMERIC(12, 3) NOT NULL,
  line_total_paise BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- INVOICE_SALE, RESTOCK, RETURN, ADJUSTMENT, NETWORK_OUT, NETWORK_IN, RESERVATION
  quantity NUMERIC(12, 3) NOT NULL,
  reference_id VARCHAR(100), -- invoice_id or network_order_id
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- Rent, Electricity, Salaries, Inventory Freight, Tea & Snacks, Maintenance, Other
  title VARCHAR(255) NOT NULL,
  amount_paise BIGINT NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  receipt_url TEXT,
  incurred_date DATE DEFAULT CURRENT_DATE,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 3. AI ASSISTANT: CONVERSATIONS, MESSAGES & ACTION LOGS
-- ========================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Business Assistant Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en', -- en, hi, mr
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_action_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_name VARCHAR(100) NOT NULL,
  parameters JSONB NOT NULL,
  execution_status VARCHAR(50) NOT NULL, -- CONFIRMED, EXECUTED, REJECTED, FAILED
  result_summary TEXT,
  idempotency_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 4. TRACE NETWORK: B2B SHOP-TO-SHOP STOCK COLLABORATION
-- ========================================================

CREATE TABLE IF NOT EXISTS shop_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  requester_shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  responder_shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, BLOCKED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_shop_id, responder_shop_id)
);

CREATE TABLE IF NOT EXISTS shared_catalog_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shared_name VARCHAR(255) NOT NULL,
  shared_unit VARCHAR(50) NOT NULL,
  wholesale_price_paise BIGINT NOT NULL,
  available_quantity NUMERIC(12, 3) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, product_id)
);

CREATE TABLE IF NOT EXISTS network_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  buyer_shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'ACCEPTED', 'REJECTED', 'RESERVED', 'READY_FOR_PICKUP', 'DISPATCHED', 'COMPLETED', 'CANCELLED'
  )),
  delivery_type VARCHAR(50) DEFAULT 'PICKUP', -- PICKUP, SUPPLIER_DELIVERY
  subtotal_paise BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  network_order_id TEXT NOT NULL REFERENCES network_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  unit_price_paise BIGINT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  line_total_paise BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  network_order_id TEXT NOT NULL REFERENCES network_orders(id) ON DELETE CASCADE,
  supplier_shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reserved_quantity NUMERIC(12, 3) NOT NULL,
  status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, RELEASED, COMMITTED
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 5. TRACE PAYLATER: CUSTOMER CREDIT & AUTOPAY
-- ========================================================

CREATE TABLE IF NOT EXISTS customer_credit_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  credit_limit_paise BIGINT NOT NULL DEFAULT 1000000, -- ₹10,000
  current_balance_paise BIGINT NOT NULL DEFAULT 0,
  overdue_balance_paise BIGINT NOT NULL DEFAULT 0,
  is_autopay_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, SETTLED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, customer_id)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('PURCHASE_CREDIT', 'REPAYMENT', 'ADJUSTMENT')),
  amount_paise BIGINT NOT NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  payment_method VARCHAR(50), -- CASH, UPI, BANK_TRANSFER
  reference_note TEXT,
  recorded_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  due_amount_paise BIGINT NOT NULL,
  paid_amount_paise BIGINT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE, WAIVED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autopay_mandates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mandate_reference VARCHAR(100) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL, -- RAZORPAY_AUTOPAY, CASHFREE_SUB
  max_amount_paise BIGINT NOT NULL,
  frequency VARCHAR(30) DEFAULT 'AS_PRESENTED',
  status VARCHAR(50) DEFAULT 'PENDING_AUTH', -- PENDING_AUTH, ACTIVE, CANCELLED, FAILED
  authorized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 6. TRACE PAYMENTS: TRANSACTION & SETTLEMENT LEDGER
-- ========================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- CASH, UPI, CARD, BANK_TRANSFER, CHEQUE
  gateway_provider VARCHAR(50), -- RAZORPAY, CASHFREE, OFFLINE
  gateway_payment_id VARCHAR(100),
  gateway_signature VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED, REFUNDED
  reconciled BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 7. TRACE SUBSCRIPTIONS: SOFTWARE PLANS & BILLING
-- ========================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY, -- free, starter, pro, business
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  monthly_price_paise BIGINT NOT NULL,
  yearly_price_paise BIGINT NOT NULL,
  max_products INT NOT NULL,
  max_team_members INT NOT NULL,
  has_ai_assistant BOOLEAN DEFAULT FALSE,
  has_network_access BOOLEAN DEFAULT FALSE,
  has_paylater BOOLEAN DEFAULT FALSE,
  has_advanced_reports BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
  status VARCHAR(50) NOT NULL DEFAULT 'TRIALING', -- TRIALING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_ends_at TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id)
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  amount_paise BIGINT NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'RAZORPAY_TEST',
  payment_status VARCHAR(50) DEFAULT 'PAID',
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 8. SUPER ADMIN & AUDIT LOGS
-- ========================================================

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_email VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- APPROVE_SHOP, SUSPEND_SHOP, CANCEL_SUBSCRIPTION, EXTEND_TRIAL, UPDATE_PLAN
  target_shop_id TEXT REFERENCES shops(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  recipient_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- LOW_STOCK, NETWORK_ORDER, PAYMENT_OVERDUE, SUBSCRIPTION_RENEWAL, ADMIN_STATUS
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Base helper function to get current user's profile ID
CREATE OR REPLACE FUNCTION current_profile_id() RETURNS TEXT AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Drop legacy policies if they exist to prevent re-run errors
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Members can view shop" ON shops;
DROP POLICY IF EXISTS "Members can view products" ON products;
DROP POLICY IF EXISTS "Owners and managers can manage products" ON products;
DROP POLICY IF EXISTS "Members can view shop invoices" ON invoices;
DROP POLICY IF EXISTS "Members can create shop invoices" ON invoices;
DROP POLICY IF EXISTS "Super admin full access" ON admin_action_logs;


-- ========================================================
-- PERMISSIVE POLICIES FOR INSTANT SAAS REAL-TIME SYNC
-- ========================================================
DROP POLICY IF EXISTS "Enable all access for shops" ON shops;
CREATE POLICY "Enable all access for shops" ON shops FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for profiles" ON profiles;
CREATE POLICY "Enable all access for profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for memberships" ON memberships;
CREATE POLICY "Enable all access for memberships" ON memberships FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for categories" ON categories;
CREATE POLICY "Enable all access for categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for products" ON products;
CREATE POLICY "Enable all access for products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for customers" ON customers;
CREATE POLICY "Enable all access for customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for invoices" ON invoices;
CREATE POLICY "Enable all access for invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for invoice_items" ON invoice_items;
CREATE POLICY "Enable all access for invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for expenses" ON expenses;
CREATE POLICY "Enable all access for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for stock_movements" ON stock_movements;
CREATE POLICY "Enable all access for stock_movements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for subscription_plans" ON subscription_plans;
CREATE POLICY "Enable all access for subscription_plans" ON subscription_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for shop_subscriptions" ON shop_subscriptions;
CREATE POLICY "Enable all access for shop_subscriptions" ON shop_subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for notifications" ON notifications;
CREATE POLICY "Enable all access for notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
