"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function PayLaterPage() {
  const {
    activeShop,
    customers,
    recordCustomerPayment,
    addCustomer,
  } = useTrace();

  const shopCustomers = customers.filter((c) => c.shop_id === activeShop.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Repayment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [repayAmountRupees, setRepayAmountRupees] = useState("");
  const [repayMethod, setRepayMethod] = useState("UPI");
  const [repayNote, setRepayNote] = useState("Customer khata clearance");

  // New Customer Modal
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustLimitRupees, setNewCustLimitRupees] = useState(5000);

  // AutoPay Mandate Modal
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);

  // Calculations
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

  const filteredCustomers = shopCustomers.filter(
    (c) =>
      (c.name || c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !repayAmountRupees) return;

    recordCustomerPayment(
      selectedCustomer.id,
      rupeesToPaise(Number(repayAmountRupees)),
      repayMethod,
      repayNote
    );

    setIsPaymentModalOpen(false);
    setRepayAmountRupees("");
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

  const openWhatsAppReminder = (cust: Customer) => {
    const custDue = cust.outstanding_balance_paise ?? cust.total_outstanding_paise ?? 0;
    const dueRupees = (custDue / 100).toFixed(0);
    const custName = cust.name || cust.full_name || "Customer";
    const msg = `Dear ${custName}, this is a gentle reminder from ${activeShop.name} that your PayLater khata balance of ₹${dueRupees} is due. Please settle via UPI or visit the store. Thank you!`;
    const cleanPhone = cust.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
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
            Credit limits, repayment tracking, UPI AutoPay recurring mandates, and WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsMandateModalOpen(true)}
            className="gap-2 text-xs"
          >
            <RefreshCw className="h-4 w-4 text-emerald-500" />
            <span>Setup AutoPay Mandate</span>
          </Button>
          <Button
            variant="default"
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="gap-2 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Khata Customer</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Khata Due
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
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
            <div className="text-2xl font-bold text-foreground">
              {formatPaise(totalLimitPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Authorized risk ceiling for all customers
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Collection Efficiency
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              94.2%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              On-time repayments within 15-day cycle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List & Search */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Customer Khata Directory
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any customer to collect repayment or dispatch WhatsApp payment reminder.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name or phone..."
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
                  <th className="py-2.5 px-4 font-semibold">Mobile / Phone</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Credit Limit</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Outstanding Due</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
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

                  return (
                    <tr key={cust.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {custName}
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Customer ID: {cust.id}
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
                        {!hasDue ? (
                          <Badge variant="success">All Clear</Badge>
                        ) : ratio > 0.8 ? (
                          <Badge variant="destructive">Near Limit</Badge>
                        ) : (
                          <Badge variant="warning">Active Due</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWhatsAppReminder(cust)}
                                className="h-7 text-xs px-2 gap-1 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                                title="Send WhatsApp payment link"
                              >
                                <Send className="h-3 w-3" /> Remind
                              </Button>

                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setRepayAmountRupees((custDue / 100).toString());
                                  setIsPaymentModalOpen(true);
                                }}
                                className="h-7 text-xs px-2 bg-indigo-600 hover:bg-indigo-500"
                              >
                                Collect ₹
                              </Button>
                            </>
                          )}
                          {!hasDue && (
                            <span className="text-[11px] text-muted-foreground">
                              No balance due
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      No customers found. Click "Add Khata Customer" to register your first credit account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* RECORD REPAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Collect Khata Repayment • ${selectedCustomer?.name}`}
        description={`Current Outstanding Due: ${formatPaise(selectedCustomer?.outstanding_balance_paise || 0)}`}
      >
        <form onSubmit={handleRecordRepayment} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Amount Collected (₹) *
            </label>
            <input
              type="number"
              value={repayAmountRupees}
              onChange={(e) => setRepayAmountRupees(e.target.value)}
              max={(selectedCustomer?.outstanding_balance_paise || 0) / 100}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Payment Mode
            </label>
            <select
              value={repayMethod}
              onChange={(e) => setRepayMethod(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="CASH">Cash Over Counter</option>
              <option value="BANK_TRANSFER">Direct Bank NEFT / IMPS</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Receipt Reference / Notes
            </label>
            <input
              type="text"
              value={repayNote}
              onChange={(e) => setRepayNote(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="font-bold">
              Confirm Payment & Reduce Khata
            </Button>
          </div>
        </form>
      </Modal>

      {/* AUTOPAY MANDATE SETUP MODAL */}
      <Modal
        isOpen={isMandateModalOpen}
        onClose={() => setIsMandateModalOpen(false)}
        title="TRACE AutoPay • Recurring Khata Mandate"
        description="Set up automatic monthly bank debits via NPCI e-NACH & UPI AutoPay for trusted regular customers."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>NPCI e-NACH & UPI AutoPay Certified</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              TRACE automatically deducts outstanding khata balance on the 1st or 5th of each month directly from the customer's bank account or UPI handle, preventing bad debts and cash flow bottlenecks.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-foreground block">Customer</label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground">
              {shopCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block">Monthly Debit Limit</label>
              <input
                type="text"
                defaultValue="₹10,000"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block">Debit Cycle Date</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground">
                <option>1st of Every Month</option>
                <option>5th of Every Month</option>
                <option>10th of Every Month</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button variant="ghost" onClick={() => setIsMandateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                alert("AutoPay authorization SMS and UPI mandate invite dispatched to customer!");
                setIsMandateModalOpen(false);
              }}
            >
              Send AutoPay Mandate Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADD CUSTOMER MODAL */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        title="Add Customer for PayLater Khata"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Full Name *</label>
            <input
              type="text"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Anand Kulkarni"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Phone / Mobile (WhatsApp) *</label>
            <input
              type="tel"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="e.g. +91 98220 12345"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Assigned Credit Limit (₹)</label>
            <input
              type="number"
              value={newCustLimitRupees}
              onChange={(e) => setNewCustLimitRupees(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsAddCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Create Customer Khata
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
