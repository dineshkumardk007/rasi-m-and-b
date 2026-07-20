import Storefront from "@/components/storefront/Storefront";
import {
  getActiveBundles,
  getActiveProducts,
  getApprovedReviews,
  getSettings,
} from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { BUSINESS } from "@/lib/constants";

export const dynamic = "force-dynamic"; // live stock + settings on every view

export default async function HomePage() {
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
      />
    </>
  );
}
