"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TraceLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showTag?: boolean;
  tagText?: string;
  showSubtext?: boolean;
  subtext?: string;
  linkTo?: string | null;
  inverted?: boolean;
}

const SIZE_CONFIGS = {
  xs: { height: 22, width: 66, containerH: "h-6" },
  sm: { height: 28, width: 84, containerH: "h-8" },
  md: { height: 34, width: 102, containerH: "h-9" },
  lg: { height: 44, width: 132, containerH: "h-11" },
  xl: { height: 56, width: 168, containerH: "h-14" },
};

export function TraceLogo({
  className,
  size = "md",
  showTag = false,
  tagText = "POS",
  showSubtext = false,
  subtext = "Smart Business. Simple Management.",
  linkTo = null,
  inverted = false,
}: TraceLogoProps) {
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  const content = (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      {/* Official TRACE Logo Image with premium rounded enclosure */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-sm transition-all duration-200 border border-slate-200/60 dark:border-white/10 dark:shadow-indigo-500/10",
          config.containerH,
          inverted && "bg-slate-900 border-slate-800"
        )}
      >
        <Image
          src="/trace-logo.png"
          alt="TRACE"
          width={config.width}
          height={config.height}
          priority
          className="h-full w-auto object-contain"
        />
      </div>

      {/* Optional Tag or Subtext */}
      {(showTag || showSubtext) && (
        <div className="flex flex-col justify-center">
          {showTag && (
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-500 uppercase tracking-wider border border-indigo-500/20">
                {tagText}
              </span>
            </div>
          )}
          {showSubtext && (
            <p className="text-[10px] text-muted-foreground font-medium tracking-tight">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="inline-flex transition-transform hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}
