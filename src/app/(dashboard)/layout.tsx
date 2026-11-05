"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useTrace } from "@/context/TraceContext";
import { Sparkles, ArrowRight } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { onboardingProgress } = useTrace();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Incomplete Onboarding Alert Banner */}
        {onboardingProgress && !onboardingProgress.isCompleted && (
          <div className="bg-indigo-600/15 border-b border-indigo-500/30 px-4 py-2 flex items-center justify-between text-xs text-indigo-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Store Setup in Progress:</strong> Step {onboardingProgress.currentStep || 1} of 8 pending.
              </span>
            </div>
            <Link
              href="/onboarding"
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 shadow-sm flex items-center gap-1"
            >
              <span>Resume Setup</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
