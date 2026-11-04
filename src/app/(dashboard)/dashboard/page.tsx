"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTrace } from "@/context/TraceContext";
import { formatPaise } from "@/lib/utils";
import {
  IndianRupee,
  Receipt,
  Package,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Calculator,
  Plus,
  Bot,
  Printer,
  Share2,
  Store,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export default function DashboardPage() {
  const {
    activeShop,
    products,
    invoices,
    customers,
    userRole,
    language,
    adjustStock,
  } = useTrace();

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [restockItem, setRestockItem] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState(10);

  // Filter products and invoices belonging to the active shop
  const shopProducts = products.filter((p) => p.shop_id === activeShop.id);
  const shopInvoices = invoices.filter((inv) => inv.shop_id === activeShop.id);

  // Today's calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const todayInvoices = shopInvoices.filter((inv) => inv.created_at.startsWith(todayStr));
  const todaySalesPaise = todayInvoices.reduce((sum, inv) => sum + inv.total_amount_paise, 0);

  // Low stock products
  const lowStockProducts = shopProducts.filter(
    (p) => (p.stock_quantity ?? p.current_stock ?? 0) <= p.low_stock_threshold
  );

  // PayLater outstanding for customers of this shop
  const shopCustomers = customers.filter((c) => c.shop_id === activeShop.id);
  const totalOutstandingPaise = shopCustomers.reduce(
    (sum, c) => sum + (c.outstanding_balance_paise ?? c.total_outstanding_paise ?? 0),
    0
  );

  const handleQuickRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || restockQty <= 0) return;
    adjustStock(restockItem.id, Number(restockQty), "RESTOCK", "Dashboard quick restock");
    setRestockItem(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Shop Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeShop.name}
            </h1>
            <Badge variant="default" className="text-xs uppercase">
              {activeShop.business_type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time business performance overview & operations center • {activeShop.city}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/pos">
            <Button variant="default" className="gap-2 shadow-md shadow-indigo-600/20">
              <Calculator className="h-4 w-4" />
              <span>Open POS Counter (F1)</span>
            </Button>
          </Link>
          <Link href="/ai-assistant">
            <Button variant="secondary" className="gap-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              <span>Ask TRACE AI</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* TRACE AI Daily Insight Card */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-4 sm:p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                TRACE AI • Daily Business Insights
              </h2>
              <Badge variant="brand" className="text-[10px]">
                {language === "hi" ? "हिंदी" : language === "mr" ? "मराठी" : "Live Intelligence"}
              </Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
              {lowStockProducts.length > 0 ? (
                <>
                  Attention required: <span className="font-bold text-amber-400">{lowStockProducts.length} items</span> are below their low-stock safety threshold. Consider placing a TRACE B2B stock request or restock before peak evening hours.
                </>
              ) : (
                <>
                  Inventory levels are optimal across all categories. Sales velocity is trending up 14% compared to last week. PayLater collections are healthy.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="border-border/60 hover:border-indigo-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today's Sales
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaise(todaySalesPaise)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center text-emerald-500 font-semibold">
                <TrendingUp className="h-3 w-3 mr-0.5" /> +12.5%
              </span>
              <span>vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Invoices Today */}
        <Card className="border-border/60 hover:border-indigo-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Bills Generated
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {todayInvoices.length}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              <span>{shopInvoices.length} total lifetime invoices</span>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-border/60 hover:border-amber-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Low Stock Alert
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              lowStockProducts.length > 0 ? "bg-amber-500/10 text-amber-500 animate-pulse" : "bg-muted text-muted-foreground"
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {lowStockProducts.length}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              <span>Out of {shopProducts.length} active inventory items</span>
            </div>
          </CardContent>
        </Card>

        {/* PayLater Khata Credit Outstanding */}
        <Card className="border-border/60 hover:border-rose-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              PayLater Outstanding
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaise(totalOutstandingPaise)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              <span>Across {shopCustomers.filter(c => (c.outstanding_balance_paise || 0) > 0).length} customer khatas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Invoices & Low Stock Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Invoices Table (2 Cols) */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Recent Transactions
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest customer bills generated at this shop
              </p>
            </div>
            <Link
              href="/pos"
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              Go to POS <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                    <th className="py-2.5 px-4 font-semibold">Customer</th>
                    <th className="py-2.5 px-4 font-semibold">Payment</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {shopInvoices.slice(0, 6).map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {invoice.invoice_number}
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-foreground">
                          {invoice.customer_name || "Walk-in Customer"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {invoice.customer_phone || "No phone recorded"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            invoice.payment_method === "UPI"
                              ? "brand"
                              : invoice.payment_method === "CASH"
                              ? "success"
                              : invoice.payment_method === "PAYLATER"
                              ? "warning"
                              : "default"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {invoice.payment_method}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatPaise(invoice.total_amount_paise)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="h-7 px-2 text-indigo-500 hover:text-indigo-400"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" /> View Bill
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {shopInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No transactions recorded yet today. Click "Open POS Counter" to bill your first customer!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Items & Quick Restock */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Low Stock Items</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Urgent reordering needed
              </p>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              All items <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <div className="mx-auto h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                  <Package className="h-5 w-5" />
                </div>
                All items have sufficient stock. No replenishment warnings.
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-accent/20 hover:bg-accent/40 transition-colors"
                >
                  <div className="truncate mr-2">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {prod.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-amber-500 font-bold">
                        Stock: {prod.stock_quantity ?? prod.current_stock} {prod.unit}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Min: {prod.low_stock_threshold} {prod.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRestockItem(prod);
                        setRestockQty(10);
                      }}
                      className="h-7 text-xs px-2"
                    >
                      + Restock
                    </Button>
                    <Link href={`/network?request=${prod.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Request from TRACE B2B Network"
                        className="h-7 px-1.5 text-indigo-500 hover:text-indigo-400"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-border/50">
              <Link href="/inventory" className="w-full">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  Manage Complete Inventory
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Detail / Print Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Tax Invoice • ${selectedInvoice?.invoice_number}`}
        maxWidth="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4 pt-1">
            {/* Printable Receipt Container */}
            <div id="printable-receipt" className="p-4 rounded-xl border border-border/80 bg-background space-y-4">
              <div className="text-center border-b border-border/60 pb-3">
                <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                  {activeShop.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeShop.city} • GSTIN: {activeShop.gstin || "27AABCT1332L1Z5"}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
                  <span>Invoice: {selectedInvoice.invoice_number}</span>
                  <span>{new Date(selectedInvoice.created_at).toLocaleString()}</span>
                </div>
                {selectedInvoice.customer_name && (
                  <div className="text-left text-xs font-medium text-foreground mt-1">
                    Customer: {selectedInvoice.customer_name} ({selectedInvoice.customer_phone || "N/A"})
                  </div>
                )}
              </div>

              {/* Items List */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="text-left py-1.5">Item</th>
                    <th className="text-center py-1.5">Qty</th>
                    <th className="text-right py-1.5">Rate</th>
                    <th className="text-right py-1.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {selectedInvoice.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1.5 font-medium">{item.product_name}</td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right">{formatPaise(item.unit_price_paise)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatPaise(item.total_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-border/60 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatPaise(selectedInvoice.subtotal_paise)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST / Tax:</span>
                  <span>{formatPaise(selectedInvoice.tax_paise)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border/40">
                  <span>Grand Total:</span>
                  <span>{formatPaise(selectedInvoice.total_amount_paise)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-emerald-500 pt-0.5">
                  <span>Payment ({selectedInvoice.payment_method}):</span>
                  <span>{formatPaise(selectedInvoice.paid_amount_paise)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Restock Modal */}
      <Modal
        isOpen={!!restockItem}
        onClose={() => setRestockItem(null)}
        title={`Restock: ${restockItem?.name}`}
        description={`Current stock: ${restockItem?.stock_quantity ?? restockItem?.current_stock} ${restockItem?.unit}. Add units to safety inventory.`}
      >
        <form onSubmit={handleQuickRestock} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Units to Add ({restockItem?.unit})
            </label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setRestockItem(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Confirm Restock (+{restockQty} {restockItem?.unit})
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
