import Storefront from "@/components/storefront/Storefront";
import {
  getActiveBundles,
  getActiveProducts,
  getApprovedReviews,
  getSettings,
} from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { BUSINESS, MILESTONES } from "@/lib/constants";

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

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: BUSINESS.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: "176, Palayamkottai Rd, opp. Rajaji Park",
      addressLocality: "Thoothukudi",
      addressRegion: "Tamil Nadu",
      postalCode: "628001",
      addressCountry: "IN",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BUSINESS.rating,
      reviewCount: BUSINESS.reviewCount,
    },
    openingHours: "Mo-Su 09:00-21:00", // TODO: confirm closing time with owner
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
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
