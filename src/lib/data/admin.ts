import "server-only";
import * as Sentry from "@sentry/nextjs";
import { logQueryError } from "@/lib/log-query-error";
import type {
  Banner,
  BannerSlot,
  Brand,
  Coupon,
  CustomerRecord,
  Order,
  OrderStatus,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import type { Category, Milestone } from "@/lib/constants";
import { mapOrder } from "./orders";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "./events";

/**
 * Staff-gated data access for /admin. Staff sessions are a custom HMAC-signed
 * cookie, not real Supabase Auth, so auth.uid() is never set for them and RLS
 * cannot enforce the staff boundary here — every read/write goes through the
 * service-role client instead, and the staff/owner boundary is enforced in
 * src/app/admin/actions.ts (gate()/gateOwner()) before any of these functions
 * run. Each mutation is written to staff_log for an audit trail. Demo mode is
 * open (banner shown in UI).
 */

import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { hashPassword } from "@/lib/admin-password";
import type { PendingApproval, StaffAccount, StaffAccountPublic, StaffRole } from "@/lib/types";

export async function requireStaff(): Promise<{ userId: string; username: string; role: StaffRole } | null> {
  try {
    const cookieStore = await cookies();
    const claims = verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
    if (claims) {
      return { userId: claims.sub, username: claims.username, role: claims.role };
    }
  } catch {
    /* ignore */
  }

  if (isDemo()) {
    // Demo mode grants an open owner session by design (showcase deploys with no
    // Supabase keys). But if we reach here in a PRODUCTION build, it almost
    // certainly means NEXT_PUBLIC_SUPABASE_URL is missing/typo'd in this
    // environment — which silently leaves /admin fully unauthenticated. Fail
    // loud in the logs so a misconfigured prod deploy is caught immediately
    // rather than sitting open until someone notices.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[SECURITY] requireStaff() hit the demo owner fallback in a production " +
        "build — /admin is UNAUTHENTICATED. Supabase env vars are likely " +
        "missing for this deployment. Fix NEXT_PUBLIC_SUPABASE_URL / service " +
        "role key immediately.",
      );
    }
    return { userId: "admin-owner", username: "Owner", role: "owner" };
  }

  return null;
}

async function logStaff(userId: string, action: string, entity: string, entityId: string) {
  if (isDemo()) {
    demoDB().staffLog.unshift({ action, entity, entity_id: entityId, at: new Date().toISOString() });
    return;
  }
  // Service-role, not the caller's session client: staff auth is a custom
  // HMAC-cookie scheme, never real Supabase Auth, so auth.uid() is always
  // null here and the old RLS-gated insert could never succeed (see the
  // staff_log_fixes migration). The staff/owner boundary is already
  // enforced upstream by gate()/gateOwner() before this is ever called.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("staff_log")
    .insert({ user_id: userId, action, entity, entity_id: entityId });
  logQueryError("admin", "logStaff", error);
}

export interface StaffLogEntry {
  id?: string;
  user_id?: string;
  action: string;
  entity: string;
  entity_id: string;
  at: string;
}

export async function getStaffLogs(query?: string, entityFilter?: string): Promise<StaffLogEntry[]> {
  let logs: StaffLogEntry[] = [];
  if (isDemo()) {
    logs = demoDB().staffLog;
  } else {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("staff_log")
      .select("*")
      .order("at", { ascending: false })
      .limit(100);
    logQueryError("admin", "getStaffLogs", error);

    logs = (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      user_id: String(row.user_id ?? ""),
      action: String(row.action ?? ""),
      entity: String(row.entity ?? ""),
      entity_id: String(row.entity_id ?? ""),
      at: String(row.created_at || row.at || new Date().toISOString()),
    }));
  }

  const q = (query ?? "").trim().toLowerCase();
  const e = (entityFilter ?? "").trim().toLowerCase();

  return logs.filter((l) => {
    if (e && e !== "all" && l.entity.toLowerCase() !== e) return false;
    if (!q) return true;
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.entity_id.toLowerCase().includes(q) ||
      (l.user_id && l.user_id.toLowerCase().includes(q))
    );
  });
}

/* ── Orders ──────────────────────────────────────────────────────────────── */

export async function listAllOrders(): Promise<Order[]> {
  if (isDemo()) return demoDB().orders;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("placed_at", { ascending: false })
    .limit(200);
  logQueryError("admin", "listAllOrders", error);
  return (data ?? []).map(mapOrder);
}

export async function getOrderByOrderNo(orderNo: string): Promise<Order | null> {
  if (isDemo()) {
    return (
      demoDB().orders.find(
        (o) => o.order_no.toLowerCase() === orderNo.toLowerCase(),
      ) ?? null
    );
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_no", orderNo)
    .single();
  // PGRST116 ("0 rows") is .single()'s normal way of saying "not found" for a
  // typo'd or nonexistent order number — not a failure worth reporting.
  if (error?.code !== "PGRST116") logQueryError("admin", "getOrderByOrderNo", error);

  return data ? mapOrder(data) : null;
}

export async function setOrderStatus(
  staffId: string,
  orderId: string,
  status: OrderStatus,
): Promise<boolean> {
  if (isDemo()) {
    const order = demoDB().orders.find((o) => o.id === orderId);
    if (!order) return false;
    order.status = status;
    if (status === "delivered" && order.payment_method === "cod")
      order.payment_status = "cod_collected";
    await logStaff(staffId, `status:${status}`, "order", order.order_no);
    await logEvent(`order.${status}`, { order_no: order.order_no, phone: order.address_snapshot.phone });
    return true;
  }
  const supabase = createAdminClient();
  if (status === "cancelled") {
    const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
    if (error) {
      logQueryError("admin", "setOrderStatus:cancel_order", error);
      return false;
    }
  } else {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      logQueryError("admin", "setOrderStatus:update", error);
      return false;
    }
    if (status === "delivered")
      await supabase
        .from("orders")
        .update({ payment_status: "cod_collected" })
        .eq("id", orderId)
        .eq("payment_method", "cod");
  }
  const { data: row } = await supabase.from("orders").select("order_no, address_snapshot").eq("id", orderId).single();
  await logStaff(staffId, `status:${status}`, "order", row?.order_no ?? orderId);
  await logEvent(`order.${status}`, {
    order_no: row?.order_no,
    phone: row?.address_snapshot?.phone,
  });
  return true;
}

export async function refundOrder(
  staffId: string,
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const order = demoDB().orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Order not found" };
    order.payment_status = "refunded";
    await logStaff(staffId, "refund", "order", order.order_no);
    await logEvent("order.refunded", { order_no: order.order_no, payment_id: "demo_payment" });
    return { ok: true };
  }

  const supabase = createAdminClient();
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("order_no, payment_method, payment_status, razorpay_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (fetchErr || !order) return { ok: false, error: fetchErr?.message ?? "Order not found" };

  // An order paid through Razorpay MUST actually be refunded through Razorpay
  // — marking it "refunded" in our own DB without that call previously looked
  // identical to a real refund in the admin UI while no money moved. COD (or
  // an order that was never actually captured) has nothing to call Razorpay
  // about, so those just update the status directly.
  const wasPaidOnline = order.payment_method === "razorpay" && order.payment_status === "paid";
  if (wasPaidOnline) {
    const { razorpayConfigured, refundPayment } = await import("@/lib/razorpay");
    if (!razorpayConfigured()) return { ok: false, error: "Razorpay is not configured" };
    if (!order.razorpay_payment_id)
      return { ok: false, error: "No Razorpay payment id on file for this order — cannot refund automatically" };
    const refunded = await refundPayment(order.razorpay_payment_id, order.order_no);
    if (!refunded) return { ok: false, error: "Razorpay refund request failed" };
  }

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "refunded" })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  await logStaff(staffId, "refund", "order", order.order_no);
  await logEvent("order.refunded", { order_no: order.order_no, payment_id: order.razorpay_payment_id });
  return { ok: true };
}

/* ── Products ────────────────────────────────────────────────────────────── */

export interface ProductInput {
  id?: string;
  name_en: string;
  name_ta: string;
  slug?: string;
  brand: string;
  milestone: Milestone;
  categories: Category[];
  price: number;
  mrp: number;
  gst_rate?: number;
  stock: number;
  tile_color: string;
  emoji: string;
  description_en: string;
  description_ta: string;
  images?: string[];
  variants?: Product["variants"];
  size_chart_type?: Product["size_chart_type"];
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/**
 * products.slug is UNIQUE, and the slug is derived from the English name — so
 * two products named alike ("Cotton Frock") would collide and the insert would
 * fail. Suffix the slug instead, keeping the shareable /p/[slug] link working
 * for both rather than rejecting the second product.
 */
async function uniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string> {
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`; // 50 same-named products: fall back to unique-by-time
}

export async function listAllProducts(): Promise<Product[]> {
  if (isDemo()) return demoDB().products;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_categories(category)")
    .order("created_at", { ascending: true });
  logQueryError("admin", "listAllProducts", error);
  const { mapProductRow } = await import("./map");
  return (data ?? []).map(mapProductRow);
}

export async function upsertProduct(staffId: string, input: ProductInput): Promise<string | null> {
  // Server-side validation. The admin form checks these, but the action is a
  // plain POST endpoint — a direct call could persist a negative price/stock or
  // a garbage GST rate. Reject rather than store bad data.
  if (!input.name_en?.trim()) return null;
  if (!input.categories || input.categories.length === 0) return null;
  if (!Number.isFinite(input.price) || input.price < 0) return null;
  if (input.mrp != null && (!Number.isFinite(input.mrp) || input.mrp < 0)) return null;
  if (!Number.isFinite(input.stock) || input.stock < 0) return null;
  if (input.gst_rate != null && (!Number.isFinite(input.gst_rate) || input.gst_rate < 0 || input.gst_rate > 28))
    return null;

  const slug = input.slug || slugify(input.name_en);
  if (isDemo()) {
    const db = demoDB();
    if (input.id) {
      const p = db.products.find((x) => x.id === input.id);
      if (!p) return null;
      Object.assign(p, { ...input, slug: p.slug, gst_rate: input.gst_rate ?? p.gst_rate ?? 12 });
      await logStaff(staffId, "update", "product", p.id);
      return p.id;
    }
    const id = `demo-p${db.products.length + 1}-${Date.now() % 10000}`;
    db.products.unshift({
      id,
      name_en: input.name_en,
      name_ta: input.name_ta || input.name_en,
      slug,
      brand: input.brand,
      milestone: input.milestone,
      categories: input.categories,
      price: input.price,
      mrp: input.mrp || input.price,
      gst_rate: input.gst_rate ?? 12,
      stock: input.stock,
      low_stock_threshold: 5,
      status: "active",
      tile_color: input.tile_color,
      emoji: input.emoji,
      images: input.images ?? [],
      description_en: input.description_en,
      description_ta: input.description_ta || input.description_en,
      ingredients: null,
      variants: input.variants,
      size_chart_type: input.size_chart_type,
    });
    await logStaff(staffId, "create", "product", id);
    return id;
  }

  const supabase = createAdminClient();
  const row = {
    name_en: input.name_en,
    name_ta: input.name_ta || input.name_en,
    brand: input.brand,
    milestone: input.milestone,
    price: input.price,
    mrp: input.mrp || input.price,
    gst_rate: input.gst_rate ?? 12,
    stock: input.stock,
    tile_color: input.tile_color,
    emoji: input.emoji,
    description_en: input.description_en,
    description_ta: input.description_ta || input.description_en,
    ...(input.images ? { images: input.images } : {}),
    ...(input.variants ? { variants: input.variants } : {}),
    ...(input.size_chart_type ? { size_chart_type: input.size_chart_type } : {}),
  };
  let productId = input.id ?? null;
  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) {
      logQueryError("admin", "upsertProduct:update", error);
      return null;
    }
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, slug: await uniqueSlug(supabase, slug) })
      .select("id")
      .single();
    if (error || !data) {
      logQueryError("admin", "upsertProduct:insert", error);
      return null;
    }
    productId = data.id;
  }
  await supabase.from("product_categories").delete().eq("product_id", productId);
  await supabase
    .from("product_categories")
    .insert(input.categories.map((category) => ({ product_id: productId, category })));
  await logStaff(staffId, input.id ? "update" : "create", "product", productId!);
  return productId;
}

export async function updateProductStock(staffId: string, productId: string, stockDelta: number): Promise<boolean> {
  if (isDemo()) {
    const p = demoDB().products.find((x) => x.id === productId);
    if (!p) return false;
    p.stock = Math.max(0, p.stock + stockDelta);
    await logStaff(staffId, `stock:${stockDelta > 0 ? "+" : ""}${stockDelta}`, "product", productId);
    return true;
  }
  const supabase = createAdminClient();
  // Atomic: does the add inside one locked UPDATE rather than read-then-write,
  // so a concurrent order confirmation (also atomic) can't stomp this change.
  const { data: newStock, error } = await supabase.rpc("adjust_product_stock", {
    p_id: productId,
    p_delta: stockDelta,
  });
  if (error || newStock === null) {
    logQueryError("admin", "updateProductStock", error);
    return false;
  }
  await logStaff(staffId, `stock_update:${newStock}`, "product", productId);
  return true;
}

/** Archive, never delete (spec rule). */
export async function archiveProduct(staffId: string, id: string): Promise<void> {
  if (isDemo()) {
    const p = demoDB().products.find((x) => x.id === id);
    if (p) p.status = "archived";
  } else {
    const supabase = createAdminClient();
    await supabase.from("products").update({ status: "archived" }).eq("id", id);
  }
  await logStaff(staffId, "archive", "product", id);
}

/* ── Coupons ─────────────────────────────────────────────────────────────── */

export async function listCoupons(): Promise<Coupon[]> {
  if (isDemo()) return demoDB().coupons;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("coupons").select("*").order("code");
  logQueryError("admin", "listCoupons", error);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((c: any) => ({
    code: c.code,
    type: c.type,
    value: c.value,
    min_order: c.min_order,
    valid_until: c.valid_until,
    usage_limit: c.usage_limit,
    used_count: c.used_count,
  }));
}

export async function addCoupon(staffId: string, coupon: Omit<Coupon, "used_count">): Promise<boolean> {
  const code = coupon.code.trim().toUpperCase();
  if (!code || coupon.value <= 0) return false;
  // A percent coupon over 100 makes no sense and would try to discount more than
  // the order is worth. Reject at creation so a typo (150 meaning ₹150 entered
  // under the "percent" type) can never reach checkout.
  if (coupon.type === "percent" && coupon.value > 100) return false;
  if (isDemo()) {
    const db = demoDB();
    if (db.coupons.some((c) => c.code === code)) return false;
    db.coupons.push({ ...coupon, code, used_count: 0 });
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("coupons").insert({
      code,
      type: coupon.type,
      value: coupon.value,
      min_order: coupon.min_order,
      valid_until: coupon.valid_until,
      usage_limit: coupon.usage_limit,
    });
    if (error) {
      logQueryError("admin", "addCoupon", error);
      return false;
    }
  }
  await logStaff(staffId, "create", "coupon", code);
  return true;
}

export async function deleteCoupon(staffId: string, code: string): Promise<void> {
  if (isDemo()) {
    const db = demoDB();
    db.coupons = db.coupons.filter((c) => c.code !== code);
  } else {
    const supabase = createAdminClient();
    await supabase.from("coupons").delete().eq("code", code);
  }
  await logStaff(staffId, "delete", "coupon", code);
}

/** Advertise a coupon in the offer strip, or stop advertising it. */
export async function setCouponFeatured(
  staffId: string,
  code: string,
  featured: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const coupon = demoDB().coupons.find((c) => c.code === code);
    if (!coupon) return { ok: false, error: "Coupon not found" };
    coupon.featured = featured;
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("coupons").update({ featured }).eq("code", code);
    if (error) {
      logQueryError("admin", "setCouponFeatured", error);
      return { ok: false, error: "Could not update the coupon. Please try again." };
    }
  }
  await logStaff(staffId, featured ? "feature" : "unfeature", "coupon", code);
  return { ok: true };
}

/* ── Banners ─────────────────────────────────────────────────────────────── */

export type BannerInput = {
  id?: string;
  slot: BannerSlot;
  image_url: string;
  alt: string;
  link_url: string | null;
  sort: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

export async function upsertBanner(
  staffId: string,
  input: BannerInput,
): Promise<string | null> {
  if (!input.image_url) return null;

  if (isDemo()) {
    const db = demoDB();
    const id = input.id ?? `demo-bn${db.banners.length + 1}`;
    const row: Banner = { ...input, id };
    const at = db.banners.findIndex((b) => b.id === id);
    if (at === -1) db.banners.push(row);
    else db.banners[at] = row;
    await logStaff(staffId, input.id ? "update" : "create", "banner", id);
    return id;
  }

  try {
    const supabase = createAdminClient();
    const payload = {
      slot: input.slot,
      image_url: input.image_url,
      alt: input.alt,
      link_url: input.link_url,
      sort: input.sort,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      active: input.active,
    };

    const { data, error } = input.id
      ? await supabase.from("banners").update(payload).eq("id", input.id).select("id").maybeSingle()
      : await supabase.from("banners").insert(payload).select("id").maybeSingle();

    if (error || !data) {
      // Live mode: a failed write must report failure. Silently writing to the
      // in-memory demo store (which vanishes on the next cold start and is
      // invisible to other serverless instances) reported success for a banner
      // that was never persisted. Return null so the admin UI shows the error.
      logQueryError("admin", "upsertBanner", error);
      return null;
    }
    await logStaff(staffId, input.id ? "update" : "create", "banner", data.id);
    return data.id;
  } catch (e) {
    logQueryError("admin", "upsertBanner", e);
    return null;
  }
}

export async function deleteBanner(staffId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const db = demoDB();
    db.banners = db.banners.filter((b) => b.id !== id);
  } else {
    const { error } = await createAdminClient().from("banners").delete().eq("id", id);
    if (error) {
      logQueryError("admin", "deleteBanner", error);
      return { ok: false, error: error.message };
    }
  }
  await logStaff(staffId, "delete", "banner", id);
  return { ok: true };
}

/* ── Brands ──────────────────────────────────────────────────────────────── */

export type BrandInput = {
  id?: string;
  name: string;
  slug: string;
  logo_url: string;
  sort: number;
  active: boolean;
};

export async function upsertBrand(staffId: string, input: BrandInput): Promise<string | null> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !slug || !input.logo_url) return null;

  if (isDemo()) {
    const db = demoDB();
    // The unique index does this in Postgres; demo mode has to check by hand.
    if (db.brands.some((b) => b.slug === slug && b.id !== input.id)) return null;
    const id = input.id ?? `demo-br${db.brands.length + 1}`;
    const row: Brand = { ...input, id, name, slug };
    const at = db.brands.findIndex((b) => b.id === id);
    if (at === -1) db.brands.push(row);
    else db.brands[at] = row;
    await logStaff(staffId, input.id ? "update" : "create", "brand", id);
    return id;
  }

  const supabase = createAdminClient();
  const payload = {
    name,
    slug,
    logo_url: input.logo_url,
    sort: input.sort,
    active: input.active,
  };

  const { data, error } = input.id
    ? await supabase.from("brands").update(payload).eq("id", input.id).select("id").maybeSingle()
    : await supabase.from("brands").insert(payload).select("id").maybeSingle();

  if (error || !data) {
    logQueryError("admin", "upsertBrand", error);
    return null;
  }
  await logStaff(staffId, input.id ? "update" : "create", "brand", data.id);
  return data.id;
}

/**
 * Remove a brand. Products keep their free-text brand name and simply lose the
 * link, which is why the column is ON DELETE SET NULL rather than a cascade —
 * deleting a logo must never delete stock.
 */
export async function deleteBrand(staffId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const db = demoDB();
    db.brands = db.brands.filter((b) => b.id !== id);
    for (const product of db.products) {
      if (product.brand_id === id) product.brand_id = null;
    }
  } else {
    const { error } = await createAdminClient().from("brands").delete().eq("id", id);
    if (error) {
      logQueryError("admin", "deleteBrand", error);
      return { ok: false, error: error.message };
    }
  }
  await logStaff(staffId, "delete", "brand", id);
  return { ok: true };
}

/* ── Reviews ─────────────────────────────────────────────────────────────── */

export async function listReviews(status?: Review["status"]): Promise<Review[]> {
  if (isDemo()) {
    const all = demoDB().reviews;
    return status ? all.filter((r) => r.status === status) : all;
  }
  const supabase = createAdminClient();
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  logQueryError("admin", "listReviews", error);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((row: any) => ({
    id: row.id,
    product_id: row.product_id,
    author_name: row.author_name ?? "Customer",
    rating: row.rating,
    text: row.text,
    status: row.status,
    created_at: row.created_at,
  }));
}

export async function moderateReview(
  staffId: string,
  reviewId: string,
  status: "approved" | "rejected",
): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const r = demoDB().reviews.find((x) => x.id === reviewId);
    if (r) r.status = status;
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("reviews").update({ status }).eq("id", reviewId);
    if (error) {
      logQueryError("admin", "moderateReview", error);
      return { ok: false, error: error.message };
    }
  }
  await logStaff(staffId, `review:${status}`, "review", reviewId);
  return { ok: true };
}

export async function addAdminReview(
  staffId: string,
  input: { author_name: string; rating: number; text: string; product_id: string },
): Promise<{ ok: boolean; error?: string }> {
  // Normalise: the action accepts arbitrary numbers/strings, so clamp the rating
  // to 1–5 and cap the text rather than trusting the caller. An out-of-range
  // rating would break the aggregate rating and star display.
  if (!input.product_id) return { ok: false, error: "No product selected" };
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const text = (input.text ?? "").trim().slice(0, 1000);
  const author_name = (input.author_name ?? "").trim().slice(0, 80) || "Customer";
  if (!text) return { ok: false, error: "Review text is required" };

  const id = isDemo() ? `r-${Date.now()}` : crypto.randomUUID();
  if (isDemo()) {
    demoDB().reviews.unshift({
      id,
      product_id: input.product_id,
      author_name,
      rating,
      text,
      status: "approved",
      created_at: new Date().toISOString(),
    });
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("reviews").insert({
      id,
      product_id: input.product_id,
      author_name,
      rating,
      text,
      status: "approved",
    });
    if (error) {
      logQueryError("admin", "addAdminReview", error);
      return { ok: false, error: error.message };
    }
  }
  await logStaff(staffId, "review:create", "review", id);
  return { ok: true };
}

/* ── Customers ───────────────────────────────────────────────────────────── */

export async function listCustomers(): Promise<CustomerRecord[]> {
  if (isDemo()) return demoDB().customers;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  logQueryError("admin", "listCustomers", error);
  return (data ?? []) as CustomerRecord[];
}

export async function saveCustomerNote(
  staffId: string,
  customerId: string,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  const cleanNotes = (notes ?? "").trim().slice(0, 1000);
  if (isDemo()) {
    const c = demoDB().customers.find((x) => x.id === customerId);
    if (c) c.notes = cleanNotes;
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("customers").update({ notes: cleanNotes }).eq("id", customerId);
    if (error) {
      logQueryError("admin", "saveCustomerNote", error);
      return { ok: false, error: error.message };
    }
  }
  await logStaff(staffId, "note", "customer", customerId);
  return { ok: true };
}

export async function resetCustomerPassword(
  staffId: string,
  customerId: string,
  newPassword: string,
): Promise<boolean> {
  const hashed = hashPassword(newPassword);
  if (isDemo()) {
    const c = demoDB().customers.find((x) => x.id === customerId);
    if (c) {
      c.password = hashed;
      // An admin-issued temp password gets handed to the customer over
      // WhatsApp in plaintext — force a real password before the session
      // it unlocks can be used for anything.
      c.must_change_password = true;
    }
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customers")
      .update({ password: hashed, must_change_password: true })
      .eq("id", customerId);
    if (error) {
      // Do NOT fall back to writing the demo store here: it made the reset look
      // like it succeeded while the real customer row was untouched, so the
      // customer could never log in with the new password. Report the failure.
      logQueryError("admin", "resetCustomerPassword", error);
      return false;
    }
  }
  await logStaff(staffId, "reset_password", "customer", customerId);
  return true;
}

/* ── Settings ────────────────────────────────────────────────────────────── */

const BOX_MEDIA_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BOX_MEDIA_MAX_BYTES = 1_500_000; // 1.5 MB — matches BoxMediaTab's client check

/**
 * box_media is inlined straight into the settings row, which every
 * storefront page reads — an oversized or non-image value bloats every page
 * for every visitor. BoxMediaTab already checks this client-side, but that's
 * only a UX nicety: this is the actual gate, since updateSettingsAction can
 * be called directly with any payload regardless of what the form allows.
 * Only data: URLs are checked — a plain hosted image URL has no size to
 * bound here and isn't what this field is inlined for.
 */
function validateBoxMedia(boxMedia: Record<string, string>): string | null {
  for (const [key, value] of Object.entries(boxMedia)) {
    if (!value || !value.startsWith("data:")) continue;
    const match = /^data:([^;]+);base64,(.*)$/s.exec(value);
    if (!match || !match[1] || match[2] === undefined) return `Invalid image data for "${key}".`;
    const [, mimeType, base64] = match;
    if (!BOX_MEDIA_ALLOWED_TYPES.includes(mimeType)) {
      return `"${key}": unsupported image type ${mimeType} (use JPEG, PNG or WebP).`;
    }
    const approxBytes = (base64.length * 3) / 4;
    if (approxBytes > BOX_MEDIA_MAX_BYTES) {
      return `"${key}": image is too large (max 1.5 MB).`;
    }
  }
  return null;
}

export async function updateSettings(
  staffId: string,
  patch: Partial<StoreSettings>,
): Promise<{ ok: boolean; error?: string }> {
  if (patch.box_media) {
    const err = validateBoxMedia(patch.box_media);
    if (err) return { ok: false, error: err };
  }
  if (isDemo()) {
    Object.assign(demoDB().settings, patch);
  } else {
    const supabase = createAdminClient();
    for (const [key, value] of Object.entries(patch)) {
      const { error } = await supabase
        .from("settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) {
        logQueryError("admin", `updateSettings:${key}`, error);
        return { ok: false, error: error.message };
      }
    }
  }
  await logStaff(staffId, "update", "settings", Object.keys(patch).join(","));
  return { ok: true };
}

/* ── Low Stock Helpers ───────────────────────────────────────── */

export async function quickRestockProduct(staffId: string, productId: string, addedStock: number): Promise<boolean> {
  if (isDemo()) {
    const p = demoDB().products.find((x) => x.id === productId);
    if (p) p.stock += addedStock;
  } else {
    const supabase = createAdminClient();
    // Atomic add (see adjust_product_stock migration) instead of read-then-write.
    const { error } = await supabase.rpc("adjust_product_stock", {
      p_id: productId,
      p_delta: addedStock,
    });
    if (error) {
      logQueryError("admin", "quickRestockProduct", error);
      return false;
    }
  }
  await logStaff(staffId, "restock", "product", `${productId}:${addedStock}`);
  return true;
}

/* ── Staff Accounts & Approvals ────────────────────────────────────────────── */

export async function listStaffAccounts(): Promise<StaffAccountPublic[]> {
  if (isDemo())
    return demoDB().staffAccounts.map(({ password_hash: _password_hash, ...rest }) => rest);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_accounts")
    .select("id, username, phone, role, status, created_at, last_login_at")
    .order("created_at", { ascending: false });
  logQueryError("admin", "listStaffAccounts", error);
  return (data ?? []) as StaffAccountPublic[];
}

export async function createStaffAccount(
  username: string,
  phone: string,
  role: StaffRole,
  passwordHash: string,
): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) {
    const existing = demoDB().staffAccounts.find((s) => s.username.toLowerCase() === username.toLowerCase());
    if (existing) return { ok: false, error: "Username already exists" };
    const acc: StaffAccount = {
      id: `demo-staff-${Date.now()}`,
      username,
      phone,
      password_hash: passwordHash,
      role,
      status: "active",
      created_at: new Date().toISOString(),
    };
    demoDB().staffAccounts.unshift(acc);
    return { ok: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("staff_accounts").insert({
    username,
    phone,
    role,
    password_hash: passwordHash,
    status: "active",
  });

  if (error) {
    logQueryError("admin", "createStaffAccount", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function resetStaffPassword(staffId: string, newPasswordHash: string): Promise<boolean> {
  if (isDemo()) {
    const acc = demoDB().staffAccounts.find((s) => s.id === staffId);
    if (acc) acc.password_hash = newPasswordHash;
    return true;
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("staff_accounts")
    .update({ password_hash: newPasswordHash })
    .eq("id", staffId);
  if (error) {
    // A silent no-op here means the owner believes a staff password was
    // rotated when it wasn't — the old (possibly compromised) one still works.
    console.error("resetStaffPassword failed:", staffId, error);
    Sentry.captureException(error, { tags: { area: "staff_reset_password" } });
    return false;
  }
  return true;
}

export async function toggleStaffStatus(staffId: string, status: "active" | "disabled"): Promise<boolean> {
  if (isDemo()) {
    const acc = demoDB().staffAccounts.find((s) => s.id === staffId);
    if (acc) acc.status = status;
    return true;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("staff_accounts").update({ status }).eq("id", staffId);
  if (error) {
    // Disabling a departing/compromised staff account can silently no-op,
    // leaving it live and usable while the admin UI shows it as disabled.
    console.error("toggleStaffStatus failed:", staffId, status, error);
    Sentry.captureException(error, { tags: { area: "staff_toggle_status" } });
    return false;
  }
  return true;
}

export async function listPendingApprovals(): Promise<PendingApproval[]> {
  if (isDemo()) return demoDB().pendingApprovals.filter((a) => a.status === "pending");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pending_approvals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  logQueryError("admin", "listPendingApprovals", error);
  return (data ?? []) as PendingApproval[];
}

export async function requestApproval(
  requestedBy: string,
  staffName: string,
  actionType: string,
  description: string,
  payloadJson: Record<string, unknown>,
): Promise<boolean> {
  if (isDemo()) {
    demoDB().pendingApprovals.unshift({
      id: `demo-app-${Date.now()}`,
      requested_by: requestedBy,
      staff_name: staffName,
      action_type: actionType,
      description,
      payload_json: payloadJson,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    return true;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("pending_approvals").insert({
    requested_by: requestedBy,
    staff_name: staffName,
    action_type: actionType,
    description,
    payload_json: payloadJson,
    status: "pending",
  });
  if (error) {
    // If this insert fails, the staff member's action is gone entirely — not
    // executed (correctly, they're not the owner) and not queued either. The
    // caller (ownerOrQueue) must know this failed rather than telling them
    // "queued for approval" when nothing was recorded.
    logQueryError("admin", "requestApproval", error);
    return false;
  }
  return true;
}

export async function getPendingApproval(id: string): Promise<PendingApproval | null> {
  if (isDemo()) return demoDB().pendingApprovals.find((a) => a.id === id) ?? null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("pending_approvals").select("*").eq("id", id).maybeSingle();
  logQueryError("admin", "getPendingApproval", error);
  return (data as PendingApproval) ?? null;
}

/**
 * Runs the real mutation behind an approved pending action. Called only after an
 * owner approves the request (see approveActionRequestAction). Maps the stored
 * action_type + payload back to the underlying data-layer function. Keep the
 * cases in sync with APPROVAL_ACTIONS in src/lib/approvals.ts.
 */
export async function executeApprovedAction(
  approval: PendingApproval,
  resolverId: string,
): Promise<{ ok: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = approval.payload_json as Record<string, any>;
  switch (approval.action_type) {
    case "coupon.add":
      return { ok: await addCoupon(resolverId, p.coupon) };
    case "coupon.delete":
      await deleteCoupon(resolverId, p.code);
      return { ok: true };
    case "product.archive":
      await archiveProduct(resolverId, p.id);
      return { ok: true };
    case "brand.delete":
      return deleteBrand(resolverId, p.id);
    case "banner.delete":
      return deleteBanner(resolverId, p.id);
    case "order.refund":
      return refundOrder(resolverId, p.orderId);
    default:
      console.error("executeApprovedAction: unknown action_type", approval.action_type);
      return { ok: false, error: `Unknown action type: ${approval.action_type}` };
  }
}

export async function resolvePendingApproval(
  approvalId: string,
  resolvedBy: string,
  status: "approved" | "rejected",
): Promise<PendingApproval | null> {
  if (isDemo()) {
    const item = demoDB().pendingApprovals.find((a) => a.id === approvalId);
    if (!item) return null;
    item.status = status;
    item.resolved_at = new Date().toISOString();
    item.resolved_by = resolvedBy;
    return item;
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pending_approvals")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq("id", approvalId)
    .select("*")
    .single();
  logQueryError("admin", "resolvePendingApproval", error);
  return (data as PendingApproval) ?? null;
}
