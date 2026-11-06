"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTrace } from "@/context/TraceContext";
import {
  Sparkles,
  Calculator,
  Package,
  CreditCard,
  Percent,
  ShieldCheck,
  ArrowRight,
  Store,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TraceLogo } from "@/components/ui/TraceLogo";

export default function WelcomeHomePage() {
  const router = useRouter();
  const { authUser, onboardingProgress, activeShop } = useTrace();
  const [isNavigating, setIsNavigating] = useState(false);

  React.useEffect(() => {
    // Authenticated users with completed onboarding bypass directly to dashboard
    if (authUser && onboardingProgress?.isCompleted) {
      router.replace("/dashboard");
    }
  }, [authUser, onboardingProgress?.isCompleted, router]);

  const handleGetStarted = () => {
    setIsNavigating(true);
    // If not authenticated, guide to registration
    if (!authUser) {
      router.push("/register");
      return;
    }

    // If authenticated, check onboarding completion status
    if (onboardingProgress && !onboardingProgress.isCompleted) {
      router.push("/onboarding");
      return;
    }

    // If already completed, go to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500/20 selection:text-indigo-400 relative overflow-hidden">
      {/* Dynamic Animated Ambient Glow Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Upper Indigo Aura */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent blur-[140px] rounded-full animate-pulse" />
        {/* Subtle Purple Lower Glow */}
        <div className="absolute -bottom-[15%] right-[10%] w-[500px] h-[400px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
        {/* Subtle Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <TraceLogo size="lg" showTag tagText="RETAIL OS" showSubtext linkTo="/" />

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Button
              onClick={handleGetStarted}
              disabled={isNavigating}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 px-4"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Hero Welcome Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center my-auto space-y-8 animate-in fade-in duration-300">
        {/* Badge Indicator */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-md">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Next-Generation Retail Management SaaS</span>
        </div>

        {/* Clear Heading and Subheading */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.12]">
            Welcome to <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">TRACE</span>
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-300">
            Your business management journey starts here.
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            TRACE helps you manage ultra-fast POS billing, automated inventory tracking, customer PayLater credit ledgers, and Indian GST compliance in one powerful, unified system.
          </p>
        </div>

        {/* Action Controls: Primary Get Started & Secondary Sign In */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button
            size="lg"
            onClick={handleGetStarted}
            disabled={isNavigating}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-xl shadow-indigo-500/25 rounded-xl gap-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>{authUser ? "Continue Store Setup" : "Get Started"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center"
          >
            Already have an account? <span className="text-indigo-400 font-bold">Sign In</span>
          </Link>
        </div>

        {/* Core Capabilities 4-Pillars Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 text-left">
          <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/40 backdrop-blur-sm space-y-1.5 hover:border-indigo-500/30 transition-all">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Calculator className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-white">POS Billing</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Sub-second counter checkout & barcode scanning.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/40 backdrop-blur-sm space-y-1.5 hover:border-emerald-500/30 transition-all">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Package className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Live Inventory</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Atomic stock deduction & low-stock alerts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/40 backdrop-blur-sm space-y-1.5 hover:border-amber-500/30 transition-all">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Percent className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-white">GST Invoicing</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Exact CGST/SGST & IGST tax calculation.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/40 backdrop-blur-sm space-y-1.5 hover:border-violet-500/30 transition-all">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-white">PayLater Khata</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Customer credit ledgers & balance reminders.
            </p>
          </div>
        </div>

        {/* Security & Reliability Assurances */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500 pt-4 border-t border-slate-900">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Bank-Grade 256-Bit Encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>DPDP Act 2023 Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Offline-Resilient POS Engine</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} TRACE Platform Inc. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <span>•</span>
            <Link href="/register" className="hover:text-white transition-colors">Register Shop</Link>
            <span>•</span>
            <Link href="/onboarding" className="hover:text-white transition-colors">Setup Wizard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
