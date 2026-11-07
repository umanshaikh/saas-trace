import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { verifyTenantAccess } from "@/lib/auth/serverAuth";
import { INITIAL_PLANS } from "@/lib/db/mock-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, planId, billingCycle = "MONTHLY", gateway = "RAZORPAY" } = body;

    if (!shopId || !planId) {
      return NextResponse.json(
        { error: "shopId and planId are required to initiate subscription checkout.", code: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    // 1. Verify caller is an authorized Store Owner
    const auth = await verifyTenantAccess(req, shopId, "canManageSettings");
    if (!auth.authorized) {
      return auth.response!;
    }

    if (!auth.user?.isOwner) {
      return NextResponse.json(
        { error: "Only Store Owners can initiate subscription billing and plan checkouts.", code: "OWNER_ONLY" },
        { status: 403 }
      );
    }

    // 2. CRITICAL REQUIREMENT: Strictly verify that the shop is APPROVED by Super Admin
    const { data: shopRecord, error: shopErr } = await supabase
      .from("shops")
      .select("id, name, access_status, suspension_reason")
      .eq("id", shopId)
      .maybeSingle();

    const shopStatus = shopRecord?.access_status || "PENDING_APPROVAL";

    if (shopStatus === "PENDING_APPROVAL") {
      return NextResponse.json(
        {
          error:
            "Your shop registration has been submitted successfully. Our team is reviewing your application. You will be able to select a membership plan after approval.",
          code: "SHOP_PENDING_APPROVAL",
          shop_status: "PENDING_APPROVAL",
        },
        { status: 403 }
      );
    }

    if (shopStatus === "REJECTED") {
      return NextResponse.json(
        {
          error:
            "Your shop registration was not approved. Please review the reason or contact TRACE support.",
          code: "SHOP_REJECTED",
          shop_status: "REJECTED",
          reason: shopRecord?.suspension_reason || null,
        },
        { status: 403 }
      );
    }

    if (shopStatus === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "This shop has been suspended by platform administration. Membership purchases are blocked.",
          code: "SHOP_SUSPENDED",
          shop_status: "SUSPENDED",
          reason: shopRecord?.suspension_reason || null,
        },
        { status: 403 }
      );
    }

    if (shopStatus !== "APPROVED" && shopStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          error: `Shop status "${shopStatus}" is not eligible for membership purchase. Only APPROVED shops may purchase.`,
          code: "SHOP_NOT_APPROVED",
          shop_status: shopStatus,
        },
        { status: 403 }
      );
    }

    // 3. Validate plan
    const plan = INITIAL_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json(
        { error: `Invalid subscription plan "${planId}".`, code: "INVALID_PLAN" },
        { status: 400 }
      );
    }

    // 4. Calculate authoritative price & GST
    const baseAmountPaise =
      billingCycle === "YEARLY" ? plan.yearly_price_paise : plan.monthly_price_paise;
    const taxPaise = Math.round(baseAmountPaise * 0.18); // 18% GST
    const totalAmountPaise = baseAmountPaise + taxPaise;

    const orderId = `sub_ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const idempotencyKey = `idem_${orderId}_${Math.random().toString(36).substring(2, 7)}`;

    // 5. Record pending transaction in database
    const pendingTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      shop_id: shopId,
      order_id: orderId,
      gateway: gateway || "RAZORPAY_TEST",
      plan_id: plan.id,
      billing_cycle: billingCycle,
      amount_paise: totalAmountPaise,
      currency: "INR",
      status: "PENDING",
      idempotency_key: idempotencyKey,
      metadata: {
        plan_name: plan.name,
        base_amount_paise: baseAmountPaise,
        tax_paise: taxPaise,
        user_id: auth.user.userId,
        user_email: auth.user.email,
        created_at: new Date().toISOString(),
      },
    };

    try {
      const p1 = supabase.from("payment_transactions").insert([pendingTx]);
      const timeout1 = new Promise((resolve) => setTimeout(resolve, 800));
      await Promise.race([p1, timeout1]);
    } catch (dbErr: any) {
      console.warn("Notice inserting pending transaction into Supabase:", dbErr?.message);
    }

    // 6. Ensure shop subscription status is tracked as PENDING
    try {
      const p2 = supabase.from("shop_subscriptions").upsert([
        {
          id: `sub_${shopId}`,
          shop_id: shopId,
          plan_id: plan.id,
          billing_cycle: billingCycle,
          status: "PENDING",
          starts_at: new Date().toISOString(),
          current_period_ends_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: "shop_id" });
      const timeout2 = new Promise((resolve) => setTimeout(resolve, 800));
      await Promise.race([p2, timeout2]);
    } catch (subErr: any) {
      console.warn("Notice setting pending subscription status:", subErr?.message);
    }

    return NextResponse.json({
      success: true,
      transactionId: pendingTx.id,
      orderId,
      idempotencyKey,
      totalAmountPaise,
      order: {
        orderId,
        idempotencyKey,
        shopId,
        planId: plan.id,
        planName: plan.name,
        billingCycle,
        baseAmountPaise,
        taxPaise,
        totalAmountPaise,
        currency: "INR",
        gatewayKey: process.env.RAZORPAY_KEY_ID || "rzp_test_trace_2026",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initiate subscription checkout.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
