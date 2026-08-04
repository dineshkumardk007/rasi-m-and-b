"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { glowStyle, inr } from "@/lib/constants";
import { Art, Btn, Card } from "@/components/ui";
import { suggestionsForAction } from "@/app/customer-actions";
import { trackAddToCart } from "@/lib/analytics";

/**
 * "Often bought with" row for a product view.
 *
 * The heading changes with the evidence: real co-purchase data is presented as
 * such, while the same-category fallback says "you may also like" instead —
 * claiming products are bought together when they never have been is a small
 * lie the shop does not need to tell.
 */
export function BoughtTogether({
  productId,
  addToCart,
  openProduct,
}: {
  productId: string;
  addToCart: (id: string) => void;
  openProduct?: (p: Product) => void;
}) {
  const { t, lang } = useT();
  const [items, setItems] = useState<Product[]>([]);
  const [fromData, setFromData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    suggestionsForAction(productId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.products);
        setFromData(res.fromPurchaseData);
      })
      .catch(() => {
        /* suggestions are a bonus — never surface a failure to the shopper */
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (items.length === 0) return null;

  const total = items.reduce((sum, p) => sum + p.price, 0);

  /**
   * Tracked here rather than at the call sites: this component holds the full
   * product, so callers cannot accidentally report an add-to-cart with a blank
   * name and a zero price.
   */
  const add = (p: Product) => {
    trackAddToCart({ id: p.id, name: p.name_en, price: p.price });
    addToCart(p.id);
  };

  return (
    <div className="mt-4 rounded-tile border-2.5 border-ink bg-paper/70 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-display text-[15px] font-extrabold">
          {fromData ? `🧺 ${t("fbt.title")}` : `💡 ${t("fbt.alsoLiked")}`}
        </h4>
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => items.forEach(add)}
            className="btn-press ml-auto rounded-pill border-2 border-ink bg-[#D6E8B0] px-3 py-1 font-display text-[12px] font-extrabold shadow-hard-2"
          >
            {t("fbt.addAll")} · {inr(total)}
          </button>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {items.map((p) => (
          <Card
            key={p.id}
            className={`w-[132px] shrink-0 p-2 ${openProduct ? "cursor-pointer group" : ""}`}
            style={glowStyle(p.tile_color)}
            onClick={() => openProduct?.(p)}
          >
            <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt={p.name_en} />
            <div className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-[1.2]">
              {lang === "ta" ? p.name_ta : p.name_en}
            </div>
            <div className="mt-0.5 font-display text-[13px] font-extrabold text-brand">
              {inr(p.price)}
            </div>
            <div className="mt-1.5" onClick={(e) => openProduct && e.stopPropagation()}>
              <Btn small full onClick={() => add(p)}>
                +
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
