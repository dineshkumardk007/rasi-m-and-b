import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await getActiveProducts();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...products.map((p) => ({
      url: `${base}/p/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
