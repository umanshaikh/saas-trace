import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { memorySubscriptionStore } from "@/lib/auth/serverAuth";

export async function GET(req: NextRequest) {
  try {
    const authKey = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "trace_cron_secret_2026";
    // Allow either super admin header, bearer secret, or internal trigger
    const isAuthorized =
      !process.env.CRON_SECRET ||
      authKey === `Bearer ${cronSecret}` ||
      req.headers.get("x-super-admin-key") === (process.env.SUPER_ADMIN_SECRET_KEY || "trace_super_admin_secret_key_2026");

    const now = new Date();
    const expiredShops: string[] = [];
    const notificationsSent: string[] = [];

    // 1. Process all in-memory subscriptions
    Array.from(memorySubscriptionStore.entries()).forEach(([shopId, sub]) => {
      const periodEnd = new Date(sub.current_period_ends_at);
      const isPast = periodEnd.getTime() < now.getTime();

      if (sub.status === "ACTIVE" && isPast) {
        sub.status = "EXPIRED";
        sub.subscription_status = "EXPIRED";
        memorySubscriptionStore.set(shopId, sub);
        expiredShops.push(shopId);
      }
    });

    // 2. Fetch database subscriptions
    try {
      const queryPromise = supabase
        .from("shop_subscriptions")
        .select("*, shop:shops(id, name, owner_id)")
        .in("status", ["ACTIVE", "EXPIRED", "CANCELLED"]);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      const { data: dbSubscriptions } = (await Promise.race([queryPromise, timeoutPromise])) as any;

      if (dbSubscriptions && Array.isArray(dbSubscriptions)) {
        for (const sub of dbSubscriptions) {
          const periodEnd = new Date(sub.current_period_ends_at);
          const diffMs = periodEnd.getTime() - now.getTime();
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          // A. Check Expiration
          if (sub.status === "ACTIVE" && diffMs <= 0) {
            sub.status = "EXPIRED";
            memorySubscriptionStore.set(sub.shop_id, sub);
            expiredShops.push(sub.shop_id);

            try {
              await supabase
                .from("shop_subscriptions")
                .update({ status: "EXPIRED", subscription_status: "EXPIRED", updated_at: now.toISOString() })
                .eq("id", sub.id);
            } catch (e) {}

            // Send Expiry Notification
            const notifId = `notif_expired_${sub.id}_${periodEnd.toISOString().split("T")[0]}`;
            try {
              await supabase.from("notifications").insert([
                {
                  id: notifId,
                  shop_id: sub.shop_id,
                  title: "Membership Expired",
                  message: "Your TRACE subscription has ended. Please renew your membership to continue managing your business and unlocking the POS counter.",
                  type: "SUBSCRIPTION_RENEWAL",
                  action_url: "/subscriptions",
                  is_read: false,
                  created_at: now.toISOString(),
                },
              ]);
              notificationsSent.push(notifId);
            } catch (e) {}
          }

          // B. 2 Days Before Expiration
          else if (sub.status === "ACTIVE" && daysRemaining <= 2 && daysRemaining > 0) {
            const notifId = `notif_warn_2d_${sub.id}_${periodEnd.toISOString().split("T")[0]}`;
            try {
              const { error } = await supabase.from("notifications").insert([
                {
                  id: notifId,
                  shop_id: sub.shop_id,
                  title: "Urgent: Membership Expiring in 2 Days",
                  message: `Your TRACE ${sub.plan_id.toUpperCase()} membership expires in ${daysRemaining} day(s). Renew now to retain uninterrupted billing and access.`,
                  type: "SUBSCRIPTION_RENEWAL",
                  action_url: "/subscriptions",
                  is_read: false,
                  created_at: now.toISOString(),
                },
              ]);
              if (!error) notificationsSent.push(notifId);
            } catch (e) {}
          }

          // C. 5 Days Before Expiration
          else if (sub.status === "ACTIVE" && daysRemaining <= 5 && daysRemaining > 2) {
            const notifId = `notif_warn_5d_${sub.id}_${periodEnd.toISOString().split("T")[0]}`;
            try {
              const { error } = await supabase.from("notifications").insert([
                {
                  id: notifId,
                  shop_id: sub.shop_id,
                  title: "Membership Renewal Notice",
                  message: `Your subscription will expire on ${periodEnd.toLocaleDateString()} (in ${daysRemaining} days). Renew early to prevent service disruption.`,
                  type: "SUBSCRIPTION_RENEWAL",
                  action_url: "/subscriptions",
                  is_read: false,
                  created_at: now.toISOString(),
                },
              ]);
              if (!error) notificationsSent.push(notifId);
            } catch (e) {}
          }
        }
      }
    } catch (e: any) {
      console.warn("Cron DB scan notice:", e?.message);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredShopsCount: expiredShops.length,
      expiredShops,
      notificationsSentCount: notificationsSent.length,
      notificationsSent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to run subscription expiry cron" }, { status: 500 });
  }
}
