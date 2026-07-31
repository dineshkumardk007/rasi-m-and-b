import "server-only";
import type {
  Banner,
  Brand,
  Bundle,
  Coupon,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProductRow as mapProduct } from "./map";
import { birthdayCouponFor, isBirthdayCode } from "@/lib/baby-club";

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
  if (error) return demoDB().products.filter((p) => p.status === "active");
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
  return data ? mapProduct(data) : demoDB().products.find((p) => p.slug === slug) ?? null;
}

export async function getActiveBundles(): Promise<Bundle[]> {
  if (isDemo()) return demoDB().bundles.filter((b) => b.status === "active");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("status", "active");
  if (error) return demoDB().bundles.filter((b) => b.status === "active");
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
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", "approved");
  if (error || !data || data.length === 0) return demoDB().reviews.filter((r) => r.status === "approved");
  return data.map((row: any) => ({
    id: row.id,
    product_id: row.product_id,
    author_name: row.author_name ?? "Customer",
    rating: row.rating,
    text: row.text,
    status: row.status,
    created_at: row.created_at,
  }));
}

/**
 * Banners for the home page, already filtered to what is live.
 *
 * The schedule is applied here as well as in the RLS policy: this reads through
 * the service-role client, which bypasses RLS, so the window has to be enforced
 * in the query or a festival banner would go up the moment it is saved.
 */
export async function getLiveBanners(): Promise<Banner[]> {
  const nowIso = new Date().toISOString();

  if (isDemo()) {
    return demoDB().banners.filter(
      (b) =>
        b.active &&
        (!b.starts_at || b.starts_at <= nowIso) &&
        (!b.ends_at || b.ends_at >= nowIso),
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .order("sort", { ascending: true });

  if (error || !data || data.length === 0) {
    return demoDB().banners.filter(
      (b) =>
        b.active &&
        (!b.starts_at || b.starts_at <= nowIso) &&
        (!b.ends_at || b.ends_at >= nowIso),
    );
  }
  return data
    .map(mapBanner)
    .filter(
      (b) =>
        b.active &&
        (!b.starts_at || b.starts_at <= nowIso) &&
        (!b.ends_at || b.ends_at >= nowIso),
    );
}

/** Every banner including scheduled and switched-off ones, for the admin. */
export async function getAllBanners(): Promise<Banner[]> {
  if (isDemo()) return demoDB().banners;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("slot", { ascending: true })
    .order("sort", { ascending: true });
  if (error || !data || data.length === 0) return demoDB().banners;
  return data.map(mapBanner);
}

function mapBanner(row: any): Banner {
  return {
    id: row.id,
    slot: row.slot,
    image_url: row.image_url,
    alt: row.alt ?? "",
    link_url: row.link_url ?? null,
    sort: row.sort ?? 0,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
    active: row.active ?? true,
  };
}

export async function getActiveBrands(): Promise<Brand[]> {
  if (isDemo()) return demoDB().brands.filter((b) => b.active);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("active", true)
    .order("sort", { ascending: true });
  if (error) return demoDB().brands.filter((b) => b.active);
  return (data ?? []).map(mapBrand);
}

/** Every brand including switched-off ones, for the admin. */
export async function getAllBrands(): Promise<Brand[]> {
  if (isDemo()) return demoDB().brands;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("sort", { ascending: true });
  if (error) return demoDB().brands;
  return (data ?? []).map(mapBrand);
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  if (isDemo()) return demoDB().brands.find((b) => b.slug === slug && b.active) ?? null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data ? mapBrand(data) : demoDB().brands.find((b) => b.slug === slug && b.active) ?? null;
}

function mapBrand(row: any): Brand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url,
    sort: row.sort ?? 0,
    active: row.active ?? true,
  };
}

/**
 * Coupons staff chose to advertise. Validity is re-checked in
 * featuredOffers() before anything reaches the strip, so an expired code that
 * nobody remembered to unfeature never gets shown.
 */
export async function getFeaturedCoupons(): Promise<Coupon[]> {
  if (isDemo()) return demoDB().coupons.filter((c) => c.featured);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("coupons").select("*").eq("featured", true);
  if (error) return demoDB().coupons.filter((c) => c.featured);
  return (data ?? []).map(mapCoupon);
}

function mapCoupon(row: any): Coupon {
  return {
    code: row.code,
    type: row.type,
    value: row.value,
    min_order: row.min_order,
    valid_until: row.valid_until,
    usage_limit: row.usage_limit,
    used_count: row.used_count,
    featured: row.featured ?? false,
  };
}

export async function getSettings(): Promise<StoreSettings> {
  if (isDemo()) return demoDB().settings;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) return demoDB().settings;
  const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    same_day_enabled: map.same_day_enabled ?? true,
    serviceable_pins: map.serviceable_pins ?? demoDB().settings.serviceable_pins,
    free_delivery_threshold: map.free_delivery_threshold ?? 999,
    cod_limit: map.cod_limit ?? 3000,
    gift_wrap_enabled: map.gift_wrap_enabled ?? true,
    gift_wrap_fee: map.gift_wrap_fee ?? 30,
  };
}

export async function findCoupon(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();

  // The birthday perk has no coupons row on purpose — it resolves per customer.
  // Handled here rather than at the call sites so the checkout preview and the
  // order placement can never disagree about whether it is valid.
  if (isBirthdayCode(normalized)) return birthdayCouponForCurrentCustomer();

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

/**
 * Resolve the birthday coupon for whoever is signed in. Returns null for signed
 * -out visitors, customers with no stored date, and anyone outside their baby's
 * birthday month — so the code is worthless to a stranger who learns it.
 */
async function birthdayCouponForCurrentCustomer(): Promise<Coupon | null> {
  try {
    const { currentCustomer } = await import("@/lib/customer-session");
    const me = await currentCustomer();
    if (!me) return null;

    const digits = me.sub.replace(/\D/g, "");
    const phone = digits.length === 10 ? digits : null;

    if (isDemo()) {
      const customer = demoDB().customers.find(
        (c) => c.phone === phone || c.email?.toLowerCase() === me.sub.toLowerCase(),
      );
      return birthdayCouponFor(customer?.baby_dob ?? null);
    }

    const supabase = createAdminClient();
    const query = supabase.from("customers").select("baby_dob");
    const { data } = await (phone
      ? query.eq("phone", phone)
      : query.eq("email", me.sub.toLowerCase())
    ).maybeSingle();
    return birthdayCouponFor(data?.baby_dob ?? null);
  } catch {
    // No request scope (scripts, webhooks) — no session, so no perk.
    return null;
  }
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
