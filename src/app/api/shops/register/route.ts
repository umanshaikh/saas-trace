import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// In-memory cross-node fallback registry for active deployment sync
export const globalShopRegistrations = new Map<string, any>();

export async function GET(req: NextRequest) {
  try {
    const list = Array.from(globalShopRegistrations.values());
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
    const { shopId, status, rejectionReason, approvedBy } = body;
    if (!shopId || !status) {
      return NextResponse.json({ error: "shopId and status required" }, { status: 400 });
    }
    const existing = globalShopRegistrations.get(shopId);
    if (existing) {
      existing.access_status = status;
      if (rejectionReason) existing.suspension_reason = rejectionReason;
      let meta: any = {};
      try {
        if (existing.qr_code_payload) meta = JSON.parse(existing.qr_code_payload);
      } catch (e) {}
      if (approvedBy) meta.approved_by = approvedBy;
      if (rejectionReason) meta.rejection_reason = rejectionReason;
      existing.qr_code_payload = JSON.stringify(meta);
      globalShopRegistrations.set(shopId, existing);
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

    // 2. Prevent duplicate shop registrations
    try {
      const { data: existingShop } = await supabase
        .from("shops")
        .select("*")
        .ilike("name", cleanName)
        .or(`email.eq.${cleanEmail},owner_id.eq.${cleanOwnerId}`)
        .maybeSingle();

      if (existingShop) {
        return NextResponse.json({
          success: true,
          shop: existingShop,
          status: existingShop.access_status || "PENDING_APPROVAL",
          isDuplicate: true,
          message: "Shop registration already exists in TRACE.",
        });
      }
    } catch (checkErr) {
      console.warn("Notice checking duplicate shop:", checkErr);
    }

    // 3. Construct new shop record with initial status PENDING_APPROVAL
    const shopId = body.shopId || `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const slug =
      cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
      `shop-${Date.now()}`;

    const metadataPayload = JSON.stringify({
      owner_name: owner_name || "Store Owner",
      is_gst_registered: gstRegBool ? "YES" : "NO",
      gst_legal_name: cleanLegalName,
      submitted_at: new Date().toISOString(),
      application_status: "PENDING_APPROVAL",
    });

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
      access_status: "PENDING_APPROVAL", // Mandatory initial status
      suspension_reason: null,
      qr_code_payload: metadataPayload,
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in global registration registry
    globalShopRegistrations.set(shopId, newShop);

    // 4. Save to Supabase shops table
    const { error: insertErr } = await supabase.from("shops").insert([newShop]);
    if (insertErr) {
      console.warn("Supabase shop insert notice:", insertErr.message);
    }

    // 5. Create membership record for the owner
    try {
      await supabase.from("memberships").upsert(
        [
          {
            id: `mem_${shopId}_owner`,
            shop_id: shopId,
            profile_id: cleanOwnerId,
            role: "OWNER",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: "shop_id,profile_id" }
      );
    } catch (memErr) {
      console.warn("Membership seed notice:", memErr);
    }

    // 6. Generate Super Admin Notification
    const adminNotification = {
      id: `notif_app_${shopId}`,
      shop_id: shopId,
      recipient_profile_id: null, // Broadcast to platform administrators
      title: "NEW SHOP REGISTRATION",
      message: `A new shop has registered on TRACE and is waiting for your approval.`,
      type: "NEW_SHOP_REGISTRATION",
      action_url: `/shops?applicationId=${shopId}`,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("notifications").insert([adminNotification]);
    } catch (notifErr) {
      console.warn("Notification insert notice:", notifErr);
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
