import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data/catalog";
import { CATEGORIES, siteUrl } from "@/lib/constants";
import { LEGAL_DOCS, LEGAL_LAST_UPDATED } from "@/lib/legal/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getActiveProducts();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    // One indexable landing page per category
    ...CATEGORIES.map((c) => ({
      url: `${base}/c/${c}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
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
