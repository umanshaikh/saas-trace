"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Store, Mail, Lock, Phone, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrace } from "@/context/TraceContext";

export default function RegisterPage() {
  const router = useRouter();
  const { registerNewShop, signUpWithEmail } = useTrace();

  const [shopName, setShopName] = useState("");
  const [businessType, setBusinessType] = useState("GROCERY");
  const [city, setCity] = useState("Mumbai");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !email || !password) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await signUpWithEmail(email, password, shopName, shopName, businessType, city);
      if (!res.success) {
        setErrorMessage(res.error || "Registration failed. Please check your information.");
        setIsSubmitting(false);
        return;
      }
      router.push("/onboarding");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 selection:bg-indigo-500/20 selection:text-indigo-400">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black tracking-wider text-white">TRACE</span>
          </Link>
          <h1 className="text-xl font-bold text-white">Register New Shop on TRACE</h1>
          <p className="text-xs text-slate-400">
            Set up your billing counter and AI-powered business inventory in 60 seconds.
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Store / Shop Name *</label>
            <div className="relative">
              <Store className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Anand Provision & General Store"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Business Category</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="GROCERY">Grocery / Supermarket</option>
                <option value="CLOTHING">Clothing & Fashion</option>
                <option value="RESTAURANT">Restaurant & Café</option>
                <option value="MEDICAL">Medical & Pharmacy</option>
                <option value="MOBILE">Mobile & Electronics</option>
                <option value="GENERAL_RETAIL">General Retail</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">City / Town</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Owner Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@business.com"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Secure Password *</label>
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

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="default"
            className="w-full font-bold bg-indigo-600 hover:bg-indigo-500 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Store & Connecting Database...</span>
              </>
            ) : (
              <span>Create Store & Launch Counter</span>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
