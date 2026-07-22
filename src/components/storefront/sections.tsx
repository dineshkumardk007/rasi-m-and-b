"use client";

import { useEffect, useRef } from "react";
import type { Bundle, Product } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import {
  BUSINESS,
  CATEGORIES,
  CATEGORY_META,
  MILESTONES,
  MILESTONE_META,
  glowStyle,
  inr,
  type Category,
  type Milestone,
} from "@/lib/constants";
import { Art, Badge, Btn, Card, Pill, Stars } from "@/components/ui";

const nameOf = (p: Product, lang: string) => (lang === "ta" ? p.name_ta : p.name_en);

/* ── Hero — upgraded wallpaper background + flagship store graphic ────────── */
export function Hero() {
  const { t } = useT();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="relative mx-auto max-w-[1240px] px-4 sm:px-5 pb-2 pt-4 sm:pt-6">
      {/* Background wallpaper ambient gradient & pattern */}
      <div className="blob absolute -top-5 right-2.5 h-[240px] w-[240px] rounded-full bg-[#FFCBD9] opacity-70 blur-2xl pointer-events-none" />
      <div className="blob absolute -left-8 bottom-0 h-[180px] w-[180px] rounded-full bg-[#C7E9FF] opacity-70 blur-2xl pointer-events-none" />

      <div className="relative z-[1] rounded-modal border-3 border-ink bg-gradient-to-br from-[#FFFDF8] via-[#FFF8EF] to-[#FFCBD9]/25 p-4 sm:p-6 md:p-7 shadow-hard-6 backdrop-blur-sm overflow-hidden">
        {/* Subtle wallpaper dot texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#2B2140 1.5px, transparent 1.5px)`,
            backgroundSize: `18px 18px`
          }}
        />

        <div className="relative z-10 grid gap-5 md:gap-6 items-center md:grid-cols-[0.82fr_1.18fr]">
          <div>
            <div className="mb-2.5 flex items-center gap-3 flex-wrap">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile border-3 border-ink bg-white p-1 shadow-hard-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Rasi Mom & Baby" className="h-full w-full object-contain" />
              </div>
              <div className="relative group inline-block">
                {/* Unstructured 3D shadow accent layer */}
                <div className="absolute inset-0 rounded-[22px_8px_24px_12px] border-2.5 border-ink bg-[#FFCBD9] translate-x-1.5 translate-y-1.5 transition-transform duration-200 group-hover:translate-x-2 group-hover:translate-y-2" />
                
                {/* Main unstructured highlight badge */}
                <span className="relative z-10 inline-flex items-center gap-1.5 rounded-[22px_8px_24px_12px] border-3 border-ink bg-[#FFE66D] px-3.5 py-1.5 font-display text-[13px] sm:text-[14px] font-extrabold text-ink -rotate-1.5 shadow-hard-2 hover:rotate-0 hover:scale-105 transition-all duration-200 cursor-pointer">
                  <span className="text-[14px] animate-pulse">⭐</span>
                  <span>{BUSINESS.rating} · {BUSINESS.reviewCount.toLocaleString("en-IN")}+ {t("hero.badge")}</span>
                </span>
              </div>
            </div>

            <h1 className="my-2.5 font-display text-[28px] font-extrabold leading-[1.08] sm:text-[34px] md:text-[38px] text-ink">
              {t("hero.headline1")}
              <br />
              <span className="text-brand">{t("hero.headline2")}</span> 🎈
            </h1>

            <p className="mb-4 max-w-[440px] text-[14px] sm:text-[15px] text-mute leading-relaxed font-medium">
              {t("hero.sub")}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Btn onClick={() => scrollTo("shop")}>{t("hero.ctaShop")} →</Btn>
              <Btn bg="#FFE1A8" color="#2B2140" onClick={() => scrollTo("bundles")}>
                {t("hero.ctaBundles")}
              </Btn>
            </div>

            {/* Neo-Brutalist Soft Pastel Trust Badges - Guaranteed Single Line */}
            <div className="mt-5 flex flex-nowrap items-center gap-2 pt-3.5 border-t-2 border-ink/10 overflow-x-auto no-scrollbar">
              <div className="btn-press shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#FFE1A8] text-ink px-2.5 py-1.5 rounded-pill border-2.5 border-ink shadow-hard-2 hover:-translate-y-0.5 hover:shadow-hard-3 transition-all duration-200 cursor-pointer font-display text-[12px] sm:text-[13px] font-extrabold">
                <span>⚡</span> Express Delivery
              </div>
              <div className="btn-press shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#C7E9FF] text-ink px-2.5 py-1.5 rounded-pill border-2.5 border-ink shadow-hard-2 hover:-translate-y-0.5 hover:shadow-hard-3 transition-all duration-200 cursor-pointer font-display text-[12px] sm:text-[13px] font-extrabold">
                <span>🛡️</span> 100% Baby-Safe
              </div>
              <div className="btn-press shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#FFCBD9] text-ink px-2.5 py-1.5 rounded-pill border-2.5 border-ink shadow-hard-2 hover:-translate-y-0.5 hover:shadow-hard-3 transition-all duration-200 cursor-pointer font-display text-[12px] sm:text-[13px] font-extrabold">
                <span>💳</span> COD / UPI
              </div>
            </div>
          </div>

          {/* Large Featured Store Image Card - Expanded to fill middle gap */}
          <div className="relative group w-full">
            {/* 3D background accent layer */}
            <div className="absolute inset-0 rounded-card border-3 border-ink bg-[#FFE1A8] translate-x-2.5 translate-y-2.5 transition-transform duration-300 group-hover:translate-x-3.5 group-hover:translate-y-3.5" />

            <div className="relative rounded-card border-3 border-ink bg-[#FE91E8] p-4 sm:p-5 shadow-hard-6 transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[10px_10px_0px_#2B2140]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-store.jpg"
                alt="Rasi Mom & Baby Store Front"
                className="w-full h-auto rounded-[14px] object-cover border-2.5 border-ink transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="mt-3.5 px-1 pb-0.5 flex items-center justify-between flex-wrap gap-2">
                <div className="btn-press flex items-center gap-2 rounded-pill border-2.5 border-ink bg-white/95 px-3 py-1 font-display text-[13px] sm:text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] transition-all duration-200 cursor-pointer">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 border border-ink" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Visit Our Store in Thoothukudi</span>
                  </span>
                </div>
                <div className="relative group/badge inline-block">
                  {/* Colorful Glowing Ambient Pulse Halo */}
                  <div className="absolute -inset-1 rounded-pill bg-gradient-to-r from-[#FF85C0] via-[#FFE1A8] to-[#9A6BE0] opacity-85 blur-[7px] animate-pulse pointer-events-none group-hover/badge:opacity-100 group-hover/badge:blur-9 transition-all" />

                  {/* Main Flagship Store Badge */}
                  <span className="relative z-10 btn-press flex items-center gap-1 rounded-pill border-2.5 border-ink bg-gradient-to-r from-[#FFE1A8] via-[#FFF0B3] to-[#FFCBD9] px-3 py-1 text-[11px] font-extrabold tracking-wider text-ink shadow-hard-2 cursor-pointer transition-transform duration-200 hover:scale-105">
                    <span className="text-[12px]">✨</span>
                    <span>FLAGSHIP STORE</span>
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

/* ── Auto-scrolling & touch-swipeable "Fresh picks" marquee ──────────────── */
export function Marquee({
  products,
  openProduct,
}: {
  products: Product[];
  openProduct: (p: Product) => void;
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

  return (
    <div className="mb-1.5 mt-[18px]">
      <div className="mx-auto flex max-w-[1240px] items-baseline gap-2 px-5 pb-2">
        <span className="font-display text-[22px] font-extrabold">{t("marquee.title")}</span>
        <span className="text-[14px] font-extrabold text-[#9A6BE0] font-display">
          · {t("marquee.sub")} ✨
        </span>
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
              className="glow-card w-[150px] shrink-0 rounded-card border-3 border-ink bg-paper p-2.5 text-left shadow-hard-4 transition-all duration-200 hover:-translate-y-1 active:scale-95 cursor-pointer select-none"
              tabIndex={i < products.length ? 0 : -1}
            >
              <Art emoji={p.emoji} bg={p.tile_color} h={90} image={p.images[0]} alt={p.name_en} />
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

/* ── Shop by category tiles ──────────────────────────────────────────────── */
export function CategoryGrid({
  category,
  setCategory,
}: {
  category: string;
  setCategory: (c: string) => void;
}) {
  const { t, lang } = useT();
  const scrollShop = () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
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
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const on = category === c;
          return (
            <button
              key={c}
              onClick={() => {
                setCategory(on ? "all" : c);
                scrollShop();
              }}
              style={{ background: meta.bg, ...glowStyle(meta.bg) }}
              className={`pop glow-tile flex flex-col items-center gap-[7px] rounded-tile-lg border-3 border-ink px-2.5 py-4 shadow-hard-5 ${on ? "tile-pressed" : ""
                }`}
            >
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-3 border-ink bg-white text-[27px]">
                {meta.emoji}
              </div>
              <span className="text-center font-display text-[14px] font-extrabold leading-[1.1]">
                {lang === "ta" ? meta.ta : meta.en}
              </span>
              <span className="text-[11px] font-bold" style={{ color: meta.pop }}>
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
}: {
  products: Product[];
  addToCart: (id: string) => void;
}) {
  const { t, lang } = useT();
  if (products.length === 0) return null;
  return (
    <div className="mx-auto max-w-[1080px] px-5 pt-[18px]">
      <h2 className="mb-3 font-display text-[22px] font-extrabold">🔁 {t("buyAgain.title")}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((p) => (
          <Card key={p.id} className="pop glow-card w-40 shrink-0 p-2.5" style={glowStyle(p.tile_color)}>
            <Art emoji={p.emoji} bg={p.tile_color} h={90} image={p.images[0]} alt={p.name_en} />
            <div className="mt-2 text-[12px] font-bold leading-[1.2]">{nameOf(p, lang)}</div>
            <div className="mt-1 font-display font-extrabold text-brand">{inr(p.price)}</div>
            <div className="mt-2">
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
  addToCart: (id: string) => void;
  openProduct: (p: Product) => void;
}) {
  const { t, lang } = useT();
  const catMeta = category !== "all" ? CATEGORY_META[category as Category] : null;
  return (
    <div id="shop" className="mx-auto max-w-[1080px] px-5 pb-2 pt-6">
      <h2 className="mb-1 font-display text-[24px] font-extrabold">
        {catMeta ? (lang === "ta" ? catMeta.ta : catMeta.en) : t("shop.byAge")}
      </h2>

      {(category !== "all" || milestone !== "all") && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-mute">{t("shop.filtering")}</span>
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
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
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
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("shop.search")}
        className="mt-2.5 w-full max-w-[340px] rounded-pill border-2.5 border-ink bg-paper px-[18px] py-2.5 font-body text-[15px] outline-none"
      />

      <div className="mt-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            style={glowStyle(p.tile_color)}
            className="pop glow-card flex flex-col rounded-card border-3 border-ink bg-paper p-2.5 shadow-hard-4"
          >
            <button onClick={() => openProduct(p)} aria-label={nameOf(p, lang)}>
              <Art emoji={p.emoji} bg={p.tile_color} h={130} image={p.images[0]} alt={p.name_en} />
            </button>
            <div className="mt-2 flex-1">
              <div className="text-[13px] font-bold leading-[1.2]">{nameOf(p, lang)}</div>
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
            <div className="mt-2">
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
    </div>
  );
}

/* ── Trust panel ─────────────────────────────────────────────────────────── */
export function Trust() {
  const { t } = useT();
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
          <div className="text-[13px] font-bold">📍 {BUSINESS.addressShort}</div>
          <div className="mt-[3px] text-[13px] font-bold">
            🕘 {t("trust.hours")} · 💬 WhatsApp
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUSINESS.staff.map((n) => (
              <span
                key={n}
                className="rounded-pill border-2.5 border-ink bg-white px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
              >
                👩 {n}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-2.5">
          <Card className="p-4">
            <div className="font-display text-[30px] font-extrabold text-brand">
              {BUSINESS.rating}{" "}
              <span className="text-[16px] text-[#F59E0B]">★★★★★</span>
            </div>
            <div className="text-[13px] text-mute">
              {BUSINESS.reviewCount.toLocaleString("en-IN")}+ {t("trust.reviews")}
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
