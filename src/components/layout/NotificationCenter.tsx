"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTrace } from "@/context/TraceContext";
import { Bell, AlertTriangle, PackageCheck, AlertCircle, CheckCircle2, ChevronRight, X } from "lucide-react";
import Link from "next/link";

export function NotificationCenter() {
  const { notifications, markNotificationRead } = useTrace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "NETWORK_ORDER":
        return <PackageCheck className="h-4 w-4 text-indigo-500" />;
      case "PAYLATER_OVERDUE":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg border border-border/70 bg-card hover:bg-accent/50 text-foreground transition-colors"
        title="View Notifications"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-xl border border-border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-border/60 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  notifications.forEach((n) => markNotificationRead(n.id));
                }}
                className="text-[11px] text-indigo-500 hover:text-indigo-400 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/50 mb-2" />
                No active notifications. All systems optimal!
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 transition-colors ${
                    !notif.is_read ? "bg-accent/40" : "hover:bg-accent/20"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded-md bg-muted shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        {notif.message}
                      </p>
                      {(notif.action_url || notif.link) && (
                        <Link
                          href={notif.action_url || notif.link || "/dashboard"}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-400 mt-1.5"
                        >
                          Take action <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                        title="Mark as read"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
