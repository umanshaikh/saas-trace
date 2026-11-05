"use client";

import React, { useState } from "react";
import { useTrace } from "@/context/TraceContext";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  Store,
  Package,
  Upload,
  UserPlus,
  Percent,
  CreditCard,
  Receipt,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Play,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPOS?: () => void;
}

export function OnboardingWizardModal({
  isOpen,
  onClose,
  onNavigateToPOS,
}: OnboardingWizardModalProps) {
  const {
    activeShop,
    updateActiveShop,
    products,
    addProduct,
    categories,
    customers,
    addCustomer,
    invoices,
    importProductsCSV,
    isDemoMode,
    toggleDemoMode,
  } = useTrace();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Shop details state
  const [shopName, setShopName] = useState(activeShop.name || "");
  const [shopType, setShopType] = useState(activeShop.business_type || "retail");
  const [shopCity, setShopCity] = useState(activeShop.city || "");
  const [shopPhone, setShopPhone] = useState(activeShop.phone || "");

  // Step 2: Add Product state
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("120");
  const [prodCost, setProdCost] = useState("80");
  const [prodStock, setProdStock] = useState(25);
  const [prodSku, setProdSku] = useState(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [prodAddedSuccess, setProdAddedSuccess] = useState(false);

  // Step 3: CSV Import state
  const [csvFileContent, setCsvFileContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Step 4: Add Customer state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCreditLimit, setCustCreditLimit] = useState(5000);
  const [custAddedSuccess, setCustAddedSuccess] = useState(false);

  // Step 5: Configure GST state
  const [shopGstin, setShopGstin] = useState(activeShop.gstin || "");
  const [shopState, setShopState] = useState(activeShop.state || "Maharashtra");
  const [defaultTaxSlab, setDefaultTaxSlab] = useState("5");
  const [gstSavedSuccess, setGstSavedSuccess] = useState(false);

  // Step 6: Configure Payment Methods
  const [acceptCash, setAcceptCash] = useState(true);
  const [acceptUpi, setAcceptUpi] = useState(true);
  const [shopUpiVpa, setShopUpiVpa] = useState(`pay.${activeShop.slug || "trace"}@icici`);
  const [acceptCard, setAcceptCard] = useState(true);
  const [acceptPayLater, setAcceptPayLater] = useState(true);
  const [paymentsConfigured, setPaymentsConfigured] = useState(false);

  // Step Calculation / Completion status
  const isShopDone = !!activeShop.name && !!activeShop.city;
  const isProductDone = products.length > 0;
  const isCustomerDone = customers.length > 0;
  const isGstDone = !!activeShop.gstin || gstSavedSuccess;
  const isInvoiceDone = invoices.length > 0;

  const steps = [
    { id: 1, title: "Register Shop", icon: Store, completed: isShopDone },
    { id: 2, title: "Add Product", icon: Package, completed: isProductDone },
    { id: 3, title: "Import Catalog", icon: Upload, completed: products.length > 2 },
    { id: 4, title: "Add Customer", icon: UserPlus, completed: isCustomerDone },
    { id: 5, title: "Configure GST", icon: Percent, completed: isGstDone },
    { id: 6, title: "Payment Modes", icon: CreditCard, completed: paymentsConfigured },
    { id: 7, title: "First Invoice", icon: Receipt, completed: isInvoiceDone },
  ];

  // Actions
  const handleSaveShop = async () => {
    await updateActiveShop({
      name: shopName,
      business_type: shopType as any,
      city: shopCity,
      phone: shopPhone,
    });
    setCurrentStep(2);
  };

  const handleAddFirstProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;
    addProduct({
      name: prodName.trim(),
      selling_price_paise: rupeesToPaise(Number(prodPrice)),
      cost_price_paise: rupeesToPaise(Number(prodCost)),
      purchase_price_paise: rupeesToPaise(Number(prodCost)),
      stock_quantity: Number(prodStock),
      current_stock: Number(prodStock),
      sku: prodSku,
      barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
      unit: "pcs",
      tax_rate_percent: Number(defaultTaxSlab),
      tax_rate: Number(defaultTaxSlab),
    });
    setProdAddedSuccess(true);
    setTimeout(() => setCurrentStep(3), 600);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvFileContent(content);
      const res = await importProductsCSV(content);
      if (res.imported > 0) {
        setImportStatus(`Successfully imported ${res.imported} products into inventory!`);
      } else {
        setImportStatus(`Failed to import: ${res.errors.join(", ")}`);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCSV = async () => {
    const sample = `Product Name,Selling Price,Cost Price,Current Stock,SKU,Barcode,GST Rate,Unit
Basmati Rice Premium 1kg,140,110,40,RICE-101,890123456701,5,kg
Toor Dal Desi 1kg,160,130,30,DAL-202,890123456702,5,kg
Sunflower Cooking Oil 1L,135,115,50,OIL-303,890123456703,5,l
Amul Butter 100g,58,50,45,BUT-404,890123456704,12,pcs
Tata Tea Gold 250g,160,130,25,TEA-505,890123456705,5,pcs`;
    const res = await importProductsCSV(sample);
    setImportStatus(`Loaded ${res.imported} retail products from starter template!`);
  };

  const handleAddFirstCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return;
    addCustomer({
      name: custName.trim(),
      full_name: custName.trim(),
      phone: custPhone.trim(),
      credit_limit_paise: rupeesToPaise(custCreditLimit),
      outstanding_balance_paise: 0,
      total_outstanding_paise: 0,
    });
    setCustAddedSuccess(true);
    setTimeout(() => setCurrentStep(5), 600);
  };

  const handleSaveGST = async () => {
    await updateActiveShop({
      gstin: shopGstin.trim(),
      state: shopState,
    });
    setGstSavedSuccess(true);
    setCurrentStep(6);
  };

  const handleSavePayments = () => {
    setPaymentsConfigured(true);
    setCurrentStep(7);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shopkeeper Onboarding • Quick Setup Guide"
      description="Follow these 7 straightforward steps to set up your store and generate your first tax bill."
      maxWidth="xl"
    >
      <div className="space-y-6 pt-1">
        {/* Demo Mode Sandbox Alert & Quick Toggle */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
          isDemoMode
            ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
            : "border-indigo-500/20 bg-indigo-950/20 text-indigo-300"
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold">
                {isDemoMode ? "Sandbox Demo Mode Active" : "Practice Mode Available"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {isDemoMode
                  ? "Changes are isolated in memory. Your live database will not be affected."
                  : "Want to try POS billing with test data first without affecting real accounting?"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isDemoMode ? "destructive" : "outline"}
            onClick={() => toggleDemoMode()}
            className="text-xs h-8 shrink-0 font-bold"
          >
            {isDemoMode ? "Exit Demo Mode" : "Activate Demo Mode"}
          </Button>
        </div>

        {/* 7-Step Navigation Pills */}
        <div className="grid grid-cols-7 gap-1.5 border-b border-border/60 pb-3">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : s.completed
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    : "bg-muted/40 text-muted-foreground hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {s.completed ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-[10px] font-semibold truncate w-full hidden sm:block">
                  {s.title}
                </span>
                <span className="text-[9px] font-mono sm:hidden">
                  #{s.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step Content Container */}
        <div className="min-h-[280px]">
          {/* STEP 1: REGISTER SHOP */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Store className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 1: Verify Store Details
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Metro Kirana & General Store"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Business Category *</label>
                  <select
                    value={shopType}
                    onChange={(e) => setShopType(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  >
                    <option value="grocery">Grocery & Supermarket</option>
                    <option value="clothing">Apparel & Footwear</option>
                    <option value="medical">Pharmacy & Healthcare</option>
                    <option value="restaurant">Cafe & Restaurant</option>
                    <option value="mobile">Electronics & Mobile</option>
                    <option value="retail">General Retail</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">City / Town *</label>
                  <input
                    type="text"
                    value={shopCity}
                    onChange={(e) => setShopCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Store WhatsApp / Phone</label>
                  <input
                    type="text"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    placeholder="+91 98220 12345"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSaveShop} className="gap-1.5 font-bold text-xs">
                  <span>Save & Continue</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: ADD FIRST PRODUCT */}
          {currentStep === 2 && (
            <form onSubmit={handleAddFirstProduct} className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Package className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 2: Add Your First Inventory Item
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground block mb-1">Product Title *</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Fortune Sunlite Refined Oil 1L"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Purchase / Cost Price (₹)</label>
                  <input
                    type="number"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Initial In-Hand Stock</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground font-mono"
                  />
                </div>
              </div>

              {prodAddedSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Product saved to active catalog! Advancing...</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setCurrentStep(3)}>
                    Skip for Now
                  </Button>
                  <Button size="sm" type="submit" className="gap-1.5 font-bold text-xs">
                    <span>Save Product</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: BULK IMPORT INVENTORY */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 3: Import Inventory via CSV Spreadsheet
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Already have an Excel or CSV sheet with your product prices and quantities? Upload it directly or import our sample catalog with 1 click.
              </p>

              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-accent/20 text-center space-y-3">
                <Upload className="h-8 w-8 text-indigo-400 mx-auto" />
                <div className="text-xs text-foreground font-semibold">
                  {csvFileName ? `Selected: ${csvFileName}` : "Drag and drop product CSV, or browse"}
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                  id="onboarding-csv-upload"
                />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => document.getElementById("onboarding-csv-upload")?.click()}
                    className="cursor-pointer text-xs"
                  >
                    <span>Choose CSV File</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLoadSampleCSV}
                    className="text-xs gap-1.5 font-semibold text-indigo-400"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Load Sample Retail Catalog
                  </Button>
                </div>
              </div>

              {importStatus && (
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button size="sm" onClick={() => setCurrentStep(4)} className="gap-1.5 font-bold text-xs">
                  <span>Next: Add Customer</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: ADD FIRST CUSTOMER */}
          {currentStep === 4 && (
            <form onSubmit={handleAddFirstCustomer} className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <UserPlus className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 4: Register Your First Customer (Khata Ledger)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep customer contact info handy for WhatsApp invoices and PayLater credit tracking.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">WhatsApp / Mobile Number *</label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="9823012345"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground block mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Maximum credit balance permitted before POS issues warning alerts.
                  </p>
                </div>
              </div>

              {custAddedSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Customer added to ledger! Advancing...</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setCurrentStep(5)}>
                    Skip
                  </Button>
                  <Button size="sm" type="submit" className="gap-1.5 font-bold text-xs">
                    <span>Save Customer</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 5: CONFIGURE GST */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Percent className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 5: GST Configuration & Tax Compliance
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">Shop GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={shopGstin}
                    onChange={(e) => setShopGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCT1332L1Z5"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Leave blank if your business is exempt or below mandatory registration limits.
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Registered State (For CGST/SGST)</label>
                  <input
                    type="text"
                    value={shopState}
                    onChange={(e) => setShopState(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground block mb-1">Default GST Slab</label>
                  <select
                    value={defaultTaxSlab}
                    onChange={(e) => setDefaultTaxSlab(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                  >
                    <option value="0">0% (Nil / Essential Food Items)</option>
                    <option value="5">5% (General Groceries / Apparel &lt; ₹1000)</option>
                    <option value="12">12% (Processed Goods / Dairy / Dry Fruits)</option>
                    <option value="18">18% (Standard Retail / Electronics / Services)</option>
                    <option value="28">28% (Luxury / Aerated Beverages)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)}>
                  Back
                </Button>
                <Button size="sm" onClick={handleSaveGST} className="gap-1.5 font-bold text-xs">
                  <span>Save GST Settings</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIGURE PAYMENT METHODS */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 6: Configure Store Payment Methods
                </h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-accent/20 cursor-pointer">
                  <div>
                    <span className="font-semibold text-foreground">Cash Payments</span>
                    <p className="text-[11px] text-muted-foreground">
                      Accept cash at counter with automatic change return calculator
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={acceptCash}
                    onChange={(e) => setAcceptCash(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                </label>

                <div className="p-3 rounded-lg border border-border/60 bg-accent/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">Dynamic UPI QR Code</span>
                      <p className="text-[11px] text-muted-foreground">
                        Show customer UPI QR code with exact payable amount on POS screen
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={acceptUpi}
                      onChange={(e) => setAcceptUpi(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                  </div>
                  {acceptUpi && (
                    <div className="pt-2 border-t border-border/40">
                      <label className="text-[11px] text-muted-foreground block mb-1">
                        Store UPI VPA Address:
                      </label>
                      <input
                        type="text"
                        value={shopUpiVpa}
                        onChange={(e) => setShopUpiVpa(e.target.value)}
                        placeholder="yourshop@okicici"
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground"
                      />
                    </div>
                  )}
                </div>

                <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-accent/20 cursor-pointer">
                  <div>
                    <span className="font-semibold text-foreground">PayLater (Customer Khata Ledger)</span>
                    <p className="text-[11px] text-muted-foreground">
                      Allow trusted customers to bill on credit with due date reminder schedules
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={acceptPayLater}
                    onChange={(e) => setAcceptPayLater(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                </label>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(5)}>
                  Back
                </Button>
                <Button size="sm" onClick={handleSavePayments} className="gap-1.5 font-bold text-xs">
                  <span>Confirm Payment Modes</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: FIRST INVOICE GENERATION */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 7: Generate Your First Bill & Start Selling
                </h3>
              </div>
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white mx-auto shadow-lg shadow-emerald-600/30">
                  <Play className="h-6 w-6 ml-0.5" />
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  Congratulations! Store Setup is Complete
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Your store has {products.length} products ready for sale, customer khata configured, and tax settings in place. You can now launch the POS billing counter!
                </p>
                <div className="pt-2">
                  <Button
                    size="default"
                    onClick={() => {
                      onClose();
                      if (onNavigateToPOS) onNavigateToPOS();
                    }}
                    className="gap-2 font-bold px-8 shadow-md shadow-indigo-600/30"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Launch POS Billing Counter</span>
                  </Button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(6)}>
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Close Setup Guide
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
