"use client";

import { useEffect, useState } from "react";
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

  // Resolve against the live catalogue, preserving most-recent-first order and
  // silently dropping anything archived or out of catalogue since it was seen.
  const seen = ids
    .filter((id) => id !== excludeId)
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  if (seen.length < 2) return null; // a single tile is noise, not a shortlist

  return (
    <div className="mx-auto max-w-[1080px] px-5 pt-[18px]">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-[22px] font-extrabold">👀 {t("recent.title")}</h2>
        <button
          type="button"
          onClick={() => clearViews()}
          className="ml-auto text-[12px] font-bold text-mute underline"
        >
          {t("recent.clear")}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {seen.map((p) => (
          <Card
            key={p.id}
            className={`pop glow-card w-40 shrink-0 p-2.5 ${
              openProduct ? "cursor-pointer group hover:border-brand" : ""
            }`}
            style={glowStyle(p.tile_color)}
            onClick={() => openProduct?.(p)}
          >
            <Art emoji={p.emoji} bg={p.tile_color} h={90} image={p.images[0]} alt={p.name_en} />
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
  );
}
