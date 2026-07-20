"use server";

import { revalidatePath } from "next/cache";
import { evaluateCoupon, findCoupon, getSettings } from "@/lib/data/catalog";
import {
  placeOrder,
  sameDayEligible,
  trackOrder,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/lib/data/orders";
import { demoDB } from "@/lib/data/demo-store";
import { isDemo } from "@/lib/data/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

/** Storefront server actions — the only write paths from the public site. */

export async function submitOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const result = await placeOrder(input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function checkCouponAction(
  code: string,
  subtotal: number,
): Promise<{ ok: true; code: string; discount: number } | { ok: false; reason: string; min?: number }> {
  const check = evaluateCoupon(await findCoupon(code), subtotal);
  if (!check.ok) return { ok: false, reason: check.reason, min: check.min };
  return { ok: true, code: check.coupon.code, discount: check.discount };
}

export async function checkPinAction(
  pin: string,
): Promise<{ serviceable: boolean; sameDayNow: boolean }> {
  const settings = await getSettings();
  const serviceable = settings.serviceable_pins.includes(pin);
  return { serviceable, sameDayNow: serviceable && (await sameDayEligible(pin)) };
}

export async function trackOrderAction(
  orderNo: string,
  phone: string,
): Promise<Order | null> {
  if (!orderNo.trim() || !phone.trim()) return null;
  return trackOrder(orderNo, phone);
}

export async function submitReviewAction(
  productId: string,
  authorName: string,
  rating: number,
  text: string,
): Promise<boolean> {
  if (!text.trim() || rating < 1 || rating > 5) return false;
  if (isDemo()) {
    demoDB().reviews.unshift({
      id: `demo-r-${Date.now()}`,
      product_id: productId,
      author_name: authorName || "Customer",
      rating,
      text: text.trim(),
      status: "pending", // moderation queue — never straight to the wall
      created_at: new Date().toISOString(),
    });
    return true;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("reviews").insert({
    product_id: productId,
    author_name: authorName || "Customer",
    rating,
    text: text.trim(),
    status: "pending",
  });
  return !error;
}
