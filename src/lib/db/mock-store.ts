import { 
  Shop, 
  Profile, 
  Membership, 
  Product, 
  Category, 
  Customer, 
  Invoice, 
  Expense, 
  SubscriptionPlan, 
  ShopSubscription, 
  NetworkOrder, 
  CreditTransaction, 
  InAppNotification 
} from '../types';

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    description: 'Single-store essential billing, barcode scanning, inventory & customer khata ledger.',
    monthly_price_paise: 9900, // ₹99
    yearly_price_paise: 99900, // ₹999/yr
    max_products: 500,
    max_team_members: 2,
    has_ai_assistant: false,
    has_network_access: false,
    has_paylater: true,
    has_advanced_reports: false,
    has_multi_branch: false,
    is_active: true,
  },
  {
    id: 'pro',
    name: 'TRACE Pro',
    description: 'TRACE AI multilingual voice assistant, B2B network access, PayLater khata & advanced reports.',
    monthly_price_paise: 19900, // ₹199
    yearly_price_paise: 199900, // ₹1,999/yr
    max_products: 2500,
    max_team_members: 8,
    has_ai_assistant: true,
    has_network_access: true,
    has_paylater: true,
    has_advanced_reports: true,
    has_multi_branch: false,
    is_active: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Multi-branch chain synchronization, centralized inventory, unlimited staff & dedicated CA audit export.',
    monthly_price_paise: 49900, // ₹499
    yearly_price_paise: 499900, // ₹4,999/yr
    max_products: 50000,
    max_team_members: 100,
    has_ai_assistant: true,
    has_network_access: true,
    has_paylater: true,
    has_advanced_reports: true,
    has_multi_branch: true,
    is_active: true,
  },
];

export const DEMO_PROFILES: Profile[] = [
  {
    id: 'usr_default',
    full_name: 'Store Owner',
    email: 'owner@business.com',
    phone: '+919999999999',
    preferred_language: 'en',
    is_super_admin: false,
  },
];

export const DEMO_SHOPS: Shop[] = [
  {
    id: 'shop_default',
    name: 'My Store',
    slug: 'my-store',
    business_type: 'retail',
    owner_id: 'usr_default',
    gstin: '',
    phone: '+919999999999',
    email: 'owner@business.com',
    address_line1: 'Shop No. 1, Main Market Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    currency: 'INR',
    currency_symbol: '₹',
    is_verified: true,
    access_status: 'ACTIVE',
    invite_code: 'TRACE01',
    created_at: new Date().toISOString(),
  },
];

export const DEMO_MEMBERSHIPS: Membership[] = [
  {
    id: 'mem_default',
    shop_id: 'shop_default',
    profile_id: 'usr_default',
    role: 'OWNER',
    is_active: true,
    profile: DEMO_PROFILES[0],
    shop: DEMO_SHOPS[0],
  },
];

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat_general', shop_id: 'shop_default', name: 'General', slug: 'general' },
];

export const DEMO_PRODUCTS: Product[] = [];
export const DEMO_CUSTOMERS: Customer[] = [];
export const DEMO_INVOICES: Invoice[] = [];
export const DEMO_EXPENSES: Expense[] = [];
export const DEMO_NOTIFICATIONS: InAppNotification[] = [];

// Ensure full dual-property compatibility across POS, Inventory & PayLater
DEMO_PRODUCTS.forEach((p) => {
  p.stock_quantity = p.current_stock;
  p.cost_price_paise = p.purchase_price_paise;
  p.tax_rate = p.tax_rate_percent;
});

DEMO_CUSTOMERS.forEach((c) => {
  c.name = c.full_name;
  c.outstanding_balance_paise = c.total_outstanding_paise;
});

DEMO_INVOICES.forEach((inv) => {
  inv.customer_name = inv.customer_name_snapshot;
  inv.customer_phone = inv.customer_phone_snapshot;
  inv.items?.forEach((i) => {
    i.product_name = i.product_name_snapshot;
    i.tax_rate = i.tax_rate_percent;
    i.total_paise = i.line_total_paise;
  });
});
