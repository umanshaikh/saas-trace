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
    description: 'Essential billing, expanded inventory, customer ledger & standard business reports.',
    monthly_price_paise: 9900, // ₹99
    yearly_price_paise: 99900, // ₹999/yr
    max_products: 500,
    max_team_members: 3,
    has_ai_assistant: false,
    has_network_access: false,
    has_paylater: true,
    has_advanced_reports: false,
    is_active: true,
  },
  {
    id: 'pro',
    name: 'Pro Atelier Plan',
    description: 'TRACE AI multilingual assistant, PayLater Khata & advanced profit analytics.',
    monthly_price_paise: 19900, // ₹199
    yearly_price_paise: 199900, // ₹1,999/yr
    max_products: 2500,
    max_team_members: 8,
    has_ai_assistant: true,
    has_network_access: true,
    has_paylater: true,
    has_advanced_reports: true,
    is_active: true,
  },
  {
    id: 'business',
    name: 'Business Enterprise',
    description: 'Full TRACE Network B2B collaboration, stock reservations, AutoPay & unlimited staff.',
    monthly_price_paise: 39900, // ₹399
    yearly_price_paise: 399900, // ₹3,999/yr
    max_products: 10000,
    max_team_members: 25,
    has_ai_assistant: true,
    has_network_access: true,
    has_paylater: true,
    has_advanced_reports: true,
    is_active: true,
  },
];

export const DEMO_PROFILES: Profile[] = [
  {
    id: 'usr_owner_01',
    full_name: 'Arjun Sharma (Shop Owner)',
    email: 'arjun@apnasupermarket.in',
    phone: '+919876543210',
    preferred_language: 'en',
    is_super_admin: false,
  },
  {
    id: 'usr_manager_01',
    full_name: 'Priya Patel (Floor Manager)',
    email: 'priya@apnasupermarket.in',
    phone: '+919876543211',
    preferred_language: 'hi',
    is_super_admin: false,
  },
  {
    id: 'usr_cashier_01',
    full_name: 'Ramesh Kumar (Billing Cashier)',
    email: 'ramesh@apnasupermarket.in',
    phone: '+919876543212',
    preferred_language: 'mr',
    is_super_admin: false,
  },
  {
    id: 'usr_admin_01',
    full_name: 'TRACE Super Admin',
    email: 'superadmin@trace.business',
    phone: '+919999999999',
    preferred_language: 'en',
    is_super_admin: true,
  },
];

export const DEMO_SHOPS: Shop[] = [
  {
    id: 'shop_01',
    name: 'Apna Supermarket & Provisions',
    slug: 'apna-supermarket',
    business_type: 'grocery',
    owner_id: 'usr_owner_01',
    gstin: '27AABCU9603R1ZM',
    phone: '+919876543210',
    email: 'billing@apnasupermarket.in',
    address_line1: 'Shop No. 4, Shivaji Chowk Market Complex',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    currency: 'INR',
    currency_symbol: '₹',
    is_verified: true,
    access_status: 'ACTIVE',
    invite_code: 'APNA2026',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'shop_02',
    name: 'Vogue Men & Women Fashion',
    slug: 'vogue-fashion',
    business_type: 'clothing',
    owner_id: 'usr_owner_01',
    gstin: '27BBDCU1234K1ZX',
    phone: '+919876543299',
    email: 'orders@voguefashion.in',
    address_line1: 'Plot 12, Commercial High Street, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    currency: 'INR',
    currency_symbol: '₹',
    is_verified: true,
    access_status: 'ACTIVE',
    invite_code: 'VOGUE26',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'shop_03',
    name: 'Sanjivani Medical & Healthcare Store',
    slug: 'sanjivani-medical',
    business_type: 'medical',
    owner_id: 'usr_owner_01',
    gstin: '27CCDCU5678M1ZZ',
    phone: '+919876543288',
    email: 'care@sanjivanimed.in',
    address_line1: 'Opposite Civil Hospital, Station Road',
    city: 'Thane',
    state: 'Maharashtra',
    pincode: '400601',
    currency: 'INR',
    currency_symbol: '₹',
    is_verified: true,
    access_status: 'ACTIVE',
    invite_code: 'MEDCARE1',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

export const DEMO_MEMBERSHIPS: Membership[] = [
  {
    id: 'mem_01',
    shop_id: 'shop_01',
    profile_id: 'usr_owner_01',
    role: 'OWNER',
    is_active: true,
    profile: DEMO_PROFILES[0],
    shop: DEMO_SHOPS[0],
  },
  {
    id: 'mem_02',
    shop_id: 'shop_01',
    profile_id: 'usr_manager_01',
    role: 'MANAGER',
    is_active: true,
    profile: DEMO_PROFILES[1],
    shop: DEMO_SHOPS[0],
  },
  {
    id: 'mem_03',
    shop_id: 'shop_01',
    profile_id: 'usr_cashier_01',
    role: 'CASHIER',
    is_active: true,
    profile: DEMO_PROFILES[2],
    shop: DEMO_SHOPS[0],
  },
  {
    id: 'mem_04',
    shop_id: 'shop_02',
    profile_id: 'usr_owner_01',
    role: 'OWNER',
    is_active: true,
    profile: DEMO_PROFILES[0],
    shop: DEMO_SHOPS[1],
  },
];

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat_01', shop_id: 'shop_01', name: 'Dairy & Bakery', slug: 'dairy-bakery' },
  { id: 'cat_02', shop_id: 'shop_01', name: 'Grains & Pulses', slug: 'grains-pulses' },
  { id: 'cat_03', shop_id: 'shop_01', name: 'Snacks & Packaged Food', slug: 'snacks-packaged' },
  { id: 'cat_04', shop_id: 'shop_01', name: 'Beverages & Juices', slug: 'beverages' },
  { id: 'cat_05', shop_id: 'shop_01', name: 'Household & Cleaning', slug: 'household' },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod_01',
    shop_id: 'shop_01',
    category_id: 'cat_01',
    name: 'Amul Taaza Homogenised Toned Milk (1L)',
    barcode: '8901262010053',
    sku: 'AML-TZ-1L',
    unit: 'packet',
    purchase_price_paise: 6400, // ₹64.00
    selling_price_paise: 7200, // ₹72.00
    current_stock: 45,
    low_stock_threshold: 10,
    tax_rate_percent: 0,
    hsn_code: '0401',
    is_shared_to_network: true,
    network_selling_price_paise: 6800,
    is_active: true,
  },
  {
    id: 'prod_02',
    shop_id: 'shop_01',
    category_id: 'cat_03',
    name: 'Maggi 2-Minute Masala Noodles (Pack of 4)',
    barcode: '8901058852467',
    sku: 'MGG-MSL-4P',
    unit: 'packet',
    purchase_price_paise: 5000, // ₹50.00
    selling_price_paise: 5800, // ₹58.00
    current_stock: 4, // LOW STOCK TRIGGER
    low_stock_threshold: 12,
    tax_rate_percent: 12,
    hsn_code: '1902',
    is_shared_to_network: true,
    network_selling_price_paise: 5400,
    is_active: true,
  },
  {
    id: 'prod_03',
    shop_id: 'shop_01',
    category_id: 'cat_02',
    name: 'India Gate Basmati Rice Premium (5kg)',
    barcode: '8901537001427',
    sku: 'ING-RCE-5KG',
    unit: 'packet',
    purchase_price_paise: 44000, // ₹440.00
    selling_price_paise: 52000, // ₹520.00
    current_stock: 18,
    low_stock_threshold: 5,
    tax_rate_percent: 5,
    hsn_code: '1006',
    is_shared_to_network: true,
    network_selling_price_paise: 48000,
    is_active: true,
  },
  {
    id: 'prod_04',
    shop_id: 'shop_01',
    category_id: 'cat_02',
    name: 'Tata Sampann Unpolished Toor Dal (1kg)',
    barcode: '8904043901124',
    sku: 'TAT-TOR-1KG',
    unit: 'packet',
    purchase_price_paise: 14500, // ₹145.00
    selling_price_paise: 17500, // ₹175.00
    current_stock: 2, // LOW STOCK TRIGGER
    low_stock_threshold: 8,
    tax_rate_percent: 0,
    hsn_code: '0713',
    is_shared_to_network: false,
    is_active: true,
  },
  {
    id: 'prod_05',
    shop_id: 'shop_01',
    category_id: 'cat_04',
    name: 'Tata Tea Gold Leaf Premium Blend (500g)',
    barcode: '8901052014113',
    sku: 'TAT-TEA-500G',
    unit: 'box',
    purchase_price_paise: 27000, // ₹270.00
    selling_price_paise: 31000, // ₹310.00
    current_stock: 22,
    low_stock_threshold: 6,
    tax_rate_percent: 5,
    hsn_code: '0902',
    is_shared_to_network: true,
    network_selling_price_paise: 29000,
    is_active: true,
  },
  {
    id: 'prod_06',
    shop_id: 'shop_01',
    category_id: 'cat_05',
    name: 'Surf Excel Quick Wash Detergent Powder (1kg)',
    barcode: '8901030018447',
    sku: 'SRF-EXC-1KG',
    unit: 'packet',
    purchase_price_paise: 16000, // ₹160.00
    selling_price_paise: 19500, // ₹195.00
    current_stock: 35,
    low_stock_threshold: 8,
    tax_rate_percent: 18,
    hsn_code: '3402',
    is_shared_to_network: true,
    network_selling_price_paise: 18000,
    is_active: true,
  },
];

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust_01',
    shop_id: 'shop_01',
    full_name: 'Rahul Deshmukh',
    phone: '9822012345',
    email: 'rahul.deshmukh@gmail.com',
    address: 'B-402, Greenfield Residences, MG Road, Pune',
    credit_limit_paise: 1500000, // ₹15,000 credit limit
    total_outstanding_paise: 345000, // ₹3,450 outstanding PayLater balance
    credit_status: 'GOOD',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'cust_02',
    shop_id: 'shop_01',
    full_name: 'Meena Sharma',
    phone: '9890123456',
    email: 'meena.s@outlook.com',
    address: 'Flat 12, Sunshine Apts, Model Colony, Pune',
    credit_limit_paise: 800000, // ₹8,000
    total_outstanding_paise: 120000, // ₹1,200 outstanding
    credit_status: 'GOOD',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'cust_03',
    shop_id: 'shop_01',
    full_name: 'Vikas Kadam',
    phone: '9422998877',
    email: 'vikas.kadam@yahoo.in',
    address: 'Plot 8, Shivaji Nagar, Pune',
    credit_limit_paise: 500000, // ₹5,000
    total_outstanding_paise: 480000, // ₹4,800 (NEAR LIMIT)
    credit_status: 'WARNING',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv_01',
    shop_id: 'shop_01',
    invoice_number: 'TRC-PUN-00101',
    customer_id: 'cust_01',
    customer_name_snapshot: 'Rahul Deshmukh',
    customer_phone_snapshot: '9822012345',
    subtotal_paise: 64000, // ₹640.00
    discount_paise: 2000, // ₹20.00
    tax_paise: 3000, // ₹30.00
    total_amount_paise: 65000, // ₹650.00
    paid_amount_paise: 65000,
    balance_amount_paise: 0,
    payment_status: 'PAID',
    payment_method: 'UPI',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    items: [
      {
        product_id: 'prod_01',
        product_name_snapshot: 'Amul Taaza Homogenised Toned Milk (1L)',
        unit_snapshot: 'packet',
        unit_price_paise: 7200,
        tax_rate_percent: 0,
        tax_paise: 0,
        quantity: 2,
        line_total_paise: 14400,
      },
      {
        product_id: 'prod_03',
        product_name_snapshot: 'India Gate Basmati Rice Premium (5kg)',
        unit_snapshot: 'packet',
        unit_price_paise: 52000,
        tax_rate_percent: 5,
        tax_paise: 2600,
        quantity: 1,
        line_total_paise: 52000,
      },
    ],
  },
  {
    id: 'inv_02',
    shop_id: 'shop_01',
    invoice_number: 'TRC-PUN-00102',
    customer_id: 'cust_01',
    customer_name_snapshot: 'Rahul Deshmukh',
    customer_phone_snapshot: '9822012345',
    subtotal_paise: 250000, // ₹2,500.00
    discount_paise: 0,
    tax_paise: 12500,
    total_amount_paise: 262500, // ₹2,625.00
    paid_amount_paise: 100000, // Paid ₹1,000 cash
    balance_amount_paise: 162500, // Remaining ₹1,625 added to PayLater
    payment_status: 'PARTIALLY_PAID',
    payment_method: 'SPLIT',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
];

export const DEMO_EXPENSES: Expense[] = [
  {
    id: 'exp_01',
    shop_id: 'shop_01',
    category: 'Electricity',
    title: 'MSEDCL Monthly Shop Power Bill',
    amount_paise: 425000, // ₹4,250.00
    payment_method: 'UPI',
    incurred_date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'exp_02',
    shop_id: 'shop_01',
    category: 'Tea & Refreshments',
    title: 'Staff Afternoon Tea & Snacks',
    amount_paise: 18000, // ₹180.00
    payment_method: 'CASH',
    incurred_date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'exp_03',
    shop_id: 'shop_01',
    category: 'Inventory Freight',
    title: 'Tempo Delivery Charges from Market Yard',
    amount_paise: 65000, // ₹650.00
    payment_method: 'CASH',
    incurred_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  },
];

export const DEMO_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif_01',
    shop_id: 'shop_01',
    title: 'Critical Low Stock Alert',
    message: 'Maggi 2-Minute Noodles has only 4 packets remaining (threshold: 12).',
    type: 'LOW_STOCK',
    action_url: '/inventory',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'notif_02',
    shop_id: 'shop_01',
    title: 'Tata Dal Low Stock',
    message: 'Tata Sampann Toor Dal is down to 2 packets. Consider requesting stock via TRACE Network.',
    type: 'LOW_STOCK',
    action_url: '/network',
    is_read: false,
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
  {
    id: 'notif_03',
    shop_id: 'shop_01',
    title: 'PayLater Overdue Reminder',
    message: 'Vikas Kadam has an outstanding balance of ₹4,800 exceeding normal terms.',
    type: 'PAYMENT_OVERDUE',
    action_url: '/paylater',
    is_read: false,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
];

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

