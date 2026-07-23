"use client";

import { useState, useEffect } from "react";
import type { Order, Product, Review, StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useSession } from "@/lib/store/SessionProvider";
import { MILESTONE_META, inr } from "@/lib/constants";
import { Art, Badge, Btn, Field, Modal, Stars } from "@/components/ui";
import {
  checkCouponAction,
  checkPinAction,
  submitOrderAction,
  submitReviewAction,
  trackOrderAction,
} from "@/app/actions";
import { notifyRestockAction } from "@/app/customer-actions";
import { ShareButton } from "./ShareButton";

/* ── Product quick view ──────────────────────────────────────────────────── */
export function ProductModal({
  product: p,
  reviews,
  onClose,
  onAdd,
  notify,
}: {
  product: Product;
  reviews: Review[];
  onClose: () => void;
  onAdd: () => void;
  notify: (m: string) => void;
}) {
  const { t, lang } = useT();
  const { session } = useSession();
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(session?.name ?? "");
  const [rating, setRating] = useState(5);
  const [pin, setPin] = useState("");
  const [pinResult, setPinResult] = useState<
    "same-day" | "tomorrow" | "courier" | "unserviceable" | null
  >(null);
  const meta = MILESTONE_META[p.milestone];
  const name = lang === "ta" ? p.name_ta : p.name_en;
  const desc = lang === "ta" ? p.description_ta : p.description_en;

  const checkPin = async () => {
    if (!/^\d{6}$/.test(pin)) return;
    const res = await checkPinAction(pin);
    setPinResult(res.sameDayNow ? "same-day" : res.serviceable ? "tomorrow" : "unserviceable");
  };

  return (
    <Modal onClose={onClose} wide>
      <Art emoji={p.emoji} bg={p.tile_color} h={200} image={p.images[0]} alt={p.name_en} />

      {/* Title & Price Header Card — Mild Soft Cream Tint */}
      <div className="mt-3.5 rounded-card border-2.5 border-ink bg-[#FFF6ED] p-3.5 shadow-sm backdrop-blur-sm">
        <h3 className="font-display text-[24px] sm:text-[26px] font-extrabold text-ink leading-snug">{name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="font-display text-[24px] font-extrabold text-brand">{inr(p.price)}</span>
          {p.mrp > p.price && (
            <>
              <span className="text-[14px] text-[#B4AABF] line-through">{inr(p.mrp)}</span>
              <Badge bg="#D6E8B0">
                SAVE {inr(p.mrp - p.price)}
              </Badge>
            </>
          )}
          <Badge bg={meta.bg}>{lang === "ta" ? meta.shortTa : meta.shortEn}</Badge>
          {p.brand && <Badge bg="#C7E9FF">{p.brand}</Badge>}
        </div>
        <p className="mt-2.5 text-[14px] sm:text-[15px] leading-[1.55] text-mute">{desc}</p>
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
            className="min-w-0 flex-1 rounded-pill border-2.5 border-ink bg-paper px-4 py-2 font-body text-[14px] outline-none shadow-inner"
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
      <div className="mt-4 flex flex-col gap-2.5">
        {p.stock > 0 ? (
          <Btn full onClick={onAdd}>
            🛒 {t("shop.addToCart")} — {inr(p.price)}
          </Btn>
        ) : (
          <Btn
            full
            bg="#FFE1A8"
            color="#2B2140"
            onClick={async () => {
              await notifyRestockAction(p.id, session?.phone ?? null);
              notify(t("product.notifySaved"));
            }}
          >
            🔔 {t("product.notifyMe")}
          </Btn>
        )}

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
      </div>

      {/* Reviews */}
      <div className="mt-[22px]">
        <h4 className="mb-2 font-display font-extrabold">
          {t("product.reviews")} ({reviews.length}) ⭐
        </h4>
        {reviews.length === 0 && (
          <p className="text-[14px] text-mute">{t("product.noReviews")}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="mb-2 rounded-tile border-3 border-ink bg-paper p-3 text-[14px]">
            <Stars n={r.rating} />{" "}
            <span className="font-display font-extrabold">{r.author_name}</span>
            <p className="mt-1 text-mute">{r.text}</p>
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
              className="mb-2 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[14px] outline-none"
            />
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t("product.writeReview")}
            className="w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[14px] outline-none"
          />
          <div className="mt-2">
            <Btn
              small
              onClick={async () => {
                if (!text.trim()) return;
                await submitReviewAction(p.id, author || session?.name || "", rating, text);
                setText("");
                notify(t("product.reviewPending"));
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
  );
}

/* ── Cart ────────────────────────────────────────────────────────────────── */
export interface CartItemView {
  itemId: string;
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
  setQty: (id: string, qty: number) => void;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const { t } = useT();
  const threshold = settings.free_delivery_threshold;
  const free = subtotal > threshold;
  const progress = Math.min(100, Math.round((subtotal / (threshold + 1)) * 100));
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3.5 font-display text-[24px] font-extrabold">{t("cart.title")} 🛒</h3>
      {items.length === 0 && <p className="text-mute">{t("cart.empty")}</p>}
      {items.map((c) => (
        <div
          key={c.itemId}
          className="flex items-center gap-3 border-b-2 border-dashed border-[#E5DBCC] py-2.5"
        >
          <div className="w-12 shrink-0">
            <Art emoji={c.emoji} bg={c.bg} h={48} isBundle={c.isBundle} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold">{c.name}</div>
            <div className="font-display text-[14px] font-extrabold text-brand">
              {inr(c.price)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty(c.itemId, c.qty - 1)}
              className="h-7 w-7 rounded-full border-2.5 border-ink bg-[#F2EAE0] font-extrabold"
              aria-label="decrease"
            >
              −
            </button>
            <span className="w-4 text-center font-extrabold">{c.qty}</span>
            <button
              onClick={() => setQty(c.itemId, Math.min(c.qty + 1, c.maxStock))}
              className="h-7 w-7 rounded-full border-2.5 border-ink bg-[#D6E8B0] font-extrabold"
              aria-label="increase"
            >
              +
            </button>
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-[14px]">
            <span>{t("cart.subtotal")}</span>
            <span className="font-extrabold">{inr(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-[14px]">
            <span>{t("cart.delivery")}</span>
            <span className="font-extrabold">{free ? t("cart.free") : inr(49)}</span>
          </div>
          {!free && (
            <div className="mt-2">
              {/* free-delivery progress bar */}
              <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
                <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 text-[12px] text-mute">
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
          <span>Amount to Pay</span>
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
  onPlaced: (order: Order) => void;
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
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payStage, setPayStage] = useState<"order" | "sdk" | "gateway" | "confirming">("order");
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "razorpay">("razorpay");
  const [sameDay, setSameDay] = useState<boolean | null>(null);

  const valid =
    f.name.trim() &&
    f.phone.replace(/\D/g, "").length >= 10 &&
    f.line.trim() &&
    /^\d{6}$/.test(f.pin);

  const delivery = subtotal > settings.free_delivery_threshold ? 0 : 49;
  const discount = coupon?.discount ?? 0;
  const total = subtotal + delivery - discount;
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
    const result = await submitOrderAction({
      items: items.map((c) => ({ itemId: c.itemId, qty: c.qty })),
      address: { name: f.name, phone: f.phone, line: f.line, city: f.city, pin: f.pin },
      payment_method: method,
      coupon_code: coupon?.code,
      language: lang,
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
              : t("checkout.couponNotFound"),
      );
      return null;
    }
    return result.order;
  };

  const payOnline = async (method: "upi" | "card" | "razorpay" = "razorpay") => {
    setSelectedMethod(method);
    setPaying(true);
    setPayStage("order");

    if (isDemo) {
      // Demo simulation, mirroring the reference's 1.4s processing screen.
      window.setTimeout(async () => {
        const order = await placeWith("razorpay");
        if (order) onPlaced(order);
        else setPaying(false);
      }, 1400);
      return;
    }

    const order = await placeWith("razorpay");
    if (!order) {
      setPaying(false);
      return;
    }

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
        await fetch("/api/razorpay/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order_no: order.order_no, ...response }),
        });
        onPlaced(order);
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
    const order = await placeWith("cod");
    if (order) onPlaced(order);
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
          {!session && (
            <div className="mb-3 rounded-tile border-2.5 border-ink bg-[#FFE1A8] p-3 text-[14px]">
              {t("checkout.guest")}
            </div>
          )}
          <Field label={t("checkout.name")} value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Priya Raman" />
          <Field label={t("checkout.phone")} value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="98765 43210" inputMode="tel" />
          <Field label={t("checkout.address")} value={f.line} onChange={(v) => setF({ ...f, line: v })} placeholder="12, Beach Road" />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("checkout.city")} value={f.city} onChange={(v) => setF({ ...f, city: v })} />
            <Field label={t("checkout.pin")} value={f.pin} onChange={(v) => setF({ ...f, pin: v.replace(/\D/g, "").slice(0, 6) })} placeholder="628001" inputMode="numeric" maxLength={6} />
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
                className="min-w-0 flex-1 rounded-pill border-2.5 border-ink px-4 py-[9px] font-body uppercase outline-none"
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      setError(res.message ?? "Login failed");
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
        </div>
      )}

      {mode === "login" && (
        <div>
          <h3 className="mb-1 font-display text-[22px] font-extrabold">Welcome Back! 🛍️</h3>
          <p className="mb-3.5 text-[13px] text-mute">
            {authType === "email"
              ? "Sign in with your registered email address & password"
              : "Sign in with your registered phone number & password"}
          </p>

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

          <div className="mt-4">
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

          <div className="mt-3.5 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setError(null);
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
              <Btn
                full
                disabled={phone.replace(/\D/g, "").length < 10}
                onClick={async () => {
                  const res = await sendOtp(phone);
                  if (res.ok) {
                    setError(null);
                    setOtpStep("otp");
                  } else setError(res.message ?? "Failed to send OTP");
                }}
              >
                Send OTP →
              </Btn>
            </div>
          ) : (
            <div>
              <Field label="Enter OTP Code" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} />
              {isDemo && <p className="mb-3 text-[12px] text-mute">{t("auth.demoOtp")}</p>}
              <Btn
                full
                onClick={async () => {
                  const res = await verifyOtp(phone, otp, name);
                  if (res.ok) onSignedIn(name || "Customer");
                  else setError(res.message ?? "Invalid OTP code");
                }}
              >
                Verify & Sign In ✓
              </Btn>
            </div>
          )}

          <div className="mt-3.5 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
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
}: {
  onClose: () => void;
  onSignOut: () => void;
  onOpenOrders?: () => void;
}) {
  const { session } = useSession();

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

        {/* Saved Delivery Address */}
        <div className="rounded-tile border-2.5 border-ink bg-paper p-3 shadow-hard-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase text-mute font-display">
              📍 Saved Delivery Address
            </div>
            <span className="rounded-pill bg-[#FFCBD9] px-2 py-0.5 text-[10px] font-extrabold border border-ink text-ink">
              PRIMARY
            </span>
          </div>
          <div className="mt-1 text-[14px] font-semibold text-ink leading-relaxed">
            Thoothukudi, Tamil Nadu — 628001
          </div>
          <div className="mt-1 text-[12px] text-mute font-medium">
            ⚡ Eligible for Express Same-Day Delivery
          </div>
        </div>

        {/* Account Activity Summary & Perks */}
        <div className="rounded-tile border-2.5 border-ink bg-[#FFFDF7] p-3 shadow-hard-2">
          <div className="text-[11px] font-extrabold uppercase text-mute font-display mb-1.5">
            📦 Customer Status & Perks
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="bg-white p-2 rounded-tile border-2 border-ink text-center">
              <div className="font-extrabold text-brand">Free Delivery</div>
              <div className="text-[10px] text-mute">Orders above ₹999</div>
            </div>
            <div className="bg-white p-2 rounded-tile border-2 border-ink text-center">
              <div className="font-extrabold text-[#9A6BE0]">Thoothukudi Store</div>
              <div className="text-[10px] text-mute">Local Customer</div>
            </div>
          </div>
        </div>
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
        <Btn full bg="#FFCBD9" color="#2B2140" onClick={onSignOut}>
          Sign Out 🚪
        </Btn>
      </div>
    </Modal>
  );
}
