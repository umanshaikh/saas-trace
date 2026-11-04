"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import { Role } from "@/lib/types";
import { ShieldCheck, UserCog, UserCheck, ChevronDown, Check } from "lucide-react";

export function RoleSwitcher() {
  const { userRole, switchRole } = useTrace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roles: { role: Role; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    {
      role: "OWNER",
      label: "Owner",
      icon: ShieldCheck,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      desc: "Full administrative, financial & staff control",
    },
    {
      role: "MANAGER",
      label: "Manager",
      icon: UserCog,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      desc: "Inventory, stock edits & operational reports",
    },
    {
      role: "CASHIER",
      label: "Cashier",
      icon: UserCheck,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      desc: "POS billing counter & receipt issuance only",
    },
  ];

  const currentConfig = roles.find((r) => r.role === userRole) || roles[0];
  const Icon = currentConfig.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle active role to test permissions"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${currentConfig.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Role:</span>
        <span className="capitalize">{currentConfig.label}</span>
        <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-border bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Switch Testing Role
          </div>

          <div className="space-y-1">
            {roles.map((item) => {
              const isSelected = item.role === userRole;
              const ItemIcon = item.icon;

              return (
                <button
                  key={item.role}
                  onClick={() => {
                    switchRole(item.role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <div className={`mt-0.5 p-1 rounded-md ${item.color}`}>
                    <ItemIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{item.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
