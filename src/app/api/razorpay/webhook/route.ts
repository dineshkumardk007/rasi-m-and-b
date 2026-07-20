import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook — THE source of truth for payment status (spec rule:
 * never mark an order paid from the client). Configure in the Razorpay
 * dashboard: events payment.captured + refund.processed, secret =
 * RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature))
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });

  /* eslint-disable @typescript-eslint/no-explicit-any -- razorpay payload */
  const event = JSON.parse(raw) as any;
  const supabase = createAdminClient();

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    const orderNo: string | undefined =
      payment?.notes?.order_no ?? payment?.receipt;
    if (!orderNo) return NextResponse.json({ ok: true });

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, payment_status, address_snapshot")
      .eq("order_no", orderNo)
      .maybeSingle();
    if (order && order.payment_status !== "paid") {
      await supabase.from("orders").update({ payment_status: "paid" }).eq("id", order.id);
      if (order.status === "new")
        await supabase.rpc("confirm_order", { p_order_id: order.id });
      await logEvent("order.paid", {
        order_no: orderNo,
        payment_id: payment?.id,
        phone: order.address_snapshot?.phone,
        source: "webhook",
      });
    }
  }

  if (event.event === "refund.processed") {
    const refund = event.payload?.refund?.entity;
    const paymentId = refund?.payment_id;
    if (paymentId) {
      await logEvent("order.refunded", { payment_id: paymentId });
      // Payment id → order mapping arrives via notes on the refund when issued
      // from our admin; mark by order_no when present.
      const orderNo = refund?.notes?.order_no;
      if (orderNo)
        await supabase
          .from("orders")
          .update({ payment_status: "refunded" })
          .eq("order_no", orderNo);
    }
  }

  return NextResponse.json({ ok: true });
}
