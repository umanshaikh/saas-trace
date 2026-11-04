"use client";

import React, { useState } from "react";
import { useTrace } from "@/context/TraceContext";
import { Customer } from "@/lib/types";
import { formatPaise, rupeesToPaise } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  Phone,
  CreditCard,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";

export default function CustomersPage() {
  const { activeShop, customers, invoices, addCustomer } = useTrace();
  const shopCustomers = customers.filter((c) => c.shop_id === activeShop.id);
  const shopInvoices = invoices.filter((i) => i.shop_id === activeShop.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState(5000);

  const filteredCustomers = shopCustomers.filter(
    (c) =>
      (c.name || c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      credit_limit_paise: rupeesToPaise(Number(creditLimit)),
      outstanding_balance_paise: 0,
    });

    setIsAddModalOpen(false);
    setName("");
    setPhone("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            Customer Directory & Khata Profiles
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage repeat patrons, loyalty records, PayLater credit allowances, and contact details.
          </p>
        </div>

        <Button
          variant="default"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 text-xs shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customer by full name or mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Mobile Number</th>
                  <th className="py-3 px-4 font-semibold text-right">Credit Limit</th>
                  <th className="py-3 px-4 font-semibold text-right">Khata Due</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredCustomers.map((cust) => {
                  const hasDue = (cust.outstanding_balance_paise || 0) > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-foreground text-sm">{cust.name || cust.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {cust.id}</p>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {cust.phone}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {formatPaise(cust.credit_limit_paise || 500000)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={hasDue ? "text-rose-500 text-sm" : "text-muted-foreground"}>
                          {formatPaise(cust.outstanding_balance_paise ?? cust.total_outstanding_paise ?? 0)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {hasDue ? (
                          <Badge variant="warning">Active Due</Badge>
                        ) : (
                          <Badge variant="success">All Clear</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link href="/paylater">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-500">
                            Khata Details <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      No customers found. Click "Add New Customer" to register your store's patrons.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ADD CUSTOMER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer Profile"
        description="Register a regular customer for PayLater credit and fast POS billing."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Suresh Kumar"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Phone / Mobile (WhatsApp) *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98111 22334"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">PayLater Credit Limit (₹)</label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
