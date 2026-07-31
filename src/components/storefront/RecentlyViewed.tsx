"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { glowStyle, inr } from "@/lib/constants";
import { Art, Btn, Card } from "@/components/ui";
import { VIEW_EVENT, clearViews, readIds } from "@/lib/store/recently-viewed";

/**
 * "Recently viewed" strip.
 *
 * Parents comparison-shop across several visits before buying — this puts the
 * shortlist back in front of them instead of making them search again.
 *
 * Ids come from localStorage, so the list is read after mount rather than
 * during render: reading storage while rendering would make the server and
 * client markup disagree and trip a hydration error.
 */
export function RecentlyViewed({
  products,
  addToCart,
  openProduct,
  /** Hidden on a product's own page so it never lists the item being viewed. */
  excludeId,
}: {
  products: Product[];
  addToCart: (id: string) => void;
  openProduct?: (p: Product) => void;
  excludeId?: string;
}) {
  const { t, lang } = useT();
  const [ids, setIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setIds(readIds());
    sync();
    // Same tab fires VIEW_EVENT; other tabs fire the native storage event.
    window.addEventListener(VIEW_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(VIEW_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -360 : 360;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Resolve against the live catalogue, preserving most-recent-first order and
  // silently dropping anything archived or out of catalogue since it was seen.
  const seen = ids
    .filter((id) => id !== excludeId)
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  if (seen.length < 2) return null; // a single tile is noise, not a shortlist

  return (
    <div className="mx-auto max-w-[1080px] px-5 pt-[18px]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-[22px] font-extrabold flex items-center gap-2">
          <span>👀</span>
          <span>{t("recent.title")}</span>
        </h2>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => clearViews()}
            className="text-[12px] font-bold text-mute underline hover:text-brand transition-colors cursor-pointer"
          >
            {t("recent.clear")}
          </button>
        </div>
      </div>
      <div className="relative group/recent flex items-center">
        {/* Left Floating Side Arrow Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="btn-press absolute -left-2.5 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 sm:border-2.5 border-ink bg-white text-ink shadow-hard-2 hover:bg-[#FFE1A8] active:scale-95 transition-all cursor-pointer font-extrabold text-[16px]"
          aria-label="Previous products"
        >
          ‹
        </button>

        {/* Right Floating Side Arrow Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="btn-press absolute -right-2.5 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 sm:border-2.5 border-ink bg-white text-ink shadow-hard-2 hover:bg-[#FFE1A8] active:scale-95 transition-all cursor-pointer font-extrabold text-[16px]"
          aria-label="Next products"
        >
          ›
        </button>

        <div ref={scrollRef} className="no-scrollbar flex w-full gap-3 overflow-x-auto pb-2 pt-1 px-1 scroll-smooth">
          {seen.map((p) => (
            <Card
              key={p.id}
              className={`pop glow-card w-40 shrink-0 p-2.5 ${
                openProduct ? "cursor-pointer group hover:border-brand" : ""
              }`}
              style={glowStyle(p.tile_color)}
              onClick={() => openProduct?.(p)}
            >
              <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt={p.name_en} />
              <div className="mt-2 text-[12px] font-bold leading-[1.2] group-hover:text-brand transition-colors">
                {lang === "ta" ? p.name_ta : p.name_en}
              </div>
              <div className="mt-1 font-display font-extrabold text-brand">{inr(p.price)}</div>
              <div className="mt-2" onClick={(e) => openProduct && e.stopPropagation()}>
                <Btn small full disabled={p.stock === 0} onClick={() => addToCart(p.id)}>
                  {p.stock === 0 ? t("shop.soldOut") : t("buyAgain.add")}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
