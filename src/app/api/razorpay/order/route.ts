import { NextResponse } from "next/server";
import { getOrderByNo } from "@/lib/data/orders";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/razorpay";

/** Create a Razorpay order for a placed (unpaid) RSB order. */
export async function POST(request: Request) {
  if (!razorpayConfigured())
    return NextResponse.json({ error: "razorpay_not_configured" }, { status: 503 });

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

  const rzp = await createRazorpayOrder(order.order_no, order.total);
  if (!rzp) return NextResponse.json({ error: "razorpay_error" }, { status: 502 });

  return NextResponse.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    rzpOrderId: rzp.id,
    amount: order.total * 100,
  });
}
