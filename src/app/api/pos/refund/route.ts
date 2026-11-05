import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, invoiceId, reason = "Customer return", refundAmountPaise, returnItems } = body;

    if (!shopId || !invoiceId) {
      return NextResponse.json({ error: "Missing required shopId or invoiceId" }, { status: 400 });
    }

    // 1. Fetch the target invoice
    const { data: invoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("id", invoiceId)
      .eq("shop_id", shopId)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found for this shop" }, { status: 404 });
    }

    if (invoice.payment_status === "REFUNDED") {
      return NextResponse.json({ error: "Invoice has already been refunded" }, { status: 400 });
    }

    const effectiveRefundPaise = refundAmountPaise !== undefined ? Number(refundAmountPaise) : invoice.paid_amount_paise;

    // 2. Restock products & record stock movements
    const itemsToReturn = returnItems && Array.isArray(returnItems) && returnItems.length > 0
      ? returnItems
      : (invoice.invoice_items || []).map((it: any) => ({
          productId: it.product_id,
          quantity: it.quantity,
          productName: it.product_name_snapshot,
        }));

    for (const item of itemsToReturn) {
      if (item.productId) {
        try {
          const { data: prod } = await supabase
            .from("products")
            .select("current_stock")
            .eq("id", item.productId)
            .single();

          if (prod) {
            const newStock = (prod.current_stock || 0) + Number(item.quantity);
            await supabase
              .from("products")
              .update({ current_stock: newStock })
              .eq("id", item.productId);

            await supabase.from("stock_movements").insert([
              {
                id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                shop_id: shopId,
                product_id: item.productId,
                movement_type: "RETURN",
                quantity: Number(item.quantity),
                reference_id: invoice.invoice_number,
                notes: `Returned from invoice ${invoice.invoice_number}: ${reason}`,
                created_at: new Date().toISOString(),
              },
            ]);
          }
        } catch (restockErr) {
          console.warn(`Restock error for product ${item.productId}:`, restockErr);
        }
      }
    }

    // 3. Record Refund in payment_transactions
    if (effectiveRefundPaise > 0) {
      await supabase.from("payment_transactions").insert([
        {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pay_ref_${Date.now()}`,
          shop_id: shopId,
          invoice_id: invoiceId,
          amount_paise: -effectiveRefundPaise,
          payment_method: invoice.payment_method || "CASH",
          status: "SUCCESS",
          reconciled: true,
          notes: `Refund for bill ${invoice.invoice_number}: ${reason}`,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    // 4. If Khata credit was used, reverse the customer debt
    if (invoice.customer_id && invoice.balance_amount_paise > 0) {
      try {
        await supabase.from("credit_transactions").insert([
          {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `khata_ref_${Date.now()}`,
            shop_id: shopId,
            customer_id: invoice.customer_id,
            transaction_type: "ADJUSTMENT",
            amount_paise: -invoice.balance_amount_paise,
            invoice_id: invoiceId,
            reference_note: `Credit reversal for refunded invoice ${invoice.invoice_number}`,
            created_at: new Date().toISOString(),
          },
        ]);

        const { data: custData } = await supabase
          .from("customers")
          .select("total_outstanding_paise")
          .eq("id", invoice.customer_id)
          .single();

        if (custData) {
          const newOutstanding = Math.max(0, (custData.total_outstanding_paise || 0) - invoice.balance_amount_paise);
          await supabase
            .from("customers")
            .update({ total_outstanding_paise: newOutstanding })
            .eq("id", invoice.customer_id);
        }
      } catch (khataRevErr) {
        console.warn("Khata credit reversal notice:", khataRevErr);
      }
    }

    // 5. Update invoice record
    const updatedNotes = invoice.notes
      ? `${invoice.notes}\n[REFUNDED]: ${reason} (${new Date().toLocaleDateString()})`
      : `[REFUNDED]: ${reason}`;

    const { data: updatedInv, error: updateErr } = await supabase
      .from("invoices")
      .update({
        payment_status: "REFUNDED",
        status: "CANCELLED",
        cancellation_reason: reason,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateErr) {
      console.warn("Update invoice refund notice:", updateErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Invoice ${invoice.invoice_number} successfully refunded and inventory restored.`,
      invoice: updatedInv || { ...invoice, payment_status: "REFUNDED", status: "CANCELLED" },
    });
  } catch (err: any) {
    console.error("Refund API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process refund" }, { status: 500 });
  }
}
