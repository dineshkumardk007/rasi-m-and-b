"use client";

import { useState } from "react";
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
  const [pinResult, setPinResult] = useState<"same-day" | "tomorrow" | "courier" | null>(null);
  const meta = MILESTONE_META[p.milestone];
  const name = lang === "ta" ? p.name_ta : p.name_en;
  const desc = lang === "ta" ? p.description_ta : p.description_en;

  const checkPin = async () => {
    if (!/^\d{6}$/.test(pin)) return;
    const res = await checkPinAction(pin);
    setPinResult(res.sameDayNow ? "same-day" : res.serviceable ? "tomorrow" : "courier");
  };

  return (
    <Modal onClose={onClose} wide>
      <Art emoji={p.emoji} bg={p.tile_color} h={190} image={p.images[0]} alt={p.name_en} />
      <h3 className="mt-3.5 font-display text-[24px] font-extrabold">{name}</h3>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[22px] font-extrabold text-brand">{inr(p.price)}</span>
        {p.mrp > p.price && (
          <span className="text-[14px] text-[#B4AABF] line-through">{inr(p.mrp)}</span>
        )}
        <Badge bg={meta.bg}>{lang === "ta" ? meta.shortTa : meta.shortEn}</Badge>
        {p.brand && <Badge bg="#C7E9FF">{p.brand}</Badge>}
      </div>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-mute">{desc}</p>

      {p.ingredients && (
        <div className="mt-3 rounded-tile border-2.5 border-ink bg-paper p-3">
          <div className="font-display text-[13px] font-extrabold uppercase text-mute">
            {t("product.ingredients")}
          </div>
          <p className="mt-1 text-[13px] text-ink">{p.ingredients}</p>
        </div>
      )}

      {/* PIN delivery estimate */}
      <div className="mt-3 rounded-tile border-2.5 border-ink bg-paper p-3">
        <div className="font-display text-[13px] font-extrabold uppercase text-mute">
          {t("product.checkPin")}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t("product.pinPlaceholder")}
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-pill border-2.5 border-ink px-4 py-2 font-body text-[14px] outline-none"
          />
          <Btn small bg="#E4D6FF" color="#2B2140" onClick={checkPin}>
            {t("product.pinCheck")}
          </Btn>
        </div>
        {pinResult && (
          <p className="mt-2 text-[13px] font-bold">
            {pinResult === "same-day"
              ? t("product.pinSameDay")
              : pinResult === "tomorrow"
                ? t("product.pinTomorrow")
                : t("product.pinCourier")}
          </p>
        )}
      </div>

      <div className="mt-3.5">
        {p.stock > 0 ? (
          <Btn full onClick={onAdd}>
            {t("shop.addToCart")} — {inr(p.price)}
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
            : t("checkout.couponNotFound"),
      );
      return null;
    }
    return result.order;
  };

  const payOnline = async () => {
    if (isDemo) {
      // Demo simulation, mirroring the reference's 1.4s processing screen.
      setPaying(true);
      window.setTimeout(async () => {
        const order = await placeWith("razorpay");
        if (order) onPlaced(order);
      }, 1400);
      return;
    }
    const order = await placeWith("razorpay");
    if (!order) return;
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPaying(false);
      notify("Razorpay unavailable — try Cash on delivery");
      return;
    }
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
      modal: { ondismiss: () => setPaying(false) },
    }).open();
  };

  const payCod = async () => {
    const order = await placeWith("cod");
    if (order) onPlaced(order);
  };

  return (
    <Modal onClose={onClose}>
      {step === "address" && (
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
      )}

      {step === "pay" && (
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

          {paying ? (
            <div className="p-8 text-center">
              <div className="text-[40px]">💳</div>
              <p className="mt-2.5 font-display font-extrabold">{t("checkout.processing")}</p>
              {isDemo && <p className="mt-1 text-[12px] text-mute">{t("checkout.demo")}</p>}
            </div>
          ) : (
            <div className="grid gap-2.5">
              <PaymentButton icon="📱" label={t("checkout.upi")} bg="#B9EBDD" onClick={payOnline} />
              <PaymentButton icon="💳" label={t("checkout.card")} bg="#C7E9FF" onClick={payOnline} />
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
          )}
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

/* ── Public order tracking (order_no + phone, no login) ──────────────────── */
export function TrackModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [no, setNo] = useState("");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<Order | null | undefined>(undefined);

  const STAGES = ["confirmed", "packed", "out_for_delivery", "delivered"] as const;
  const statusIndex = (s: Order["status"]) =>
    s === "new" ? 0 : STAGES.indexOf(s as (typeof STAGES)[number]);

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 font-display text-[24px] font-extrabold">{t("track.title")} 📦</h3>
      <p className="mb-3.5 text-[14px] text-mute">{t("track.sub")}</p>
      <Field label={t("track.orderNo")} value={no} onChange={setNo} placeholder="RSB-1001" />
      <Field label={t("track.phone")} value={phone} onChange={setPhone} placeholder="98765 43210" inputMode="tel" />
      <Btn full onClick={async () => setFound(await trackOrderAction(no, phone))}>
        {t("track.cta")}
      </Btn>
      {found === null && (
        <p className="mt-3 text-[14px] font-extrabold text-[#E24B4A]">{t("track.notFound")}</p>
      )}
      {found && (
        <div className="mt-[18px]">
          <div className="font-display font-extrabold">
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
export function AuthModal({
  onClose,
  onSignedIn,
}: {
  onClose: () => void;
  onSignedIn: (name: string) => void;
}) {
  const { t } = useT();
  const { sendOtp, verifyOtp, isDemo } = useSession();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-1 font-display text-[24px] font-extrabold">{t("auth.welcome")}</h3>
      <p className="mb-3.5 text-[14px] text-mute">{t("auth.sub")}</p>
      {step === "phone" && (
        <div>
          <Field label={t("auth.name")} value={name} onChange={setName} placeholder="Priya Raman" />
          <Field label={t("auth.phone")} value={phone} onChange={setPhone} placeholder="98765 43210" inputMode="tel" />
          <Btn
            full
            onClick={async () => {
              const res = await sendOtp(phone);
              if (res.ok) {
                setError(null);
                setStep("otp");
              } else setError(res.message ?? "error");
            }}
          >
            {t("auth.sendOtp")}
          </Btn>
        </div>
      )}
      {step === "otp" && (
        <div>
          <Field label={t("auth.otp")} value={otp} onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} />
          {isDemo && <p className="mb-3 text-[12px] text-mute">{t("auth.demoOtp")}</p>}
          <Btn
            full
            onClick={async () => {
              const res = await verifyOtp(phone, otp, name);
              if (res.ok) onSignedIn(name || "Customer");
              else setError(res.message ?? "error");
            }}
          >
            {t("auth.verify")}
          </Btn>
        </div>
      )}
      {error && <p className="mt-3 text-[13px] font-bold text-[#E24B4A]">{error}</p>}
    </Modal>
  );
}
