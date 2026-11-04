export type Role = 'OWNER' | 'MANAGER' | 'CASHIER';

export type ShopBusinessType = 
  | 'grocery'
  | 'clothing'
  | 'restaurant'
  | 'mobile'
  | 'medical'
  | 'retail'
  | 'other';

export type AccessStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface Profile {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  preferred_language: 'en' | 'hi' | 'mr';
  is_super_admin: boolean;
  created_at?: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  business_type: ShopBusinessType;
  owner_id: string;
  gstin?: string;
  phone: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  currency: string;
  currency_symbol: string;
  is_verified: boolean;
  access_status: AccessStatus;
  suspension_reason?: string;
  invite_code: string;
  qr_code_payload?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Membership {
  id: string;
  shop_id: string;
  profile_id: string;
  role: Role;
  is_active: boolean;
  profile?: Profile;
  shop?: Shop;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id?: string;
  name: string;
  barcode?: string;
  sku?: string;
  unit: string; // pcs, kg, l, box, packet, etc.
  purchase_price_paise: number;
  cost_price_paise?: number;
  selling_price_paise: number;
  current_stock: number;
  stock_quantity?: number;
  low_stock_threshold: number;
  tax_rate_percent: number; // e.g. 0, 5, 12, 18, 28
  tax_rate?: number;
  hsn_code?: string;
  image_url?: string;
  is_shared_to_network?: boolean;
  network_selling_price_paise?: number;
  is_active: boolean;
  category?: Category;
}

export interface Customer {
  id: string;
  shop_id: string;
  full_name: string;
  name?: string;
  phone: string;
  email?: string;
  address?: string;
  credit_limit_paise: number;
  total_outstanding_paise: number;
  outstanding_balance_paise?: number;
  credit_status?: 'GOOD' | 'WARNING' | 'BLOCKED';
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  product_id?: string;
  product_name_snapshot?: string;
  product_name?: string; // alias
  sku_snapshot?: string;
  unit_snapshot?: string;
  unit_price_paise: number;
  tax_rate_percent?: number;
  tax_rate?: number; // alias
  tax_paise?: number;
  quantity: number;
  line_total_paise?: number;
  total_paise?: number; // alias
}

export interface Invoice {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name_snapshot?: string;
  customer_name?: string; // alias
  customer_phone_snapshot?: string;
  customer_phone?: string; // alias
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_amount_paise: number;
  paid_amount_paise: number;
  balance_amount_paise: number;
  payment_status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'REFUNDED';
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'PAYLATER' | 'SPLIT' | 'BANK_TRANSFER';
  created_by?: string;
  notes?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'AMENDED';
  created_at: string;
  items?: InvoiceItem[];
}

export interface StockMovement {
  id: string;
  shop_id: string;
  product_id: string;
  movement_type: 'INVOICE_SALE' | 'RESTOCK' | 'RETURN' | 'ADJUSTMENT' | 'NETWORK_OUT' | 'NETWORK_IN';
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
  product?: Product;
}

export interface Expense {
  id: string;
  shop_id: string;
  category: string;
  title: string;
  amount_paise: number;
  payment_method: string;
  incurred_date: string;
  expense_date?: string;
  notes?: string;
  created_at?: string;
}

export interface SubscriptionPlan {
  id: 'starter' | 'pro' | 'business';
  name: string;
  description: string;
  monthly_price_paise: number;
  yearly_price_paise: number;
  max_products: number;
  max_team_members: number;
  max_users_per_shop?: number;
  max_shops?: number;
  has_ai_assistant: boolean;
  has_network_access: boolean;
  has_shop_network?: boolean;
  has_paylater: boolean;
  has_advanced_reports: boolean;
  is_active: boolean;
}

export interface ShopSubscription {
  id: string;
  shop_id: string;
  plan_id: string;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  starts_at: string;
  current_period_ends_at: string;
  current_period_end?: string;
  trial_ends_at?: string;
  plan?: SubscriptionPlan;
}

export interface NetworkOrder {
  id: string;
  order_number: string;
  buyer_shop_id: string;
  supplier_shop_id: string;
  buyer_shop_name?: string;
  supplier_shop_name?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESERVED' | 'READY_FOR_PICKUP' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  delivery_type: 'PICKUP' | 'SUPPLIER_DELIVERY';
  subtotal_paise: number;
  total_amount_paise?: number; // alias
  notes?: string;
  created_at: string;
  items?: {
    product_name: string;
    unit_price_paise: number;
    quantity: number;
    line_total_paise: number;
  }[];
}

export interface CreditTransaction {
  id: string;
  shop_id: string;
  customer_id: string;
  transaction_type: 'PURCHASE_CREDIT' | 'REPAYMENT' | 'ADJUSTMENT';
  amount_paise: number;
  invoice_id?: string;
  payment_method?: string;
  reference_note?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  shop_id: string;
  invoice_id?: string;
  amount_paise: number;
  payment_method: string;
  gateway_provider?: string;
  status: string;
  reconciled: boolean;
  created_at: string;
}

export interface InAppNotification {
  id: string;
  shop_id: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'NETWORK_ORDER' | 'PAYMENT_OVERDUE' | 'SUBSCRIPTION_RENEWAL' | 'ADMIN_STATUS' | string;
  action_url?: string;
  link?: string; // alias
  is_read: boolean;
  created_at: string;
}

export interface PlatformSettings {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  platformUpiVpa: string;
  platformFeePercent: number;
  testMode: boolean;
  aiProvider: 'gemini' | 'openai';
  geminiApiKey: string;
  aiModel: string;
  temperature: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
}

export interface PrivacySettings {
  dpdpComplianceEnabled: boolean;
  dataRetentionInvoicesYears: number;
  dataRetentionKhataYears: number;
  sessionTimeoutMinutes: number;
  anonymizeDeletedMerchants: boolean;
  rlsAuditStatus: 'VERIFIED' | 'PENDING';
}
