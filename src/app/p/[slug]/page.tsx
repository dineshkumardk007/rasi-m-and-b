import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getApprovedReviews, getProductBySlug } from "@/lib/data/catalog";
import { getLanguage } from "@/lib/i18n/server";
import { BUSINESS, MILESTONE_META, inr } from "@/lib/constants";
import { PdpClient } from "./pdp-client";

/**
 * SEO product page. The storefront's quick-view modal covers in-flow browsing;
 * this route exists for sharing, search engines and the Merchant feed —
 * with full Product JSON-LD.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const lang = await getLanguage();
  const name = lang === "ta" ? product.name_ta : product.name_en;
  const description = lang === "ta" ? product.description_ta : product.description_en;

  /**
   * The preview card a customer sees when this link lands in WhatsApp. Price
   * goes in the description because that is the line people actually read in
   * the card; the product photo is the image when there is one, falling back
   * to the shop logo so the card is never blank.
   */
  return {
    title: name,
    description,
    alternates: { canonical: `/p/${slug}` },
    openGraph: {
      type: "website",
      siteName: BUSINESS.name,
      title: `${name} — ${inr(product.price)}`,
      description,
      url: `/p/${slug}`,
      images: [
        {
          url: product.images[0] ?? "/logo.png",
          alt: name,
        },
      ],
    },
    twitter: {
      card: product.images[0] ? "summary_large_image" : "summary",
      title: `${name} — ${inr(product.price)}`,
      description,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const reviews = (await getApprovedReviews()).filter((r) => r.product_id === product.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_en,
    description: product.description_en,
    image: product.images[0],
    brand: { "@type": "Brand", name: product.brand || BUSINESS.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: BUSINESS.name },
    },
    ...(reviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (
              reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            ).toFixed(1),
            reviewCount: reviews.length,
          },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author_name },
            reviewRating: { "@type": "Rating", ratingValue: r.rating },
            reviewBody: r.text,
          })),
        }
      : {}),
  };

  const meta = MILESTONE_META[product.milestone];

  return (
    <main className="mx-auto min-h-screen max-w-[720px] bg-cream px-5 py-6 text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/"
        className="mb-4 inline-block rounded-pill border-2.5 border-ink bg-paper px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
      >
        ← {BUSINESS.name}
      </Link>
      <PdpClient product={product} reviews={reviews} />
      <p className="mt-6 text-center text-[12px] text-mute">
        {meta.emoji} {meta.en} · {inr(product.price)} · {BUSINESS.addressShort}
      </p>
    </main>
  );
}
