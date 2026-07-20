import "server-only";
import type { Bundle, Coupon, Product, Review, StoreSettings } from "@/lib/types";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProductRow as mapProduct } from "./map";

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row mapping */

const PRODUCT_SELECT = "*, product_categories(category)";

export async function getActiveProducts(): Promise<Product[]> {
  if (isDemo()) return demoDB().products.filter((p) => p.status === "active");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getActiveProducts: ${error.message}`);
  return (data ?? []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isDemo()) return demoDB().products.find((p) => p.slug === slug) ?? null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  return data ? mapProduct(data) : null;
}

export async function getActiveBundles(): Promise<Bundle[]> {
  if (isDemo()) return demoDB().bundles.filter((b) => b.status === "active");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("status", "active");
  if (error) throw new Error(`getActiveBundles: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name_en: row.name_en,
    name_ta: row.name_ta,
    slug: row.slug,
    product_ids: row.product_ids ?? [],
    bundle_price: row.bundle_price,
    mrp: row.mrp,
    status: row.status,
    emoji: row.emoji ?? "🎁",
    tile_color: row.tile_color ?? "#FFE1A8",
    items_en: row.items_en ?? [],
  }));
}

export async function getApprovedReviews(): Promise<Review[]> {
  if (isDemo()) return demoDB().reviews.filter((r) => r.status === "approved");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", "approved");
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

export async function getSettings(): Promise<StoreSettings> {
  if (isDemo()) return demoDB().settings;
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    same_day_enabled: map.same_day_enabled ?? true,
    serviceable_pins: map.serviceable_pins ?? [],
    free_delivery_threshold: map.free_delivery_threshold ?? 999,
    cod_limit: map.cod_limit ?? 3000,
  };
}

export async function findCoupon(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  if (isDemo())
    return demoDB().coupons.find((c) => c.code === normalized) ?? null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();
  return data
    ? {
        code: data.code,
        type: data.type,
        value: data.value,
        min_order: data.min_order,
        valid_until: data.valid_until,
        usage_limit: data.usage_limit,
        used_count: data.used_count,
      }
    : null;
}

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: "not_found" | "min_order" | "expired" | "exhausted"; min?: number };

export function evaluateCoupon(coupon: Coupon | null, subtotal: number): CouponCheck {
  if (!coupon) return { ok: false, reason: "not_found" };
  if (coupon.valid_until && new Date(coupon.valid_until) < new Date())
    return { ok: false, reason: "expired" };
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit)
    return { ok: false, reason: "exhausted" };
  if (subtotal < coupon.min_order)
    return { ok: false, reason: "min_order", min: coupon.min_order };
  const discount =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  return { ok: true, coupon, discount };
}
