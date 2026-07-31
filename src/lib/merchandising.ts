/**
 * Which products, banners and offers the home page puts in front of a shopper.
 *
 * Pure functions taking `now` as an argument rather than reading the clock, so
 * the scheduling rules can be tested without waiting for a festival. No
 * "server-only": the storefront components and the server both use these.
 */
import type { Banner, BannerSlot, Coupon, Product } from "./types";

/** Whole-percent saving off MRP. Zero when a product isn't discounted. */
export function discountPercent(product: Pick<Product, "price" | "mrp">): number {
  if (product.mrp <= 0 || product.price >= product.mrp) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

/** Rupees saved off MRP. */
export function savingAmount(product: Pick<Product, "price" | "mrp">): number {
  return Math.max(0, product.mrp - product.price);
}

export type DealOptions = {
  /** Ignore token discounts that aren't worth a shopper's attention. */
  minPercent?: number;
  limit?: number;
};

/**
 * The deal rail: genuinely discounted, in-stock products, deepest cut first.
 *
 * Out-of-stock items are excluded rather than shown greyed out — a headline
 * offer a shopper cannot buy is worse than one fewer offer. Ties break on
 * rupees saved, so between two 30% cuts the pricier product leads.
 */
export function topDeals(products: Product[], options: DealOptions = {}): Product[] {
  const minPercent = options.minPercent ?? 5;
  const limit = options.limit ?? 12;

  return products
    .filter(
      (p) => p.status === "active" && p.stock > 0 && discountPercent(p) >= minPercent,
    )
    .sort((a, b) => {
      const byPercent = discountPercent(b) - discountPercent(a);
      return byPercent !== 0 ? byPercent : savingAmount(b) - savingAmount(a);
    })
    .slice(0, limit);
}

/** Whether a banner's schedule and switch put it on screen right now. */
export function isBannerLive(banner: Banner, now: Date = new Date()): boolean {
  if (!banner.active) return false;
  if (banner.starts_at && new Date(banner.starts_at) > now) return false;
  if (banner.ends_at && new Date(banner.ends_at) < now) return false;
  return true;
}

/** Live banners for one slot, in display order. */
export function liveBanners(
  banners: Banner[],
  slot: BannerSlot,
  now: Date = new Date(),
): Banner[] {
  return banners
    .filter((b) => b.slot === slot && isBannerLive(b, now))
    .sort((a, b) => a.sort - b.sort);
}

/**
 * Coupons worth advertising: flagged by staff, still valid, still redeemable.
 *
 * The featured flag alone isn't enough — advertising a code that fails at
 * checkout costs more trust than never mentioning it.
 */
export function featuredOffers(coupons: Coupon[], now: Date = new Date()): Coupon[] {
  return coupons.filter((c) => {
    if (!c.featured) return false;
    if (c.valid_until && new Date(c.valid_until) < now) return false;
    if (c.usage_limit !== null && c.used_count >= c.usage_limit) return false;
    return true;
  });
}

/**
 * Seconds left in the day in IST, for the deal countdown.
 *
 * The store, its shoppers and its 4 PM cutoff are all in one timezone, so the
 * deal window is "until midnight in Thoothukudi" regardless of where the
 * browser thinks it is.
 */
export function secondsUntilMidnightIST(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsed = get("hour") * 3600 + get("minute") * 60 + get("second");
  return Math.max(0, 86400 - elapsed);
}

/** "5h 09m" / "9m 04s" — coarse while far out, urgent in the last hour. */
export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m`
    : `${m}m ${String(s).padStart(2, "0")}s`;
}
