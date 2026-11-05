"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTrace } from "@/context/TraceContext";
import { Product, Customer } from "@/lib/types";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Calculator,
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Check,
  AlertCircle,
  Printer,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Percent,
  History,
  Send,
  FileText,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import QRCode from "qrcode";
import confetti from "canvas-confetti";

interface CartItem {
  product: Product;
  quantity: number;
  discountPaise: number;
}

export default function POSPage() {
  const {
    activeShop,
    products,
    categories,
    customers,
    invoices,
    createInvoice,
    refundInvoice,
    addCustomer,
  } = useTrace();

  // Shop items
  const shopProducts = products.filter((p) => p.shop_id === activeShop.id && p.is_active);
  const shopCategories = categories.filter((c) => c.shop_id === activeShop.id);
  const shopCustomers = customers.filter((c) => c.shop_id === activeShop.id);
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [isInterState, setIsInterState] = useState<boolean>(false);

  // Settlement & Payment Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "UPI" | "CARD" | "PAYLATER" | "SPLIT"
  >("CASH");
  const [cashTenderedRupees, setCashTenderedRupees] = useState<string>("");
  const [splitCashRupees, setSplitCashRupees] = useState<string>("");
  const [splitSecondaryMethod, setSplitSecondaryMethod] = useState<"UPI" | "CARD">("UPI");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick Customer Creation Modal
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(5000);

  // Bill History & Refund Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundingInvoice, setRefundingInvoice] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("Customer requested return");
  const [isRefunding, setIsRefunding] = useState(false);

  // Audio Beep for Hardware Barcode Scanner & POS Actions
  const playBeep = (freq = 920, duration = 0.09) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context may be restricted by autoplay policy
    }
  };

  // Keyboard shortcut listener (F1 = focus search, Escape = clear / dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Hardware Barcode Scanner Listener: Captures rapid keystrokes (< 50ms) ending with Enter
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleBarcodeKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not intercept if user is typing in forms other than global or search
      const isSearchActive = target === searchInputRef.current;
      const isOtherInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA") && !isSearchActive;
      if (isOtherInput) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          const scanned = buffer.trim().toLowerCase();
          const match = shopProducts.find(
            (p) =>
              p.barcode?.trim().toLowerCase() === scanned ||
              p.sku?.trim().toLowerCase() === scanned
          );
          if (match) {
            e.preventDefault();
            addToCart(match);
            playBeep(980, 0.12);
            buffer = "";
            return;
          }
        }
        buffer = "";
      } else if (e.key.length === 1) {
        // High typing speeds (< 55ms per character) indicate hardware scanner emulation
        if (timeDiff > 70) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleBarcodeKey);
    return () => window.removeEventListener("keydown", handleBarcodeKey);
  }, [shopProducts]);

  // Handle Search Input Enter Key (Instant Add if match found)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = searchQuery.trim().toLowerCase();
      if (!query) return;

      // 1. Exact barcode or SKU match
      const exactMatch = shopProducts.find(
        (p) =>
          p.barcode?.toLowerCase() === query ||
          p.sku?.toLowerCase() === query
      );

      if (exactMatch) {
        addToCart(exactMatch);
        playBeep(920, 0.1);
        setSearchQuery("");
        return;
      }

      // 2. If filtered result has only 1 product, select it
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        playBeep(920, 0.1);
        setSearchQuery("");
      }
    }
  };

  // Filter products by search & category
  const filteredProducts = shopProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "ALL" || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Cart Calculations (Strict integer paise math)
  const cartSubtotalPaise = cart.reduce((sum, item) => {
    const itemGross = item.product.selling_price_paise * item.quantity;
    return sum + Math.max(0, itemGross - item.discountPaise);
  }, 0);

  const discountAmountPaise = Math.round(
    cartSubtotalPaise * (overallDiscountPercent / 100)
  );

  const discountedSubtotalPaise = Math.max(0, cartSubtotalPaise - discountAmountPaise);

  const cartTaxPaise = cart.reduce((sum, item) => {
    const itemGross = item.product.selling_price_paise * item.quantity - item.discountPaise;
    const taxRate = item.product.tax_rate ?? item.product.tax_rate_percent ?? 0;
    const itemTax = Math.round(Math.max(0, itemGross) * (taxRate / 100));
    return sum + itemTax;
  }, 0);

  const cartTotalPaise = discountedSubtotalPaise + cartTaxPaise;

  // Split & Cash Change calculations
  const splitCashPaise = splitCashRupees ? rupeesToPaise(Number(splitCashRupees)) : Math.floor(cartTotalPaise / 2);
  const splitRemainderPaise = Math.max(0, cartTotalPaise - splitCashPaise);

  const cashTenderedPaise = cashTenderedRupees
    ? rupeesToPaise(Number(cashTenderedRupees))
    : cartTotalPaise;
  const cashChangePaise = Math.max(0, cashTenderedPaise - cartTotalPaise);

  // Cart operations
  const addToCart = (product: Product) => {
    const stock = product.stock_quantity ?? product.current_stock ?? 0;
    if (stock <= 0) {
      alert(`Product ${product.name} is currently out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          alert(`Maximum in-stock quantity (${stock}) reached for ${product.name}!`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, discountPaise: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const stock = item.product.stock_quantity ?? item.product.current_stock ?? 0;
            if (newQty <= 0) return null;
            if (newQty > stock) {
              alert(`Only ${stock} available in stock!`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemDiscount = (productId: string, discountRupees: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, discountPaise: rupeesToPaise(Math.max(0, discountRupees)) }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setOverallDiscountPercent(0);
    setCashTenderedRupees("");
    setSplitCashRupees("");
  };

  // Generate UPI QR Code whenever UPI or SPLIT payment is opened
  const handleOpenCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
    setCashTenderedRupees((cartTotalPaise / 100).toString());
    setSplitCashRupees(Math.floor(cartTotalPaise / 200).toString());

    // Generate UPI string
    const upiTargetPaise = paymentMethod === "SPLIT" ? splitRemainderPaise : cartTotalPaise;
    const upiString = `upi://pay?pa=trace.${activeShop.id}@icici&pn=${encodeURIComponent(
      activeShop.name
    )}&am=${(upiTargetPaise / 100).toFixed(2)}&cu=INR&tn=Invoice`;
    try {
      const qrUrl = await QRCode.toDataURL(upiString, { width: 220, margin: 1 });
      setUpiQrDataUrl(qrUrl);
    } catch (e) {
      console.error("QR Code Error:", e);
    }
  };

  // Final Settlement Execution with Duplicate Guard
  const handleFinalizeBill = async () => {
    if (isProcessing || cart.length === 0) return;

    // Validate PayLater Credit
    if (paymentMethod === "PAYLATER") {
      if (!selectedCustomer) {
        alert("Please select or add a customer to bill on PayLater credit!");
        return;
      }
      const custDebt = selectedCustomer.outstanding_balance_paise ?? selectedCustomer.total_outstanding_paise ?? 0;
      const availableCredit =
        (selectedCustomer.credit_limit_paise || 500000) - custDebt;
      if (cartTotalPaise > availableCredit) {
        alert(
          `Credit limit exceeded! Customer only has ${formatPaise(
            availableCredit
          )} credit remaining.`
        );
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Prepare Invoice Items
      const invoiceItems = cart.map((i) => {
        const taxRate = i.product.tax_rate ?? i.product.tax_rate_percent ?? 0;
        const itemGross = i.product.selling_price_paise * i.quantity - i.discountPaise;
        const itemTax = Math.round(Math.max(0, itemGross) * (taxRate / 100));

        return {
          product_id: i.product.id,
          product_name: i.product.name,
          product_name_snapshot: i.product.name,
          sku_snapshot: i.product.sku,
          unit_snapshot: i.product.unit || "pcs",
          quantity: i.quantity,
          unit_price_paise: i.product.selling_price_paise,
          tax_rate: taxRate,
          tax_rate_percent: taxRate,
          tax_paise: itemTax,
          line_total_paise: Math.max(0, itemGross) + itemTax,
          total_paise: Math.max(0, itemGross) + itemTax,
        };
      });

      const paidPaise =
        paymentMethod === "PAYLATER" ? 0 : cartTotalPaise;

      let billNotes = `POS Counter Bill - Method: ${paymentMethod}`;
      if (paymentMethod === "SPLIT") {
        billNotes = `POS Split Settlement: Cash ₹${(splitCashPaise / 100).toFixed(2)} + ${splitSecondaryMethod} ₹${(splitRemainderPaise / 100).toFixed(2)}`;
      }

      const created = await createInvoice(
        invoiceItems,
        paymentMethod,
        paidPaise,
        selectedCustomer?.id,
        selectedCustomer?.name || selectedCustomer?.full_name || (paymentMethod === "PAYLATER" ? "Valued Client" : "Walk-in Customer"),
        selectedCustomer?.phone,
        billNotes,
        isInterState
      );

      // Play victory chime & confetti celebration
      playBeep(1046, 0.15);
      setTimeout(() => playBeep(1318, 0.25), 160);

      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.6 },
      });

      setCompletedInvoice(created);
      setIsCheckoutOpen(false);
      clearCart();
    } catch (err: any) {
      alert(err.message || "An error occurred while finalizing bill. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    const added = addCustomer({
      name: newCustName,
      full_name: newCustName,
      phone: newCustPhone,
      credit_limit_paise: rupeesToPaise(newCustCreditLimit),
      outstanding_balance_paise: 0,
      total_outstanding_paise: 0,
    });

    setSelectedCustomer(added);
    setIsNewCustomerModalOpen(false);
    setNewCustName("");
    setNewCustPhone("");
  };

  // Process Return & Refund
  const handleProcessRefund = async () => {
    if (!refundingInvoice || isRefunding) return;
    setIsRefunding(true);

    try {
      const res = await refundInvoice(refundingInvoice.id, refundReason);
      if (res.success) {
        alert(`Invoice #${refundingInvoice.invoice_number} successfully refunded and stock restored to inventory.`);
        setIsRefundModalOpen(false);
        setRefundingInvoice(null);
      } else {
        alert(res.error || "Failed to process refund");
      }
    } catch (e: any) {
      alert(e.message || "Failed to refund invoice");
    } finally {
      setIsRefunding(false);
    }
  };

  // WhatsApp Digital Invoice Sharing
  const handleShareWhatsApp = (inv: any) => {
    if (!inv) return;
    const phone = inv.customer_phone_snapshot || inv.customer_phone || selectedCustomer?.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    const lines = [
      `🛍️ *TAX INVOICE — ${activeShop.name.toUpperCase()}*`,
      `Bill: #${inv.invoice_number}`,
      `Date: ${new Date(inv.created_at || Date.now()).toLocaleDateString()} ${new Date(inv.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `Customer: ${inv.customer_name_snapshot || inv.customer_name || 'Valued Guest'}`,
      `GSTIN: ${activeShop.gstin || "27AABCT1332L1Z5"}`,
      `--------------------------------`,
    ];

    (inv.items || []).forEach((item: any, idx: number) => {
      lines.push(`${idx + 1}. ${item.product_name || item.product_name_snapshot} x ${item.quantity} = ${formatPaise(item.line_total_paise || item.total_paise)}`);
    });

    lines.push(`--------------------------------`);
    lines.push(`Subtotal: ${formatPaise(inv.subtotal_paise)}`);
    if (inv.discount_paise > 0) lines.push(`Discount: -${formatPaise(inv.discount_paise)}`);
    lines.push(`GST: ${formatPaise(inv.tax_paise)}`);
    lines.push(`*GRAND TOTAL: ${formatPaise(inv.total_amount_paise)}*`);
    lines.push(`Payment Method: ${inv.payment_method} (${inv.payment_status})`);
    lines.push(`--------------------------------`);
    lines.push(`Thank you for shopping with ${activeShop.name}! Please visit again.`);

    const msg = lines.join("\n");
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col gap-4 lg:flex-row animate-in fade-in duration-150">
      {/* Print Styles for 80mm ESC/POS Thermal Printer */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pos-thermal-slip, #pos-thermal-slip * {
            visibility: visible;
          }
          #pos-thermal-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            background: #fff !important;
            color: #000 !important;
            font-family: monospace !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* LEFT SECTION: Catalog & Search (60%) */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        {/* Top Control Bar: Search & Actions */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product name, scan barcode, or enter SKU (Press F1 or Enter)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-14 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 text-muted-foreground">
                F1
              </Badge>
            </div>
          </div>

          {/* Bill History & Returns Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 gap-1.5 text-xs border-border/70"
          >
            <History className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Bills</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-0.5">
              {shopInvoices.length}
            </Badge>
          </Button>
        </div>

        {/* Category Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            All Items ({shopProducts.length})
          </button>
          {shopCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const cartMatch = cart.find((i) => i.product.id === product.id);
              const pStock = product.stock_quantity ?? product.current_stock ?? 0;
              const isLowStock = pStock <= product.low_stock_threshold;
              const isOutOfStock = pStock <= 0;

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                    isOutOfStock
                      ? "opacity-50 border-border/40 bg-muted/20 cursor-not-allowed"
                      : cartMatch
                      ? "border-indigo-500 bg-indigo-500/5 shadow-sm"
                      : "border-border/60 bg-background hover:border-indigo-500/40 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[70px]">
                        {product.sku || "SKU"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? "bg-rose-500/10 text-rose-500"
                            : isLowStock
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pStock} {product.unit || "pcs"}
                      </span>
                    </div>

                    <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                      {product.name}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-foreground">
                        {formatPaise(product.selling_price_paise)}
                      </span>
                      {(product.tax_rate ?? product.tax_rate_percent ?? 0) > 0 && (
                        <span className="block text-[9px] text-muted-foreground">
                          +{product.tax_rate ?? product.tax_rate_percent}% GST
                        </span>
                      )}
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs opacity-90 group-hover:scale-110 transition-transform">
                      {cartMatch ? cartMatch.quantity : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                No products found matching "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Cart Drawer & Checkout (40%) */}
      <div className="flex w-full lg:w-[430px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        {/* Customer Header */}
        <div className="mb-3 border-b border-border/60 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              Customer / Khata
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="h-6 text-[11px] text-indigo-500 px-2"
            >
              + New Customer
            </Button>
          </div>

          {/* Customer Selector / Autocomplete */}
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-accent/40 border border-border/60">
              <div className="truncate mr-2">
                <p className="text-xs font-bold text-foreground truncate">
                  {selectedCustomer.name || selectedCustomer.full_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedCustomer.phone} • Credit limit: {formatPaise(selectedCustomer.credit_limit_paise || 500000)}
                </p>
                {(selectedCustomer.outstanding_balance_paise ?? selectedCustomer.total_outstanding_paise ?? 0) > 0 && (
                  <p className="text-[10px] font-bold text-rose-500">
                    Khata Due: {formatPaise(selectedCustomer.outstanding_balance_paise ?? selectedCustomer.total_outstanding_paise ?? 0)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
              >
                ✕
              </Button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Walk-in Customer (or search name/phone)..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {isCustomerDropdownOpen && customerSearch && (
                <div className="absolute left-0 right-0 top-9 z-20 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                  {shopCustomers
                    .filter(
                      (c) =>
                        (c.name || c.full_name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.phone.includes(customerSearch)
                    )
                    .map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearch("");
                        }}
                        className="w-full text-left p-1.5 text-xs hover:bg-accent rounded flex justify-between"
                      >
                        <span className="font-semibold text-foreground">{cust.name || cust.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">{cust.phone}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 pr-1">
          {cart.map((item) => (
            <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {item.product.name}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{formatPaise(item.product.selling_price_paise)} × {item.quantity} {item.product.unit || "pcs"}</span>
                  {(item.product.tax_rate ?? item.product.tax_rate_percent ?? 0) > 0 && (
                    <span className="text-[10px] text-indigo-400">
                      (+{item.product.tax_rate ?? item.product.tax_rate_percent}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                <button
                  onClick={() => updateQuantity(item.product.id, -1)}
                  className="h-5 w-5 flex items-center justify-center rounded bg-background text-foreground hover:bg-accent"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product.id, 1)}
                  className="h-5 w-5 flex items-center justify-center rounded bg-background text-foreground hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Total Item Price */}
              <div className="text-right w-16">
                <span className="text-xs font-bold text-foreground">
                  {formatPaise(item.product.selling_price_paise * item.quantity)}
                </span>
              </div>

              <button
                onClick={() => removeFromCart(item.product.id)}
                className="text-muted-foreground hover:text-rose-500 p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              Cart is currently empty. Click on any item or scan a barcode to add.
            </div>
          )}
        </div>

        {/* Bill Summary Calculations */}
        <div className="border-t border-border/70 pt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatPaise(cartSubtotalPaise)}</span>
          </div>

          {/* Discount Selector */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" /> Invoice Discount:
            </span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setOverallDiscountPercent(pct)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    overallDiscountPercent === pct
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {discountAmountPaise > 0 && (
            <div className="flex items-center justify-between text-emerald-500 font-semibold">
              <span>Savings ({overallDiscountPercent}%):</span>
              <span>-{formatPaise(discountAmountPaise)}</span>
            </div>
          )}

          {/* Tax Breakdown & Inter-state toggle */}
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Tax ({isInterState ? "IGST" : "CGST + SGST"}):</span>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 h-3 w-3"
                />
                <span>Inter-State</span>
              </label>
            </div>
            <span>+{formatPaise(cartTaxPaise)}</span>
          </div>

          <div className="flex items-center justify-between text-base font-extrabold text-foreground border-t border-border/60 pt-2">
            <span>Total Payable:</span>
            <span className="text-indigo-400">{formatPaise(cartTotalPaise)}</span>
          </div>
        </div>

        {/* Checkout & Clear Buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={cart.length === 0}
            className="text-xs"
          >
            Clear
          </Button>
          <Button
            variant="default"
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className="col-span-2 text-xs font-bold gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <Banknote className="h-4 w-4" />
            <span>Charge {formatPaise(cartTotalPaise)}</span>
          </Button>
        </div>
      </div>

      {/* SETTLEMENT MODAL */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => !isProcessing && setIsCheckoutOpen(false)}
        title="Complete Bill Settlement"
        description={`Total Amount Payable: ${formatPaise(cartTotalPaise)}`}
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: "CASH", label: "Cash", icon: Banknote },
              { id: "UPI", label: "UPI QR", icon: QrCode },
              { id: "CARD", label: "Card", icon: CreditCard },
              { id: "SPLIT", label: "Split", icon: Calculator },
              { id: "PAYLATER", label: "Khata", icon: Receipt },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  disabled={isProcessing}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                      : "border-border/60 bg-muted/40 text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-[11px]">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* CASH DETAILS */}
          {paymentMethod === "CASH" && (
            <div className="p-4 rounded-xl border border-border/60 bg-accent/20 space-y-3">
              <label className="text-xs font-semibold text-foreground block">
                Cash Tendered by Customer
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cashTenderedRupees}
                  onChange={(e) => setCashTenderedRupees(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-lg font-bold text-foreground"
                  placeholder="0.00"
                />
              </div>

              {/* Fast Cash Quick Buttons */}
              <div className="flex gap-2">
                {[100, 200, 500, 2000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashTenderedRupees(amt.toString())}
                    className="px-3 py-1 rounded bg-muted hover:bg-muted/80 text-xs font-bold text-foreground"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {cashChangePaise > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex justify-between items-center text-sm font-bold">
                  <span>Return Change to Customer:</span>
                  <span>{formatPaise(cashChangePaise)}</span>
                </div>
              )}
            </div>
          )}

          {/* UPI DETAILS */}
          {paymentMethod === "UPI" && (
            <div className="p-4 rounded-xl border border-border/60 bg-accent/20 flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
              </p>
              {upiQrDataUrl && (
                <div className="p-2 bg-white rounded-xl shadow-md">
                  <img src={upiQrDataUrl} alt="UPI QR" className="h-40 w-40" />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground font-mono">
                Amount: {formatPaise(cartTotalPaise)} • UPI ID: trace.{activeShop.id}@icici
              </p>
            </div>
          )}

          {/* CARD DETAILS */}
          {paymentMethod === "CARD" && (
            <div className="p-6 rounded-xl border border-border/60 bg-accent/20 text-center space-y-2">
              <CreditCard className="mx-auto h-10 w-10 text-indigo-400" />
              <p className="text-xs font-bold text-foreground">
                Wireless POS Terminal / Tap to Pay
              </p>
              <p className="text-xs text-muted-foreground">
                Process swipe, chip, or NFC tap for {formatPaise(cartTotalPaise)} on the wireless reader.
              </p>
            </div>
          )}

          {/* SPLIT PAYMENT DETAILS */}
          {paymentMethod === "SPLIT" && (
            <div className="p-4 rounded-xl border border-border/60 bg-accent/20 space-y-3 text-xs">
              <p className="font-bold text-foreground">Split Payment: Cash + Digital</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1">Cash Portion (₹)</label>
                  <input
                    type="number"
                    value={splitCashRupees}
                    onChange={(e) => setSplitCashRupees(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold text-foreground"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Remaining Payment Via</label>
                  <select
                    value={splitSecondaryMethod}
                    onChange={(e) => setSplitSecondaryMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                  >
                    <option value="UPI">UPI QR Code</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-border/70 flex justify-between font-bold">
                <span>Remaining {splitSecondaryMethod} Due:</span>
                <span className="text-indigo-400">{formatPaise(splitRemainderPaise)}</span>
              </div>
            </div>
          )}

          {/* PAYLATER KHATA DETAILS */}
          {paymentMethod === "PAYLATER" && (
            <div className="p-4 rounded-xl border border-border/60 bg-accent/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>Customer Credit Ledger (Khata)</span>
              </div>
              {selectedCustomer ? (
                <div className="space-y-1 text-foreground">
                  <p>Customer: <span className="font-bold">{selectedCustomer.name || selectedCustomer.full_name}</span></p>
                  <p>Available Credit Limit: <span className="font-bold text-emerald-400">{formatPaise((selectedCustomer.credit_limit_paise || 500000) - (selectedCustomer.outstanding_balance_paise ?? selectedCustomer.total_outstanding_paise ?? 0))}</span></p>
                  <p className="text-[11px] text-muted-foreground">
                    This bill of {formatPaise(cartTotalPaise)} will be added to the customer's khata ledger with payment reminder schedules.
                  </p>
                </div>
              ) : (
                <p className="text-rose-400 font-medium">
                  Please assign a registered customer to bill on PayLater khata credit!
                </p>
              )}
            </div>
          )}

          {/* Finalize Button */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              variant="ghost"
              disabled={isProcessing}
              onClick={() => setIsCheckoutOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={isProcessing}
              onClick={handleFinalizeBill}
              className="gap-2 font-bold px-6 shadow-md shadow-indigo-600/30"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Finalizing Bill & Deducting Stock...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirm & Generate Bill</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* COMPLETED INVOICE RECEIPT MODAL */}
      <Modal
        isOpen={!!completedInvoice}
        onClose={() => setCompletedInvoice(null)}
        title="Payment Success • Tax Invoice Generated"
        maxWidth="md"
      >
        {completedInvoice && (
          <div className="space-y-4 pt-1">
            {/* Visual Receipt Card */}
            <div id="pos-thermal-slip" className="p-4 rounded-xl border border-border/80 bg-background space-y-3 font-mono text-xs">
              <div className="text-center border-b border-border/60 pb-2">
                <h4 className="font-bold text-sm uppercase">{activeShop.name}</h4>
                <p className="text-[10px] text-muted-foreground font-sans">
                  {activeShop.address_line1 || activeShop.city} • Ph: {activeShop.phone || "Store Contact"}
                </p>
                <p className="text-[10px] text-muted-foreground font-sans">
                  GSTIN: {activeShop.gstin || "27AABCT1332L1Z5"}
                </p>
                <p className="mt-1 font-bold">Tax Invoice #{completedInvoice.invoice_number}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(completedInvoice.created_at || Date.now()).toLocaleString()}
                </p>
                {completedInvoice.customer_name && (
                  <p className="text-[10px] font-sans text-muted-foreground">
                    Customer: {completedInvoice.customer_name}
                  </p>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] border-b border-border/40 pb-1 text-muted-foreground">
                  <span>ITEM</span>
                  <span>TOTAL</span>
                </div>
                {completedInvoice.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[200px]">
                      {item.product_name || item.product_name_snapshot} × {item.quantity}
                    </span>
                    <span>{formatPaise(item.line_total_paise || item.total_paise)}</span>
                  </div>
                ))}
              </div>

              {/* Tax & Breakdown */}
              <div className="border-t border-border/60 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPaise(completedInvoice.subtotal_paise)}</span>
                </div>
                {completedInvoice.discount_paise > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount:</span>
                    <span>-{formatPaise(completedInvoice.discount_paise)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>GST Tax:</span>
                  <span>{formatPaise(completedInvoice.tax_paise)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-border/40 pt-1">
                  <span>Grand Total:</span>
                  <span>{formatPaise(completedInvoice.total_amount_paise)}</span>
                </div>
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Paid ({completedInvoice.payment_method}):</span>
                  <span>{formatPaise(completedInvoice.paid_amount_paise)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                <p>Thank you for shopping with us!</p>
                <p className="font-sans">PROJECT TRACE • Smart Retail Cloud</p>
              </div>
            </div>

            {/* Sharing & Printing Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareWhatsApp(completedInvoice)}
                className="gap-1.5 text-xs text-emerald-500 hover:text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Send className="h-3.5 w-3.5" />
                <span>WhatsApp Receipt</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCompletedInvoice(null)}>
                  Done
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 font-bold"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  <span>Print 80mm Receipt</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* BILL HISTORY & REFUND MODAL */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="POS Sales History & Returns"
        description="Audit completed bills, re-print thermal receipts, or process inventory returns and refunds."
        maxWidth="xl"
      >
        <div className="space-y-3 pt-2">
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
            {shopInvoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-foreground">{inv.invoice_number}</span>
                    <Badge
                      variant={inv.payment_status === "REFUNDED" ? "destructive" : "secondary"}
                      className="text-[10px] py-0"
                    >
                      {inv.payment_status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {inv.payment_method}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {inv.customer_name || inv.customer_name_snapshot || "Walk-in Guest"} • {new Date(inv.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground mr-1">
                    {formatPaise(inv.total_amount_paise)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCompletedInvoice(inv);
                      setIsHistoryOpen(false);
                    }}
                    className="h-7 text-[11px] gap-1"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print</span>
                  </Button>
                  {inv.payment_status !== "REFUNDED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRefundingInvoice(inv);
                        setIsRefundModalOpen(true);
                      }}
                      className="h-7 text-[11px] text-rose-400 hover:text-rose-500 hover:bg-rose-500/10"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Refund
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {shopInvoices.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No invoices generated yet for this store.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* CONFIRM REFUND MODAL */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => !isRefunding && setIsRefundModalOpen(false)}
        title="Process Return & Refund"
        description={refundingInvoice ? `Invoice #${refundingInvoice.invoice_number} • Amount: ${formatPaise(refundingInvoice.total_amount_paise)}` : ""}
      >
        {refundingInvoice && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertCircle className="h-4 w-4" />
                Inventory & Accounting Impact
              </p>
              <p className="text-[11px]">
                Refunding this bill will restock all sold quantities back into products inventory, record a refund audit entry, and reverse customer khata balances if applicable.
              </p>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Reason for Return / Refund
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Defective item, customer changed mind"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                disabled={isRefunding}
                onClick={() => setIsRefundModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isRefunding}
                onClick={handleProcessRefund}
                className="gap-2 font-bold"
              >
                {isRefunding ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Restocking & Refunding...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Confirm Full Refund</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QUICK CUSTOMER REGISTRATION MODAL */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Add Customer for Khata / Billing"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Full Name</label>
            <input
              type="text"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Phone / Mobile (WhatsApp)</label>
            <input
              type="tel"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">PayLater Credit Limit (₹)</label>
            <input
              type="number"
              value={newCustCreditLimit}
              onChange={(e) => setNewCustCreditLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsNewCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Add Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
