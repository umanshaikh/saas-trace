"use client";

import React, { useState, useEffect } from "react";
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

  // Additional info form state
  const [additionalNote, setAdditionalNote] = useState("");
  const [updatedGstin, setUpdatedGstin] = useState(activeShop.gstin || "");
  const [updatedAddress, setUpdatedAddress] = useState(activeShop.address_line1 || "");
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);

  // Parse metadata from qr_code_payload if present
  let metadata: any = {};
  try {
    if (currentShop.qr_code_payload && currentShop.qr_code_payload.startsWith("{")) {
      metadata = JSON.parse(currentShop.qr_code_payload);
    }
  } catch (e) {}

  const currentStatus = currentShop.access_status || "PENDING_APPROVAL";

  // Real-time status refresh from Supabase
  const checkStatus = async () => {
    setIsRefreshing(true);
    setStatusMessage(null);
    try {
      let latestShop: any = null;
      try {
        const { data, error } = await supabase
          .from("shops")
          .select("*")
          .eq("id", currentShop.id)
          .maybeSingle();
        if (!error && data) latestShop = data;
      } catch (e) {}

      // Fallback check in persistent profiles application store
      if (!latestShop) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("*")
            .like("avatar_url", `APP:%${currentShop.id}%`)
            .maybeSingle();
          if (profs?.avatar_url) {
            const app = JSON.parse(profs.avatar_url.substring(4));
            latestShop = {
              ...currentShop,
              access_status: app.status || "PENDING_APPROVAL",
              suspension_reason: app.rejection_reason || null,
              qr_code_payload: JSON.stringify(app),
            };
          }
        } catch (e) {}
      }

      if (latestShop) {
        setCurrentShop(latestShop);
        updateActiveShop(latestShop);

        if (latestShop.access_status === "APPROVED" || latestShop.access_status === "ACTIVE") {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          setStatusMessage("Congratulations! Your shop application has been APPROVED.");
        } else if (latestShop.access_status === "REJECTED") {
          setStatusMessage("Your application review has concluded. Status: REJECTED.");
        } else if (latestShop.access_status === "INFO_REQUESTED") {
          setStatusMessage("Action Required: Super Admin has requested additional details.");
        } else {
          setStatusMessage("Status refreshed. Application is currently under review.");
        }
      }
    } catch (err: any) {
      console.warn("Status check notice:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time subscription to status changes via Supabase Realtime
  useEffect(() => {
    checkStatus();

    const channel = supabase
      .channel(`shop_status_${currentShop.id}`)
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
            setCurrentShop(payload.new);
            updateActiveShop(payload.new);
            if (payload.new.access_status === "APPROVED" || payload.new.access_status === "ACTIVE") {
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShop.id]);

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

      await supabase.from("shops").update(updates).eq("id", currentShop.id);
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
            <TraceLogo size="xl" showTag tagText="ONBOARDING" linkTo="/" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Shop Registration Status
          </h1>
          <p className="text-xs text-slate-400">
            Platform Security & Verification Gateway
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
                  Your shop has been successfully verified and approved by the TRACE Platform Administration. You may now proceed to select your membership plan to unlock your billing counter.
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
                  {currentShop.suspension_reason ||
                    "Our review team requires additional details regarding your store or GST documentation before approving."}
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
                <span className="text-slate-500 block text-[10px]">Verification Gate</span>
                <span className="text-slate-300 block mt-0.5">
                  Super Admin Manual Review
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
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                <span>Proceed to Select Membership Plan</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={checkStatus}
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
