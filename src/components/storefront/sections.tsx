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
  inr,
  type Category,
  type Milestone,
} from "@/lib/constants";
import { Art, Badge, Btn, Card, Pill, Stars } from "@/components/ui";

const nameOf = (p: Product, lang: string) => (lang === "ta" ? p.name_ta : p.name_en);

/* ── Hero — sticker cluster + blobs (the only blur in the system) ────────── */
export function Hero() {
  const { t } = useT();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const stickers = [
    { e: "🧸", c: "#FFCBD9", x: 40, y: 6, r: -6, s: 118 },
    { e: "🍼", c: "#FFE1A8", x: 186, y: 34, r: 8, s: 92 },
    { e: "🫧", c: "#C7E9FF", x: 18, y: 146, r: 5, s: 98 },
    { e: "🌸", c: "#FBD0EA", x: 168, y: 158, r: -8, s: 108 },
  ];
  return (
    <div className="relative mx-auto max-w-[1080px] px-5 pb-2 pt-[26px]">
      <div className="blob absolute -top-5 right-2.5 h-[220px] w-[220px] rounded-full bg-[#FFCBD9]" />
      <div className="blob absolute -left-8 bottom-0 h-[140px] w-[140px] rounded-full bg-[#C7E9FF]" />
      <div className="relative z-[1] grid items-center gap-[26px] md:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-block rounded-[30px] border-3 border-ink bg-paper px-4 py-[7px] font-display text-[14px] font-extrabold shadow-hard-3">
            ⭐ {BUSINESS.rating} · {BUSINESS.reviewCount.toLocaleString("en-IN")}+ {t("hero.badge")}
          </span>
          <h1 className="my-2.5 mt-4 font-display text-[34px] font-extrabold leading-[1.06] md:text-[44px]">
            {t("hero.headline1")}
            <br />
            <span className="text-brand">{t("hero.headline2")}</span> 🎈
          </h1>
          <p className="mb-5 max-w-[420px] text-[16px] text-mute">{t("hero.sub")}</p>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={() => scrollTo("shop")}>{t("hero.ctaShop")} →</Btn>
            <Btn bg="#FFE1A8" color="#2B2140" onClick={() => scrollTo("bundles")}>
              {t("hero.ctaBundles")}
            </Btn>
          </div>
        </div>
        <div className="relative hidden h-[290px] md:block" aria-hidden>
          {stickers.map((b, i) => (
            <div
              key={i}
              className="pop absolute flex items-center justify-center rounded-modal border-3 border-ink shadow-hard-4"
              style={{
                left: b.x,
                top: b.y,
                width: b.s,
                height: b.s,
                background: b.c,
                fontSize: b.s * 0.42,
                transform: `rotate(${b.r}deg)`,
              }}
            >
              {b.e}
            </div>
          ))}
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
    }, 2500);
  };

  return (
    <div className="mb-1.5 mt-[18px]">
      <div className="mx-auto flex max-w-[1080px] items-baseline gap-2 px-5 pb-2">
        <span className="font-display text-[22px] font-extrabold">{t("marquee.title")}</span>
        <span className="text-[14px] font-extrabold text-[#9A6BE0] font-display">
          · {t("marquee.sub")} ✨
        </span>
      </div>
      <div className="marquee-mask overflow-hidden pb-3 pt-1.5">
        <div
          ref={scrollRef}
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onTouchCancel={handleInteractionEnd}
          onScroll={handleInteractionStart}
          className="no-scrollbar flex w-full overflow-x-auto gap-[18px] px-5 touch-pan-x cursor-grab active:cursor-grabbing"
        >
          {[...products, ...products].map((p, i) => (
            <button
              key={i}
              onClick={() => openProduct(p)}
              className="pop w-[150px] shrink-0 rounded-card border-3 border-ink bg-paper p-2.5 text-left shadow-hard-4"
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
              style={{ background: meta.bg }}
              className={`pop flex flex-col items-center gap-[7px] rounded-tile-lg border-3 border-ink px-2.5 py-4 shadow-hard-5 ${
                on ? "tile-pressed" : ""
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
          <Card key={p.id} className="w-40 shrink-0 p-2.5">
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
          <Card key={b.id} className="flex flex-col p-3">
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
          <div key={p.id} className="pop flex flex-col rounded-card border-3 border-ink bg-paper p-2.5 shadow-hard-4">
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
