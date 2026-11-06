"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTrace } from "@/context/TraceContext";
import { Sparkles, ArrowRight, ShieldCheck, UserCog, UserCheck, ShieldAlert, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TraceLogo } from "@/components/ui/TraceLogo";

export default function LoginPage() {
  const router = useRouter();
  const { switchRole, signInWithEmail, resetPassword, onboardingProgress } = useTrace();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleDemoLogin = (role: "OWNER" | "MANAGER" | "CASHIER", redirectPath = "/dashboard") => {
    switchRole(role);
    router.push(redirectPath);
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage("");

    const res = await signInWithEmail(email, password);
    if (!res.success) {
      setErrorMessage(res.error || "Invalid login credentials. Please check your email and password.");
      setIsLoading(false);
    } else {
      if (onboardingProgress && !onboardingProgress.isCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage("Please enter your email address to receive password reset link.");
      return;
    }
    const res = await resetPassword(email);
    if (res.success) {
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } else {
      setErrorMessage(res.error || "Failed to send reset email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 selection:bg-indigo-500/20 selection:text-indigo-400">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <TraceLogo size="xl" showTag tagText="RETAIL OS" linkTo="/" />
          </div>
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
          {errorMessage && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resetSent && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
              Password reset link sent to your email address!
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourstore.in"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            variant="default"
            className="w-full font-bold bg-indigo-600 hover:bg-indigo-500"
          >
            {isLoading ? "Signing in..." : "Sign In to TRACE"}
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
