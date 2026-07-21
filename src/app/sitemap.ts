import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data/catalog";
import { CATEGORIES, siteUrl } from "@/lib/constants";

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
  ];
}
