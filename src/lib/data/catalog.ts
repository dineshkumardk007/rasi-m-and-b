import "server-only";
import { unstable_cache } from "next/cache";
import * as Sentry from "@sentry/nextjs";
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

/**
 * Home/category/brand pages fetch these on every request with no caching at
 * all — even though they're the highest-traffic pages, they pay full Supabase
 * latency every time. A short revalidate window materially cuts TTFB with no
 * customer-visible staleness (a ~45s-old stock count is not a real problem for
 * a shop this size), while a webhook-driven admin write still shows up within
 * one window. Only wraps the LIVE (Supabase) path — demoDB() is process memory
 * that admin actions mutate directly, so caching it would hide those edits for
 * up to the revalidate window during local/demo testing.
 */
const CATALOG_REVALIDATE_SECONDS = 45;

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row mapping */

/**
 * In live mode a read error falls back to the in-memory demo catalog so the
 * storefront keeps rendering. That's deliberate (an outage shouldn't blank the
 * shop) but it MUST be visible in the logs — otherwise a real DB outage silently
 * serves stale demo data to customers with no signal anything is wrong.
 */
function logReadFallback(fn: string, error: unknown) {
  if (error) console.error(`[catalog] ${fn} failed, serving demo data:`, error);
}

/**
 * Logs and reports the ACTUAL Supabase error, at the point it happens inside
 * the cached query — by the time a cache miss reaches logReadFallback() above,
 * the real error object is long gone (only null survives the cache boundary),
 * so this used to always log the same placeholder string no matter what
 * actually went wrong. Only called for genuine query errors, not for a
 * legitimately empty table, so an empty reviews/banners list doesn't spam
 * Sentry.
 */
function logQueryError(fn: string, error: unknown) {
  if (!error) return;
  console.error(`[catalog] ${fn} query failed:`, error);
  Sentry.captureException(
    error instanceof Error ? error : new Error(`[catalog] ${fn}: ${JSON.stringify(error)}`),
    { tags: { area: "catalog", fn } },
  );
}

const PRODUCT_SELECT = "*, product_categories(category)";

const cachedActiveProducts = unstable_cache(
  async (): Promise<Product[] | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) {
      logQueryError("getActiveProducts", error);
      return null;
    }
    return (data ?? []).map(mapProduct);
  },
  ["catalog:getActiveProducts"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:products"] },
);

export async function getActiveProducts(): Promise<Product[]> {
  if (isDemo()) return demoDB().products.filter((p) => p.status === "active");
  const cached = await cachedActiveProducts();
  if (cached === null) {
    logReadFallback("getActiveProducts", "cache miss/error");
    return demoDB().products.filter((p) => p.status === "active");
  }
  return cached;
}

export interface PaginatedProductsQuery {
  limit?: number;
  offset?: number;
  category?: string;
  milestone?: string;
  brand?: string;
}

export async function getPaginatedProducts(query: PaginatedProductsQuery = {}): Promise<{
  products: Product[];
  total: number;
  hasMore: boolean;
}> {
  const { limit = 24, offset = 0, category, milestone, brand } = query;
  const all = await getActiveProducts();
  let filtered = all;

  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.categories.includes(category as any));
  }
  if (milestone && milestone !== "all") {
    filtered = filtered.filter((p) => p.milestone === milestone);
  }
  if (brand && brand !== "all") {
    filtered = filtered.filter((p) => p.brand?.toLowerCase() === brand.toLowerCase() || p.brand_id === brand);
  }

  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);
  return {
    products: sliced,
    total,
    hasMore: offset + limit < total,
  };
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

function mapBundle(row: any): Bundle {
  return {
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
  };
}

const cachedActiveBundles = unstable_cache(
  async (): Promise<Bundle[] | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("bundles").select("*").eq("status", "active");
    if (error) {
      logQueryError("getActiveBundles", error);
      return null;
    }
    return (data ?? []).map(mapBundle);
  },
  ["catalog:getActiveBundles"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:bundles"] },
);

export async function getActiveBundles(): Promise<Bundle[]> {
  if (isDemo()) return demoDB().bundles.filter((b) => b.status === "active");
  const cached = await cachedActiveBundles();
  if (cached === null) {
    logReadFallback("getActiveBundles", "cache miss/error");
    return demoDB().bundles.filter((b) => b.status === "active");
  }
  return cached;
}

function mapReview(row: any): Review {
  return {
    id: row.id,
    product_id: row.product_id,
    author_name: row.author_name ?? "Customer",
    rating: row.rating,
    text: row.text,
    status: row.status,
    created_at: row.created_at,
  };
}

const cachedApprovedReviews = unstable_cache(
  async (): Promise<Review[] | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("reviews").select("*").eq("status", "approved");
    if (error) {
      logQueryError("getApprovedReviews", error);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map(mapReview);
  },
  ["catalog:getApprovedReviews"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:reviews"] },
);

export async function getApprovedReviews(): Promise<Review[]> {
  if (isDemo()) return demoDB().reviews.filter((r) => r.status === "approved");
  const cached = await cachedApprovedReviews();
  if (cached === null) {
    logReadFallback("getApprovedReviews", "cache miss/error");
    return demoDB().reviews.filter((r) => r.status === "approved");
  }
  return cached;
}

/**
 * Approved reviews for ONE product. The product page used to pull the whole
 * store's reviews and filter in Node, so every PDP view paid the cost of the
 * entire review corpus. This filters at the query level instead.
 */
const cachedReviewsForProduct = unstable_cache(
  async (productId: string): Promise<Review[] | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("status", "approved")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) {
      logQueryError("getApprovedReviewsForProduct", error);
      return null;
    }
    if (!data) return null;
    return data.map(mapReview);
  },
  ["catalog:getApprovedReviewsForProduct"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:reviews"] },
);

export async function getApprovedReviewsForProduct(productId: string): Promise<Review[]> {
  if (isDemo())
    return demoDB().reviews.filter((r) => r.status === "approved" && r.product_id === productId);
  const cached = await cachedReviewsForProduct(productId);
  if (cached === null) {
    logReadFallback("getApprovedReviewsForProduct", "cache miss/error");
    return demoDB().reviews.filter((r) => r.status === "approved" && r.product_id === productId);
  }
  return cached;
}

/**
 * Banners for the home page, already filtered to what is live.
 *
 * The schedule is applied here as well as in the RLS policy: this reads through
 * the service-role client, which bypasses RLS, so the window has to be enforced
 * in the query or a festival banner would go up the moment it is saved.
 */
function liveWindow(b: Banner, nowIso: string): boolean {
  return b.active && (!b.starts_at || b.starts_at <= nowIso) && (!b.ends_at || b.ends_at >= nowIso);
}

// Caches the raw active-banner rows (not the schedule filter — that depends on
// "now", which must be evaluated fresh every call, not frozen for the whole
// revalidate window, or a banner could stay live/hidden past its window edge).
const cachedActiveBannerRows = unstable_cache(
  async (): Promise<Banner[] | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) {
      logQueryError("getLiveBanners", error);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map(mapBanner);
  },
  ["catalog:getLiveBanners"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:banners"] },
);

export async function getLiveBanners(): Promise<Banner[]> {
  const nowIso = new Date().toISOString();

  if (isDemo()) {
    return demoDB().banners.filter((b) => liveWindow(b, nowIso));
  }

  const cached = await cachedActiveBannerRows();
  if (cached === null) {
    logReadFallback("getLiveBanners", "cache miss/error");
    return demoDB().banners.filter((b) => liveWindow(b, nowIso));
  }
  return cached.filter((b) => liveWindow(b, nowIso));
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

const cachedActiveBrands = unstable_cache(
  async (): Promise<Brand[] | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error) {
      logQueryError("getActiveBrands", error);
      return null;
    }
    return (data ?? []).map(mapBrand);
  },
  ["catalog:getActiveBrands"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:brands"] },
);

export async function getActiveBrands(): Promise<Brand[]> {
  if (isDemo()) return demoDB().brands.filter((b) => b.active);
  const cached = await cachedActiveBrands();
  if (!cached || cached.length === 0) {
    logReadFallback("getActiveBrands", "cache miss/empty table");
    return demoDB().brands.filter((b) => b.active);
  }
  return cached;
}

/** Every brand including switched-off ones, for the admin. */
export async function getAllBrands(): Promise<Brand[]> {
  if (isDemo()) return demoDB().brands;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("sort", { ascending: true });
  if (error || !data || data.length === 0) return demoDB().brands;
  return data.map(mapBrand);
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

function mapSettings(map: Record<string, any>): StoreSettings {
  return {
    same_day_enabled: map.same_day_enabled ?? demoDB().settings.same_day_enabled ?? true,
    serviceable_pins: map.serviceable_pins ?? demoDB().settings.serviceable_pins,
    unserviceable_pins: map.unserviceable_pins ?? demoDB().settings.unserviceable_pins ?? [],
    free_delivery_threshold: map.free_delivery_threshold ?? demoDB().settings.free_delivery_threshold ?? 999,
    base_delivery_fee: map.base_delivery_fee ?? demoDB().settings.base_delivery_fee ?? 49,
    universal_free_delivery: map.universal_free_delivery ?? demoDB().settings.universal_free_delivery ?? false,
    delivery_slabs: map.delivery_slabs ?? demoDB().settings.delivery_slabs,
    cod_limit: map.cod_limit ?? demoDB().settings.cod_limit ?? 3000,
    gift_wrap_enabled: map.gift_wrap_enabled ?? demoDB().settings.gift_wrap_enabled ?? true,
    gift_wrap_fee: map.gift_wrap_fee ?? demoDB().settings.gift_wrap_fee ?? 30,
    enable_language_switch: map.enable_language_switch ?? demoDB().settings.enable_language_switch ?? true,
    announcement_enabled: map.announcement_enabled ?? demoDB().settings.announcement_enabled ?? true,
    announcement_text_en: map.announcement_text_en ?? demoDB().settings.announcement_text_en,
    announcement_text_ta: map.announcement_text_ta ?? demoDB().settings.announcement_text_ta,
    announcement_bg: map.announcement_bg ?? demoDB().settings.announcement_bg,
    announcement_color: map.announcement_color ?? demoDB().settings.announcement_color,
    announcement_link: map.announcement_link ?? demoDB().settings.announcement_link,
    offer_strip_enabled: map.offer_strip_enabled ?? demoDB().settings.offer_strip_enabled ?? true,
    offer_strip_text_en: map.offer_strip_text_en ?? demoDB().settings.offer_strip_text_en,
    offer_strip_text_ta: map.offer_strip_text_ta ?? demoDB().settings.offer_strip_text_ta,
    offer_strip_bg: map.offer_strip_bg ?? demoDB().settings.offer_strip_bg,
    offer_strip_color: map.offer_strip_color ?? demoDB().settings.offer_strip_color,
    custom_categories: map.custom_categories ?? demoDB().settings.custom_categories ?? [],
    box_media: map.box_media ?? demoDB().settings.box_media ?? {},
  };
}

const cachedSettingsRows = unstable_cache(
  async (): Promise<Record<string, any> | null> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) {
      logQueryError("getSettings", error);
      return null;
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  },
  ["catalog:getSettings"],
  { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["catalog:settings"] },
);

export async function getSettings(): Promise<StoreSettings> {
  if (isDemo()) return demoDB().settings;
  const map = await cachedSettingsRows();
  if (map === null) {
    logReadFallback("getSettings", "cache miss/error");
    return demoDB().settings;
  }
  return mapSettings(map);
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
  const raw =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  // Never discount more than the cart is worth. A flat coupon larger than the
  // subtotal, or a mistakenly-entered percent value, would otherwise drive the
  // order total negative (a below-zero COD amount, or a negative amount handed
  // to Razorpay). Clamp here so downstream total arithmetic can never go < 0.
  const discount = Math.min(raw, subtotal);
  return { ok: true, coupon, discount };
}
