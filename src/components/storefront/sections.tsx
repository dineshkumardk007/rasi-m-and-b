"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Brand, Bundle, Product, StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import {
  BUSINESS,
  CATEGORY_META,
  MILESTONES,
  MILESTONE_META,
  getAllCategories,
  glowStyle,
  inr,
  type Category,
  type Milestone,
} from "@/lib/constants";
import { Art, Badge, Btn, Card, Pill, Stars } from "@/components/ui";
import { discountPercent } from "@/lib/merchandising";

const nameOf = (p: Product, lang: string) => (lang === "ta" ? p.name_ta : p.name_en);

/* ── Hero — Interactive Product Wall (Left) + Flagship Store Showcase (Right) ────────── */
export function Hero({
  setCategory,
  settings,
  reviewCount,
}: {
  setCategory?: (cat: string) => void;
  settings?: StoreSettings;
  reviewCount?: number;
}) {
  const displayReviewCount = (reviewCount ?? BUSINESS.reviewCount).toLocaleString("en-IN");
  const scrollToCategory = (cat?: string) => {
    if (cat && setCategory) {
      setCategory(cat);
    }
    const target = document.getElementById("shop") || document.getElementById("category-grid");
    target?.scrollIntoView({ behavior: "smooth" });
  };

  const collageProducts = [
    {
      id: "baby-care",
      key: "hero-collage-bath",
      category: "bath",
      title: "Baby Care",
      subtitle: "Sebamed & Skincare",
      tag: "Gentle & Pure",
      emoji: "🧴",
      bg: "#C7E9FF",
      rot: "-2.5deg",
      price: "From ₹299",
    },
    {
      id: "toys-games",
      key: "hero-collage-toys",
      category: "toys",
      title: "Toys & Play",
      subtitle: "Stacking & Rattles",
      tag: "Brain & Fun",
      emoji: "🧸",
      bg: "#FFCBD9",
      rot: "1.8deg",
      price: "From ₹399",
    },
    {
      id: "baby-clothing",
      key: "hero-collage-clothing",
      category: "clothing",
      title: "Baby Clothing",
      subtitle: "Swaddles & Frocks",
      tag: "100% Cotton",
      emoji: "👕",
      bg: "#D6E8B0",
      rot: "-1.5deg",
      price: "From ₹199",
    },
    {
      id: "feeding",
      key: "hero-collage-feeding",
      category: "feeding",
      title: "Feeding",
      subtitle: "Bottles & Sippers",
      tag: "Anti-Colic",
      emoji: "🍼",
      bg: "#FFE1A8",
      rot: "2.2deg",
      price: "From ₹249",
    },
    {
      id: "maternity",
      key: "hero-collage-mom",
      category: "mom",
      title: "Maternity & Mom",
      subtitle: "Nursing & Care",
      tag: "Mom Comfort",
      emoji: "🤱",
      bg: "#FBD0EA",
      rot: "-2deg",
      price: "From ₹349",
    },
    {
      id: "diapers",
      key: "hero-collage-diapering",
      category: "diapering",
      title: "Diapers & Essentials",
      subtitle: "Pants & Wipes",
      tag: "12-Hr Dry",
      emoji: "🧷",
      bg: "#E4D6FF",
      rot: "1.5deg",
      price: "From ₹499",
    },
  ];

  return (
    <div className="relative mx-auto max-w-[1240px] px-4 sm:px-5 pb-2 pt-4 sm:pt-6 group/hero">

      {/* ── INTERACTIVE COLORFUL FLOATING UI STICKERS & BADGES ── */}
      {/* Bottom-Left Interactive Sticker: Happy Moms */}
      <div className="absolute -bottom-3 left-6 z-20 hidden md:inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#D6E8B0] px-3 py-1 font-display text-[11px] font-extrabold text-ink -rotate-3 shadow-hard-2 transition-all duration-300 hover:rotate-0 hover:scale-110 hover:shadow-hard-4 hover:bg-[#B9EBDD] cursor-pointer select-none">
        <span>⭐</span>
        <span>{displayReviewCount}+ Happy Families</span>
      </div>

      {/* Bottom-Right Interactive Sticker: COD Available */}
      <div className="absolute -bottom-3 right-8 z-20 hidden md:inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#E4D6FF] px-3 py-1 font-display text-[11px] font-extrabold text-ink rotate-3 shadow-hard-2 transition-all duration-300 hover:rotate-0 hover:scale-110 hover:shadow-hard-4 hover:bg-[#C7E9FF] cursor-pointer select-none">
        <span>💳</span>
        <span>COD / UPI Available</span>
      </div>

      {/* Main Hero Container with Rich Neo-Brutalist Gradient & Dynamic Interactive Pattern */}
      <div className="relative z-[1] rounded-modal border-3 border-ink bg-gradient-to-br from-[#FFFDF8] via-[#FFE1A8]/30 via-[#FFCBD9]/25 to-[#C7E9FF]/35 p-3.5 sm:p-5 md:p-6 shadow-hard-6 backdrop-blur-sm overflow-visible transition-all duration-500 group-hover/hero:shadow-[10px_10px_0px_#2B2140]">

        {/* Top-Left Interactive Sticker: 100% Baby-Safe (Extreme outer left corner) */}
        <div className="absolute -top-3.5 -left-1 sm:-left-2 z-10 hidden sm:inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#FFE66D] px-3 py-1 font-display text-[11px] font-extrabold text-ink -rotate-3 shadow-hard-2 transition-all duration-300 hover:rotate-0 hover:scale-110 hover:shadow-hard-4 hover:bg-[#FFE1A8] cursor-pointer select-none">
          <span className="text-[14px] animate-bounce">🛡️</span>
          <span>100% Baby-Safe</span>
        </div>

        {/* Top-Right Interactive Sticker: Express Delivery (Extreme outer right corner) */}
        <div className="absolute -top-3.5 -right-1 sm:-right-2 z-10 hidden sm:inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#FFCBD9] px-3 py-1 font-display text-[11px] font-extrabold text-ink rotate-3 shadow-hard-2 transition-all duration-300 hover:rotate-0 hover:scale-110 hover:shadow-hard-4 hover:bg-[#FE91E8] cursor-pointer select-none">
          <span className="text-[14px] animate-pulse">⚡</span>
          <span>Express Delivery</span>
        </div>

        {/* Dynamic Colorful Polka Dot & Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none select-none transition-opacity duration-500 group-hover/hero:opacity-[0.22]"
          style={{
            backgroundImage: `
              radial-gradient(#EC5D8A 2.2px, transparent 2.2px),
              radial-gradient(#3B9EDB 2.2px, transparent 2.2px),
              radial-gradient(#F59E0B 2.2px, transparent 2.2px)
            `,
            backgroundSize: `36px 36px, 36px 36px, 36px 36px`,
            backgroundPosition: `0 0, 18px 18px, 9px 27px`
          }}
        />

        <div className="relative z-10 grid grid-cols-1 gap-5 md:gap-6 items-center md:grid-cols-2">
          {/* ── LEFT HERO: LARGE FEATURED STORE IMAGE CARD ── */}
          <div className="relative w-full">
            <div className="relative rounded-card border-2.5 sm:border-3 border-ink bg-[#FE91E8] p-2.5 sm:p-4 md:p-5 shadow-hard-4 transition-all duration-300">
              <Image
                src={settings?.box_media?.["hero-store-banner"] || "/hero-store.jpg"}
                alt="Rasi Mom & Baby Store Front"
                width={1024}
                height={576}
                priority
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 560px"
                className="w-full h-auto max-h-[260px] sm:max-h-none rounded-[10px] sm:rounded-[14px] object-contain sm:object-cover border-2 sm:border-2.5 border-ink bg-white/40 transition-transform duration-500 group-hover:scale-[1.01]"
              />
              <div className="mt-2.5 sm:mt-3.5 px-0.5 pb-0.5 flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                {/* Specific Google Maps Link Button */}
                <a
                  href={BUSINESS.googleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press shrink-0 flex items-center gap-1.5 rounded-pill border-2 sm:border-2.5 border-ink bg-white/95 px-2.5 sm:px-3 py-1 font-display text-[11px] sm:text-[13px] md:text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] transition-all duration-200 cursor-pointer"
                  title="Open Rasi Mom & Baby in Google Maps"
                >
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 border border-ink" />
                  </span>
                  <span>Visit Our Store in Thoothukudi 📍</span>
                </a>

                <div className="relative group/badge inline-block shrink-0">
                  {/* Colorful Glowing Ambient Pulse Halo */}
                  <div className="absolute -inset-0.5 sm:-inset-1 rounded-pill bg-gradient-to-r from-[#FF85C0] via-[#FFE1A8] to-[#9A6BE0] opacity-85 blur-[5px] sm:blur-[7px] animate-pulse pointer-events-none group-hover/badge:opacity-100 group-hover/badge:blur-9 transition-all" />

                  {/* Main Flagship Store Badge — Decorative Tag */}
                  <span className="relative z-10 flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-gradient-to-r from-[#FFE1A8] via-[#FFF0B3] to-[#FFCBD9] px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-extrabold tracking-wider text-ink shadow-hard-2">
                    <span className="text-[11px] sm:text-[12px]">✨</span>
                    <span>FLAGSHIP STORE</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT HERO: INTERACTIVE PRODUCT WALL COLLAGE ── */}
          <div className="flex flex-col justify-between h-full py-0.5">
            {/* Top Compact Section Header */}
            <div className="mb-2.5 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#FFE66D] px-3.5 py-1 font-display text-[12px] sm:text-[13px] font-extrabold tracking-wider uppercase text-ink shadow-hard-2">
                <span className="text-[14px]">🛍️</span>
                <span>SHOP FOR MOM & BABY</span>
              </div>
            </div>

            {/* Playful Neo-Brutalist Product Collage Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 my-0.5">
              {collageProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => scrollToCategory(prod.category)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Shop ${prod.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      scrollToCategory(prod.category);
                    }
                  }}
                  className="group relative cursor-pointer rounded-[18px] border-2.5 border-ink p-2.5 sm:p-3 shadow-hard-3 transition-all duration-300 ease-out hover:rotate-0 hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[6px_6px_0px_#2B2140] hover:z-20 overflow-hidden focus-visible:rotate-0 focus-visible:-translate-y-1.5 focus-visible:scale-[1.04] focus-visible:shadow-[6px_6px_0px_#2B2140] focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  style={{
                    backgroundColor: prod.bg,
                    transform: `rotate(${prod.rot})`,
                  }}
                >
                  {/* Custom Uploaded Box Picture or Subtle Background Accent Pattern */}
                  {settings?.box_media?.[prod.key] ? (
                    <div className="absolute inset-0 z-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.box_media[prod.key]}
                        alt={prod.title}
                        className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div
                      className="absolute -right-3 -bottom-3 text-[50px] opacity-10 pointer-events-none select-none transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                    >
                      {prod.emoji}
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="relative z-10 flex flex-col justify-between h-full min-h-[92px] sm:min-h-[106px]">
                    <div className="flex items-start justify-between gap-1">
                      {/* Top Category Tag */}
                      <span className="inline-block rounded-full border border-ink/40 bg-white/90 px-2 py-0.5 font-display text-[9px] sm:text-[10px] font-extrabold text-ink group-hover:bg-[#FFE66D] group-hover:border-ink transition-colors">
                        {prod.title}
                      </span>
                      {/* Micro Float Emoji Icon */}
                      <span className="text-[18px] sm:text-[22px] shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">
                        {prod.emoji}
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <h4 className="font-display text-[12px] sm:text-[13px] font-extrabold leading-tight text-ink group-hover:text-brand transition-colors">
                        {prod.subtitle}
                      </h4>
                      <p className="mt-0.5 font-display text-[10px] sm:text-[11px] font-bold text-ink/75">
                        {prod.price}
                      </p>
                    </div>

                    {/* Bottom Action Pill (Appears Prominently on Hover) */}
                    <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-ink/15">
                      <span className="font-display text-[9px] font-extrabold tracking-wide uppercase text-ink/60 group-hover:text-ink">
                        {prod.tag}
                      </span>
                      <span className="font-display text-[11px] font-extrabold text-ink opacity-70 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1 text-brand">
                        Shop →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Compact CTA Button */}
            <div className="mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => scrollToCategory("all")}
                className="group relative inline-flex items-center gap-2 rounded-pill border-2.5 border-ink bg-[#FFE1A8] px-4 py-1.5 sm:px-5 sm:py-2 font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE66D] hover:shadow-hard-3 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>EXPLORE ALL →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Auto-scrolling & touch-swipeable product marquee ────────────────────── */
export function Marquee({
  products,
  openProduct,
  title,
  sub,
  showDiscount,
}: {
  products: Product[];
  openProduct: (p: Product) => void;
  /** Defaults to the fresh-picks heading; the deal rail passes its own. */
  title?: string;
  sub?: string;
  /** Stamps each tile with its percent off, for the deal rail. */
  showDiscount?: boolean;
}) {
  const { t, lang } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || products.length === 0) return;

    let animId: number;
    let lastTime = performance.now();
    const speed = 36; // speed in pixels per second

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isInteractingRef.current && el) {
        el.scrollLeft += speed * dt;
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 0 && el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame((now) => {
      lastTime = now;
      step(now);
    });

    return () => {
      cancelAnimationFrame(animId);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [products]);

  if (products.length === 0) return null;

  const handleInteractionStart = () => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleInteractionEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 2000);
  };

  const scroll = (direction: "left" | "right") => {
    handleInteractionStart();
    if (scrollRef.current) {
      const amount = direction === "left" ? -360 : 360;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
    handleInteractionEnd();
  };

  return (
    <div className="mb-1.5 mt-[18px]">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 pb-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-display text-[20px] sm:text-[22px] font-extrabold truncate">
            {title ?? t("marquee.title")}
          </span>
          <span className="text-[13px] sm:text-[14px] font-extrabold text-[#9A6BE0] font-display shrink-0">
            · {sub ?? `${t("marquee.sub")} ✨`}
          </span>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="btn-press flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] cursor-pointer"
            aria-label={t("a11y.scrollLeft")}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="btn-press flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] cursor-pointer"
            aria-label={t("a11y.scrollRight")}
          >
            ›
          </button>
        </div>
      </div>
      <div className="marquee-mask overflow-hidden pb-6 pt-3 -my-2">
        <div
          ref={scrollRef}
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchMove={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onTouchCancel={handleInteractionEnd}
          onScroll={handleInteractionStart}
          style={{ touchAction: "pan-x pan-y" }}
          className="no-scrollbar flex w-full overflow-x-auto gap-[18px] px-6 py-2.5 cursor-grab active:cursor-grabbing"
        >
          {[...products, ...products].map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openProduct(p)}
              style={glowStyle(p.tile_color)}
              className="glow-card w-[150px] shrink-0 rounded-card border-3 border-ink p-2.5 text-left shadow-hard-4 transition-all duration-200 hover:-translate-y-1 active:scale-95 cursor-pointer select-none"
              tabIndex={i < products.length ? 0 : -1}
            >
              <div className="relative">
                <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt={p.name_en} photoCount={p.images?.length} />
                {showDiscount && discountPercent(p) > 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-xl border-2 border-ink bg-brand px-1.5 py-[1px] text-[10px] font-extrabold text-white">
                    -{discountPercent(p)}%
                  </span>
                )}
              </div>
              <div className="mt-2 text-[13px] font-bold leading-[1.15]">{nameOf(p, lang)}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-brand">{inr(p.price)}</span>
                <span className="text-[11px] text-[#B4AABF] line-through">{inr(p.mrp)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Fresh Picks Carousel + Side Promo Banners ──────────────────────────── */
export function FreshPicksSection({
  products,
  openProduct,
  addToCart,
  onViewAll,
  onExploreBundles,
}: {
  products: Product[];
  openProduct: (p: Product) => void;
  addToCart: (id: string) => void;
  onViewAll?: () => void;
  onExploreBundles?: () => void;
}) {
  const { t, lang } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      // Each card (165px) + gap (16px) = ~181px. 3 boxes = 540px scroll amount
      const amount = direction === "left" ? -540 : 540;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Only feature in-stock items. Every other product surface (ShopGrid,
  // BabyClub, RecentlyViewed, ProductModal) gates on stock; this carousel used
  // to slice the raw list and let a sold-out item be added to cart with no
  // "sold out" state anywhere on the tile.
  const freshProducts = products.filter((p) => p.stock > 0).slice(0, 10);

  return (
    <div className="mx-auto max-w-[1240px] px-3 sm:px-5 my-5 sm:my-7">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_410px] gap-4 sm:gap-5 items-stretch">

        {/* Left Column: Fresh Picks Carousel */}
        <div className="relative rounded-modal border-[3.5px] border-ink bg-gradient-to-br from-[#FFFDF8] via-[#FFF9F2] to-[#FFE1A8]/30 p-3.5 sm:p-5 shadow-[8px_8px_0px_#2B2140] flex flex-col justify-between overflow-hidden">

          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-[#FFE1A8] text-[16px] shadow-xs">
                ✨
              </span>
              <h2 className="font-display text-[20px] sm:text-[24px] font-extrabold text-ink leading-none">
                Fresh Picks
              </h2>
              <span className="hidden sm:inline-block rounded-pill border-2 border-ink bg-[#B9EBDD] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
                Just Arrived
              </span>
            </div>
            <button
              type="button"
              onClick={onViewAll}
              className="btn-press rounded-pill border-2 border-ink bg-[#FFE1A8] px-3 py-1 font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{t("shop.viewAll")}</span>
              <span className="font-black">→</span>
            </button>
          </div>

          {/* Carousel Slider with Navigation Arrows */}
          <div className="relative group/carousel my-auto">
            {/* Left Nav Arrow Button */}
            <button
              type="button"
              onClick={() => scroll("left")}
              className="btn-press absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 sm:border-2.5 border-ink bg-white text-ink shadow-hard-2 hover:bg-[#FFE1A8] active:scale-95 transition-all cursor-pointer font-extrabold text-[15px]"
              aria-label={t("a11y.prevProducts")}
            >
              ‹
            </button>

            {/* Right Nav Arrow Button */}
            <button
              type="button"
              onClick={() => scroll("right")}
              className="btn-press absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 sm:border-2.5 border-ink bg-white text-ink shadow-hard-2 hover:bg-[#FFE1A8] active:scale-95 transition-all cursor-pointer font-extrabold text-[15px]"
              aria-label={t("a11y.nextProducts")}
            >
              ›
            </button>

            {/* Products Scroll Container */}
            <div
              ref={scrollRef}
              className="no-scrollbar flex w-full overflow-x-auto gap-3 sm:gap-4 px-2 sm:px-3 py-2.5 scroll-smooth"
            >
              {freshProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openProduct(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openProduct(p);
                    }
                  }}
                  style={glowStyle(p.tile_color)}
                  className="glow-card w-[145px] sm:w-[165px] shrink-0 rounded-card border-2.5 sm:border-3 border-ink p-2.5 sm:p-3 text-left shadow-[5px_5px_0px_#2B2140] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1.5 active:scale-95 cursor-pointer relative group"
                >
                  <div className="w-full text-left">
                    <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt={p.name_en} photoCount={p.images?.length} />
                    <div className="mt-2 text-[12px] sm:text-[13px] font-bold leading-[1.2] text-ink line-clamp-2 h-[32px] sm:h-[34px]">
                      {nameOf(p, lang)}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-display font-extrabold text-[15px] sm:text-[16px] text-ink">
                        {inr(p.price)}
                      </span>
                      {p.mrp > p.price && (
                        <span className="text-[11px] text-[#B4AABF] line-through">
                          {inr(p.mrp)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bouncy 3D Add to Cart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(p.id);
                    }}
                    className="btn-press mt-2.5 w-full flex items-center justify-center gap-1 rounded-pill border-2 border-ink bg-brand text-white py-1 sm:py-1.5 font-display text-[11px] sm:text-[12px] font-extrabold shadow-hard-2 hover:bg-[#A62B59] cursor-pointer"
                  >
                    <span>+</span>
                    <span>{t("shop.addToCart")}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stacked Side Promo Boxes */}
        <div className="flex flex-col gap-3.5 sm:gap-4 justify-between">

          {/* Top Promo Card: Super Saver */}
          <div className="relative rounded-modal border-[3.5px] border-ink bg-gradient-to-br from-[#FFE27A] via-[#FFF0B3] to-[#FFCBD9] p-4 sm:p-5 shadow-[6px_6px_0px_#2B2140] overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[175px] group">

            {/* Background Decorative Glow */}
            <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-[#FFCBD9]/60 blur-xl pointer-events-none" />

            <div className="relative z-10 max-w-[65%]">
              <span className="inline-block rounded-pill border-2 border-ink bg-white px-2.5 py-0.5 font-display text-[10px] sm:text-[11px] font-extrabold text-ink shadow-hard-1 mb-1.5 uppercase tracking-wide">
                ⚡ Super Saver
              </span>
              <h3 className="font-display text-[20px] sm:text-[24px] font-extrabold text-ink leading-[1.1]">
                UP TO 40% OFF
              </h3>
              <p className="font-sans text-[12px] sm:text-[13px] font-bold text-ink/80 mb-3 mt-0.5">
                on Baby Essentials
              </p>
              <button
                type="button"
                onClick={onViewAll}
                className="btn-press inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#FF5A78] text-white px-3.5 py-1.5 font-display text-[12px] sm:text-[13px] font-extrabold shadow-hard-2 hover:scale-105 transition-all cursor-pointer"
              >
                <span>{t("shop.shopNow")}</span>
                <span>→</span>
              </button>
            </div>

            {/* Cute Plush Bunny Illustration Graphic */}
            <div className="absolute right-2 bottom-1 sm:right-3 sm:bottom-2 z-10 pointer-events-none flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-[#FF6B8B] border-2.5 border-ink flex items-center justify-center shadow-hard-2 rotate-12">
                  <span className="text-[44px] sm:text-[52px] -rotate-12 transition-transform duration-300 group-hover:scale-110">
                    🐰
                  </span>
                </div>
                <span className="absolute -top-2 -right-1 text-[18px] animate-bounce">✨</span>
              </div>
            </div>
          </div>

          {/* Bottom Promo Card: Bundle & Save More! */}
          <div className="relative rounded-modal border-[3.5px] border-ink bg-gradient-to-br from-[#C7E9FF] via-[#E4D6FF] to-[#FFCBD9] p-4 sm:p-5 shadow-[6px_6px_0px_#2B2140] overflow-hidden flex flex-col justify-between min-h-[155px] sm:min-h-[165px] group">

            <div className="relative z-10 max-w-[65%]">
              <span className="inline-block rounded-pill border-2 border-ink bg-white px-2.5 py-0.5 font-display text-[10px] sm:text-[11px] font-extrabold text-ink shadow-hard-1 mb-1.5 uppercase tracking-wide">
                🎁 Save More
              </span>
              <h3 className="font-display text-[19px] sm:text-[22px] font-extrabold text-ink leading-[1.1]">
                Bundle & Save More!
              </h3>
              <p className="font-sans text-[12px] sm:text-[13px] font-bold text-ink/80 mb-3 mt-1">
                Best combos for your little ones
              </p>
              <button
                type="button"
                onClick={onExploreBundles}
                className="btn-press inline-flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#FF5A78] text-white px-3.5 py-1.5 font-display text-[12px] sm:text-[13px] font-extrabold shadow-hard-2 hover:scale-105 transition-all cursor-pointer"
              >
                <span>{t("shop.exploreBundles")}</span>
                <span>→</span>
              </button>
            </div>

            {/* Basket Illustration Graphic */}
            <div className="absolute right-2 bottom-1 sm:right-3 sm:bottom-2 z-10 pointer-events-none flex items-center gap-1">
              <div className="relative flex items-center justify-center">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-[#FFE1A8] border-2.5 border-ink flex items-center justify-center shadow-hard-2 -rotate-6">
                  <span className="text-[40px] sm:text-[48px] rotate-6 transition-transform duration-300 group-hover:scale-110">
                    🧺
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}


/* ── Shop by category tiles ──────────────────────────────────────────────── */
export function CategoryGrid({
  category,
  setCategory,
  settings,
}: {
  category: string;
  setCategory: (c: string) => void;
  settings?: StoreSettings;
}) {
  const { t, lang } = useT();
  const scrollShop = () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  // Admin-added custom categories were saveable but never reachable by
  // customers: this grid only ever rendered the 8 built-ins. Merge them in so
  // a category an owner adds actually shows up (and c/[category] recognizes it
  // — see isKnownCategory() there).
  const { slugs: allCategorySlugs, meta: allCategoryMeta } = getAllCategories(settings?.custom_categories);
  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-2 pt-3.5">
      <div className="mb-3.5 flex items-center gap-2">
        <span className="font-display text-[24px] font-extrabold">{t("category.title")}</span>
        <span className="text-[22px]">🎨</span>
        {category !== "all" && (
          <Pill bg="#FFCBD9" onClick={() => setCategory("all")} className="ml-auto">
            {t("category.clear")} ✕
          </Pill>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 md:grid-cols-4">
        {allCategorySlugs.map((c) => {
          const meta = allCategoryMeta[c];
          if (!meta) return null;
          const on = category === c;
          const customImg = settings?.box_media?.[`cat-${c}`];

          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(on ? "all" : c);
                scrollShop();
              }}
              style={{ background: meta.bg, ...glowStyle(meta.bg) }}
              className={`pop glow-tile flex flex-col items-center gap-[5px] sm:gap-[7px] rounded-tile-lg border-2.5 sm:border-3 border-ink px-1.5 sm:px-2.5 py-2.5 sm:py-4 shadow-hard-3 sm:shadow-hard-5 cursor-pointer ${on ? "tile-pressed" : ""
                }`}
            >
              <div className="flex h-[42px] w-[42px] sm:h-[54px] sm:w-[54px] items-center justify-center rounded-full border-2.5 sm:border-3 border-ink bg-white text-[20px] sm:text-[27px] overflow-hidden">
                {customImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={customImg} alt={meta.en} className="w-full h-full object-cover" />
                ) : (
                  meta.emoji
                )}
              </div>
              <span className="text-center font-display text-[12px] sm:text-[14px] font-extrabold leading-[1.1]">
                {lang === "ta" ? meta.ta : meta.en}
              </span>
              <span className="hidden sm:inline text-[11px] font-bold" style={{ color: meta.pop }}>
                {on ? t("category.selected") : t("category.browse")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Buy again (signed-in repeat purchases) ──────────────────────────────── */
export function BuyAgain({
  products,
  addToCart,
  openProduct,
}: {
  products: Product[];
  addToCart: (id: string) => void;
  openProduct?: (p: Product) => void;
}) {
  const { t, lang } = useT();
  if (products.length === 0) return null;
  return (
    <div className="mx-auto max-w-[1080px] px-5 pt-[18px]">
      <h2 className="mb-3 font-display text-[22px] font-extrabold">🔁 {t("buyAgain.title")}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((p) => (
          <Card
            key={p.id}
            className={`pop glow-card w-40 shrink-0 p-2.5 ${openProduct ? "cursor-pointer group hover:border-brand" : ""}`}
            style={glowStyle(p.tile_color)}
            onClick={() => openProduct?.(p)}
          >
            <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt={p.name_en} photoCount={p.images?.length} />
            <div className="mt-2 text-[12px] font-bold leading-[1.2] group-hover:text-brand transition-colors">{nameOf(p, lang)}</div>
            <div className="mt-1 font-display font-extrabold text-brand">{inr(p.price)}</div>
            <div className="mt-2" onClick={(e) => openProduct && e.stopPropagation()}>
              <Btn small full onClick={() => addToCart(p.id)}>
                {t("buyAgain.add")}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Curated bundles ─────────────────────────────────────────────────────── */
export function BundlesSection({
  bundles,
  addToCart,
}: {
  bundles: Bundle[];
  addToCart: (b: Bundle) => void;
}) {
  const { t, lang } = useT();
  if (bundles.length === 0) return null;
  return (
    <div id="bundles" className="mx-auto max-w-[1080px] px-5 pt-[22px]">
      <h2 className="mb-0.5 font-display text-[24px] font-extrabold">{t("bundles.title")} 🎁</h2>
      <p className="mb-3.5 text-[14px] text-mute">{t("bundles.sub")}</p>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
        {bundles.map((b) => (
          <Card key={b.id} className="pop glow-card flex flex-col p-3" style={glowStyle(b.tile_color)}>
            <Art emoji={b.emoji} bg={b.tile_color} h={100} isBundle />
            <div className="mt-2.5 font-display font-extrabold">
              {lang === "ta" ? b.name_ta : b.name_en}
            </div>
            <div className="mt-0.5 flex-1 text-[12px] text-mute">{b.items_en.join(" + ")}</div>
            <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
              <span className="font-display font-extrabold text-brand">{inr(b.bundle_price)}</span>
              <span className="text-[12px] text-[#B4AABF] line-through">{inr(b.mrp)}</span>
              <Badge bg="#D6E8B0">
                {t("bundles.save")} {inr(b.mrp - b.bundle_price)}
              </Badge>
            </div>
            <div className="mt-2.5">
              <Btn small full onClick={() => addToCart(b)}>
                {t("bundles.add")}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Shop grid: stacked filters, chips, search, empty state ──────────────── */
export function ShopGrid({
  filtered,
  milestone,
  setMilestone,
  category,
  setCategory,
  query,
  setQuery,
  brand,
  setBrand,
  brands,
  maxPrice,
  setMaxPrice,
  inStockOnly,
  setInStockOnly,
  sortBy = "default",
  setSortBy,
  addToCart,
  openProduct,
}: {
  filtered: Product[];
  milestone: string;
  setMilestone: (m: string) => void;
  category: string;
  setCategory: (c: string) => void;
  query: string;
  setQuery: (q: string) => void;
  brand: string;
  setBrand: (b: string) => void;
  brands: Brand[];
  maxPrice?: number | null;
  setMaxPrice?: (p: number | null) => void;
  inStockOnly?: boolean;
  setInStockOnly?: (v: boolean) => void;
  sortBy?: "default" | "price_asc" | "price_desc" | "newest";
  setSortBy?: (s: "default" | "price_asc" | "price_desc" | "newest") => void;
  addToCart: (id: string) => void;
  openProduct: (p: Product) => void;
}) {
  const { t, lang } = useT();
  const catMeta = category !== "all" ? CATEGORY_META[category as Category] : null;

  // "Load more" pagination: rendering every matching product at once doesn't
  // scale past a couple hundred SKUs. Resets to the first page whenever a
  // filter or sort changes, so switching category never leaves you scrolled
  // past a smaller result set.
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [milestone, category, query, brand, maxPrice, inStockOnly, sortBy]);
  const visible = filtered.slice(0, visibleCount);
  return (
    <div id="shop" className="mx-auto max-w-[1080px] px-5 pb-2 pt-6">
      <h2 className="mb-1 font-display text-[24px] font-extrabold">
        {catMeta ? (lang === "ta" ? catMeta.ta : catMeta.en) : t("shop.byAge")}
      </h2>

      {(category !== "all" || milestone !== "all" || brand !== "all" || maxPrice !== null || inStockOnly) && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-mute">{t("shop.filtering")}</span>
          {brand !== "all" && (
            <Pill bg="#C7E9FF" onClick={() => setBrand("all")}>
              {brand} ✕
            </Pill>
          )}
          {milestone !== "all" && (
            <Pill bg="#FFE1A8" onClick={() => setMilestone("all")}>
              {MILESTONE_META[milestone as Milestone].emoji}{" "}
              {lang === "ta"
                ? MILESTONE_META[milestone as Milestone].shortTa
                : MILESTONE_META[milestone as Milestone].shortEn}{" "}
              ✕
            </Pill>
          )}
          {catMeta && (
            <Pill bg="#B9EBDD" onClick={() => setCategory("all")}>
              {catMeta.emoji} {lang === "ta" ? catMeta.ta : catMeta.en} ✕
            </Pill>
          )}
          {maxPrice !== null && maxPrice !== undefined && setMaxPrice && (
            <Pill bg="#FFCBD9" onClick={() => setMaxPrice(null)}>
              Under {inr(maxPrice)} ✕
            </Pill>
          )}
          {inStockOnly && setInStockOnly && (
            <Pill bg="#D6E8B0" onClick={() => setInStockOnly(false)}>
              In-Stock Only 🟢 ✕
            </Pill>
          )}
        </div>
      )}

      {brands.length > 0 && (
        <div className="no-scrollbar mb-1 flex gap-2 overflow-x-auto pb-2">
          <Pill active={brand === "all"} onClick={() => setBrand("all")}>
            {t("shop.allBrands")}
          </Pill>
          {brands.map((b) => (
            <Pill key={b.id} active={brand === b.name} bg="#C7E9FF" onClick={() => setBrand(b.name)}>
              {b.name}
            </Pill>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <Pill active={milestone === "all"} onClick={() => setMilestone("all")}>
          {t("shop.allAges")}
        </Pill>
        {MILESTONES.map((m) => {
          const meta = MILESTONE_META[m];
          return (
            <Pill
              key={m}
              active={milestone === m}
              bg={meta.bg}
              onClick={() => setMilestone(m)}
            >
              {meta.emoji} {lang === "ta" ? meta.shortTa : meta.shortEn}
            </Pill>
          );
        })}

        {/* Sort */}
        {setSortBy && (
          <label className="ml-auto flex items-center gap-1.5 pt-1 sm:pt-0 sm:ml-2">
            <span className="text-[12px] font-bold text-mute uppercase">{t("shop.sortLabel")}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-pill border border-ink bg-white px-2 py-0.5 text-[11px] font-bold text-ink outline-none focus:border-brand"
            >
              <option value="default">{t("shop.sortDefault")}</option>
              <option value="price_asc">{t("shop.sortPriceAsc")}</option>
              <option value="price_desc">{t("shop.sortPriceDesc")}</option>
              <option value="newest">{t("shop.sortNewest")}</option>
            </select>
          </label>
        )}

        {/* Faceted Price Range & In-Stock Filters */}
        {setMaxPrice && (
          <div className={`flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0 ${setSortBy ? "" : "ml-auto"}`}>
            <span className="text-[12px] font-bold text-mute uppercase">Price:</span>
            <button
              type="button"
              onClick={() => setMaxPrice(null)}
              className={`rounded-pill border border-ink px-2 py-0.5 text-[11px] font-bold ${maxPrice === null ? "bg-ink text-white" : "bg-white text-ink"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setMaxPrice(500)}
              className={`rounded-pill border border-ink px-2 py-0.5 text-[11px] font-bold ${maxPrice === 500 ? "bg-ink text-white" : "bg-white text-ink"}`}
            >
              &lt; ₹500
            </button>
            <button
              type="button"
              onClick={() => setMaxPrice(1000)}
              className={`rounded-pill border border-ink px-2 py-0.5 text-[11px] font-bold ${maxPrice === 1000 ? "bg-ink text-white" : "bg-white text-ink"}`}
            >
              &lt; ₹1000
            </button>
            {setInStockOnly && (
              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`rounded-pill border border-ink px-2.5 py-0.5 text-[11px] font-bold ${inStockOnly ? "bg-[#D6E8B0] text-ink border-2" : "bg-white text-mute"}`}
              >
                In-Stock 🟢
              </button>
            )}
          </div>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("shop.search")}
        className="mt-2.5 w-full max-w-[340px] rounded-pill border-2.5 border-ink bg-paper px-[18px] py-2.5 font-body text-[15px] outline-none focus:border-brand"
      />

      <div className="mt-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {visible.map((p, idx) => (
          <div
            key={p.id}
            style={glowStyle(p.tile_color)}
            className="pop glow-card relative flex flex-col rounded-card border-3 border-ink p-2.5 shadow-hard-4 hover:border-brand transition-colors cursor-pointer group"
            onClick={() => openProduct(p)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProduct(p);
              }
            }}
          >
            <div className="flex flex-1 flex-col">
              <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt={p.name_en} priority={idx < 4} photoCount={p.images?.length} />
              <div className="mt-2 flex-1">
                <div className="text-[13px] font-bold leading-[1.2] group-hover:text-brand transition-colors">{nameOf(p, lang)}</div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-brand">{inr(p.price)}</span>
                  {p.mrp > p.price && (
                    <span className="text-[11px] text-[#B4AABF] line-through">{inr(p.mrp)}</span>
                  )}
                </div>
                {p.stock <= p.low_stock_threshold && p.stock > 0 && (
                  <div className="mt-[3px] text-[11px] font-extrabold text-[#F59E0B]">
                    {t("shop.onlyLeft", { count: p.stock })}
                  </div>
                )}
                {p.stock === 0 && (
                  <div className="mt-[3px] text-[11px] font-extrabold text-[#E24B4A]">
                    {t("shop.soldOut")}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Btn small full disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
                {t("shop.addToCart")}
              </Btn>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-2 rounded-card border-3 border-ink bg-[#F2EAE0] p-10 text-center shadow-hard-4">
          <div className="text-[30px]">🔍</div>
          <p className="mt-1.5 font-display font-extrabold">{t("shop.empty")}</p>
          <button
            className="mt-2 font-bold text-mute underline"
            onClick={() => {
              setMilestone("all");
              setCategory("all");
              setQuery("");
            }}
          >
            {t("shop.clearAll")}
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <span className="text-[12px] font-bold text-mute">
            {t("shop.showingCount", { shown: visible.length, total: filtered.length })}
          </span>
          {visibleCount < filtered.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="btn-press rounded-pill border-2.5 border-ink bg-white px-5 py-2 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] cursor-pointer"
            >
              {t("shop.loadMore")} ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Trust panel ─────────────────────────────────────────────────────────── */
export function Trust({ rating, reviewCount }: { rating?: number; reviewCount?: number }) {
  const { t } = useT();
  const displayRating = rating ?? BUSINESS.rating;
  const displayReviewCount = reviewCount ?? BUSINESS.reviewCount;
  return (
    <div className="mx-auto mb-10 mt-4 max-w-[1080px] px-5">
      <div className="grid items-center gap-5 rounded-card border-3 border-ink bg-[#FFE1A8] p-6 shadow-hard-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-3 bg-white px-4 py-2.5 rounded-card border-3 border-ink shadow-hard-3 w-fit">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border-2.5 border-ink bg-white p-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Rasi Logo" className="h-full w-full object-contain" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-text-logo.png" alt="Rasi Mom and Baby" className="h-[30px] w-auto object-contain" />
          </div>
          <h2 className="font-display text-[24px] font-extrabold">{t("trust.title")} 💛</h2>
          <p className="mb-3 mt-2 text-[14px] leading-[1.5] text-[#7A5A1E]">{t("trust.sub")}</p>
          <a
            href={BUSINESS.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press inline-flex items-center gap-1 text-[13px] font-bold text-ink underline hover:text-brand transition-colors cursor-pointer"
            title="Open location in Google Maps"
          >
            📍 {BUSINESS.addressShort} ↗
          </a>
          <div className="mt-[3px] text-[13px] font-bold">
            🕘 {t("trust.hours")} · 💬 WhatsApp
          </div>
        </div>
        <div className="grid gap-2.5">
          <Card className="p-4">
            <div className="font-display text-[30px] font-extrabold text-brand">
              {displayRating}{" "}
              <span className="text-[16px] text-[#F59E0B]">★★★★★</span>
            </div>
            <div className="text-[13px] text-mute">
              {displayReviewCount.toLocaleString("en-IN")}+ {t("trust.reviews")}
            </div>
          </Card>
          <Card className="p-3.5">
            <Stars n={5} /> <span className="font-display font-extrabold">Karthiga</span>
            <p className="mt-1 text-[13px] text-mute">{t("trust.quote")}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
