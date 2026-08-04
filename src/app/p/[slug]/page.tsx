import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getApprovedReviewsForProduct, getProductBySlug } from "@/lib/data/catalog";
import { getLanguage } from "@/lib/i18n/server";
import { BUSINESS, CATEGORY_META, MILESTONE_META, inr, siteUrl } from "@/lib/constants";
import { Breadcrumbs } from "@/components/ui";
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
  const ogUrl = `/og?title=${encodeURIComponent(name)}&price=${encodeURIComponent(inr(product.price))}&emoji=${encodeURIComponent(product.emoji || "👶")}`;
  const imageUrl = product.images[0] || ogUrl;

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
          url: imageUrl,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${inr(product.price)}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const reviews = await getApprovedReviewsForProduct(product.id);

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
  const category = product.categories[0];
  const categoryMeta = category ? CATEGORY_META[category] : undefined;

  const base = siteUrl();
  const breadcrumbItems = [
    { name: BUSINESS.name, href: "/" },
    ...(categoryMeta ? [{ name: categoryMeta.en, href: `/c/${category}` }] : []),
    { name: product.name_en, href: `/p/${product.slug}` },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${base}${item.href === "/" ? "/" : item.href}`,
    })),
  };
  const breadcrumbJsonLdHtml = JSON.stringify(breadcrumbJsonLd)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  // jsonLd embeds moderator-approved review author names and text — free-form
  // user input. JSON.stringify does NOT escape "<", so a review containing
  // "</script>" would break out of this tag and run as HTML. Escape the markup-
  // significant characters (and the JS line separators) so the payload stays
  // inert data. Standard mitigation for JSON embedded in a <script> block.
  const jsonLdHtml = JSON.stringify(jsonLd)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-5 py-6 text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLdHtml }}
      />
      <Link
        href="/"
        className="mb-4 inline-block rounded-pill border-2.5 border-ink bg-paper px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
      >
        ← {BUSINESS.name}
      </Link>
      <Breadcrumbs items={breadcrumbItems} />
      <PdpClient product={product} reviews={reviews} />
      <p className="mt-6 text-center text-[12px] text-mute">
        {meta.emoji} {meta.en} · {inr(product.price)} · {BUSINESS.addressShort}
      </p>
    </main>
  );
}
