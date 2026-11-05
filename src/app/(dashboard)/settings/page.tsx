"use client";

import React, { useState, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import {
  Settings,
  Store,
  Printer,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { activeShop, updateActiveShop, showToast } = useTrace();

  const [shopName, setShopName] = useState(activeShop.name);
  const [city, setCity] = useState(activeShop.city);
  const [address, setAddress] = useState(activeShop.address_line1 || "");
  const [phone, setPhone] = useState(activeShop.phone || "");
  const [gstin, setGstin] = useState(activeShop.gstin || "");
  const [printerType, setPrinterType] = useState("THERMAL_80MM");
  const [receiptFooter, setReceiptFooter] = useState(
    "Thank you for shopping with us! Have a wonderful day."
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShopName(activeShop.name);
    setCity(activeShop.city);
    setAddress(activeShop.address_line1 || "");
    setPhone(activeShop.phone || "");
    setGstin(activeShop.gstin || "");
  }, [activeShop]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName.trim()) {
      if (showToast) showToast("error", "Store Name Required", "Please provide a valid store name.");
      return;
    }

    if (gstin.trim()) {
      const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
        if (showToast) showToast("error", "Invalid GSTIN Format", "GSTIN must be 15 characters conforming to Indian GST format (e.g., 27ABCDE1234F1Z5).");
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateActiveShop({
        name: shopName.trim(),
        city: city.trim(),
        address_line1: address.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase(),
      });
      setIsSaved(true);
      if (showToast) showToast("success", "Settings Saved", "Store metadata updated successfully.");
      setTimeout(() => setIsSaved(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-500" />
          Store Settings & Hardware Configuration
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure business metadata, legal GST registration, and thermal receipt printer parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-500" />
              Store Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Store Legal Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  City / Location
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  GSTIN (Tax Identification)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Store Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop 4, Market Road"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Support / Counter Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Business Category
                </label>
                <input
                  type="text"
                  disabled
                  value={activeShop.business_type}
                  className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-xs text-muted-foreground capitalize"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Printer & Hardware Setup */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Printer className="h-4 w-4 text-indigo-500" />
              Thermal POS Printer & Invoicing Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Printer Hardware Protocol
              </label>
              <select
                value={printerType}
                onChange={(e) => setPrinterType(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="THERMAL_80MM">Thermal 80mm ESC/POS (Standard Counter Printer)</option>
                <option value="THERMAL_58MM">Thermal 58mm ESC/POS (Compact Mobile Bluetooth)</option>
                <option value="A4_LASER">A4 Laser / Inkjet Detailed Invoice</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Receipt Footer Message
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-between">
          {isSaved ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" /> Store identity successfully saved and synced to database!
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" /> Auto-sync active with Supabase cloud database
            </span>
          )}

          <Button type="submit" variant="default" className="gap-2 font-bold px-6" disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
