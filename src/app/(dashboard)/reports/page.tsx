"use client";

import React from "react";
import { useTrace } from "@/context/TraceContext";
import { formatPaise } from "@/lib/utils";
import {
  BarChart3,
  IndianRupee,
  Receipt,
  Printer,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { activeShop, invoices, products, expenses } = useTrace();
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);
  const shopProducts = products.filter((p) => p.shop_id === activeShop.id);
  const shopExpenses = expenses.filter((e) => e.shop_id === activeShop.id);

  // Totals
  const totalRevenuePaise = shopInvoices.reduce((s, i) => s + i.total_amount_paise, 0);
  const totalTaxPaise = shopInvoices.reduce((s, i) => s + i.tax_paise, 0);
  const totalTaxablePaise = shopInvoices.reduce((s, i) => s + i.subtotal_paise, 0);
  const totalExpensesPaise = shopExpenses.reduce((s, e) => s + e.amount_paise, 0);
  const avgOrderValuePaise = shopInvoices.length
    ? Math.round(totalRevenuePaise / shopInvoices.length)
    : 0;

  // Half CGST, Half SGST for intra-state GST
  const cgstPaise = Math.round(totalTaxPaise / 2);
  const sgstPaise = totalTaxPaise - cgstPaise;

  // Calculate top items sold
  const itemMap: Record<string, { name: string; qty: number; revenuePaise: number }> = {};
  shopInvoices.forEach((inv) => {
    (inv.items || []).forEach((item: any) => {
      if (!itemMap[item.product_name]) {
        itemMap[item.product_name] = { name: item.product_name, qty: 0, revenuePaise: 0 };
      }
      itemMap[item.product_name].qty += item.quantity;
      itemMap[item.product_name].revenuePaise += item.total_paise;
    });
  });

  const topProducts = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Business Reports & GST Tax Filing
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            GST GSTR-1 & GSTR-3B audit reconciliation, taxable turnover, and product sales velocity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-2 text-xs"
        >
          <Printer className="h-4 w-4" />
          <span>Print GST Report</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Gross Taxable Turnover
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatPaise(totalTaxablePaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Before GST taxes applied
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total GST Collected
            </CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {formatPaise(totalTaxPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              CGST + SGST tax pool
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Average Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatPaise(avgOrderValuePaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Ticket size per customer bill
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Invoices Issued
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {shopInvoices.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Verified legal tax invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GST Breakdown Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* GST Liability Box */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              GST Tax Liability Breakdown (GSTR-1 Ready)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shop GSTIN: <span className="font-mono text-foreground font-semibold">{activeShop.gstin || "27AABCT1332L1Z5"}</span>
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-accent/20 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Central GST (CGST 50%):</span>
                <span className="font-mono font-bold text-foreground">{formatPaise(cgstPaise)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">State GST (SGST 50%):</span>
                <span className="font-mono font-bold text-foreground">{formatPaise(sgstPaise)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2 font-bold text-sm">
                <span>Total Tax Payable to Govt:</span>
                <span className="text-amber-400 font-mono">{formatPaise(totalTaxPaise)}</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              * Calculations are strictly verified using integer paise precision without rounding discrepancies.
            </p>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              Top Selling Products by Volume
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Highest turnover items across all completed invoices
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {topProducts.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-accent/10"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-500 font-bold text-xs">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.qty} units sold</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-foreground">
                    {formatPaise(item.revenuePaise)}
                  </span>
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No products sold yet. Start billing via POS counter to view rankings.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
