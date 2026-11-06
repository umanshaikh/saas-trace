import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { memorySubscriptionStore } from "@/lib/auth/serverAuth";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "superadmin@trace.business";

export async function GET(req: NextRequest) {
  try {
    // Authenticate super admin
    const adminKey = req.headers.get("x-super-admin-key");
    const userRole = req.headers.get("x-user-role");
    const userEmail = req.headers.get("x-user-email");

    const isAuthorizedAdmin =
      adminKey === (process.env.SUPER_ADMIN_SECRET_KEY || "trace_super_admin_secret_key_2026") ||
      userEmail === SUPER_ADMIN_EMAIL ||
      userRole === "SUPER_ADMIN";

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: "Access Denied: Super Admin privileges required to access platform subscription management.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // 1. Fetch all shops
    const { data: shops } = await supabase.from("shops").select("*").order("created_at", { ascending: false });

    // 2. Fetch all subscriptions
    const { data: subscriptions } = await supabase.from("shop_subscriptions").select("*");

    // 3. Fetch payment transactions
    const { data: transactions } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(100);

    // 4. Fetch subscription invoices
    const { data: invoices } = await supabase.from("subscription_invoices").select("*").order("created_at", { ascending: false }).limit(100);

    // 5. Fetch audit logs
    const { data: auditLogs } = await supabase.from("subscription_audit_logs").select("*").order("created_at", { ascending: false }).limit(50);

    // 6. Compute platform metrics
    const activeSubscribers = (subscriptions || []).filter((s: any) => s.status === "ACTIVE").length;
    const pendingSubscribers = (subscriptions || []).filter((s: any) => s.status === "PENDING").length;
    const expiredSubscribers = (subscriptions || []).filter((s: any) => s.status === "EXPIRED").length;
    const cancelledSubscribers = (subscriptions || []).filter((s: any) => s.status === "CANCELLED").length;

    const totalRevenuePaise = (transactions || [])
      .filter((t: any) => t.status === "SUCCESS")
      .reduce((sum: number, t: any) => sum + (Number(t.amount_paise) || 0), 0);

    const mrrPaise = (subscriptions || [])
      .filter((s: any) => s.status === "ACTIVE")
      .reduce((sum: number, s: any) => {
        if (s.plan_id === "starter") return sum + 9900;
        if (s.plan_id === "pro") return sum + 19900;
        if (s.plan_id === "enterprise") return sum + 49900;
        return sum + 9900;
      }, 0);

    return NextResponse.json({
      success: true,
      metrics: {
        activeSubscribers,
        pendingSubscribers,
        expiredSubscribers,
        cancelledSubscribers,
        totalShops: (shops || []).length,
        totalRevenuePaise,
        mrrPaise,
      },
      shops: shops || [],
      subscriptions: subscriptions || [],
      transactions: transactions || [],
      invoices: invoices || [],
      auditLogs: auditLogs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch admin subscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get("x-super-admin-key");
    const userEmail = req.headers.get("x-user-email") || SUPER_ADMIN_EMAIL;

    const isAuthorizedAdmin =
      adminKey === (process.env.SUPER_ADMIN_SECRET_KEY || "trace_super_admin_secret_key_2026") ||
      userEmail === SUPER_ADMIN_EMAIL;

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: "Access Denied: Super Admin privileges required.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { shopId, action, planId = "pro", extendDays = 30, reason } = body;

    if (!shopId || !action || !reason) {
      return NextResponse.json(
        { error: "shopId, action, and an audit reason are required for manual subscription modifications.", code: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    // Fetch existing subscription
    const { data: existingSub } = await supabase
      .from("shop_subscriptions")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();

    const currentEnd = existingSub?.current_period_ends_at
      ? new Date(existingSub.current_period_ends_at).getTime()
      : Date.now();
    const baseTime = Math.max(Date.now(), currentEnd);

    let newStatus = existingSub?.status || "ACTIVE";
    let newPeriodEnd = existingSub?.current_period_ends_at || new Date(Date.now() + 30 * 86400000).toISOString();
    let newPlanId = existingSub?.plan_id || planId;

    if (action === "ACTIVATE") {
      newStatus = "ACTIVE";
      newPeriodEnd = new Date(baseTime + extendDays * 86400000).toISOString();
      newPlanId = planId;
    } else if (action === "EXTEND") {
      newStatus = "ACTIVE";
      newPeriodEnd = new Date(baseTime + extendDays * 86400000).toISOString();
    } else if (action === "CHANGE_PLAN") {
      newPlanId = planId;
    } else if (action === "CANCEL") {
      newStatus = "CANCELLED";
    }

    // Apply update to shop_subscriptions
    const updatedSub = {
      id: existingSub?.id || `sub_${shopId}`,
      shop_id: shopId,
      plan_id: newPlanId,
      billing_cycle: existingSub?.billing_cycle || "MONTHLY",
      status: newStatus,
      starts_at: existingSub?.starts_at || new Date().toISOString(),
      current_period_ends_at: newPeriodEnd,
      cancel_at_period_end: newStatus === "CANCELLED",
      updated_at: new Date().toISOString(),
    };

    memorySubscriptionStore.set(shopId, updatedSub as any);

    try {
      const p1 = supabase.from("shop_subscriptions").upsert([updatedSub], { onConflict: "shop_id" });
      const timeout1 = new Promise((resolve) => setTimeout(resolve, 800));
      await Promise.race([p1, timeout1]);
    } catch (e: any) {
      console.warn("Notice updating shop subscription:", e?.message);
    }

    // Record immutable audit log
    const auditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      admin_email: userEmail,
      target_shop_id: shopId,
      action_type: `MANUAL_${action}`,
      previous_status: existingSub?.status || "NONE",
      new_status: newStatus,
      previous_plan_id: existingSub?.plan_id || "NONE",
      new_plan_id: newPlanId,
      reason,
      details: {
        extendDays,
        previous_period_end: existingSub?.current_period_ends_at,
        new_period_end: newPeriodEnd,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    try {
      const p2 = supabase.from("subscription_audit_logs").insert([auditRecord]);
      const timeout2 = new Promise((resolve) => setTimeout(resolve, 800));
      await Promise.race([p2, timeout2]);
    } catch (e: any) {
      console.warn("Notice saving admin audit log:", e?.message);
    }

    return NextResponse.json({
      success: true,
      message: `Subscription for shop "${shopId}" updated: Status=${newStatus}, Plan=${newPlanId}.`,
      subscription: updatedSub,
      audit: auditRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute admin action" }, { status: 500 });
  }
}
