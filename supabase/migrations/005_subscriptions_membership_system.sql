-- ========================================================
-- TRACE SAAS: SUBSCRIPTIONS & MEMBERSHIP ARCHITECTURE
-- Migration 005: Membership Plans, Status Lifecycle, Payments, and RLS
-- ========================================================

-- 1. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY, -- starter, pro, enterprise
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  monthly_price_paise BIGINT NOT NULL,
  yearly_price_paise BIGINT NOT NULL,
  max_products INT NOT NULL,
  max_team_members INT NOT NULL,
  has_ai_assistant BOOLEAN DEFAULT FALSE,
  has_network_access BOOLEAN DEFAULT FALSE,
  has_paylater BOOLEAN DEFAULT TRUE,
  has_advanced_reports BOOLEAN DEFAULT FALSE,
  has_multi_branch BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Membership Plans
INSERT INTO subscription_plans (id, name, description, monthly_price_paise, yearly_price_paise, max_products, max_team_members, has_ai_assistant, has_network_access, has_paylater, has_advanced_reports, has_multi_branch, is_active)
VALUES
  ('starter', 'Starter Plan', 'Single-store essential billing, barcode scanning, inventory & customer khata ledger.', 9900, 99900, 500, 2, FALSE, FALSE, TRUE, FALSE, FALSE, TRUE),
  ('pro', 'Professional Plan', 'TRACE AI voice assistant, B2B inter-shop network, PayLater khata & advanced reports.', 19900, 199900, 2500, 8, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE),
  ('enterprise', 'Enterprise Plan', 'Multi-branch chain synchronization, centralized inventory, unlimited staff & dedicated CA audit export.', 49900, 499900, 50000, 100, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_paise = EXCLUDED.monthly_price_paise,
  yearly_price_paise = EXCLUDED.yearly_price_paise,
  max_products = EXCLUDED.max_products,
  max_team_members = EXCLUDED.max_team_members,
  has_ai_assistant = EXCLUDED.has_ai_assistant,
  has_network_access = EXCLUDED.has_network_access,
  has_paylater = EXCLUDED.has_paylater,
  has_advanced_reports = EXCLUDED.has_advanced_reports,
  has_multi_branch = EXCLUDED.has_multi_branch,
  is_active = EXCLUDED.is_active;

-- 2. SHOP SUBSCRIPTIONS TABLE (Status: PENDING, ACTIVE, EXPIRED, CANCELLED, PAYMENT_FAILED)
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, EXPIRED, CANCELLED, PAYMENT_FAILED
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_ends_at TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id)
);

-- Seed pre-verified active subscriptions for demo stores
INSERT INTO shop_subscriptions (id, shop_id, plan_id, billing_cycle, status, starts_at, current_period_ends_at, cancel_at_period_end)
VALUES
  ('sub_default', 'shop_default', 'starter', 'MONTHLY', 'ACTIVE', NOW(), NOW() + INTERVAL '365 days', FALSE),
  ('sub_apna', '11111111-1111-1111-1111-111111111111', 'pro', 'YEARLY', 'ACTIVE', NOW(), NOW() + INTERVAL '365 days', FALSE)
ON CONFLICT (shop_id) DO UPDATE SET
  status = 'ACTIVE',
  current_period_ends_at = NOW() + INTERVAL '365 days';

-- 3. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  payment_id VARCHAR(100),
  gateway VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY_TEST', -- RAZORPAY, CASHFREE, UPI_DIRECT, STRIPE
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  amount_paise BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REFUNDED
  signature VARCHAR(255),
  error_message TEXT,
  idempotency_key VARCHAR(100) UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUBSCRIPTION INVOICES TABLE
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  transaction_id TEXT REFERENCES payment_transactions(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL,
  tax_paise BIGINT DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'UPI',
  payment_status VARCHAR(50) DEFAULT 'PAID',
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUBSCRIPTION AUDIT LOGS TABLE (For Admin Actions)
CREATE TABLE IF NOT EXISTS subscription_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_email VARCHAR(255) NOT NULL,
  target_shop_id TEXT REFERENCES shops(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL, -- ACTIVATE_SUBSCRIPTION, EXTEND_PERIOD, CANCEL_SUBSCRIPTION, CHANGE_PLAN, MANUAL_OVERRIDE
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_plan_id VARCHAR(50),
  new_plan_id VARCHAR(50),
  reason TEXT NOT NULL,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies if existing
DROP POLICY IF EXISTS "Subscription plans viewable by everyone" ON subscription_plans;
DROP POLICY IF EXISTS "Shop subscriptions select policy" ON shop_subscriptions;
DROP POLICY IF EXISTS "Shop subscriptions insert policy" ON shop_subscriptions;
DROP POLICY IF EXISTS "Shop subscriptions update policy" ON shop_subscriptions;
DROP POLICY IF EXISTS "Payment transactions select policy" ON payment_transactions;
DROP POLICY IF EXISTS "Payment transactions insert policy" ON payment_transactions;
DROP POLICY IF EXISTS "Payment transactions update policy" ON payment_transactions;
DROP POLICY IF EXISTS "Subscription invoices select policy" ON subscription_invoices;
DROP POLICY IF EXISTS "Subscription invoices insert policy" ON subscription_invoices;
DROP POLICY IF EXISTS "Subscription audit logs select policy" ON subscription_audit_logs;

-- Subscription Plans: Publicly readable by all authenticated merchants
CREATE POLICY "Subscription plans viewable by everyone" ON subscription_plans
  FOR SELECT USING (true);

-- Shop Subscriptions: Only authorized shop members can view; owners can insert/update
CREATE POLICY "Shop subscriptions select policy" ON shop_subscriptions
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Shop subscriptions insert policy" ON shop_subscriptions
  FOR INSERT WITH CHECK (is_shop_owner(shop_id));

CREATE POLICY "Shop subscriptions update policy" ON shop_subscriptions
  FOR UPDATE USING (is_shop_owner(shop_id)) WITH CHECK (is_shop_owner(shop_id));

-- Payment Transactions: Isolated per shop
CREATE POLICY "Payment transactions select policy" ON payment_transactions
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Payment transactions insert policy" ON payment_transactions
  FOR INSERT WITH CHECK (is_shop_owner(shop_id));

CREATE POLICY "Payment transactions update policy" ON payment_transactions
  FOR UPDATE USING (is_shop_owner(shop_id));

-- Subscription Invoices: Isolated per shop
CREATE POLICY "Subscription invoices select policy" ON subscription_invoices
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Subscription invoices insert policy" ON subscription_invoices
  FOR INSERT WITH CHECK (is_shop_owner(shop_id));

-- Subscription Audit Logs: Super Admin / System internal
CREATE POLICY "Subscription audit logs select policy" ON subscription_audit_logs
  FOR ALL USING (true);
