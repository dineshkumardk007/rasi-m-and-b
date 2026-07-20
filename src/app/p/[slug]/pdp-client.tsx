"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Review } from "@/lib/types";
import { useCart } from "@/lib/store/CartProvider";
import { useT } from "@/lib/i18n/LanguageProvider";
import { inr, MILESTONE_META } from "@/lib/constants";
import { Art, Badge, Btn, Stars, Toast } from "@/components/ui";

/** Client half of the SEO PDP — framed tile, buy box, approved reviews. */
export function PdpClient({ product: p, reviews }: { product: Product; reviews: Review[] }) {
  const { t, lang } = useT();
  const cart = useCart();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const meta = MILESTONE_META[p.milestone];

  return (
    <div className="rounded-card border-3 border-ink bg-paper p-4 shadow-hard-4">
      <Art emoji={p.emoji} bg={p.tile_color} h={220} image={p.images[0]} alt={p.name_en} />
      <h1 className="mt-3.5 font-display text-[26px] font-extrabold">
        {lang === "ta" ? p.name_ta : p.name_en}
      </h1>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[22px] font-extrabold text-brand">{inr(p.price)}</span>
        {p.mrp > p.price && (
          <span className="text-[14px] text-[#B4AABF] line-through">{inr(p.mrp)}</span>
        )}
        <Badge bg={meta.bg}>{lang === "ta" ? meta.shortTa : meta.shortEn}</Badge>
        {p.brand && <Badge bg="#C7E9FF">{p.brand}</Badge>}
      </div>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-mute">
        {lang === "ta" ? p.description_ta : p.description_en}
      </p>
      {p.ingredients && (
        <div className="mt-3 rounded-tile border-2.5 border-ink bg-cream p-3">
          <div className="font-display text-[13px] font-extrabold uppercase text-mute">
            {t("product.ingredients")}
          </div>
          <p className="mt-1 text-[13px]">{p.ingredients}</p>
        </div>
      )}
      {p.stock <= p.low_stock_threshold && p.stock > 0 && (
        <p className="mt-2 text-[13px] font-extrabold text-[#F59E0B]">
          {t("shop.onlyLeft", { count: p.stock })}
        </p>
      )}
      <div className="mt-4">
        <Btn
          full
          disabled={p.stock === 0}
          onClick={() => {
            cart.add(p.id);
            setToast(t("toast.addedToCart"));
            window.setTimeout(() => {
              setToast(null);
              router.push("/");
            }, 900);
          }}
        >
          {p.stock === 0 ? t("shop.soldOut") : `${t("shop.addToCart")} — ${inr(p.price)}`}
        </Btn>
      </div>

      {reviews.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 font-display font-extrabold">
            {t("product.reviews")} ({reviews.length}) ⭐
          </h2>
          {reviews.map((r) => (
            <div key={r.id} className="mb-2 rounded-tile border-2.5 border-ink bg-cream p-3 text-[14px]">
              <Stars n={r.rating} />{" "}
              <span className="font-display font-extrabold">{r.author_name}</span>
              <p className="mt-1 text-mute">{r.text}</p>
            </div>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}
