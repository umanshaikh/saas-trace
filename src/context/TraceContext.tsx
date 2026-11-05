"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Shop,
  Profile,
  Role,
  Product,
  Category,
  Customer,
  Invoice,
  InvoiceItem,
  Expense,
  SubscriptionPlan,
  ShopSubscription,
  NetworkOrder,
  InAppNotification,
  AccessStatus,
  PlatformSettings,
  PrivacySettings,
} from "../lib/types";
import {
  DEMO_SHOPS,
  DEMO_PROFILES,
  DEMO_MEMBERSHIPS,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_CUSTOMERS,
  DEMO_INVOICES,
  DEMO_EXPENSES,
  DEMO_NOTIFICATIONS,
  INITIAL_PLANS,
} from "../lib/db/mock-store";
import { generateInvoiceNumber } from "../lib/utils";
import { supabase } from "../lib/supabase/client";

interface TraceContextType {
  activeShop: Shop;
  currentUser: Profile;
  userRole: Role;
  allShops: Shop[];
  products: Product[];
  categories: Category[];
  customers: Customer[];
  invoices: Invoice[];
  expenses: Expense[];
  notifications: InAppNotification[];
  networkOrders: NetworkOrder[];
  subscriptionPlans: SubscriptionPlan[];
  activeSubscription: ShopSubscription;
  language: "en" | "hi" | "mr";
  syncStatus: "IDLE" | "SYNCING" | "SYNCED" | "ERROR";
  syncWithSupabase: () => Promise<void>;
  // Super Admin / Founder Extensions
  allProducts: Product[];
  allInvoices: Invoice[];
  allSubscriptions: Record<string, ShopSubscription>;
  platformSettings: PlatformSettings;
  privacySettings: PrivacySettings;
  updatePlatformSettings: (settings: Partial<PlatformSettings>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  superAdminUpdateSubscription: (
    shopId: string,
    planId: string,
    cycle: "MONTHLY" | "YEARLY",
    extendDays?: number
  ) => void;
  // Actions
  switchShop: (shopId: string) => void;
  switchRole: (role: Role) => void;
  setLanguage: (lang: "en" | "hi" | "mr") => void;
  updateActiveShop: (updates: Partial<Shop>) => Promise<void>;
  registerNewShop: (data: {
    name: string;
    business_type: any;
    city: string;
    email: string;
    phone?: string;
    address_line1?: string;
    gstin?: string;
    state?: string;
    pincode?: string;
  }) => Promise<Shop>;
  addProduct: (product: Partial<Product>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, quantityDelta: number, reason: string, notes?: string) => void;
  createInvoice: (
    items: InvoiceItem[],
    paymentMethod: "CASH" | "UPI" | "CARD" | "PAYLATER" | "SPLIT" | "BANK_TRANSFER",
    paidAmountPaise: number,
    customerId?: string,
    customerName?: string,
    customerPhone?: string,
    notes?: string
  ) => Invoice;
  addCustomer: (customer: Partial<Customer>) => Customer;
  recordCustomerPayment: (customerId: string, amountPaise: number, paymentMethod: string, note?: string) => void;
  addExpense: (expense: Partial<Expense>) => void;
  createNetworkOrder: (supplierShopId: string, items: any[], deliveryType?: 'PICKUP' | 'SUPPLIER_DELIVERY', notes?: string) => NetworkOrder;
  updateNetworkOrderStatus: (orderId: string, status: any) => void;
  updateShopSubscription: (planId: string, cycle: "MONTHLY" | "YEARLY") => void;
  superAdminUpdateShopStatus: (shopId: string, status: AccessStatus, reason?: string) => void;
  markNotificationRead: (id: string) => void;
}

const TraceContext = createContext<TraceContextType | undefined>(undefined);

export function TraceProvider({ children }: { children: React.ReactNode }) {
  // State initialization with localStorage fallback
  const [allShops, setAllShops] = useState<Shop[]>(DEMO_SHOPS);
  const [activeShopId, setActiveShopId] = useState<string>(DEMO_SHOPS[0].id);
  const [currentUser, setCurrentUser] = useState<Profile>(DEMO_PROFILES[0]);
  const [userRole, setUserRole] = useState<Role>("OWNER");
  const [language, setLanguage] = useState<"en" | "hi" | "mr">("en");
  const [syncStatus, setSyncStatus] = useState<"IDLE" | "SYNCING" | "SYNCED" | "ERROR">("IDLE");

  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES);
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);
  const [notifications, setNotifications] = useState<InAppNotification[]>(DEMO_NOTIFICATIONS);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);

  // Sync with Supabase & load local cache on mount
  const syncWithSupabase = async () => {
    try {
      setSyncStatus("SYNCING");
      // 1. Fetch shops from Supabase
      const { data: dbShops, error: shopErr } = await supabase.from("shops").select("*");
      if (!shopErr && dbShops && dbShops.length > 0) {
        setAllShops((prev) => {
          const dbIds = new Set(dbShops.map((s: any) => s.id));
          const localOnly = prev.filter((s) => !dbIds.has(s.id));
          const merged = [...dbShops, ...localOnly];
          if (typeof window !== "undefined") localStorage.setItem("trace_shops", JSON.stringify(merged));
          return merged;
        });
      }

      // 2. Fetch products from Supabase
      const { data: dbProducts, error: prodErr } = await supabase.from("products").select("*");
      if (!prodErr && dbProducts && dbProducts.length > 0) {
        setProducts((prev) => {
          const dbIds = new Set(dbProducts.map((p: any) => p.id));
          const localOnly = prev.filter((p) => !dbIds.has(p.id));
          const merged = [...dbProducts, ...localOnly];
          if (typeof window !== "undefined") localStorage.setItem("trace_products", JSON.stringify(merged));
          return merged;
        });
      }

      // 3. Fetch categories from Supabase
      const { data: dbCategories, error: catErr } = await supabase.from("categories").select("*");
      if (!catErr && dbCategories && dbCategories.length > 0) {
        setCategories((prev) => {
          const dbIds = new Set(dbCategories.map((c: any) => c.id));
          const localOnly = prev.filter((c) => !dbIds.has(c.id));
          return [...dbCategories, ...localOnly];
        });
      }

      setSyncStatus("SYNCED");
    } catch (err) {
      console.warn("Supabase background sync:", err);
      setSyncStatus("IDLE");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedShops = localStorage.getItem("trace_shops");
        if (savedShops) setAllShops(JSON.parse(savedShops));
        const savedProducts = localStorage.getItem("trace_products");
        if (savedProducts) setProducts(JSON.parse(savedProducts));
        const savedActiveShopId = localStorage.getItem("trace_active_shop_id");
        if (savedActiveShopId) setActiveShopId(savedActiveShopId);
      } catch (err) {
        console.warn("Failed to load local storage cache:", err);
      }
    }
    syncWithSupabase();
  }, []);

  const [subscriptions, setSubscriptions] = useState<Record<string, ShopSubscription>>({
    shop_01: {
      id: "sub_01",
      shop_id: "shop_01",
      plan_id: "pro",
      billing_cycle: "MONTHLY",
      status: "ACTIVE",
      starts_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      current_period_ends_at: new Date(Date.now() + 15 * 86400000).toISOString(),
      plan: INITIAL_PLANS.find((p) => p.id === "pro"),
    },
    shop_02: {
      id: "sub_02",
      shop_id: "shop_02",
      plan_id: "business",
      billing_cycle: "YEARLY",
      status: "ACTIVE",
      starts_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      current_period_ends_at: new Date(Date.now() + 305 * 86400000).toISOString(),
      plan: INITIAL_PLANS.find((p) => p.id === "business"),
    },
    shop_03: {
      id: "sub_03",
      shop_id: "shop_03",
      plan_id: "starter",
      billing_cycle: "MONTHLY",
      status: "ACTIVE",
      starts_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      current_period_ends_at: new Date(Date.now() + 25 * 86400000).toISOString(),
      plan: INITIAL_PLANS.find((p) => p.id === "starter"),
    },
  });

  // SaaS Platform-Wide Owner Settings (isolated from merchant storefronts)
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    razorpayKeyId: "rzp_live_89a7f8e32c0b4d",
    razorpayKeySecret: "••••••••••••••••••••••••",
    stripePublishableKey: "pk_live_51M0abcdef9876543210",
    stripeSecretKey: "••••••••••••••••••••••••",
    platformUpiVpa: "trace.founder@icici",
    platformFeePercent: 0.0,
    testMode: false,
    aiProvider: "gemini",
    geminiApiKey: "••••••••••••••••••••••••",
    aiModel: "gemini-1.5-flash",
    temperature: 0.2,
    maintenanceMode: false,
    allowNewRegistrations: true,
  });

  // Data Privacy & Statutory Compliance (DPDP Act 2023)
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dpdpComplianceEnabled: true,
    dataRetentionInvoicesYears: 7, // CGST Act requirement
    dataRetentionKhataYears: 5,
    sessionTimeoutMinutes: 60,
    anonymizeDeletedMerchants: true,
    rlsAuditStatus: "VERIFIED",
  });

  const updatePlatformSettings = (newSettings: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updatePrivacySettings = (newSettings: Partial<PrivacySettings>) => {
    setPrivacySettings((prev) => ({ ...prev, ...newSettings }));
  };

  const superAdminUpdateSubscription = (
    shopId: string,
    planId: string,
    cycle: "MONTHLY" | "YEARLY",
    extendDays: number = 0
  ) => {
    const plan = subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0];
    const existing = subscriptions[shopId];
    const currentEnd = existing?.current_period_ends_at
      ? new Date(existing.current_period_ends_at).getTime()
      : Date.now();

    const baseTime = Math.max(Date.now(), currentEnd);
    const addedDays = extendDays > 0 ? extendDays : cycle === "YEARLY" ? 365 : 30;
    const newEnd = new Date(baseTime + addedDays * 86400000).toISOString();

    const updatedSub: ShopSubscription = {
      id: existing?.id || `sub_${shopId}_${Date.now()}`,
      shop_id: shopId,
      plan_id: planId as any,
      billing_cycle: cycle,
      status: "ACTIVE",
      starts_at: existing?.starts_at || new Date().toISOString(),
      current_period_ends_at: newEnd,
      plan: plan,
    };

    setSubscriptions((prev) => ({
      ...prev,
      [shopId]: updatedSub,
    }));
  };

  const [networkOrders, setNetworkOrders] = useState<NetworkOrder[]>([
    {
      id: "net_01",
      order_number: "NET-ORD-2026-0041",
      buyer_shop_id: "shop_01",
      supplier_shop_id: "shop_02",
      buyer_shop_name: "Apna Supermarket & Provisions",
      supplier_shop_name: "Vogue Men & Women Fashion",
      status: "ACCEPTED",
      delivery_type: "PICKUP",
      subtotal_paise: 240000,
      notes: "Urgent customer pickup required for evening festival event",
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      items: [
        {
          product_name: "Cotton Formal White Shirt (Size 40)",
          unit_price_paise: 120000,
          quantity: 2,
          line_total_paise: 240000,
        },
      ],
    },
  ]);

  const activeShop = allShops.find((s) => s.id === activeShopId) || allShops[0];
  const activeSubscription = subscriptions[activeShop.id] || {
    id: `sub_${activeShop.id}`,
    shop_id: activeShop.id,
    plan_id: "starter",
    billing_cycle: "MONTHLY",
    status: "ACTIVE",
    starts_at: new Date().toISOString(),
    current_period_ends_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    plan: INITIAL_PLANS[0],
  };

  const switchShop = (shopId: string) => {
    const target = allShops.find((s) => s.id === shopId);
    if (target) {
      setActiveShopId(shopId);
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_active_shop_id", shopId);
      }
    }
  };

  const switchRole = (role: Role) => {
    setUserRole(role);
  };

  const updateActiveShop = async (updates: Partial<Shop>) => {
    const updated = { ...activeShop, ...updates };
    setAllShops((prev) => {
      const next = prev.map((s) => (s.id === activeShop.id ? updated : s));
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_shops", JSON.stringify(next));
      }
      return next;
    });

    try {
      const { error } = await supabase.from("shops").update(updates).eq("id", activeShop.id);
      if (error) {
        console.warn("Supabase update shop notice:", error.message);
      } else {
        setSyncStatus("SYNCED");
      }
    } catch (e) {
      console.warn("Supabase shop update error:", e);
    }
  };

  const registerNewShop = async (data: {
    name: string;
    business_type: any;
    city: string;
    email: string;
    phone?: string;
    address_line1?: string;
    gstin?: string;
    state?: string;
    pincode?: string;
  }): Promise<Shop> => {
    const shopId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `shop_${Date.now()}`;
    const ownerId = currentUser.id || "00000000-0000-0000-0000-000000000001";
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `shop-${Date.now()}`;

    const newShop: Shop = {
      id: shopId,
      name: data.name,
      slug,
      business_type: (data.business_type?.toLowerCase() as any) || "retail",
      owner_id: ownerId,
      phone: data.phone || "+919999999999",
      email: data.email,
      address_line1: data.address_line1 || `${data.city} Central Market`,
      city: data.city,
      state: data.state || "Maharashtra",
      pincode: data.pincode || "400001",
      currency: "INR",
      currency_symbol: "₹",
      gstin: data.gstin || "",
      is_verified: true,
      access_status: "ACTIVE",
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      created_at: new Date().toISOString(),
    };

    setAllShops((prev) => {
      const next = [newShop, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_shops", JSON.stringify(next));
        localStorage.setItem("trace_active_shop_id", newShop.id);
      }
      return next;
    });
    setActiveShopId(newShop.id);

    try {
      const { error } = await supabase.from("shops").insert([
        {
          id: newShop.id,
          name: newShop.name,
          slug: newShop.slug,
          business_type: newShop.business_type,
          owner_id: newShop.owner_id,
          phone: newShop.phone,
          email: newShop.email,
          address_line1: newShop.address_line1,
          city: newShop.city,
          state: newShop.state,
          pincode: newShop.pincode,
          currency: newShop.currency,
          currency_symbol: newShop.currency_symbol,
          gstin: newShop.gstin,
          is_verified: newShop.is_verified,
          access_status: newShop.access_status,
          invite_code: newShop.invite_code,
        },
      ]);
      if (error) {
        console.warn("Supabase register shop notice:", error.message);
      } else {
        setSyncStatus("SYNCED");
      }
    } catch (e) {
      console.warn("Supabase register shop error:", e);
    }

    return newShop;
  };

  const addProduct = (data: Partial<Product>): Product => {
    const costPaise = data.cost_price_paise ?? data.purchase_price_paise ?? 0;
    const stockQty = data.stock_quantity ?? data.current_stock ?? 0;
    const taxRate = data.tax_rate ?? data.tax_rate_percent ?? 0;
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}`;

    const newProduct: Product = {
      id,
      shop_id: activeShop.id,
      name: data.name || "Untitled Product",
      category_id: data.category_id || categories[0]?.id,
      barcode: data.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      sku: data.sku || `SKU-${Date.now().toString().slice(-6)}`,
      unit: data.unit || "pcs",
      purchase_price_paise: costPaise,
      cost_price_paise: costPaise,
      selling_price_paise: data.selling_price_paise || 1000,
      current_stock: stockQty,
      stock_quantity: stockQty,
      low_stock_threshold: data.low_stock_threshold ?? 5,
      tax_rate_percent: taxRate,
      tax_rate: taxRate,
      hsn_code: data.hsn_code || "0000",
      is_shared_to_network: data.is_shared_to_network ?? false,
      network_selling_price_paise: data.network_selling_price_paise,
      is_active: true,
    };

    setProducts((prev) => {
      const next = [newProduct, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_products", JSON.stringify(next));
      }
      return next;
    });

    // Auto-save to Supabase in real-time
    (async () => {
      try {
        const { error } = await supabase.from("products").insert([
          {
            id: newProduct.id,
            shop_id: newProduct.shop_id,
            category_id: newProduct.category_id,
            name: newProduct.name,
            barcode: newProduct.barcode,
            sku: newProduct.sku,
            unit: newProduct.unit,
            purchase_price_paise: newProduct.purchase_price_paise,
            selling_price_paise: newProduct.selling_price_paise,
            current_stock: newProduct.current_stock,
            low_stock_threshold: newProduct.low_stock_threshold,
            tax_rate_percent: newProduct.tax_rate_percent,
            hsn_code: newProduct.hsn_code,
            is_shared_to_network: newProduct.is_shared_to_network,
            is_active: true,
          },
        ]);
        if (error) {
          console.warn("Supabase auto-save product notice:", error.message);
        } else {
          setSyncStatus("SYNCED");
        }
      } catch (err) {
        console.warn("Supabase auto-save error:", err);
      }
    })();

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          if (updates.cost_price_paise !== undefined) updated.purchase_price_paise = updates.cost_price_paise;
          if (updates.purchase_price_paise !== undefined) updated.cost_price_paise = updates.purchase_price_paise;
          if (updates.stock_quantity !== undefined) updated.current_stock = updates.stock_quantity;
          if (updates.current_stock !== undefined) updated.stock_quantity = updates.current_stock;
          if (updates.tax_rate !== undefined) updated.tax_rate_percent = updates.tax_rate;
          if (updates.tax_rate_percent !== undefined) updated.tax_rate = updates.tax_rate_percent;
          return updated;
        }
        return p;
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_products", JSON.stringify(next));
      }
      return next;
    });

    // Auto-update to Supabase in real-time
    (async () => {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;
        if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
        if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
        if (updates.selling_price_paise !== undefined) dbUpdates.selling_price_paise = updates.selling_price_paise;
        if (updates.cost_price_paise !== undefined) dbUpdates.purchase_price_paise = updates.cost_price_paise;
        if (updates.purchase_price_paise !== undefined) dbUpdates.purchase_price_paise = updates.purchase_price_paise;
        if (updates.stock_quantity !== undefined) dbUpdates.current_stock = updates.stock_quantity;
        if (updates.current_stock !== undefined) dbUpdates.current_stock = updates.current_stock;
        if (updates.low_stock_threshold !== undefined) dbUpdates.low_stock_threshold = updates.low_stock_threshold;
        if (updates.tax_rate !== undefined) dbUpdates.tax_rate_percent = updates.tax_rate;
        if (updates.tax_rate_percent !== undefined) dbUpdates.tax_rate_percent = updates.tax_rate_percent;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.hsn_code !== undefined) dbUpdates.hsn_code = updates.hsn_code;

        const { error } = await supabase.from("products").update(dbUpdates).eq("id", id);
        if (error) console.warn("Supabase update product notice:", error.message);
        else setSyncStatus("SYNCED");
      } catch (err) {
        console.warn("Supabase update error:", err);
      }
    })();
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_products", JSON.stringify(next));
      }
      return next;
    });

    (async () => {
      try {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) console.warn("Supabase delete product notice:", error.message);
        else setSyncStatus("SYNCED");
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    })();
  };

  const adjustStock = (productId: string, quantityDelta: number, reason: string, notes?: string) => {
    let targetNewQty = 0;
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === productId) {
          const cur = p.current_stock ?? p.stock_quantity ?? 0;
          const newQty = Math.max(0, cur + quantityDelta);
          targetNewQty = newQty;
          // Check if low stock threshold breached
          if (newQty <= p.low_stock_threshold && cur > p.low_stock_threshold) {
            const newNotif: InAppNotification = {
              id: `notif_${Date.now()}`,
              shop_id: p.shop_id,
              title: `Low Stock: ${p.name}`,
              message: `Current stock reached ${newQty} ${p.unit} (threshold: ${p.low_stock_threshold}).`,
              type: "LOW_STOCK",
              action_url: "/inventory",
              is_read: false,
              created_at: new Date().toISOString(),
            };
            setNotifications((n) => [newNotif, ...n]);
          }
          return { ...p, current_stock: newQty, stock_quantity: newQty };
        }
        return p;
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("trace_products", JSON.stringify(next));
      }
      return next;
    });

    (async () => {
      try {
        await supabase
          .from("products")
          .update({ current_stock: targetNewQty })
          .eq("id", productId);
      } catch (err) {
        console.warn("Supabase stock update error:", err);
      }
    })();
  };

  // Atomic checkout & invoice generator with strict integer arithmetic
  const createInvoice = (
    items: InvoiceItem[],
    paymentMethod: "CASH" | "UPI" | "CARD" | "PAYLATER" | "SPLIT" | "BANK_TRANSFER",
    paidAmountPaise: number,
    customerId?: string,
    customerName?: string,
    customerPhone?: string,
    notes?: string
  ): Invoice => {
    // 1. Calculate totals on server/engine in exact paise
    const subtotalPaise = items.reduce((sum, item) => sum + (item.line_total_paise ?? item.total_paise ?? 0), 0);
    const taxPaise = items.reduce((sum, item) => sum + (item.tax_paise ?? 0), 0);
    const discountPaise = 0;
    const totalAmountPaise = subtotalPaise + taxPaise - discountPaise;
    const balanceAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

    let paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" = "PAID";
    if (balanceAmountPaise === 0) {
      paymentStatus = "PAID";
    } else if (paidAmountPaise > 0) {
      paymentStatus = "PARTIALLY_PAID";
    } else {
      paymentStatus = "UNPAID";
    }

    const invoiceNumber = generateInvoiceNumber("TRC");
    const custName = customerName || (customerId ? customers.find((c) => c.id === customerId)?.full_name || customers.find((c) => c.id === customerId)?.name : "Walk-in Guest");
    const custPhone = customerPhone || (customerId ? customers.find((c) => c.id === customerId)?.phone : "");

    const normalizedItems = items.map((i) => ({
      ...i,
      product_name_snapshot: i.product_name_snapshot || i.product_name || "Product",
      product_name: i.product_name || i.product_name_snapshot || "Product",
      unit_snapshot: i.unit_snapshot || "pcs",
      tax_rate_percent: i.tax_rate_percent ?? i.tax_rate ?? 0,
      tax_rate: i.tax_rate ?? i.tax_rate_percent ?? 0,
      line_total_paise: i.line_total_paise ?? i.total_paise ?? 0,
      total_paise: i.total_paise ?? i.line_total_paise ?? 0,
    }));

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      shop_id: activeShop.id,
      invoice_number: invoiceNumber,
      customer_id: customerId,
      customer_name_snapshot: custName,
      customer_name: custName,
      customer_phone_snapshot: custPhone,
      customer_phone: custPhone,
      subtotal_paise: subtotalPaise,
      discount_paise: discountPaise,
      tax_paise: taxPaise,
      total_amount_paise: totalAmountPaise,
      paid_amount_paise: paidAmountPaise,
      balance_amount_paise: balanceAmountPaise,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      items: normalizedItems,
      notes: notes,
    };

    // 2. Atomically deduct inventory for each item
    items.forEach((item) => {
      if (item.product_id) {
        adjustStock(item.product_id, -item.quantity, "INVOICE_SALE", `Billed in ${invoiceNumber}`);
      }
    });

    // 3. If balance remains and customer exists, record PayLater credit debt
    if (balanceAmountPaise > 0 && customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            const currentOut = c.total_outstanding_paise ?? c.outstanding_balance_paise ?? 0;
            const newOutstanding = currentOut + balanceAmountPaise;
            return {
              ...c,
              total_outstanding_paise: newOutstanding,
              outstanding_balance_paise: newOutstanding,
              credit_status: newOutstanding >= c.credit_limit_paise ? "WARNING" : "GOOD",
            };
          }
          return c;
        })
      );
    }

    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  const addCustomer = (data: Partial<Customer>): Customer => {
    const custName = data.full_name || data.name || "New Customer";
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      shop_id: activeShop.id,
      full_name: custName,
      name: custName,
      phone: data.phone || "9999999999",
      email: data.email,
      address: data.address,
      credit_limit_paise: data.credit_limit_paise || 1000000,
      total_outstanding_paise: 0,
      outstanding_balance_paise: 0,
      credit_status: "GOOD",
      created_at: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const recordCustomerPayment = (
    customerId: string,
    amountPaise: number,
    paymentMethod: string,
    note?: string
  ) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const currentOut = c.total_outstanding_paise ?? c.outstanding_balance_paise ?? 0;
          const newOutstanding = Math.max(0, currentOut - amountPaise);
          return {
            ...c,
            total_outstanding_paise: newOutstanding,
            outstanding_balance_paise: newOutstanding,
            credit_status: newOutstanding >= c.credit_limit_paise ? "WARNING" : "GOOD",
          };
        }
        return c;
      })
    );
  };

  const addExpense = (data: Partial<Expense>) => {
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      shop_id: activeShop.id,
      category: data.category || "General",
      title: data.title || "Shop Expense",
      amount_paise: data.amount_paise || 0,
      payment_method: data.payment_method || "CASH",
      incurred_date: data.incurred_date || new Date().toISOString().split("T")[0],
      expense_date: data.expense_date || data.incurred_date || new Date().toISOString().split("T")[0],
      notes: data.notes,
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const createNetworkOrder = (
    supplierShopId: string,
    items: any[],
    deliveryType: 'PICKUP' | 'SUPPLIER_DELIVERY' = 'PICKUP',
    notes?: string
  ): NetworkOrder => {
    const supplier = allShops.find((s) => s.id === supplierShopId);
    const subtotal = items.reduce((sum, it) => sum + it.line_total_paise, 0);
    const orderNumber = `NET-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: NetworkOrder = {
      id: `net_${Date.now()}`,
      order_number: orderNumber,
      buyer_shop_id: activeShop.id,
      supplier_shop_id: supplierShopId,
      buyer_shop_name: activeShop.name,
      supplier_shop_name: supplier?.name || "Connected Partner Store",
      status: "PENDING",
      delivery_type: deliveryType,
      subtotal_paise: subtotal,
      notes: notes,
      created_at: new Date().toISOString(),
      items: items,
    };

    setNetworkOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateNetworkOrderStatus = (orderId: string, status: any) => {
    setNetworkOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status } : ord))
    );
  };

  const updateShopSubscription = (planId: string, cycle: "MONTHLY" | "YEARLY") => {
    const plan = subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0];
    const durationDays = cycle === "YEARLY" ? 365 : 30;

    const newSub: ShopSubscription = {
      id: `sub_${Date.now()}`,
      shop_id: activeShop.id,
      plan_id: planId,
      billing_cycle: cycle,
      status: "ACTIVE",
      starts_at: new Date().toISOString(),
      current_period_ends_at: new Date(Date.now() + durationDays * 86400000).toISOString(),
      plan: plan,
    };

    setSubscriptions((prev) => ({
      ...prev,
      [activeShop.id]: newSub,
    }));
  };

  const superAdminUpdateShopStatus = (shopId: string, status: AccessStatus, reason?: string) => {
    setAllShops((prev) =>
      prev.map((s) => (s.id === shopId ? { ...s, access_status: status, suspension_reason: reason } : s))
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <TraceContext.Provider
      value={{
        activeShop,
        currentUser,
        userRole,
        allShops,
        products: products.filter((p) => p.shop_id === activeShop.id),
        categories: categories.filter((c) => c.shop_id === activeShop.id),
        customers: customers.filter((c) => c.shop_id === activeShop.id),
        invoices: invoices.filter((i) => i.shop_id === activeShop.id),
        expenses: expenses.filter((e) => e.shop_id === activeShop.id),
        notifications: notifications.filter((n) => n.shop_id === activeShop.id),
        networkOrders,
        subscriptionPlans,
        activeSubscription,
        language,
        syncStatus,
        syncWithSupabase,
        // Super Admin / Founder Extensions
        allProducts: products,
        allInvoices: invoices,
        allSubscriptions: subscriptions,
        platformSettings,
        privacySettings,
        updatePlatformSettings,
        updatePrivacySettings,
        superAdminUpdateSubscription,
        // Actions
        switchShop,
        switchRole,
        setLanguage,
        updateActiveShop,
        registerNewShop,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        createInvoice,
        addCustomer,
        recordCustomerPayment,
        addExpense,
        createNetworkOrder,
        updateNetworkOrderStatus,
        updateShopSubscription,
        superAdminUpdateShopStatus,
        markNotificationRead,
      }}
    >
      {children}
    </TraceContext.Provider>
  );
}

export function useTrace() {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error("useTrace must be used within a TraceProvider");
  }
  return context;
}
