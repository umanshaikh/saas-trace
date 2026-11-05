import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { enforcePermission } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const query = searchParams.get("q");
    const categoryId = searchParams.get("categoryId");

    let dbQuery = supabase.from("products").select("*, category:categories(*)");

    if (shopId) {
      dbQuery = dbQuery.eq("shop_id", shopId);
    }

    if (categoryId && categoryId !== "ALL") {
      dbQuery = dbQuery.eq("category_id", categoryId);
    }

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,barcode.ilike.%${query}%,sku.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const permCheck = enforcePermission(req, "canEditInventory", body.role);
    if (!permCheck.authorized) {
      return permCheck.response!;
    }

    const {
      shopId,
      name,
      categoryId,
      barcode,
      sku,
      unit = "pcs",
      purchasePricePaise = 0,
      costPricePaise = 0,
      sellingPricePaise,
      currentStock = 0,
      lowStockThreshold = 5,
      taxRatePercent = 0,
      hsnCode = "0000",
      imageUrl,
      isSharedToNetwork = false,
      networkSellingPricePaise,
    } = body;

    if (!shopId || !name || sellingPricePaise === undefined) {
      return NextResponse.json(
        { error: "shopId, name, and sellingPricePaise are required" },
        { status: 400 }
      );
    }

    const finalCost = purchasePricePaise || costPricePaise || 0;
    const prodId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}`;
    const finalBarcode = barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    const finalSku = sku || `SKU-${Date.now().toString().slice(-6)}`;

    const newProduct = {
      id: prodId,
      shop_id: shopId,
      category_id: categoryId || null,
      name: name.trim(),
      barcode: finalBarcode,
      sku: finalSku,
      unit,
      purchase_price_paise: finalCost,
      selling_price_paise: Number(sellingPricePaise),
      current_stock: Number(currentStock),
      low_stock_threshold: Number(lowStockThreshold),
      tax_rate_percent: Number(taxRatePercent),
      hsn_code: hsnCode,
      image_url: imageUrl || null,
      is_shared_to_network: Boolean(isSharedToNetwork),
      network_selling_price_paise: networkSellingPricePaise ? Number(networkSellingPricePaise) : null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("products").insert([newProduct]).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data || newProduct });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const permCheck = enforcePermission(req, "canEditInventory", body.role);
    if (!permCheck.authorized) {
      return permCheck.response!;
    }

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Product id is required for update" }, { status: 400 });
    }

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.purchasePricePaise !== undefined) dbUpdates.purchase_price_paise = Number(updates.purchasePricePaise);
    if (updates.costPricePaise !== undefined) dbUpdates.purchase_price_paise = Number(updates.costPricePaise);
    if (updates.sellingPricePaise !== undefined) dbUpdates.selling_price_paise = Number(updates.sellingPricePaise);
    if (updates.currentStock !== undefined) dbUpdates.current_stock = Number(updates.currentStock);
    if (updates.stockQuantity !== undefined) dbUpdates.current_stock = Number(updates.stockQuantity);
    if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = Number(updates.lowStockThreshold);
    if (updates.taxRatePercent !== undefined) dbUpdates.tax_rate_percent = Number(updates.taxRatePercent);
    if (updates.hsnCode !== undefined) dbUpdates.hsn_code = updates.hsnCode;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.isSharedToNetwork !== undefined) dbUpdates.is_shared_to_network = Boolean(updates.isSharedToNetwork);
    if (updates.networkSellingPricePaise !== undefined) dbUpdates.network_selling_price_paise = Number(updates.networkSellingPricePaise);
    if (updates.isActive !== undefined) dbUpdates.is_active = Boolean(updates.isActive);
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("products").update(dbUpdates).eq("id", id).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const permCheck = enforcePermission(req, "canDeleteProducts");
    if (!permCheck.authorized) {
      return permCheck.response!;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    // Safety check: is this product referenced by invoice items?
    const { count, error: countErr } = await supabase
      .from("invoice_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);

    if (!countErr && count && count > 0) {
      // Soft-delete to preserve invoice audit history!
      await supabase.from("products").update({ is_active: false }).eq("id", id);
      return NextResponse.json({
        success: true,
        softDeleted: true,
        message: "Product is referenced by previous invoices. Deactivated safely without breaking sales history.",
      });
    }

    // Hard-delete if never billed
    const { error: delErr } = await supabase.from("products").delete().eq("id", id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Product deleted completely" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
