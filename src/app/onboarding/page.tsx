"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTrace } from "@/context/TraceContext";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Store,
  MapPin,
  Mail,
  Phone,
  FileText,
  Package,
  Upload,
  UserPlus,
  Users,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Percent,
  Plus,
  Trash2,
  Clock,
  Printer,
  Send,
  Loader2,
  HelpCircle,
  ShoppingBag,
  Save,
  LogOut,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh"
];

const BUSINESS_CATEGORIES = [
  { id: "grocery", label: "Grocery / Provision Store" },
  { id: "clothing", label: "Clothing & Fashion Apparel" },
  { id: "medical", label: "Medical & Pharmacy" },
  { id: "electronics", label: "Electronics & Mobile Store" },
  { id: "hardware", label: "Hardware & Electricals" },
  { id: "cosmetics", label: "Cosmetics & Beauty" },
  { id: "general_retail", label: "General Store / Departmental" },
  { id: "other", label: "Other Retail Business" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const {
    activeShop,
    activeSubscription,
    updateActiveShop,
    currentUser,
    products,
    addProduct,
    importProductsCSV,
    employees,
    inviteEmployee,
    removeEmployeeInvite,
    createInvoice,
    invoices,
    onboardingProgress,
    saveOnboardingStep,
    completeOnboarding,
    skipOnboardingStep,
    showToast,
  } = useTrace();

  // Current Step: 1 to 8 (resumed from saved progress)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // STEP 2: Shop Information State (Dynamic registered shop name)
  const [shopName, setShopName] = useState(activeShop.name || "");
  const [ownerName, setOwnerName] = useState(currentUser.full_name || "");
  const [category, setCategory] = useState(activeShop.business_type || "grocery");
  const [phone, setPhone] = useState(activeShop.phone || "");
  const [email, setEmail] = useState(activeShop.email || currentUser.email || "");
  const [address, setAddress] = useState(activeShop.address_line1 || "");
  const [city, setCity] = useState(activeShop.city || "Mumbai");
  const [state, setState] = useState(activeShop.state || "Maharashtra");
  const [pincode, setPincode] = useState(activeShop.pincode || "400001");

  // STEP 3: GST Configuration State
  const [isGstRegistered, setIsGstRegistered] = useState<"YES" | "NO" | "LATER">("LATER");
  const [gstin, setGstin] = useState(activeShop.gstin || "");
  const [legalName, setLegalName] = useState(activeShop.name || "");
  const [gstState, setGstState] = useState(activeShop.state || "Maharashtra");
  const [registrationType, setRegistrationType] = useState<"REGULAR" | "COMPOSITION">("REGULAR");

  // STEP 4: Inventory State
  const [inventoryMode, setInventoryMode] = useState<"MANUAL" | "CSV" | "SKIPPED">("MANUAL");
  const [prodTitle, setProdTitle] = useState("");
  const [prodCategory, setProdCategory] = useState("General");
  const [prodSku, setProdSku] = useState(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [prodBarcode, setProdBarcode] = useState(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
  const [prodCost, setProdCost] = useState("60");
  const [prodPrice, setProdPrice] = useState("95");
  const [prodTax, setProdTax] = useState("5");
  const [prodQty, setProdQty] = useState("30");
  const [prodMinStock, setProdMinStock] = useState("5");
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  // STEP 5: Employee Setup State
  const [hasStaff, setHasStaff] = useState<boolean>(false);
  const [empName, setEmpName] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empRole, setEmpRole] = useState<"MANAGER" | "CASHIER" | "STAFF">("CASHIER");

  // STEP 6: Payment Modes State
  const [acceptCash, setAcceptCash] = useState(true);
  const [acceptUpi, setAcceptUpi] = useState(true);
  const [upiVpa, setUpiVpa] = useState(`pay.${activeShop.slug || "trace"}@icici`);
  const [acceptCard, setAcceptCard] = useState(true);
  const [acceptBankTransfer, setAcceptBankTransfer] = useState(false);
  const [acceptCustomerCredit, setAcceptCustomerCredit] = useState(true);

  // STEP 7: First Invoice State
  const [selectedProdId, setSelectedProdId] = useState<string>("");
  const [invQty, setInvQty] = useState(1);
  const [invCustName, setInvCustName] = useState("Walk-in Customer");
  const [invCustPhone, setInvCustPhone] = useState("+91 98765 43210");
  const [invDiscountRupees, setInvDiscountRupees] = useState(0);
  const [invPaymentMethod, setInvPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null);

  // Resume Incomplete Onboarding on Mount
  useEffect(() => {
    if (activeShop?.name && !shopName) {
      setShopName(activeShop.name);
    }

    if (onboardingProgress) {
      if (!onboardingProgress.isCompleted && onboardingProgress.currentStep > 1) {
        setCurrentStep(onboardingProgress.currentStep);
      }

      const d = onboardingProgress.stepData;
      if (d?.shop) {
        if (d.shop.name) setShopName(d.shop.name);
        if (d.shop.ownerName) setOwnerName(d.shop.ownerName);
        if (d.shop.businessCategory) setCategory(d.shop.businessCategory as any);
        if (d.shop.phone) setPhone(d.shop.phone);
        if (d.shop.address) setAddress(d.shop.address);
        if (d.shop.city) setCity(d.shop.city);
        if (d.shop.state) setState(d.shop.state);
        if (d.shop.pincode) setPincode(d.shop.pincode);
      }
      if (d?.gst) {
        if (d.gst.isGstRegistered) setIsGstRegistered(d.gst.isGstRegistered);
        if (d.gst.gstin) setGstin(d.gst.gstin);
        if (d.gst.legalBusinessName) setLegalName(d.gst.legalBusinessName);
      }
      if (d?.payments) {
        if (d.payments.acceptCash !== undefined) setAcceptCash(d.payments.acceptCash);
        if (d.payments.acceptUpi !== undefined) setAcceptUpi(d.payments.acceptUpi);
        if (d.payments.upiVpa) setUpiVpa(d.payments.upiVpa);
        if (d.payments.acceptCard !== undefined) setAcceptCard(d.payments.acceptCard);
        if (d.payments.acceptCustomerCredit !== undefined) setAcceptCustomerCredit(d.payments.acceptCustomerCredit);
      }
    }
  }, [onboardingProgress, activeShop]);

  // Keep first invoice selected product synced
  useEffect(() => {
    if (products.length > 0 && !selectedProdId) {
      setSelectedProdId(products[0].id);
    }
  }, [products, selectedProdId]);

  // Visual Confetti Celebration on reaching Step 8
  useEffect(() => {
    if (currentStep === 8) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch (e) {}
    }
  }, [currentStep]);

  // STEP WIZARD DEFINITIONS
  const stepsList = [
    { num: 1, label: "Welcome", icon: Sparkles },
    { num: 2, label: "Shop Profile", icon: Store },
    { num: 3, label: "GST Tax", icon: Percent },
    { num: 4, label: "Inventory", icon: Package },
    { num: 5, label: "Team", icon: Users },
    { num: 6, label: "Payments", icon: CreditCard },
    { num: 7, label: "First Bill", icon: Receipt },
    { num: 8, label: "Complete", icon: CheckCircle2 },
  ];

  // Visual Progress Calculations
  const completedStepsList = onboardingProgress?.completedSteps || [];
  const completedCount = completedStepsList.length;
  const remainingCount = Math.max(0, 8 - completedCount);
  const completionPercentage = Math.round((completedCount / 8) * 100);
  const dynamicEstimatedMins = Math.max(1, Math.ceil(remainingCount * 0.75));

  // Current display name (strictly dynamic)
  const currentDisplayName = shopName.trim() || activeShop.name || "Your Store";

  // Helper to collect current step state
  const getCurrentStepData = () => ({
    shop: {
      name: shopName.trim(),
      ownerName: ownerName.trim(),
      businessCategory: category,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    },
    gst: {
      isGstRegistered,
      gstin: gstin.trim().toUpperCase(),
      legalBusinessName: legalName.trim(),
      state: gstState,
      registrationType,
    },
    payments: {
      acceptCash,
      acceptUpi,
      upiVpa: acceptUpi ? upiVpa.trim() : undefined,
      acceptCard,
      acceptBankTransfer,
      acceptCustomerCredit,
    },
  });

  // Save Progress & Continue Later
  const handleSaveAndContinueLater = async () => {
    setIsSaving(true);
    try {
      await saveOnboardingStep(currentStep, getCurrentStepData(), false);
      showToast("info", "Progress Saved", `Step ${currentStep} progress stored. Resuming available from dashboard.`);
      router.push("/dashboard");
    } finally {
      setIsSaving(false);
      setIsExitModalOpen(false);
    }
  };

  // ==========================================
  // HANDLERS FOR EACH STEP
  // ==========================================

  // Step 2: Save Shop Info
  const handleSaveShopInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      showToast("error", "Missing Details", "Please fill in all required shop fields.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      showToast("error", "Invalid Phone", "Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSaving(true);
    try {
      await updateActiveShop({
        name: shopName.trim(),
        business_type: category as any,
        phone: phone.trim(),
        email: email.trim(),
        address_line1: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      });

      await saveOnboardingStep(2, {
        shop: {
          name: shopName.trim(),
          ownerName: ownerName.trim(),
          businessCategory: category,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
      });

      showToast("success", "Shop Details Saved", `${shopName.trim()} profile updated.`);
      setCurrentStep(3);
    } catch (err: any) {
      showToast("error", "Save Failed", err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Step 3: Save GST Info
  const handleSaveGST = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGstRegistered === "YES") {
      const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const cleanGstin = gstin.trim().toUpperCase();
      if (!GSTIN_REGEX.test(cleanGstin)) {
        showToast("error", "Invalid GSTIN", "Please enter a valid 15-character Indian GSTIN (e.g. 27ABCDE1234F1Z5).");
        return;
      }

      setIsSaving(true);
      try {
        await updateActiveShop({
          gstin: cleanGstin,
          state: gstState,
        });

        await saveOnboardingStep(3, {
          gst: {
            isGstRegistered: "YES",
            gstin: cleanGstin,
            legalBusinessName: legalName.trim(),
            state: gstState,
            registrationType,
          },
        });

        showToast("success", "GST Configured", `GSTIN ${cleanGstin} linked to shop.`);
        setCurrentStep(4);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(true);
      try {
        await saveOnboardingStep(3, {
          gst: {
            isGstRegistered,
            gstin: "",
            legalBusinessName: shopName,
            state,
            registrationType: "REGULAR",
          },
        });
        showToast("info", "GST Noted", isGstRegistered === "NO" ? "Marked as GST-exempt / unregistered." : "You can configure GST anytime in Settings.");
        setCurrentStep(4);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Step 4: Add Manual Product
  const handleAddManualProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim()) {
      showToast("error", "Title Required", "Please enter product name.");
      return;
    }

    const price = Number(prodPrice);
    const cost = Number(prodCost) || 0;
    const stock = Number(prodQty) || 0;

    if (isNaN(price) || price <= 0) {
      showToast("error", "Invalid Price", "Selling price must be greater than ₹0.");
      return;
    }

    addProduct({
      name: prodTitle.trim(),
      selling_price_paise: rupeesToPaise(price),
      cost_price_paise: rupeesToPaise(cost),
      purchase_price_paise: rupeesToPaise(cost),
      stock_quantity: stock,
      current_stock: stock,
      low_stock_threshold: Number(prodMinStock) || 5,
      sku: prodSku.trim(),
      barcode: prodBarcode.trim(),
      unit: "pcs",
      tax_rate_percent: Number(prodTax) || 0,
      tax_rate: Number(prodTax) || 0,
    });

    showToast("success", "Product Added", `"${prodTitle.trim()}" added to inventory.`);
    setProdTitle("");
    setProdSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setProdBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  // Quick 1-Click Test Product for Step 7 fallback
  const handleAddQuickSampleProduct = () => {
    const sample = {
      name: "Standard Retail Sample Item",
      selling_price_paise: 10000,
      cost_price_paise: 7500,
      purchase_price_paise: 7500,
      stock_quantity: 25,
      current_stock: 25,
      low_stock_threshold: 5,
      sku: `SAMPLE-${Math.floor(100 + Math.random() * 900)}`,
      barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
      unit: "pcs",
      tax_rate_percent: 5,
      tax_rate: 5,
    };
    const created = addProduct(sample);
    setSelectedProdId(created.id);
    showToast("success", "Sample Product Ready", "Added sample item (₹100) for instant bill testing.");
  };

  // Step 4: CSV Import
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const res = await importProductsCSV(content);
      if (res.imported > 0) {
        setCsvStatus(`Successfully imported ${res.imported} products!`);
        showToast("success", "Catalog Imported", `${res.imported} items loaded.`);
      } else {
        setCsvStatus(`Failed: ${res.errors.join(", ")}`);
        showToast("error", "Import Error", res.errors[0] || "Could not parse CSV.");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleInventory = async () => {
    const sample = `Product Name,Selling Price,Cost Price,Current Stock,SKU,Barcode,GST Rate,Unit
Aashirvaad Shudh Chakki Atta 5kg,240,195,35,ATTA-5K,890103001,5,bag
Fortune Sunlite Sunflower Oil 1L,145,120,40,OIL-1L,890103002,5,bottle
Tata Salt Iodised 1kg,28,22,60,SALT-1K,890103003,0,packet
Amul Taaza Milk 500ml,27,24,50,MILK-500,890103004,5,pouch
Britannia Good Day Cookies 100g,30,22,75,BIS-100,890103005,18,packet`;
    const res = await importProductsCSV(sample);
    setCsvStatus(`Loaded ${res.imported} products from retail template.`);
    showToast("success", "Template Loaded", `${res.imported} standard products added.`);
  };

  const handleContinueFromInventory = async () => {
    if (products.length === 0) {
      showToast("info", "No Products Added", "Add at least one product, or click 'Skip for Now' if you wish to configure inventory later.");
      return;
    }
    await saveOnboardingStep(4, {
      inventory: {
        mode: inventoryMode,
        productCount: products.length,
      },
    });
    setCurrentStep(5);
  };

  // Step 5: Invite Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empPhone.trim()) {
      showToast("error", "Missing Info", "Employee name, email, and mobile are required.");
      return;
    }

    try {
      await inviteEmployee({
        shopId: activeShop.id,
        name: empName.trim(),
        email: empEmail.trim(),
        phone: empPhone.trim(),
        role: empRole,
        permissions:
          empRole === "MANAGER"
            ? ["INVENTORY_EDIT", "POS_BILLING", "VIEW_REPORTS", "DISCOUNTS_ALLOW"]
            : empRole === "CASHIER"
            ? ["POS_BILLING", "VIEW_INVOICES"]
            : ["STOCK_COUNT"],
      });
      setEmpName("");
      setEmpEmail("");
      setEmpPhone("");
    } catch (e: any) {
      showToast("error", "Invite Failed", e?.message);
    }
  };

  const handleContinueFromEmployees = async () => {
    await saveOnboardingStep(5, {
      employees: {
        hasEmployees: employees.length > 0,
        invitedList: employees.map((e) => ({
          name: e.name,
          phone: e.phone,
          email: e.email,
          role: e.role,
        })),
      },
    });
    setCurrentStep(6);
  };

  // Step 6: Save Payment Settings
  const handleSavePayments = async () => {
    if (!acceptCash && !acceptUpi && !acceptCard && !acceptBankTransfer && !acceptCustomerCredit) {
      showToast("error", "Payment Method Required", "Please enable at least one payment method to accept counter payments.");
      return;
    }
    setIsSaving(true);
    try {
      await saveOnboardingStep(6, {
        payments: {
          acceptCash,
          acceptUpi,
          upiVpa: acceptUpi ? upiVpa.trim() : undefined,
          acceptCard,
          acceptBankTransfer,
          acceptCustomerCredit,
        },
      });
      showToast("success", "Payments Configured", "Billing payment options saved.");
      setCurrentStep(7);
    } finally {
      setIsSaving(false);
    }
  };

  // Step 7: Generate Real First Invoice
  const handleGenerateFirstInvoice = async () => {
    const prod = products.find((p) => p.id === selectedProdId) || products[0];
    if (!prod) {
      showToast("error", "No Product Selected", "Please select or add an inventory product first.");
      return;
    }

    const availableStock = prod.stock_quantity ?? prod.current_stock ?? 0;
    if (availableStock < invQty) {
      showToast("error", "Stock Exceeded", `Only ${availableStock} units available for ${prod.name}.`);
      return;
    }

    setIsSaving(true);
    try {
      const taxRate = prod.tax_rate ?? prod.tax_rate_percent ?? 0;
      const unitPricePaise = prod.selling_price_paise;
      const grossPaise = unitPricePaise * invQty;
      const discountPaise = rupeesToPaise(Math.min(invDiscountRupees, grossPaise / 100));
      const taxablePaise = Math.max(0, grossPaise - discountPaise);
      const taxPaise = Math.round(taxablePaise * (taxRate / 100));
      const grandTotalPaise = taxablePaise + taxPaise;

      const items = [
        {
          product_id: prod.id,
          product_name: prod.name,
          product_name_snapshot: prod.name,
          sku_snapshot: prod.sku,
          unit_snapshot: prod.unit || "pcs",
          quantity: invQty,
          unit_price_paise: unitPricePaise,
          tax_rate: taxRate,
          tax_rate_percent: taxRate,
          tax_paise: taxPaise,
          line_total_paise: grossPaise,
          total_paise: grossPaise,
        },
      ];

      const inv = await createInvoice(
        items,
        invPaymentMethod,
        grandTotalPaise,
        undefined,
        invCustName.trim() || "First Test Patron",
        invCustPhone.trim(),
        "First Onboarding Test Invoice",
        false,
        discountPaise
      );

      setGeneratedInvoice(inv);

      // Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      await saveOnboardingStep(7, {
        firstInvoice: {
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          totalPaise: inv.total_amount_paise,
          paymentMethod: invPaymentMethod,
        },
      });

      showToast("success", "Invoice Generated!", `Invoice #${inv.invoice_number} successfully recorded in database.`);
    } catch (e: any) {
      showToast("error", "Invoice Failed", e?.message || "Failed to generate invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // Step 8: Complete Onboarding & Exit (Redirects to Membership if unpaid)
  const isDemoShopStore =
    activeShop.id.startsWith("shop_0") ||
    activeShop.id === "shop_default" ||
    activeShop.id === "11111111-1111-1111-1111-111111111111";

  const isSubActiveOnboarding =
    isDemoShopStore ||
    (activeSubscription &&
      activeSubscription.status === "ACTIVE" &&
      new Date(activeSubscription.current_period_ends_at) > new Date());

  const handleFinishOnboarding = async (targetRoute: "/dashboard" | "/pos" | "/ai-assistant") => {
    setIsSaving(true);
    try {
      await completeOnboarding();
      if (!isSubActiveOnboarding) {
        showToast("info", "Membership Required", "Shop setup complete! Please select a membership plan to unlock your dashboard.");
        router.push("/subscriptions?welcome=true");
      } else {
        router.push(targetRoute);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Active Payment Methods Summary List
  const enabledPaymentList = [
    acceptCash && "Cash",
    acceptUpi && `UPI QR (${upiVpa || "Enabled"})`,
    acceptCard && "Card Swipe",
    acceptCustomerCredit && "PayLater Khata",
    acceptBankTransfer && "Bank Transfer",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-400">
      {/* Top Wizard Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-base tracking-wider text-white">TRACE</span>
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md text-xs font-medium text-slate-200">
              <Store className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-semibold">{currentDisplayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExitModalOpen(true)}
              className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              <span>Exit to Dashboard</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Visual Progress Dashboard */}
      <div className="border-b border-slate-800/60 bg-slate-900/40 px-4 py-2.5">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Step {currentStep} of 8:</span>
              <span className="text-indigo-400 font-medium">{stepsList[currentStep - 1]?.label}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-medium">
                <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-emerald-400" />
                {completedCount} completed
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                {remainingCount} remaining
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-extrabold text-white bg-indigo-600/30 px-2 py-0.5 rounded text-[10px] text-indigo-300 border border-indigo-500/30">
                {completionPercentage}% complete
              </span>
            </div>
          </div>

          {/* Animated Gradient Progress Bar */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${Math.max(6, completionPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Steps Navigation Pill Bar */}
      <div className="border-b border-slate-800/60 bg-slate-900/20 px-4 py-2 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between min-w-[640px]">
          {stepsList.map((step) => {
            const isCurrent = currentStep === step.num;
            const isDone = completedStepsList.includes(step.num) || currentStep > step.num;
            const Icon = step.icon;

            return (
              <button
                key={step.num}
                onClick={() => {
                  if (isDone || isCurrent || step.num <= (onboardingProgress?.currentStep || 1)) {
                    setCurrentStep(step.num);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : isDone
                    ? "text-emerald-400 hover:bg-slate-800/60"
                    : "text-slate-500 hover:text-slate-400 opacity-60"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isCurrent
                      ? "bg-white text-indigo-600"
                      : isDone
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : step.num}
                </div>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* ======================================================== */}
        {/* STEP 1: WELCOME SCREEN */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="text-center space-y-6 max-w-xl mx-auto py-6 animate-in fade-in duration-200">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-2xl shadow-indigo-500/30">
              <Sparkles className="h-10 w-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Welcome to TRACE
              </h1>
              <p className="text-sm sm:text-base text-slate-400 font-medium">
                Let's set up <span className="text-indigo-400 font-bold">{currentDisplayName}</span> in a few simple steps.
              </p>
            </div>

            {/* Estimated Setup Time: 5-7 minutes */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-300 shadow-sm">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span>Estimated setup time: <strong>5–7 minutes</strong> ({dynamicEstimatedMins} mins remaining)</span>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-1">
                <Receipt className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">Fast POS Counter (F1)</h4>
                <p className="text-[11px] text-slate-400">Barcode scanner input, split payments, and 80mm ESC/POS thermal printing.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-1">
                <Package className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">Real-Time Inventory</h4>
                <p className="text-[11px] text-slate-400">Atomic inventory deduction per bill, low-stock alerts, and CSV import.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-1">
                <Percent className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Indian GST Reporting</h4>
                <p className="text-[11px] text-slate-400">CGST (50%) + SGST (50%) intra-state or IGST inter-state compliant tax slips.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-1">
                <CreditCard className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white">PayLater Khata</h4>
                <p className="text-[11px] text-slate-400">Customer credit ledgers with direct WhatsApp receipt sharing.</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto px-8 font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 text-white"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SHOP INFORMATION */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 2 of 8</span>
              <h2 className="text-xl font-bold text-white mt-1">Shop Profile & Address</h2>
              <p className="text-xs text-slate-400">
                Provide legal business establishment and contact details printed on your receipts.
              </p>
            </div>

            <form onSubmit={handleSaveShopInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Shop / Store Legal Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Anand Provision & General Store"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Owner / Merchant Name *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Business Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Primary Mobile Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Store Contact Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@store.in"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Shop Street Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop No. 4, Ground Floor, Market Road"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">City / Town *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">State / Union Territory *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">PIN Code *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 400001"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Navigation Bar */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-400 hover:text-white gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAndContinueLater}
                    disabled={isSaving}
                    className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                  >
                    <Save className="h-3.5 w-3.5 text-slate-400" />
                    <span>Save & Continue Later</span>
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>Save & Continue</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: GST CONFIGURATION */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 3 of 8</span>
              <h2 className="text-xl font-bold text-white mt-1">GST & Tax Configuration</h2>
              <p className="text-xs text-slate-400">
                Configure legal Goods and Services Tax status for invoice compliance.
              </p>
            </div>

            <form onSubmit={handleSaveGST} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">
                  Is your business registered under Indian GST?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "YES", title: "Yes, Registered", desc: "I have a 15-digit GSTIN number" },
                    { id: "NO", title: "No, Unregistered", desc: "Turnover below threshold / exempt" },
                    { id: "LATER", title: "Configure Later", desc: "I will add GST details later" },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setIsGstRegistered(opt.id as any)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isGstRegistered === opt.id
                          ? "border-indigo-500 bg-indigo-500/10 text-white shadow-sm"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className="font-bold text-xs text-white">{opt.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {isGstRegistered === "YES" && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">
                        15-Digit GSTIN Number *
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Format: 2 State + 10 PAN + 1 Entity + Z + 1 Check</p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">
                        Legal Business Name (as on GST Certificate) *
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Anand Retail Ventures Pvt Ltd"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Registration State</label>
                      <select
                        value={gstState}
                        onChange={(e) => setGstState(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">GST Registration Scheme</label>
                      <select
                        value={registrationType}
                        onChange={(e) => setRegistrationType(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="REGULAR">Regular Taxpayer (CGST + SGST / IGST)</option>
                        <option value="COMPOSITION">Composition Scheme (Flat Rate)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Bar */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-slate-400 hover:text-white gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      skipOnboardingStep(3);
                      setCurrentStep(4);
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Skip for Now
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAndContinueLater}
                    disabled={isSaving}
                    className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                  >
                    <Save className="h-3.5 w-3.5 text-slate-400" />
                    <span>Save & Continue Later</span>
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>Save & Continue</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: INVENTORY SETUP */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 4 of 8</span>
                <h2 className="text-xl font-bold text-white mt-1">Inventory Setup</h2>
                <p className="text-xs text-slate-400">
                  Add products manually, import spreadsheet, or skip to configure later.
                </p>
              </div>
              <Badge variant="outline" className="text-xs border-indigo-500/40 text-indigo-400 font-bold">
                {products.length} Products Added
              </Badge>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
              <button
                type="button"
                onClick={() => setInventoryMode("MANUAL")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
                  inventoryMode === "MANUAL"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Add Manually
              </button>
              <button
                type="button"
                onClick={() => setInventoryMode("CSV")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
                  inventoryMode === "CSV"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Import CSV / Excel
              </button>
            </div>

            {/* TAB A: MANUAL ADD FORM */}
            {inventoryMode === "MANUAL" && (
              <form onSubmit={handleAddManualProduct} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Product Title *</label>
                    <input
                      type="text"
                      value={prodTitle}
                      onChange={(e) => setProdTitle(e.target.value)}
                      placeholder="e.g. Aashirvaad Shudh Chakki Atta 5kg"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Category</label>
                    <input
                      type="text"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      placeholder="e.g. Staples"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">GST Rate (%)</label>
                    <select
                      value={prodTax}
                      onChange={(e) => setProdTax(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Initial Quantity *</label>
                    <input
                      type="number"
                      value={prodQty}
                      onChange={(e) => setProdQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Low Stock Alert</label>
                    <input
                      type="number"
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add to Inventory</span>
                  </Button>
                </div>
              </form>
            )}

            {/* TAB B: CSV IMPORT */}
            {inventoryMode === "CSV" && (
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Upload Catalog Spreadsheet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Upload a CSV file containing columns: Product Name, Selling Price, Cost Price, Stock, SKU, Barcode, GST Rate.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Select CSV File</span>
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadSampleInventory}
                    className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                  >
                    Load Sample Retail Template (5 Items)
                  </Button>
                </div>

                {csvStatus && (
                  <p className="text-xs text-emerald-400 font-semibold mt-2">{csvStatus}</p>
                )}
              </div>
            )}

            {/* Products Table Preview or Helpful Empty State */}
            {products.length > 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Current Inventory Items ({products.length}):</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Ready for POS</span>
                </p>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                  {products.map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-500">SKU: {p.sku} • Stock: {p.stock_quantity ?? p.current_stock ?? 0}</p>
                      </div>
                      <span className="font-bold text-indigo-400">{formatPaise(p.selling_price_paise)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/30 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Optional Step: </span>
                  If you prefer to add products later, you can click "Skip for Now". Products can also be added anytime via the Inventory page or automatically created during barcode scans at the POS counter.
                </div>
              </div>
            )}

            {/* Navigation Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep(3)}
                className="text-xs text-slate-400 hover:text-white gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    skipOnboardingStep(4);
                    setCurrentStep(5);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Skip for Now
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAndContinueLater}
                  disabled={isSaving}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                >
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span>Save & Continue Later</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleContinueFromInventory}
                  className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <span>Continue to Team Setup</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: EMPLOYEE SETUP */}
        {/* ======================================================== */}
        {currentStep === 5 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 5 of 8</span>
              <h2 className="text-xl font-bold text-white mt-1">Employee & Staff Setup</h2>
              <p className="text-xs text-slate-400">
                Invite cashiers and store managers with role-based permissions, or operate solo.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Do you have employees or counter staff?</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add staff members with tailored roles, or operate as a solo store owner.
                  </p>
                </div>
                <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setHasStaff(true)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      hasStaff ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Yes, Add Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasStaff(false)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      !hasStaff ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Solo Owner
                  </button>
                </div>
              </div>

              {hasStaff ? (
                <form onSubmit={handleAddEmployee} className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-indigo-400" />
                    <span>Send Staff Invitation</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Employee Full Name *</label>
                      <input
                        type="text"
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder="e.g. Rahul Vernekar"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Role & Permissions *</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="CASHIER">CASHIER (Fast POS & Receipt Printing)</option>
                        <option value="MANAGER">MANAGER (Inventory, Reports & POS)</option>
                        <option value="STAFF">STAFF (Restricted stock counting)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Mobile Number *</label>
                      <input
                        type="tel"
                        value={empPhone}
                        onChange={(e) => setEmpPhone(e.target.value)}
                        placeholder="e.g. 9812345678"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address *</label>
                      <input
                        type="email"
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        placeholder="e.g. rahul@gmail.com"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" size="sm" className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
                      <Send className="h-3 w-3" />
                      <span>Send Invitation & Add</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/30 flex items-start gap-2.5 text-xs text-slate-400">
                  <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">Solo Store Mode: </span>
                    You are configured as the primary administrator. You can invite cashiers and store managers anytime under Settings & Team without interrupting business operations.
                  </div>
                </div>
              )}

              {/* Employees List */}
              {employees.length > 0 && (
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2 text-xs">
                  <p className="font-bold text-slate-300">Invited Team Members ({employees.length}):</p>
                  <div className="divide-y divide-slate-800/60">
                    {employees.map((emp) => (
                      <div key={emp.id} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{emp.name} <span className="text-[10px] text-indigo-400 font-mono">({emp.role})</span></p>
                          <p className="text-[10px] text-slate-500">{emp.email} • {emp.phone}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmployeeInvite(emp.id)}
                          className="h-6 w-6 p-0 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep(4)}
                className="text-xs text-slate-400 hover:text-white gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    skipOnboardingStep(5);
                    setCurrentStep(6);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Skip for Now
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAndContinueLater}
                  disabled={isSaving}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                >
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span>Save & Continue Later</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleContinueFromEmployees}
                  className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <span>Save & Continue</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 6: PAYMENT CONFIGURATION */}
        {/* ======================================================== */}
        {currentStep === 6 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 6 of 8</span>
              <h2 className="text-xl font-bold text-white mt-1">Payment Modes Configuration</h2>
              <p className="text-xs text-slate-400">
                Enable payment methods accepted at your counter. No payment gateway setup required.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "cash",
                  title: "Cash Collection",
                  desc: "Record physical cash tender with automatic change calculation.",
                  enabled: acceptCash,
                  toggle: () => setAcceptCash(!acceptCash),
                  icon: Banknote,
                },
                {
                  id: "upi",
                  title: "UPI QR Dynamic Billing",
                  desc: "Display instant QR codes for Google Pay, PhonePe, Paytm and BHIM.",
                  enabled: acceptUpi,
                  toggle: () => setAcceptUpi(!acceptUpi),
                  icon: QrCode,
                },
                {
                  id: "card",
                  title: "Card Terminal Swipe",
                  desc: "Record credit / debit card payments swiped on POS machines.",
                  enabled: acceptCard,
                  toggle: () => setAcceptCard(!acceptCard),
                  icon: CreditCard,
                },
                {
                  id: "credit",
                  title: "PayLater Khata Ledger",
                  desc: "Issue items on customer credit with ledger tracking and WhatsApp alerts.",
                  enabled: acceptCustomerCredit,
                  toggle: () => setAcceptCustomerCredit(!acceptCustomerCredit),
                  icon: Receipt,
                },
                {
                  id: "bank",
                  title: "Direct Bank Transfer",
                  desc: "Accept NEFT, RTGS or IMPS for large wholesale orders.",
                  enabled: acceptBankTransfer,
                  toggle: () => setAcceptBankTransfer(!acceptBankTransfer),
                  icon: ShieldCheck,
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{m.title}</h4>
                        <p className="text-[11px] text-slate-400">{m.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        onChange={m.toggle}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                );
              })}

              {/* Optional UPI VPA Input */}
              {acceptUpi && (
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Shop UPI VPA ID (Optional — for custom QR codes)
                  </label>
                  <input
                    type="text"
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="e.g. yourstore@okhdfcbank or 9876543210@upi"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Customers can scan this UPI ID on the checkout screen to pay directly to your account.
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep(5)}
                className="text-xs text-slate-400 hover:text-white gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAndContinueLater}
                  disabled={isSaving}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                >
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span>Save & Continue Later</span>
                </Button>

                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSavePayments}
                  className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save & Continue to Test Bill</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 7: FIRST INVOICE */}
        {/* ======================================================== */}
        {currentStep === 7 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 7 of 8</span>
              <h2 className="text-xl font-bold text-white mt-1">Generate Your First Live Invoice</h2>
              <p className="text-xs text-slate-400">
                Perform an actual billing transaction using TRACE's POS calculation engine.
              </p>
            </div>

            {products.length === 0 ? (
              <div className="p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/60 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto">
                  <Package className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Inventory Items Available Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You skipped inventory setup earlier. You can instantly create a quick test item (₹100) right now to test the billing engine!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleAddQuickSampleProduct}
                    className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Instant Test Item (₹100)</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                  >
                    Go Back to Inventory Setup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Product Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Select Product to Bill *</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => setSelectedProdId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatPaise(p.selling_price_paise)} ({p.stock_quantity ?? p.current_stock ?? 0} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={invQty}
                      onChange={(e) => setInvQty(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Customer Name</label>
                    <input
                      type="text"
                      value={invCustName}
                      onChange={(e) => setInvCustName(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Mobile (WhatsApp)</label>
                    <input
                      type="tel"
                      value={invCustPhone}
                      onChange={(e) => setInvCustPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Payment Method & Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Payment Method</label>
                    <select
                      value={invPaymentMethod}
                      onChange={(e) => setInvPaymentMethod(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="CASH">Cash Payment</option>
                      <option value="UPI">UPI Digital Payment</option>
                      <option value="CARD">Credit / Debit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Bill Discount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={invDiscountRupees || ""}
                      onChange={(e) => setInvDiscountRupees(Math.max(0, Number(e.target.value)))}
                      placeholder="₹0"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Live Bill Calculation Summary */}
                {(() => {
                  const prod = products.find((p) => p.id === selectedProdId) || products[0];
                  if (!prod) return null;
                  const unitPricePaise = prod.selling_price_paise;
                  const grossPaise = unitPricePaise * invQty;
                  const discPaise = rupeesToPaise(invDiscountRupees);
                  const netTaxable = Math.max(0, grossPaise - discPaise);
                  const taxRate = prod.tax_rate ?? prod.tax_rate_percent ?? 0;
                  const taxPaise = Math.round(netTaxable * (taxRate / 100));
                  const totalPaise = netTaxable + taxPaise;

                  return (
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal ({invQty} item):</span>
                        <span>{formatPaise(grossPaise)}</span>
                      </div>
                      {discPaise > 0 && (
                        <div className="flex justify-between text-emerald-400 font-medium">
                          <span>Discount:</span>
                          <span>-{formatPaise(discPaise)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>GST ({taxRate}%):</span>
                        <span>+{formatPaise(taxPaise)}</span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-2">
                        <span>Total Payable:</span>
                        <span className="text-indigo-400">{formatPaise(totalPaise)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Invoice Action Button */}
                {!generatedInvoice ? (
                  <Button
                    onClick={handleGenerateFirstInvoice}
                    disabled={isSaving}
                    className="w-full py-2.5 font-bold text-xs gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                    <span>Generate First Live Invoice</span>
                  </Button>
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Invoice #{generatedInvoice.invoice_number} Generated Successfully!</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Total: {formatPaise(generatedInvoice.total_amount_paise)} • Method: {generatedInvoice.payment_method} • Stock automatically deducted in database.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                        className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print Receipt</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep(6)}
                className="text-xs text-slate-400 hover:text-white gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAndContinueLater}
                  disabled={isSaving}
                  className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 gap-1"
                >
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span>Save & Continue Later</span>
                </Button>

                <Button
                  type="button"
                  onClick={async () => {
                    await saveOnboardingStep(7, undefined, true);
                    setCurrentStep(8);
                  }}
                  className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <span>Continue to Completion</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 8: COMPLETION SCREEN */}
        {/* ======================================================== */}
        {currentStep === 8 && (
          <div className="text-center space-y-6 max-w-xl mx-auto py-6 animate-in fade-in duration-200">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Your shop is ready!
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold text-emerald-400">{currentDisplayName}</span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                  Verified & Ready
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                All business metadata, GST parameters, catalog items, and payment channels are live on TRACE Cloud.
              </p>
            </div>

            {/* Comprehensive Dynamic Setup Summary Cards */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 text-left space-y-3 text-xs shadow-lg">
              <h4 className="font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>Verified Setup Summary</span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">Active & Verified</Badge>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Store Name & City</span>
                  <p className="font-semibold text-white">{currentDisplayName} ({city || activeShop.city}, {state || activeShop.state})</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Business Category</span>
                  <p className="font-semibold text-white capitalize">
                    {BUSINESS_CATEGORIES.find((c) => c.id === (category || activeShop.business_type))?.label || category}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">GST Legal Registration</span>
                  <p className="font-semibold text-white">
                    {isGstRegistered === "YES" && gstin
                      ? `${gstin} (${registrationType})`
                      : isGstRegistered === "NO"
                      ? "Exempt / Unregistered"
                      : "Deferred to Settings"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Inventory Catalog</span>
                  <p className="font-semibold text-emerald-400">{products.length} Products in Stock</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Team & Roles</span>
                  <p className="font-semibold text-white">
                    {employees.length > 0 ? `${employees.length} Staff Invited` : "Operating as Solo Store Owner"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Methods</span>
                  <p className="font-semibold text-white truncate max-w-[200px]">{enabledPaymentList.join(", ")}</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">First POS Transaction Status:</span>
                <span className="font-bold text-emerald-400">
                  {generatedInvoice
                    ? `#${generatedInvoice.invoice_number} (${formatPaise(generatedInvoice.total_amount_paise)} via ${generatedInvoice.payment_method})`
                    : invoices.length > 0
                    ? `#${invoices[0].invoice_number} (${formatPaise(invoices[0].total_amount_paise)})`
                    : "Ready for first walk-in sale"}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-3 flex flex-col items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => handleFinishOnboarding("/dashboard")}
                className="w-full sm:w-auto px-10 py-3.5 text-sm font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl shadow-xl shadow-emerald-600/30 gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>
                  {isSubActiveOnboarding
                    ? "Enter My Dashboard"
                    : "Proceed to Membership Selection"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!isSubActiveOnboarding && (
                <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Select a subscription plan to unlock your live shop counter and analytics
                </p>
              )}
            </div>

            {/* Secondary Direct Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleFinishOnboarding("/pos")}
                className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 text-white transition-all text-left space-y-1 shadow-lg shadow-indigo-500/10 group"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <h4 className="text-xs font-bold">
                    {isSubActiveOnboarding ? "Open POS Counter Directly" : "Unlock POS Billing"}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isSubActiveOnboarding
                    ? "Start billing walk-in customers immediately."
                    : "Activate membership to begin walk-in billing."}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleFinishOnboarding("/ai-assistant")}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-white transition-all text-left space-y-1 group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400 group-hover:scale-110 transition-transform" />
                  <h4 className="text-xs font-bold">Explore TRACE AI Assistant</h4>
                </div>
                <p className="text-[10px] text-slate-400">Voice command stock adjustments and analytics.</p>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* EXIT CONFIRMATION MODAL (Preserves Progress) */}
      <Modal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        title="Exit Store Setup?"
        description="Your onboarding progress will be automatically saved to your account."
      >
        <div className="space-y-4 pt-2 text-xs text-slate-300">
          <p>
            You are currently at <strong>Step {currentStep} of 8: {stepsList[currentStep - 1]?.label}</strong>. All details entered so far have been securely recorded. You can resume anytime by clicking the setup banner on your dashboard.
          </p>
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
            <span>Progress automatically synced with your cloud database and local device.</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExitModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Stay & Continue Setup
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAndContinueLater}
              disabled={isSaving}
              className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save & Exit to Dashboard</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
