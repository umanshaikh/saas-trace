import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { verifyTenantAccess, verifySubscriptionAccess, memorySubscriptionStore } from "@/lib/auth/serverAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      return NextResponse.json({ error: "shopId parameter required" }, { status: 400 });
    }

    const auth = await verifyTenantAccess(req, shopId);
    if (!auth.authorized) {
      return auth.response!;
    }

    const subCheck = await verifySubscriptionAccess(shopId, req);

    // If subscription is expired in DB, update status to EXPIRED
    if (!subCheck.active && subCheck.status === "EXPIRED" && subCheck.subscription) {
      try {
        await supabase
          .from("shop_subscriptions")
          .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
          .eq("shop_id", shopId);
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      shopId,
      isActive: subCheck.active,
      status: subCheck.status,
      subscription: subCheck.subscription,
      message: subCheck.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, action } = body; // action: 'CANCEL' | 'RESUME'

    if (!shopId || !action) {
      return NextResponse.json({ error: "shopId and action ('CANCEL' | 'RESUME') are required" }, { status: 400 });
    }

    const auth = await verifyTenantAccess(req, shopId, "canManageSettings");
    if (!auth.authorized || !auth.user?.isOwner) {
      return NextResponse.json({ error: "Only Store Owners can manage subscription cancellations." }, { status: 403 });
    }

    if (action === "CANCEL") {
      const existing = memorySubscriptionStore.get(shopId);
      if (existing) {
        memorySubscriptionStore.set(shopId, { ...existing, cancel_at_period_end: true });
      }
      try {
        await supabase
          .from("shop_subscriptions")
          .update({
            cancel_at_period_end: true,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("shop_id", shopId);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: "Subscription auto-renewal cancelled. You will retain full access until the current billing period ends.",
        cancel_at_period_end: true,
      });
    }

    if (action === "RESUME") {
      const existing = memorySubscriptionStore.get(shopId);
      if (existing) {
        memorySubscriptionStore.set(shopId, { ...existing, cancel_at_period_end: false });
      }
      try {
        await supabase
          .from("shop_subscriptions")
          .update({
            cancel_at_period_end: false,
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("shop_id", shopId);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: "Subscription auto-renewal resumed successfully.",
        cancel_at_period_end: false,
      });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
