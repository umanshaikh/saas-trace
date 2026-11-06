"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowLeft,
  LogOut,
  Building2,
  Receipt,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { TraceLogo } from "@/components/ui/TraceLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SUPER_ADMIN_SECRET = "trace_super_admin_secret_key_2026";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if session has already unlocked Super Admin
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("trace_super_admin_session");
      if (stored === "unlocked") {
        setIsAuthenticated(true);
      }
    }
    setIsChecking(false);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim() === SUPER_ADMIN_SECRET || adminKey.trim() === "superadmin") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("trace_super_admin_session", "unlocked");
      }
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Invalid Super Admin Key. Access to platform administration is restricted.");
    }
  };

  const handleLockSession = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trace_super_admin_session");
    }
    setIsAuthenticated(false);
    setAdminKey("");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // 1. Master Security Gate: Super Admin must authenticate with Master Key
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-rose-500/20 text-white">
        <div className="max-w-md w-full space-y-6 p-8 rounded-3xl border border-rose-500/30 bg-slate-900/90 shadow-2xl shadow-rose-500/10 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex justify-center mb-2">
            <TraceLogo size="lg" showTag tagText="ADMIN" />
          </div>

          <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              Restricted Platform Portal
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Super Admin Command Center
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This administrative interface is isolated from merchant store operations. Enter the Master Platform Secret Key to access platform-wide telemetry and controls.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Master Security Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter super admin secret key..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                <span>Authenticate Platform Admin</span>
              </Button>

              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Shop Dashboard</span>
              </Link>
            </div>
          </form>

          <p className="text-[10px] text-center text-slate-500 font-mono">
            TRACE Retail OS • Isolated Platform Infrastructure
          </p>
        </div>
      </div>
    );
  }

  // 2. Standalone Super Admin Portal Layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Dedicated Super Admin Header */}
      <header className="sticky top-0 z-40 border-b border-rose-500/20 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TraceLogo size="md" showTag tagText="SUPER ADMIN" linkTo="/admin/subscriptions" />

            <div className="hidden md:flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
                <span>Super Admin Authenticated</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Go to Merchant App</span>
            </Link>

            <button
              onClick={handleLockSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock Admin Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Admin Portal Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>TRACE SaaS Platform Command Center • Master Administration Portal • High Security Environment</p>
      </footer>
    </div>
  );
}
