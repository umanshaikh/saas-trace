import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { verifyTenantAccess } from "@/lib/auth/serverAuth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (shopId) {
      const authCheck = await verifyTenantAccess(req, shopId);
      if (!authCheck.authorized) {
        return authCheck.response!;
      }
    }

    let query = supabase
      .from("stock_movements")
      .select("*, products(name, sku, unit)")
      .order("created_at", { ascending: false })
      .limit(60);

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ movements: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, shopId, quantityDelta, reason = "RESTOCK", notes } = body;

    if (!productId || quantityDelta === undefined) {
      return NextResponse.json({ error: "productId and quantityDelta are required" }, { status: 400 });
    }

    // 1. Fetch product to determine its authentic shopId
    const { data: prod, error: fetchErr } = await supabase
      .from("products")
      .select("id, name, current_stock, unit, low_stock_threshold, shop_id")
      .eq("id", productId)
      .single();

    if (fetchErr || !prod) {
      return NextResponse.json({ error: "Product not found in database" }, { status: 404 });
    }

    const targetShopId = prod.shop_id || shopId;

    // 2. Prevent cross-tenant tampering: Authoritatively verify access to this product's shop
    const authCheck = await verifyTenantAccess(req, targetShopId, "canAdjustStock", {
      requireActiveSubscription: true,
    });
    if (!authCheck.authorized) {
      return authCheck.response!;
    }

    const currentStock = prod.current_stock || 0;
    const newStock = Math.max(0, currentStock + Number(quantityDelta));

    // Update product stock
    const { error: updErr } = await supabase
      .from("products")
      .update({ current_stock: newStock })
      .eq("id", productId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Record stock movement
    const movementId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}`;
    await supabase.from("stock_movements").insert([
      {
        id: movementId,
        shop_id: shopId || "shop_default",
        product_id: productId,
        movement_type: reason,
        quantity: quantityDelta,
        notes: notes || `Manual stock adjustment: ${quantityDelta > 0 ? "+" : ""}${quantityDelta} ${prod.unit || "pcs"}`,
        created_at: new Date().toISOString(),
      },
    ]);

    // Check low stock trigger
    let isLowStock = false;
    if (newStock <= (prod.low_stock_threshold || 5)) {
      isLowStock = true;
      await supabase.from("notifications").insert([
        {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`,
          shop_id: shopId || "shop_default",
          title: `Low Stock Alert: ${prod.name}`,
          message: `Stock level dropped to ${newStock} ${prod.unit || "pcs"}. Please restock soon.`,
          type: "LOW_STOCK",
          action_url: "/inventory",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      productId,
      previousStock: currentStock,
      newStock,
      isLowStock,
      message: `Stock updated successfully to ${newStock}`,
    });
  } catch (err: any) {
    console.error("Stock adjustment error:", err);
    return NextResponse.json({ error: err.message || "Failed to adjust stock" }, { status: 500 });
  }
}
