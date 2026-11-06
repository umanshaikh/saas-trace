"use client";

import React, { useState, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import { formatPaise } from "@/lib/utils";
import {
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit,
  History,
  TrendingUp,
  Receipt,
  Check,
  XCircle,
  AlertCircle,
  Sliders,
  DollarSign,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/lib/supabase/client";

export default function AdminSubscriptionsPage() {
  const {
    allShops,
    currentUser,
    userRole,
    subscriptionPlans,
    allSubscriptions,
    superAdminUpdateSubscription,
  } = useTrace();

  const [activeTab, setActiveTab] = useState<"SHOPS" | "PAYMENTS" | "PLANS" | "AUDIT">("SHOPS");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Platform state
  const [dbShops, setDbShops] = useState<any[]>([]);
  const [dbSubscriptions, setDbSubscriptions] = useState<any[]>([]);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [dbAuditLogs, setDbAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    activeSubscribers: 0,
    pendingSubscribers: 0,
    expiredSubscribers: 0,
    cancelledSubscribers: 0,
    totalShops: 0,
    totalRevenuePaise: 0,
    mrrPaise: 0,
  });

  // Modal State for Manual Override
  const [selectedShopForOverride, setSelectedShopForOverride] = useState<any | null>(null);
  const [overrideAction, setOverrideAction] = useState<"ACTIVATE" | "EXTEND" | "CHANGE_PLAN" | "CANCEL">("ACTIVATE");
  const [overridePlanId, setOverridePlanId] = useState("pro");
  const [overrideDays, setOverrideDays] = useState(30);
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Fetch admin data
  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        headers: {
          "x-super-admin-key": "trace_super_admin_secret_key_2026",
          "x-user-role": userRole,
          "x-user-email": currentUser.email,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setDbShops(data.shops || []);
        setDbSubscriptions(data.subscriptions || []);
        setDbTransactions(data.transactions || []);
        setDbAuditLogs(data.auditLogs || []);
      } else {
        // Fallback to local state if offline or API returns restricted
        fallbackLocalMetrics();
      }
    } catch (e) {
      console.warn("Failed to load admin API data, using synchronized fallback:", e);
      fallbackLocalMetrics();
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackLocalMetrics = () => {
    setDbShops(allShops);
    const subList = Object.values(allSubscriptions);
    const active = subList.filter((s) => s.status === "ACTIVE").length;
    const pending = subList.filter((s) => s.status === "PENDING").length;
    const expired = subList.filter((s) => s.status === "EXPIRED").length;
    const cancelled = subList.filter((s) => s.status === "CANCELLED").length;

    setMetrics({
      activeSubscribers: active,
      pendingSubscribers: pending,
      expiredSubscribers: expired,
      cancelledSubscribers: cancelled,
      totalShops: allShops.length,
      totalRevenuePaise: active * 19900,
      mrrPaise: active * 19900,
    });
  };

  useEffect(() => {
    fetchAdminData();
  }, [allShops.length]);

  // Combine shops with their subscription info
  const combinedShopList = (dbShops.length > 0 ? dbShops : allShops).map((shop) => {
    const sub =
      dbSubscriptions.find((s) => s.shop_id === shop.id) ||
      allSubscriptions[shop.id] || {
        status: shop.id.startsWith("shop_0") || shop.id === "shop_default" ? "ACTIVE" : "PENDING",
        plan_id: "starter",
        current_period_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      };

    return {
      ...shop,
      subscription: sub,
    };
  });

  const filteredShops = combinedShopList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || item.subscription?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle Manual Override Submit
  const handleExecuteOverride = async () => {
    if (!selectedShopForOverride || !overrideReason.trim()) {
      alert("Please provide a mandatory audit reason for this manual subscription action.");
      return;
    }

    setIsSubmittingOverride(true);
    setActionSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-key": "trace_super_admin_secret_key_2026",
          "x-user-email": currentUser.email,
        },
        body: JSON.stringify({
          shopId: selectedShopForOverride.id,
          action: overrideAction,
          planId: overridePlanId,
          extendDays: Number(overrideDays),
          reason: overrideReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute override action.");
      }

      // Also update local context
      superAdminUpdateSubscription(
        selectedShopForOverride.id,
        overridePlanId,
        "MONTHLY",
        Number(overrideDays)
      );

      setActionSuccessMessage(`Successfully executed ${overrideAction} for shop "${selectedShopForOverride.name}"!`);
      setTimeout(() => {
        setSelectedShopForOverride(null);
        setOverrideReason("");
        setActionSuccessMessage(null);
        fetchAdminData();
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Failed to execute manual subscription override.");
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Platform Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-indigo-500" />
              TRACE Platform Administration
            </h1>
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
              Super Admin Mode
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Supervise registered merchant tenants, subscription lifecycles, gateway revenues, and audit manual overrides.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAdminData}
          className="self-start sm:self-auto h-8 text-xs font-semibold gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Platform Metrics</span>
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Monthly Recurring Revenue
              </p>
              <h3 className="text-2xl font-black text-foreground">
                {formatPaise(metrics.mrrPaise)}
              </h3>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Live Run-Rate
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Paid Subscribers
              </p>
              <h3 className="text-2xl font-black text-emerald-400">
                {metrics.activeSubscribers}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Out of {metrics.totalShops} registered shops
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pending / Unpaid Shops
              </p>
              <h3 className="text-2xl font-black text-amber-400">
                {metrics.pendingSubscribers}
              </h3>
              <p className="text-[10px] text-amber-400/80 font-medium">
                Awaiting plan purchase
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Expired / Inactive
              </p>
              <h3 className="text-2xl font-black text-rose-400">
                {metrics.expiredSubscribers + metrics.cancelledSubscribers}
              </h3>
              <p className="text-[10px] text-rose-400/80 font-medium">
                {metrics.expiredSubscribers} expired, {metrics.cancelledSubscribers} cancelled
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-2">
        {[
          { id: "SHOPS", label: "Shops & Memberships", icon: Building2 },
          { id: "PAYMENTS", label: "Payment Transactions", icon: CreditCard },
          { id: "PLANS", label: "Membership Plans", icon: Sliders },
          { id: "AUDIT", label: "Audit Logs", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isSel
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHOPS & MEMBERSHIPS */}
      {activeTab === "SHOPS" && (
        <Card className="border-border/70 rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search shops by name, city, owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-muted text-xs rounded-lg px-2.5 py-1.5 border border-border/60 text-foreground outline-none font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-3 px-5 font-bold">Shop & Location</th>
                    <th className="py-3 px-4 font-bold">Owner Email</th>
                    <th className="py-3 px-4 font-bold">Plan Tier</th>
                    <th className="py-3 px-4 font-bold text-center">Subscription Status</th>
                    <th className="py-3 px-4 font-bold">Valid Until</th>
                    <th className="py-3 px-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredShops.map((shop) => {
                    const status = shop.subscription?.status || "PENDING";
                    const isExp =
                      shop.subscription?.current_period_ends_at &&
                      new Date(shop.subscription.current_period_ends_at).getTime() < Date.now();

                    const displayStatus = status === "ACTIVE" && isExp ? "EXPIRED" : status;

                    return (
                      <tr key={shop.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-foreground text-sm">{shop.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {shop.city || "Mumbai"}, {shop.state || "Maharashtra"} • ID: {shop.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {shop.email || "merchant@trace.business"}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="brand" className="text-[10px] font-extrabold uppercase">
                            {shop.subscription?.plan_id || "starter"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant={
                              displayStatus === "ACTIVE"
                                ? "success"
                                : displayStatus === "PENDING"
                                ? "warning"
                                : "destructive"
                            }
                            className="text-[10px] font-black uppercase"
                          >
                            {displayStatus}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {shop.subscription?.current_period_ends_at
                            ? new Date(shop.subscription.current_period_ends_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedShopForOverride(shop);
                              setOverridePlanId(shop.subscription?.plan_id || "pro");
                              setOverrideAction("ACTIVATE");
                              setOverrideReason("");
                            }}
                            className="h-7 text-xs font-bold gap-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Manage</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredShops.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                        No shops match the current search or status filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: PAYMENT TRANSACTIONS */}
      {activeTab === "PAYMENTS" && (
        <Card className="border-border/70 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-500" />
              Gateway Payment Transactions & Audit History
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Every checkout order, webhook capture, and transaction receipt recorded in TRACE database.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-3 px-5 font-bold">Transaction / Order ID</th>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                    <th className="py-3 px-4 font-bold">Gateway</th>
                    <th className="py-3 px-4 font-bold text-right">Amount</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                    <th className="py-3 px-5 font-bold">Idempotency Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {dbTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-foreground">{tx.id}</div>
                        <div className="text-[10px] text-muted-foreground">{tx.gateway_order_id || "Direct Gateway"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-sans">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-semibold text-foreground">
                        {tx.payment_method || "UPI"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {formatPaise(tx.amount_paise)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <Badge
                          variant={tx.status === "SUCCESS" ? "success" : tx.status === "PENDING" ? "warning" : "destructive"}
                          className="text-[10px] font-bold"
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-muted-foreground text-[10px]">
                        {tx.idempotency_key ? `${tx.idempotency_key.substring(0, 16)}...` : "—"}
                      </td>
                    </tr>
                  ))}

                  {dbTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-sans text-muted-foreground">
                        No transactions recorded yet in payment gateway ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: MEMBERSHIP PLANS */}
      {activeTab === "PLANS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {subscriptionPlans.map((plan) => (
            <Card key={plan.id} className="border-border/70 rounded-2xl bg-card">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" className="text-[10px] uppercase font-bold">
                    {plan.id}
                  </Badge>
                  <Badge variant={plan.is_active ? "success" : "secondary"} className="text-[10px]">
                    {plan.is_active ? "ACTIVE CATALOG" : "INACTIVE"}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monthly Fee:</span>
                  <span className="font-bold text-foreground">{formatPaise(plan.monthly_price_paise)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Yearly Fee:</span>
                  <span className="font-bold text-foreground">{formatPaise(plan.yearly_price_paise)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Catalog Max Products:</span>
                  <span className="font-bold text-foreground">{plan.max_products.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Staff Logins:</span>
                  <span className="font-bold text-foreground">{plan.max_team_members}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">AI Voice Assistant:</span>
                  <span className="font-bold text-foreground">{plan.has_ai_assistant ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Multi-Branch Outlets:</span>
                  <span className="font-bold text-foreground">{plan.has_multi_branch ? "Enabled" : "Single Outlet"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "AUDIT" && (
        <Card className="border-border/70 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" />
              Administrative Subscription Audit Logs
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Statutory record of every manual plan change, complimentary extension, or admin cancellation.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-3 px-5 font-bold">Timestamp</th>
                    <th className="py-3 px-4 font-bold">Admin Email</th>
                    <th className="py-3 px-4 font-bold">Target Shop</th>
                    <th className="py-3 px-4 font-bold text-center">Action</th>
                    <th className="py-3 px-5 font-bold">Mandatory Audit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {dbAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-semibold">
                        {log.admin_email}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                        {log.shop_id.substring(0, 10)}...
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="brand" className="text-[10px] font-extrabold uppercase">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-foreground">
                        {log.reason}
                      </td>
                    </tr>
                  ))}

                  {dbAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                        No manual admin overrides have been performed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: MANUAL SUBSCRIPTION OVERRIDE */}
      <Modal
        isOpen={!!selectedShopForOverride}
        onClose={() => !isSubmittingOverride && setSelectedShopForOverride(null)}
        title={`Manage Subscription: ${selectedShopForOverride?.name}`}
        description="Manually override or extend merchant subscription with mandatory audit reason logging."
      >
        {selectedShopForOverride && (
          <div className="space-y-4 pt-2 text-xs">
            {actionSuccessMessage && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl border border-border/60 bg-accent/20 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shop ID:</span>
                <span className="font-mono text-foreground font-bold">{selectedShopForOverride.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="brand" className="text-[10px]">
                  {selectedShopForOverride.subscription?.status || "PENDING"}
                </Badge>
              </div>
            </div>

            {/* Select Action */}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Administrative Action</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "ACTIVATE", label: "Activate / Unlock" },
                  { id: "EXTEND", label: "Extend Validity" },
                  { id: "CHANGE_PLAN", label: "Switch Plan Tier" },
                  { id: "CANCEL", label: "Cancel Subscription" },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setOverrideAction(act.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      overrideAction === act.id
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-border/60 bg-muted/30 text-foreground hover:bg-muted"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Tier */}
            {(overrideAction === "ACTIVATE" || overrideAction === "CHANGE_PLAN") && (
              <div className="space-y-1">
                <label className="font-bold text-foreground">Select Membership Tier</label>
                <select
                  value={overridePlanId}
                  onChange={(e) => setOverridePlanId(e.target.value)}
                  className="w-full bg-muted border border-border/70 rounded-xl px-3 py-2 text-foreground font-medium outline-none"
                >
                  <option value="starter">Starter Plan (₹99 / mo)</option>
                  <option value="pro">TRACE Pro (₹199 / mo)</option>
                  <option value="enterprise">Enterprise Plan (₹499 / mo)</option>
                </select>
              </div>
            )}

            {/* Extend Days */}
            {(overrideAction === "ACTIVATE" || overrideAction === "EXTEND") && (
              <div className="space-y-1">
                <label className="font-bold text-foreground">Validity Days to Grant</label>
                <select
                  value={overrideDays}
                  onChange={(e) => setOverrideDays(Number(e.target.value))}
                  className="w-full bg-muted border border-border/70 rounded-xl px-3 py-2 text-foreground font-medium outline-none"
                >
                  <option value={7}>7 Days (Trial / Grace Extension)</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (Quarterly)</option>
                  <option value={365}>365 Days (1 Full Year)</option>
                </select>
              </div>
            )}

            {/* Mandatory Reason */}
            <div className="space-y-1">
              <label className="font-bold text-foreground flex items-center justify-between">
                <span>Reason for Administrative Action (Mandatory Audit Log)</span>
                <span className="text-[10px] text-amber-400 font-normal">* Required</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Granted 30 days complimentary access for high-volume pilot merchant in Pune Central Market..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full bg-muted border border-border/70 rounded-xl p-3 text-foreground font-medium outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                variant="ghost"
                disabled={isSubmittingOverride}
                onClick={() => setSelectedShopForOverride(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                disabled={isSubmittingOverride || !overrideReason.trim()}
                onClick={handleExecuteOverride}
                className="font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSubmittingOverride ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Executing Override...</span>
                  </>
                ) : (
                  <span>Commit Override & Log Audit</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
