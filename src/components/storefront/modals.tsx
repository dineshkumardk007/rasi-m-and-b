"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import type { CustomerAddress, Order, Product, Review, StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useSession } from "@/lib/store/SessionProvider";
import { useWishlist } from "@/lib/store/WishlistProvider";
import { MILESTONE_META, calculateDeliveryFee, inr } from "@/lib/constants";
import { Art, Badge, Btn, Field, Modal, ProductImageSlider, Stars } from "@/components/ui";
import {
  checkCouponAction,
  checkPinAction,
  submitOrderAction,
  submitReviewAction,
  trackOrderAction,
} from "@/app/actions";
import { createSubscriptionAction, myAddressesAction, notifyRestockAction, registerRestockReminderAction, saveCustomerAddressAction, updateMyPasswordAction } from "@/app/customer-actions";
import { ShareButton } from "./ShareButton";
import { BoughtTogether } from "./BoughtTogether";
import { GIFT_MESSAGE_MAX } from "@/lib/gift";

/* ── Interactive Size Guide Modal ────────────────────────────────────────── */
export function SizeGuideModal({
  type,
  onClose,
}: {
  type: "diaper" | "clothing" | "shoes";
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h3 className="font-display text-[22px] font-extrabold mb-2 text-ink">
        📏 {type === "diaper" ? "Diaper Weight Size Guide" : type === "clothing" ? "Baby Clothing Size Guide" : "Footwear Size Guide"}
      </h3>
      {type === "diaper" && (
        <div className="space-y-2 text-[14px]">
          <p className="text-mute text-[13px]">Pick diaper size based on your baby&apos;s weight for leak-proof comfort:</p>
          <div className="rounded-tile border-2 border-ink bg-cream p-3 grid gap-1.5 font-bold">
            <div className="flex justify-between border-b pb-1"><span>Newborn (NB)</span><span className="text-brand">Up to 5 kg</span></div>
            <div className="flex justify-between border-b pb-1"><span>Small (S)</span><span className="text-brand">4 to 8 kg</span></div>
            <div className="flex justify-between border-b pb-1"><span>Medium (M)</span><span className="text-brand">7 to 12 kg</span></div>
            <div className="flex justify-between border-b pb-1"><span>Large (L)</span><span className="text-brand">9 to 14 kg</span></div>
            <div className="flex justify-between"><span>Extra Large (XL)</span><span className="text-brand">12 to 17 kg</span></div>
          </div>
        </div>
      )}
      {type === "clothing" && (
        <div className="space-y-2 text-[14px]">
          <p className="text-mute text-[13px]">Recommended clothing sizes by age and height:</p>
          <div className="rounded-tile border-2 border-ink bg-cream p-3 grid gap-1.5 font-bold">
            <div className="flex justify-between border-b pb-1"><span>0 – 3 Months</span><span className="text-brand">50 – 60 cm</span></div>
            <div className="flex justify-between border-b pb-1"><span>3 – 6 Months</span><span className="text-brand">60 – 68 cm</span></div>
            <div className="flex justify-between border-b pb-1"><span>6 – 12 Months</span><span className="text-brand">68 – 80 cm</span></div>
            <div className="flex justify-between border-b pb-1"><span>12 – 18 Months</span><span className="text-brand">80 – 86 cm</span></div>
            <div className="flex justify-between"><span>18 – 24 Months</span><span className="text-brand">86 – 92 cm</span></div>
          </div>
        </div>
      )}
      {type === "shoes" && (
        <div className="space-y-2 text-[14px]">
          <p className="text-mute text-[13px]">First walker shoe sizes by foot length (cm):</p>
          <div className="rounded-tile border-2 border-ink bg-cream p-3 grid gap-1.5 font-bold">
            <div className="flex justify-between border-b pb-1"><span>Size 1 (0-6m)</span><span className="text-brand">10.5 cm</span></div>
            <div className="flex justify-between border-b pb-1"><span>Size 2 (6-12m)</span><span className="text-brand">11.5 cm</span></div>
            <div className="flex justify-between border-b pb-1"><span>Size 3 (12-18m)</span><span className="text-brand">12.5 cm</span></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Product quick view ──────────────────────────────────────────────────── */
export function ProductModal({
  product: p,
  reviews,
  onClose,
  onAdd,
  notify,
  onAddItem,
}: {
  product: Product;
  reviews: Review[];
  onClose: () => void;
  /** Fires with the selected variant's id, or undefined for a plain product. */
  onAdd: (variantId?: string) => void;
  notify: (m: string) => void;
  /** Adds any product by id — powers the "often bought with" row. */
  onAddItem?: (id: string) => void;
}) {
  const { t, lang } = useT();
  const { session } = useSession();
  const wishlist = useWishlist();
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(session?.name ?? "");
  const [rating, setRating] = useState(5);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pin, setPin] = useState("");
  const [pinResult, setPinResult] = useState<
    "same-day" | "tomorrow" | "courier" | "unserviceable" | null
  >(null);
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [restockPhone, setRestockPhone] = useState(session?.phone ?? "");
  const [restockDays, setRestockDays] = useState(30);
  // Defaults to the first configured variant so a product with variants is
  // purchasable the moment the modal opens — the admin can configure variants
  // (size, pack, etc.) but until now nothing in the storefront let a customer
  // actually pick one.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    p.variants?.[0]?.id ?? null,
  );
  const selectedVariant = p.variants?.find((v) => v.id === selectedVariantId) ?? null;
  const activePrice = selectedVariant?.price ?? p.price;
  const activeMrp = selectedVariant?.mrp ?? p.mrp;
  const activeStock = selectedVariant ? selectedVariant.stock : p.stock;
  const meta = MILESTONE_META[p.milestone];
  const name = lang === "ta" ? p.name_ta : p.name_en;
  const desc = lang === "ta" ? p.description_ta : p.description_en;

  const checkPin = async () => {
    if (!/^\d{6}$/.test(pin)) return;
    const res = await checkPinAction(pin);
    setPinResult(res.sameDayNow ? "same-day" : res.serviceable ? "tomorrow" : "unserviceable");
  };

  return (
    <>
    <Modal onClose={onClose} wide>
      {/* Product Image Preview Carousel with Floating Wishlist Heart Button */}
      <div className="relative">
        <ProductImageSlider
          images={p.images}
          emoji={p.emoji}
          bg={p.tile_color}
          ratio="banner"
          alt={name}
        />
        <button
          type="button"
          onClick={() => {
            wishlist.toggle(p.id);
            notify(wishlist.has(p.id) ? "Removed from Wishlist" : "Saved to Wishlist ❤️");
          }}
          className={`btn-press absolute top-3 right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2.5 border-ink transition-all duration-200 cursor-pointer ${wishlist.has(p.id)
              ? "bg-[#FF5A78] text-white shadow-hard-3 scale-110 rotate-6"
              : "bg-white/95 text-ink shadow-hard-2 hover:bg-[#FFCBD9] hover:scale-110"
            }`}
          title={wishlist.has(p.id) ? "Remove from Wishlist" : "Save to Wishlist"}
          aria-label={wishlist.has(p.id) ? "Remove from Wishlist" : "Save to Wishlist"}
        >
          <span className="text-[18px]">
            {wishlist.has(p.id) ? "❤️" : "♡"}
          </span>
        </button>
      </div>

      {/* Title & Price Header Card — Mild Soft Cream Tint */}
      <div className="mt-3.5 rounded-card border-2.5 border-ink bg-[#FFF6ED] p-3.5 shadow-sm backdrop-blur-sm">
        <h3 className="font-display text-[24px] sm:text-[26px] font-extrabold text-ink leading-snug">{name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="font-display text-[24px] font-extrabold text-brand">{inr(activePrice)}</span>
          {activeMrp > activePrice && (
            <>
              <span className="text-[14px] text-[#B4AABF] line-through">{inr(activeMrp)}</span>
              <Badge bg="#D6E8B0">
                SAVE {inr(activeMrp - activePrice)}
              </Badge>
            </>
          )}
          <Badge bg={meta.bg}>{lang === "ta" ? meta.shortTa : meta.shortEn}</Badge>
          {p.brand && <Badge bg="#C7E9FF">{p.brand}</Badge>}
        </div>
        <p className="mt-2.5 text-[14px] sm:text-[15px] leading-[1.55] text-mute">{desc}</p>

        {p.variants && p.variants.length > 0 && (
          <div className="mt-3">
            <div className="font-display text-[12px] font-extrabold uppercase text-mute tracking-wide">
              {t("product.chooseOption")}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.variants.map((v) => {
                const vName = lang === "ta" ? v.name_ta : v.name_en;
                const active = v.id === selectedVariantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    disabled={v.stock === 0}
                    className={`rounded-pill border-2 px-3 py-1 text-[13px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${active
                        ? "border-ink bg-brand text-white shadow-hard-1"
                        : "border-ink/40 bg-white text-ink hover:border-ink"
                      }`}
                  >
                    {vName}
                    {v.stock === 0 ? ` (${t("shop.soldOut")})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {p.size_chart_type && p.size_chart_type !== "none" && (
          <button
            type="button"
            onClick={() => setShowSizeGuide(true)}
            className="btn-press mt-2.5 flex items-center gap-1 text-[13px] font-bold text-mute underline hover:text-ink transition-colors cursor-pointer"
          >
            📏 Size Guide
          </button>
        )}
      </div>

      {p.ingredients && (
        <div className="mt-3 rounded-card border-2.5 border-ink bg-[#F4F9EB] p-3.5 shadow-sm backdrop-blur-sm">
          <div className="font-display text-[13px] font-extrabold uppercase text-mute tracking-wide">
            🌱 {t("product.ingredients")}
          </div>
          <p className="mt-1.5 text-[13px] text-ink leading-relaxed font-medium">{p.ingredients}</p>
        </div>
      )}

      {/* PIN delivery estimate — Mild Soft Blue Tint */}
      <div className="mt-3 rounded-card border-2.5 border-ink bg-[#F0F5FF] p-3.5 shadow-sm backdrop-blur-sm">
        <div className="font-display text-[13px] font-extrabold uppercase text-mute tracking-wide">
          🚚 {t("product.checkPin")}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t("product.pinPlaceholder")}
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-pill border-2.5 border-ink bg-paper px-4 py-2 font-body text-[14px] outline-none shadow-inner focus:border-brand"
          />
          <Btn small bg="#E4D6FF" color="#2B2140" onClick={checkPin}>
            {t("product.pinCheck")}
          </Btn>
        </div>
        {pinResult && (
          <p className={`mt-2 text-[13px] font-bold ${pinResult === "unserviceable" ? "text-red-600" : "text-emerald-700"}`}>
            {pinResult === "same-day"
              ? `⚡ ${t("product.pinSameDay")}`
              : pinResult === "tomorrow"
                ? `📦 ${t("product.pinTomorrow")}`
                : pinResult === "courier"
                  ? `🚚 ${t("product.pinCourier")}`
                  : `❌ ${t("product.pinUnserviceable")}`}
          </p>
        )}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            {activeStock > 0 ? (
              <Btn full onClick={() => onAdd(selectedVariant?.id)}>
                🛒 {t("shop.addToCart")} — {inr(activePrice)}
              </Btn>
            ) : (
              <Btn
                full
                bg="#FFE1A8"
                color="#2B2140"
                onClick={async () => {
                  await notifyRestockAction(p.id);
                  notify(t("product.notifySaved"));
                }}
              >
                🔔 {t("product.notifyMe")}
              </Btn>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              wishlist.toggle(p.id);
              notify(wishlist.has(p.id) ? "Removed from Wishlist" : "Saved to Wishlist ❤️");
            }}
            className={`btn-press shrink-0 flex items-center justify-center gap-1.5 rounded-pill border-2.5 border-ink px-4 py-2.5 font-display text-[13px] font-extrabold shadow-hard-2 transition-all cursor-pointer ${wishlist.has(p.id)
                ? "bg-[#FF5A78] text-white"
                : "bg-[#A0D2EB] text-ink hover:bg-[#FFCBD9]"
              }`}
            title={wishlist.has(p.id) ? "Saved in Wishlist" : "Add to Wishlist"}
          >
            <span>{wishlist.has(p.id) ? "❤️" : "♡"}</span>
            <span>{wishlist.has(p.id) ? "Saved" : "Wishlist"}</span>
          </button>
        </div>

        {/* Subscribe & Save 10% Auto-Replenishment Button */}
        {activeStock > 0 && (p.categories.includes("diapering") || p.categories.includes("feeding")) && (
          <button
            type="button"
            onClick={async () => {
              const res = await createSubscriptionAction(p.id, selectedVariant?.id ?? null, 1, 30);
              if (res.ok) {
                notify("🔄 Subscribed! Saved 10% on monthly delivery");
                onAdd(selectedVariant?.id);
              } else {
                notify(res.error ?? "Please sign in to subscribe");
              }
            }}
            className="btn-press w-full flex items-center justify-center gap-2 rounded-pill border-2.5 border-ink bg-[#D6E8B0] px-4 py-2 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#B9EBDD] cursor-pointer"
          >
            <span>🔄 Subscribe & Save 10% ({inr(Math.round(activePrice * 0.9))}) · Auto-delivers every 30 days</span>
          </button>
        )}

        {/* Reorder nudge — a time-based "remind me to buy this again" for an
            in-stock item. Only shown in-stock: on an out-of-stock product the
            "Notify Me" button above already covers "tell me when it's back",
            and showing both together read as two overlapping promises. */}
        {activeStock > 0 && (
        <button
          type="button"
          onClick={() => setShowRestockForm(!showRestockForm)}
          className="btn-press w-full flex items-center justify-center gap-2 rounded-pill border-2.5 border-ink bg-[#FFE1A8] px-4 py-2 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] cursor-pointer"
        >
          <span>🔔 Remind Me to Reorder (WhatsApp)</span>
        </button>
        )}

        {activeStock > 0 && showRestockForm && (
          <div className="rounded-card border-2.5 border-ink bg-[#FFF6ED] p-3.5 shadow-sm mt-1">
            <div className="font-display text-[14px] font-extrabold text-ink mb-1 flex items-center justify-between">
              <span>🔔 Set Restock Reminder</span>
              <button
                type="button"
                onClick={() => setShowRestockForm(false)}
                className="text-[12px] font-extrabold text-mute hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-[12px] text-mute mb-2.5">
              We&apos;ll send a WhatsApp reminder to reorder before your baby supply runs out!
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={restockPhone}
                onChange={(e) => setRestockPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="min-w-[140px] flex-1 rounded-pill border-2 border-ink bg-white px-3 py-1.5 font-body text-[13px] font-bold outline-none focus:border-brand"
              />
              <select
                value={restockDays}
                onChange={(e) => setRestockDays(Number(e.target.value))}
                className="rounded-pill border-2 border-ink bg-white px-2.5 py-1.5 font-body text-[13px] font-bold outline-none focus:border-brand"
              >
                <option value={15}>In 15 days</option>
                <option value={30}>In 30 days</option>
                <option value={45}>In 45 days</option>
                <option value={60}>In 60 days</option>
              </select>
              <Btn
                small
                bg="#D6E8B0"
                color="#2B2140"
                onClick={async () => {
                  const res = await registerRestockReminderAction(p.id, restockPhone, restockDays);
                  notify(res.message);
                  if (res.ok) setShowRestockForm(false);
                }}
              >
                Set Reminder
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Share + permanent link to the product's own page */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <ShareButton product={p} notify={notify} small />
        <a
          href={`/p/${p.slug}`}
          className="text-[13px] font-bold text-mute underline hover:text-ink transition-colors"
        >
          {t("product.viewPage")}
        </a>
      </div>

      {onAddItem && (
        <BoughtTogether productId={p.id} addToCart={onAddItem} />
      )}

      {/* Reviews */}
      <div className="mt-[22px]">
        <h4 className="mb-2 font-display text-[15px] font-extrabold text-ink">
          {t("product.reviews")} ({reviews.length}) ⭐
        </h4>
        {reviews.length === 0 && (
          <p className="text-[14px] text-mute">{t("product.noReviews")}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="mb-2 rounded-tile border-3 border-ink bg-paper p-3 text-[14px]">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Stars n={r.rating} />{" "}
                <span className="font-display font-extrabold">{r.author_name}</span>
              </div>
              {r.verified_buyer !== false && (
                <Badge bg="#D6E8B0">VERIFIED BUYER ✓</Badge>
              )}
            </div>
            <p className="mt-1 text-mute">{r.text}</p>
            {r.photo_url && (
              <div className="relative mt-2 h-36 w-36 overflow-hidden rounded-tile border-2 border-ink">
                {/* Customers paste an arbitrary external link, so this can't go
                    through Next's image optimizer (no fixed domain to allow-list) —
                    unoptimized keeps it a real <Image> for lazy-loading and layout
                    stability without a server-side fetch of an untrusted URL. */}
                <Image
                  src={r.photo_url}
                  alt="Review photo"
                  fill
                  unoptimized
                  sizes="144px"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        ))}
        <div className="mt-3">
          <div className="mb-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="text-[22px]"
                style={{ color: n <= rating ? "#F59E0B" : "#D8D2E0" }}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            ))}
          </div>
          {!session && (
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t("product.yourName")}
              className="mb-2 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[14px] outline-none focus:border-brand"
            />
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t("product.writeReview")}
            className="w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[14px] outline-none focus:border-brand"
          />
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="📷 Add Image/Photo Link (Optional)"
            className="mt-2 mb-2 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[13px] outline-none focus:border-brand"
          />
          <div className="mt-2">
            <Btn
              small
              onClick={async () => {
                if (!text.trim()) return;
                const res = await submitReviewAction(p.id, author || session?.name || "", rating, text, photoUrl);
                if (res.ok) {
                  setText("");
                  setPhotoUrl("");
                  notify(t("product.reviewPending"));
                } else if (res.error === "rate_limited") {
                  notify(t("checkout.tooManyAttempts"));
                } else {
                  notify("Please enter a valid review (5-1000 characters).");
                }
              }}
            >
              {t("product.postReview")}
            </Btn>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t-2 border-dashed border-[#E5DBCC] pt-3 text-center">
        <button
          type="button"
          onClick={onClose}
          className="btn-press rounded-pill border-2.5 border-ink bg-[#F2EAE0] px-5 py-2 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] transition-all cursor-pointer"
        >
          Close Window ✕
        </button>
      </div>
    </Modal>
    {showSizeGuide && p.size_chart_type && p.size_chart_type !== "none" && (
      <SizeGuideModal type={p.size_chart_type} onClose={() => setShowSizeGuide(false)} />
    )}
    </>
  );
}

/* ── Cart ────────────────────────────────────────────────────────────────── */
export interface CartItemView {
  itemId: string;
  /** Set when this line is a specific product variant, not the base product. */
  variantId?: string;
  qty: number;
  name: string;
  price: number;
  emoji: string;
  bg: string;
  maxStock: number;
  isBundle: boolean;
}

export function CartModal({
  items,
  subtotal,
  settings,
  setQty,
  onClose,
  onCheckout,
}: {
  items: CartItemView[];
  subtotal: number;
  settings: StoreSettings;
  setQty: (id: string, qty: number, variantId?: string) => void;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const { t } = useT();
  const deliveryInfo = calculateDeliveryFee(subtotal, settings);
  const threshold = deliveryInfo.freeThreshold;
  const free = deliveryInfo.isFree;
  const progress = free ? 100 : Math.min(100, Math.round((subtotal / (threshold + 1)) * 100));
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3.5 font-display text-[24px] font-extrabold">{t("cart.title")} 🛒</h3>
      {items.length === 0 && (
        <div className="rounded-card border-3 border-dashed border-ink bg-paper p-6 text-center text-mute font-extrabold">
          {t("cart.empty")}
        </div>
      )}
      <div className="space-y-2.5">
        {items.map((c) => (
          <div
            key={`${c.itemId}:${c.variantId ?? ""}`}
            className="flex items-center gap-3 rounded-card border-2.5 border-ink bg-white p-3 shadow-hard-2"
          >
            <div className="w-12 shrink-0">
              <Art emoji={c.emoji} bg={c.bg} h={48} isBundle={c.isBundle} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-extrabold text-ink">{c.name}</div>
              <div className="font-display text-[15px] font-extrabold text-brand">
                {inr(c.price)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(c.itemId, c.qty - 1, c.variantId)}
                className="btn-press flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-[#FFCBD9] font-display text-[15px] font-extrabold shadow-hard-1 hover:bg-[#FF5A78] hover:text-white cursor-pointer transition-all"
                aria-label="decrease"
              >
                −
              </button>
              <span className="w-5 text-center font-display text-[15px] font-extrabold text-ink">{c.qty}</span>
              <button
                type="button"
                onClick={() => setQty(c.itemId, Math.min(c.qty + 1, c.maxStock), c.variantId)}
                className="btn-press flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-[#D6E8B0] font-display text-[15px] font-extrabold shadow-hard-1 hover:bg-[#B9EBDD] cursor-pointer transition-all"
                aria-label="increase"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div className="mt-4 rounded-tile border-3 border-ink bg-[#FFFDF7] p-3.5 shadow-hard-3">
          <div className="flex items-center justify-between text-[15px] font-bold text-ink">
            <span>{t("cart.subtotal")}</span>
            <span className="font-display text-[18px] font-extrabold text-ink">{inr(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-ink/20 pt-2 text-[14px] font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <span>🚚</span>
              <span>{t("cart.delivery")}</span>
            </span>
            {free ? (
              <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#D6E8B0] px-3 py-1 font-display text-[12px] font-extrabold text-ink shadow-hard-2 animate-bounce">
                🎉 FREE DELIVERY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#FFE1A8] px-3 py-1 font-display text-[12px] font-extrabold text-ink shadow-hard-2">
                {inr(deliveryInfo.fee)}
              </span>
            )}
          </div>
          {!free && (
            <div className="mt-3">
              {/* free-delivery progress bar */}
              <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
                <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 text-[12px] font-extrabold text-mute">
                {t("cart.addMore", { amount: inr(threshold + 1 - subtotal) })}
              </div>
            </div>
          )}
          <div className="mt-4">
            <Btn full onClick={onCheckout}>
              {t("cart.checkout")} →
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Checkout: address → payment ─────────────────────────────────────────── */
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentProcessingView({
  stage,
  method,
  amount,
  isDemo,
  onCancel,
}: {
  stage: "order" | "sdk" | "gateway" | "confirming";
  method: "upi" | "card" | "razorpay";
  amount: number;
  isDemo: boolean;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCancel(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="py-4 text-center">
      {/* Animated Dual-Ring Loading Spinner & Method Emoji */}
      <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-[#EC5D8A] border-r-transparent border-b-[#B9EBDD] border-l-transparent" />
        <div className="absolute inset-2 animate-pulse rounded-full border-2 border-[#FFE1A8] bg-[#FFF8F0]" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2.5 border-ink bg-paper shadow-hard-2">
          <span className="animate-bounce text-[28px]">
            {method === "upi" ? "📱" : method === "card" ? "💳" : "⚡"}
          </span>
        </div>
      </div>

      <h3 className="mb-1.5 font-display text-[22px] font-extrabold text-ink">
        {t("checkout.processingTitle")}
      </h3>

      {/* Dynamic Status Step Pill */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-pill border-2 border-ink bg-[#FFF8F0] px-3.5 py-1.5 text-[13px] font-bold text-brand shadow-hard-2">
        <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
        <span>
          {stage === "order" && t("checkout.processing")}
          {(stage === "sdk" || stage === "gateway") && t("checkout.connectingGateway")}
          {stage === "confirming" && t("checkout.awaitingPopup")}
        </span>
      </div>

      {/* Payment Summary Box */}
      <div className="mx-auto mb-4 max-w-[320px] rounded-card border-3 border-ink bg-paper p-3.5 text-left shadow-hard-4">
        <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-mute uppercase font-display">
          <span>{t("checkout.amountToPay")}</span>
          <span className="text-ink font-extrabold">
            {method === "upi" ? "UPI — GPay / PhonePe / Paytm" : method === "card" ? "Credit / Debit Card" : "Online Payment"}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-display text-[24px] font-extrabold text-brand">
            {inr(amount)}
          </span>
          <span className="text-[12px] font-extrabold text-ink">Rasi Mom & Baby</span>
        </div>
      </div>

      {/* Security & Warning Notice Banner */}
      <div className="mx-auto mb-3 max-w-[340px] rounded-tile border-2.5 border-ink bg-[#FFE1A8] p-3 text-[12.5px] font-bold text-ink">
        <div className="flex items-start gap-2 text-left">
          <span className="text-[16px] shrink-0">⚠️</span>
          <span>{t("checkout.doNotClose")}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[12px] font-extrabold text-mute">
        <span>🔒</span>
        <span>{t("checkout.secureTransaction")}</span>
      </div>

      {isDemo && (
        <p className="mt-2 text-[12px] font-bold text-brand">{t("checkout.demo")}</p>
      )}

      {showCancel && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] font-extrabold text-mute underline hover:text-ink transition-colors"
          >
            {t("checkout.cancelPayment")}
          </button>
        </div>
      )}
    </div>
  );
}

export function CheckoutModal({
  items,
  subtotal,
  settings,
  isDemo,
  onClose,
  onPlaced,
  notify,
}: {
  items: CartItemView[];
  subtotal: number;
  settings: StoreSettings;
  isDemo: boolean;
  onClose: () => void;
  onPlaced: (order: Order, invoiceToken: string | null) => void;
  notify: (m: string) => void;
}) {
  const { t, lang } = useT();
  const { session } = useSession();
  const [step, setStep] = useState<"address" | "pay">("address");
  const [f, setF] = useState({
    name: session?.name ?? "",
    phone: session?.phone ?? "",
    line: "",
    city: "Thoothukudi",
    pin: "",
  });
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [saveThisAddress, setSaveThisAddress] = useState(false);

  useEffect(() => {
    if (session) {
      myAddressesAction().then((addrs) => {
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.is_default) || addrs[0];
        if (def) {
          setF({
            name: def.name,
            phone: def.phone,
            line: def.line,
            city: def.city,
            pin: def.pin,
          });
        }
      });
    }
  }, [session]);

  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payStage, setPayStage] = useState<"order" | "sdk" | "gateway" | "confirming">("order");
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "razorpay">("razorpay");
  const [sameDay, setSameDay] = useState<boolean | null>(null);
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"standard" | "express_3hr" | "store_pickup">("standard");

  const valid =
    f.name.trim() &&
    f.phone.replace(/\D/g, "").length >= 10 &&
    f.line.trim() &&
    /^\d{6}$/.test(f.pin);

  const discount = coupon?.discount ?? 0;
  const postDiscountSubtotal = Math.max(0, subtotal - discount);
  const deliveryInfo = calculateDeliveryFee(postDiscountSubtotal, settings);
  const delivery = deliveryInfo.fee;
  const giftWrapFee = isGift && (settings.gift_wrap_enabled ?? true) ? (settings.gift_wrap_fee ?? 30) : 0;
  const total = postDiscountSubtotal + delivery + giftWrapFee;
  const codAllowed = total <= settings.cod_limit;

  const applyCoupon = async () => {
    const res = await checkCouponAction(code, subtotal);
    if (!res.ok) {
      notify(
        res.reason === "min_order"
          ? t("checkout.couponMin", { min: inr(res.min ?? 0) })
          : t("checkout.couponNotFound"),
      );
      return;
    }
    setCoupon({ code: res.code, discount: res.discount });
    notify(t("checkout.couponApplied"));
  };

  const goToPay = async () => {
    const res = await checkPinAction(f.pin);
    if (!res.serviceable) {
      notify(t("checkout.unserviceablePin", { pin: f.pin }));
      return;
    }
    setSameDay(res.sameDayNow);
    setStep("pay");
  };

  const placeWith = async (method: "razorpay" | "cod") => {
    setPaying(true);
    if (session && saveThisAddress) {
      await saveCustomerAddressAction({
        name: f.name,
        phone: f.phone,
        line: f.line,
        city: f.city,
        pin: f.pin,
        label: "Saved Address",
        is_default: savedAddresses.length === 0,
      });
    }
    const result = await submitOrderAction({
      items: items.map((c) => ({ itemId: c.itemId, qty: c.qty, variantId: c.variantId })),
      address: { name: f.name, phone: f.phone, line: f.line, city: f.city, pin: f.pin },
      payment_method: method,
      coupon_code: coupon?.code,
      language: lang,
      is_gift: isGift,
      gift_message: isGift ? giftMessage : undefined,
      delivery_mode: deliveryMode,
    });
    if (!result.ok) {
      setPaying(false);
      notify(
        result.error === "out_of_stock"
          ? t("checkout.outOfStock")
          : result.error === "cod_limit"
            ? t("checkout.codLimit", { limit: inr(settings.cod_limit) })
            : result.error === "unserviceable_pin"
              ? t("checkout.unserviceablePin", { pin: f.pin })
              : result.error === "too_many_attempts"
                ? t("checkout.tooManyAttempts")
                : t("checkout.serverError"),
      );
      return null;
    }
    return { order: result.order, invoiceToken: result.invoiceToken };
  };

  const payOnline = async (method: "upi" | "card" | "razorpay" = "razorpay") => {
    setSelectedMethod(method);
    setPaying(true);
    setPayStage("order");

    if (isDemo) {
      // Demo simulation, mirroring the reference's 1.4s processing screen.
      window.setTimeout(async () => {
        const placed = await placeWith("razorpay");
        if (placed) onPlaced(placed.order, placed.invoiceToken);
        else setPaying(false);
      }, 1400);
      return;
    }

    const placed = await placeWith("razorpay");
    if (!placed) {
      setPaying(false);
      return;
    }
    const { order } = placed;

    setPayStage("sdk");
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPaying(false);
      notify("Razorpay unavailable — try Cash on delivery");
      return;
    }

    setPayStage("gateway");
    const res = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_no: order.order_no, phone: f.phone }),
    });

    if (!res.ok) {
      setPaying(false);
      notify("Payment setup failed — try Cash on delivery");
      return;
    }

    const { keyId, rzpOrderId, amount } = (await res.json()) as {
      keyId: string;
      rzpOrderId: string;
      amount: number;
    };

    setPayStage("confirming");
    new window.Razorpay!({
      key: keyId,
      order_id: rzpOrderId,
      amount,
      currency: "INR",
      name: "Rasi Mom & Baby",
      prefill: { name: f.name, contact: f.phone },
      theme: { color: "#EC5D8A" },
      handler: async (response: Record<string, string>) => {
        // Razorpay only calls this handler after IT considers the payment
        // captured — the customer has already paid at this point, so still
        // show them the success screen even if our own confirm call fails
        // (the webhook is the source of truth and will reconcile it). But a
        // failure here previously vanished with no trace: if the webhook is
        // also misconfigured or delayed, nobody would know this order needs
        // attention. Report it so it's visible instead of silent.
        try {
          const confirmRes = await fetch("/api/razorpay/confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ order_no: order.order_no, ...response }),
          });
          if (!confirmRes.ok) {
            const body = await confirmRes.json().catch(() => ({}));
            Sentry.captureMessage(`razorpay confirm call failed for ${order.order_no}`, {
              level: "error",
              tags: { area: "razorpay_confirm_client", order_no: order.order_no },
              extra: { status: confirmRes.status, body },
            });
          }
        } catch (err) {
          Sentry.captureException(err, {
            tags: { area: "razorpay_confirm_client", order_no: order.order_no },
          });
        }
        onPlaced(order, placed.invoiceToken);
      },
      modal: {
        ondismiss: () => {
          setPaying(false);
          notify("Payment window closed");
        },
      },
    }).open();
  };

  const payCod = async () => {
    const placed = await placeWith("cod");
    if (placed) onPlaced(placed.order, placed.invoiceToken);
  };

  return (
    <Modal onClose={() => { if (!paying) onClose(); }}>
      {paying ? (
        <PaymentProcessingView
          stage={payStage}
          method={selectedMethod}
          amount={total}
          isDemo={isDemo}
          onCancel={() => {
            setPaying(false);
            notify("Payment cancelled");
          }}
        />
      ) : step === "address" ? (
        <div>
          <h3 className="mb-3.5 font-display text-[24px] font-extrabold">
            {t("checkout.title")} 🚚
          </h3>
          {!session ? (
            <div className="mb-3 rounded-tile border-2.5 border-ink bg-[#FFE1A8] p-3 text-[14px]">
              {t("checkout.guest")}
            </div>
          ) : (
            savedAddresses.length > 0 && (
              <div className="mb-3.5">
                <span className="font-display text-[12px] font-extrabold uppercase text-mute">
                  📍 Select Saved Delivery Address
                </span>
                <div className="mt-1.5 grid gap-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = f.line === addr.line && f.pin === addr.pin;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() =>
                          setF({
                            name: addr.name,
                            phone: addr.phone,
                            line: addr.line,
                            city: addr.city,
                            pin: addr.pin,
                          })
                        }
                        className={`flex items-start justify-between rounded-tile border-2 border-ink p-2.5 text-left text-[13px] transition-all cursor-pointer ${isSelected ? "bg-[#C7E9FF] shadow-hard-2" : "bg-white hover:bg-cream"
                          }`}
                      >
                        <div>
                          <span className="font-extrabold text-ink">{addr.label || "Saved Address"}</span>: {addr.name} ({addr.phone})
                          <div className="text-mute text-[12px]">{addr.line}, {addr.city} - {addr.pin}</div>
                        </div>
                        {isSelected && <span className="font-extrabold text-brand">✓ Selected</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
          <Field label={t("checkout.name")} value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Priya Raman" />
          <Field label={t("checkout.phone")} value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="98765 43210" inputMode="tel" />
          <Field label={t("checkout.address")} value={f.line} onChange={(v) => setF({ ...f, line: v })} placeholder="12, Beach Road" />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("checkout.city")} value={f.city} onChange={(v) => setF({ ...f, city: v })} />
            <Field label={t("checkout.pin")} value={f.pin} onChange={(v) => setF({ ...f, pin: v.replace(/\D/g, "").slice(0, 6) })} placeholder="628001" inputMode="numeric" maxLength={6} />
          </div>

          {/* Delivery Speed & Mode Picker */}
          <div className="mb-3.5 rounded-card border-2.5 border-ink bg-white p-3 shadow-hard-1">
            <div className="font-display text-[13px] font-extrabold text-ink mb-2">
              🚚 Choose Delivery Speed & Method:
            </div>
            <div className="grid gap-2">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-tile border-2 p-2.5 transition-all ${
                  deliveryMode === "express_3hr"
                    ? "border-ink bg-[#D6E8B0] shadow-hard-1"
                    : "border-ink/20 bg-paper hover:bg-paper/80"
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={deliveryMode === "express_3hr"}
                  onChange={() => setDeliveryMode("express_3hr")}
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                <div>
                  <div className="font-display text-[13px] font-extrabold text-ink">
                    ⚡ Express 3-Hour Store Delivery (Thoothukudi)
                  </div>
                  <div className="text-[11px] font-bold text-ink/80">
                    Direct rider delivery from Palayamkottai Rd store today!
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-tile border-2 p-2.5 transition-all ${
                  deliveryMode === "standard"
                    ? "border-ink bg-[#C7E9FF] shadow-hard-1"
                    : "border-ink/20 bg-paper hover:bg-paper/80"
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={deliveryMode === "standard"}
                  onChange={() => setDeliveryMode("standard")}
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                <div>
                  <div className="font-display text-[13px] font-extrabold text-ink">
                    🚚 Standard Courier Delivery (2-3 Days)
                  </div>
                  <div className="text-[11px] font-bold text-ink/80">
                    Safe delivery via courier partner across Tamil Nadu
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-tile border-2 p-2.5 transition-all ${
                  deliveryMode === "store_pickup"
                    ? "border-ink bg-[#FFE1A8] shadow-hard-1"
                    : "border-ink/20 bg-paper hover:bg-paper/80"
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  checked={deliveryMode === "store_pickup"}
                  onChange={() => setDeliveryMode("store_pickup")}
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                <div>
                  <div className="font-display text-[13px] font-extrabold text-ink">
                    🛍️ Store Pickup (Palayamkottai Road Store)
                  </div>
                  <div className="text-[11px] font-bold text-ink/80">
                    Pick up in 30 mins at 176, Palayamkottai Rd (FREE)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {session && (
            <label className="mb-3.5 flex items-center gap-2 cursor-pointer text-[13px] font-bold text-ink">
              <input
                type="checkbox"
                checked={saveThisAddress}
                onChange={(e) => setSaveThisAddress(e.target.checked)}
                className="h-4 w-4 accent-brand rounded border-ink"
              />
              <span>💾 Save this address for future orders</span>
            </label>
          )}

          {/* Gift mode — baby products are heavily gifted (showers, first birthdays) */}
          <div className="mb-3 rounded-tile border-2.5 border-ink bg-[#FFF6ED] p-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={isGift}
                onChange={(e) => setIsGift(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[#EC5D8A]"
              />
              <span className="font-display text-[14px] font-extrabold">
                {t("gift.isGift")} {(settings.gift_wrap_enabled ?? true) ? `(+${inr(settings.gift_wrap_fee ?? 30)})` : ""}
              </span>
            </label>
            {isGift && (
              <div className="mt-2.5">
                <p className="mb-1.5 text-[12px] text-mute">{t("gift.hint")}</p>
                <label className="block">
                  <span className="font-display text-[11px] font-extrabold uppercase text-mute">
                    {t("gift.noteLabel")}
                  </span>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
                    rows={2}
                    maxLength={GIFT_MESSAGE_MAX}
                    placeholder={t("gift.notePlaceholder")}
                    className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2 font-body text-[14px] outline-none focus:border-brand"
                  />
                </label>
                <div className="mt-0.5 text-right text-[11px] text-mute">
                  {giftMessage.length}/{GIFT_MESSAGE_MAX}
                </div>
              </div>
            )}
          </div>

          <Btn full disabled={!valid} onClick={goToPay}>
            {t("checkout.continue")} →
          </Btn>
        </div>
      ) : (
        <div>
          <h3 className="mb-3 font-display text-[24px] font-extrabold">
            {t("checkout.payment")} 💳
          </h3>
          {sameDay !== null && (
            <div className="mb-3 rounded-tile border-2.5 border-ink bg-[#D6E8B0] p-2.5 text-[13px] font-bold">
              {sameDay ? t("checkout.sameDayYes") : t("checkout.sameDayNo")}
            </div>
          )}
          <div className="mb-3.5 rounded-tile border-3 border-ink bg-paper p-3.5">
            <div className="flex justify-between text-[14px]">
              <span>{t("cart.subtotal")}</span>
              <span>{inr(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-[14px]">
              <span>{t("cart.delivery")}</span>
              <span>{delivery === 0 ? t("cart.freeShort") : inr(delivery)}</span>
            </div>
            {discount > 0 && (
              <div className="mt-1 flex justify-between text-[14px] text-[#7CB342]">
                <span>
                  {t("checkout.discount")} ({coupon?.code})
                </span>
                <span>−{inr(discount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between font-display text-[17px] font-extrabold text-brand">
              <span>{t("checkout.total")}</span>
              <span>{inr(total)}</span>
            </div>
          </div>

          {!coupon && (
            <div className="mb-3.5 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("checkout.coupon")}
                className="min-w-0 flex-1 rounded-pill border-2.5 border-ink px-4 py-[9px] font-body uppercase outline-none focus:border-brand"
              />
              <Btn small bg="#E4D6FF" color="#2B2140" onClick={applyCoupon}>
                {t("checkout.apply")}
              </Btn>
            </div>
          )}

          <div className="grid gap-2.5">
            <PaymentButton icon="📱" label={t("checkout.upi")} bg="#B9EBDD" onClick={() => payOnline("upi")} />
            <PaymentButton icon="💳" label={t("checkout.card")} bg="#C7E9FF" onClick={() => payOnline("card")} />
            <PaymentButton
              icon="💵"
              label={t("checkout.cod")}
              bg="#FFE1A8"
              disabled={!codAllowed}
              onClick={payCod}
            />
            {!codAllowed && (
              <p className="text-[12px] font-bold text-mute">
                {t("checkout.codLimit", { limit: inr(settings.cod_limit) })}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PaymentButton({
  icon,
  label,
  bg,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  bg: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: disabled ? "#D8D2E0" : bg }}
      className="btn-press flex items-center gap-3 rounded-2xl border-3 border-ink p-3.5 text-left font-display font-extrabold shadow-hard-4 disabled:shadow-none"
    >
      <span className="text-[24px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ── Public order tracking (order_no + phone, prefilled RSB- prefix & auto-fill) ─ */
export function TrackModal({
  onClose,
  myOrders = [],
}: {
  onClose: () => void;
  myOrders?: Order[];
}) {
  const { t } = useT();
  const { session } = useSession();
  const [numPart, setNumPart] = useState("");
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [found, setFound] = useState<Order | null | undefined>(undefined);

  const STAGES = ["confirmed", "packed", "out_for_delivery", "delivered"] as const;
  const statusIndex = (s: Order["status"]) =>
    s === "new" ? 0 : STAGES.indexOf(s as (typeof STAGES)[number]);

  // Strip RSB- prefix gracefully if pasted in full by customer
  const handleNumChange = (val: string) => {
    const cleaned = val.toUpperCase().replace(/^RSB-?/, "").trim();
    setNumPart(cleaned);
  };

  const handleTrack = async (overrideOrderNo?: string, overridePhone?: string) => {
    const targetNo = overrideOrderNo ?? (numPart ? `RSB-${numPart}` : "");
    const targetPhone = overridePhone ?? phone;
    if (!targetNo.trim() || !targetPhone.trim()) return;
    setFound(await trackOrderAction(targetNo, targetPhone));
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 font-display text-[24px] font-extrabold">{t("track.title")} 📦</h3>
      <p className="mb-3.5 text-[14px] text-mute">{t("track.sub")}</p>

      {/* Prefilled RSB- Badge Input */}
      <label className="mb-3 block">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          {t("track.orderNo")}
        </span>
        <div className="mt-1 flex items-center rounded-pill border-2.5 border-ink bg-paper px-3 py-1 shadow-hard-2 focus-within:border-brand">
          <span className="shrink-0 rounded-pill border-2 border-ink bg-[#FFE1A8] px-2.5 py-0.5 font-display text-[13px] font-extrabold text-ink">
            RSB-
          </span>
          <input
            type="text"
            value={numPart}
            onChange={(e) => handleNumChange(e.target.value)}
            placeholder="1001"
            className="min-w-0 flex-1 bg-transparent px-2.5 py-1 font-body text-[15px] font-bold text-ink outline-none"
          />
        </div>
      </label>

      <Field
        label={t("track.phone")}
        value={phone}
        onChange={setPhone}
        placeholder="98765 43210"
        inputMode="tel"
      />

      {/* Quick Select Recent Orders if signed in */}
      {session && myOrders.length > 0 && (
        <div className="mb-3.5">
          <span className="text-[12px] font-bold text-mute mb-1.5 block">
            {t("track.quickSelect")}
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto">
            {myOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  const digits = o.order_no.replace(/^RSB-?/, "");
                  setNumPart(digits);
                  void handleTrack(o.order_no, session.phone);
                }}
                className="rounded-pill border-2 border-ink bg-[#FFE1A8] px-3 py-1 text-[12px] font-extrabold hover:bg-[#D6E8B0] transition-all cursor-pointer shadow-hard-1"
              >
                📦 {o.order_no} ({inr(o.total)})
              </button>
            ))}
          </div>
        </div>
      )}

      <Btn full onClick={() => handleTrack()}>
        {t("track.cta")}
      </Btn>

      {found === null && (
        <p className="mt-3 text-[14px] font-extrabold text-[#E24B4A]">{t("track.notFound")}</p>
      )}

      {found && (
        <div className="mt-[18px]">
          <div className="font-display font-extrabold text-[16px]">
            {found.order_no} · <span className="text-brand">{inr(found.total)}</span>
          </div>
          <div className="mt-3">
            {STAGES.map((s, i) => {
              const reached = statusIndex(found.status) >= i;
              return (
                <div key={s} className="flex items-center gap-3 py-1.5">
                  <div
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2.5 border-ink text-[12px] font-extrabold"
                    style={{ background: reached ? "#D6E8B0" : "#fff" }}
                  >
                    {reached ? "✓" : i + 1}
                  </div>
                  <span className={reached ? "font-extrabold text-ink" : "text-mute"}>
                    {t(`track.status.${s}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Auth: phone OTP (Supabase live / simulated in demo) ─────────────────── */
/* ── Auth: Phone + Password Register & Login (Supabase DB verified) ───────── */
export function AuthModal({
  onClose,
  onSignedIn,
}: {
  onClose: () => void;
  onSignedIn: (name: string) => void;
}) {
  const { t } = useT();
  const {
    sendOtp,
    verifyOtp,
    signInWithPassword,
    registerWithPassword,
    signInWithEmail,
    registerWithEmail,
    changePasswordAndSignIn,
    changePasswordAndSignInWithEmail,
    isDemo,
  } = useSession();
  const [mode, setMode] = useState<"register" | "login" | "otp">("register");
  const [authType, setAuthType] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set only when a login attempt comes back needing a new password before a
  // session is issued (admin-reset temp password). Holds the already-typed
  // temp password so the customer isn't asked to retype it.
  const [pendingChange, setPendingChange] = useState<
    { identifier: string; tempPassword: string; kind: "phone" | "email"; name?: string } | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetPendingChange = () => {
    setPendingChange(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    const res =
      authType === "email"
        ? await registerWithEmail(name, email, password)
        : await registerWithPassword(name, phone, password);
    setLoading(false);
    if (res.ok) {
      onSignedIn(res.name || name || "Customer");
    } else if (
      res.message?.includes("ALREADY_REGISTERED") ||
      res.message?.toLowerCase().includes("already registered")
    ) {
      setMode("login");
      setError(`Account already exists for this ${authType}! Switched to Sign In.`);
    } else {
      setError(res.message ?? "Registration failed");
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const res =
      authType === "email"
        ? await signInWithEmail(email, password)
        : await signInWithPassword(phone, password);
    setLoading(false);
    if (res.ok) {
      onSignedIn(res.name || "Customer");
    } else if (res.mustChangePassword) {
      // Server actions re-clean/normalize the identifier internally, so the
      // raw form value is fine to carry forward here.
      setPendingChange({
        identifier: authType === "email" ? email : phone,
        tempPassword: password,
        kind: authType,
        name: res.name,
      });
    } else {
      setError(res.message ?? "Login failed");
    }
  };

  const handleChangePassword = async () => {
    if (!pendingChange) return;
    setLoading(true);
    setError(null);
    const res =
      pendingChange.kind === "email"
        ? await changePasswordAndSignInWithEmail(pendingChange.identifier, pendingChange.tempPassword, newPassword)
        : await changePasswordAndSignIn(pendingChange.identifier, pendingChange.tempPassword, newPassword);
    setLoading(false);
    if (res.ok) {
      onSignedIn(res.name || pendingChange.name || "Customer");
    } else {
      setError(res.message ?? "Could not update password");
    }
  };

  return (
    <Modal onClose={onClose}>
      {/* Primary Tab Switcher: Register vs Sign In */}
      <div className="mb-3 flex rounded-pill border-2.5 border-ink bg-paper p-1 shadow-hard-2">
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
            resetPendingChange();
          }}
          className={`flex-1 rounded-pill py-2 font-display text-[14px] font-extrabold transition-all cursor-pointer ${mode === "register" ? "bg-brand text-white shadow-hard-2" : "text-mute hover:text-ink"
            }`}
        >
          Register ✨
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            resetPendingChange();
          }}
          className={`flex-1 rounded-pill py-2 font-display text-[14px] font-extrabold transition-all cursor-pointer ${mode === "login" ? "bg-brand text-white shadow-hard-2" : "text-mute hover:text-ink"
            }`}
        >
          Sign In 🔑
        </button>
      </div>

      {/* Secondary Method Toggle: Phone vs Email */}
      {mode !== "otp" && (
        <div className="mb-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAuthType("phone");
              setError(null);
              resetPendingChange();
            }}
            className={`rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold transition-all cursor-pointer ${authType === "phone" ? "bg-[#FFE1A8] text-ink shadow-hard-2" : "bg-white text-mute hover:bg-paper"
              }`}
          >
            📱 Use Phone Number
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthType("email");
              setError(null);
              resetPendingChange();
            }}
            className={`rounded-pill border-2 border-ink px-3 py-1 text-[12px] font-extrabold transition-all cursor-pointer ${authType === "email" ? "bg-[#C7E9FF] text-ink shadow-hard-2" : "bg-white text-mute hover:bg-paper"
              }`}
          >
            ✉️ Use Email Address
          </button>
        </div>
      )}

      {mode === "register" && (
        <div>
          <h3 className="mb-1 font-display text-[22px] font-extrabold">Create Account ✨</h3>
          <p className="mb-3.5 text-[13px] text-mute">
            {authType === "email"
              ? "Register using your Email & Password (no SMS required)"
              : "Register using your Phone Number & Password"}
          </p>

          <Field
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Priya Raman"
          />

          {authType === "email" ? (
            <Field
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="priya@example.com"
              inputMode="email"
            />
          ) : (
            <Field
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              placeholder="98765 43210"
              inputMode="tel"
            />
          )}

          <Field
            label="Set Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Min 6 characters"
          />

          <div className="mt-4">
            <Btn
              full
              disabled={
                loading ||
                !name.trim() ||
                (authType === "phone" ? phone.replace(/\D/g, "").length < 10 : !email.includes("@")) ||
                password.length < 6
              }
              onClick={handleRegister}
            >
              {loading ? "Creating Account..." : "Create Account ✨"}
            </Btn>
          </div>

          {/* OTP sign-in was reachable only from the Sign In tab, so anyone who
              opened the modal (which starts on Register) never saw the option. */}
          <div className="mt-3.5 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setError(null);
                resetPendingChange();
              }}
              className="text-[12px] font-extrabold text-mute underline hover:text-ink transition-colors cursor-pointer"
            >
              Or sign in via SMS OTP →
            </button>
          </div>
        </div>
      )}

      {mode === "login" && pendingChange && (
        <div className="rounded-card border-3 border-ink bg-[#FFF6ED] p-4 shadow-hard-4 space-y-3">
          <div>
            <h3 className="mb-0.5 font-display text-[22px] font-extrabold text-ink">Set a New Password 🔑</h3>
            <p className="text-[13px] text-mute font-medium">
              Your account was reset with a temporary password. Choose a new one to finish signing in.
            </p>
          </div>

          <Field
            label="New Password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Min 6 characters"
          />
          <Field
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter new password"
          />

          <div className="pt-1">
            <Btn
              full
              disabled={
                loading ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword ||
                newPassword === pendingChange.tempPassword
              }
              onClick={handleChangePassword}
            >
              {loading ? "Saving..." : "Save & Sign In 🔑"}
            </Btn>
          </div>
          {newPassword && newPassword === pendingChange.tempPassword && (
            <p className="text-[12px] font-bold text-[#E24B4A]">
              Choose a password different from your temporary one.
            </p>
          )}
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[12px] font-bold text-[#E24B4A]">Passwords don&apos;t match.</p>
          )}

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={resetPendingChange}
              className="text-[12px] font-extrabold text-mute underline hover:text-ink transition-colors cursor-pointer"
            >
              ← Cancel and go back
            </button>
          </div>
        </div>
      )}

      {mode === "login" && !pendingChange && (
        <div className="rounded-card border-3 border-ink bg-[#FFFDF7] p-4 shadow-hard-4 space-y-3">
          <div>
            <h3 className="mb-0.5 font-display text-[22px] font-extrabold text-ink">Welcome Back! 🛍️</h3>
            <p className="text-[13px] text-mute font-medium">
              {authType === "email"
                ? "Sign in with your registered email address & password"
                : "Sign in with your registered phone number & password"}
            </p>
          </div>

          {authType === "email" ? (
            <Field
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="priya@example.com"
              inputMode="email"
            />
          ) : (
            <Field
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              placeholder="98765 43210"
              inputMode="tel"
            />
          )}

          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
          />

          <div className="pt-0.5 text-right">
            <a
              href={`https://wa.me/919442054101?text=${encodeURIComponent(
                `Hi Rasi Mom & Baby, I forgot my account password for mobile: ${phone || "[your phone]"}. Please help me reset it.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-pill border-2 border-ink bg-[#D6E8B0] px-3 py-1 font-display text-[12px] font-extrabold text-ink shadow-hard-2 hover:bg-[#25D366] hover:text-white transition-all cursor-pointer"
            >
              <span>💬 Forgot password? Reset via WhatsApp</span>
            </a>
          </div>

          <div className="pt-1">
            <Btn
              full
              disabled={
                loading ||
                (authType === "phone" ? phone.replace(/\D/g, "").length < 10 : !email.includes("@")) ||
                !password
              }
              onClick={handleLogin}
            >
              {loading ? "Signing in..." : "Sign In 🔑"}
            </Btn>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setError(null);
                resetPendingChange();
              }}
              className="text-[12px] font-extrabold text-mute underline hover:text-ink transition-colors cursor-pointer"
            >
              Or sign in via SMS OTP →
            </button>
          </div>
        </div>
      )}

      {mode === "otp" && (
        <div>
          <h3 className="mb-1 font-display text-[22px] font-extrabold">SMS OTP Sign In 📱</h3>
          <p className="mb-3.5 text-[13px] text-mute">Sign in using a one-time verification code</p>
          {otpStep === "phone" ? (
            <div>
              <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="98765 43210" inputMode="tel" />
              {/* The button silently greys out below 10 digits, which reads as
                  "the OTP option is broken". Say what it is waiting for. */}
              <p className="mb-3 text-[12px] text-mute">
                {phone.replace(/\D/g, "").length < 10
                  ? `Enter your 10-digit mobile number (${phone.replace(/\D/g, "").length}/10) to receive a code.`
                  : "We'll text a 6-digit code to this number."}
              </p>
              <Btn
                full
                disabled={otpSending || phone.replace(/\D/g, "").length < 10}
                onClick={async () => {
                  setOtpSending(true);
                  setError(null);
                  const res = await sendOtp(phone);
                  setOtpSending(false);
                  if (res.ok) {
                    setOtpStep("otp");
                  } else setError(res.message ?? "Failed to send OTP");
                }}
              >
                {otpSending ? "Sending…" : "Send OTP →"}
              </Btn>
            </div>
          ) : (
            <div>
              <Field label="Enter OTP Code" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} />
              {isDemo ? (
                <p className="mb-3 text-[12px] text-mute">{t("auth.demoOtp")}</p>
              ) : (
                <p className="mb-3 text-[12px] text-mute">
                  Sent to +91 {phone.replace(/\D/g, "").slice(-10)}. It can take up to a minute.
                </p>
              )}
              <Btn
                full
                disabled={otpVerifying || otp.length < 6}
                onClick={async () => {
                  setOtpVerifying(true);
                  setError(null);
                  const res = await verifyOtp(phone, otp, name);
                  setOtpVerifying(false);
                  if (res.ok) onSignedIn(name || "Customer");
                  else setError(res.message ?? "Invalid OTP code");
                }}
              >
                {otpVerifying ? "Verifying…" : "Verify & Sign In ✓"}
              </Btn>
              {/* No way back to the number screen meant a typo'd phone was a
                  dead end — the code would never arrive and nothing explained why. */}
              <button
                type="button"
                onClick={() => {
                  setOtpStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="mt-3 w-full text-[12px] font-extrabold text-mute underline hover:text-ink transition-colors cursor-pointer"
              >
                Didn&apos;t get a code? Change number or resend
              </button>
            </div>
          )}

          <div className="mt-3.5 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                resetPendingChange();
              }}
              className="text-[12px] font-extrabold text-mute underline hover:text-ink transition-colors cursor-pointer"
            >
              ← Back to Password Login
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[13px] font-bold text-[#E24B4A] text-center">{error}</p>}
    </Modal>
  );
}

/* ── Customer Profile Modal ────────────────────────────────────────────────── */
export function ProfileModal({
  onClose,
  onSignOut,
  onOpenOrders,
  onOpenRegistry,
}: {
  onClose: () => void;
  onSignOut: () => void;
  onOpenOrders?: () => void;
  onOpenRegistry?: () => void;
}) {
  const { session } = useSession();
  const { t } = useT();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  useEffect(() => {
    let alive = true;
    myAddressesAction()
      .then((a) => {
        if (alive) setAddresses(a ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const primaryAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-ink/10">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-3 border-ink bg-[#FFE1A8] text-[26px] shadow-hard-3">
          👤
        </div>
        <div>
          <h3 className="font-display text-[22px] font-extrabold text-ink leading-tight">
            {session?.name || "Customer Profile"}
          </h3>
          <span className="inline-block rounded-pill border-2 border-ink bg-[#C7E9FF] px-2.5 py-0.5 text-[11px] font-extrabold text-ink mt-0.5">
            VERIFIED CUSTOMER
          </span>
        </div>
      </div>

      <div className="space-y-3 font-body">
        {/* Mobile Number */}
        <div className="rounded-tile border-2.5 border-ink bg-paper p-3 shadow-hard-2">
          <div className="text-[11px] font-extrabold uppercase text-mute font-display">
            📱 Mobile Number
          </div>
          <div className="mt-0.5 text-[15px] font-bold text-ink">
            {session?.phone ? `+91 ${session.phone}` : "Not linked"}
          </div>
        </div>

        {/* Email Address */}
        <div className="rounded-tile border-2.5 border-ink bg-paper p-3 shadow-hard-2">
          <div className="text-[11px] font-extrabold uppercase text-mute font-display">
            📧 Email Address
          </div>
          <div className="mt-0.5 text-[15px] font-bold text-ink">
            {session?.email || "No email linked"}
          </div>
        </div>

        {/* Saved Delivery Address — the customer's real saved address, not a
            placeholder. Falls back to a genuine empty state. */}
        <div className="rounded-tile border-2.5 border-ink bg-paper p-3 shadow-hard-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase text-mute font-display">
              📍 Saved Delivery Address
            </div>
            {primaryAddress && (
              <span className="rounded-pill bg-[#FFCBD9] px-2 py-0.5 text-[10px] font-extrabold border border-ink text-ink">
                {primaryAddress.is_default ? "PRIMARY" : "SAVED"}
              </span>
            )}
          </div>
          {primaryAddress ? (
            <div className="mt-1 text-[14px] font-semibold text-ink leading-relaxed">
              {primaryAddress.name ? `${primaryAddress.name}, ` : ""}
              {primaryAddress.line}, {primaryAddress.city} — {primaryAddress.pin}
            </div>
          ) : (
            <div className="mt-1 text-[13px] text-mute font-medium">
              No saved address yet — you can add one at checkout.
            </div>
          )}
        </div>

        {/* Account Activity Summary & Perks */}
        <div className="rounded-tile border-2.5 border-ink bg-[#FFFDF7] p-3 shadow-hard-2">
          <div className="text-[11px] font-extrabold uppercase text-mute font-display mb-1.5">
            📦 Customer Status & Perks
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="bg-white p-2 rounded-tile border-2 border-ink text-center">
              <div className="font-extrabold text-brand">{t("perks.freeDelivery")}</div>
              <div className="text-[10px] text-mute">Orders above ₹999</div>
            </div>
            <div className="bg-white p-2 rounded-tile border-2 border-ink text-center">
              <div className="font-extrabold text-[#9A6BE0]">{t("perks.storeName")}</div>
            </div>
          </div>
        </div>

        {/* Change / Set Permanent Password Box */}
        <ChangePasswordBox />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {onOpenOrders && (
          <Btn
            full
            bg="#D6E8B0"
            color="#2B2140"
            onClick={() => {
              onClose();
              onOpenOrders();
            }}
          >
            📦 View My Orders
          </Btn>
        )}
        {onOpenRegistry && (
          <Btn
            full
            bg="#FFE1A8"
            color="#2B2140"
            onClick={() => {
              onClose();
              onOpenRegistry();
            }}
          >
            🎁 Create Baby Shower Registry
          </Btn>
        )}
        <Btn full bg="#FFCBD9" color="#2B2140" onClick={onSignOut}>
          Sign Out 🚪
        </Btn>
      </div>
    </Modal>
  );
}

function ChangePasswordBox() {
  const [open, setOpen] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass || newPass.length < 6) {
      setStatus("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    setStatus(null);
    const res = await updateMyPasswordAction(newPass);
    setSaving(false);
    if (res.ok) {
      setStatus("✓ New password saved successfully!");
      setNewPass("");
    } else {
      setStatus(res.error ?? "Failed to save password.");
    }
  };

  return (
    <div className="rounded-tile border-2.5 border-ink bg-[#FFFDF7] p-3 shadow-hard-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between font-display text-[13px] font-extrabold text-ink cursor-pointer"
      >
        <span>🔑 Change / Set Personal Password</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form onSubmit={handleSave} className="mt-3 space-y-2">
          <input
            type="password"
            placeholder="Enter new permanent password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full rounded-pill border-2 border-ink px-3.5 py-1.5 text-[13px] font-semibold outline-none bg-white focus:border-brand"
          />
          <Btn small full disabled={saving}>
            {saving ? "Saving…" : "Save New Password ✓"}
          </Btn>
          {status && (
            <p className={`text-[12px] font-extrabold ${status.startsWith("✓") ? "text-emerald-700" : "text-red-600"}`}>
              {status}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/* ── Wishlist view modal ─────────────────────────────────────────────────── */
export function WishlistModal({
  products,
  onClose,
  onAddToCart,
  onOpenProduct,
}: {
  products: Product[];
  onClose: () => void;
  onAddToCart: (itemId: string) => void;
  onOpenProduct: (p: Product) => void;
}) {
  const { t, lang } = useT();
  const wishlist = useWishlist();

  const savedProducts = products.filter((p) => wishlist.has(p.id));

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-3.5 pr-10">
        <span className="text-[24px]">❤️</span>
        <h3 className="font-display text-[22px] font-extrabold text-ink">{t("wishlist.title")}</h3>
        <span className="rounded-pill bg-[#A0D2EB] border-2 border-ink px-2.5 py-0.5 font-display text-[12px] font-extrabold text-ink shadow-hard-1">
          {savedProducts.length} items
        </span>
      </div>

      {savedProducts.length === 0 ? (
        <div className="py-8 text-center bg-[#F0F7FF] rounded-card border-2.5 border-ink p-4 shadow-hard-2">
          <div className="text-[36px] mb-2">🎁</div>
          <div className="font-display font-extrabold text-[16px] text-ink">Your wishlist is empty!</div>
          <p className="text-[13px] text-mute mt-1 mb-4 font-medium">Tap the heart icon on any product card to save it for later.</p>
          <Btn small onClick={onClose}>Start Shopping 🛍️</Btn>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
          {savedProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-tile border-2.5 border-ink bg-paper p-2.5 shadow-hard-2"
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProduct(p);
                }}
                className="shrink-0 cursor-pointer"
              >
                <Art emoji={p.emoji} bg={p.tile_color} h={54} image={p.images[0]} alt={p.name_en} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-sans text-[13px] font-bold text-ink line-clamp-1">
                  {lang === "ta" ? p.name_ta : p.name_en}
                </div>
                <div className="font-display text-[14px] font-extrabold text-brand mt-0.5">
                  {inr(p.price)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onAddToCart(p.id)}
                  className="btn-press rounded-pill border-2 border-ink bg-[#FF5A78] text-white px-2.5 py-1 text-[11px] font-display font-extrabold shadow-hard-1"
                >
                  + Cart
                </button>
                <button
                  type="button"
                  onClick={() => wishlist.toggle(p.id)}
                  className="btn-press flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-[#FFCBD9] text-[12px] font-bold text-ink shadow-hard-1 leading-none cursor-pointer"
                  title="Remove from Wishlist"
                >
                  <span className="relative -top-[1.5px]">✕</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

