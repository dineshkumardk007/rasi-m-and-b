import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Storefront from "@/components/storefront/Storefront";
import {
  getActiveBrands,
  getActiveBundles,
  getActiveProducts,
  getApprovedReviews,
  getLiveBanners,
  getSettings,
} from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { getLanguage } from "@/lib/i18n/server";
import {
  BUSINESS,
  MILESTONES,
  getAllCategories,
  siteUrl,
  type Milestone,
} from "@/lib/constants";
import { computeReviewAggregate, storeJsonLd } from "@/lib/seo/jsonld";

/**
 * Category landing page — the storefront, opened on one category.
 *
 * The filters used to live only in React state, so every view shared the "/"
 * URL: nothing was shareable and Google had a single page to index. Category is
 * a path segment here (indexable, one page per category); age and search stay
 * query params, since those combinations are for sharing rather than indexing.
 */

export const dynamic = "force-dynamic"; // live stock, same as the home page

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  // Custom categories (admin → Settings → Categories) live in settings, not the
  // static CATEGORIES constant — a category an owner adds needs to resolve here
  // too, or it silently 404s despite being fully configured in the admin.
  const settings = await getSettings();
  const { meta: categoryMeta } = getAllCategories(settings.custom_categories);
  const meta = categoryMeta[category];
  if (!meta) return {};

  const lang = await getLanguage();
  const name = lang === "ta" ? meta.ta : meta.en;

  return {
    // The root layout appends "· Rasi Mom & Baby" via its title template.
    title: `${name} in ${BUSINESS.city}`,
    description:
      lang === "ta"
        ? `${BUSINESS.name} — ${name} பொருட்கள். ${BUSINESS.city}-இல் அதே நாள் டெலிவரி.`
        : `Shop ${name.toLowerCase()} at ${BUSINESS.name}, ${BUSINESS.city}. Same-day delivery on orders before 4 PM.`,
    alternates: { canonical: `/c/${category}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;

  const sp = await searchParams;
  const age = typeof sp.age === "string" ? sp.age : undefined;
  const query = typeof sp.q === "string" ? sp.q : undefined;
  const brand = typeof sp.brand === "string" ? sp.brand : undefined;

  const [products, bundles, reviews, settings, banners, brands] =
    await Promise.all([
      getActiveProducts(),
      getActiveBundles(),
      getApprovedReviews(),
      getSettings(),
      getLiveBanners(),
      getActiveBrands(),
    ]);

  const { meta: categoryMeta } = getAllCategories(settings.custom_categories);
  const catInfo = categoryMeta[category];
  if (!catInfo) notFound();

  const base = siteUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: BUSINESS.name, item: `${base}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: catInfo.en,
        item: `${base}/c/${category}`,
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
          // Category pages are the main organic landing pages, so they carry
          // the shop node too — not just the breadcrumb trail.
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
        initialCategory={category}
        initialMilestone={
          age && (MILESTONES as readonly string[]).includes(age)
            ? (age as Milestone)
            : undefined
        }
        initialQuery={query}
        initialBrand={brand}
      />
    </>
  );
}
