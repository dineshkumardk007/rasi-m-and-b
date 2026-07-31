import { describe, expect, it } from "vitest";
import {
  discountPercent,
  featuredOffers,
  formatCountdown,
  isBannerLive,
  liveBanners,
  savingAmount,
  secondsUntilMidnightIST,
  topDeals,
} from "@/lib/merchandising";
import type { Banner, Coupon, Product } from "@/lib/types";

function product(over: Partial<Product> & { id: string }): Product {
  return {
    name_en: "Item",
    name_ta: "பொருள்",
    slug: over.id,
    brand: "Rasi Select",
    milestone: "newborn",
    categories: [],
    price: 100,
    mrp: 100,
    gst_rate: 12,
    stock: 5,
    low_stock_threshold: 5,
    status: "active",
    tile_color: "#FFCBD9",
    emoji: "🧸",
    images: [],
    description_en: "",
    description_ta: "",
    ingredients: null,
    ...over,
  } as Product;
}

function banner(over: Partial<Banner> & { id: string }): Banner {
  return {
    slot: "hero",
    image_url: "/x.webp",
    alt: "",
    link_url: null,
    sort: 0,
    starts_at: null,
    ends_at: null,
    active: true,
    ...over,
  } as Banner;
}

function coupon(over: Partial<Coupon> & { code: string }): Coupon {
  return {
    type: "percent",
    value: 10,
    min_order: 499,
    valid_until: null,
    usage_limit: null,
    used_count: 0,
    featured: true,
    ...over,
  } as Coupon;
}

describe("discountPercent", () => {
  it("rounds the saving off MRP", () => {
    expect(discountPercent({ price: 750, mrp: 1000 })).toBe(25);
    expect(discountPercent({ price: 333, mrp: 1000 })).toBe(67);
  });

  it("is zero when there is nothing off", () => {
    expect(discountPercent({ price: 100, mrp: 100 })).toBe(0);
  });

  it("never goes negative when price exceeds MRP", () => {
    // A data-entry slip must not render as "-20% off" on the storefront.
    expect(discountPercent({ price: 1200, mrp: 1000 })).toBe(0);
    expect(savingAmount({ price: 1200, mrp: 1000 })).toBe(0);
  });

  it("survives a zero MRP without dividing by it", () => {
    expect(discountPercent({ price: 0, mrp: 0 })).toBe(0);
  });
});

describe("topDeals", () => {
  const catalogue = [
    product({ id: "a", price: 900, mrp: 1000 }), // 10%
    product({ id: "b", price: 500, mrp: 1000 }), // 50%
    product({ id: "c", price: 980, mrp: 1000 }), // 2%, below the floor
    product({ id: "d", price: 700, mrp: 1000 }), // 30%
    product({ id: "e", price: 1000, mrp: 1000 }), // no discount
  ];

  it("orders by depth of discount", () => {
    expect(topDeals(catalogue).map((p) => p.id)).toEqual(["b", "d", "a"]);
  });

  it("drops token discounts below the floor", () => {
    expect(topDeals(catalogue).map((p) => p.id)).not.toContain("c");
    expect(topDeals(catalogue, { minPercent: 1 }).map((p) => p.id)).toContain("c");
  });

  it("excludes out-of-stock products rather than teasing them", () => {
    const withSoldOut = [...catalogue, product({ id: "f", price: 100, mrp: 1000, stock: 0 })];
    expect(topDeals(withSoldOut).map((p) => p.id)).not.toContain("f");
  });

  it("excludes archived products", () => {
    const withArchived = [
      ...catalogue,
      product({ id: "g", price: 100, mrp: 1000, status: "archived" }),
    ];
    expect(topDeals(withArchived).map((p) => p.id)).not.toContain("g");
  });

  it("breaks equal percentages on rupees saved", () => {
    const tie = [
      product({ id: "cheap", price: 50, mrp: 100 }),
      product({ id: "pricey", price: 2500, mrp: 5000 }),
    ];
    expect(topDeals(tie).map((p) => p.id)).toEqual(["pricey", "cheap"]);
  });

  it("honours the limit", () => {
    expect(topDeals(catalogue, { limit: 2 })).toHaveLength(2);
  });

  it("returns nothing for a catalogue with no discounts", () => {
    expect(topDeals([product({ id: "x" })])).toEqual([]);
  });
});

describe("isBannerLive", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");

  it("shows an unscheduled, switched-on banner", () => {
    expect(isBannerLive(banner({ id: "1" }), now)).toBe(true);
  });

  it("hides a switched-off banner even inside its window", () => {
    expect(
      isBannerLive(
        banner({ id: "1", active: false, starts_at: "2026-10-01T00:00:00.000Z" }),
        now,
      ),
    ).toBe(false);
  });

  it("hides a banner before it starts and after it ends", () => {
    expect(
      isBannerLive(banner({ id: "1", starts_at: "2026-11-02T00:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isBannerLive(banner({ id: "1", ends_at: "2026-10-31T00:00:00.000Z" }), now),
    ).toBe(false);
  });

  it("shows a banner inside its window", () => {
    expect(
      isBannerLive(
        banner({
          id: "1",
          starts_at: "2026-10-25T00:00:00.000Z",
          ends_at: "2026-11-05T00:00:00.000Z",
        }),
        now,
      ),
    ).toBe(true);
  });
});

describe("liveBanners", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");

  it("keeps one slot's banners in display order", () => {
    const all = [
      banner({ id: "second", sort: 2 }),
      banner({ id: "first", sort: 1 }),
      banner({ id: "mid", slot: "mid", sort: 0 }),
    ];
    expect(liveBanners(all, "hero", now).map((b) => b.id)).toEqual(["first", "second"]);
    expect(liveBanners(all, "mid", now).map((b) => b.id)).toEqual(["mid"]);
  });

  it("drops scheduled-out banners from the slot", () => {
    const all = [
      banner({ id: "live" }),
      banner({ id: "future", starts_at: "2026-12-01T00:00:00.000Z" }),
    ];
    expect(liveBanners(all, "hero", now).map((b) => b.id)).toEqual(["live"]);
  });
});

describe("featuredOffers", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");

  it("keeps a featured, valid coupon", () => {
    expect(featuredOffers([coupon({ code: "WELCOME10" })], now)).toHaveLength(1);
  });

  it("ignores coupons nobody chose to advertise", () => {
    expect(featuredOffers([coupon({ code: "QUIET", featured: false })], now)).toEqual([]);
  });

  it("never advertises a code checkout would reject", () => {
    const expired = coupon({ code: "OLD", valid_until: "2026-10-01T00:00:00.000Z" });
    const exhausted = coupon({ code: "GONE", usage_limit: 5, used_count: 5 });
    expect(featuredOffers([expired, exhausted], now)).toEqual([]);
  });
});

describe("countdown", () => {
  it("counts down to midnight in IST, not the machine's timezone", () => {
    // 18:30 UTC is exactly midnight IST, so the day has just rolled over.
    const atMidnightIST = new Date("2026-11-01T18:30:00.000Z");
    expect(secondsUntilMidnightIST(atMidnightIST)).toBe(86400);

    // One hour earlier is 23:00 IST — an hour left.
    const elevenPmIST = new Date("2026-11-01T17:30:00.000Z");
    expect(secondsUntilMidnightIST(elevenPmIST)).toBe(3600);
  });

  it("formats coarsely while far out and by the second in the last hour", () => {
    expect(formatCountdown(5 * 3600 + 9 * 60)).toBe("5h 09m");
    expect(formatCountdown(9 * 60 + 4)).toBe("9m 04s");
    expect(formatCountdown(0)).toBe("0m 00s");
  });
});
