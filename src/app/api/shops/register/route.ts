import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (shopId) {
      const { data: shop, error } = await supabaseAdmin
        .from("shops")
        .select("*, owner:profiles(full_name, email, phone)")
        .eq("id", shopId)
        .maybeSingle();

      if (error || !shop) {
        return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
      }

      let meta: any = {};
      try {
        if (shop.qr_code_payload && shop.qr_code_payload.startsWith("{")) {
          meta = JSON.parse(shop.qr_code_payload);
        }
      } catch (e) {}

      return NextResponse.json({
        success: true,
        shop: {
          ...shop,
          owner_name: meta.owner_name || shop.owner?.full_name || "Store Owner",
          is_gst_registered: meta.is_gst_registered || (shop.gstin ? "YES" : "NO"),
          gst_legal_name: meta.gst_legal_name || "",
          approved_by: meta.approved_by || null,
          approved_at: meta.approved_at || null,
          rejection_reason: shop.suspension_reason || meta.rejection_reason || null,
          rejected_by: meta.rejected_by || null,
          rejected_at: meta.rejected_at || null,
          info_request_history: meta.info_request_history || [],
        },
      });
    }

    // Fetch all shops directly from Supabase shops table using elevated service_role privileges
    const { data: allShops, error } = await supabaseAdmin
      .from("shops")
      .select("*, owner:profiles(full_name, email, phone)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice fetching shops in GET /api/shops/register:", error.message);
      return NextResponse.json({ success: true, count: 0, shops: [] });
    }

    const enhanced = (allShops || []).map((shop: any) => {
      let meta: any = {};
      try {
        if (shop.qr_code_payload && shop.qr_code_payload.startsWith("{")) {
          meta = JSON.parse(shop.qr_code_payload);
        }
      } catch (e) {}

      return {
        ...shop,
        owner_name: meta.owner_name || shop.owner?.full_name || "Store Owner",
        is_gst_registered: meta.is_gst_registered || (shop.gstin ? "YES" : "NO"),
        gst_legal_name: meta.gst_legal_name || "",
        approved_by: meta.approved_by || null,
        approved_at: meta.approved_at || null,
        rejection_reason: shop.suspension_reason || meta.rejection_reason || null,
        rejected_by: meta.rejected_by || null,
        rejected_at: meta.rejected_at || null,
        info_request_history: meta.info_request_history || [],
      };
    });

    return NextResponse.json({
      success: true,
      count: enhanced.length,
      shops: enhanced,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, status, rejectionReason, approvedBy, message } = body;

    if (!shopId || !status) {
      return NextResponse.json({ error: "shopId and status required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const executingAdmin = approvedBy || "superadmin@trace.business";

    // 1. Fetch current shop record
    const { data: currentShop, error: fetchErr } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .maybeSingle();

    if (fetchErr || !currentShop) {
      return NextResponse.json(
        { error: `Shop "${shopId}" not found in database.`, code: "SHOP_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2. Parse existing metadata
    let metadata: any = {};
    try {
      if (currentShop.qr_code_payload && currentShop.qr_code_payload.startsWith("{")) {
        metadata = JSON.parse(currentShop.qr_code_payload);
      }
    } catch (e) {}

    // 3. Update status & metadata
    metadata.application_status = status;
    metadata.last_updated_at = nowIso;

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationType = "";
    let notificationUrl = "/registration-status";

    if (status === "APPROVED") {
      metadata.approved_by = executingAdmin;
      metadata.approved_at = nowIso;
      metadata.rejection_reason = null;

      notificationTitle = "SHOP APPLICATION APPROVED";
      notificationMessage =
        "Your shop application has been approved by TRACE Platform Administration. You can now select a membership plan to unlock your shop dashboard.";
      notificationType = "SHOP_APPROVED";
      notificationUrl = "/subscriptions";
    } else if (status === "REJECTED") {
      metadata.rejected_by = executingAdmin;
      metadata.rejected_at = nowIso;
      metadata.rejection_reason = rejectionReason || "Application did not meet registration criteria.";

      notificationTitle = "SHOP APPLICATION REJECTED";
      notificationMessage = `Your shop registration was not approved. Reason: ${rejectionReason || "Requirements not met."}`;
      notificationType = "SHOP_REJECTED";
      notificationUrl = "/registration-status";
    } else if (status === "INFO_REQUESTED") {
      metadata.info_request_history = metadata.info_request_history || [];
      metadata.info_request_history.push({
        requested_by: executingAdmin,
        requested_at: nowIso,
        note: message || rejectionReason || "Additional verification details required.",
      });
      metadata.latest_info_request = message || rejectionReason;

      notificationTitle = "ADDITIONAL INFORMATION REQUIRED";
      notificationMessage = `Action Required by TRACE Admin: ${message || rejectionReason}`;
      notificationType = "INFO_REQUESTED";
      notificationUrl = "/registration-status";
    } else if (status === "SUSPENDED") {
      metadata.suspended_by = executingAdmin;
      metadata.suspended_at = nowIso;
      metadata.suspension_reason = rejectionReason;

      notificationTitle = "STORE SUSPENDED";
      notificationMessage = `Your store has been suspended by TRACE Admin. Reason: ${rejectionReason || "Policy compliance review"}`;
      notificationType = "STORE_SUSPENDED";
      notificationUrl = "/registration-status";
    }

    // 4. Update the exact shops table record in Supabase using service_role privileges
    const { data: updatedShop, error: updateErr } = await supabaseAdmin
      .from("shops")
      .update({
        access_status: status,
        is_verified: status === "APPROVED",
        suspension_reason: status === "REJECTED" || status === "SUSPENDED" ? rejectionReason : null,
        qr_code_payload: JSON.stringify(metadata),
        updated_at: nowIso,
      })
      .eq("id", shopId)
      .select()
      .single();

    if (updateErr) {
      console.error("Supabase shop update failed in PATCH /api/shops/register:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 5. Insert notification for the shop owner
    if (notificationTitle && currentShop.owner_id) {
      try {
        await supabaseAdmin.from("notifications").insert([
          {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            shop_id: shopId,
            recipient_profile_id: currentShop.owner_id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            action_url: notificationUrl,
            is_read: false,
            created_at: nowIso,
          },
        ]);
      } catch (notifErr) {
        console.warn("Notice inserting notification:", notifErr);
      }
    }

    // 6. Record in admin_action_logs audit table
    try {
      await supabaseAdmin.from("admin_action_logs").insert([
        {
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          admin_email: executingAdmin,
          action_type: `${status}_SHOP`,
          target_shop_id: shopId,
          reason: rejectionReason || `Shop status updated to ${status}`,
          details: {
            previous_status: currentShop.access_status,
            new_status: status,
            shop_id: shopId,
            admin: executingAdmin,
            timestamp: nowIso,
          },
          created_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn("Notice inserting admin audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      shop: updatedShop,
      status,
      message: `Shop ${shopId} successfully updated to ${status}.`,
    });
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
      const { data: existingShop } = await supabaseAdmin
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

    // 3. Ensure owner profile exists in profiles table so foreign key constraint is satisfied
    let profileId = cleanOwnerId;
    try {
      const { data: existingProf } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingProf) {
        profileId = existingProf.id;
      } else {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUserId = UUID_REGEX.test(cleanOwnerId) ? cleanOwnerId : null;

        const { data: newProf, error: pErr } = await supabaseAdmin
          .from("profiles")
          .upsert(
            [
              {
                id: cleanOwnerId,
                user_id: validUserId,
                full_name: owner_name || "Store Owner",
                email: cleanEmail,
                phone: phone || "+919999999999",
                preferred_language: "en",
                is_super_admin: false,
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: "id" }
          )
          .select()
          .maybeSingle();

        if (newProf) profileId = newProf.id;
      }
    } catch (pErr) {
      console.warn("Notice ensuring profile exists:", pErr);
    }

    // 4. Construct new shop record with initial status PENDING_APPROVAL
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
      owner_id: profileId,
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

    // 5. Authoritatively save to Supabase shops table using service_role privileges
    const { data: insertedShop, error: insertErr } = await supabaseAdmin
      .from("shops")
      .insert([newShop])
      .select()
      .single();

    if (insertErr) {
      console.error("Supabase shop insert error in POST /api/shops/register:", insertErr);
      return NextResponse.json(
        { error: `Database insert failed: ${insertErr.message}`, code: insertErr.code },
        { status: 500 }
      );
    }

    // 6. Create owner membership
    try {
      await supabaseAdmin.from("memberships").upsert(
        [
          {
            id: `mem_${shopId}_owner`,
            shop_id: shopId,
            profile_id: profileId,
            role: "OWNER",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: "shop_id,profile_id" }
      );
    } catch (memErr) {
      console.warn("Notice seeding owner membership:", memErr);
    }

    // 7. Seed pending subscription record
    try {
      await supabaseAdmin.from("shop_subscriptions").upsert(
        [
          {
            id: `sub_${shopId}_pending`,
            shop_id: shopId,
            plan_id: "starter",
            billing_cycle: "MONTHLY",
            status: "PENDING",
            starts_at: new Date().toISOString(),
            current_period_ends_at: new Date(0).toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: "shop_id" }
      );
    } catch (subErr) {
      console.warn("Notice seeding pending subscription:", subErr);
    }

    // 8. Generate Super Admin Notification in Supabase
    try {
      await supabaseAdmin.from("notifications").insert([
        {
          id: `notif_app_${shopId}`,
          shop_id: shopId,
          recipient_profile_id: null,
          title: "NEW SHOP REGISTRATION",
          message: `A new shop "${cleanName}" has registered on TRACE and is waiting for your approval.`,
          type: "NEW_SHOP_REGISTRATION",
          action_url: `/shops?applicationId=${shopId}`,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (notifErr) {
      console.warn("Notice creating admin notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      shop: insertedShop || newShop,
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
