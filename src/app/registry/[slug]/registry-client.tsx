"use client";

import { useState } from "react";
import Link from "next/link";
import type { BabyRegistry, Product } from "@/lib/types";
import { useCart } from "@/lib/store/CartProvider";
import { BUSINESS, glowStyle, inr } from "@/lib/constants";
import { Art, Badge, Btn, Card } from "@/components/ui";

export function RegistryClient({
  registry,
  products,
}: {
  registry: BabyRegistry;
  products: Product[];
}) {
  const { add } = useCart();
  const [copied, setCopied] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const itemsWithProduct = registry.items
    .map((item) => ({
      item,
      product: products.find((p) => p.id === item.product_id),
    }))
    .filter((x): x is { item: typeof registry.items[0]; product: Product } => x.product !== undefined);

  const handleGift = (product: Product) => {
    add(product.id);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2500);
  };

  return (
    <div className="min-h-screen pb-16 pt-6">
      <div className="mx-auto max-w-[960px] px-4">
        {/* Navigation / Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-[18px] font-extrabold text-ink hover:text-brand"
          >
            <span>👶</span>
            <span>{BUSINESS.name}</span>
          </Link>
          <Link
            href="/"
            className="btn-press rounded-pill border-2 border-ink bg-white px-4 py-1.5 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-cream"
          >
            ← Back to Store
          </Link>
        </div>

        {/* Hero Registry Banner Card */}
        <Card className="mb-8 p-6 text-center" style={glowStyle("#FFE1A8")}>
          <span className="text-[44px]">🎁</span>
          <h1 className="mt-2 font-display text-[28px] font-black text-ink sm:text-[34px]">
            {registry.title}
          </h1>
          <p className="mt-1 font-display text-[15px] font-extrabold text-mute">
            Created by <span className="text-ink">{registry.parent_name}</span> · Event Date:{" "}
            <span className="text-ink">{registry.event_date}</span>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }
              }}
              className="btn-press rounded-pill border-2.5 border-ink bg-white px-5 py-2 font-display text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-cream"
            >
              {copied ? "✓ Registry Link Copied!" : "🔗 Share Registry on WhatsApp"}
            </button>
            <Link
              href="/"
              className="btn-press rounded-pill border-2.5 border-ink bg-[#8CE0CE] px-5 py-2 font-display text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#6FD4BD]"
            >
              🛒 View Cart / Checkout
            </Link>
          </div>
        </Card>

        {/* Items List Heading */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-extrabold text-ink">
            Requested Gifts ({itemsWithProduct.length})
          </h2>
          <Badge bg="#D6E8B0">1-Click Gift Add</Badge>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {itemsWithProduct.map(({ item, product }) => {
            const isAdded = addedIds[product.id];
            const fulfilled = item.purchased_qty >= item.desired_qty;

            return (
              <Card key={item.product_id} className="flex flex-col p-4">
                <div className="relative mb-3 aspect-[5/3] w-full overflow-hidden rounded-tile border-2 border-ink bg-cream">
                  <Art
                    image={product.images[0]}
                    emoji={product.emoji}
                    bg={product.tile_color}
                  />
                  {fulfilled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink/60 font-display text-[14px] font-extrabold text-white">
                      ✓ Fulfilled Gift!
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-display text-[16px] font-extrabold text-ink line-clamp-2">
                    {product.name_en}
                  </h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-display text-[16px] font-extrabold text-brand">
                      {inr(product.price)}
                    </span>
                    <span className="text-[12px] font-bold text-mute">
                      Needed: {item.desired_qty} (Got {item.purchased_qty})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-cream border border-ink/20">
                  <div
                    className="h-full bg-brand transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (item.purchased_qty / item.desired_qty) * 100)}%`,
                    }}
                  />
                </div>

                <Btn
                  full
                  disabled={fulfilled}
                  bg={isAdded ? "#8CE0CE" : "#FFE1A8"}
                  onClick={() => handleGift(product)}
                >
                  {isAdded ? "✓ Added to Cart 🎁" : fulfilled ? "Fulfilled 🎁" : "Gift This Item 🎁"}
                </Btn>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
