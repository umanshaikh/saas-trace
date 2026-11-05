import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";

    let query = supabase.from("suppliers").select("*").eq("is_active", true);

    if (shopId) {
      // If shopId passed, fetch shop's suppliers or network-wide verified suppliers
      query = query.or(`shop_id.eq.${shopId},is_active.eq.true`);
    }

    if (city && city !== "ALL") {
      query = query.ilike("city", `%${city}%`);
    }

    if (state && state !== "ALL") {
      query = query.ilike("state", `%${state}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suppliers: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopId,
      name,
      contactPerson,
      phone,
      email,
      gstin,
      city,
      state,
      pincode,
      address,
    } = body;

    if (!shopId || !name || !phone) {
      return NextResponse.json(
        { error: "shopId, supplier name, and phone number are required" },
        { status: 400 }
      );
    }

    const supplierId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sup_${Date.now()}`;

    const newSupplier = {
      id: supplierId,
      shop_id: shopId,
      name: name.trim(),
      contact_person: contactPerson ? contactPerson.trim() : null,
      phone: phone.trim(),
      email: email ? email.trim() : null,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : "Mumbai",
      state: state ? state.trim() : "Maharashtra",
      pincode: pincode ? pincode.trim() : "400001",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("suppliers").insert([newSupplier]).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, supplier: data || newSupplier });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierId, updates } = body;

    if (!supplierId || !updates) {
      return NextResponse.json({ error: "supplierId and updates required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", supplierId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, supplier: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
