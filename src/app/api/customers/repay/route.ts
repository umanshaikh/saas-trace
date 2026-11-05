import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { verifyTenantAccess } from "@/lib/auth/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopId,
      customerId,
      amountPaise,
      paymentMethod = "UPI",
      notes = "Khata repayment",
    } = body;

    if (!shopId || !customerId || !amountPaise || Number(amountPaise) <= 0) {
      return NextResponse.json(
        { error: "shopId, customerId, and valid amountPaise > 0 are required" },
        { status: 400 }
      );
    }

    // Verify tenant authorization (members of this shop can process customer repayments)
    const authCheck = await verifyTenantAccess(req, shopId);
    if (!authCheck.authorized) {
      return authCheck.response!;
    }

    const payPaise = Number(amountPaise);

    // 1. Fetch customer
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("shop_id", shopId)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const currentDue = customer.total_outstanding_paise || 0;
    const newDue = Math.max(0, currentDue - payPaise);
    const custName = customer.full_name || customer.name || "Customer";

    // 2. Record in credit_transactions
    const creditTxId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `khata_pay_${Date.now()}`;
    const { error: txErr } = await supabase.from("credit_transactions").insert([
      {
        id: creditTxId,
        shop_id: shopId,
        customer_id: customerId,
        transaction_type: "REPAYMENT",
        amount_paise: payPaise,
        payment_method: paymentMethod,
        reference_note: `${notes} (${paymentMethod})`,
        created_at: new Date().toISOString(),
      },
    ]);
    if (txErr) {
      console.warn("Credit transaction insert notice:", txErr.message);
    }

    // 3. Record in payment_transactions
    const payTxId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pay_khata_${Date.now()}`;
    await supabase.from("payment_transactions").insert([
      {
        id: payTxId,
        shop_id: shopId,
        amount_paise: payPaise,
        payment_method: paymentMethod,
        status: "SUCCESS",
        reconciled: true,
        notes: `Khata Repayment from ${custName}`,
        created_at: new Date().toISOString(),
      },
    ]);

    // 4. Update customer balance in customers table
    const { data: updatedCustomer, error: updateErr } = await supabase
      .from("customers")
      .update({
        total_outstanding_paise: newDue,
        credit_status: newDue >= (customer.credit_limit_paise || 1000000) ? "WARNING" : "GOOD",
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select()
      .single();

    if (updateErr) {
      console.warn("Update customer balance notice:", updateErr.message);
    }

    // 5. Also update customer_credit_accounts if it exists
    try {
      await supabase
        .from("customer_credit_accounts")
        .update({
          current_balance_paise: newDue,
          updated_at: new Date().toISOString(),
        })
        .eq("customer_id", customerId)
        .eq("shop_id", shopId);
    } catch (accErr) {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Repayment of ₹${(payPaise / 100).toFixed(2)} recorded for ${custName}`,
      previousOutstandingPaise: currentDue,
      newOutstandingPaise: newDue,
      customer: updatedCustomer || { ...customer, total_outstanding_paise: newDue },
    });
  } catch (err: any) {
    console.error("Khata Repayment Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process khata repayment" },
      { status: 500 }
    );
  }
}
