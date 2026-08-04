import "server-only";
import { calculateDeliveryFee } from "@/lib/constants";
import type {
  AddressSnapshot,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  ProductVariant,
} from "@/lib/types";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateCoupon, findCoupon, getSettings } from "./catalog";
import { isBirthdayCode } from "@/lib/baby-club";
import { logEvent } from "./events";
import { dispatchServerConversionEvent } from "@/lib/analytics";
import { isPinServiceable } from "@/lib/pin";

export const DELIVERY_FEE = 49;

export interface PlaceOrderInput {
  items: { itemId: string; qty: number; variantId?: string }[]; // "b:" prefix = bundle
  address: AddressSnapshot;
  payment_method: PaymentMethod;
  coupon_code?: string;
  language: "en" | "ta";
  customer_id?: string;
  whatsapp_opt_in?: boolean;
  is_gift?: boolean;
  gift_message?: string;
  delivery_mode?: "standard" | "express_3hr" | "store_pickup";
}

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | {
      ok: false;
      error:
        | "empty_cart"
        | "bad_address"
        | "unserviceable_pin"
        | "out_of_stock"
        | "cod_limit"
        | "coupon_invalid"
        | "server";
      detail?: string;
    };

interface ResolvedLine {
  product_id: string | null;
  bundle_id: string | null;
  variant_id: string | null;
  variant_name: string | null;
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
  /** GST rate charged at sale time — null for bundles (no single rate). */
  gst_rate: number | null;
  /** products whose stock this line consumes (bundle → its members) */
  stockUnits: { productId: string; variantId?: string | null; qty: number }[];
}

async function resolveLines(
  items: PlaceOrderInput["items"],
): Promise<ResolvedLine[] | null> {
  const db = isDemo() ? demoDB() : null;
  let products: Product[];
  let bundles;
  if (db) {
    products = db.products;
    bundles = db.bundles;
  } else {
    const { getActiveProducts, getActiveBundles } = await import("./catalog");
    [products, bundles] = await Promise.all([getActiveProducts(), getActiveBundles()]);
  }

  const lines: ResolvedLine[] = [];
  for (const item of items) {
    if (item.qty < 1 || item.qty > 20) return null;
    if (item.itemId.startsWith("b:")) {
      const bundle = bundles.find((b) => b.id === item.itemId.slice(2));
      if (!bundle) return null;
      lines.push({
        product_id: null,
        bundle_id: bundle.id,
        variant_id: null,
        variant_name: null,
        name_snapshot: bundle.name_en,
        price_snapshot: bundle.bundle_price,
        qty: item.qty,
        gst_rate: null,
        stockUnits: bundle.product_ids.map((pid) => ({ productId: pid, qty: item.qty })),
      });
    } else {
      const product = products.find((p) => p.id === item.itemId);
      if (!product) return null;
      // A variant id must belong to this product — reject rather than
      // silently falling back to the base product (a customer picked a
      // specific size/pack; charging/shipping the wrong one is worse than
      // rejecting the order).
      let variant: ProductVariant | null = null;
      if (item.variantId) {
        variant = product.variants?.find((v) => v.id === item.variantId) ?? null;
        if (!variant) return null;
      }
      lines.push({
        product_id: product.id,
        bundle_id: null,
        variant_id: variant?.id ?? null,
        variant_name: variant?.name_en ?? null,
        // Baked into the snapshot itself (not just the separate variant_id/
        // variant_name fields) so the chosen size/pack is always visible on
        // invoices, packing slips and order history in BOTH modes.
        name_snapshot: variant ? `${product.name_en} — ${variant.name_en}` : product.name_en,
        price_snapshot: variant?.price ?? product.price,
        qty: item.qty,
        gst_rate: product.gst_rate ?? null,
        stockUnits: [{ productId: product.id, variantId: variant?.id ?? null, qty: item.qty }],
      });
    }
  }
  return lines;
}

function validAddress(a: AddressSnapshot): boolean {
  return Boolean(
    a.name.trim() &&
      /^\d{10}$/.test(a.phone.replace(/\D/g, "").slice(-10)) &&
      a.line.trim() &&
      /^\d{6}$/.test(a.pin),
  );
}

/** Is same-day delivery available right now for this PIN? (IST clock) */
export async function sameDayEligible(pin: string): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.same_day_enabled) return false;
  if (!isPinServiceable(pin, settings.serviceable_pins, settings.unserviceable_pins).serviceable) return false;
  const istHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  return istHour < 16; // before the 4 PM cutoff
}

async function countRefusedCod(phone: string): Promise<number> {
  if (isDemo())
    return demoDB().orders.filter(
      (o) =>
        o.payment_method === "cod" &&
        (o.status === "cancelled" || o.status === "returned") &&
        (o.address_snapshot.phone || "").replace(/\D/g, "").slice(-10) === phone,
    ).length;
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("payment_method", "cod")
    .in("status", ["cancelled", "returned"])
    .contains("address_snapshot", { phone });
  // Fails open on error: a transient DB failure should not block a legitimate
  // COD order. This means the blocklist can be silently skipped if the query
  // errors — acceptable since it's an abuse deterrent, not a payment control.
  if (error) {
    console.error("countRefusedCod query failed, failing open:", error);
    return 0;
  }
  return count ?? 0;
}

/** Keep the CRM in sync: every order upserts a customer record by phone. */
async function upsertCustomer(input: PlaceOrderInput): Promise<string | null> {
  const phone = input.address.phone.replace(/\D/g, "").slice(-10);
  if (isDemo()) {
    const db = demoDB();
    let c = db.customers.find((x) => x.phone === phone);
    if (!c) {
      c = {
        id: `demo-c-${phone}`,
        name: input.address.name,
        phone,
        email: null,
        language: input.language,
        whatsapp_opt_in: input.whatsapp_opt_in ?? true,
        baby_dob: null,
        notes: "",
        created_at: new Date().toISOString(),
      };
      db.customers.unshift(c);
    } else {
      c.name = input.address.name;
      c.language = input.language;
    }
    return c.id;
  }
  const supabase = createAdminClient();
  const { data: existing, error: selectError } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (selectError) console.error("upsertCustomer select failed:", selectError);
  if (existing) {
    const { error: updateError } = await supabase
      .from("customers")
      .update({ name: input.address.name, language: input.language })
      .eq("id", existing.id);
    if (updateError) console.error("upsertCustomer update failed:", updateError);
    return existing.id;
  }
  const { data, error: insertError } = await supabase
    .from("customers")
    .insert({
      name: input.address.name,
      phone,
      language: input.language,
      whatsapp_opt_in: input.whatsapp_opt_in ?? true,
    })
    .select("id")
    .single();
  if (insertError) {
    // 23505 = unique violation on phone: a concurrent request created the row first.
    if (insertError.code === "23505") {
      const { data: existingAfterRace } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (existingAfterRace) return existingAfterRace.id;
    }
    console.error("upsertCustomer insert failed:", insertError);
  }
  return data?.id ?? null;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (input.items.length === 0) return { ok: false, error: "empty_cart" };
  if (!validAddress(input.address)) return { ok: false, error: "bad_address" };

  const settings = await getSettings();
  if (
    !isPinServiceable(input.address.pin, settings.serviceable_pins, settings.unserviceable_pins)
      .serviceable
  ) {
    return { ok: false, error: "unserviceable_pin" };
  }

  if (!input.customer_id) input.customer_id = (await upsertCustomer(input)) ?? undefined;

  const lines = await resolveLines(input.items);
  if (!lines) return { ok: false, error: "server", detail: "unknown item" };
  const subtotal = lines.reduce((s, l) => s + l.price_snapshot * l.qty, 0);

  let discount = 0;
  let coupon_code: string | null = null;
  if (input.coupon_code) {
    const check = evaluateCoupon(await findCoupon(input.coupon_code), subtotal);
    if (!check.ok) return { ok: false, error: "coupon_invalid", detail: check.reason };
    discount = check.discount;
    coupon_code = check.coupon.code;
  }

  const postDiscountSubtotal = Math.max(0, subtotal - discount);
  const delivery_fee = calculateDeliveryFee(postDiscountSubtotal, settings).fee;

  // discount is already clamped to subtotal in evaluateCoupon; floor here too so
  // the amount charged / collected can never be negative regardless of caller.
  const total = Math.max(0, postDiscountSubtotal + delivery_fee);
  if (input.payment_method === "cod") {
    if (total > settings.cod_limit) return { ok: false, error: "cod_limit" };
    // Blocklist: 2+ refused COD deliveries (cancelled/returned) disables COD.
    const phone = input.address.phone.replace(/\D/g, "").slice(-10);
    const refused = await countRefusedCod(phone);
    if (refused >= 2) return { ok: false, error: "cod_limit", detail: "cod_blocked" };
  }

  const sameDay = await sameDayEligible(input.address.pin);

  // Trim and cap here rather than trusting the form: the DB constraint is 300
  // chars, and an over-long note would fail the insert after stock was taken.
  const is_gift = input.is_gift === true;
  const gift_message = is_gift
    ? (input.gift_message ?? "").trim().slice(0, 300) || null
    : null;

  if (isDemo()) {
    const db = demoDB();
    // stock check across all lines first, then decrement (mirror of confirm_order).
    // Keyed by product+variant so a variant's own stock is checked/decremented
    // separately from the base product's.
    const needed = new Map<string, { productId: string; variantId: string | null; qty: number }>();
    for (const l of lines)
      for (const u of l.stockUnits) {
        const key = `${u.productId}::${u.variantId ?? ""}`;
        const existing = needed.get(key);
        needed.set(key, {
          productId: u.productId,
          variantId: u.variantId ?? null,
          qty: (existing?.qty ?? 0) + u.qty,
        });
      }
    for (const { productId, variantId, qty } of needed.values()) {
      const p = db.products.find((x) => x.id === productId);
      if (!p) return { ok: false, error: "out_of_stock" };
      const v = variantId ? p.variants?.find((x) => x.id === variantId) : null;
      if (variantId ? !v || v.stock < qty : p.stock < qty)
        return { ok: false, error: "out_of_stock" };
    }
    for (const { productId, variantId, qty } of needed.values()) {
      const p = db.products.find((x) => x.id === productId)!;
      p.stock -= qty;
      if (variantId) {
        const v = p.variants!.find((x) => x.id === variantId)!;
        v.stock -= qty;
      }
    }
    const order_no = `RSB-${db.orderSeq++}`;
    const order: Order = {
      id: `demo-o-${order_no}`,
      order_no,
      customer_id: input.customer_id ?? null,
      status: "confirmed",
      payment_method: input.payment_method,
      payment_status: input.payment_method === "cod" ? "cod_pending" : "paid",
      subtotal,
      delivery_fee,
      discount,
      coupon_code,
      total,
      address_snapshot: input.address,
      items: lines.map((l) => ({
        product_id: l.product_id ?? l.bundle_id ?? "",
        variant_id: l.variant_id,
        variant_name: l.variant_name,
        name_snapshot: l.name_snapshot,
        price_snapshot: l.price_snapshot,
        qty: l.qty,
        gst_rate: l.gst_rate,
      })),
      placed_at: new Date().toISOString(),
      language: input.language,
      is_gift,
      gift_message,
      delivery_mode: input.delivery_mode ?? (sameDay ? "express_3hr" : "standard"),
    };
    db.orders.unshift(order);
    if (coupon_code) {
      const c = db.coupons.find((x) => x.code === coupon_code);
      if (c) c.used_count++;
    }
    await logEvent("order.placed", {
      order_no,
      total,
      payment_method: input.payment_method,
      language: input.language,
      same_day: sameDay,
      phone: input.address.phone,
    });
    return { ok: true, order };
  }

  // ── Live mode (Supabase) ────────────────────────────────────────────────
  // One RPC call = one Postgres transaction: order insert, order_items insert,
  // coupon-usage bump, and (for COD) the stock-confirming call to
  // confirm_order() all commit together or not at all. A frozen/crashed
  // function between steps can no longer leave an orphaned order — see the
  // migration for why the previous multi-call sequence could.
  const supabase = createAdminClient();

  // order_items.variant_id used to be a leftover FK to the unused relational
  // `variants` table and couldn't safely carry a products.variants (jsonb)
  // id — the variant_stock migration relaxed that FK and widened the column
  // to text, so it's written here and used by confirm_order() to decrement
  // the right variant's stock. name_snapshot still carries the chosen
  // variant for display, independent of this.
  const itemRows = lines.map((l) => ({
    product_id: l.product_id,
    variant_id: l.variant_id,
    name_snapshot: l.name_snapshot,
    price_snapshot: l.price_snapshot,
    qty: l.qty,
    gst_rate: l.gst_rate,
  }));
  // Bundles also decrement their member products: expand as zero-price stock rows.
  for (const l of lines)
    if (l.bundle_id)
      for (const u of l.stockUnits)
        itemRows.push({
          product_id: u.productId,
          variant_id: u.variantId ?? null,
          name_snapshot: `↳ part of ${l.name_snapshot}`,
          price_snapshot: 0,
          qty: u.qty,
          gst_rate: null,
        });

  const { data: orderRow, error: placeError } = await supabase.rpc("place_order_atomic", {
    p_customer_id: input.customer_id ?? null,
    p_payment_method: input.payment_method,
    p_payment_status: input.payment_method === "cod" ? "cod_pending" : "pending",
    p_subtotal: subtotal,
    p_delivery_fee: delivery_fee,
    p_discount: discount,
    p_coupon_code: coupon_code,
    p_total: total,
    p_address_snapshot: input.address,
    p_is_gift: is_gift,
    p_gift_message: gift_message,
    p_delivery_mode: input.delivery_mode ?? (sameDay ? "express_3hr" : "standard"),
    p_items: itemRows,
    // COD confirms (and decrements stock) immediately; Razorpay waits for the
    // webhook — the webhook is the ONLY thing that marks an order paid.
    p_confirm: input.payment_method === "cod",
    // The birthday perk is virtual (no coupons row) — nothing to bump. For
    // Razorpay, DON'T bump here: the order isn't paid yet, and every
    // abandoned/retried checkout would burn a real use of a possibly
    // limited coupon. That bump happens instead once payment is actually
    // confirmed — see bump_coupon_usage() calls in the webhook/confirm routes.
    p_bump_coupon_usage:
      input.payment_method === "cod" && Boolean(coupon_code) && !isBirthdayCode(coupon_code ?? ""),
  });

  if (placeError || !orderRow) {
    // confirm_order() raising "insufficient stock" surfaces here too — the
    // whole transaction (order + items) already rolled back, no cleanup needed.
    if (input.payment_method === "cod") return { ok: false, error: "out_of_stock" };
    return { ok: false, error: "server", detail: placeError?.message };
  }

  const order = await getOrderByNo(orderRow.order_no);
  if (!order) return { ok: false, error: "server", detail: "order readback failed" };

  await logEvent("order.placed", {
    order_no: order.order_no,
    total,
    payment_method: input.payment_method,
    language: input.language,
    same_day: sameDay,
    phone: input.address.phone,
  });
  await dispatchServerConversionEvent({
    eventName: "Purchase",
    orderNo: order.order_no,
    value: total,
    phone: input.address.phone,
  });
  return { ok: true, order };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row mapping */
/**
 * Single source of truth for Supabase order-row → Order mapping. Previously
 * hand-duplicated in admin.ts's listAllOrders/getOrderByOrderNo, which had
 * already drifted (they never read delivery_mode). Any caller needing an
 * order row mapped should import this rather than re-inlining the shape.
 */
export function mapOrder(row: any): Order {
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
    items: (row.order_items ?? [])
      .filter((i: any) => i.price_snapshot > 0 || i.qty === 0 || !String(i.name_snapshot).startsWith("↳"))
      .map(
        (i: any): OrderItem => ({
          product_id: i.product_id,
          variant_id: i.variant_id ?? null,
          name_snapshot: i.name_snapshot,
          price_snapshot: i.price_snapshot,
          qty: i.qty,
          gst_rate: i.gst_rate_snapshot ?? null,
        }),
      ),
    placed_at: row.placed_at,
    // Not tracked per-order in the schema (only per-customer, at signup) — "en"
    // is the same default the rest of the app falls back to.
    language: "en",
    is_gift: row.is_gift ?? false,
    gift_message: row.gift_message ?? null,
    delivery_mode: row.delivery_mode ?? "standard",
    razorpay_payment_id: row.razorpay_payment_id ?? null,
  };
}

export async function getOrderByNo(orderNo: string): Promise<Order | null> {
  if (isDemo())
    return demoDB().orders.find((o) => o.order_no.toLowerCase() === orderNo.toLowerCase()) ?? null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .ilike("order_no", orderNo)
    .maybeSingle();
  return data ? mapOrder(data) : null;
}

/** Public tracking: order number + the phone used at checkout. No login. */
export async function trackOrder(orderNo: string, phone: string): Promise<Order | null> {
  const order = await getOrderByNo(orderNo.trim());
  if (!order) return null;
  const clean = (s: string) => s.replace(/\D/g, "").slice(-10);
  return clean(order.address_snapshot.phone) === clean(phone) ? order : null;
}
