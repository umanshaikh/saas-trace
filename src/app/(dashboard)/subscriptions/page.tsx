"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import confetti from "canvas-confetti";

export default function SubscriptionsPage() {
  const {
    activeShop,
    activeSubscription,
    subscriptionPlans,
    updateShopSubscription,
    userRole,
  } = useTrace();

  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Billing history mock
  const billingHistory = [
    {
      id: "inv_sub_01",
      date: new Date().toLocaleDateString(),
      plan: activeSubscription?.plan?.name || "Pro Plan",
      amountPaise: activeSubscription?.plan?.monthly_price_paise || 19900,
      status: "PAID",
    },
    {
      id: "inv_sub_00",
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      plan: "Pro Plan",
      amountPaise: 19900,
      status: "PAID",
    },
  ];

  const handleConfirmUpgrade = () => {
    if (!selectedPlanForUpgrade) return;

    updateShopSubscription(selectedPlanForUpgrade.id, billingCycle);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    setSelectedPlanForUpgrade(null);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-500" />
            TRACE SaaS Software Subscriptions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent pricing plans designed for local grocery, retail, and enterprise shop networks.
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border/80">
          <button
            onClick={() => setBillingCycle("MONTHLY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === "MONTHLY"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("YEARLY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              billingCycle === "YEARLY"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Yearly</span>
            <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Current Active Plan Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-card via-card to-indigo-950/20 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Active Subscription:</span>
              <Badge variant="brand" className="text-xs uppercase font-extrabold">
                {activeSubscription?.plan?.name || "Pro Plan"}
              </Badge>
              <Badge variant="success" className="text-[10px]">
                {activeSubscription?.status || "ACTIVE"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shop: {activeShop.name} • Auto-renews on {new Date(activeSubscription?.current_period_ends_at || activeSubscription?.current_period_end || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Billing frequency: <span className="font-semibold text-foreground">{billingCycle}</span>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {subscriptionPlans.map((plan) => {
          const isCurrent = activeSubscription?.plan_id === plan.id;
          const pricePaise =
            billingCycle === "MONTHLY"
              ? plan.monthly_price_paise
              : plan.yearly_price_paise;
          const displayPrice = pricePaise === 0 ? "₹0" : formatPaise(pricePaise);

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between transition-all ${
                isCurrent
                  ? "border-2 border-indigo-600 shadow-lg shadow-indigo-600/10 bg-indigo-950/5"
                  : "border-border/60 hover:border-border"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="text-[10px] font-bold uppercase tracking-wider">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-6 pb-4">
                <CardTitle className="text-base font-bold text-foreground">
                  {plan.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {plan.description}
                </p>

                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-foreground">
                    {displayPrice}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    /{billingCycle === "MONTHLY" ? "mo" : "yr"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Features Included:
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{plan.max_shops || 1} Shop Branch{(plan.max_shops || 1) > 1 ? "es" : ""}</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>
                        {plan.max_products >= 999999 ? "Unlimited" : plan.max_products} Products
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{plan.max_users_per_shop || plan.max_team_members || 1} Staff Users per Shop</span>
                    </li>
                    {plan.has_ai_assistant && (
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-indigo-400">TRACE AI Assistant (EN/HI/MR)</span>
                      </li>
                    )}
                    {(plan.has_shop_network ?? plan.has_network_access) && (
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-emerald-400">TRACE B2B Shop Network</span>
                      </li>
                    )}
                    {plan.has_paylater && (
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>PayLater Khata & AutoPay</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="pt-4">
                  <Button
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent}
                    onClick={() => setSelectedPlanForUpgrade(plan)}
                    className="w-full text-xs font-bold"
                  >
                    {isCurrent ? "Active Plan" : `Select ${plan.name}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subscription Invoices History */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground">
            Subscription Billing History & Tax Invoices
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Past payments and downloadable GST tax receipts for your TRACE subscription.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-y border-border/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-4 font-semibold">Billing Date</th>
                  <th className="py-2.5 px-4 font-semibold">Plan</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {billingHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.date}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{item.plan}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {formatPaise(item.amountPaise)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="success" className="text-[10px]">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.print()}
                        className="h-7 text-xs text-indigo-500 hover:text-indigo-400 gap-1"
                      >
                        <Download className="h-3 w-3" /> PDF Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* UPGRADE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!selectedPlanForUpgrade}
        onClose={() => setSelectedPlanForUpgrade(null)}
        title={`Activate ${selectedPlanForUpgrade?.name}`}
        description="Verify subscription parameters and initiate test payment gateway clearance."
      >
        {selectedPlanForUpgrade && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 rounded-xl border border-border/60 bg-accent/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Target Plan:</span>
                <span className="font-bold text-foreground">{selectedPlanForUpgrade.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Billing Cycle:</span>
                <span className="font-bold text-foreground">{billingCycle}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t border-border/40 pt-2">
                <span>Total Due Today:</span>
                <span className="text-indigo-400">
                  {billingCycle === "MONTHLY"
                    ? formatPaise(selectedPlanForUpgrade.monthly_price_paise)
                    : formatPaise(selectedPlanForUpgrade.yearly_price_paise)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="ghost" onClick={() => setSelectedPlanForUpgrade(null)}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleConfirmUpgrade} className="font-bold">
                Authorize & Activate Plan
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Subscription Successfully Activated!"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2 text-center text-xs">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-muted-foreground">
            Your shop plan has been upgraded. All expanded features including TRACE AI and B2B Shop Network are immediately accessible.
          </p>
          <Button variant="default" onClick={() => setIsSuccessModalOpen(false)} className="w-full">
            Continue to Dashboard
          </Button>
        </div>
      </Modal>
    </div>
  );
}
