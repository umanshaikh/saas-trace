"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div
        className={cn(
          "relative w-full z-50 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col",
          maxWidthClasses[maxWidth]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-border/60 p-5 pb-4">
            <div>
              {title && <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>}
              {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
