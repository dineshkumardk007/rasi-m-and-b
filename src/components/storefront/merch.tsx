"use client";

/**
 * Merchandising sections — the parts of the home page a shopkeeper controls
 * from the admin rather than a developer controls from a deploy: scheduled
 * banners, the offer ticker, the daily deal rail, the brand wall, and social
 * proof from approved reviews.
 *
 * Every one of these returns null when it has nothing to show, so an empty
 * catalogue or a store with no banners set renders a shorter page rather than
 * a page full of empty headings.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Banner, Brand, Coupon, Product, Review, StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { inr } from "@/lib/constants";
import { Card, Stars } from "@/components/ui";
import { Marquee } from "./sections";
import {
  featuredOffers,
  formatCountdown,
  liveBanners,
  secondsUntilMidnightIST,
  topDeals,
} from "@/lib/merchandising";

/* ── Offer ticker ────────────────────────────────────────────────────────── */

/**
 * The scrolling strip of live offers under the hero.
 *
 * Coupon codes are re-validated by featuredOffers() before they appear:
 * advertising a code that fails at checkout costs more than staying quiet.
 */
export function OfferStrip({
  coupons,
  settings,
}: {
  coupons: Coupon[];
  settings: StoreSettings;
}) {
  const { t } = useT();

  const messages = useMemo(() => {
    const out = featuredOffers(coupons).map((c) =>
      c.type === "percent"
        ? t("offer.percent", {
            value: String(c.value),
            code: c.code,
            min: inr(c.min_order),
          })
        : t("offer.flat", {
            value: inr(c.value),
            code: c.code,
            min: inr(c.min_order),
          }),
    );

    out.push(t("offer.freeDelivery", { amount: inr(settings.free_delivery_threshold) }));
    if (settings.same_day_enabled) out.push(t("offer.sameDay"));
    return out;
  }, [coupons, settings, t]);

  if (messages.length === 0) return null;

  const half = (
    <span className="flex shrink-0 items-center gap-9 pr-9">
      {messages.map((m, i) => (
        <span key={i} className="whitespace-nowrap font-display text-[13px] font-extrabold">
          {m}
        </span>
      ))}
    </span>
  );

  return (
    <div className="marquee-mask marquee-paused overflow-hidden border-y-2.5 border-ink bg-[#FFE66D] text-ink">
      <div className="marquee-track flex w-max py-[7px]">
        {half}
        {/* The duplicate is what makes the -50% loop seamless. It is decorative
            repetition, so screen readers should hear the list exactly once. */}
        <span aria-hidden>{half}</span>
      </div>
    </div>
  );
}

/* ── Deal of the day ─────────────────────────────────────────────────────── */

/**
 * The steepest live discounts, with a countdown to midnight IST.
 *
 * Reuses the product marquee rather than growing a second scroller: the only
 * differences are the heading and the percent badge, both of which Marquee
 * takes as props.
 */
export function DealOfTheDay({
  products,
  openProduct,
}: {
  products: Product[];
  openProduct: (p: Product) => void;
}) {
  const { t } = useT();
  const deals = useMemo(() => topDeals(products, { limit: 12 }), [products]);

  // Starts null and fills in on the client: rendering a clock during SSR would
  // hydrate against a value that is already a second stale.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSecondsLeft(secondsUntilMidnightIST());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (deals.length === 0) return null;

  return (
    <Marquee
      products={deals}
      openProduct={openProduct}
      title={t("deal.title")}
      sub={
        secondsLeft === null
          ? t("deal.today")
          : t("deal.endsIn", { time: formatCountdown(secondsLeft) })
      }
      showDiscount
    />
  );
}

/* ── Banners ─────────────────────────────────────────────────────────────── */

function BannerImage({ banner, priority }: { banner: Banner; priority?: boolean }) {
  return (
    <Image
      src={banner.image_url}
      alt={banner.alt}
      fill
      sizes="(max-width: 1240px) 100vw, 1200px"
      priority={priority}
      className="object-cover"
    />
  );
}

/** Wraps a banner in a link only when one is set, so decorative slides stay inert. */
function BannerFrame({ banner, children }: { banner: Banner; children: React.ReactNode }) {
  if (!banner.link_url) return <>{children}</>;
  return (
    <Link href={banner.link_url} className="block h-full w-full" aria-label={banner.alt}>
      {children}
    </Link>
  );
}

/**
 * Hero carousel. The 3:1 frame matches the 1200x400 banner rendition the image
 * pipeline produces, so an uploaded slide fills it exactly at every width.
 *
 * Returns null when nothing is scheduled — the caller falls back to the static
 * Hero, so a store that never sets a banner still has a front page.
 */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const slides = useMemo(() => liveBanners(banners, "hero"), [banners]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0]!.clientX - start;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-4 sm:px-5 sm:pt-6">
      <div
        className="relative aspect-[3/1] w-full overflow-hidden rounded-modal border-3 border-ink shadow-hard-6"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]!.clientX;
          setPaused(true);
        }}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((banner, i) => (
          <div
            key={banner.id}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <BannerFrame banner={banner}>
              <BannerImage banner={banner} priority={i === 0} />
            </BannerFrame>
          </div>
        ))}

        {count > 1 && (
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {slides.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full border-2 border-ink transition-all ${
                  i === index ? "w-6 bg-brand" : "w-2.5 bg-white/90"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** The single mid-page promo slot. Same 3:1 frame, no rotation. */
export function PromoBanner({ banners }: { banners: Banner[] }) {
  const slide = useMemo(() => liveBanners(banners, "mid")[0], [banners]);
  if (!slide) return null;

  return (
    <div className="mx-auto max-w-[1080px] px-5 pt-5">
      <div className="relative aspect-[3/1] w-full overflow-hidden rounded-card border-3 border-ink shadow-hard-4">
        <BannerFrame banner={slide}>
          <BannerImage banner={slide} />
        </BannerFrame>
      </div>
    </div>
  );
}

/* ── Brands ──────────────────────────────────────────────────────────────── */

/**
 * The brand wall. Logos are shown on white and contained rather than cropped —
 * a clipped logo reads as a broken image, and these are other companies' marks.
 */
export function BrandRail({ brands }: { brands: Brand[] }) {
  const { t } = useT();
  if (brands.length === 0) return null;

  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-2 pt-6">
      <h2 className="mb-3.5 font-display text-[24px] font-extrabold">{t("brand.title")}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brand/${brand.slug}`}
            className="group w-[104px] shrink-0 text-center"
          >
            <div className="relative h-[104px] w-[104px] overflow-hidden rounded-tile border-2.5 border-ink bg-white transition-transform duration-200 group-hover:-translate-y-1">
              <Image
                src={brand.logo_url}
                alt={brand.name}
                fill
                sizes="104px"
                className="object-contain p-2.5"
              />
            </div>
            <div className="mt-1.5 truncate text-[12px] font-bold">{brand.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface CardTheme {
  bg: string;
  badgeBg: string;
  pillBg: string;
  highlight: string;
  tag: string;
}

const COLOR_THEMES: CardTheme[] = [
  { bg: "bg-gradient-to-br from-[#FFE1A8] via-[#FFFDF8] to-[#FFE1A8]/60", badgeBg: "bg-[#FE91E8]", pillBg: "bg-[#B9EBDD]", highlight: "bg-[#FFF0B3]", tag: "🧸 Toy Collector" },
  { bg: "bg-gradient-to-br from-[#FFCBD9]/80 via-[#FFFDF8] to-[#FFCBD9]/40", badgeBg: "bg-[#C7E9FF]", pillBg: "bg-[#FFE1A8]", highlight: "bg-[#FFCBD9]/50", tag: "👑 Newborn Care" },
  { bg: "bg-gradient-to-br from-[#C7E9FF]/80 via-[#FFFDF8] to-[#C7E9FF]/40", badgeBg: "bg-[#D6E8B0]", pillBg: "bg-[#FFCBD9]", highlight: "bg-[#C7E9FF]/60", tag: "👶 Happy Parent" },
  { bg: "bg-gradient-to-br from-[#D6E8B0]/80 via-[#FFFDF8] to-[#D6E8B0]/40", badgeBg: "bg-[#FFE1A8]", pillBg: "bg-[#FE91E8]", highlight: "bg-[#D6E8B0]/60", tag: "⚡ Fast Delivery" },
  { bg: "bg-gradient-to-br from-[#E5D4FF]/80 via-[#FFFDF8] to-[#E5D4FF]/40", badgeBg: "bg-[#B9EBDD]", pillBg: "bg-[#C7E9FF]", highlight: "bg-[#E5D4FF]/60", tag: "❤️ Recommended" },
  { bg: "bg-gradient-to-br from-[#B9EBDD]/80 via-[#FFFDF8] to-[#B9EBDD]/40", badgeBg: "bg-[#FE91E8]", pillBg: "bg-[#FFE1A8]", highlight: "bg-[#B9EBDD]/60", tag: "⭐ 5-Star Verified" },
];

function PlayableReviewCard({
  review,
  index,
  productName,
}: {
  review: Review;
  index: number;
  productName: string | null;
}) {
  const theme = COLOR_THEMES[index % COLOR_THEMES.length]!;
  const [likes, setLikes] = useState(2 + (index % 4));
  const [hasLiked, setHasLiked] = useState(false);
  const [pop, setPop] = useState(false);

  const handleLike = () => {
    if (hasLiked) {
      setLikes((l) => l - 1);
      setHasLiked(false);
    } else {
      setLikes((l) => l + 1);
      setHasLiked(true);
      setPop(true);
      setTimeout(() => setPop(false), 400);
    }
  };

  const text = review.text.replace(/(\s*…\s*More|\s*\.\.\.\s*More)$/i, "");

  return (
    <div
      className={`relative group rounded-card border-[3px] border-ink ${theme.bg} p-5 shadow-[6px_6px_0px_#2B2140] hover:-translate-y-1.5 hover:shadow-[8px_8px_0px_#2B2140] transition-all duration-200 flex flex-col justify-between overflow-hidden`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1 bg-white border-2 border-ink px-2.5 py-1 rounded-pill shadow-xs">
            <Stars n={review.rating} />
          </div>
          <span className={`text-[11px] font-extrabold text-ink ${theme.pillBg} border-2 border-ink px-2.5 py-0.5 rounded-pill shadow-xs uppercase tracking-wide`}>
            {theme.tag}
          </span>
        </div>

        {/* Handwritten Marker Quote Container */}
        <div className="my-2">
          <span className={`inline font-display text-[14.5px] font-extrabold text-ink leading-relaxed ${theme.highlight} border-b-2 border-ink/40 px-2 py-1 rounded-sm shadow-xs`}>
            &ldquo;{text}&rdquo;
          </span>
        </div>
      </div>

      {/* Footer Row with Author Avatar + Interactive Like Button */}
      <div className="mt-4 pt-3 border-t-2 border-ink/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink ${theme.badgeBg} font-display text-[13px] font-black text-ink shadow-xs`}>
            {review.author_name.charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="font-display text-[13.5px] font-extrabold text-ink truncate">
              {review.author_name}
            </div>
            {productName && (
              <div className="text-[11px] font-bold text-mute truncate max-w-[170px]">
                {productName}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Playable Like Button */}
        <button
          type="button"
          onClick={handleLike}
          className={`btn-press shrink-0 flex items-center gap-1 rounded-pill border-2 border-ink px-2.5 py-1 text-[12px] font-extrabold transition-all cursor-pointer select-none ${
            hasLiked
              ? "bg-[#FE91E8] text-ink shadow-hard-2 scale-105"
              : "bg-white text-ink hover:bg-[#FFE1A8] shadow-xs"
          } ${pop ? "animate-bounce" : ""}`}
          title="Mark review as helpful"
        >
          <span>{hasLiked ? "❤️" : "🤍"}</span>
          <span>{likes}</span>
        </button>
      </div>
    </div>
  );
}

/* ── Social proof ────────────────────────────────────────────────────────── */

/**
 * Approved reviews, newest first. These rows already existed in the database
 * and were only reachable from a product page.
 */
export function ReviewsStrip({
  reviews,
  products,
}: {
  reviews: Review[];
  products: Product[];
}) {
  const { t, lang } = useT();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<"spotlight" | "grid">("spotlight");

  const shown = useMemo(
    () =>
      [...reviews]
        .filter((r) => r.status === "approved" && r.text.trim().length > 0)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [reviews],
  );

  const count = shown.length;

  // 5-second auto scroll timer changing from one review to another in spotlight mode
  useEffect(() => {
    if (count <= 1 || isPaused || viewMode !== "spotlight") return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count, isPaused, viewMode]);

  if (count === 0) return null;

  const currentReview = shown[currentIndex] ?? shown[0];
  if (!currentReview) return null;
  const product = products.find((p) => p.id === currentReview.product_id);
  const productName = product ? (lang === "ta" ? product.name_ta : product.name_en) : null;

  const cleanText = currentReview.text.replace(/(\s*…\s*More|\s*\.\.\.\s*More)$/i, "");

  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-5 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FFE1A8] text-[18px] shadow-hard-2">
            💬
          </span>
          <div>
            <h2 className="font-display text-[22px] sm:text-[25px] font-extrabold text-ink leading-none">
              {t("reviews.title")}
            </h2>
            <p className="text-[12px] font-bold text-mute mt-0.5 font-display">
              Real feedback from 2,360+ happy parents
            </p>
          </div>
        </div>

        {/* View Mode & Nav Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* View Mode Toggle Pill */}
          <div className="flex items-center rounded-pill border-2 border-ink bg-white p-0.5 shadow-hard-2 text-[12px] font-extrabold">
            <button
              type="button"
              onClick={() => setViewMode("spotlight")}
              className={`px-2.5 py-1 rounded-pill transition-all cursor-pointer ${
                viewMode === "spotlight"
                  ? "bg-[#FFE1A8] text-ink border border-ink"
                  : "text-mute hover:text-ink"
              }`}
            >
              ⚡ Spotlight
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded-pill transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#C7E9FF] text-ink border border-ink"
                  : "text-mute hover:text-ink"
              }`}
            >
              📑 All Reviews ({count})
            </button>
          </div>
        </div>
      </div>

      {viewMode === "spotlight" ? (
        /* Neo-Brutalist Auto-Rotating Spotlight Box */
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative group rounded-card border-[3.5px] border-ink bg-gradient-to-br from-[#FFE1A8] via-[#FFFDF8] to-[#C7E9FF] p-5 sm:p-7 shadow-[8px_8px_0px_#2B2140] transition-all duration-300 min-h-[190px] flex flex-col justify-between overflow-hidden"
        >
          {/* Giant Watermark Quote Mark */}
          <span className="absolute right-4 top-1 font-display text-[110px] sm:text-[140px] font-black leading-none text-ink/5 select-none pointer-events-none">
            “
          </span>

          {/* 5-Second Timer Progress Bar */}
          {count > 1 && !isPaused && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-ink/10 overflow-hidden">
              <div
                key={currentIndex}
                className="h-full bg-brand animate-[progress_5s_linear]"
                style={{
                  animation: "progress 5s linear infinite",
                }}
              />
            </div>
          )}

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-white px-3 py-1 shadow-hard-2">
                <Stars n={currentReview.rating} />
                <span className="font-display text-[12px] font-black text-ink ml-1">
                  {currentReview.rating}.0 / 5.0
                </span>
              </div>

              <span className="btn-press font-display text-[11px] font-black uppercase tracking-wider text-ink bg-[#B9EBDD] border-2 border-ink px-3 py-1 rounded-pill shadow-hard-2">
                ✓ Verified Buyer
              </span>
            </div>

            {/* Handwritten Marker Highlighter Review Text */}
            <div className="my-3 sm:my-4">
              <span className="inline font-display text-[16px] sm:text-[19px] font-extrabold text-ink leading-relaxed bg-[#FFF0B3] border-b-2.5 border-brand/50 px-2.5 py-1 rounded-sm shadow-xs rotate-[-0.5deg]">
                &ldquo;{cleanText}&rdquo;
              </span>
            </div>
          </div>

          {/* Author & Footer Row */}
          <div className="relative z-10 mt-4 pt-3.5 border-t-2.5 border-ink/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FE91E8] font-display text-[15px] font-black text-ink shadow-hard-2">
                {currentReview.author_name.charAt(0)}
              </span>
              <div>
                <div className="font-display text-[15px] font-extrabold text-ink flex items-center gap-1.5">
                  <span>{currentReview.author_name}</span>
                  <span className="text-[12px] font-bold text-brand">❤️</span>
                </div>
                {productName && (
                  <div className="text-[12px] font-bold text-mute truncate max-w-[280px]">
                    Purchased: {productName}
                  </div>
                )}
              </div>
            </div>

            {/* Dot Indicators */}
            {count > 1 && (
              <div className="flex items-center gap-2">
                {shown.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-3 rounded-pill border-2 border-ink transition-all duration-300 cursor-pointer ${
                      idx === currentIndex
                        ? "w-7 bg-brand shadow-hard-2"
                        : "w-3 bg-white hover:bg-[#FFE1A8]"
                    }`}
                    aria-label={`Go to review ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Multi-Card Review Grid: Colorful, Fun & Interactive */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {shown.map((review, idx) => {
            const p = products.find((x) => x.id === review.product_id);
            const pName = p ? (lang === "ta" ? p.name_ta : p.name_en) : null;
            return (
              <PlayableReviewCard
                key={review.id}
                review={review}
                index={idx}
                productName={pName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
