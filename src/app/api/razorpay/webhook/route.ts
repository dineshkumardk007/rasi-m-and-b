import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { isBirthdayCode } from "@/lib/baby-club";

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
      .select("id, status, payment_status, address_snapshot, razorpay_payment_id, coupon_code")
      .eq("order_no", orderNo)
      .maybeSingle();

    // Razorpay retries payment.captured for the SAME payment_id as normal
    // webhook behavior — that's expected and already handled below by simply
    // not re-running the paid branch. A DIFFERENT payment_id arriving for an
    // already-paid order means a genuine second charge went through (the
    // order/route.ts reuse-existing-order fix should prevent this, but this
    // is the last line of defense) — that's real extra money taken with no
    // automatic refund, and needs a human, not a silent no-op.
    if (order && order.payment_status === "paid" && order.razorpay_payment_id !== payment?.id) {
      console.error("Duplicate payment captured for already-paid order:", orderNo, payment?.id);
      Sentry.captureMessage(`Duplicate Razorpay capture for already-paid order ${orderNo}`, {
        level: "error",
        tags: { area: "razorpay_webhook", order_no: orderNo },
        extra: { existing_payment_id: order.razorpay_payment_id, new_payment_id: payment?.id },
      });
      await logEvent("order.duplicate_payment", {
        order_no: orderNo,
        existing_payment_id: order.razorpay_payment_id,
        new_payment_id: payment?.id,
      });
    }

    if (order && order.payment_status !== "paid") {
      // This webhook and the client-confirm route typically both fire within
      // moments of the same payment — not a rare race. Whichever request's
      // UPDATE actually flips payment_status wins the "process this payment"
      // job; the other gets zero rows back and skips confirm_order/coupon-
      // bump/event-logging below, rather than both doing it.
      const { data: claimed, error: payErr } = await supabase
        .from("orders")
        .update({ payment_status: "paid", razorpay_payment_id: payment?.id })
        .eq("id", order.id)
        .eq("payment_status", order.payment_status)
        .select("id");
      if (payErr) {
        // Money is captured but the DB never got to say so — this order can
        // get stuck showing unpaid (and, worse, an admin refund later has no
        // payment_id to refund against) unless someone notices and retries.
        console.error("Failed to persist payment_status=paid after capture:", orderNo, payErr);
        Sentry.captureException(payErr, {
          tags: { area: "razorpay_webhook", order_no: orderNo, step: "mark_paid" },
        });
        await logEvent("order.confirm_failed", {
          order_no: orderNo,
          payment_id: payment?.id,
          reason: payErr.message,
          source: "webhook_mark_paid",
        });
      }
      if (!payErr && !claimed?.length) return NextResponse.json({ ok: true });

      if (order.status === "new") {
        const { error: confirmErr } = await supabase.rpc("confirm_order", { p_order_id: order.id });
        if (confirmErr) {
          // Money is captured but stock confirmation failed (e.g. it sold out
          // between placement and capture). Don't swallow it: this order is now
          // paid-but-unconfirmed and needs manual attention. Loud log + an event
          // so it's findable, rather than silently stuck.
          console.error("confirm_order failed after payment (webhook):", orderNo, confirmErr);
          Sentry.captureException(confirmErr, {
            tags: { area: "razorpay_webhook", order_no: orderNo },
          });
          await logEvent("order.confirm_failed", {
            order_no: orderNo,
            payment_id: payment?.id,
            reason: confirmErr.message,
            source: "webhook",
          });
        }
      }
      // Coupon usage bumps here, not at placement — see the comment on
      // p_bump_coupon_usage in orders.ts. This only runs once per order
      // (gated by payment_status !== "paid" above), same as confirm_order.
      if (order.coupon_code && !isBirthdayCode(order.coupon_code)) {
        const { error: couponErr } = await supabase.rpc("bump_coupon_usage", { p_code: order.coupon_code });
        if (couponErr) {
          console.error("bump_coupon_usage failed after payment (webhook):", orderNo, couponErr);
          Sentry.captureException(couponErr, {
            tags: { area: "razorpay_webhook", order_no: orderNo, step: "bump_coupon" },
          });
        }
      }
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
      // from our admin; mark by order_no when present. (Refunds issued from
      // the Razorpay dashboard directly carry no such note — see
      // admin.refundOrder(), which already marks the order refunded itself
      // when we initiate the refund, so this path is for the dashboard case.)
      const orderNo = refund?.notes?.order_no;
      if (orderNo) {
        const { error: refundErr } = await supabase
          .from("orders")
          .update({ payment_status: "refunded" })
          .eq("order_no", orderNo);
        if (refundErr) {
          console.error("Failed to persist payment_status=refunded:", orderNo, refundErr);
          Sentry.captureException(refundErr, {
            tags: { area: "razorpay_webhook", order_no: orderNo, step: "mark_refunded" },
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
