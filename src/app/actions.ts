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

/** Register or update customer record in database by unique phone number */
export async function registerCustomerAction(
  name: string,
  phone: string,
): Promise<{ ok: boolean; customerId?: string; error?: string }> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) return { ok: false, error: "Invalid 10-digit phone number" };
  const customerName = name.trim() || "Customer";

  if (isDemo()) {
    const db = demoDB();
    let c = db.customers.find((x) => x.phone === clean);
    if (c) {
      c.name = customerName;
    } else {
      c = {
        id: `demo-c-${clean}`,
        name: customerName,
        phone: clean,
        email: null,
        language: "en",
        whatsapp_opt_in: true,
        baby_dob: null,
        notes: "",
        created_at: new Date().toISOString(),
      };
      db.customers.unshift(c);
    }
    return { ok: true, customerId: c.id };
  }

  const supabase = createAdminClient();
  // Check if customer with this unique phone already exists
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", clean)
    .maybeSingle();

  if (existing) {
    // Update existing customer's name (no duplicate phone entries)
    await supabase
      .from("customers")
      .update({ name: customerName })
      .eq("id", existing.id);
    return { ok: true, customerId: existing.id };
  }

  // Insert new unique customer record
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: customerName,
      phone: clean,
      language: "en",
      whatsapp_opt_in: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, customerId: data?.id };
}

/** Register a new customer with unique phone & password */
export async function registerCustomerWithPasswordAction(
  name: string,
  phone: string,
  password: string,
): Promise<{ ok: boolean; name?: string; phone?: string; error?: string }> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) return { ok: false, error: "Please enter a valid 10-digit phone number." };
  if (!name.trim()) return { ok: false, error: "Please enter your full name." };
  if (!password || password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const customerName = name.trim();

  if (isDemo()) {
    const db = demoDB();
    const existing = db.customers.find((x) => x.phone === clean);
    if (existing) {
      return {
        ok: false,
        error: "ALREADY_REGISTERED: You already have an account with this phone number. Please sign in.",
      };
    }
    const c = {
      id: `demo-c-${clean}`,
      name: customerName,
      phone: clean,
      email: null,
      language: "en" as const,
      whatsapp_opt_in: true,
      baby_dob: null,
      notes: "",
      password,
      created_at: new Date().toISOString(),
    };
    db.customers.unshift(c);
    return { ok: true, name: customerName, phone: clean };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", clean)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "ALREADY_REGISTERED: You already have an account with this phone number. Please sign in.",
    };
  }

  const { error } = await supabase
    .from("customers")
    .insert({
      name: customerName,
      phone: clean,
      password,
      language: "en",
      whatsapp_opt_in: true,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, name: customerName, phone: clean };
}

/** Verify user login with unique phone & password */
export async function signInWithPasswordAction(
  phone: string,
  password: string,
): Promise<{ ok: boolean; name?: string; phone?: string; error?: string }> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) return { ok: false, error: "Please enter a valid 10-digit phone number." };
  if (!password) return { ok: false, error: "Please enter your password." };

  if (isDemo()) {
    const db = demoDB();
    const c = db.customers.find((x) => x.phone === clean);
    if (!c) {
      return { ok: false, error: "Account not found with this phone number. Please register first." };
    }
    if (c.password && c.password !== password) {
      return { ok: false, error: "Incorrect password. Please try again." };
    }
    if (!c.password) c.password = password;
    return { ok: true, name: c.name || "Customer", phone: clean };
  }

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, password")
    .eq("phone", clean)
    .maybeSingle();

  if (!customer) {
    return { ok: false, error: "Account not found with this phone number. Please register first." };
  }

  if (customer.password && customer.password !== password) {
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  if (!customer.password) {
    await supabase.from("customers").update({ password }).eq("id", customer.id);
  }

  return { ok: true, name: customer.name || "Customer", phone: clean };
}
