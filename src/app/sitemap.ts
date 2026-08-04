import type { MetadataRoute } from "next";
import { getActiveBrands, getActiveProducts, getSettings } from "@/lib/data/catalog";
import { getAllCategories, siteUrl } from "@/lib/constants";
import { LEGAL_DOCS, LEGAL_LAST_UPDATED } from "@/lib/legal/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, brands, settings] = await Promise.all([
    getActiveProducts(),
    getActiveBrands(),
    getSettings(),
  ]);
  // Built-in + any admin-added custom categories — both are real, indexable
  // /c/[category] pages now (see c/[category]/page.tsx).
  const { slugs: categorySlugs } = getAllCategories(settings.custom_categories);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    // One indexable landing page per category
    ...categorySlugs.map((c) => ({
      url: `${base}/c/${c}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    // Brand landing pages — fully indexable (canonical + BreadcrumbList) but were
    // previously discoverable only via internal links.
    ...brands.map((b) => ({
      url: `${base}/brand/${b.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/p/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${base}/contact`, changeFrequency: "yearly" as const, priority: 0.5 },
    // Policy pages: low priority, but they must be crawlable — Razorpay's
    // review and Google's shopping policies both expect them indexed.
    ...LEGAL_DOCS.map((doc) => ({
      url: `${base}/legal/${doc}`,
      lastModified: new Date(LEGAL_LAST_UPDATED),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
