"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Moon, Sun, Calculator, User } from "lucide-react";
import { ShopSwitcher } from "./ShopSwitcher";
import { RoleSwitcher } from "./RoleSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationCenter } from "./NotificationCenter";
import { useTrace } from "@/context/TraceContext";

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { currentUser, userRole } = useTrace();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Sync html dark class
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left side: Hamburger + Shop Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <ShopSwitcher />

        {/* POS Fast Billing Shortcut */}
        <Link
          href="/pos"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02]"
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>POS Counter</span>
          <span className="rounded bg-white/20 px-1 py-0.2 text-[10px] font-mono">F1</span>
        </Link>
      </div>

      {/* Right side controls: RoleSwitcher, LanguageSwitcher, Notification, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <RoleSwitcher />

        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        <NotificationCenter />

        {/* Dark / Light Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-border/70 bg-card hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle Light / Dark Mode"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>

        {/* User Pill */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-border/60">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {currentUser?.full_name ? currentUser.full_name[0] : "U"}
          </div>
          <div className="text-left text-xs leading-none">
            <p className="font-semibold text-foreground truncate max-w-[100px]">
              {currentUser?.full_name || "Merchant"}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
              {userRole.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
