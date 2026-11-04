"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTrace } from "@/context/TraceContext";
import { Sparkles, ArrowRight, ShieldCheck, UserCog, UserCheck, ShieldAlert, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { switchRole } = useTrace();

  const [email, setEmail] = useState("owner@trace.app");
  const [password, setPassword] = useState("••••••••");

  const handleDemoLogin = (role: "OWNER" | "MANAGER" | "CASHIER", redirectPath = "/dashboard") => {
    switchRole(role);
    router.push(redirectPath);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 selection:bg-indigo-500/20 selection:text-indigo-400">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black tracking-wider text-white">TRACE</span>
          </Link>
          <h1 className="text-xl font-bold text-white">Sign in to your Merchant Account</h1>
          <p className="text-xs text-slate-400">
            Enter your credentials or choose a 1-click test role below.
          </p>
        </div>

        {/* Demo Fast Login Selector */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Instant 1-Click Role Access (No Password Required):
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleDemoLogin("OWNER", "/dashboard")}
              className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400 text-left transition-colors font-semibold flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <div>
                <p className="leading-tight">Store Owner</p>
                <p className="text-[10px] text-slate-400 font-normal">Full SaaS Control</p>
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin("MANAGER", "/inventory")}
              className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 text-left transition-colors font-semibold flex items-center gap-2"
            >
              <UserCog className="h-4 w-4 shrink-0" />
              <div>
                <p className="leading-tight">Store Manager</p>
                <p className="text-[10px] text-slate-400 font-normal">Inventory & Stock</p>
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin("CASHIER", "/pos")}
              className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 text-left transition-colors font-semibold flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4 shrink-0" />
              <div>
                <p className="leading-tight">Counter Cashier</p>
                <p className="text-[10px] text-slate-400 font-normal">POS Billing Only</p>
              </div>
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <form onSubmit={handleFormLogin} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="default" className="w-full font-bold bg-indigo-600 hover:bg-indigo-500">
            Sign In to TRACE
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Need a new merchant account?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline font-semibold">
            Register your shop
          </Link>
        </p>
      </div>
    </div>
  );
}
