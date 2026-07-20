import "server-only";
import crypto from "node:crypto";

/**
 * Razorpay REST helpers. Keys are Phase 2 credentials — until they exist,
 * razorpayConfigured() is false and checkout offers COD (or demo simulation).
 */

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  return (
    "Basic " +
    Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
    ).toString("base64")
  );
}

/** Create a Razorpay order for an existing RSB order. Amount in paise. */
export async function createRazorpayOrder(
  orderNo: string,
  amountInr: number,
): Promise<{ id: string } | null> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: JSON.stringify({
      amount: amountInr * 100,
      currency: "INR",
      receipt: orderNo,
      notes: { order_no: orderNo },
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string };
}

/** Verify the checkout handler's signature (order_id|payment_id HMAC). */
export function verifyPaymentSignature(
  rzpOrderId: string,
  rzpPaymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Verify a webhook body against X-Razorpay-Signature. */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Issue a refund for a captured payment (admin cancellations). */
export async function refundPayment(paymentId: string, amountInr?: number): Promise<boolean> {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: JSON.stringify(amountInr ? { amount: amountInr * 100 } : {}),
  });
  return res.ok;
}
