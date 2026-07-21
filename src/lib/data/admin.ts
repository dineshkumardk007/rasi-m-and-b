import "server-only";
import type {
  Coupon,
  CustomerRecord,
  Order,
  OrderStatus,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import type { Category, Milestone } from "@/lib/constants";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "./events";

/**
 * Staff-gated data access for /admin. In live mode every mutation goes through
 * the caller's OWN session client so RLS enforces the staff boundary, and each
 * action is written to staff_log. Demo mode is open (banner shown in UI).
 */

import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";

export async function requireStaff(): Promise<{ userId: string } | null> {
  try {
    const cookieStore = await cookies();
    const subject = verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
    if (subject) return { userId: subject };
  } catch {
    /* ignore */
  }

  if (!isDemo()) {
    try {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const { data: role } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (role) return { userId: data.user.id };
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

async function logStaff(userId: string, action: string, entity: string, entityId: string) {
  if (isDemo()) {
    demoDB().staffLog.unshift({ action, entity, entity_id: entityId, at: new Date().toISOString() });
    return;
  }
  const supabase = await createServerClient();
  await supabase.from("staff_log").insert({ user_id: userId, action, entity, entity_id: entityId });
}

/* ── Orders ──────────────────────────────────────────────────────────────── */

export async function listAllOrders(): Promise<Order[]> {
  if (isDemo()) return demoDB().orders;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("placed_at", { ascending: false })
    .limit(200);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((row: any) => ({
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
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    items: (row.order_items ?? []).map((i: any) => ({
      product_id: i.product_id,
      name_snapshot: i.name_snapshot,
      price_snapshot: i.price_snapshot,
      qty: i.qty,
    })),
    placed_at: row.placed_at,
    language: "en" as const,
  }));
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
    if (error) return false;
  } else {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) return false;
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
  stock: number;
  tile_color: string;
  emoji: string;
  description_en: string;
  description_ta: string;
  images?: string[];
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export async function listAllProducts(): Promise<Product[]> {
  if (isDemo()) return demoDB().products;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_categories(category)")
    .order("created_at", { ascending: true });
  const { mapProductRow } = await import("./map");
  return (data ?? []).map(mapProductRow);
}

export async function upsertProduct(staffId: string, input: ProductInput): Promise<string | null> {
  const slug = input.slug || slugify(input.name_en);
  if (isDemo()) {
    const db = demoDB();
    if (input.id) {
      const p = db.products.find((x) => x.id === input.id);
      if (!p) return null;
      Object.assign(p, { ...input, slug: p.slug });
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
      gst_rate: 12,
      stock: input.stock,
      low_stock_threshold: 5,
      status: "active",
      tile_color: input.tile_color,
      emoji: input.emoji,
      images: input.images ?? [],
      description_en: input.description_en,
      description_ta: input.description_ta || input.description_en,
      ingredients: null,
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
    stock: input.stock,
    tile_color: input.tile_color,
    emoji: input.emoji,
    description_en: input.description_en,
    description_ta: input.description_ta || input.description_en,
    ...(input.images ? { images: input.images } : {}),
  };
  let productId = input.id ?? null;
  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return null;
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, slug })
      .select("id")
      .single();
    if (error || !data) return null;
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
  const { data: p } = await supabase.from("products").select("stock").eq("id", productId).single();
  if (!p) return false;
  const newStock = Math.max(0, (p.stock || 0) + stockDelta);
  const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId);
  if (error) return false;
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
  const { data } = await supabase.from("coupons").select("*").order("code");
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
    if (error) return false;
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

/* ── Reviews ─────────────────────────────────────────────────────────────── */

export async function listReviews(status?: Review["status"]): Promise<Review[]> {
  if (isDemo()) {
    const all = demoDB().reviews;
    return status ? all.filter((r) => r.status === status) : all;
  }
  const supabase = createAdminClient();
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
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
): Promise<void> {
  if (isDemo()) {
    const r = demoDB().reviews.find((x) => x.id === reviewId);
    if (r) r.status = status;
  } else {
    const supabase = createAdminClient();
    await supabase.from("reviews").update({ status }).eq("id", reviewId);
  }
  await logStaff(staffId, `review:${status}`, "review", reviewId);
}

/* ── Customers ───────────────────────────────────────────────────────────── */

export async function listCustomers(): Promise<CustomerRecord[]> {
  if (isDemo()) return demoDB().customers;
  const supabase = createAdminClient();
  const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500);
  return (data ?? []) as CustomerRecord[];
}

export async function saveCustomerNote(staffId: string, customerId: string, notes: string): Promise<void> {
  if (isDemo()) {
    const c = demoDB().customers.find((x) => x.id === customerId);
    if (c) c.notes = notes;
  } else {
    const supabase = createAdminClient();
    await supabase.from("customers").update({ notes }).eq("id", customerId);
  }
  await logStaff(staffId, "note", "customer", customerId);
}

/* ── Settings ────────────────────────────────────────────────────────────── */

export async function updateSettings(staffId: string, patch: Partial<StoreSettings>): Promise<void> {
  if (isDemo()) {
    Object.assign(demoDB().settings, patch);
  } else {
    const supabase = createAdminClient();
    for (const [key, value] of Object.entries(patch))
      await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
  }
  await logStaff(staffId, "update", "settings", Object.keys(patch).join(","));
}
