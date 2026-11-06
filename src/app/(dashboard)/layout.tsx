"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useTrace } from "@/context/TraceContext";
import { Sparkles, ArrowRight, ShieldAlert, Zap, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { onboardingProgress, activeShop, activeSubscription } = useTrace();
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);

  // Demo shops / pre-seeded accounts are pre-verified
  const isDemoStore =
    activeShop.id.startsWith("shop_0") ||
    activeShop.id === "shop_default" ||
    activeShop.id === "11111111-1111-1111-1111-111111111111";

  // Check whether shop has an active paid subscription or valid paid-through period
  const isSubscriptionActive = (() => {
    if (isDemoStore) return true;
    if (!activeSubscription) return false;

    const now = new Date();
    const periodEnd = new Date(activeSubscription.current_period_ends_at || 0);

    if (activeSubscription.status === "ACTIVE") {
      return periodEnd > now;
    }

    if (activeSubscription.status === "CANCELLED") {
      // Paid-through grace period
      return periodEnd > now;
    }

    return false;
  })();

  const isExemptRoute =
    pathname.startsWith("/subscriptions") ||
    pathname.startsWith("/membership") ||
    pathname.startsWith("/admin");

  useEffect(() => {
    let isMounted = true;

    const verifyOnboardingStatus = async () => {
      if (isDemoStore && (!onboardingProgress || onboardingProgress.isCompleted)) {
        if (isMounted) {
          setIsVerifyingAccess(false);
          setAccessBlocked(false);
        }
        return;
      }

      // 1. Check local state
      if (onboardingProgress && !onboardingProgress.isCompleted && !isDemoStore && !isExemptRoute) {
        if (isMounted) {
          setAccessBlocked(true);
          setIsVerifyingAccess(false);
        }
        router.replace("/onboarding");
        return;
      }

      // 2. Authoritative Database verification against Supabase
      try {
        const { data: dbProg, error } = await supabase
          .from("onboarding_progress")
          .select("is_completed, current_step")
          .eq("shop_id", activeShop.id)
          .maybeSingle();

        if (!error && dbProg) {
          if (!dbProg.is_completed && !isDemoStore && !isExemptRoute) {
            if (isMounted) {
              setAccessBlocked(true);
              setIsVerifyingAccess(false);
            }
            router.replace("/onboarding");
            return;
          }
        }
      } catch (e) {
        console.warn("Access verification check notice:", e);
      }

      if (isMounted) {
        setAccessBlocked(false);
        setIsVerifyingAccess(false);
      }
    };

    verifyOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, [activeShop.id, onboardingProgress?.isCompleted, router, isExemptRoute, isDemoStore]);

  // If on Subscriptions or Admin page, always allow rendering so merchant can choose plans or admin can manage
  if (isExemptRoute) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // 1. If onboarding is incomplete, block view and show onboarding barrier
  if (accessBlocked || (onboardingProgress && !onboardingProgress.isCompleted && !isDemoStore)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white selection:bg-indigo-500/20">
        <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-indigo-500/30 bg-slate-900/60 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight">Store Setup Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Access to dashboard, POS counter, inventory, and reports is restricted until initial business setup is completed.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-indigo-300 flex items-center justify-between">
            <span>Setup Progress:</span>
            <span className="font-bold text-white">Step {onboardingProgress?.currentStep || 1} of 8 Pending</span>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.replace("/onboarding")}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Resume Onboarding Wizard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. If onboarding is complete, but shop does NOT have an active membership subscription:
  if (!isSubscriptionActive && !isDemoStore) {
    const isExpiredState = activeSubscription?.status === "EXPIRED" || (activeSubscription?.current_period_ends_at && new Date(activeSubscription.current_period_ends_at).getTime() < Date.now());

    // 2A: Dedicated Expired Membership Screen
    if (isExpiredState) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white selection:bg-rose-500/20">
          <div className="max-w-lg w-full space-y-6 p-8 rounded-3xl border border-rose-500/30 bg-slate-900/90 shadow-2xl shadow-rose-500/10 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white">
                Your TRACE Membership Has Expired!
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-sm mx-auto">
                Your subscription period has ended. Renew your membership to continue managing your business.
              </p>
            </div>

            {/* Expiration Details Grid */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2.5 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Shop:</span>
                <span className="font-bold text-white">{activeShop.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Previous Plan:</span>
                <Badge variant="brand" className="text-[10px] font-extrabold uppercase">
                  {activeSubscription?.plan?.name || "Professional Plan"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Expiration Date:</span>
                <span className="font-bold text-rose-400">
                  {activeSubscription?.current_period_ends_at
                    ? new Date(activeSubscription.current_period_ends_at).toLocaleDateString()
                    : "Expired"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Subscription Status:</span>
                <Badge variant="destructive" className="text-[10px] font-bold uppercase">
                  EXPIRED
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/subscriptions?renew=true"
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Zap className="h-4 w-4" />
                <span>Renew Membership</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/subscriptions"
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View Plans</span>
              </Link>
              <Link
                href="/subscriptions#history"
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Payment History</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // 2B: Unpaid New Shop Setup Barrier
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white selection:bg-indigo-500/20">
        <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-amber-500/30 bg-slate-900/80 shadow-2xl shadow-amber-500/10 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Zap className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Your shop is registered successfully!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              To unlock your TRACE dashboard and manage your business, please purchase a membership plan.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="font-semibold text-white truncate max-w-[180px]">{activeShop.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              {activeSubscription?.status || "PENDING"}
            </span>
          </div>

          <div className="pt-2">
            <Link
              href="/subscriptions?required=true"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="h-4 w-4" />
              <span>View Membership Plans</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Normal Authorized Dashboard Shell
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
