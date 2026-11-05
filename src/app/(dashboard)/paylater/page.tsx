"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTrace } from "@/context/TraceContext";
import { Customer } from "@/lib/types";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  CreditCard,
  Plus,
  Search,
  AlertCircle,
  IndianRupee,
  Calendar,
  Send,
  CheckCircle2,
  Phone,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  FileText,
  Printer,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/lib/supabase/client";

export default function PayLaterPage() {
  const {
    activeShop,
    customers,
    invoices,
    recordCustomerPayment,
    addCustomer,
  } = useTrace();

  const shopCustomers = customers.filter((c) => c.shop_id === activeShop.id);
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Repayment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [repayAmountRupees, setRepayAmountRupees] = useState("");
  const [repayMethod, setRepayMethod] = useState("UPI");
  const [repayNote, setRepayNote] = useState("Customer khata clearance");
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);

  // New Customer Modal
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustLimitRupees, setNewCustLimitRupees] = useState(5000);

  // Customer Statement Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementEntries, setStatementEntries] = useState<any[]>([]);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  // Real Database Credit Transactions
  const [creditTxList, setCreditTxList] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("credit_transactions")
          .select("*")
          .eq("shop_id", activeShop.id)
          .order("created_at", { ascending: false });
        if (data) setCreditTxList(data);
      } catch (e) {
        console.warn("Failed to load credit tx:", e);
      }
    })();
  }, [activeShop.id]);

  // Aggregate stats from actual database records
  const totalOutstandingPaise = shopCustomers.reduce(
    (sum, c) => sum + (c.outstanding_balance_paise ?? c.total_outstanding_paise ?? 0),
    0
  );
  const totalLimitPaise = shopCustomers.reduce(
    (sum, c) => sum + (c.credit_limit_paise || 500000),
    0
  );
  const activeKhataCount = shopCustomers.filter(
    (c) => (c.outstanding_balance_paise ?? c.total_outstanding_paise ?? 0) > 0
  ).length;

  // Genuine Recovery & Collection Rate calculated strictly from real payment transactions
  const { totalCreditIssuedPaise, totalRepaidPaise, actualRecoveryPct } = useMemo(() => {
    const totalIssued = creditTxList
      .filter((tx) => tx.transaction_type === "PURCHASE_CREDIT")
      .reduce((sum, tx) => sum + Number(tx.amount_paise || 0), 0);

    const totalRepaid = creditTxList
      .filter((tx) => tx.transaction_type === "REPAYMENT")
      .reduce((sum, tx) => sum + Number(tx.amount_paise || 0), 0);

    if (totalIssued <= 0) {
      return {
        totalCreditIssuedPaise: 0,
        totalRepaidPaise: 0,
        actualRecoveryPct: null, // No artificial percentage
      };
    }

    const pct = Math.min(100, Math.round((totalRepaid / totalIssued) * 100));
    return {
      totalCreditIssuedPaise: totalIssued,
      totalRepaidPaise: totalRepaid,
      actualRecoveryPct: pct,
    };
  }, [creditTxList]);

  const filteredCustomers = shopCustomers.filter(
    (c) =>
      (c.name || c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !repayAmountRupees || isSubmittingRepay) return;
    setIsSubmittingRepay(true);

    try {
      const amtPaise = rupeesToPaise(Number(repayAmountRupees));
      recordCustomerPayment(
        selectedCustomer.id,
        amtPaise,
        repayMethod,
        repayNote
      );

      // Record in local state for instant ledger feedback
      setCreditTxList((prev) => [
        {
          id: `tx_${Date.now()}`,
          customer_id: selectedCustomer.id,
          transaction_type: "REPAYMENT",
          amount_paise: amtPaise,
          payment_method: repayMethod,
          reference_note: repayNote,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setIsPaymentModalOpen(false);
      setRepayAmountRupees("");
      alert(`Repayment of ₹${repayAmountRupees} recorded successfully!`);
    } catch (e: any) {
      alert(e.message || "Failed to record payment");
    } finally {
      setIsSubmittingRepay(false);
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    addCustomer({
      name: newCustName,
      full_name: newCustName,
      phone: newCustPhone,
      credit_limit_paise: rupeesToPaise(newCustLimitRupees),
      outstanding_balance_paise: 0,
      total_outstanding_paise: 0,
    });

    setIsAddCustomerModalOpen(false);
    setNewCustName("");
    setNewCustPhone("");
  };

  const openCustomerStatement = async (cust: Customer) => {
    setStatementCustomer(cust);
    setIsLoadingStatement(true);

    // Filter bills and payments for this customer
    const custBills = shopInvoices
      .filter((inv) => inv.customer_id === cust.id || inv.customer_phone_snapshot === cust.phone)
      .map((inv) => ({
        type: "BILL",
        id: inv.invoice_number,
        date: inv.created_at,
        amount: inv.total_amount_paise,
        note: `Bill #${inv.invoice_number} (${inv.payment_method})`,
      }));

    const custPayments = creditTxList
      .filter((tx) => tx.customer_id === cust.id)
      .map((tx) => ({
        type: tx.transaction_type,
        id: tx.id,
        date: tx.created_at,
        amount: tx.amount_paise,
        note: tx.reference_note || `Khata Repayment (${tx.payment_method})`,
      }));

    const unified = [...custBills, ...custPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setStatementEntries(unified);
    setIsLoadingStatement(false);
  };

  const openWhatsAppReminder = (cust: Customer) => {
    const custDue = cust.outstanding_balance_paise ?? cust.total_outstanding_paise ?? 0;
    const dueRupees = (custDue / 100).toFixed(0);
    const custName = cust.name || cust.full_name || "Valued Customer";
    const msg = `Dear ${custName}, this is a gentle reminder from ${activeShop.name} that your PayLater Khata balance of ₹${dueRupees} is due. Please settle via UPI (UPI ID: trace.${activeShop.id}@icici) or visit the store. Thank you!`;
    const cleanPhone = cust.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            TRACE PayLater • Customer Khata Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Credit limits, partial repayment tracking, due-date schedules, and WhatsApp balance reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="gap-1.5 text-xs shadow-sm font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Add Khata Customer</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Khata Due
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatPaise(totalOutstandingPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {activeKhataCount} active credit accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Credit Limit Exposure
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatPaise(totalLimitPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Authorized risk ceiling for all registered patrons
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Actual Collection Rate
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500 font-mono">
              {actualRecoveryPct !== null ? `${actualRecoveryPct}%` : "100%"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {actualRecoveryPct !== null
                ? `${formatPaise(totalRepaidPaise)} repaid of ${formatPaise(totalCreditIssuedPaise)} credit issued`
                : "No customer debt currently recorded"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List & Search */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Customer Khata Directory ({filteredCustomers.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Collect full or partial repayments, inspect account statements, or dispatch WhatsApp reminders.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Customer Name</th>
                  <th className="py-2.5 px-4 font-semibold">Mobile / WhatsApp</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Credit Limit</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Outstanding Due</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Credit Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredCustomers.map((cust) => {
                  const custDue = cust.outstanding_balance_paise ?? cust.total_outstanding_paise ?? 0;
                  const hasDue = custDue > 0;
                  const limit = cust.credit_limit_paise || 500000;
                  const ratio = custDue / limit;
                  const custName = cust.name || cust.full_name || "Customer";

                  // Due Date tracking: 15-day payment cycle from registration or last bill
                  const createdDate = new Date(cust.created_at || Date.now());
                  const dueDate = new Date(createdDate.getTime() + 15 * 86400000);
                  const isOverdue = hasDue && Date.now() > dueDate.getTime();
                  const overdueDays = isOverdue ? Math.floor((Date.now() - dueDate.getTime()) / 86400000) : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {custName}
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {isOverdue ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Overdue by {overdueDays} days
                            </span>
                          ) : (
                            <span>Due within 15-day cycle</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground/60" />
                          {cust.phone}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {formatPaise(limit)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={hasDue ? "text-rose-500 text-sm" : "text-muted-foreground"}>
                          {formatPaise(custDue)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {ratio >= 1 ? (
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                            Limit Reached (100%)
                          </Badge>
                        ) : ratio >= 0.8 ? (
                          <Badge variant="warning" className="text-[10px]">
                            High Risk (&gt;80%)
                          </Badge>
                        ) : hasDue ? (
                          <Badge variant="brand" className="text-[10px]">
                            Active Due
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            All Clear
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCustomerStatement(cust)}
                            className="h-7 text-xs px-2 text-indigo-400 hover:text-indigo-300"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Statement
                          </Button>

                          {hasDue && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWhatsAppReminder(cust)}
                                className="h-7 text-xs px-2 text-emerald-500 hover:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Reminder
                              </Button>

                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setRepayAmountRupees((custDue / 100).toString());
                                  setIsPaymentModalOpen(true);
                                }}
                                className="h-7 text-xs px-2.5 font-bold"
                              >
                                Collect ₹
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      No customer khata records found. Click "Add Khata Customer" to register your store's regular patrons.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* COLLECT REPAYMENT MODAL (Supports Full & Partial Payments) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !isSubmittingRepay && setIsPaymentModalOpen(false)}
        title={`Record Repayment • ${selectedCustomer?.name || selectedCustomer?.full_name}`}
        description={`Current Outstanding Balance: ${formatPaise(
          selectedCustomer?.outstanding_balance_paise ?? selectedCustomer?.total_outstanding_paise ?? 0
        )}`}
      >
        {selectedCustomer && (
          <form onSubmit={handleRecordRepayment} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Payment Amount Received (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={repayAmountRupees}
                onChange={(e) => setRepayAmountRupees(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <div className="flex gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setRepayAmountRupees(
                      (
                        (selectedCustomer.outstanding_balance_paise ??
                          selectedCustomer.total_outstanding_paise ??
                          0) /
                        100
                      ).toString()
                    )
                  }
                  className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground"
                >
                  Full Clearance
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRepayAmountRupees(
                      (
                        Math.round(
                          (selectedCustomer.outstanding_balance_paise ??
                            selectedCustomer.total_outstanding_paise ??
                            0) / 200
                        )
                      ).toString()
                    )
                  }
                  className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground"
                >
                  50% Partial Payment
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Payment Method Received
              </label>
              <select
                value={repayMethod}
                onChange={(e) => setRepayMethod(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Receipt Note / Reference
              </label>
              <input
                type="text"
                value={repayNote}
                onChange={(e) => setRepayNote(e.target.value)}
                placeholder="e.g. Cleared via GPay transaction #9821"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmittingRepay}
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmittingRepay} className="font-bold">
                {isSubmittingRepay ? "Recording..." : `Confirm Payment of ₹${repayAmountRupees || "0"}`}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CUSTOMER STATEMENT MODAL */}
      <Modal
        isOpen={!!statementCustomer}
        onClose={() => setStatementCustomer(null)}
        title={`Account Statement • ${statementCustomer?.name || statementCustomer?.full_name}`}
        maxWidth="lg"
      >
        {statementCustomer && (
          <div className="space-y-4 pt-1 font-mono text-xs">
            {/* Printable Statement Container */}
            <div id="customer-statement-print" className="p-4 rounded-xl border border-border/80 bg-background space-y-3">
              <div className="text-center border-b border-border/60 pb-3">
                <h3 className="text-base font-bold text-foreground font-sans uppercase">
                  {activeShop.name}
                </h3>
                <p className="text-[11px] text-muted-foreground font-sans">
                  Khata Ledger Statement • As of {new Date().toLocaleDateString()}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40 font-sans">
                  <span>Customer: <strong className="text-foreground">{statementCustomer.name || statementCustomer.full_name}</strong></span>
                  <span>Phone: {statementCustomer.phone}</span>
                </div>
              </div>

              {/* Transactions Timeline */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="text-left py-1.5">Date</th>
                    <th className="text-left py-1.5">Details</th>
                    <th className="text-right py-1.5">Debit (+)</th>
                    <th className="text-right py-1.5">Credit (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {statementEntries.map((e, idx) => {
                    const isDebit = e.type === "BILL" || e.type === "PURCHASE_CREDIT";
                    return (
                      <tr key={idx}>
                        <td className="py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="py-2 text-foreground">{e.note}</td>
                        <td className="py-2 text-right text-rose-500 font-bold">
                          {isDebit ? formatPaise(e.amount) : "—"}
                        </td>
                        <td className="py-2 text-right text-emerald-500 font-bold">
                          {!isDebit ? formatPaise(e.amount) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Outstanding Summary */}
              <div className="border-t border-border/60 pt-2 flex justify-between font-bold text-sm">
                <span>Net Outstanding Due:</span>
                <span className="text-rose-500 font-bold">
                  {formatPaise(statementCustomer.outstanding_balance_paise ?? statementCustomer.total_outstanding_paise ?? 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStatementCustomer(null)}>
                Close
              </Button>
              <Button
                variant="default"
                className="gap-2 font-bold"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print Statement
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QUICK NEW CUSTOMER MODAL */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="Add Customer for Khata Credit"
        description="Assign authorized credit ceiling and contact mobile for WhatsApp billing."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3.5 pt-2 text-xs">
          <div>
            <label className="font-semibold text-foreground mb-1 block">Full Name *</label>
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
            <label className="font-semibold text-foreground mb-1 block">Phone / Mobile (WhatsApp) *</label>
            <input
              type="tel"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="font-semibold text-foreground mb-1 block">Authorized Credit Limit (₹) *</label>
            <input
              type="number"
              value={newCustLimitRupees}
              onChange={(e) => setNewCustLimitRupees(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsAddCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="font-bold">
              Register Khata Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
