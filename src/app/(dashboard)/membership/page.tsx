"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTrace } from "@/context/TraceContext";
import { formatPaise } from "@/lib/utils";
import {
  Zap,
  Check,
  ShieldCheck,
  Receipt,
  Download,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Building2,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  Calendar,
  Lock,
  ChevronRight,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export default function MyMembershipPage() {
  const router = useRouter();
  const { activeShop, activeSubscription, subscriptionPlans, userRole, products, employees } = useTrace();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (
      activeShop.access_status === "PENDING_APPROVAL" ||
      activeShop.access_status === "REJECTED" ||
      activeShop.access_status === "INFO_REQUESTED"
    ) {
      router.replace("/registration-status");
    }
  }, [activeShop.access_status, router]);

  const plan =
    activeSubscription?.plan ||
    subscriptionPlans.find((p) => p.id === activeSubscription?.plan_id) ||
    subscriptionPlans[0];

  const now = Date.now();
  const expiryDate = activeSubscription?.current_period_ends_at
    ? new Date(activeSubscription.current_period_ends_at)
    : new Date();
  const startDate = activeSubscription?.starts_at
    ? new Date(activeSubscription.starts_at)
    : new Date();

  const diffMs = expiryDate.getTime() - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const totalDurationDays = Math.max(1, Math.ceil((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysRemaining / totalDurationDays) * 100)));

  const isSubActive =
    activeSubscription &&
    activeSubscription.status === "ACTIVE" &&
    diffMs > 0;

  const isExpired = activeSubscription?.status === "EXPIRED" || diffMs <= 0;

  // Fetch real invoices
  const loadBillingHistory = async () => {
    setIsLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from("subscription_invoices")
        .select("*")
        .eq("shop_id", activeShop.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setInvoices(data);
      } else {
        setInvoices([]);
      }
    } catch (e) {
      console.warn("Failed to load invoices:", e);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadBillingHistory();
  }, [activeShop.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-indigo-500" />
              My TRACE Membership
            </h1>
            <Badge
              variant={isSubActive ? "success" : isExpired ? "destructive" : "warning"}
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5"
            >
              {isSubActive ? "ACTIVE" : isExpired ? "EXPIRED" : activeSubscription?.status || "PENDING"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your store license, review remaining validity, view official GST tax receipts, and upgrade features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push("/subscriptions")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-1.5"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Membership Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Plan Details & Progress */}
        <Card className="lg:col-span-2 border-border/70 rounded-2xl bg-gradient-to-br from-card via-card to-indigo-950/20 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">{plan.name}</h2>
                    {plan.id === "pro" && (
                      <Badge className="bg-indigo-600 text-white text-[9px] font-black uppercase">
                        Recommended Tier
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-foreground">
                  {formatPaise(
                    activeSubscription?.billing_cycle === "YEARLY"
                      ? plan.yearly_price_paise
                      : plan.monthly_price_paise
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground font-semibold">
                  Billed {activeSubscription?.billing_cycle || "MONTHLY"}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6 text-xs">
            {/* Countdown Banner */}
            <div className="p-4 rounded-2xl border border-indigo-500/20 bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  Membership Validity Countdown:
                </span>
                <span
                  className={`text-sm font-black ${
                    daysRemaining <= 2
                      ? "text-rose-400 animate-pulse"
                      : daysRemaining <= 5
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {isSubActive ? `${daysRemaining} Days Remaining` : "Subscription Ended"}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    daysRemaining <= 2
                      ? "bg-rose-500"
                      : daysRemaining <= 5
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-emerald-500 to-indigo-500"
                  }`}
                  style={{ width: `${isSubActive ? progressPercent : 0}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                <span>Activated: {startDate.toLocaleDateString()}</span>
                <span>Expires: {expiryDate.toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick Metrics & Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Status</span>
                <p className="font-black text-sm text-foreground">{activeSubscription?.status || "PENDING"}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Auto-Renewal</span>
                <p className="font-black text-sm text-foreground">
                  {activeSubscription?.cancel_at_period_end ? "Disabled" : "Active"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Store Outlet</span>
                <p className="font-black text-sm text-foreground truncate">{activeShop.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Billing Cycle</span>
                <p className="font-black text-sm text-foreground">{activeSubscription?.billing_cycle || "MONTHLY"}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground">
                Renewals extend existing expiry dates automatically with zero loss of remaining days.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="default"
                  onClick={() => router.push("/subscriptions?renew=true")}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Renew Membership
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/subscriptions")}
                  className="w-full sm:w-auto text-xs font-semibold rounded-xl"
                >
                  Change Tier
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Col: Plan Features & Limits */}
        <Card className="border-border/70 rounded-2xl bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Included Tier Capabilities
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Features currently enabled for your retail counter</p>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Products in Catalog:</span>
                <span className="font-bold text-foreground">
                  {products.length} / {plan.max_products.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(100, (products.length / plan.max_products) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cashiers & Staff Logins:</span>
                <span className="font-bold text-foreground">
                  {employees.length} / {plan.max_team_members}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/40 text-[11px]">
              <div className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Offline POS & Thermal Printing</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>PayLater Khata Credit Ledger</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                {plan.has_ai_assistant ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="font-bold text-indigo-400">TRACE AI Assistant Active</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="text-muted-foreground/60">TRACE AI Assistant (Pro Tier)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                {plan.has_multi_branch ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-purple-400" />
                    <span className="font-bold text-purple-400">Multi-Branch Outlets</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="text-muted-foreground/60">Multi-Branch Chain Sync (Enterprise)</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Transaction History Table */}
      <Card className="border-border/70 rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Payment History & GST Tax Invoices
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified payment receipts and downloadable GST tax invoices for this shop.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadBillingHistory}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingInvoices ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-3 px-5 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Membership Plan</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {invoices.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-foreground">
                      {item.invoice_number || item.id}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {item.plan_name ||
                        (item.plan_id === "enterprise"
                          ? "Enterprise Plan"
                          : item.plan_id === "pro"
                          ? "Professional Plan"
                          : "Starter Plan")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                      {formatPaise(item.amount_paise)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="success" className="text-[10px] font-bold">
                        {item.payment_status || "PAID"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.print()}
                        className="h-7 text-xs text-indigo-400 hover:text-indigo-300 gap-1 font-semibold"
                      >
                        <Download className="h-3 w-3" /> PDF Receipt
                      </Button>
                    </td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                      No invoices recorded yet. Invoices appear automatically upon verified plan purchase or renewal.
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
