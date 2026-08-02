import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBabyRegistryBySlugAction } from "@/app/customer-actions";
import { getActiveProducts } from "@/lib/data/catalog";
import { BUSINESS, siteUrl } from "@/lib/constants";
import { RegistryClient } from "./registry-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const registry = await getBabyRegistryBySlugAction(slug);

  if (!registry) {
    return {
      title: "Registry Not Found",
    };
  }

  const description = `By ${registry.parent_name} · Event Date: ${registry.event_date}. Gift baby essentials directly from their Rasi registry with fast delivery in Thoothukudi!`;

  return {
    title: `${registry.title} — Baby Registry`,
    description,
    openGraph: {
      title: `🎁 ${registry.title}`,
      description,
      url: `${siteUrl()}/registry/${slug}`,
      siteName: BUSINESS.name,
      type: "website",
      images: [
        {
          url: "/logo.png",
          width: 512,
          height: 512,
          alt: registry.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `🎁 ${registry.title}`,
      description,
    },
  };
}

export default async function RegistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [registry, products] = await Promise.all([
    getBabyRegistryBySlugAction(slug),
    getActiveProducts(),
  ]);

  if (!registry) {
    notFound();
  }

  return <RegistryClient registry={registry} products={products} />;
}
