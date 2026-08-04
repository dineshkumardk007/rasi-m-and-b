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
import { MILESTONES } from "@/lib/constants";
import { computeReviewAggregate, storeJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic"; // live stock + settings on every view

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: Props) {
  // Age and search survive a reload / shared link; category has its own route.
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

  const aggregate = computeReviewAggregate(reviews);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([storeJsonLd(aggregate), webSiteJsonLd()]),
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
        initialMilestone={
          age && (MILESTONES as readonly string[]).includes(age) ? age : undefined
        }
        initialQuery={query}
        initialBrand={brand}
      />
    </>
  );
}
