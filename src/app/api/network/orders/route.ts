import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    let query = supabase.from("network_orders").select("*, network_order_items(*)");

    if (shopId) {
      query = query.or(`buyer_shop_id.eq.${shopId},supplier_shop_id.eq.${shopId}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      buyerShopId,
      supplierShopId,
      items,
      deliveryType = "PICKUP",
      notes,
    } = body;

    if (!buyerShopId || !supplierShopId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "buyerShopId, supplierShopId, and items array are required" },
        { status: 400 }
      );
    }

    const subtotalPaise = items.reduce(
      (sum: number, it: any) => sum + (it.lineTotalPaise || it.unitPricePaise * it.quantity),
      0
    );

    const orderId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `net_${Date.now()}`;

    const orderNumber = `NET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      buyer_shop_id: buyerShopId,
      supplier_shop_id: supplierShopId,
      status: "PENDING",
      delivery_type: deliveryType,
      subtotal_paise: subtotalPaise,
      notes: notes || "B2B Network Stock Reservation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: orderErr } = await supabase.from("network_orders").insert([newOrder]);
    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    const itemRows = items.map((it: any) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `net_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      network_order_id: orderId,
      product_id: it.productId || null,
      product_name: it.productName,
      unit_price_paise: it.unitPricePaise,
      quantity: it.quantity,
      line_total_paise: it.lineTotalPaise || it.unitPricePaise * it.quantity,
    }));

    if (itemRows.length > 0) {
      await supabase.from("network_order_items").insert(itemRows);
    }

    return NextResponse.json({
      success: true,
      order: {
        ...newOrder,
        items: itemRows,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
    }

    // Fetch order with items
    const { data: order, error: fetchErr } = await supabase
      .from("network_orders")
      .select("*, network_order_items(*)")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status
    const { data: updated, error: updErr } = await supabase
      .from("network_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // CRITICAL: When order reaches COMPLETED status, transfer inventory quantities between shops
    if (status === "COMPLETED") {
      const items = order.network_order_items || [];

      for (const item of items) {
        // 1. If product_id exists on supplier, decrement supplier stock
        if (item.product_id) {
          try {
            const { data: prod } = await supabase
              .from("products")
              .select("current_stock, name")
              .eq("id", item.product_id)
              .single();

            if (prod) {
              const newSupStock = Math.max(0, (prod.current_stock || 0) - item.quantity);
              await supabase
                .from("products")
                .update({ current_stock: newSupStock })
                .eq("id", item.product_id);

              await supabase.from("stock_movements").insert([
                {
                  id: `mov_net_out_${Date.now()}`,
                  shop_id: order.supplier_shop_id,
                  product_id: item.product_id,
                  movement_type: "NETWORK_OUT",
                  quantity: -item.quantity,
                  reference_id: order.order_number,
                  notes: `B2B Order fulfilled to buyer shop ${order.buyer_shop_id}`,
                  created_at: new Date().toISOString(),
                },
              ]);
            }
          } catch (e) {
            console.warn("Supplier stock decrement notice:", e);
          }
        }

        // 2. Increment stock in buyer's shop for product with matching name or SKU
        try {
          const { data: buyerProd } = await supabase
            .from("products")
            .select("id, current_stock")
            .eq("shop_id", order.buyer_shop_id)
            .ilike("name", item.product_name)
            .single();

          if (buyerProd) {
            const newBuyerStock = (buyerProd.current_stock || 0) + item.quantity;
            await supabase
              .from("products")
              .update({ current_stock: newBuyerStock })
              .eq("id", buyerProd.id);

            await supabase.from("stock_movements").insert([
              {
                id: `mov_net_in_${Date.now()}`,
                shop_id: order.buyer_shop_id,
                product_id: buyerProd.id,
                movement_type: "NETWORK_IN",
                quantity: item.quantity,
                reference_id: order.order_number,
                notes: `B2B Shipment received from supplier in order ${order.order_number}`,
                created_at: new Date().toISOString(),
              },
            ]);
          }
        } catch (e) {
          console.warn("Buyer stock increment notice:", e);
        }
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
