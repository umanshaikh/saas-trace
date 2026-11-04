"use client";

import React, { useState } from "react";
import { useTrace } from "@/context/TraceContext";
import { formatPaise } from "@/lib/utils";
import {
  IndianRupee,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  Download,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PaymentsPage() {
  const { activeShop, invoices } = useTrace();
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);

  const [filterMethod, setFilterMethod] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Breakdown
  const cashTotalPaise = shopInvoices
    .filter((i) => i.payment_method === "CASH")
    .reduce((s, i) => s + i.paid_amount_paise, 0);

  const upiTotalPaise = shopInvoices
    .filter((i) => i.payment_method === "UPI")
    .reduce((s, i) => s + i.paid_amount_paise, 0);

  const cardTotalPaise = shopInvoices
    .filter((i) => i.payment_method === "CARD")
    .reduce((s, i) => s + i.paid_amount_paise, 0);

  const paylaterTotalPaise = shopInvoices
    .filter((i) => i.payment_method === "PAYLATER")
    .reduce((s, i) => s + i.total_amount_paise, 0);

  const filteredInvoices = shopInvoices.filter((i) => {
    const matchesMethod = filterMethod === "ALL" || i.payment_method === filterMethod;
    const matchesSearch =
      i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.customer_name && i.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-indigo-500" />
            Payment Ledger & Reconciliation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit transactions across Cash, UPI QR, Card terminal, and PayLater credit settlements.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-2 text-xs"
        >
          <Printer className="h-4 w-4" />
          <span>Export Daily Reconciliation</span>
        </Button>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* UPI Payments */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              UPI Transactions
            </CardTitle>
            <QrCode className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {formatPaise(upiTotalPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Direct instant bank settlement
            </p>
          </CardContent>
        </Card>

        {/* Cash Drawer */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Cash in Drawer
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-500">
              {formatPaise(cashTotalPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Physical counter receipts
            </p>
          </CardContent>
        </Card>

        {/* Card POS */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Card Terminal
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {formatPaise(cardTotalPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              T+1 bank batch settlement
            </p>
          </CardContent>
        </Card>

        {/* PayLater Credit Issued */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              PayLater Issued
            </CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-500">
              {formatPaise(paylaterTotalPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Recorded to customer khata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table & Filters */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              All Transaction Records
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified payment transactions recorded at POS counter
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-56 rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash Only</option>
              <option value="UPI">UPI Only</option>
              <option value="CARD">Card Only</option>
              <option value="PAYLATER">PayLater Only</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Method</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount Settled</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(inv.created_at).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-foreground">
                        {inv.customer_name || "Walk-in Customer"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {inv.customer_phone || "Counter sale"}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          inv.payment_method === "UPI"
                            ? "brand"
                            : inv.payment_method === "CASH"
                            ? "success"
                            : inv.payment_method === "PAYLATER"
                            ? "warning"
                            : "default"
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {inv.payment_method}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-foreground font-mono text-sm">
                      {formatPaise(inv.paid_amount_paise || inv.total_amount_paise)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Settled
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      No payments match the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
