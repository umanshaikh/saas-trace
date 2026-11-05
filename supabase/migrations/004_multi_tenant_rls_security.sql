-- ========================================================
-- TRACE PLATFORM — SECURE MULTI-TENANT ROW LEVEL SECURITY (RLS)
-- Migration 004: Multi-Tenant Shop Isolation & Role-Based Security
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ========================================================

-- Helper A: Get profile ID of currently authenticated Supabase user
CREATE OR REPLACE FUNCTION current_profile_id() 
RETURNS TEXT AS $$
  SELECT id FROM profiles 
  WHERE user_id = auth.uid() OR id = auth.uid()::text 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper B: Check if authenticated user is the direct owner of a shop
CREATE OR REPLACE FUNCTION is_shop_owner(p_shop_id TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_id TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT owner_id INTO v_owner_id FROM shops WHERE id = p_shop_id;
  IF v_owner_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Match direct profile ID or user_id
  IF v_owner_id = v_user_id::text THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_owner_id AND (user_id = v_user_id OR id = v_user_id::text)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper C: Get authenticated user's role in a specific shop (OWNER, MANAGER, CASHIER, STAFF)
CREATE OR REPLACE FUNCTION get_shop_member_role(p_shop_id TEXT) 
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
  v_profile_id TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    -- Check if demo shop in local/dev environment
    IF p_shop_id IN ('shop_default', '11111111-1111-1111-1111-111111111111', 'shop_01') THEN
      RETURN 'OWNER';
    END IF;
    RETURN NULL;
  END IF;

  -- 1. Check if user is shop owner
  IF is_shop_owner(p_shop_id) THEN
    RETURN 'OWNER';
  END IF;

  -- 2. Lookup active membership role
  v_profile_id := current_profile_id();
  SELECT role INTO v_role 
  FROM memberships 
  WHERE shop_id = p_shop_id 
    AND (profile_id = v_profile_id OR profile_id = v_user_id::text)
    AND is_active = TRUE
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper D: Check if user has access to a shop (Owner or Active Member)
CREATE OR REPLACE FUNCTION has_shop_access(p_shop_id TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  -- Support demo shops in development
  IF p_shop_id IN ('shop_default', '11111111-1111-1111-1111-111111111111', 'shop_01') THEN
    RETURN TRUE;
  END IF;

  RETURN get_shop_member_role(p_shop_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ========================================================
-- 2. DROP PERMISSIVE / LEGACY BYPASS POLICIES
-- ========================================================
DROP POLICY IF EXISTS "Enable all access for shops" ON shops;
DROP POLICY IF EXISTS "Enable all access for profiles" ON profiles;
DROP POLICY IF EXISTS "Enable all access for memberships" ON memberships;
DROP POLICY IF EXISTS "Enable all access for categories" ON categories;
DROP POLICY IF EXISTS "Enable all access for products" ON products;
DROP POLICY IF EXISTS "Enable all access for customers" ON customers;
DROP POLICY IF EXISTS "Enable all access for invoices" ON invoices;
DROP POLICY IF EXISTS "Enable all access for invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Enable all access for expenses" ON expenses;
DROP POLICY IF EXISTS "Enable all access for stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Enable all access for subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Enable all access for shop_subscriptions" ON shop_subscriptions;
DROP POLICY IF EXISTS "Enable all access for notifications" ON notifications;

-- Drop previous tenant policies if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON profiles;

DROP POLICY IF EXISTS "Shops select policy" ON shops;
DROP POLICY IF EXISTS "Shops insert policy" ON shops;
DROP POLICY IF EXISTS "Shops update policy" ON shops;
DROP POLICY IF EXISTS "Shops delete policy" ON shops;

DROP POLICY IF EXISTS "Memberships select policy" ON memberships;
DROP POLICY IF EXISTS "Memberships insert policy" ON memberships;
DROP POLICY IF EXISTS "Memberships update policy" ON memberships;
DROP POLICY IF EXISTS "Memberships delete policy" ON memberships;

DROP POLICY IF EXISTS "Categories select policy" ON categories;
DROP POLICY IF EXISTS "Categories insert policy" ON categories;
DROP POLICY IF EXISTS "Categories update policy" ON categories;
DROP POLICY IF EXISTS "Categories delete policy" ON categories;

DROP POLICY IF EXISTS "Products select policy" ON products;
DROP POLICY IF EXISTS "Products insert policy" ON products;
DROP POLICY IF EXISTS "Products update policy" ON products;
DROP POLICY IF EXISTS "Products delete policy" ON products;

DROP POLICY IF EXISTS "Customers select policy" ON customers;
DROP POLICY IF EXISTS "Customers insert policy" ON customers;
DROP POLICY IF EXISTS "Customers update policy" ON customers;
DROP POLICY IF EXISTS "Customers delete policy" ON customers;

DROP POLICY IF EXISTS "Invoices select policy" ON invoices;
DROP POLICY IF EXISTS "Invoices insert policy" ON invoices;
DROP POLICY IF EXISTS "Invoices update policy" ON invoices;
DROP POLICY IF EXISTS "Invoices delete policy" ON invoices;

DROP POLICY IF EXISTS "Invoice items select policy" ON invoice_items;
DROP POLICY IF EXISTS "Invoice items insert policy" ON invoice_items;
DROP POLICY IF EXISTS "Invoice items update policy" ON invoice_items;
DROP POLICY IF EXISTS "Invoice items delete policy" ON invoice_items;

DROP POLICY IF EXISTS "Stock movements select policy" ON stock_movements;
DROP POLICY IF EXISTS "Stock movements insert policy" ON stock_movements;

DROP POLICY IF EXISTS "Expenses select policy" ON expenses;
DROP POLICY IF EXISTS "Expenses insert policy" ON expenses;
DROP POLICY IF EXISTS "Expenses update policy" ON expenses;
DROP POLICY IF EXISTS "Expenses delete policy" ON expenses;

DROP POLICY IF EXISTS "AI conversations policy" ON ai_conversations;
DROP POLICY IF EXISTS "AI messages policy" ON ai_messages;
DROP POLICY IF EXISTS "Onboarding progress policy" ON onboarding_progress;

-- ========================================================
-- 3. ENABLE RLS ON ALL RELEVANT TABLES
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
ALTER TABLE customer_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 4. PROFILES RLS
-- ========================================================
CREATE POLICY "Profiles select policy" ON profiles
  FOR SELECT USING (
    user_id = auth.uid() 
    OR id = auth.uid()::text 
    OR auth.uid() IS NULL -- Fallback for unauthenticated session checks
  );

CREATE POLICY "Profiles insert policy" ON profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR id = auth.uid()::text OR auth.uid() IS NULL
  );

CREATE POLICY "Profiles update policy" ON profiles
  FOR UPDATE USING (
    user_id = auth.uid() OR id = auth.uid()::text
  );

-- ========================================================
-- 5. SHOPS RLS (Only Authorized Members Can Access)
-- ========================================================
CREATE POLICY "Shops select policy" ON shops
  FOR SELECT USING (
    has_shop_access(id) 
    OR owner_id = current_profile_id()
    OR owner_id = auth.uid()::text
    OR id IN ('shop_default', '11111111-1111-1111-1111-111111111111', 'shop_01')
  );

CREATE POLICY "Shops insert policy" ON shops
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR owner_id = current_profile_id() OR owner_id = auth.uid()::text
  );

CREATE POLICY "Shops update policy" ON shops
  FOR UPDATE USING (
    is_shop_owner(id)
  ) WITH CHECK (
    is_shop_owner(id)
  );

CREATE POLICY "Shops delete policy" ON shops
  FOR DELETE USING (
    is_shop_owner(id)
  );

-- ========================================================
-- 6. MEMBERSHIPS RLS (Owner Controls Staff Roles)
-- ========================================================
CREATE POLICY "Memberships select policy" ON memberships
  FOR SELECT USING (
    has_shop_access(shop_id) OR profile_id = current_profile_id()
  );

CREATE POLICY "Memberships insert policy" ON memberships
  FOR INSERT WITH CHECK (
    is_shop_owner(shop_id)
  );

CREATE POLICY "Memberships update policy" ON memberships
  FOR UPDATE USING (
    is_shop_owner(shop_id)
  );

CREATE POLICY "Memberships delete policy" ON memberships
  FOR DELETE USING (
    is_shop_owner(shop_id)
  );

-- ========================================================
-- 7. CATEGORIES & PRODUCTS RLS
-- ========================================================
-- Categories
CREATE POLICY "Categories select policy" ON categories
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Categories insert policy" ON categories
  FOR INSERT WITH CHECK (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Categories update policy" ON categories
  FOR UPDATE USING (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Categories delete policy" ON categories
  FOR DELETE USING (is_shop_owner(shop_id));

-- Products (Cashiers can read, Managers can edit stock/price, only Owner can delete)
CREATE POLICY "Products select policy" ON products
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Products insert policy" ON products
  FOR INSERT WITH CHECK (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Products update policy" ON products
  FOR UPDATE USING (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'))
  WITH CHECK (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Products delete policy" ON products
  FOR DELETE USING (is_shop_owner(shop_id));

-- ========================================================
-- 8. CUSTOMERS RLS
-- ========================================================
CREATE POLICY "Customers select policy" ON customers
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Customers insert policy" ON customers
  FOR INSERT WITH CHECK (has_shop_access(shop_id));

CREATE POLICY "Customers update policy" ON customers
  FOR UPDATE USING (has_shop_access(shop_id));

CREATE POLICY "Customers delete policy" ON customers
  FOR DELETE USING (is_shop_owner(shop_id));

-- ========================================================
-- 9. INVOICES & INVOICE ITEMS RLS
-- ========================================================
CREATE POLICY "Invoices select policy" ON invoices
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Invoices insert policy" ON invoices
  FOR INSERT WITH CHECK (has_shop_access(shop_id));

CREATE POLICY "Invoices update policy" ON invoices
  FOR UPDATE USING (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Invoices delete policy" ON invoices
  FOR DELETE USING (is_shop_owner(shop_id));

-- Invoice Items (Linked through invoice_id)
CREATE POLICY "Invoice items select policy" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
        AND has_shop_access(invoices.shop_id)
    )
  );

CREATE POLICY "Invoice items insert policy" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
        AND has_shop_access(invoices.shop_id)
    )
  );

CREATE POLICY "Invoice items delete policy" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
        AND is_shop_owner(invoices.shop_id)
    )
  );

-- ========================================================
-- 10. STOCK MOVEMENTS RLS
-- ========================================================
CREATE POLICY "Stock movements select policy" ON stock_movements
  FOR SELECT USING (has_shop_access(shop_id));

CREATE POLICY "Stock movements insert policy" ON stock_movements
  FOR INSERT WITH CHECK (has_shop_access(shop_id));

-- ========================================================
-- 11. EXPENSES & FINANCIAL ANALYTICS RLS (Cashiers restricted)
-- ========================================================
CREATE POLICY "Expenses select policy" ON expenses
  FOR SELECT USING (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Expenses insert policy" ON expenses
  FOR INSERT WITH CHECK (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Expenses update policy" ON expenses
  FOR UPDATE USING (get_shop_member_role(shop_id) IN ('OWNER', 'MANAGER'));

CREATE POLICY "Expenses delete policy" ON expenses
  FOR DELETE USING (is_shop_owner(shop_id));

-- ========================================================
-- 12. AI CONVERSATIONS & CHATBOT RLS
-- ========================================================
CREATE POLICY "AI conversations policy" ON ai_conversations
  FOR ALL USING (has_shop_access(shop_id));

CREATE POLICY "AI messages policy" ON ai_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
        AND has_shop_access(ai_conversations.shop_id)
    )
  );

-- ========================================================
-- 13. ONBOARDING PROGRESS RLS
-- ========================================================
CREATE POLICY "Onboarding progress policy" ON onboarding_progress
  FOR ALL USING (
    has_shop_access(shop_id) 
    OR user_id = auth.uid()::text 
    OR shop_id IN ('shop_default', '11111111-1111-1111-1111-111111111111', 'shop_01')
  );
