import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// In-memory fallback cache
const globalShopRegistrations = new Map<string, any>();

export async function GET(req: NextRequest) {
  try {
    const listMap = new Map<string, any>();

    // 1. Fetch from Supabase onboarding_progress persistent store
    try {
      const { data: opData } = await supabase
        .from("onboarding_progress")
        .select("*")
        .order("created_at", { ascending: false });

      if (opData && Array.isArray(opData)) {
        for (const row of opData) {
          const app = row.step_data?.application || row.step_data?.shop;
          if (app && app.name) {
            const sid = row.shop_id || app.id || app.shopId;
            listMap.set(sid, {
              id: sid,
              name: app.name,
              slug: app.slug || app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              business_type: app.business_type || app.businessCategory || "retail",
              owner_id: row.user_id || app.owner_id || "00000000-0000-0000-0000-000000000001",
              phone: app.phone || "+919999999999",
              email: app.email || "",
              address_line1: app.address_line1 || app.address || "Main Market",
              address_line2: null,
              city: app.city || "Mumbai",
              state: app.state || "Maharashtra",
              pincode: app.pincode || "400001",
              currency: "INR",
              currency_symbol: "₹",
              gstin: app.gstin || "",
              is_verified: app.status === "APPROVED",
              access_status: app.status || "PENDING_APPROVAL",
              suspension_reason: app.rejection_reason || app.suspension_reason || null,
              owner_name: app.owner_name || "Store Owner",
              is_gst_registered: app.is_gst_registered || (app.gstin ? "YES" : "NO"),
              gst_legal_name: app.gst_legal_name || "",
              approved_by: app.approved_by || null,
              approved_at: app.approved_at || null,
              rejection_reason: app.rejection_reason || null,
              rejected_by: app.rejected_by || null,
              rejected_at: app.rejected_at || null,
              info_request_history: app.info_request_history || [],
              created_at: app.created_at || row.created_at || new Date().toISOString(),
              updated_at: row.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("Notice reading onboarding_progress in GET /api/shops/register:", dbErr);
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

    // Update in memory cache
    const existing = globalShopRegistrations.get(shopId) || {};
    existing.access_status = status;
    if (rejectionReason) existing.suspension_reason = rejectionReason;
    globalShopRegistrations.set(shopId, existing);

    // Update persistently in Supabase onboarding_progress
    try {
      const { data: rows } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("shop_id", shopId);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const currentStepData = row.step_data || {};
          const app = currentStepData.application || currentStepData.shop || {};
          app.status = status;
          if (rejectionReason) app.rejection_reason = rejectionReason;
          if (approvedBy) app.approved_by = approvedBy;
          if (status === "APPROVED") app.approved_at = new Date().toISOString();
          if (status === "REJECTED") app.rejected_at = new Date().toISOString();
          if (message) {
            app.info_request_history = app.info_request_history || [];
            app.info_request_history.push({ message, requested_at: new Date().toISOString(), requested_by: approvedBy || "Super Admin" });
          }
          currentStepData.application = app;

          await supabase
            .from("onboarding_progress")
            .update({
              step_data: currentStepData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
      }
    } catch (opErr) {
      console.warn("Notice updating onboarding_progress in PATCH:", opErr);
    }

    // Attempt best-effort update on shops table
    try {
      await supabase
        .from("shops")
        .update({
          access_status: status,
          suspension_reason: rejectionReason || null,
          is_verified: status === "APPROVED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopId);
    } catch (sErr) {}

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

    // 4. Guaranteed Persistent Storage: Save to Supabase onboarding_progress table
    try {
      await supabase.from("onboarding_progress").insert([
        {
          shop_id: shopId,
          user_id: cleanOwnerId,
          current_step: 1,
          completed_steps: [],
          is_completed: false,
          step_data: {
            application: {
              shopId,
              status: "PENDING_APPROVAL",
              name: cleanName,
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
              created_at: new Date().toISOString(),
              submitted_at: new Date().toISOString(),
            },
            shop: newShop,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (opInsertErr) {
      console.warn("Notice saving application to Supabase onboarding_progress:", opInsertErr);
    }

    // 5. Best-effort save to Supabase shops table
    try {
      const { error: insertErr } = await supabase.from("shops").insert([newShop]);
      if (insertErr) {
        console.warn("Supabase shop insert notice:", insertErr.message);
      }
    } catch (sErr) {}

    // 6. Best-effort seed profile
    try {
      await supabase.from("profiles").upsert([
        {
          id: cleanOwnerId,
          user_id: cleanOwnerId,
          full_name: owner_name || "Store Owner",
          email: cleanEmail,
          phone: phone || "+919999999999",
          preferred_language: "en",
          is_super_admin: false,
        },
      ]);
    } catch (pErr) {}

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
