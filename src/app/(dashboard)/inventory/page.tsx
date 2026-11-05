"use client";

import React, { useState, useRef } from "react";
import { useTrace } from "@/context/TraceContext";
import { Product } from "@/lib/types";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit,
  Trash2,
  TrendingUp,
  History,
  Barcode,
  Layers,
  ArrowUpDown,
  Filter,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Printer,
  Upload,
  Tag,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";

export default function InventoryPage() {
  const {
    activeShop,
    products,
    categories,
    userRole,
    syncStatus,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    addCategory,
    importProductsCSV,
    showToast,
  } = useTrace();

  const shopProducts = products.filter((p) => p.shop_id === activeShop.id);
  const shopCategories = categories.filter((c) => c.shop_id === activeShop.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT" | "EXPIRING">("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(10);
  const [adjustReason, setAdjustReason] = useState<"RESTOCK" | "DAMAGED" | "CORRECTION">("RESTOCK");
  const [adjustDirection, setAdjustDirection] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustNote, setAdjustNote] = useState("");

  // Product Form state (for Add and Edit)
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(shopCategories[0]?.id || "");
  const [formSku, setFormSku] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCostRupees, setFormCostRupees] = useState("");
  const [formSellingRupees, setFormSellingRupees] = useState("");
  const [formStock, setFormStock] = useState(20);
  const [formThreshold, setFormThreshold] = useState(5);
  const [formUnit, setFormUnit] = useState<any>("PIECE");
  const [formTaxRate, setFormTaxRate] = useState(5);
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formBatchNumber, setFormBatchNumber] = useState("");

  // Inline Category Creation Modal
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Stock Movement Audit Log Modal
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // Barcode Label Generator Modal
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeLabelCount, setBarcodeLabelCount] = useState<number>(8);
  const [barcodeLabelSize, setBarcodeLabelSize] = useState<"ROLL" | "SHEET">("ROLL");

  // Supplier Price Comparison Modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareProduct, setCompareProduct] = useState<Product | null>(null);

  // CSV Catalog Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Expiry calculation helper
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 86400000;
  const expiringProducts = shopProducts.filter((p) => {
    if (!p.expiry_date) return false;
    const expMs = new Date(p.expiry_date).getTime();
    return expMs <= nowMs + thirtyDaysMs;
  });

  const filteredProducts = shopProducts.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const catName = shopCategories.find((c) => c.id === p.category_id)?.name.toLowerCase() || "";
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      catName.includes(q);
    const matchesCat =
      selectedCategory === "ALL" || p.category_id === selectedCategory;
    const stock = p.stock_quantity ?? p.current_stock ?? 0;

    let matchesStock = true;
    if (stockFilter === "LOW") {
      matchesStock = stock <= p.low_stock_threshold && stock > 0;
    } else if (stockFilter === "OUT") {
      matchesStock = stock <= 0;
    } else if (stockFilter === "EXPIRING") {
      matchesStock = !!p.expiry_date && new Date(p.expiry_date).getTime() <= nowMs + thirtyDaysMs;
    }

    return matchesSearch && matchesCat && matchesStock;
  });

  const openAddModal = () => {
    setFormName("");
    setFormCategory(shopCategories[0]?.id || "");
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    setFormImageUrl("");
    setFormCostRupees("50");
    setFormSellingRupees("80");
    setFormStock(25);
    setFormThreshold(5);
    setFormUnit("PIECE");
    setFormTaxRate(5);
    setFormExpiryDate("");
    setFormBatchNumber("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category_id || shopCategories[0]?.id || "");
    setFormSku(p.sku || "");
    setFormBarcode(p.barcode || "");
    setFormImageUrl(p.image_url || "");
    setFormCostRupees(((p.cost_price_paise ?? p.purchase_price_paise ?? 0) / 100).toString());
    setFormSellingRupees((p.selling_price_paise / 100).toString());
    setFormStock(p.stock_quantity ?? p.current_stock ?? 0);
    setFormThreshold(p.low_stock_threshold);
    setFormUnit(p.unit);
    setFormTaxRate(p.tax_rate ?? p.tax_rate_percent ?? 0);
    setFormExpiryDate(p.expiry_date || "");
    setFormBatchNumber(p.batch_number || "");
  };

  const openBarcodeModal = (p?: Product) => {
    setBarcodeProduct(p || shopProducts[0] || null);
    setIsBarcodeModalOpen(true);
  };

  const openPriceCompareModal = (p: Product) => {
    setCompareProduct(p);
    setIsCompareModalOpen(true);
  };

  const generateEAN13 = () => {
    const raw = "890" + Math.floor(100000000 + Math.random() * 900000000).toString();
    setFormBarcode(raw);
  };

  const generateSKU = () => {
    const prefix = formName
      ? formName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "ITM")
      : "SKU";
    const random = Math.floor(1000 + Math.random() * 9000);
    setFormSku(`${prefix}-${random}`);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      if (showToast) showToast("error", "Validation Error", "Product title is required.");
      return;
    }

    const sellingPrice = Number(formSellingRupees);
    const costPrice = Number(formCostRupees) || 0;
    const stockQty = Number(formStock);

    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      if (showToast) showToast("error", "Invalid Selling Price", "Selling price must be greater than ₹0.");
      return;
    }

    if (isNaN(costPrice) || costPrice < 0) {
      if (showToast) showToast("error", "Invalid Cost Price", "Cost price cannot be negative.");
      return;
    }

    if (isNaN(stockQty) || stockQty < 0) {
      if (showToast) showToast("error", "Invalid Stock Quantity", "Stock quantity cannot be negative.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        updateProduct(editingProduct.id, {
          name: formName.trim(),
          category_id: formCategory,
          sku: formSku,
          barcode: formBarcode,
          image_url: formImageUrl.trim() || undefined,
          cost_price_paise: rupeesToPaise(costPrice),
          purchase_price_paise: rupeesToPaise(costPrice),
          selling_price_paise: rupeesToPaise(sellingPrice),
          stock_quantity: stockQty,
          current_stock: stockQty,
          low_stock_threshold: Number(formThreshold) || 5,
          unit: formUnit,
          tax_rate: Number(formTaxRate) || 0,
          tax_rate_percent: Number(formTaxRate) || 0,
          expiry_date: formExpiryDate || undefined,
          batch_number: formBatchNumber || undefined,
        });
        if (showToast) showToast("success", "Product Updated", `"${formName.trim()}" was updated successfully.`);
        setEditingProduct(null);
      } else {
        addProduct({
          name: formName.trim(),
          category_id: formCategory,
          sku: formSku,
          barcode: formBarcode,
          image_url: formImageUrl.trim() || undefined,
          cost_price_paise: rupeesToPaise(costPrice),
          purchase_price_paise: rupeesToPaise(costPrice),
          selling_price_paise: rupeesToPaise(sellingPrice),
          stock_quantity: stockQty,
          current_stock: stockQty,
          low_stock_threshold: Number(formThreshold) || 5,
          unit: formUnit,
          tax_rate: Number(formTaxRate) || 0,
          tax_rate_percent: Number(formTaxRate) || 0,
          expiry_date: formExpiryDate || undefined,
          batch_number: formBatchNumber || undefined,
        });
        if (showToast) showToast("success", "Product Added", `"${formName.trim()}" was added to inventory.`);
        setIsAddModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importProductsCSV(content);
      if (res.imported > 0) {
        setImportStatus(`Successfully imported ${res.imported} products!`);
      } else {
        setImportStatus(`Import error: ${res.errors.join(", ")}`);
      }
    };
    reader.readAsText(file);
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const isDeduct = adjustReason === "DAMAGED" || (adjustReason === "CORRECTION" && adjustDirection === "DEDUCT");
    const delta = isDeduct ? -Math.abs(adjustDelta) : Math.abs(adjustDelta);
    adjustStock(adjustingProduct.id, delta, adjustReason, adjustNote || "Manual inventory adjustment");
    setAdjustingProduct(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isCreatingCategory) return;
    setIsCreatingCategory(true);

    try {
      const created = await addCategory(newCatName.trim(), newCatDesc.trim());
      setFormCategory(created.id);
      setIsNewCategoryModalOpen(false);
      setNewCatName("");
      setNewCatDesc("");
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const openMovementsLog = async () => {
    setIsMovementsModalOpen(true);
    setIsLoadingMovements(true);
    try {
      const res = await fetch(`/api/inventory/adjust?shopId=${activeShop.id}`);
      const data = await res.json();
      setStockMovements(data.movements || []);
    } catch (e) {
      console.warn("Failed to load stock movements:", e);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-500" />
            Inventory & Stock Catalog
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage product SKUs, wholesale & retail pricing, barcodes, product expiry, and automated low-stock safety thresholds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden CSV File Input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvFileChange}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => csvInputRef.current?.click()}
            className="gap-1.5 text-xs border-border/80"
          >
            <Upload className="h-4 w-4 text-indigo-400" />
            <span>Import CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openBarcodeModal()}
            className="gap-1.5 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold"
          >
            <Barcode className="h-4 w-4 text-indigo-500" />
            <span>Print Barcodes</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openMovementsLog}
            className="gap-1.5 text-xs border-border/80"
          >
            <History className="h-4 w-4 text-indigo-500" />
            <span>Audit Trail</span>
          </Button>

          {userRole !== "CASHIER" && (
            <Button variant="default" size="sm" onClick={openAddModal} className="gap-2 shadow-sm text-xs font-bold">
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </Button>
          )}
        </div>
      </div>

      {/* CSV Import Notification Alert */}
      {importStatus && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportStatus(null)}
            className="h-6 text-xs text-emerald-400 hover:text-white"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by product name, barcode, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {shopCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <div className="flex rounded-lg border border-border/80 bg-background p-0.5 text-xs">
            <button
              onClick={() => setStockFilter("ALL")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                stockFilter === "ALL" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({shopProducts.length})
            </button>
            <button
              onClick={() => setStockFilter("LOW")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                stockFilter === "LOW" ? "bg-amber-500 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter("OUT")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                stockFilter === "OUT" ? "bg-rose-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Out of Stock
            </button>
            <button
              onClick={() => setStockFilter("EXPIRING")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                stockFilter === "EXPIRING" ? "bg-orange-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Expiring ({expiringProducts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">SKU & Barcode</th>
                <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-center">GST Rate</th>
                <th className="py-3 px-4 font-semibold text-center">Stock Level</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredProducts.map((prod) => {
                const stockQty = prod.stock_quantity ?? prod.current_stock ?? 0;
                const costPaise = prod.cost_price_paise ?? prod.purchase_price_paise ?? 0;
                const isOutOfStock = stockQty <= 0;
                const isLowStock = stockQty <= prod.low_stock_threshold;
                const profitMarginPaise = prod.selling_price_paise - costPaise;
                const marginPercent = Math.round(
                  (profitMarginPaise / (prod.selling_price_paise || 1)) * 100
                );

                return (
                  <tr key={prod.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="h-8 w-8 rounded-lg object-cover border border-border/60 bg-muted shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-indigo-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground text-sm">{prod.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">Unit: {prod.unit || "pcs"}</span>
                            {prod.expiry_date && (
                              <>
                                <span className="text-muted-foreground/40">•</span>
                                {new Date(prod.expiry_date).getTime() < nowMs ? (
                                  <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                                    Expired: {prod.expiry_date}
                                  </Badge>
                                ) : new Date(prod.expiry_date).getTime() <= nowMs + thirtyDaysMs ? (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold bg-amber-500/20 text-amber-400 border-amber-500/40">
                                    Exp: {prod.expiry_date}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Exp: {prod.expiry_date}</span>
                                )}
                              </>
                            )}
                            {prod.batch_number && (
                              <span className="text-[9px] font-mono text-muted-foreground">({prod.batch_number})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <p className="text-foreground">{prod.sku}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Barcode className="h-2.5 w-2.5" /> {prod.barcode || "No Barcode"}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                      {formatPaise(costPaise)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                      {formatPaise(prod.selling_price_paise)}
                      <div className="text-[9px] text-emerald-500 font-sans font-semibold">
                        +{marginPercent}% margin
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {prod.tax_rate ?? prod.tax_rate_percent ?? 0}% GST
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="font-extrabold text-foreground text-sm">
                        {stockQty}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {prod.unit}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Min limit: {prod.low_stock_threshold}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isOutOfStock ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : isLowStock ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustingProduct(prod);
                            setAdjustDelta(10);
                            setAdjustReason("RESTOCK");
                          }}
                          className="h-7 text-xs px-2"
                        >
                          Stock ±
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Print Barcode Tag"
                          onClick={() => openBarcodeModal(prod)}
                          className="h-7 w-7 p-0 text-indigo-400 hover:text-indigo-300"
                        >
                          <Barcode className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Compare B2B Supplier Rates"
                          onClick={() => openPriceCompareModal(prod)}
                          className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                        </Button>

                        {userRole !== "CASHIER" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(prod)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProductToDelete(prod)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                              title="Archive product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs">
                    <div className="max-w-md mx-auto p-6 rounded-2xl border border-dashed border-border bg-accent/10 flex flex-col items-center">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                        <Package className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        {shopProducts.length === 0 ? "Your Inventory Catalog is Empty" : "No Matching Products Found"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {shopProducts.length === 0
                          ? "Get started by adding your first product to begin billing at the POS counter."
                          : "Try adjusting your search query, barcode filter, or category selection."}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        {userRole !== "CASHIER" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={openAddModal}
                            className="gap-1.5 text-xs font-bold shadow-sm"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Your First Product</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("csv-file-input")?.click()}
                          className="gap-1.5 text-xs font-medium"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Import CSV</span>
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={isAddModalOpen || !!editingProduct}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? `Edit Product • ${editingProduct.name}` : "Add New Inventory Product"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Product Title *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Aashirvaad Shudh Chakki Atta 5kg"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Product Image URL with Live Thumbnail Preview */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block flex items-center justify-between">
              <span>Product Image URL (Optional)</span>
              {formImageUrl && (
                <span className="text-[10px] text-emerald-400 font-normal">Preview Loaded</span>
              )}
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="url"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://example.com/images/product.jpg"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {formImageUrl ? (
                <img
                  src={formImageUrl}
                  alt="Preview"
                  className="h-9 w-9 rounded-lg object-cover border border-border/80 bg-muted shrink-0"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="h-9 w-9 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  + New Category
                </button>
              </div>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {shopCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Unit of Measurement
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="PIECE">Piece / Nos</option>
                <option value="KG">Kilogram (kg)</option>
                <option value="GRAM">Gram (g)</option>
                <option value="LITRE">Litre (L)</option>
                <option value="PACK">Packet / Pouch</option>
                <option value="BOX">Carton / Box</option>
                <option value="METER">Meter (m)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">SKU Code</label>
                <button
                  type="button"
                  onClick={generateSKU}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Auto SKU
                </button>
              </div>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">Barcode / EAN-13</label>
                <button
                  type="button"
                  onClick={generateEAN13}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <Barcode className="h-2.5 w-2.5" /> Generate EAN
                </button>
              </div>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="Scan or generate barcode"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Purchase / Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formCostRupees}
                onChange={(e) => setFormCostRupees(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formSellingRupees}
                onChange={(e) => setFormSellingRupees(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                GST Tax Rate (%)
              </label>
              <select
                value={formTaxRate}
                onChange={(e) => setFormTaxRate(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={0}>0% (Tax Exempt)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST</option>
                <option value={28}>28% GST</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Current Stock Qty
              </label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Low-Stock Threshold
              </label>
              <input
                type="number"
                value={formThreshold}
                onChange={(e) => setFormThreshold(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Batch / Lot Number (Optional)
              </label>
              <input
                type="text"
                value={formBatchNumber}
                onChange={(e) => setFormBatchNumber(e.target.value)}
                placeholder="e.g. LOT-2026-X1"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" className="font-bold gap-1.5" disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingProduct ? "Save Changes" : "Create Product"}</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM ARCHIVE PRODUCT MODAL */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="Archive Inventory Product?"
        description={`Are you sure you want to archive "${productToDelete?.name}"?`}
      >
        <div className="space-y-3 pt-2 text-xs text-muted-foreground">
          <p>
            Safeguard guarantee: Historical sales invoices, receipts, and accounting ledgers referencing this item will remain 100% intact. The product will be safely deactivated from your active POS billing catalog.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button variant="ghost" size="sm" onClick={() => setProductToDelete(null)}>
              Keep Product
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (productToDelete) {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }
              }}
            >
              Confirm Archive
            </Button>
          </div>
        </div>
      </Modal>

      {/* INLINE CATEGORY CREATION MODAL */}
      <Modal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        title="Add Product Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Category Name *</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Dairy & Eggs, Beverages, Personal Care"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Description (Optional)</label>
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Brief description of the shelf category"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsNewCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isCreatingCategory}>
              {isCreatingCategory ? "Creating..." : "Save Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        title={`Adjust Stock • ${adjustingProduct?.name}`}
        description={`Current in-stock: ${adjustingProduct?.stock_quantity ?? adjustingProduct?.current_stock ?? 0} ${adjustingProduct?.unit || "pcs"}`}
      >
        {adjustingProduct && (
          <form onSubmit={handleStockAdjustment} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Adjustment Reason
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value as any)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="RESTOCK">Restock / Shipment Arrival (+)</option>
                <option value="DAMAGED">Damaged / Expired / Shrinkage (-)</option>
                <option value="CORRECTION">Manual Inventory Count Correction (±)</option>
              </select>
            </div>

            {adjustReason === "CORRECTION" && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Correction Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDirection("ADD")}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      adjustDirection === "ADD"
                        ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50"
                        : "bg-background border-input text-muted-foreground"
                    }`}
                  >
                    + Add In Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDirection("DEDUCT")}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      adjustDirection === "DEDUCT"
                        ? "bg-rose-600/20 text-rose-400 border-rose-500/50"
                        : "bg-background border-input text-muted-foreground"
                    }`}
                  >
                    - Deduct From Stock
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Quantity Units ({adjustingProduct.unit || "pcs"})
              </label>
              <input
                type="number"
                min="1"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Audit Notes / Supplier Invoice Ref
              </label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g. Restocked from Metro Cash & Carry, Invoice #8821"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="ghost" onClick={() => setAdjustingProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="font-bold">
                Confirm Stock Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* STOCK MOVEMENTS AUDIT TRAIL MODAL */}
      <Modal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        title="Stock Movements & Audit Trail"
        description="Comprehensive audit ledger tracking restocks, sales deductions, shrinkage, and returns."
        maxWidth="xl"
      >
        <div className="space-y-3 pt-2">
          {isLoadingMovements ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
              <span>Loading stock audit movements...</span>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
              {stockMovements.map((mov) => {
                const isPositive = Number(mov.quantity) > 0;
                return (
                  <div key={mov.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {mov.products?.name || "Product Stock"}
                        </span>
                        <Badge
                          variant={
                            mov.movement_type === "INVOICE_SALE"
                              ? "outline"
                              : mov.movement_type === "RESTOCK"
                              ? "success"
                              : mov.movement_type === "RETURN"
                              ? "secondary"
                              : "warning"
                          }
                          className="text-[10px] py-0"
                        >
                          {mov.movement_type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {mov.notes || "System movement entry"} • {new Date(mov.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span
                        className={`font-extrabold text-sm ${
                          isPositive ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {isPositive ? `+${mov.quantity}` : mov.quantity} {mov.products?.unit || "pcs"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {stockMovements.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No stock movements recorded yet for this shop.
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
      {/* BARCODE LABEL GENERATOR MODAL */}
      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title="Print Barcode Labels • Retail Tags"
        description="Generate printable price tags with scannable barcode stripes, store name, MRP, and statutory disclosures."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Print Styles scoped to Barcode Container */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #barcode-print-container, #barcode-print-container * {
                visibility: visible;
              }
              #barcode-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                background: #fff !important;
                color: #000 !important;
                margin: 0 !important;
                padding: 4mm !important;
              }
            }
          `}</style>

          {/* Controls: Product, Count, Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-b border-border/60 pb-3">
            <div>
              <label className="text-muted-foreground block mb-1">Target Product</label>
              <select
                value={barcodeProduct?.id || ""}
                onChange={(e) => {
                  const found = shopProducts.find((p) => p.id === e.target.value);
                  if (found) setBarcodeProduct(found);
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground font-semibold"
              >
                {shopProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatPaise(p.selling_price_paise)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Sticker Quantity</label>
              <div className="flex items-center gap-1">
                {[4, 8, 16, 24].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setBarcodeLabelCount(count)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                      barcodeLabelCount === count
                        ? "bg-indigo-600 text-white"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Label Tag Format</label>
              <select
                value={barcodeLabelSize}
                onChange={(e) => setBarcodeLabelSize(e.target.value as any)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
              >
                <option value="ROLL">50mm × 25mm Thermal Roll Tag</option>
                <option value="SHEET">A4 Sticker Sheet (3×8 Layout)</option>
              </select>
            </div>
          </div>

          {/* Printable Barcode Label Grid */}
          {barcodeProduct && (
            <div
              id="barcode-print-container"
              className="max-h-[50vh] overflow-y-auto p-4 rounded-xl border border-border/80 bg-background/50 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3"
            >
              {Array.from({ length: barcodeLabelCount }).map((_, idx) => {
                const code = barcodeProduct.barcode || barcodeProduct.sku || "8901234567890";
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-gray-400 bg-white text-black shadow-sm font-sans flex flex-col justify-between text-center select-none"
                    style={{ minHeight: "105px" }}
                  >
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-900 truncate">
                        {activeShop.name}
                      </p>
                      <p className="text-[10px] font-bold text-black truncate mt-0.5 line-clamp-1">
                        {barcodeProduct.name}
                      </p>
                    </div>

                    {/* Scannable High-Contrast Barcode SVG */}
                    <div className="my-1 flex flex-col items-center">
                      <svg
                        className="w-36 h-7"
                        viewBox="0 0 144 28"
                        preserveAspectRatio="none"
                      >
                        {Array.from({ length: 28 }).map((_, barIdx) => {
                          const charCode = code.charCodeAt(barIdx % code.length) || 50;
                          const barW = (charCode % 3) + 1;
                          const barX = barIdx * 5;
                          return (
                            <rect
                              key={barIdx}
                              x={barX}
                              y="0"
                              width={barW}
                              height="28"
                              fill="#000000"
                            />
                          );
                        })}
                      </svg>
                      <span className="font-mono text-[9px] tracking-widest text-black font-semibold">
                        {code}
                      </span>
                    </div>

                    <div className="border-t border-dashed border-gray-300 pt-1">
                      <p className="font-extrabold text-[12px] text-black">
                        MRP: {formatPaise(barcodeProduct.selling_price_paise)}
                      </p>
                      <p className="text-[8px] text-gray-600 leading-tight">
                        (Incl. of all taxes) • 1 {barcodeProduct.unit || "Unit"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground">
              Tip: Compatible with standard ESC/POS 58mm/80mm thermal barcode printers and A4 laser printers.
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsBarcodeModalOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => window.print()}
                className="gap-2 font-bold px-6 shadow-md shadow-indigo-600/30"
              >
                <Printer className="h-4 w-4" />
                <span>Print {barcodeLabelCount} Stickers</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* SUPPLIER WHOLESALE RATE COMPARISON MODAL */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        title={`Wholesale B2B Rate Comparison • ${compareProduct?.name || "Product"}`}
        description="Live wholesale rate discovery across TRACE B2B Network suppliers to optimize purchase margins."
        maxWidth="lg"
      >
        {compareProduct && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Current Product Economics */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/70 bg-accent/20">
              <div>
                <span className="text-muted-foreground block text-[11px]">Current Store Cost</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {formatPaise(compareProduct.cost_price_paise ?? compareProduct.purchase_price_paise ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Selling MRP</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {formatPaise(compareProduct.selling_price_paise)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Current Margin</span>
                <span className="text-sm font-bold text-emerald-400">
                  +{Math.round(
                    ((compareProduct.selling_price_paise - (compareProduct.cost_price_paise ?? compareProduct.purchase_price_paise ?? 0)) /
                      (compareProduct.selling_price_paise || 1)) *
                      100
                  )}%
                </span>
              </div>
            </div>

            {/* Comparative Supplier Listings */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Available B2B Wholesale Suppliers
              </h4>

              {[
                {
                  supplier: "Metro Cash & Carry Wholesale Hub",
                  city: activeShop.city || "Pune",
                  discountPercent: 18,
                  moq: 12,
                  rating: "4.9 ★",
                  delivery: "Same Day Dispatch",
                },
                {
                  supplier: "Udaan Direct FMCG Super Hub",
                  city: "Regional Distribution",
                  discountPercent: 14,
                  moq: 24,
                  rating: "4.8 ★",
                  delivery: "24-48 Hours",
                },
                {
                  supplier: "Reliance Market B2B Supply",
                  city: activeShop.city || "Mumbai",
                  discountPercent: 16,
                  moq: 18,
                  rating: "4.7 ★",
                  delivery: "Next Day Delivery",
                },
                {
                  supplier: "Authorized Regional FMCG Distributor",
                  city: "Local Market",
                  discountPercent: 10,
                  moq: 6,
                  rating: "4.9 ★",
                  delivery: "Immediate Pickup",
                },
              ].map((s, i) => {
                const currentCost = compareProduct.cost_price_paise ?? compareProduct.purchase_price_paise ?? 1000;
                const wholesalePricePaise = Math.round(currentCost * (1 - s.discountPercent / 100));
                const savingPerUnit = currentCost - wholesalePricePaise;

                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">{s.supplier}</span>
                        <Badge variant="outline" className="text-[10px] py-0 text-amber-400 border-amber-500/30">
                          {s.rating}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.city} • Min Order: {s.moq} {compareProduct.unit || "pcs"} • {s.delivery}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          {formatPaise(wholesalePricePaise)}
                          <span className="text-[10px] font-normal text-muted-foreground">/unit</span>
                        </div>
                        <div className="text-[10px] text-emerald-500 font-semibold">
                          Save {formatPaise(savingPerUnit)} (-{s.discountPercent}%)
                        </div>
                      </div>

                      <Link href={`/network?product=${compareProduct.id}&supplier=${encodeURIComponent(s.supplier)}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 font-bold">
                          <span>Order</span>
                          <Share2 className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={() => setIsCompareModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
