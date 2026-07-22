import { BUSINESS, siteUrl } from "@/lib/constants";

/**
 * Structured data for the shop itself.
 *
 * Split out of page.tsx so the storefront and the category landing pages emit
 * the same organisation node, and so the "what do we actually know about this
 * business" rules live in one place.
 *
 * The governing rule here: never assert a fact the owner has not confirmed.
 * Rich results are read by people deciding whether to drive across town —
 * a guessed closing time or an invented phone number costs someone a trip.
 */

/** Stable node id so the Store and WebSite graphs can reference each other. */
const storeId = () => `${siteUrl()}/#store`;

export function storeJsonLd() {
  const base = siteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": storeId(),
    name: BUSINESS.name,
    url: base,
    image: `${base}/logo.png`,
    logo: `${base}/logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.postal.street,
      addressLocality: BUSINESS.postal.locality,
      addressRegion: BUSINESS.postal.region,
      postalCode: BUSINESS.postal.postalCode,
      addressCountry: BUSINESS.postal.country,
    },
    areaServed: {
      "@type": "City",
      name: BUSINESS.city,
    },
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Credit Card, Debit Card, Net Banking",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BUSINESS.rating,
      reviewCount: BUSINESS.reviewCount,
    },
    // `telephone` is the field Google leans on hardest for a local business, so
    // it goes in the moment the owner supplies one — and stays out until then.
    ...(BUSINESS.phone ? { telephone: BUSINESS.phone } : {}),
    ...(BUSINESS.email ? { email: BUSINESS.email } : {}),
    /*
     * Opening hours are published only when both ends are known. The previous
     * version hardcoded "Mo-Su 09:00-21:00" while BUSINESS.closesAt was still
     * an unconfirmed TODO — that is a closing time nobody verified, shown in
     * Google's knowledge panel as fact. Omitting the field loses a minor rich
     * result; publishing the wrong one sends a parent to a closed shop.
     */
    ...(BUSINESS.closesAt
      ? {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: BUSINESS.opensAt,
            closes: BUSINESS.closesAt,
          },
        }
      : {}),
    ...(Object.values(BUSINESS.socials).some(Boolean)
      ? { sameAs: Object.values(BUSINESS.socials).filter(Boolean) }
      : {}),
  };
}

/**
 * WebSite node with a SearchAction, which is what lets Google render a search
 * box under the shop's result. The target is the storefront's own `?q=` param —
 * the same one the shop search writes — so a query from Google lands on a
 * filtered grid rather than the generic home page.
 */
export function webSiteJsonLd() {
  const base = siteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: BUSINESS.name,
    publisher: { "@id": storeId() },
    inLanguage: ["en-IN", "ta-IN"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
