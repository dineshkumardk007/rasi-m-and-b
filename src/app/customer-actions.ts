"use server";

import * as Sentry from "@sentry/nextjs";
import { logQueryError } from "@/lib/log-query-error";
import { demoDB } from "@/lib/data/demo-store";
import { isDemo } from "@/lib/data/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import { currentCustomer, currentCustomerPhone } from "@/lib/customer-session";
import { getLanguage as currentLanguage } from "@/lib/i18n/server";
import { isValidDob } from "@/lib/baby";
import { hashPassword } from "@/lib/admin-password";
import type { BabyRegistry, CustomerAddress, Order, Product, RegistryItem, Subscription } from "@/lib/types";

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
    is_gift: row.is_gift ?? false,
    gift_message: row.gift_message ?? null,
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

/** Register a 30-day (or custom days) auto-restock reminder for a product. */
export async function registerRestockReminderAction(
  productId: string,
  phone: string,
  days: number = 30,
): Promise<{ ok: boolean; message: string }> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    return { ok: false, message: "Please enter a valid 10-digit mobile number." };
  }

  await logEvent("product.restock_reminder", {
    product_id: productId,
    phone: cleanPhone,
    days,
    requested_at: new Date().toISOString(),
  });

  return {
    ok: true,
    message: `Restock reminder set! We'll remind you in ${days} days on WhatsApp (${cleanPhone}). 🔔`,
  };
}

/**
 * Record that a signed-in customer reached checkout.
 *
 * `03-cart-abandoned.json` polls the events table for `cart.abandoned` rows
 * aged 2–3 hours and messages the customer on WhatsApp — but nothing in the app
 * was emitting them, so that workflow could never fire.
 *
 * Checkout-open is the right moment to record: it is the furthest point where
 * we still hold an identity to message. The phone comes from the server-side
 * session, never from the caller, so this cannot be used to make the shop
 * message an arbitrary number.
 */
export async function recordCartAbandonedAction(itemCount: number): Promise<void> {
  if (itemCount <= 0) return;
  const phone = await currentCustomerPhone();
  if (!phone) return; // signed out, or email-only — nothing to message

  await logEvent("cart.abandoned", {
    phone,
    language: await currentLanguage(),
    item_count: itemCount,
  });
}

/** "Often bought with" for a product page / quick view. Public, no session. */
export async function suggestionsForAction(
  productId: string,
): Promise<{ products: Product[]; fromPurchaseData: boolean }> {
  const { frequentlyBoughtWith } = await import("@/lib/data/recommend");
  return frequentlyBoughtWith(productId);
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

/* ── Customer Address Book ────────────────────────────────────────────────── */

export async function myAddressesAction(): Promise<CustomerAddress[]> {
  const me = await currentCustomer();
  if (!me) return [];

  if (isDemo()) {
    const digits = me.sub.replace(/\D/g, "");
    const customer = demoDB().customers.find(
      (c) => c.phone === digits || c.email?.toLowerCase() === me.sub.toLowerCase(),
    );
    return customer?.addresses ?? [];
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false });
  return (data ?? []) as CustomerAddress[];
}

export async function saveCustomerAddressAction(
  address: Omit<CustomerAddress, "id" | "customer_id"> & { id?: string },
): Promise<{ ok: boolean; address?: CustomerAddress; error?: string }> {
  const me = await currentCustomer();
  if (!me) return { ok: false, error: "Please sign in first." };

  if (isDemo()) {
    const db = demoDB();
    const digits = me.sub.replace(/\D/g, "");
    let customer = db.customers.find(
      (c) => c.phone === digits || c.email?.toLowerCase() === me.sub.toLowerCase(),
    );
    if (!customer) {
      customer = {
        id: `demo-c-${Date.now()}`,
        name: address.name,
        phone: address.phone,
        email: me.sub.includes("@") ? me.sub : null,
        language: "en",
        whatsapp_opt_in: true,
        baby_dob: null,
        notes: "",
        created_at: new Date().toISOString(),
        addresses: [],
      };
      db.customers.push(customer);
    }
    if (!customer.addresses) customer.addresses = [];

    if (address.is_default) {
      customer.addresses.forEach((a) => (a.is_default = false));
    }

    if (address.id) {
      const existing = customer.addresses.find((a) => a.id === address.id);
      if (existing) {
        Object.assign(existing, address);
        return { ok: true, address: existing };
      }
    }

    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      customer_id: customer.id,
      label: address.label || "Home",
      name: address.name,
      phone: address.phone,
      line: address.line,
      city: address.city || "Thoothukudi",
      pin: address.pin,
      is_default: address.is_default || customer.addresses.length === 0,
    };
    customer.addresses.push(newAddr);
    return { ok: true, address: newAddr };
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return { ok: false, error: "Customer not found." };
  const supabase = createAdminClient();

  if (address.is_default) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", customerId);
  }

  if (address.id) {
    const { data, error } = await supabase
      .from("customer_addresses")
      .update({
        label: address.label,
        name: address.name,
        phone: address.phone,
        line: address.line,
        city: address.city,
        pin: address.pin,
        is_default: address.is_default,
      })
      .eq("id", address.id)
      // Scope to the signed-in customer so a guessed/leaked address id can't be
      // used to overwrite another family's saved name/phone/delivery address.
      // (customer_addresses has RLS enabled but no policies, and this uses the
      // service-role client, so this filter is the only ownership check.)
      .eq("customer_id", customerId)
      .select()
      .single();
    if (error) return { ok: false, error: "Failed to update address." };
    return { ok: true, address: data as CustomerAddress };
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: customerId,
      label: address.label,
      name: address.name,
      phone: address.phone,
      line: address.line,
      city: address.city,
      pin: address.pin,
      is_default: address.is_default,
    })
    .select()
    .single();

  if (error) return { ok: false, error: "Failed to save address." };
  return { ok: true, address: data as CustomerAddress };
}

export async function deleteCustomerAddressAction(addressId: string): Promise<boolean> {
  const me = await currentCustomer();
  if (!me) return false;

  if (isDemo()) {
    const digits = me.sub.replace(/\D/g, "");
    const customer = demoDB().customers.find(
      (c) => c.phone === digits || c.email?.toLowerCase() === me.sub.toLowerCase(),
    );
    if (customer?.addresses) {
      customer.addresses = customer.addresses.filter((a) => a.id !== addressId);
    }
    return true;
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return false;
  const supabase = createAdminClient();
  await supabase.from("customer_addresses").delete().eq("id", addressId).eq("customer_id", customerId);
  return true;
}

export async function updateMyPasswordAction(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const me = await currentCustomer();
  if (!me) return { ok: false, error: "Not signed in" };
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters" };

  const hashed = hashPassword(newPassword);
  if (isDemo()) {
    const digits = me.sub.replace(/\D/g, "");
    const customer = demoDB().customers.find(
      (c) => c.phone === digits || c.email?.toLowerCase() === me.sub.toLowerCase(),
    );
    if (customer) {
      (customer as any).password = hashed;
      customer.must_change_password = false;
    }
  } else {
    const customerId = await findMyCustomerId(me.sub);
    if (!customerId) return { ok: false, error: "Could not find your account" };
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customers")
      .update({ password: hashed, must_change_password: false })
      .eq("id", customerId);
    if (error) {
      console.error("updateMyPasswordAction: customer password update failed:", error);
      return { ok: false, error: "Failed to save password" };
    }
  }

  return { ok: true };
}

/* ── Baby Shower Registry Actions ───────────────────────────────────────── */

export async function createBabyRegistryAction(
  title: string,
  parentName: string,
  babyNameOrTitle: string,
  eventDate: string,
  items: RegistryItem[],
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const me = await currentCustomer();
  if (!me) return { ok: false, error: "Please sign in to create a Baby Registry" };
  if (!title.trim()) return { ok: false, error: "Please enter a registry title" };

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (isDemo()) {
    const reg: BabyRegistry = {
      id: `demo-reg-${Date.now()}`,
      customer_id: me.sub,
      title: title.trim(),
      parent_name: parentName.trim() || me.name,
      baby_name_or_title: babyNameOrTitle.trim() || "Baby",
      event_date: eventDate,
      slug,
      items,
      created_at: new Date().toISOString(),
    };
    demoDB().registries.unshift(reg);
    return { ok: true, slug };
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return { ok: false, error: "Customer record not found" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("registries").insert({
    customer_id: customerId,
    title: title.trim(),
    parent_name: parentName.trim() || me.name,
    baby_name_or_title: babyNameOrTitle.trim() || "Baby",
    event_date: eventDate,
    slug,
    items,
  });

  if (error) {
    // A demoDB() fallback here means "the app said success" while the
    // registry was never actually saved anywhere durable — it's gone the
    // moment this server instance recycles, with the customer none the wiser.
    console.error("Registry insert failed:", error);
    Sentry.captureException(error, { tags: { area: "customer_registry" } });
    return { ok: false, error: "Could not save your registry. Please try again." };
  }

  return { ok: true, slug };
}

export async function myRegistriesAction(): Promise<BabyRegistry[]> {
  const me = await currentCustomer();
  if (!me) return [];

  if (isDemo()) {
    return demoDB().registries.filter((r) => r.customer_id === me.sub);
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("registries").select("*").eq("customer_id", customerId);
  if (error) {
    console.error("myRegistriesAction query failed:", error);
    Sentry.captureException(error, { tags: { area: "customer_registry_read" } });
  }
  return (data ?? demoDB().registries.filter((r) => r.customer_id === customerId)) as BabyRegistry[];
}

export async function getBabyRegistryBySlugAction(slug: string): Promise<BabyRegistry | null> {
  if (isDemo()) {
    return demoDB().registries.find((r) => r.slug === slug) ?? null;
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("registries").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("getBabyRegistryBySlugAction query failed:", error);
    Sentry.captureException(error, { tags: { area: "customer_registry_read" } });
  }
  return (data ?? demoDB().registries.find((r) => r.slug === slug)) as BabyRegistry | null;
}

/**
 * Marks a registry item as gifted. purchased_qty was set to 0 at creation and
 * never incremented anywhere — the "1-click gift" flow added the product to
 * the gift-giver's cart but never told the registry itself, so the fulfilled
 * badge/progress bar never moved and a second gift-giver had no way to see an
 * item was already covered. No sign-in required: gift-givers are anonymous by
 * design (that's the whole point of a shareable registry link).
 *
 * Counted at "added to cart" time, not at completed order — the registry has
 * no login and nothing links a later checkout back to it, so this is the
 * earliest (and only) point in the guest flow where intent to gift is known.
 */
export async function giftRegistryItemAction(
  slug: string,
  productId: string,
  qty: number = 1,
): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const registry = demoDB().registries.find((r) => r.slug === slug);
    const item = registry?.items.find((i) => i.product_id === productId);
    if (!item) return { ok: false, error: "Registry item not found" };
    item.purchased_qty += qty;
    return { ok: true };
  }

  const supabase = createAdminClient();
  const { data: registry, error: fetchErr } = await supabase
    .from("registries")
    .select("id, items")
    .eq("slug", slug)
    .maybeSingle();
  if (fetchErr || !registry) {
    logQueryError("customer_registry", "giftRegistryItemAction:fetch", fetchErr);
    return { ok: false, error: "Registry not found" };
  }

  const items = (registry.items as RegistryItem[]) ?? [];
  const idx = items.findIndex((i) => i.product_id === productId);
  const found = items[idx];
  if (idx === -1 || !found) return { ok: false, error: "Registry item not found" };
  items[idx] = { ...found, purchased_qty: found.purchased_qty + qty };

  const { error: updateErr } = await supabase.from("registries").update({ items }).eq("id", registry.id);
  if (updateErr) {
    logQueryError("customer_registry", "giftRegistryItemAction:update", updateErr);
    return { ok: false, error: "Could not update the registry. Please try again." };
  }
  return { ok: true };
}

/* ── Subscribe & Save Actions ────────────────────────────────────────────── */

export async function createSubscriptionAction(
  productId: string,
  variantId: string | null,
  qty: number,
  frequencyDays: number,
): Promise<{ ok: boolean; error?: string }> {
  const me = await currentCustomer();
  if (!me) return { ok: false, error: "Please sign in to subscribe" };

  const nextDate = new Date(Date.now() + frequencyDays * 24 * 3600 * 1000).toISOString().slice(0, 10);

  if (isDemo()) {
    const sub: Subscription = {
      id: `demo-sub-${Date.now()}`,
      customer_id: me.sub,
      product_id: productId,
      variant_id: variantId,
      qty,
      frequency_days: frequencyDays,
      status: "active",
      discount_percent: 10,
      next_delivery_date: nextDate,
      created_at: new Date().toISOString(),
    };
    demoDB().subscriptions.unshift(sub);
    return { ok: true };
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return { ok: false, error: "Customer account not found" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("subscriptions").insert({
    customer_id: customerId,
    product_id: productId,
    variant_id: variantId,
    qty,
    frequency_days: frequencyDays,
    status: "active",
    discount_percent: 10,
    next_delivery_date: nextDate,
  });

  if (error) {
    // A demoDB() fallback here means "the app said success" while the
    // subscription was never actually saved anywhere durable — it silently
    // never delivers, and the customer has no idea it didn't take.
    console.error("Subscription insert failed:", error);
    Sentry.captureException(error, { tags: { area: "customer_subscription" } });
    return { ok: false, error: "Could not set up your subscription. Please try again." };
  }

  return { ok: true };
}

export async function mySubscriptionsAction(): Promise<Subscription[]> {
  const me = await currentCustomer();
  if (!me) return [];

  if (isDemo()) {
    return demoDB().subscriptions.filter((s) => s.customer_id === me.sub);
  }

  const customerId = await findMyCustomerId(me.sub);
  if (!customerId) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("subscriptions").select("*").eq("customer_id", customerId);
  if (error) {
    console.error("mySubscriptionsAction query failed:", error);
    Sentry.captureException(error, { tags: { area: "customer_subscription_read" } });
  }
  return (data ?? demoDB().subscriptions.filter((s) => s.customer_id === customerId)) as Subscription[];
}
