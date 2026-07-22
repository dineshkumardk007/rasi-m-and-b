import { afterEach, describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_META, MILESTONES, MILESTONE_META, glowFor, inr } from "@/lib/constants";

const saved = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

describe("inr()", () => {
  it("formats in the Indian grouping, not thousands", () => {
    expect(inr(1299)).toBe("₹1,299");
    expect(inr(150000)).toBe("₹1,50,000"); // lakh grouping, not 150,000
    expect(inr(0)).toBe("₹0");
  });
});

describe("siteUrl()", () => {
  it("strips trailing slashes, which were producing '//c/feeding' in the sitemap", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://rasi.example///";
    const { siteUrl } = await import("@/lib/constants");
    expect(siteUrl()).toBe("https://rasi.example");
  });

  it("falls back to localhost when unset", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { siteUrl } = await import("@/lib/constants");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("design tokens", () => {
  it("maps every tile swatch to a glow inside the brand palette", () => {
    const pops = new Set(Object.values(CATEGORY_META).map((m) => m.pop));
    for (const meta of Object.values(CATEGORY_META)) {
      expect(pops.has(glowFor(meta.bg))).toBe(true);
    }
  });

  it("falls back to brand pink for an unknown colour", () => {
    expect(glowFor("#123456")).toBe("#EC5D8A");
  });

  it("is case- and whitespace-insensitive on the swatch lookup", () => {
    expect(glowFor(" #ffe1a8 ")).toBe(glowFor("#FFE1A8"));
  });

  it("has display metadata for every category and milestone", () => {
    for (const c of CATEGORIES) expect(CATEGORY_META[c]?.en).toBeTruthy();
    for (const m of MILESTONES) expect(MILESTONE_META[m]?.en).toBeTruthy();
  });
});
