import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import { razorpayConfigured, verifyPaymentSignature } from "@/lib/razorpay";

/**
 * Immediate post-checkout confirmation for UX. Verifies the handler signature
 * and marks the order paid. The WEBHOOK remains the source of truth — this
 * route and the webhook are both idempotent, whichever lands first wins.
 */
export async function POST(request: Request) {
  if (!razorpayConfigured())
    return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await request.json()) as {
    order_no?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  const { order_no, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!order_no || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, payment_status, address_snapshot")
    .eq("order_no", order_no)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (order.payment_status !== "paid") {
    await supabase.from("orders").update({ payment_status: "paid" }).eq("id", order.id);
    if (order.status === "new")
      await supabase.rpc("confirm_order", { p_order_id: order.id });
    await logEvent("order.paid", {
      order_no,
      payment_id: razorpay_payment_id,
      phone: order.address_snapshot?.phone,
      source: "client_confirm",
    });
  }
  return NextResponse.json({ ok: true });
}
