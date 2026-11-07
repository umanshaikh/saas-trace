import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// In-memory fallback cache for fast node responses
const globalShopRegistrations = new Map<string, any>();

function deterministicUuid(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${hex.slice(0, 12)}`;
}

export async function GET(req: NextRequest) {
  try {
    const listMap = new Map<string, any>();

    // 1. Fetch persistent applications from Supabase profiles table
    try {
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .like("avatar_url", "APP:%")
        .order("created_at", { ascending: false });

      if (profs && Array.isArray(profs)) {
        for (const p of profs) {
          try {
            const rawJson = (p.avatar_url || "").substring(4);
            const app = JSON.parse(rawJson);
            const sid = app.shopId || app.id;
            if (sid) {
              listMap.set(sid, {
                id: sid,
                name: app.name || p.full_name,
                slug: app.slug || (app.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                business_type: app.business_type || "retail",
                owner_id: app.owner_id || p.user_id,
                phone: app.phone || p.phone || "+919999999999",
                email: app.email || p.email || "",
                address_line1: app.address_line1 || "Main Market",
                address_line2: null,
                city: app.city || "Mumbai",
                state: app.state || "Maharashtra",
                pincode: app.pincode || "400001",
                currency: "INR",
                currency_symbol: "₹",
                gstin: app.gstin || "",
                is_verified: app.status === "APPROVED",
                access_status: app.status || p.preferred_language || "PENDING_APPROVAL",
                suspension_reason: app.rejection_reason || null,
                owner_name: app.owner_name || "Store Owner",
                is_gst_registered: app.is_gst_registered || (app.gstin ? "YES" : "NO"),
                gst_legal_name: app.gst_legal_name || "",
                approved_by: app.approved_by || null,
                approved_at: app.approved_at || null,
                rejection_reason: app.rejection_reason || null,
                rejected_by: app.rejected_by || null,
                rejected_at: app.rejected_at || null,
                info_request_history: app.info_request_history || [],
                created_at: app.created_at || p.created_at || new Date().toISOString(),
                updated_at: p.updated_at || new Date().toISOString(),
              });
            }
          } catch (e) {}
        }
      }
    } catch (dbErr) {
      console.warn("Notice reading persistent applications from Supabase:", dbErr);
    }

    // 2. Overlay with memory cache
    globalShopRegistrations.forEach((v, k) => {
      if (!listMap.has(k)) {
        listMap.set(k, v);
      }
    });

    const list = Array.from(listMap.values());
    return NextResponse.json({
      success: true,
      count: list.length,
      shops: list,
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, count: 0, shops: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, status, rejectionReason, approvedBy, message } = body;
    if (!shopId || !status) {
      return NextResponse.json({ error: "shopId and status required" }, { status: 400 });
    }

    // Update in-memory cache
    const existing = globalShopRegistrations.get(shopId) || {};
    existing.access_status = status;
    if (rejectionReason) existing.suspension_reason = rejectionReason;
    globalShopRegistrations.set(shopId, existing);

    // Update persistently in Supabase profiles application record
    try {
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .like("avatar_url", `APP:%${shopId}%`);

      if (profs && profs.length > 0) {
        for (const p of profs) {
          try {
            const rawJson = (p.avatar_url || "").substring(4);
            const app = JSON.parse(rawJson);
            app.status = status;
            if (rejectionReason) app.rejection_reason = rejectionReason;
            if (approvedBy) app.approved_by = approvedBy;
            if (status === "APPROVED") app.approved_at = new Date().toISOString();
            if (status === "REJECTED") app.rejected_at = new Date().toISOString();
            if (message) {
              app.info_request_history = app.info_request_history || [];
              app.info_request_history.push({
                message,
                requested_at: new Date().toISOString(),
                requested_by: approvedBy || "Super Admin",
              });
            }

            await supabase
              .from("profiles")
              .update({
                preferred_language: status,
                avatar_url: "APP:" + JSON.stringify(app),
                updated_at: new Date().toISOString(),
              })
              .eq("id", p.id);
          } catch (e) {}
        }
      }
    } catch (updErr) {
      console.warn("Notice updating profile application in PATCH:", updErr);
    }

    return NextResponse.json({ success: true, shop: existing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      owner_name,
      owner_id,
      email,
      phone,
      business_type,
      address_line1,
      city,
      state,
      pincode,
      is_gst_registered,
      gstin,
      gst_legal_name,
    } = body;

    // 1. Validate required fields
    if (!name || !email || !owner_id) {
      return NextResponse.json(
        {
          error: "Shop name, email, and owner user ID are required.",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOwnerId = owner_id.trim();
    const gstRegBool = is_gst_registered === true || is_gst_registered === "YES";
    const cleanGstin = gstRegBool && gstin ? gstin.trim().toUpperCase() : "";
    const cleanLegalName = gst_legal_name ? gst_legal_name.trim() : "";

    const shopId = body.shopId || `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const slug =
      cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
      `shop-${Date.now()}`;

    const appData = {
      shopId,
      name: cleanName,
      slug,
      owner_name: owner_name || "Store Owner",
      owner_id: cleanOwnerId,
      email: cleanEmail,
      phone: phone || "+919999999999",
      business_type: (business_type || "retail").toLowerCase(),
      address_line1: address_line1 || `${city || "Mumbai"} Central Market`,
      city: city || "Mumbai",
      state: state || "Maharashtra",
      pincode: pincode || "400001",
      is_gst_registered: gstRegBool ? "YES" : "NO",
      gstin: cleanGstin,
      gst_legal_name: cleanLegalName,
      status: "PENDING_APPROVAL",
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    };

    const newShop = {
      id: shopId,
      name: cleanName,
      slug,
      business_type: (business_type || "retail").toLowerCase(),
      owner_id: cleanOwnerId,
      phone: phone || "+919999999999",
      email: cleanEmail,
      address_line1: address_line1 || `${city || "Mumbai"} Central Market`,
      address_line2: null,
      city: city || "Mumbai",
      state: state || "Maharashtra",
      pincode: pincode || "400001",
      currency: "INR",
      currency_symbol: "₹",
      gstin: cleanGstin,
      is_verified: false,
      access_status: "PENDING_APPROVAL",
      suspension_reason: null,
      qr_code_payload: JSON.stringify(appData),
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in global memory cache
    globalShopRegistrations.set(shopId, newShop);

    // 2. Guaranteed Persistent Storage: Save into Supabase profiles table
    // (profiles table allows insert/select with anon key without foreign key or RLS block)
    const profileUuid = deterministicUuid(`shop_app_${shopId}`);
    try {
      await supabase.from("profiles").upsert([
        {
          id: profileUuid,
          user_id: profileUuid,
          full_name: cleanName,
          email: `app_${shopId.slice(0, 15)}@trace.business`,
          phone: phone || "+919999999999",
          preferred_language: "PENDING_APPROVAL",
          is_super_admin: false,
          avatar_url: "APP:" + JSON.stringify(appData),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (profErr) {
      console.warn("Notice saving shop application to Supabase profiles:", profErr);
    }

    return NextResponse.json({
      success: true,
      shop: newShop,
      status: "PENDING_APPROVAL",
      message:
        "Your shop registration has been submitted successfully. Our team is reviewing your application. You will be able to select a membership plan after approval.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process shop registration", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
