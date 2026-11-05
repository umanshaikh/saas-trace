"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

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
  } = useTrace();

  const shopProducts = products.filter((p) => p.shop_id === activeShop.id);
  const shopCategories = categories.filter((c) => c.shop_id === activeShop.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT">("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(10);
  const [adjustReason, setAdjustReason] = useState<"RESTOCK" | "DAMAGED" | "CORRECTION">("RESTOCK");
  const [adjustNote, setAdjustNote] = useState("");

  // Product Form state (for Add and Edit)
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(shopCategories[0]?.id || "");
  const [formSku, setFormSku] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formCostRupees, setFormCostRupees] = useState("");
  const [formSellingRupees, setFormSellingRupees] = useState("");
  const [formStock, setFormStock] = useState(20);
  const [formThreshold, setFormThreshold] = useState(5);
  const [formUnit, setFormUnit] = useState<any>("PIECE");
  const [formTaxRate, setFormTaxRate] = useState(5);

  const filteredProducts = shopProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "ALL" || p.category_id === selectedCategory;
    const stock = p.stock_quantity ?? p.current_stock ?? 0;
    const matchesStock =
      stockFilter === "ALL" ||
      (stockFilter === "LOW" && stock <= p.low_stock_threshold && stock > 0) ||
      (stockFilter === "OUT" && stock <= 0);

    return matchesSearch && matchesCat && matchesStock;
  });

  const openAddModal = () => {
    setFormName("");
    setFormCategory(shopCategories[0]?.id || "");
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    setFormCostRupees("50");
    setFormSellingRupees("80");
    setFormStock(25);
    setFormThreshold(5);
    setFormUnit("PIECE");
    setFormTaxRate(5);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category_id || shopCategories[0]?.id || "");
    setFormSku(p.sku || "");
    setFormBarcode(p.barcode || "");
    setFormCostRupees(((p.cost_price_paise ?? p.purchase_price_paise ?? 0) / 100).toString());
    setFormSellingRupees((p.selling_price_paise / 100).toString());
    setFormStock(p.stock_quantity ?? p.current_stock ?? 0);
    setFormThreshold(p.low_stock_threshold);
    setFormUnit(p.unit);
    setFormTaxRate(p.tax_rate ?? p.tax_rate_percent ?? 0);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSellingRupees) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formName.trim(),
        category_id: formCategory,
        sku: formSku,
        barcode: formBarcode,
        cost_price_paise: rupeesToPaise(Number(formCostRupees)),
        selling_price_paise: rupeesToPaise(Number(formSellingRupees)),
        stock_quantity: Number(formStock),
        low_stock_threshold: Number(formThreshold),
        unit: formUnit,
        tax_rate: Number(formTaxRate),
      });
      setEditingProduct(null);
    } else {
      addProduct({
        name: formName.trim(),
        category_id: formCategory,
        sku: formSku,
        barcode: formBarcode,
        cost_price_paise: rupeesToPaise(Number(formCostRupees)),
        selling_price_paise: rupeesToPaise(Number(formSellingRupees)),
        stock_quantity: Number(formStock),
        low_stock_threshold: Number(formThreshold),
        unit: formUnit,
        tax_rate: Number(formTaxRate),
      });
      setIsAddModalOpen(false);
    }
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const delta = adjustReason === "DAMAGED" ? -Math.abs(adjustDelta) : Math.abs(adjustDelta);
    adjustStock(adjustingProduct.id, delta, adjustReason, adjustNote || "Manual inventory adjustment");
    setAdjustingProduct(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-500" />
            Inventory & Stock Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage product SKUs, wholesale & retail pricing, barcodes, and automated low-stock safety thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Supabase Auto-Sync
          </span>
          {userRole !== "CASHIER" && (
            <Button variant="default" onClick={openAddModal} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </Button>
          )}
        </div>
      </div>

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
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Product Name</th>
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
                      <p className="font-semibold text-foreground text-sm">{prod.name}</p>
                      <p className="text-[10px] text-muted-foreground">Unit: {prod.unit}</p>
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
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${prod.name}?`)) {
                                  deleteProduct(prod.id);
                                }
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
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
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    No products matched your search or filters. Click "Add New Product" to expand your catalog.
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Category
              </label>
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
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                SKU Code
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Barcode / EAN-13
              </label>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="Scan or type barcode"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            <Button type="submit" variant="default">
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        title={`Adjust Stock • ${adjustingProduct?.name}`}
        description={`Current in-stock: ${adjustingProduct?.stock_quantity ?? adjustingProduct?.current_stock ?? 0} ${adjustingProduct?.unit}`}
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

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Quantity Units ({adjustingProduct.unit})
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
                placeholder="e.g. Received batch #440 from distributor"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="ghost" onClick={() => setAdjustingProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default">
                Confirm Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
