"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  FileText,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useTrace } from "@/context/TraceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TraceLogo } from "@/components/ui/TraceLogo";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase/client";

export default function RegistrationStatusPage() {
  const router = useRouter();
  const { activeShop, authUser, signOutUser, updateActiveShop } = useTrace();

  const [currentShop, setCurrentShop] = useState<any>(activeShop);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Additional info form state
  const [additionalNote, setAdditionalNote] = useState("");
  const [updatedGstin, setUpdatedGstin] = useState(activeShop.gstin || "");
  const [updatedAddress, setUpdatedAddress] = useState(activeShop.address_line1 || "");
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);

  const hasRedirectedRef = useRef(false);

  // Parse metadata from qr_code_payload if present
  let metadata: any = {};
  try {
    if (currentShop.qr_code_payload && currentShop.qr_code_payload.startsWith("{")) {
      metadata = JSON.parse(currentShop.qr_code_payload);
    }
  } catch (e) {}

  const currentStatus = currentShop.access_status || "PENDING_APPROVAL";

  // Invalidate cache and transition to membership selection upon approval
  const handleApprovalTransition = useCallback(
    (approvedRecord: any) => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      setIsRedirecting(true);

      // Invalidate and update local cache
      try {
        const cachedRaw = localStorage.getItem("trace_shops");
        if (cachedRaw) {
          const list = JSON.parse(cachedRaw);
          const updatedList = list.map((s: any) =>
            s.id === approvedRecord.id ? { ...s, ...approvedRecord, access_status: "APPROVED" } : s
          );
          localStorage.setItem("trace_shops", JSON.stringify(updatedList));
        }
        localStorage.setItem("trace_active_shop_id", approvedRecord.id);
      } catch (e) {}

      updateActiveShop({ ...approvedRecord, access_status: "APPROVED" });
      setCurrentShop((prev: any) => ({ ...prev, ...approvedRecord, access_status: "APPROVED" }));

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setStatusMessage("Application APPROVED! Redirecting to membership plan selection...");

      setTimeout(() => {
        router.push("/subscriptions");
      }, 1000);
    },
    [router, updateActiveShop]
  );

  // Status check: queries Supabase directly with fallback to server registration endpoint
  const checkStatus = useCallback(
    async (showLoading = false) => {
      if (hasRedirectedRef.current) return;
      if (showLoading) setIsRefreshing(true);

      try {
        let latestRecord: any = null;

        // 1. Check authoritative server API endpoint (which reads Supabase via service_role)
        try {
          const apiRes = await fetch(`/api/shops/register?shopId=${encodeURIComponent(currentShop.id)}`, {
            cache: "no-store",
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.shop) {
              latestRecord = apiData.shop;
            }
          }
        } catch (apiErr) {}

        // 2. Direct Supabase query fallback
        if (!latestRecord) {
          try {
            const { data: dbData } = await supabase
              .from("shops")
              .select("*")
              .eq("id", currentShop.id)
              .maybeSingle();
            if (dbData) latestRecord = dbData;
          } catch (dbErr) {}
        }

        if (latestRecord) {
          const newStatus = latestRecord.access_status;
          setCurrentShop(latestRecord);
          updateActiveShop(latestRecord);

          if (newStatus === "APPROVED" || newStatus === "ACTIVE") {
            handleApprovalTransition(latestRecord);
            return;
          } else if (newStatus === "REJECTED") {
            setStatusMessage("Your application review has concluded. Status: REJECTED.");
          } else if (newStatus === "INFO_REQUESTED") {
            setStatusMessage("Action Required: Super Admin has requested additional details.");
          } else if (newStatus === "SUSPENDED") {
            setStatusMessage("Your shop account is currently suspended.");
          } else {
            if (showLoading) {
              setStatusMessage("Status refreshed. Application is currently under review by Super Admin.");
            }
          }
        }
      } catch (err: any) {
        console.warn("Status check notice:", err);
      } finally {
        if (showLoading) setIsRefreshing(false);
      }
    },
    [currentShop.id, handleApprovalTransition, updateActiveShop]
  );

  // Real-time synchronization: Supabase Realtime + Periodic Polling + Window Focus
  useEffect(() => {
    // Initial check on mount
    checkStatus(false);

    // 1. Supabase Realtime channel for postgres_changes
    const channel = supabase
      .channel(`shop_status_sync_${currentShop.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shops",
          filter: `id=eq.${currentShop.id}`,
        },
        (payload: any) => {
          if (payload?.new) {
            const updated = payload.new;
            setCurrentShop(updated);
            updateActiveShop(updated);

            if (updated.access_status === "APPROVED" || updated.access_status === "ACTIVE") {
              handleApprovalTransition(updated);
            } else if (updated.access_status === "REJECTED") {
              setStatusMessage("Your application review has concluded. Status: REJECTED.");
            } else if (updated.access_status === "INFO_REQUESTED") {
              setStatusMessage("Action Required: Super Admin has requested additional details.");
            }
          }
        }
      )
      .subscribe();

    // 2. Periodic polling fallback (every 3 seconds while pending)
    const pollInterval = setInterval(() => {
      if (!hasRedirectedRef.current) {
        checkStatus(false);
      }
    }, 3000);

    // 3. Refresh immediately on window focus or tab visibility change
    const handleFocus = () => {
      if (!hasRedirectedRef.current) {
        checkStatus(false);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !hasRedirectedRef.current) {
        checkStatus(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentShop.id, checkStatus, handleApprovalTransition, updateActiveShop]);

  // Handle submitting requested information or resubmission
  const handleSubmitRequestedInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInfo(true);
    try {
      const updatedMetadata = {
        ...metadata,
        resubmitted_at: new Date().toISOString(),
        merchant_response_note: additionalNote,
      };

      const updates: any = {
        gstin: updatedGstin.trim().toUpperCase(),
        address_line1: updatedAddress.trim(),
        access_status: "PENDING_APPROVAL", // Reset to pending for admin re-evaluation
        suspension_reason: null,
        qr_code_payload: JSON.stringify(updatedMetadata),
        updated_at: new Date().toISOString(),
      };

      // Submit via server endpoint with elevated permissions
      await fetch("/api/shops/register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: currentShop.id,
          status: "PENDING_APPROVAL",
          rejectionReason: null,
          message: additionalNote,
        }),
      });

      setCurrentShop((prev: any) => ({ ...prev, ...updates }));
      updateActiveShop(updates);
      setAdditionalNote("");
      setStatusMessage("Updated details submitted successfully. Your application is back under review.");
    } catch (e: any) {
      alert("Failed to submit updated details: " + e.message);
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white selection:bg-indigo-500/20 selection:text-indigo-400">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <TraceLogo size="xl" showTag tagText="VERIFICATION GATEWAY" linkTo="/" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Shop Registration Status
          </h1>
          <p className="text-xs text-slate-400">
            Real-Time Administrative Verification & Platform Security
          </p>
        </div>

        {/* Main Status Container */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Status Alert Banner */}
          {currentStatus === "APPROVED" || currentStatus === "ACTIVE" ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-emerald-400">Application Approved!</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                    APPROVED
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your shop has been successfully approved by TRACE Platform Administration! Redirecting you to select a membership plan...
                </p>
              </div>
            </div>
          ) : currentStatus === "REJECTED" ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rose-400">Registration Not Approved</h3>
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                    REJECTED
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentShop.suspension_reason
                    ? `Reason: ${currentShop.suspension_reason}`
                    : "Your shop registration was not approved. Please review the reason or contact TRACE support."}
                </p>
              </div>
            </div>
          ) : currentStatus === "INFO_REQUESTED" ? (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-indigo-400">Information Requested</h3>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                    ACTION REQUIRED
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {metadata.latest_info_request ||
                    currentShop.suspension_reason ||
                    "Our review team requires additional details regarding your store or GST documentation before approving."}
                </p>
              </div>
            </div>
          ) : currentStatus === "SUSPENDED" ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rose-400">Account Suspended</h3>
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                    SUSPENDED
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentShop.suspension_reason || "Your shop account is currently suspended. Please contact TRACE support."}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-400">Application Under Review</h3>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                    PENDING APPROVAL
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your shop registration has been submitted successfully. Our team is reviewing your application. You will be able to select a membership plan after approval.
                </p>
              </div>
            </div>
          )}

          {/* Submitted Shop Dossier */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Application Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Shop Name</span>
                <span className="font-semibold text-white flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  {currentShop.name}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Shop ID</span>
                <span className="font-mono text-slate-300 text-[11px] block mt-0.5 truncate">
                  {currentShop.id}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Owner Name / Email</span>
                <span className="text-slate-300 block mt-0.5 truncate">
                  {metadata.owner_name || authUser?.user_metadata?.full_name || "Store Owner"} ({currentShop.email})
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Business Category</span>
                <span className="text-slate-300 capitalize block mt-0.5">
                  {currentShop.business_type}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Location</span>
                <span className="text-slate-300 block mt-0.5">
                  {currentShop.city}, {currentShop.state} ({currentShop.pincode})
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">GST Information</span>
                <span className="text-slate-300 block mt-0.5 font-mono">
                  {currentShop.gstin ? currentShop.gstin : "Exempt / Unregistered"}
                  {metadata.gst_legal_name && ` (${metadata.gst_legal_name})`}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Submission Date</span>
                <span className="text-slate-300 block mt-0.5">
                  {new Date(currentShop.created_at || Date.now()).toLocaleString("en-IN")}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Approval Status</span>
                <span className="text-slate-300 block mt-0.5 font-semibold">
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Resubmit or Provide Additional Info Form if Needed */}
          {(currentStatus === "INFO_REQUESTED" || currentStatus === "REJECTED") && (
            <form onSubmit={handleSubmitRequestedInfo} className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <FileText className="h-4 w-4" />
                <span>Update Application Details & Resubmit</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                    GSTIN (15-character number)
                  </label>
                  <input
                    type="text"
                    value={updatedGstin}
                    onChange={(e) => setUpdatedGstin(e.target.value)}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                    Complete Shop Address
                  </label>
                  <input
                    type="text"
                    value={updatedAddress}
                    onChange={(e) => setUpdatedAddress(e.target.value)}
                    placeholder="Shop number, market road, landmark"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                    Message / Explanation for Super Admin
                  </label>
                  <textarea
                    rows={2}
                    value={additionalNote}
                    onChange={(e) => setAdditionalNote(e.target.value)}
                    placeholder="Provide clarification or details requested by the admin..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingInfo}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold gap-2 py-2.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmittingInfo ? "Submitting..." : "Submit Updated Information"}</span>
              </Button>
            </form>
          )}

          {/* Action Navigation */}
          <div className="space-y-3 pt-2">
            {currentStatus === "APPROVED" || currentStatus === "ACTIVE" ? (
              <Button
                onClick={() => router.push("/subscriptions")}
                disabled={isRedirecting}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                <span>{isRedirecting ? "Redirecting..." : "Proceed to Select Membership Plan"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => checkStatus(true)}
                disabled={isRefreshing}
                variant="outline"
                className="w-full py-3 border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
                <span>{isRefreshing ? "Checking Supabase..." : "Check Approval Status"}</span>
              </Button>
            )}

            {statusMessage && (
              <p className="text-center text-[11px] text-indigo-400 font-medium animate-in fade-in">
                {statusMessage}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              <span>Logged in as {currentShop.email}</span>
              <button
                onClick={() => signOutUser().then(() => router.push("/login"))}
                className="hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
