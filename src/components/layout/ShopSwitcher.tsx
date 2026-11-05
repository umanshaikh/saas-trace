"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import { Store, ChevronDown, Check, Plus, Building2, MapPin } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShopSwitcher() {
  const { activeShop, allShops, switchShop, registerNewShop, showToast } = useTrace();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New shop form state
  const [newShopName, setNewShopName] = useState("");
  const [newBusinessType, setNewBusinessType] = useState<any>("GROCERY");
  const [newCity, setNewCity] = useState("Mumbai");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    try {
      await registerNewShop({
        name: newShopName.trim(),
        business_type: newBusinessType,
        city: newCity,
        email: `${newShopName.toLowerCase().replace(/[^a-z0-9]/g, "")}@trace.business`,
      });
      if (showToast) {
        showToast("success", "Shop Created", `${newShopName.trim()} is now your active store.`);
      }
    } catch (err: any) {
      if (showToast) {
        showToast("error", "Creation Failed", err?.message || "Could not register shop");
      }
    }

    setNewShopName("");
    setIsAddModalOpen(false);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-accent/50 text-foreground transition-all duration-150 text-xs font-medium shadow-sm"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500 font-bold">
            <Store className="h-3.5 w-3.5" />
          </div>
          <div className="text-left max-w-[130px] sm:max-w-[170px] truncate">
            <span className="block truncate font-semibold leading-tight text-foreground">
              {activeShop.name}
            </span>
            <span className="block text-[10px] text-muted-foreground capitalize leading-tight truncate">
              {activeShop.business_type?.toLowerCase()} • {activeShop.city}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-xl border border-border bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Your Managed Shops
            </div>

            <div className="space-y-1">
              {allShops.map((shop) => {
                const isSelected = shop.id === activeShop.id;
                return (
                  <button
                    key={shop.id}
                    onClick={() => {
                      switchShop(shop.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? "bg-indigo-600/10 text-indigo-500 font-semibold border border-indigo-500/20"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-left truncate">
                        <p className="truncate font-medium">{shop.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 capitalize">
                          <MapPin className="h-2.5 w-2.5" /> {shop.city} • {shop.business_type?.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-1 border-t border-border/60">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsAddModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Register New Branch / Shop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Shop Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Shop"
        description="Add an additional branch or enterprise storefront under your TRACE account."
      >
        <form onSubmit={handleCreateShop} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Shop Name</label>
            <Input
              value={newShopName}
              onChange={(e) => setNewShopName(e.target.value)}
              placeholder="e.g. Apex Supermarket - Bandra West"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Business Type</label>
              <select
                value={newBusinessType}
                onChange={(e) => setNewBusinessType(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <label className="text-xs font-semibold text-foreground mb-1 block">City / Location</label>
              <Input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="e.g. Mumbai, Pune, Delhi"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Create & Switch to Shop
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
