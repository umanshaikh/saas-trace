-- ========================================================
-- TRACE PLATFORM — SEED DATA (PLANS & INITIAL DEMO DATA)
-- ========================================================

-- Insert Initial Subscription Plans
INSERT INTO subscription_plans (
  id, name, description, monthly_price_paise, yearly_price_paise, max_products, max_team_members,
  has_ai_assistant, has_network_access, has_paylater, has_advanced_reports, is_active
) VALUES
  ('free', 'Free Forever', 'Essential billing and product tracking for brand-new stores.', 0, 0, 50, 1, false, false, false, false, true),
  ('starter', 'Starter', 'Expanded products, basic reports & customer directory for growing shops.', 9900, 99900, 500, 3, false, false, true, false, true),
  ('pro', 'Pro Atelier', 'TRACE AI Business Assistant, PayLater credit ledger & advanced analytics.', 19900, 199900, 2500, 8, true, true, true, true, true),
  ('business', 'Business Enterprise', 'Full TRACE Network B2B access, multi-counter split, AutoPay & unlimited staff.', 39900, 399900, 10000, 25, true, true, true, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_paise = EXCLUDED.monthly_price_paise,
  yearly_price_paise = EXCLUDED.yearly_price_paise,
  has_ai_assistant = EXCLUDED.has_ai_assistant,
  has_network_access = EXCLUDED.has_network_access;

-- Create Demo Profiles
INSERT INTO profiles (id, full_name, email, phone, preferred_language, is_super_admin)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Arjun Sharma (Demo Owner)', 'arjun@apnagroceries.in', '+919876543210', 'en', false),
  ('00000000-0000-0000-0000-000000000002', 'Priya Patel (Demo Manager)', 'priya@apnagroceries.in', '+919876543211', 'hi', false),
  ('00000000-0000-0000-0000-000000000003', 'Ramesh Kumar (Demo Cashier)', 'ramesh@apnagroceries.in', '+919876543212', 'mr', false),
  ('00000000-0000-0000-0000-000000000099', 'TRACE Super Admin', 'superadmin@trace.business', '+919999999999', 'en', true)
ON CONFLICT (id) DO NOTHING;

-- Create Demo Shops
INSERT INTO shops (
  id, name, slug, business_type, owner_id, gstin, phone, email,
  address_line1, city, state, pincode, is_verified, access_status
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Apna Supermarket & General Store',
    'apna-supermarket',
    'grocery',
    '00000000-0000-0000-0000-000000000001',
    '27AABCU9603R1ZM',
    '+919876543210',
    'orders@apnagroceries.in',
    'Shop No. 4, MG Road Market Complex',
    'Pune',
    'Maharashtra',
    '411001',
    true,
    'ACTIVE'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Vogue Men & Women Apparel',
    'vogue-apparel',
    'clothing',
    '00000000-0000-0000-0000-000000000001',
    '27BBDCU1234K1ZX',
    '+919876543299',
    'concierge@vogueapparel.in',
    'Phoenix City Mall, Level 2',
    'Mumbai',
    'Maharashtra',
    '400070',
    true,
    'ACTIVE'
  )
ON CONFLICT (id) DO NOTHING;

-- Memberships for Demo Shop
INSERT INTO memberships (shop_id, profile_id, role, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'OWNER', true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'MANAGER', true),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', 'CASHIER', true)
ON CONFLICT (shop_id, profile_id) DO NOTHING;

-- Demo Shop Subscriptions
INSERT INTO shop_subscriptions (shop_id, plan_id, billing_cycle, status, starts_at, current_period_ends_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'pro', 'MONTHLY', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (shop_id) DO NOTHING;
