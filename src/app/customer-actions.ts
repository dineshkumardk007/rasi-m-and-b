"use server";

import { demoDB } from "@/lib/data/demo-store";
import { isDemo } from "@/lib/data/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import { currentCustomer } from "@/lib/customer-session";
import { isValidDob } from "@/lib/baby";
import type { Order } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any -- supabase row shapes */
function mapOrder(row: any): Order {
  return {
    id: row.id,
    order_no: row.order_no,
    customer_id: row.customer_id,
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    subtotal: row.subtotal,
    delivery_fee: row.delivery_fee,
    discount: row.discount,
    coupon_code: row.coupon_code,
    total: row.total,
    address_snapshot: row.address_snapshot,
    items: (row.order_items ?? []).map((i: any) => ({
      product_id: i.product_id,
      name_snapshot: i.name_snapshot,
      price_snapshot: i.price_snapshot,
      qty: i.qty,
    })),
    placed_at: row.placed_at,
    language: "en" as const,
  };
}

/**
 * Orders for the signed-in customer (Buy again + My orders).
 *
 * The phone number is read from the server-side session, never from an
 * argument. This action previously accepted the phone from its caller and
 * queried with the service-role client, so anyone could enumerate 10-digit
 * numbers and read back other families' names, phones and home addresses.
 */
export async function myOrdersAction(): Promise<Order[]> {
  const me = await currentCustomer();
  if (!me) return [];

  const digits = me.sub.replace(/\D/g, "");
  const phone = digits.length === 10 ? digits : null;
  const email = me.sub.includes("@") ? me.sub.toLowerCase() : null;

  if (isDemo()) {
    if (!phone) return [];
    return demoDB().orders.filter(
      (o) => o.address_snapshot.phone.replace(/\D/g, "").slice(-10) === phone,
    );
  }

  const supabase = createAdminClient();

  if (phone) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .contains("address_snapshot", { phone })
      .order("placed_at", { ascending: false })
      .limit(20);
    return (data ?? []).map(mapOrder);
  }

  // Email-registered account: orders are linked by customer_id, since the
  // delivery phone on the order need not match the login identity.
  if (email) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!customer) return [];
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("customer_id", customer.id)
      .order("placed_at", { ascending: false })
      .limit(20);
    return (data ?? []).map(mapOrder);
  }

  return [];
}

/** Notify-me-when-back (wishlist restock alert). Requires a signed-in customer. */
export async function notifyRestockAction(productId: string): Promise<boolean> {
  const me = await currentCustomer();
  const digits = me?.sub.replace(/\D/g, "") ?? "";
  const phone = digits.length === 10 ? digits : null;

  await logEvent("wishlist.notify_restock", { product_id: productId, phone });

  if (!isDemo() && me) {
    const supabase = createAdminClient();
    const query = supabase.from("customers").select("id");
    const { data: customer } = await (phone
      ? query.eq("phone", phone)
      : query.eq("email", me.sub.toLowerCase())
    ).maybeSingle();
    if (customer)
      await supabase
        .from("wishlist")
        .upsert({ customer_id: customer.id, product_id: productId, notify_restock: true });
  }
  return true;
}

/* ── Baby birthday club ──────────────────────────────────────────────────── */

/**
 * Locate the signed-in customer's row. The identity is a phone number or an
 * email depending on how they registered, so both lookups are needed.
 */
async function findMyCustomerId(sub: string): Promise<string | null> {
  const digits = sub.replace(/\D/g, "");
  const phone = digits.length === 10 ? digits : null;
  const supabase = createAdminClient();
  const query = supabase.from("customers").select("id");
  const { data } = await (phone
    ? query.eq("phone", phone)
    : query.eq("email", sub.toLowerCase())
  ).maybeSingle();
  return data?.id ?? null;
}

/**
 * Store the baby's date of birth. Everything the club shows (milestone,
 * suggestions, birthday perk) is derived from this one field, so it is
 * validated here rather than trusted from the form.
 *
 * Passing null clears it — a parent must be able to take this back out.
 */
export async function saveBabyDobAction(
  dob: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentCustomer();
  if (!me) return { ok: false, error: "Please sign in first." };

  if (dob !== null && !isValidDob(dob)) {
    return { ok: false, error: "Please enter a real date that isn't in the future." };
  }

  if (isDemo()) {
    const db = demoDB();
    const digits = me.sub.replace(/\D/g, "");
    const customer = db.customers.find(
      (c) => c.phone === digits || c.email?.toLowerCase() === me.sub.toLowerCase(),
    );
    if (customer) customer.baby_dob = dob;
    return { ok: true };
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return { ok: false, error: "Customer profile not found." };

  const { error } = await createAdminClient()
    .from("customers")
    .update({ baby_dob: dob })
    .eq("id", customerId);

  if (error) return { ok: false, error: "Could not save. Please try again." };

  // Lets the automation greet milestones without polling every customer row.
  await logEvent(dob ? "baby.dob_set" : "baby.dob_cleared", { dob });
  return { ok: true };
}

/** The signed-in customer's stored baby DOB, or null. */
export async function myBabyDobAction(): Promise<string | null> {
  const me = await currentCustomer();
  if (!me) return null;

  if (isDemo()) {
    const digits = me.sub.replace(/\D/g, "");
    const customer = demoDB().customers.find(
      (c) => c.phone === digits || c.email?.toLowerCase() === me.sub.toLowerCase(),
    );
    return customer?.baby_dob ?? null;
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return null;
  const { data } = await createAdminClient()
    .from("customers")
    .select("baby_dob")
    .eq("id", customerId)
    .maybeSingle();
  return data?.baby_dob ?? null;
}
