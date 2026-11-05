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

    let query = supabase.from("categories").select("*");
    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query.order("name", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ categories: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, name, description } = body;

    if (!shopId || !name) {
      return NextResponse.json({ error: "shopId and name are required" }, { status: 400 });
    }

    // Verify tenant authorization & role permission
    const authCheck = await verifyTenantAccess(req, shopId, "canEditInventory");
    if (!authCheck.authorized) {
      return authCheck.response!;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;

    const newCategory = {
      id,
      shop_id: shopId,
      name: name.trim(),
      slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
      description: description || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("categories").insert([newCategory]).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data || newCategory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
