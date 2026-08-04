import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Storefront from "@/components/storefront/Storefront";
import {
  getActiveBrands,
  getActiveBundles,
  getActiveProducts,
  getApprovedReviews,
  getBrandBySlug,
  getLiveBanners,
  getSettings,
} from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { BUSINESS, MILESTONES, siteUrl, type Milestone } from "@/lib/constants";
import { computeReviewAggregate, storeJsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Brand not found" };

  const title = `${brand.name} at ${BUSINESS.name}`;
  const description = `Shop genuine ${brand.name} products at ${BUSINESS.name}, Thoothukudi. Same-day delivery on orders before 4 PM.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/brand/${brand.slug}` },
    openGraph: { title, description, images: [brand.logo_url] },
  };
}

/**
 * A brand's shelf. Rather than a bespoke listing this reuses the storefront
 * with its brand filter pre-set, so the cart, quick view, search and age pills
 * all behave exactly as they do everywhere else.
 */
export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const age = typeof sp.age === "string" ? sp.age : undefined;
  const query = typeof sp.q === "string" ? sp.q : undefined;

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const [products, bundles, reviews, settings, banners, brands] =
    await Promise.all([
      getActiveProducts(),
      getActiveBundles(),
      getApprovedReviews(),
      getSettings(),
      getLiveBanners(),
      getActiveBrands(),
    ]);

  const base = siteUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: BUSINESS.name, item: `${base}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: brand.name,
        item: `${base}/brand/${brand.slug}`,
      },
    ],
  };

  const breadcrumbItems = breadcrumbJsonLd.itemListElement.map((li) => ({
    name: li.name,
    href: li.item.replace(base, "") || "/",
  }));

  const aggregate = computeReviewAggregate(reviews);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd, storeJsonLd(aggregate)]),
        }}
      />
      <Storefront
        products={products}
        bundles={bundles}
        reviews={reviews}
        settings={settings}
        banners={banners}
        brands={brands}
        isDemo={isDemo()}
        breadcrumb={breadcrumbItems}
        initialMilestone={
          age && (MILESTONES as readonly string[]).includes(age)
            ? (age as Milestone)
            : undefined
        }
        initialQuery={query}
        initialBrand={brand.name}
      />
    </>
  );
}
