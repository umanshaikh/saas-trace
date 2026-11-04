"use client";

import React, { useState } from "react";
import { useTrace } from "@/context/TraceContext";
import { Expense } from "@/lib/types";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  Receipt,
  Plus,
  Search,
  IndianRupee,
  TrendingDown,
  PieChart,
  Tag,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function ExpensesPage() {
  const { activeShop, expenses, addExpense, invoices } = useTrace();
  const shopExpenses = expenses.filter((e) => e.shop_id === activeShop.id);
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("UTILITIES");
  const [expenseRupees, setExpenseRupees] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("CASH");
  const [expenseNotes, setExpenseNotes] = useState("");

  // Financial calculations
  const totalExpensesPaise = shopExpenses.reduce((s, e) => s + e.amount_paise, 0);
  const totalSalesPaise = shopInvoices.reduce((s, i) => s + i.total_amount_paise, 0);
  const netProfitPaise = totalSalesPaise - totalExpensesPaise;

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseRupees) return;

    addExpense({
      title: expenseTitle.trim(),
      category: expenseCategory as any,
      amount_paise: rupeesToPaise(Number(expenseRupees)),
      payment_method: expensePaymentMethod as any,
      notes: expenseNotes,
    });

    setIsAddModalOpen(false);
    setExpenseTitle("");
    setExpenseRupees("");
    setExpenseNotes("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-500" />
            Shop Operational Expenses
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log overhead costs, utilities, inventory logistics, and monitor real daily net profits.
          </p>
        </div>

        <Button
          variant="default"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 text-xs shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Shop Expense</span>
        </Button>
      </div>

      {/* Expense KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Expenses Logged
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatPaise(totalExpensesPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Overhead & operations ledger
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Gross Shop Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatPaise(totalSalesPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total sales collected at counter
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Net Shop Profit Margin
            </CardTitle>
            <PieChart className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfitPaise >= 0 ? "text-indigo-400" : "text-rose-500"}`}>
              {formatPaise(netProfitPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sales minus recorded expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground">
            Expense Records
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed list of operational payouts and overhead receipts
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Expense Title</th>
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold">Payment Mode</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {shopExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-foreground text-sm">{exp.title}</p>
                      {exp.notes && (
                        <p className="text-[10px] text-muted-foreground">{exp.notes}</p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {exp.category}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(exp.expense_date || exp.incurred_date).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 font-semibold text-foreground">
                      {exp.payment_method}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-foreground font-mono text-sm">
                      {formatPaise(exp.amount_paise)}
                    </td>
                  </tr>
                ))}

                {shopExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      No expenses logged yet. Click "Add Shop Expense" to track overhead costs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ADD EXPENSE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Shop Expense"
        description="Log an operational, freight, or utility expense for accurate profit accounting."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Expense Title / Description *
            </label>
            <input
              type="text"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="e.g. Shop Electricity Bill - March"
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
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="RENT">Shop Rent</option>
                <option value="UTILITIES">Electricity / Water / Internet</option>
                <option value="SALARIES">Staff Salaries & Wages</option>
                <option value="FREIGHT">Logistics & Goods Freight</option>
                <option value="TEA_SNACKS">Staff Tea & Refreshments</option>
                <option value="PACKAGING">Bags & Packaging Materials</option>
                <option value="MAINTENANCE">Store Repairs & Maintenance</option>
                <option value="MISCELLANEOUS">Miscellaneous / Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseRupees}
                onChange={(e) => setExpenseRupees(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Paid Via
              </label>
              <select
                value={expensePaymentMethod}
                onChange={(e) => setExpensePaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="CASH">Cash from Drawer</option>
                <option value="UPI">UPI / Net Banking</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Notes / Bill No.
              </label>
              <input
                type="text"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="e.g. Receipt #8821"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
