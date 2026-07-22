import "server-only";
import type {
  AddressSnapshot,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
} from "@/lib/types";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateCoupon, findCoupon, getSettings } from "./catalog";
import { logEvent } from "./events";
import { isPinServiceable } from "@/lib/pin";

export const DELIVERY_FEE = 49;

export interface PlaceOrderInput {
  items: { itemId: string; qty: number }[]; // "b:" prefix = bundle
  address: AddressSnapshot;
  payment_method: PaymentMethod;
  coupon_code?: string;
  language: "en" | "ta";
  customer_id?: string;
  whatsapp_opt_in?: boolean;
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
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
  /** products whose stock this line consumes (bundle → its members) */
  stockUnits: { productId: string; qty: number }[];
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
        name_snapshot: bundle.name_en,
        price_snapshot: bundle.bundle_price,
        qty: item.qty,
        stockUnits: bundle.product_ids.map((pid) => ({ productId: pid, qty: item.qty })),
      });
    } else {
      const product = products.find((p) => p.id === item.itemId);
      if (!product) return null;
      lines.push({
        product_id: product.id,
        bundle_id: null,
        name_snapshot: product.name_en,
        price_snapshot: product.price,
        qty: item.qty,
        stockUnits: [{ productId: product.id, qty: item.qty }],
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
        o.address_snapshot.phone.replace(/\D/g, "").slice(-10) === phone,
    ).length;
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("payment_method", "cod")
    .in("status", ["cancelled", "returned"])
    .contains("address_snapshot", { phone });
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
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("customers")
      .update({ name: input.address.name, language: input.language })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data } = await supabase
    .from("customers")
    .insert({
      name: input.address.name,
      phone,
      language: input.language,
      whatsapp_opt_in: input.whatsapp_opt_in ?? true,
    })
    .select("id")
    .single();
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
  const delivery_fee = subtotal > settings.free_delivery_threshold ? 0 : DELIVERY_FEE;

  let discount = 0;
  let coupon_code: string | null = null;
  if (input.coupon_code) {
    const check = evaluateCoupon(await findCoupon(input.coupon_code), subtotal);
    if (!check.ok) return { ok: false, error: "coupon_invalid", detail: check.reason };
    discount = check.discount;
    coupon_code = check.coupon.code;
  }

  const total = subtotal + delivery_fee - discount;
  if (input.payment_method === "cod") {
    if (total > settings.cod_limit) return { ok: false, error: "cod_limit" };
    // Blocklist: 2+ refused COD deliveries (cancelled/returned) disables COD.
    const phone = input.address.phone.replace(/\D/g, "").slice(-10);
    const refused = await countRefusedCod(phone);
    if (refused >= 2) return { ok: false, error: "cod_limit", detail: "cod_blocked" };
  }

  const sameDay = await sameDayEligible(input.address.pin);

  if (isDemo()) {
    const db = demoDB();
    // stock check across all lines first, then decrement (mirror of confirm_order)
    const needed = new Map<string, number>();
    for (const l of lines)
      for (const u of l.stockUnits)
        needed.set(u.productId, (needed.get(u.productId) ?? 0) + u.qty);
    for (const [pid, qty] of needed) {
      const p = db.products.find((x) => x.id === pid);
      if (!p || p.stock < qty) return { ok: false, error: "out_of_stock" };
    }
    for (const [pid, qty] of needed) {
      const p = db.products.find((x) => x.id === pid)!;
      p.stock -= qty;
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
        name_snapshot: l.name_snapshot,
        price_snapshot: l.price_snapshot,
        qty: l.qty,
      })),
      placed_at: new Date().toISOString(),
      language: input.language,
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

  // ── Live mode (Supabase) ──────────────────────────────────────────────────
  const supabase = createAdminClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .insert({
      customer_id: input.customer_id ?? null,
      status: "new",
      payment_method: input.payment_method,
      payment_status: input.payment_method === "cod" ? "cod_pending" : "pending",
      subtotal,
      delivery_fee,
      discount,
      coupon_code,
      total,
      address_snapshot: input.address,
    })
    .select("*")
    .single();
  if (error || !orderRow)
    return { ok: false, error: "server", detail: error?.message };

  const itemRows = lines.map((l) => ({
    order_id: orderRow.id,
    product_id: l.product_id,
    name_snapshot: l.name_snapshot,
    price_snapshot: l.price_snapshot,
    qty: l.qty,
  }));
  // Bundles also decrement their member products: expand as zero-price stock rows.
  for (const l of lines)
    if (l.bundle_id)
      for (const u of l.stockUnits)
        itemRows.push({
          order_id: orderRow.id,
          product_id: u.productId,
          name_snapshot: `↳ part of ${l.name_snapshot}`,
          price_snapshot: 0,
          qty: u.qty,
        });

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderRow.id);
    return { ok: false, error: "server", detail: itemsError.message };
  }

  // COD confirms (and decrements stock) immediately; Razorpay waits for the
  // webhook — the webhook is the ONLY thing that marks an order paid.
  if (input.payment_method === "cod") {
    const { error: confirmError } = await supabase.rpc("confirm_order", {
      p_order_id: orderRow.id,
    });
    if (confirmError) {
      await supabase.from("orders").delete().eq("id", orderRow.id);
      return { ok: false, error: "out_of_stock" };
    }
  }

  if (coupon_code) {
    const current = await findCoupon(coupon_code);
    if (current)
      await supabase
        .from("coupons")
        .update({ used_count: current.used_count + 1 })
        .eq("code", coupon_code);
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
  return { ok: true, order };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row mapping */
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
    items: (row.order_items ?? [])
      .filter((i: any) => i.price_snapshot > 0 || i.qty === 0 || !String(i.name_snapshot).startsWith("↳"))
      .map(
        (i: any): OrderItem => ({
          product_id: i.product_id,
          name_snapshot: i.name_snapshot,
          price_snapshot: i.price_snapshot,
          qty: i.qty,
        }),
      ),
    placed_at: row.placed_at,
    language: "en",
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
