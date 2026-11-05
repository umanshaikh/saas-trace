"use client";

import React, { useState, useMemo } from "react";
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
  TrendingDown,
  ArrowUpRight,
  Calculator,
  Plus,
  Bot,
  Printer,
  Share2,
  Store,
  ChevronRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type DateRangeFilter = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL_TIME";

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

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("TODAY");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [restockItem, setRestockItem] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState(10);

  // Filter products and invoices belonging to the active shop
  const shopProducts = products.filter((p) => p.shop_id === activeShop.id);
  const shopInvoices = invoices.filter((inv) => inv.shop_id === activeShop.id);
  const shopCustomers = customers.filter((c) => c.shop_id === activeShop.id);

  // Dynamic Date Range Filter Calculations
  const { filteredInvoices, previousPeriodSalesPaise, periodLabel, prevPeriodLabel } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    const oneDayMs = 86400000;

    let currentStart = todayStart;
    let currentEnd = todayEnd;
    let prevStart = todayStart - oneDayMs;
    let prevEnd = todayStart;
    let label = "Today";
    let prevLabel = "yesterday";

    if (dateFilter === "YESTERDAY") {
      currentStart = todayStart - oneDayMs;
      currentEnd = todayStart;
      prevStart = currentStart - oneDayMs;
      prevEnd = currentStart;
      label = "Yesterday";
      prevLabel = "day before";
    } else if (dateFilter === "LAST_7_DAYS") {
      currentStart = todayEnd - 7 * oneDayMs;
      currentEnd = todayEnd;
      prevStart = currentStart - 7 * oneDayMs;
      prevEnd = currentStart;
      label = "Last 7 Days";
      prevLabel = "prior 7 days";
    } else if (dateFilter === "THIS_MONTH") {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      currentEnd = todayEnd;
      const daysIntoMonth = Math.max(1, Math.floor((currentEnd - currentStart) / oneDayMs));
      prevStart = currentStart - daysIntoMonth * oneDayMs;
      prevEnd = currentStart;
      label = "This Month";
      prevLabel = "last month";
    } else if (dateFilter === "ALL_TIME") {
      currentStart = 0;
      currentEnd = Infinity;
      prevStart = 0;
      prevEnd = 0;
      label = "All Time";
      prevLabel = "";
    }

    const filtered = shopInvoices.filter((inv) => {
      const invTime = new Date(inv.created_at).getTime();
      return invTime >= currentStart && invTime < currentEnd;
    });

    let prevSales = 0;
    if (dateFilter !== "ALL_TIME") {
      const prevInvoices = shopInvoices.filter((inv) => {
        const invTime = new Date(inv.created_at).getTime();
        return invTime >= prevStart && invTime < prevEnd;
      });
      prevSales = prevInvoices.reduce((sum, inv) => sum + inv.total_amount_paise, 0);
    }

    return {
      filteredInvoices: filtered,
      previousPeriodSalesPaise: prevSales,
      periodLabel: label,
      prevPeriodLabel: prevLabel,
    };
  }, [shopInvoices, dateFilter]);

  // Aggregates for current selected period
  const periodSalesPaise = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount_paise, 0);

  // Exact growth calculation (Strictly from actual historical records, no synthetic numbers)
  const salesGrowthPct = useMemo(() => {
    if (dateFilter === "ALL_TIME" || previousPeriodSalesPaise <= 0) {
      return null; // Insufficient prior data: do not display artificial growth
    }
    const delta = periodSalesPaise - previousPeriodSalesPaise;
    return Math.round((delta / previousPeriodSalesPaise) * 100);
  }, [periodSalesPaise, previousPeriodSalesPaise, dateFilter]);

  // Low stock products
  const lowStockProducts = shopProducts.filter(
    (p) => (p.stock_quantity ?? p.current_stock ?? 0) <= p.low_stock_threshold
  );

  // PayLater outstanding for customers of this shop
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Filter Selector */}
          <div className="flex items-center bg-card border border-border/80 rounded-xl p-1 text-xs shadow-sm">
            {(
              [
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "LAST_7_DAYS", label: "7 Days" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "ALL_TIME", label: "All Time" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  dateFilter === f.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Link href="/pos">
            <Button variant="default" size="sm" className="gap-2 shadow-md shadow-indigo-600/20 text-xs font-bold">
              <Calculator className="h-4 w-4" />
              <span>POS Counter (F1)</span>
            </Button>
          </Link>
          <Link href="/ai-assistant">
            <Button variant="secondary" size="sm" className="gap-2 text-xs">
              <Bot className="h-4 w-4 text-indigo-500" />
              <span>TRACE AI</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Guide for Clean / Empty Dashboards */}
      {shopInvoices.length === 0 && (
        <Card className="border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Welcome to TRACE! Quick Store Launch Checklist
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your analytics dashboard will begin populating as soon as you add products and record sales.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/inventory">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-indigo-500/30">
                  <Package className="h-3.5 w-3.5 text-indigo-500" />
                  1. Add Products
                </Button>
              </Link>
              <Link href="/pos">
                <Button variant="default" size="sm" className="text-xs gap-1.5 font-bold">
                  <Calculator className="h-3.5 w-3.5" />
                  2. Make First Bill
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* TRACE AI Business Insight Card — Driven Strictly By Actual Store Context */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-4 sm:p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Store Analytics Insight
              </h2>
              <Badge variant="brand" className="text-[10px]">
                {periodLabel}
              </Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
              {shopInvoices.length === 0 ? (
                <>
                  No sales recorded yet. Start billing via the POS counter or import your existing catalog in Inventory.
                </>
              ) : lowStockProducts.length > 0 ? (
                <>
                  Attention required: <span className="font-bold text-amber-400">{lowStockProducts.length} items</span> are below their safety threshold. Consider restocking before peak customer hours.
                </>
              ) : (
                <>
                  Inventory stock levels are healthy across {shopProducts.length} products. Total period volume is <span className="font-bold text-foreground">{formatPaise(periodSalesPaise)}</span> across {filteredInvoices.length} sales.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales in Selected Period */}
        <Card className="border-border/60 hover:border-indigo-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {periodLabel} Sales
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaise(periodSalesPaise)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              {salesGrowthPct !== null ? (
                <>
                  <span
                    className={`flex items-center font-semibold ${
                      salesGrowthPct >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {salesGrowthPct >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {salesGrowthPct >= 0 ? `+${salesGrowthPct}%` : `${salesGrowthPct}%`}
                  </span>
                  <span>vs {prevPeriodLabel}</span>
                </>
              ) : (
                <span>Recorded transactions</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bills Generated in Selected Period */}
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
              {filteredInvoices.length}
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
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                lowStockProducts.length > 0
                  ? "bg-amber-500/10 text-amber-500 animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
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
              <span>
                Across{" "}
                {
                  shopCustomers.filter(
                    (c) =>
                      (c.outstanding_balance_paise ?? c.total_outstanding_paise ?? 0) > 0
                  ).length
                }{" "}
                customer khatas
              </span>
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
                Recent Transactions ({periodLabel})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest customer bills generated for this store
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
                  {filteredInvoices.slice(0, 6).map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {invoice.invoice_number}
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {new Date(invoice.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-foreground">
                          {invoice.customer_name || invoice.customer_name_snapshot || "Walk-in Guest"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {invoice.customer_phone || invoice.customer_phone_snapshot || "No phone recorded"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            invoice.payment_status === "REFUNDED"
                              ? "destructive"
                              : invoice.payment_method === "UPI"
                              ? "brand"
                              : invoice.payment_method === "CASH"
                              ? "success"
                              : invoice.payment_method === "PAYLATER"
                              ? "warning"
                              : "default"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {invoice.payment_status === "REFUNDED" ? "REFUNDED" : invoice.payment_method}
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
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No transactions recorded for {periodLabel.toLowerCase()}. Click "POS Counter" to bill your first customer.
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
                        Stock: {prod.stock_quantity ?? prod.current_stock} {prod.unit || "pcs"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Min: {prod.low_stock_threshold} {prod.unit || "pcs"}
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
          <div className="space-y-4 pt-1 font-mono text-xs">
            <div id="printable-receipt" className="p-4 rounded-xl border border-border/80 bg-background space-y-4">
              <div className="text-center border-b border-border/60 pb-3">
                <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                  {activeShop.name}
                </h3>
                <p className="text-xs text-muted-foreground font-sans">
                  {activeShop.city} • {activeShop.gstin ? `GSTIN: ${activeShop.gstin}` : "GST: Unregistered / Exempt"}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
                  <span>Invoice: {selectedInvoice.invoice_number}</span>
                  <span>{new Date(selectedInvoice.created_at).toLocaleString()}</span>
                </div>
                {selectedInvoice.customer_name && (
                  <div className="text-left text-xs font-sans text-foreground mt-1">
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
                      <td className="py-1.5 font-medium">{item.product_name || item.product_name_snapshot}</td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right">{formatPaise(item.unit_price_paise)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatPaise(item.line_total_paise || item.total_paise)}</td>
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
        description={`Current stock: ${restockItem?.stock_quantity ?? restockItem?.current_stock} ${restockItem?.unit || "pcs"}. Add units to safety inventory.`}
      >
        <form onSubmit={handleQuickRestock} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Units to Add ({restockItem?.unit || "pcs"})
            </label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setRestockItem(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="font-bold">
              Confirm Restock (+{restockQty} {restockItem?.unit || "pcs"})
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
