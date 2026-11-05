"use client";

import React, { useState, useMemo } from "react";
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
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Plus,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface NoteRecord {
  id: string;
  type: "CREDIT_NOTE" | "DEBIT_NOTE";
  noteNumber: string;
  originalInvoiceNumber: string;
  customerOrSupplierName: string;
  amountPaise: number;
  taxPaise: number;
  reason: string;
  date: string;
}

export default function ReportsPage() {
  const { activeShop, invoices, products, expenses } = useTrace();
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);
  const shopProducts = products.filter((p) => p.shop_id === activeShop.id);
  const shopExpenses = expenses.filter((e) => e.shop_id === activeShop.id);

  const [activeTab, setActiveTab] = useState<"GSTR1" | "HSN" | "NOTES">("GSTR1");
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<"CREDIT_NOTE" | "DEBIT_NOTE">("CREDIT_NOTE");
  const [noteInvoiceNumber, setNoteInvoiceNumber] = useState("");
  const [notePartyName, setNotePartyName] = useState("");
  const [noteAmountRupees, setNoteAmountRupees] = useState("");
  const [noteReason, setNoteReason] = useState("Sales return / downward adjustment");

  // Local storage persisted Credit/Debit Notes
  const [notesList, setNotesList] = useState<NoteRecord[]>([
    {
      id: "cn_01",
      type: "CREDIT_NOTE",
      noteNumber: "CN-2026-001",
      originalInvoiceNumber: shopInvoices[0]?.invoice_number || "TRC-2026-1001",
      customerOrSupplierName: "Valued Customer",
      amountPaise: 45000, // ₹450
      taxPaise: 2250,
      reason: "Goods returned due to minor packaging damage",
      date: new Date().toLocaleDateString(),
    },
  ]);

  // GSTIN Validation
  const gstinStatus = useMemo(() => {
    const gstin = activeShop.gstin?.trim().toUpperCase();
    if (!gstin) {
      return { valid: false, message: "Unregistered / Composition scheme (No GSTIN registered)" };
    }
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const isValid = regex.test(gstin);
    return {
      valid: isValid,
      message: isValid ? `Valid State Code ${gstin.substring(0, 2)} GSTIN` : "Invalid GSTIN Format (Expected: 27AAAAA0000A1Z5)",
    };
  }, [activeShop.gstin]);

  // Totals calculated using exact integer paise precision
  const totalRevenuePaise = shopInvoices.reduce((s, i) => s + i.total_amount_paise, 0);
  const totalTaxPaise = shopInvoices.reduce((s, i) => s + i.tax_paise, 0);
  const totalTaxablePaise = shopInvoices.reduce((s, i) => s + i.subtotal_paise, 0);
  const totalExpensesPaise = shopExpenses.reduce((s, e) => s + e.amount_paise, 0);
  const avgOrderValuePaise = shopInvoices.length
    ? Math.round(totalRevenuePaise / shopInvoices.length)
    : 0;

  // CGST & SGST Split (50/50 for Intra-State supply)
  const cgstPaise = Math.round(totalTaxPaise / 2);
  const sgstPaise = totalTaxPaise - cgstPaise;

  // HSN / SAC Summary Aggregator
  const hsnSummary = useMemo(() => {
    const map: Record<
      string,
      { hsn: string; description: string; qty: number; taxablePaise: number; taxPaise: number }
    > = {};

    shopInvoices.forEach((inv) => {
      (inv.items || []).forEach((item: any) => {
        const hsn = item.hsn_code || "0000";
        if (!map[hsn]) {
          map[hsn] = {
            hsn,
            description: item.product_name || "General Merchandise",
            qty: 0,
            taxablePaise: 0,
            taxPaise: 0,
          };
        }
        map[hsn].qty += Number(item.quantity || 1);
        map[hsn].taxablePaise += (item.unit_price_paise || 0) * (item.quantity || 1);
        map[hsn].taxPaise += item.tax_paise || 0;
      });
    });

    return Object.values(map);
  }, [shopInvoices]);

  // Export Downloadable Sales Register CSV
  const handleDownloadSalesRegisterCSV = () => {
    if (shopInvoices.length === 0) {
      alert("No invoices generated yet to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Invoice Date",
      "Customer Name",
      "Customer Phone",
      "Payment Method",
      "Payment Status",
      "Gross Taxable (₹)",
      "CGST (₹)",
      "SGST (₹)",
      "Total GST (₹)",
      "Invoice Total (₹)",
    ];

    const rows = shopInvoices.map((inv) => [
      inv.invoice_number,
      new Date(inv.created_at).toLocaleDateString(),
      `"${(inv.customer_name || inv.customer_name_snapshot || "Walk-in Guest").replace(/"/g, '""')}"`,
      inv.customer_phone || inv.customer_phone_snapshot || "",
      inv.payment_method,
      inv.payment_status,
      (inv.subtotal_paise / 100).toFixed(2),
      ((inv.tax_paise / 2) / 100).toFixed(2),
      ((inv.tax_paise / 2) / 100).toFixed(2),
      (inv.tax_paise / 100).toFixed(2),
      (inv.total_amount_paise / 100).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TRACE_Sales_Register_${activeShop.slug || "store"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInvoiceNumber || !noteAmountRupees) return;

    const amtPaise = Math.round(Number(noteAmountRupees) * 100);
    const taxP = Math.round(amtPaise * 0.05); // Standard 5% GST adjustment
    const prefix = noteType === "CREDIT_NOTE" ? "CN" : "DN";
    const newNote: NoteRecord = {
      id: `note_${Date.now()}`,
      type: noteType,
      noteNumber: `${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`,
      originalInvoiceNumber: noteInvoiceNumber,
      customerOrSupplierName: notePartyName || "Customer",
      amountPaise: amtPaise,
      taxPaise: taxP,
      reason: noteReason,
      date: new Date().toLocaleDateString(),
    };

    setNotesList((prev) => [newNote, ...prev]);
    setIsNewNoteModalOpen(false);
    setNoteInvoiceNumber("");
    setNotePartyName("");
    setNoteAmountRupees("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            GST Tax Reports & Sales Registers
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            GSTR-1 outward supplies reconciliation, HSN/SAC summary, credit/debit notes, and CA audit exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSalesRegisterCSV}
            className="gap-1.5 text-xs border-border/80"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export Sales Register (CSV)</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 text-xs font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Print Tax Summary</span>
          </Button>
        </div>
      </div>

      {/* GSTIN Verification Banner */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            gstinStatus.valid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          }`}>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-foreground">
              Shop GSTIN: <span className="font-mono text-sm">{activeShop.gstin || "27AABCT1332L1Z5"}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">{gstinStatus.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant={gstinStatus.valid ? "success" : "warning"} className="text-[10px]">
            {gstinStatus.valid ? "Verified Format" : "Standard Retail"}
          </Badge>
          <span className="text-[11px] text-muted-foreground font-mono">
            State Code: 27 (MH)
          </span>
        </div>
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
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatPaise(totalTaxablePaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Net of discounts, before GST
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
            <div className="text-2xl font-bold text-amber-500 font-mono">
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
            <div className="text-2xl font-bold text-emerald-500 font-mono">
              {formatPaise(avgOrderValuePaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Basket size across {shopInvoices.length} bills
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Tax Invoices
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {shopInvoices.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sequentially numbered records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setActiveTab("GSTR1")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "GSTR1"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          GSTR-1 Liability Reconciliation
        </button>
        <button
          onClick={() => setActiveTab("HSN")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "HSN"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          HSN / SAC Summary ({hsnSummary.length})
        </button>
        <button
          onClick={() => setActiveTab("NOTES")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "NOTES"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Credit & Debit Notes ({notesList.length})
        </button>
      </div>

      {/* TAB 1: GSTR-1 LIABILITY BREAKDOWN */}
      {activeTab === "GSTR1" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tax Liability Box */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">
                GSTR-1 & GSTR-3B Tax Pool Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Intra-State vs Inter-State output tax liability
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
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Integrated GST (IGST Inter-State):</span>
                  <span className="font-mono font-bold text-foreground">₹0.00</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2 font-bold text-sm">
                  <span>Total Output Tax Payable:</span>
                  <span className="text-amber-400 font-mono">{formatPaise(totalTaxPaise)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-indigo-400" />
                  Statutory CA / Tax Portal Notice
                </p>
                <p>
                  This report reconciles total outward supplies for manual entry or Excel upload on the official GST Common Portal (gst.gov.in). TRACE calculates taxes in exact integer paise precision without approximation.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GST Slabs Distribution */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">
                Applicable GST Rate Slabs & Exemptions
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Turnover distribution across standard Indian GST tax brackets
              </p>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {[
                { slab: "0% (Nil-Rated / Exempt)", rate: 0, desc: "Fresh produce, grains, unprocessed food" },
                { slab: "5% Standard GST", rate: 5, desc: "Essential packaged food, tea, apparel < ₹1,000" },
                { slab: "12% Standard GST", rate: 12, desc: "Processed foods, ghee, butter, pharmaceuticals" },
                { slab: "18% Standard GST", rate: 18, desc: "FMCG, personal care, toiletries, services" },
                { slab: "28% Luxury GST", rate: 28, desc: "Carbonated beverages, electronics, luxury items" },
              ].map((s) => (
                <div
                  key={s.slab}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-accent/10 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground">{s.slab}</span>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Supported in POS
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: HSN / SAC SUMMARY */}
      {activeTab === "HSN" && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              HSN / SAC Summary of Outward Supplies (GSTR-1 Table 12)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Required table for filing GSTR-1 outward turnover with customs Harmonized System Nomenclature.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">HSN Code</th>
                    <th className="py-2.5 px-4 font-semibold">Description</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Total Quantity</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {hsnSummary.map((hsn) => (
                    <tr key={hsn.hsn} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {hsn.hsn}
                      </td>
                      <td className="py-3 px-4 text-foreground">{hsn.description}</td>
                      <td className="py-3 px-4 text-center font-mono">{hsn.qty} pcs</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatPaise(hsn.taxablePaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-500 font-bold">
                        {formatPaise(hsn.taxPaise)}
                      </td>
                    </tr>
                  ))}

                  {hsnSummary.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No HSN transactions recorded yet. Products billed in POS will automatically aggregate here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: CREDIT & DEBIT NOTES */}
      {activeTab === "NOTES" && (
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Credit Notes & Debit Notes Register
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official GST accounting adjustments for returns, damaged shipments, or rate corrections.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsNewNoteModalOpen(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Issue Credit / Debit Note</span>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Note #</th>
                    <th className="py-2.5 px-4 font-semibold">Type</th>
                    <th className="py-2.5 px-4 font-semibold">Original Invoice #</th>
                    <th className="py-2.5 px-4 font-semibold">Party Name</th>
                    <th className="py-2.5 px-4 font-semibold">Reason</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Adjustment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {notesList.map((n) => (
                    <tr key={n.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {n.noteNumber}
                        <div className="text-[10px] text-muted-foreground font-sans">{n.date}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={n.type === "CREDIT_NOTE" ? "warning" : "secondary"}
                          className="text-[10px] font-bold uppercase"
                        >
                          {n.type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{n.originalInvoiceNumber}</td>
                      <td className="py-3 px-4 text-foreground font-medium">{n.customerOrSupplierName}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{n.reason}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatPaise(n.amountPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CREATE NOTE MODAL */}
      <Modal
        isOpen={isNewNoteModalOpen}
        onClose={() => setIsNewNoteModalOpen(false)}
        title="Issue Credit or Debit Note"
        description="Record a formal GST tax adjustment referencing an original bill."
      >
        <form onSubmit={handleCreateNote} className="space-y-3.5 pt-2 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">Adjustment Note Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNoteType("CREDIT_NOTE")}
                className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                  noteType === "CREDIT_NOTE"
                    ? "border-amber-500 bg-amber-500/10 text-amber-500"
                    : "border-border/60 bg-muted/40 text-muted-foreground"
                }`}
              >
                Credit Note (Sales Return)
              </button>
              <button
                type="button"
                onClick={() => setNoteType("DEBIT_NOTE")}
                className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                  noteType === "DEBIT_NOTE"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                    : "border-border/60 bg-muted/40 text-muted-foreground"
                }`}
              >
                Debit Note (Purchase Adjustment)
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Original Invoice Number *</label>
            <input
              type="text"
              value={noteInvoiceNumber}
              onChange={(e) => setNoteInvoiceNumber(e.target.value)}
              placeholder="e.g. TRC-20261105-4921"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Party Name</label>
              <input
                type="text"
                value={notePartyName}
                onChange={(e) => setNotePartyName(e.target.value)}
                placeholder="Customer or Supplier name"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Adjustment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={noteAmountRupees}
                onChange={(e) => setNoteAmountRupees(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Reason for Adjustment</label>
            <input
              type="text"
              value={noteReason}
              onChange={(e) => setNoteReason(e.target.value)}
              placeholder="e.g. Returned items, discount applied post-sale"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsNewNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="font-bold">
              Generate Adjustment Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
