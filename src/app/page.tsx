import Storefront from "@/components/storefront/Storefront";
import {
  getActiveBundles,
  getActiveProducts,
  getApprovedReviews,
  getSettings,
} from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { MILESTONES } from "@/lib/constants";
import { storeJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic"; // live stock + settings on every view

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: Props) {
  // Age and search survive a reload / shared link; category has its own route.
  const sp = await searchParams;
  const age = typeof sp.age === "string" ? sp.age : undefined;
  const query = typeof sp.q === "string" ? sp.q : undefined;

  const [products, bundles, reviews, settings] = await Promise.all([
    getActiveProducts(),
    getActiveBundles(),
    getApprovedReviews(),
    getSettings(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([storeJsonLd(), webSiteJsonLd()]),
        }}
      />
      <Storefront
        products={products}
        bundles={bundles}
        reviews={reviews}
        settings={settings}
        isDemo={isDemo()}
        initialMilestone={
          age && (MILESTONES as readonly string[]).includes(age) ? age : undefined
        }
        initialQuery={query}
      />
    </>
  );
}
