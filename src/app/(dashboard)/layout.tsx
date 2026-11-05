"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useTrace } from "@/context/TraceContext";
import { Sparkles, ArrowRight, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { onboardingProgress, activeShop } = useTrace();
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyOnboardingStatus = async () => {
      // Demo shops / pre-seeded accounts are pre-verified
      const isDemoStore =
        activeShop.id.startsWith("shop_0") ||
        activeShop.id === "shop_default" ||
        activeShop.id === "11111111-1111-1111-1111-111111111111";

      if (isDemoStore && (!onboardingProgress || onboardingProgress.isCompleted)) {
        if (isMounted) {
          setIsVerifyingAccess(false);
          setAccessBlocked(false);
        }
        return;
      }

      // 1. Check local state
      if (onboardingProgress && !onboardingProgress.isCompleted && !isDemoStore) {
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
          if (!dbProg.is_completed && !isDemoStore) {
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
  }, [activeShop.id, onboardingProgress?.isCompleted, router]);

  // If onboarding is incomplete, block view and show redirect barrier
  const isDemoStore =
    activeShop.id.startsWith("shop_0") ||
    activeShop.id === "shop_default" ||
    activeShop.id === "11111111-1111-1111-1111-111111111111";

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
