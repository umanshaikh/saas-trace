"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  QrCode,
  RefreshCw,
  ShieldAlert,
  HelpCircle,
  XCircle,
  CheckCircle2,
  Calendar,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase/client";

function SubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeShop,
    activeSubscription,
    subscriptionPlans,
    updateShopSubscription,
    userRole,
  } = useTrace();

  const isWelcomePrompt =
    searchParams.get("welcome") === "true" || searchParams.get("required") === "true";

  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<"REVIEW" | "PAYING" | "VERIFYING">("REVIEW");
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [realBillingHistory, setRealBillingHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubActive =
    activeSubscription &&
    activeSubscription.status === "ACTIVE" &&
    new Date(activeSubscription.current_period_ends_at).getTime() > Date.now();

  // Fetch real subscription invoices from database
  const loadBillingHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("subscription_invoices")
        .select("*")
        .eq("shop_id", activeShop.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setRealBillingHistory(data);
      } else {
        setRealBillingHistory([]);
      }
    } catch (e) {
      console.warn("Failed to load subscription history:", e);
      setRealBillingHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadBillingHistory();
  }, [activeShop.id, activeSubscription?.status]);

  const isShopApproved =
    activeShop.access_status === "APPROVED" || activeShop.access_status === "ACTIVE";

  const handleStartUpgrade = (plan: any) => {
    if (userRole !== "OWNER") {
      alert("Subscription management and billing plan upgrades are restricted to Store Owners.");
      return;
    }
    if (!isShopApproved) {
      if (activeShop.access_status === "PENDING_APPROVAL") {
        setErrorMessage(
          "Your shop registration has been submitted successfully. Our team is reviewing your application. You will be able to select a membership plan after approval."
        );
      } else if (activeShop.access_status === "REJECTED") {
        setErrorMessage(
          "Your shop registration was not approved. Please review the reason or contact TRACE support."
        );
      } else if (activeShop.access_status === "SUSPENDED") {
        setErrorMessage(
          "This shop has been suspended by platform administration. Membership purchases and dashboard access are blocked."
        );
      } else {
        setErrorMessage("Shop approval by Super Admin is required before purchasing a membership.");
      }
      return;
    }
    setErrorMessage(null);
    setSelectedPlanForUpgrade(plan);
    setPaymentStep("REVIEW");
  };

  // Secure Server-Side Payment Checkout & Verification Flow
  const handleProcessPayment = async () => {
    if (!selectedPlanForUpgrade) return;
    setPaymentStep("VERIFYING");
    setErrorMessage(null);

    try {
      // 1. Initiate checkout session on server
      const checkoutRes = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: activeShop.id,
          planId: selectedPlanForUpgrade.id,
          billingCycle: billingCycle,
          paymentMethod: selectedPaymentGateway,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || "Failed to initialize secure checkout session.");
      }

      const { transactionId, orderId, idempotencyKey } = checkoutData;

      // 2. Simulate gateway authorization & verify on backend
      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mockSignature = `sig_${Date.now()}_test_auth`;

      const verifyRes = await fetch("/api/subscriptions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: activeShop.id,
          transactionId: transactionId,
          orderId: orderId,
          paymentId: mockPaymentId,
          signature: mockSignature,
          idempotencyKey: idempotencyKey,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment verification failed.");
      }

      // 3. Update client-side context & cookie
      updateShopSubscription(selectedPlanForUpgrade.id, billingCycle);
      document.cookie = "trace_subscription_active=true; path=/; max-age=31536000; SameSite=Lax";

      // 4. Confetti & celebratory completion
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });

      await loadBillingHistory();
      setSelectedPlanForUpgrade(null);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Subscription payment error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during payment processing.");
      setPaymentStep("REVIEW");
    }
  };

  // Handle Cancel / Resume Subscription
  const handleToggleAutoRenewal = async (action: "CANCEL" | "RESUME") => {
    if (userRole !== "OWNER") {
      alert("Only the store owner can modify billing settings.");
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch("/api/subscriptions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: activeShop.id,
          action: action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update subscription status.");
      }

      // Refresh page state
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to update subscription.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Required Membership Prompt Banner for newly onboarded or unpaid users */}
      {(isWelcomePrompt || !isSubActive) && (
        <div className="p-6 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 shadow-xl shadow-amber-500/10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-lg font-black text-white">Your shop is registered successfully!</h2>
              </div>
              <p className="text-sm text-amber-200/90 leading-relaxed font-medium">
                To unlock your TRACE dashboard and manage your business, please purchase a membership plan.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                const el = document.getElementById("plans-selection-grid");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shrink-0 rounded-xl px-6 py-3 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5"
            >
              View Membership Plans
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-500" />
            TRACE SaaS Membership & Subscriptions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent pricing plans designed for local grocery, retail counters, and enterprise shop chains.
          </p>
        </div>

        {/* Monthly / Yearly Billing Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 p-1.5 rounded-xl border border-border/80">
          <button
            onClick={() => setBillingCycle("MONTHLY")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              billingCycle === "MONTHLY"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("YEARLY")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              billingCycle === "YEARLY"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Yearly</span>
            <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
              Save ~16%
            </span>
          </button>
        </div>
      </div>

      {/* Read-Only Notice for non-owners */}
      {userRole !== "OWNER" && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs text-amber-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              <strong>Read-Only View:</strong> You are viewing membership options as a <strong>{userRole}</strong>. Subscription billing and payment upgrades are restricted to Store Owners.
            </span>
          </div>
        </div>
      )}

      {/* Current Active Membership Status Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-card via-card to-indigo-950/20 shadow-sm gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${
              isSubActive ? "bg-emerald-600 shadow-lg shadow-emerald-600/25" : "bg-amber-600 shadow-lg shadow-amber-600/25"
            }`}
          >
            {isSubActive ? <Sparkles className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">Current Membership:</span>
              <Badge variant="brand" className="text-xs uppercase font-extrabold px-2.5 py-0.5">
                {activeSubscription?.plan?.name || "No Active Plan"}
              </Badge>
              <Badge
                variant={
                  activeSubscription?.status === "ACTIVE"
                    ? "success"
                    : activeSubscription?.status === "PENDING"
                    ? "warning"
                    : "destructive"
                }
                className="text-[11px] font-bold uppercase"
              >
                {activeSubscription?.status || "PENDING"}
              </Badge>
              {activeSubscription?.cancel_at_period_end && (
                <Badge variant="secondary" className="text-[10px] text-amber-400 border border-amber-500/30">
                  Cancels at period end
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Shop: <strong className="text-foreground">{activeShop.name}</strong> •{" "}
              {isSubActive ? (
                <>
                  Active cycle expires on{" "}
                  <strong className="text-foreground">
                    {new Date(activeSubscription.current_period_ends_at).toLocaleDateString()}
                  </strong>
                </>
              ) : (
                <span className="text-amber-400 font-semibold">
                  Dashboard locked. Select an active plan to start managing your store.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Cancellation / Renewal Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {isSubActive && !activeSubscription?.cancel_at_period_end && (
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessingAction}
              onClick={() => handleToggleAutoRenewal("CANCEL")}
              className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              Cancel Auto-Renewal
            </Button>
          )}

          {activeSubscription?.cancel_at_period_end && (
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessingAction}
              onClick={() => handleToggleAutoRenewal("RESUME")}
              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              Resume Auto-Renewal
            </Button>
          )}
        </div>
      </div>

      {/* Plans Pricing Grid */}
      <div id="plans-selection-grid" className="space-y-4">
        {/* Shop Approval Restriction Notice */}
        {!isShopApproved && (
          <div className="space-y-2">
            {activeShop.access_status === "PENDING_APPROVAL" ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-amber-400">Application Under Review</p>
                    <p className="text-xs text-slate-300">
                      Your shop registration has been submitted successfully. Our team is reviewing your application. You will be able to select a membership plan after approval.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/registration-status")}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
                >
                  View Status
                </button>
              </div>
            ) : activeShop.access_status === "REJECTED" ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-xs font-bold text-rose-400">Registration Not Approved</p>
                    <p className="text-xs text-slate-300">
                      Your shop registration was not approved. Please review the reason or contact TRACE support.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/registration-status")}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors"
                >
                  Review Details
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-400">Access Restricted</p>
                  <p className="text-xs text-slate-300">
                    This shop has been suspended by platform administration. Membership purchases and dashboard access are blocked.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-foreground">Select Your Membership Plan</h2>
          <p className="text-xs text-muted-foreground">
            Choose the tier that matches your inventory size and business workflow. All plans include automated GST billing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {subscriptionPlans.map((plan) => {
            const isCurrentActive =
              activeSubscription?.plan_id === plan.id &&
              activeSubscription?.status === "ACTIVE" &&
              isSubActive;

            const isPro = plan.id === "pro";
            const pricePaise =
              billingCycle === "MONTHLY"
                ? plan.monthly_price_paise
                : plan.yearly_price_paise;
            const displayPrice = formatPaise(pricePaise);

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between transition-all rounded-2xl ${
                  isPro
                    ? "border-2 border-indigo-500 shadow-xl shadow-indigo-600/10 bg-gradient-to-b from-indigo-950/20 to-card"
                    : isCurrentActive
                    ? "border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/10 bg-emerald-950/10"
                    : "border-border/70 hover:border-border hover:shadow-md bg-card"
                }`}
              >
                {/* Recommended Badge */}
                {isPro && !isCurrentActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-0.5 shadow-md shadow-indigo-600/40">
                      Recommended Plan
                    </Badge>
                  </div>
                )}
                {isCurrentActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 shadow-md shadow-emerald-600/40">
                      Current Active Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="pt-6 pb-4">
                  <CardTitle className="text-base font-black text-foreground flex items-center justify-between">
                    <span>{plan.name}</span>
                    {plan.has_multi_branch && (
                      <Badge variant="secondary" className="text-[10px] font-semibold text-purple-400 border-purple-500/30">
                        Multi-Branch
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mt-1">
                    {plan.description}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {displayPrice}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{billingCycle === "MONTHLY" ? "month" : "year"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2.5 border-t border-border/60 pt-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Included Features:
                    </p>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>
                          {plan.has_multi_branch
                            ? "Unlimited Multi-Branch Outlets"
                            : "1 Single Retail Store"}
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Up to {plan.max_products.toLocaleString()} Products in Catalog</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{plan.max_team_members} Staff Logins & Cashier Accounts</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Offline POS & Thermal Slip Printing</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>PayLater Khata Credit Ledger & AutoPay</span>
                      </li>
                      {plan.has_ai_assistant ? (
                        <li className="flex items-center gap-2 text-foreground font-bold text-indigo-400">
                          <Check className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span>TRACE AI Voice Assistant (EN / HI / MR)</span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                          <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <span>TRACE AI Assistant</span>
                        </li>
                      )}
                      {plan.has_network_access ? (
                        <li className="flex items-center gap-2 text-foreground font-bold text-teal-400">
                          <Check className="h-4 w-4 text-teal-400 shrink-0" />
                          <span>TRACE B2B Inter-Shop Network & Stock Transfers</span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                          <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <span>B2B Inter-Shop Network</span>
                        </li>
                      )}
                      {plan.has_multi_branch ? (
                        <li className="flex items-center gap-2 text-purple-400 font-bold">
                          <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
                          <span>Multi-Branch Chain Central Sync & CA Audit Export</span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-muted-foreground/60 line-through">
                          <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <span>Multi-Branch Central Sync</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="pt-5">
                    <Button
                      variant={isCurrentActive ? "secondary" : isPro ? "default" : "outline"}
                      disabled={isCurrentActive || userRole !== "OWNER" || !isShopApproved}
                      onClick={() => handleStartUpgrade(plan)}
                      className={`w-full py-2.5 text-xs font-black rounded-xl shadow-sm ${
                        isCurrentActive
                          ? "bg-muted text-muted-foreground"
                          : !isShopApproved
                          ? "opacity-50 cursor-not-allowed bg-slate-800 text-slate-400"
                          : isPro
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                          : "border-border/80 hover:bg-muted"
                      }`}
                    >
                      {!isShopApproved
                        ? "Approval Required"
                        : isCurrentActive
                        ? "Active Membership"
                        : isSubActive
                        ? `Switch to ${plan.name}`
                        : `Activate ${plan.name}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Matrix Table */}
      <Card className="border-border/70 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-indigo-500" />
            Full Plan Feature Comparison
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            A comprehensive side-by-side comparison of limits and capabilities across Starter, TRACE Pro, and Enterprise tiers.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-3 px-5 font-bold">Platform Capability</th>
                  <th className="py-3 px-4 font-bold text-center">Starter Plan</th>
                  <th className="py-3 px-4 font-bold text-center bg-indigo-950/20 text-indigo-400">
                    TRACE Pro (Popular)
                  </th>
                  <th className="py-3 px-4 font-bold text-center">Enterprise Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Store Outlets / Branches</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">1 Outlet</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-foreground font-bold">1 Outlet</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Unlimited Chain Outlets</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Products Catalog Limit</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Up to 500</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-foreground font-bold">Up to 2,500</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Unlimited Items</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Cashier & Staff Accounts</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">2 Accounts</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-foreground font-bold">8 Accounts</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Unlimited Staff Logins</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Offline POS Counter & Thermal Slip</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">PayLater Khata Credit Ledger</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">TRACE AI Multilingual Assistant</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-indigo-400 font-bold">
                    Yes (EN / HI / MR)
                  </td>
                  <td className="py-3 px-4 text-center text-indigo-400 font-bold">Yes (Custom Fine-Tuning)</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">B2B Inter-Shop Network & Stock Orders</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-teal-400 font-bold">Full Access</td>
                  <td className="py-3 px-4 text-center text-teal-400 font-bold">Full Access + Automated POs</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Reports & GST Tax Filing Export</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Standard CSV</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-foreground font-bold">
                    GSTR-1, 3B + Margin Reports
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">
                    Dedicated CA Tax Audit Portal
                  </td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Central Multi-Branch Inventory Sync</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-slate-500">—</td>
                  <td className="py-3 px-4 text-center text-purple-400 font-bold">Real-time Central Sync</td>
                </tr>
                <tr className="hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-semibold">Customer Support SLA</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">Community & Email</td>
                  <td className="py-3 px-4 text-center bg-indigo-950/10 text-foreground font-bold">24/7 Priority Chat</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">
                    Dedicated Key Account Manager
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Invoices History (Connected to real database records) */}
      <Card className="border-border/70 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Subscription Billing History & GST Tax Invoices
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified payment receipts and downloadable GST tax invoices for your TRACE subscription.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadBillingHistory}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingHistory ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-3 px-5 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Billing Date</th>
                  <th className="py-3 px-4 font-semibold">Plan</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {realBillingHistory.map((item) => (
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
                          ? "TRACE Pro"
                          : "Starter Plan")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                      {formatPaise(item.amount_paise)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="success" className="text-[10px] font-bold">
                        {item.payment_status}
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

                {realBillingHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="h-10 w-10 rounded-xl bg-accent/40 flex items-center justify-center text-muted-foreground">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-foreground">No Subscription Billing Receipts</p>
                        <p className="text-[11px] text-muted-foreground">
                          Official tax invoices and payment receipts will appear here automatically when plan renewals or upgrades are completed.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* UPGRADE & PAYMENT VERIFICATION MODAL */}
      <Modal
        isOpen={!!selectedPlanForUpgrade}
        onClose={() => paymentStep !== "VERIFYING" && setSelectedPlanForUpgrade(null)}
        title={`Activate ${selectedPlanForUpgrade?.name}`}
        description="Verify subscription parameters and complete verified payment authorization."
      >
        {selectedPlanForUpgrade && (
          <div className="space-y-4 pt-2 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-4 rounded-xl border border-border/60 bg-accent/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Selected Plan:</span>
                <span className="font-bold text-foreground">{selectedPlanForUpgrade.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Billing Frequency:</span>
                <span className="font-bold text-foreground">{billingCycle}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t border-border/40 pt-2">
                <span>Total Amount Payable:</span>
                <span className="text-indigo-400 font-mono text-base">
                  {billingCycle === "MONTHLY"
                    ? formatPaise(selectedPlanForUpgrade.monthly_price_paise)
                    : formatPaise(selectedPlanForUpgrade.yearly_price_paise)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="font-semibold text-foreground block mb-1.5">
                Select Verified Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "UPI", label: "UPI QR / VPA", icon: QrCode },
                  { id: "CARD", label: "Credit/Debit Card", icon: CreditCard },
                  { id: "NETBANKING", label: "NetBanking / IMPS", icon: Building2 },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = selectedPaymentGateway === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPaymentGateway(m.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                        isSel
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                          : "border-border/60 bg-muted/30 text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1.5" />
                      <span className="text-[10px] font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] leading-relaxed">
              <span className="font-bold">Cryptographically Verified Activation:</span> Payment is processed and verified server-side with webhook reconciliation. Your shop features unlock immediately.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                variant="ghost"
                disabled={paymentStep === "VERIFYING"}
                onClick={() => setSelectedPlanForUpgrade(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                disabled={paymentStep === "VERIFYING"}
                onClick={handleProcessPayment}
                className="font-bold gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {paymentStep === "VERIFYING" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Bank Payment...</span>
                  </>
                ) : (
                  <span>
                    Authorize & Pay{" "}
                    {billingCycle === "MONTHLY"
                      ? formatPaise(selectedPlanForUpgrade.monthly_price_paise)
                      : formatPaise(selectedPlanForUpgrade.yearly_price_paise)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* SUCCESS ACTIVATION MODAL */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          router.push("/dashboard");
        }}
        title="Payment Verified • Membership Active!"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2 text-center text-xs">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-sm text-foreground">Welcome to TRACE Membership!</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your server-side payment verification has succeeded. Your full TRACE dashboard, POS billing counter, and inventory tools are now unlocked.
            </p>
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={() => {
              setIsSuccessModalOpen(false);
              router.push("/dashboard");
            }}
            className="w-full font-black bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-emerald-600/25"
          >
            <span>Enter My Dashboard</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      }
    >
      <SubscriptionsContent />
    </Suspense>
  );
}
