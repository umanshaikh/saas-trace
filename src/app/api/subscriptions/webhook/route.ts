import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers.get("x-razorpay-signature") || req.headers.get("x-webhook-signature");

    // 1. Verify Webhook Signature if secret configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const event = payload.event || payload.type;
    const paymentEntity = payload.payload?.payment?.entity || payload.data?.payment;
    const orderId = paymentEntity?.order_id || payload.order_id;
    const shopId = paymentEntity?.notes?.shop_id || payload.shop_id;

    if (!orderId && !shopId) {
      return NextResponse.json({ message: "Webhook acknowledged (no matching order)" }, { status: 200 });
    }

    // 2. Handle Payment Captured
    if (event === "payment.captured" || event === "order.paid" || event === "PAYMENT_SUCCESS") {
      const paymentId = paymentEntity?.id || `pay_${Date.now()}`;
      const amountPaise = paymentEntity?.amount || 9900;
      const planId = paymentEntity?.notes?.plan_id || "starter";
      const billingCycle = paymentEntity?.notes?.billing_cycle || "MONTHLY";
      const durationDays = billingCycle === "YEARLY" ? 365 : 30;

      // Update transaction status
      try {
        await supabase
          .from("payment_transactions")
          .update({
            status: "SUCCESS",
            payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);
      } catch (e) {}

      // Activate shop subscription
      if (shopId) {
        try {
          await supabase.from("shop_subscriptions").upsert([
            {
              id: `sub_${shopId}`,
              shop_id: shopId,
              plan_id: planId,
              billing_cycle: billingCycle,
              status: "ACTIVE",
              starts_at: new Date().toISOString(),
              current_period_ends_at: new Date(Date.now() + durationDays * 86400000).toISOString(),
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
          ], { onConflict: "shop_id" });
        } catch (e) {}
      }
    }

    // 3. Handle Payment Failed
    if (event === "payment.failed" || event === "PAYMENT_FAILED") {
      try {
        await supabase
          .from("payment_transactions")
          .update({
            status: "FAILED",
            error_message: paymentEntity?.error_description || "Payment failed at gateway",
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);

        if (shopId) {
          await supabase
            .from("shop_subscriptions")
            .update({
              status: "PAYMENT_FAILED",
              updated_at: new Date().toISOString(),
            })
            .eq("shop_id", shopId);
        }
      } catch (e) {}
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 500 });
  }
}
