import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getOrderByNo } from "@/lib/data/orders";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowByCaller } from "@/lib/rate-limit";

/** Create a Razorpay order for a placed (unpaid) RSB order. */
export async function POST(request: Request) {
  if (!razorpayConfigured())
    return NextResponse.json({ error: "razorpay_not_configured" }, { status: 503 });

  // Order numbers are sequential and the only guard is the phone match below, so
  // an unthrottled endpoint lets a caller brute-force phone against a given
  // order_no. Throttle per IP (fails open on a DB error).
  if (!(await allowByCaller("razorpay_order", 15, 10 * 60)))
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });

  const { order_no, phone } = (await request.json()) as {
    order_no?: string;
    phone?: string;
  };
  if (!order_no || !phone)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const order = await getOrderByNo(order_no);
  const clean = (s: string) => s.replace(/\D/g, "").slice(-10);
  if (!order || clean(order.address_snapshot.phone) !== clean(phone))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.payment_status !== "pending")
    return NextResponse.json({ error: "already_paid" }, { status: 409 });

  const supabase = createAdminClient();

  // A double-click, a retry after ondismiss, or two tabs would otherwise each
  // mint a FRESH Razorpay order and rebind razorpay_order_id to it, leaving
  // whichever one the customer completes payment on second unreachable by
  // confirm/ (order_mismatch) — and if they somehow complete more than one,
  // that's a real double charge with no record of it happening. Reusing the
  // existing Razorpay order for as long as this RSB order stays pending means
  // there is only ever one payable session per order, by construction.
  const { data: existing } = await supabase
    .from("orders")
    .select("razorpay_order_id")
    .eq("id", order.id)
    .maybeSingle();
  if (existing?.razorpay_order_id) {
    return NextResponse.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      rzpOrderId: existing.razorpay_order_id,
      amount: order.total * 100,
    });
  }

  const rzp = await createRazorpayOrder(order.order_no, order.total);
  if (!rzp) return NextResponse.json({ error: "razorpay_error" }, { status: 502 });

  // Bind this Razorpay order to THIS RSB order so confirm/ can verify the signed
  // razorpay_order_id it later receives was actually issued for this order — a
  // valid signature alone does not tell us which order_no it belongs to. Guard on
  // payment_status='pending' so a paid order can never be rebound to a new payment.
  const { error: bindErr } = await supabase
    .from("orders")
    .update({ razorpay_order_id: rzp.id })
    .eq("id", order.id)
    .eq("payment_status", "pending");
  if (bindErr) {
    console.error("Failed to bind razorpay_order_id to order", order.order_no, bindErr);
    Sentry.captureException(bindErr, {
      tags: { area: "razorpay_order_bind", order_no: order.order_no },
    });
    return NextResponse.json({ error: "bind_failed" }, { status: 500 });
  }

  return NextResponse.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    rzpOrderId: rzp.id,
    amount: order.total * 100,
  });
}
