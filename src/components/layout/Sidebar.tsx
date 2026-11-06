"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Package,
  Bot,
  Share2,
  CreditCard,
  IndianRupee,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrace } from "@/context/TraceContext";
import { Badge } from "@/components/ui/badge";
import { TraceLogo } from "@/components/ui/TraceLogo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "default" | "brand" | "success" | "warning";
  ownerOnly?: boolean;
}

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { activeShop, currentUser, userRole, activeSubscription } = useTrace();

  const navGroups: { groupTitle: string; items: NavItem[] }[] = [
    {
      groupTitle: "CORE POS & BILLING",
      items: [
        { label: "POS Billing Counter", href: "/pos", icon: Calculator, badge: "Fast POS" },
        { label: "Shop Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Inventory & Stock", href: "/inventory", icon: Package },
        { label: "Customer Directory", href: "/customers", icon: Users },
      ],
    },
    {
      groupTitle: "AI & B2B NETWORK",
      items: [
        {
          label: "TRACE AI Assistant",
          href: "/ai-assistant",
          icon: Bot,
          badge: "EN/HI/MR",
          badgeVariant: "brand",
        },
        {
          label: "TRACE B2B Network",
          href: "/network",
          icon: Share2,
          badge: "Stock Sharing",
          badgeVariant: "success",
        },
      ],
    },
    {
      groupTitle: "CREDIT & FINANCE",
      items: [
        {
          label: "PayLater Khata",
          href: "/paylater",
          icon: CreditCard,
          badge: "AutoPay Ready",
        },
        { label: "Payment Ledger", href: "/payments", icon: IndianRupee },
        { label: "Shop Expenses", href: "/expenses", icon: Receipt },
        { label: "Reports & GST", href: "/reports", icon: BarChart3 },
      ],
    },
    {
      groupTitle: "PLATFORM & SETTINGS",
      items: [
        {
          label: "TRACE Subscriptions",
          href: "/subscriptions",
          icon: Zap,
          badge: activeSubscription?.plan?.name || "Professional",
          badgeVariant: "brand",
          ownerOnly: true,
        },
        {
          label: "My Membership",
          href: "/membership",
          icon: Sparkles,
          badge: activeSubscription?.status || "Pending",
          badgeVariant: activeSubscription?.status === "ACTIVE" ? "success" : "warning",
        },
        { label: "Shop Settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-border/80 bg-card/95 backdrop-blur-md transition-transform duration-300 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header with New Official TRACE Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-5">
          <TraceLogo size="md" showTag tagText="POS" showSubtext linkTo="/dashboard" />
        </div>

        {/* Current Active Shop Badge Pill */}
        <div className="p-3 mx-3 my-2 rounded-xl bg-accent/40 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Store className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-foreground truncate">
                  {activeShop.name}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {activeShop.business_type} • {activeShop.city}
                </p>
              </div>
            </div>
            <Badge variant="default" className="text-[9px] uppercase tracking-wider shrink-0">
              {userRole}
            </Badge>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/80 uppercase">
                {group.groupTitle}
              </p>
              <div className="space-y-0.5 pt-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  // Hide owner-only features from Cashier role
                  if (item.ownerOnly && userRole === "CASHIER") return null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User / Merchant Profile Footer */}
        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-accent/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs shrink-0 shadow-sm">
              {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : "U"}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {currentUser?.full_name || "Merchant"}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize truncate">
                {userRole?.toLowerCase()} • {currentUser?.email || activeShop.name}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
