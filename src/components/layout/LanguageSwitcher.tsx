"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import { Languages, ChevronDown, Check } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useTrace();
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

  const languages = [
    { code: "en", label: "English", native: "English" },
    { code: "hi", label: "Hindi", native: "हिन्दी" },
    { code: "mr", label: "Marathi", native: "मराठी" },
  ] as const;

  const current = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-accent/50 text-foreground text-xs font-medium transition-colors"
        title="Select AI and Interface Language"
      >
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold text-xs">{current.native}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Language / भाषा
          </div>
          {languages.map((l) => {
            const isSelected = l.code === language;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLanguage(l.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? "bg-indigo-600/10 text-indigo-500 font-semibold"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <div>
                  <span className="font-medium">{l.native}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">({l.label})</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
