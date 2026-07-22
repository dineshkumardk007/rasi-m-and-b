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
import { isPinServiceable } from "@/lib/pin";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/admin-password";
import { upgradeIfLegacy, verifyCustomerPassword } from "@/lib/customer-password";
import { clearAttempts, isLockedOut, recordFailedAttempt } from "@/lib/admin-session";
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
  const serviceable = isPinServiceable(
    pin,
    settings.serviceable_pins,
    settings.unserviceable_pins,
  ).serviceable;
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

/**
 * A customer row with NO password is not claimable through these actions at
 * all. Checkout creates a row for every order, so a phone number that has
 * merely bought something once would otherwise be claimable by anyone who knows
 * it — sign-in used to accept any password for such a row and keep it. Those
 * accounts come in through the phone OTP flow, which proves the caller holds
 * the number.
 */
const OTP_REQUIRED =
  "This number already has orders with us. Sign in with the OTP sent to your phone to set a password.";

/**
 * Reuses the admin login's durable throttle (the admin_login_attempts table),
 * keyed per account rather than per IP: the thing being protected here is one
 * customer's password, and an attacker rotating IPs must not get a fresh five
 * guesses against it each time.
 */
function customerThrottleKey(identifier: string): string {
  return `customer:${identifier}`;
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
      if (!existing.password) return { ok: false, error: OTP_REQUIRED };
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
      password: hashPassword(password),
      created_at: new Date().toISOString(),
    };
    db.customers.unshift(c);
    return { ok: true, name: customerName, phone: clean };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id, password")
    .eq("phone", clean)
    .maybeSingle();

  if (existing) {
    // A row with no password is a checkout-created record, not a registration.
    // Claiming it needs proof of the phone number, which only OTP gives.
    if (!existing.password) return { ok: false, error: OTP_REQUIRED };
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
      password: hashPassword(password),
      language: "en" as const,
      whatsapp_opt_in: true,
      last_login_at: new Date().toISOString(),
      login_count: 1,
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
  const now = new Date().toISOString();

  const throttle = customerThrottleKey(clean);
  if (await isLockedOut(throttle)) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  if (isDemo()) {
    const db = demoDB();
    const c = db.customers.find((x) => x.phone === clean);
    if (!c) {
      return { ok: false, error: "Account not found with this phone number. Please register first." };
    }
    if (!c.password) return { ok: false, error: OTP_REQUIRED };
    if (!verifyCustomerPassword(password, c.password)) {
      await recordFailedAttempt(throttle);
      return { ok: false, error: "Incorrect password. Please try again." };
    }
    c.last_login_at = now;
    c.login_count = (c.login_count || 0) + 1;
    await clearAttempts(throttle);
    return { ok: true, name: c.name || "Customer", phone: clean };
  }

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, password, login_count")
    .eq("phone", clean)
    .maybeSingle();

  if (!customer) {
    return { ok: false, error: "Account not found with this phone number. Please register first." };
  }

  // No password on the row → a checkout-created record. Not claimable here.
  if (!customer.password) return { ok: false, error: OTP_REQUIRED };

  if (!verifyCustomerPassword(password, customer.password)) {
    await recordFailedAttempt(throttle);
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  await supabase
    .from("customers")
    .update({
      last_login_at: now,
      login_count: (customer.login_count || 0) + 1,
      // Drain the legacy cleartext column as its owner logs in.
      ...upgradeIfLegacy(password, customer.password),
    })
    .eq("id", customer.id);

  await clearAttempts(throttle);
  return { ok: true, name: customer.name || "Customer", phone: clean };
}

/** Record customer activity timestamp & increment sign-in count */
export async function recordCustomerActivityAction(phone: string): Promise<boolean> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) return false;
  const now = new Date().toISOString();

  if (isDemo()) {
    const c = demoDB().customers.find((x) => x.phone === clean);
    if (c) {
      c.last_login_at = now;
      c.login_count = (c.login_count || 0) + 1;
    }
    return true;
  }

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, login_count")
    .eq("phone", clean)
    .maybeSingle();

  if (customer) {
    await supabase
      .from("customers")
      .update({
        last_login_at: now,
        login_count: (customer.login_count || 0) + 1,
      })
      .eq("id", customer.id);
  }
  return true;
}

/** Register with Email & Password via Supabase Auth & Database */
export async function registerCustomerWithEmailAction(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; name?: string; email?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes("@")) return { ok: false, error: "Please enter a valid email address." };
  if (!name.trim()) return { ok: false, error: "Please enter your full name." };
  if (!password || password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const customerName = name.trim();

  if (isDemo()) {
    const db = demoDB();
    const existing = db.customers.find((x) => x.email?.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        ok: false,
        error: "ALREADY_REGISTERED: Account with this email already exists. Please sign in.",
      };
    }
    const c = {
      id: `demo-c-${Date.now()}`,
      name: customerName,
      phone: "0000000000",
      email: cleanEmail,
      language: "en" as const,
      whatsapp_opt_in: false,
      baby_dob: null,
      notes: "",
      password: hashPassword(password),
      last_login_at: new Date().toISOString(),
      login_count: 1,
      created_at: new Date().toISOString(),
    };
    db.customers.unshift(c);
    return { ok: true, name: customerName, email: cleanEmail };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, password")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Registration never touches an existing row. It used to adopt the supplied
  // password when the row had none, and to return success when the password
  // happened to match — a register form that doubles as a login is a register
  // form that tells you whether a password is right.
  if (existing) {
    return {
      ok: false,
      error: "ALREADY_REGISTERED: Account with this email already exists. Please sign in.",
    };
  }

  const emailPhoneIdentifier = cleanEmail;
  const { error } = await supabase.from("customers").insert({
    name: customerName,
    email: cleanEmail,
    phone: emailPhoneIdentifier,
    password: hashPassword(password),
    language: "en" as const,
    whatsapp_opt_in: false,
    last_login_at: new Date().toISOString(),
    login_count: 1,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, name: customerName, email: cleanEmail };
}

/**
 * Attach a customer profile to an email that Supabase Auth has *already*
 * authenticated. No password check, because there is nothing left to prove: the
 * caller has a valid Supabase session for this address.
 *
 * Needed because signInWithEmailAction now refuses an email with no customers
 * row, and a user who signed up through Supabase Auth may not have one. Without
 * this they would be turned away despite a correct password.
 */
export async function ensureCustomerProfileByEmailAction(
  email: string,
  name: string,
): Promise<{ ok: boolean; name?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes("@")) return { ok: false };
  const fallbackName = name.trim() || "Customer";
  const now = new Date().toISOString();

  if (isDemo()) {
    const db = demoDB();
    const existing = db.customers.find((x) => x.email?.toLowerCase() === cleanEmail);
    if (existing) {
      existing.last_login_at = now;
      existing.login_count = (existing.login_count || 0) + 1;
      return { ok: true, name: existing.name || fallbackName };
    }
    db.customers.unshift({
      id: `demo-c-${cleanEmail}`,
      name: fallbackName,
      phone: cleanEmail,
      email: cleanEmail,
      language: "en" as const,
      whatsapp_opt_in: false,
      baby_dob: null,
      notes: "",
      last_login_at: now,
      login_count: 1,
      created_at: now,
    });
    return { ok: true, name: fallbackName };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, login_count")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("customers")
      .update({ last_login_at: now, login_count: (existing.login_count || 0) + 1 })
      .eq("id", existing.id);
    return { ok: true, name: existing.name || fallbackName };
  }

  // No password written: this identity lives in Supabase Auth, not in the
  // customers table. The password column is on its way out regardless.
  const { error } = await supabase.from("customers").insert({
    name: fallbackName,
    email: cleanEmail,
    phone: cleanEmail,
    language: "en" as const,
    whatsapp_opt_in: false,
    last_login_at: now,
    login_count: 1,
  });
  return error ? { ok: false } : { ok: true, name: fallbackName };
}

/** Sign in with Email & Password */
export async function signInWithEmailAction(
  email: string,
  password: string,
): Promise<{ ok: boolean; name?: string; email?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes("@")) return { ok: false, error: "Please enter a valid email address." };
  if (!password) return { ok: false, error: "Please enter your password." };
  const now = new Date().toISOString();

  const throttle = customerThrottleKey(cleanEmail);
  if (await isLockedOut(throttle)) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  if (isDemo()) {
    const db = demoDB();
    const c = db.customers.find((x) => x.email?.toLowerCase() === cleanEmail);
    if (!c || !c.password) {
      await recordFailedAttempt(throttle);
      return { ok: false, error: "Account not found with this email. Please register first." };
    }
    if (!verifyCustomerPassword(password, c.password)) {
      await recordFailedAttempt(throttle);
      return { ok: false, error: "Incorrect password. Please try again." };
    }
    c.last_login_at = now;
    c.login_count = (c.login_count || 0) + 1;
    await clearAttempts(throttle);
    return { ok: true, name: c.name || "Customer", email: cleanEmail };
  }

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, password, login_count")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Sign-in used to create the account when the email was unknown, so it never
  // failed and never authenticated anything. An unknown email is an error.
  if (!customer || !customer.password) {
    await recordFailedAttempt(throttle);
    return { ok: false, error: "Account not found with this email. Please register first." };
  }

  if (!verifyCustomerPassword(password, customer.password)) {
    await recordFailedAttempt(throttle);
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  await supabase
    .from("customers")
    .update({
      last_login_at: now,
      login_count: (customer.login_count || 0) + 1,
      ...upgradeIfLegacy(password, customer.password),
    })
    .eq("id", customer.id);

  await clearAttempts(throttle);
  return { ok: true, name: customer.name || "Customer", email: cleanEmail };
}
