import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import { razorpayConfigured, verifyPaymentSignature } from "@/lib/razorpay";
import { isBirthdayCode } from "@/lib/baby-club";

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
    .select("id, status, payment_status, address_snapshot, razorpay_order_id, coupon_code")
    .eq("order_no", order_no)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The signature only proves the (razorpay_order_id, payment_id) pair is
  // authentic — NOT that it belongs to this order_no. Require the signed
  // razorpay_order_id to equal the one we persisted for THIS order when the
  // payment was created. This defeats replaying a genuine payment's triple
  // against a different (cheaper/unpaid) order_no.
  if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id)
    return NextResponse.json({ error: "order_mismatch" }, { status: 400 });

  if (order.payment_status !== "paid") {
    // This route and the webhook typically both fire within moments of the
    // same payment — not a rare race. Whichever request's UPDATE actually
    // flips payment_status wins the "process this payment" job; the other
    // gets zero rows back and skips confirm_order/coupon-bump/event-logging
    // below, rather than both doing it (double coupon bump, duplicate event).
    const { data: claimed, error: payErr } = await supabase
      .from("orders")
      .update({ payment_status: "paid", razorpay_payment_id })
      .eq("id", order.id)
      .eq("payment_status", order.payment_status)
      .select("id");
    if (payErr) {
      console.error("Failed to persist payment_status=paid (client_confirm):", order_no, payErr);
      Sentry.captureException(payErr, {
        tags: { area: "razorpay_confirm", order_no, step: "mark_paid" },
      });
      await logEvent("order.confirm_failed", {
        order_no,
        payment_id: razorpay_payment_id,
        reason: payErr.message,
        source: "client_confirm_mark_paid",
      });
    }
    if (!payErr && !claimed?.length) return NextResponse.json({ ok: true });

    if (order.status === "new") {
      const { error: confirmErr } = await supabase.rpc("confirm_order", { p_order_id: order.id });
      if (confirmErr) {
        // Paid but stock-confirmation failed — don't swallow it. The webhook (the
        // source of truth) will retry confirm_order too, but log + emit an event
        // so a genuinely stuck order is findable rather than silently unconfirmed.
        console.error("confirm_order failed after payment (client_confirm):", order_no, confirmErr);
        Sentry.captureException(confirmErr, {
          tags: { area: "razorpay_confirm", order_no },
        });
        await logEvent("order.confirm_failed", {
          order_no,
          payment_id: razorpay_payment_id,
          reason: confirmErr.message,
          source: "client_confirm",
        });
      }
    }
    // Coupon usage bumps here, not at placement — see the comment on
    // p_bump_coupon_usage in orders.ts. Gated by payment_status !== "paid"
    // above, and confirm/webhook are both idempotent whichever lands first,
    // so this only ever runs once per order.
    if (order.coupon_code && !isBirthdayCode(order.coupon_code)) {
      const { error: couponErr } = await supabase.rpc("bump_coupon_usage", { p_code: order.coupon_code });
      if (couponErr) {
        console.error("bump_coupon_usage failed after payment (client_confirm):", order_no, couponErr);
        Sentry.captureException(couponErr, {
          tags: { area: "razorpay_confirm", order_no, step: "bump_coupon" },
        });
      }
    }
    await logEvent("order.paid", {
      order_no,
      payment_id: razorpay_payment_id,
      phone: order.address_snapshot?.phone,
      source: "client_confirm",
    });
  }
  return NextResponse.json({ ok: true });
}
