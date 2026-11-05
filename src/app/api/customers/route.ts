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

    let query = supabase.from("customers").select("*");
    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ customers: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopId,
      fullName,
      name,
      phone,
      email,
      address,
      creditLimitPaise = 1000000, // ₹10,000 default
    } = body;

    const finalName = fullName || name;
    if (!shopId || !finalName || !phone) {
      return NextResponse.json({ error: "shopId, fullName, and phone are required" }, { status: 400 });
    }

    // Verify tenant authorization
    const authCheck = await verifyTenantAccess(req, shopId);
    if (!authCheck.authorized) {
      return authCheck.response!;
    }

    const custId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `cust_${Date.now()}`;

    const newCust = {
      id: custId,
      shop_id: shopId,
      full_name: finalName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      address: address ? address.trim() : null,
      credit_limit_paise: Number(creditLimitPaise),
      total_outstanding_paise: 0,
      credit_status: "GOOD",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("customers").insert([newCust]).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer: data || newCust });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
