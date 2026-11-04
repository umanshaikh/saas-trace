"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Calculator,
  Bot,
  Share2,
  CreditCard,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Store,
  Layers,
  Check,
  TrendingUp,
  Receipt,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-400">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-md shadow-indigo-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-white text-lg">
                  TRACE
                </span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                Smart Business. Simple Management.
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Platform Modules
            </a>
            <a href="#pos" className="hover:text-white transition-colors">
              POS Counter
            </a>
            <a href="#ai" className="hover:text-white transition-colors">
              TRACE AI Assistant
            </a>
            <a href="#network" className="hover:text-white transition-colors">
              B2B Network
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing Plans
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="default" size="sm" className="text-xs font-bold shadow-md shadow-indigo-600/30">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <Badge variant="brand" className="text-xs py-1 px-3 shadow-md">
            🚀 The Unified Operating System for Modern Indian SMBs
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Smart Business. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Simple Management.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            All-in-one AI-powered shop management for grocery, apparel, pharmacy, and retail merchants. Ultra-fast POS billing, multilingual AI inventory voice controls, decentralized B2B stock sharing, and automated PayLater khata credit.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link href="/pos">
              <Button size="lg" className="gap-2 font-bold px-6 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/25">
                <Calculator className="h-4 w-4" />
                <span>Try Live POS Counter (F1)</span>
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2 font-bold px-6 border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200">
                <Store className="h-4 w-4 text-indigo-400" />
                <span>Explore Shop Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Quick Demo Role Logins Pill */}
          <div className="pt-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Instant 1-Click Role Testing:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/dashboard" className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-300 font-medium transition-colors">
                👑 Owner View
              </Link>
              <Link href="/inventory" className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-300 font-medium transition-colors">
                🛠️ Manager View
              </Link>
              <Link href="/pos" className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-300 font-medium transition-colors">
                ⚡ Cashier View
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-16 max-w-7xl mx-auto px-4 sm:px-8 border-t border-slate-800/60">
        <div className="text-center space-y-2 mb-12">
          <Badge variant="outline" className="text-xs uppercase font-bold text-indigo-400">
            Engineered For Excellence
          </Badge>
          <h2 className="text-3xl font-extrabold text-white">
            7 Integrated Engines in One Seamless Platform
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Everything your shop needs to replace five fragmented software tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* TRACE POS */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-indigo-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">1. TRACE POS Counter</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sub-second keyboard billing (F1), barcode reader integration, live stock deduction, and multi-mode settlement (Cash, UPI QR, Card, Split, PayLater).
            </p>
            <Link href="/pos" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 pt-1">
              Launch POS Counter <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* TRACE AI */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-indigo-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">2. TRACE AI Assistant</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multilingual operational intelligence in English, Hindi, and Marathi. Safe server-side tool calling for automated stock adjustments and revenue inquiries.
            </p>
            <Link href="/ai-assistant" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 pt-1">
              Chat with TRACE AI <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* TRACE B2B Network */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-indigo-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Share2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">3. TRACE B2B Network</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Shop-to-shop inventory pooling. Establish QR-paired trust networks to browse neighboring catalogs and reserve wholesale stock on demand.
            </p>
            <Link href="/network" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 pt-1">
              Explore B2B Network <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* TRACE PayLater */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-indigo-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">4. TRACE PayLater Khata</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modern digital udhar ledger with credit limits, WhatsApp payment reminders, and NPCI e-NACH / UPI AutoPay recurring mandate architecture.
            </p>
            <Link href="/paylater" className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 pt-1">
              Manage Khata Ledger <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Subscriptions */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-indigo-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">5. TRACE Subscriptions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transparent affordable tiers starting at ₹99/mo for single counters, up to ₹399/mo for enterprise franchises with yearly discount incentives.
            </p>
            <Link href="/subscriptions" className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 pt-1">
              Compare SaaS Plans <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Enterprise Security */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-emerald-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">6. Enterprise Cloud Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-tenant PostgreSQL Row-Level Security with continuous backup and hardware thermal printer encryption.
            </p>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 pt-1">
              <span>DPDP Act 2023 Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-16 max-w-7xl mx-auto px-4 sm:px-8 border-t border-slate-800/60">
        <div className="text-center space-y-2 mb-12">
          <Badge variant="outline" className="text-xs uppercase font-bold text-emerald-400">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl font-extrabold text-white">
            Designed for Local Indian Retail
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Try Free, upgrade when your shop grows. No hidden transaction fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h4 className="font-bold text-white text-base">Starter Plan</h4>
            <div className="text-2xl font-extrabold text-white">₹99<span className="text-xs font-normal text-slate-400">/mo</span></div>
            <p className="text-xs text-slate-400">Essential POS billing, 500 Products, 2 Staff Logins, PayLater Khata.</p>
            <Link href="/subscriptions">
              <Button variant="outline" className="w-full text-xs font-bold border-slate-700">Choose Starter</Button>
            </Link>
          </div>

          <div className="p-6 rounded-2xl border-2 border-indigo-500 bg-indigo-950/20 space-y-4 shadow-xl shadow-indigo-600/10">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Pro Atelier</h4>
              <Badge variant="brand" className="text-[10px]">POPULAR</Badge>
            </div>
            <div className="text-2xl font-extrabold text-white">₹199<span className="text-xs font-normal text-slate-400">/mo</span></div>
            <p className="text-xs text-slate-400">Unlimited Products, TRACE AI Multilingual Voice Assistant, B2B Network.</p>
            <Link href="/subscriptions">
              <Button variant="default" className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-500">Choose Pro</Button>
            </Link>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h4 className="font-bold text-white text-base">Business Enterprise</h4>
            <div className="text-2xl font-extrabold text-white">₹399<span className="text-xs font-normal text-slate-400">/mo</span></div>
            <p className="text-xs text-slate-400">Multi-Branch Network, Dedicated Manager, Custom API & AutoPay.</p>
            <Link href="/subscriptions">
              <Button variant="outline" className="w-full text-xs font-bold border-slate-700">Choose Business</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 sm:px-8 text-center text-xs text-slate-500">
        <p>© 2026 TRACE SaaS Platform. Built with Next.js, Supabase & TypeScript. All rights reserved.</p>
        <p className="mt-1">Financial calculations strictly verified with integer paise precision.</p>
      </footer>
    </div>
  );
}
