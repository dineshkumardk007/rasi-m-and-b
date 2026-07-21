"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Bundle, Order, Product, Review, StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useCart } from "@/lib/store/CartProvider";
import { useSession } from "@/lib/store/SessionProvider";
import { inr } from "@/lib/constants";
import { Badge, Card, Modal, Pill, Toast, Btn } from "@/components/ui";
import { myOrdersAction } from "@/app/customer-actions";
import {
  BundlesSection,
  BuyAgain,
  CategoryGrid,
  Hero,
  Marquee,
  ShopGrid,
  Trust,
} from "./sections";
import { AuthModal, CartModal, CheckoutModal, ProductModal, TrackModal } from "./modals";
import { Ribbon } from "./Ribbon";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";

export interface StorefrontProps {
  products: Product[];
  bundles: Bundle[];
  reviews: Review[];
  settings: StoreSettings;
  isDemo: boolean;
}

export type ModalState =
  | { type: "product"; product: Product }
  | { type: "cart" }
  | { type: "checkout" }
  | { type: "orderDone"; order: Order }
  | { type: "track" }
  | { type: "auth" }
  | null;

export default function Storefront(props: StorefrontProps) {
  const { products, bundles, reviews, settings, isDemo } = props;
  const { t, lang, setLang } = useT();
  const cart = useCart();
  const { session, signOut } = useSession();

  const [route, setRoute] = useState<"home" | "orders">("home");
  const [milestone, setMilestone] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const notify = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.stock >= 0 &&
          (milestone === "all" || p.milestone === milestone) &&
          (category === "all" || p.categories.includes(category as never)) &&
          (!query ||
            p.name_en.toLowerCase().includes(query.toLowerCase()) ||
            p.name_ta.includes(query)),
      ),
    [products, milestone, category, query],
  );

  const addToCart = useCallback(
    (itemId: string) => {
      cart.add(itemId);
      notify(t("toast.addedToCart"));
    },
    [cart, notify, t],
  );

  // Resolve cart lines against the catalog
  const cartItems = useMemo(
    () =>
      cart.lines
        .map((l) => {
          if (l.itemId.startsWith("b:")) {
            const b = bundles.find((x) => x.id === l.itemId.slice(2));
            return b
              ? {
                  itemId: l.itemId,
                  qty: l.qty,
                  name: lang === "ta" ? b.name_ta : b.name_en,
                  price: b.bundle_price,
                  emoji: b.emoji,
                  bg: b.tile_color,
                  maxStock: 99,
                  isBundle: true,
                }
              : null;
          }
          const p = products.find((x) => x.id === l.itemId);
          return p
            ? {
                itemId: l.itemId,
                qty: l.qty,
                name: lang === "ta" ? p.name_ta : p.name_en,
                price: p.price,
                emoji: p.emoji,
                bg: p.tile_color,
                maxStock: p.stock,
                isBundle: false,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart.lines, products, bundles, lang],
  );
  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);

  // Customer order history (Buy again + orders view)
  useEffect(() => {
    if (session) myOrdersAction(session.phone).then(setMyOrders);
    else setMyOrders([]);
  }, [session, modal]);

  const buyAgain = useMemo(() => {
    const names = new Set(myOrders.flatMap((o) => o.items.map((i) => i.name_snapshot)));
    return products.filter((p) => names.has(p.name_en)).slice(0, 6);
  }, [myOrders, products]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      <Ribbon settings={settings} />

      {/* nav */}
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-2.5 px-5 py-3.5">
        <button
          onClick={() => {
            setRoute("home");
            setMilestone("all");
            setCategory("all");
          }}
          className="flex items-center gap-2.5"
          aria-label={BUSINESS.name}
        >
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile border-3 border-ink bg-white p-1 shadow-hard-3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Rasi Mom & Baby" className="h-full w-full object-contain" />
          </div>
          <div className="text-left leading-none">
            <div className="font-display text-[20px] font-extrabold">Rasi</div>
            <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-brand font-display">
              Mom & Baby
            </div>
          </div>
        </button>
        <div className="flex-1" />
        <Pill bg="#B9EBDD" onClick={() => setLang(lang === "en" ? "ta" : "en")}>
          {t("nav.language")}
        </Pill>
        <Pill bg="#FFE1A8" onClick={() => setModal({ type: "track" })}>
          {t("nav.track")}
        </Pill>
        <Link
          href="/admin"
          className="btn-press whitespace-nowrap rounded-pill border-2.5 border-ink bg-[#E4D6FF] px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2 min-h-[38px] inline-flex items-center"
        >
          {t("nav.admin")}
        </Link>
        {session && (
          <Pill
            bg="#D6E8B0"
            onClick={() => setRoute(route === "orders" ? "home" : "orders")}
          >
            {route === "orders" ? t("nav.shop") : t("nav.orders")}
          </Pill>
        )}
        {session ? (
          <Pill
            bg="#FFCBD9"
            onClick={async () => {
              await signOut();
              setRoute("home");
              notify(t("auth.signedOut"));
            }}
          >
            {t("nav.signOut")}
          </Pill>
        ) : (
          <Pill bg="#FFE1A8" onClick={() => setModal({ type: "auth" })}>
            {t("nav.signIn")}
          </Pill>
        )}
        <button
          onClick={() => setModal({ type: "cart" })}
          className="btn-press relative rounded-pill border-2.5 border-ink bg-brand px-3.5 py-[7px] font-display text-[13px] font-extrabold text-white shadow-hard-2 min-h-[38px]"
          aria-label={t("cart.title")}
        >
          🛒
          {cart.count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-ink text-[11px] text-white">
              {cart.count}
            </span>
          )}
        </button>
      </div>

      {route === "home" && (
        <div>
          <Hero />
          <Marquee products={products.slice(0, 8)} openProduct={(p) => setModal({ type: "product", product: p })} />
          <CategoryGrid category={category} setCategory={setCategory} />
          <BuyAgain products={buyAgain} addToCart={addToCart} />
          <BundlesSection bundles={bundles} addToCart={(b) => addToCart(`b:${b.id}`)} />
          <ShopGrid
            filtered={filtered}
            milestone={milestone}
            setMilestone={setMilestone}
            category={category}
            setCategory={setCategory}
            query={query}
            setQuery={setQuery}
            addToCart={addToCart}
            openProduct={(p) => setModal({ type: "product", product: p })}
          />
          <Trust />
        </div>
      )}

      {route === "orders" && session && (
        <div className="mx-auto max-w-[720px] px-5 pb-16 pt-6">
          <h2 className="mb-4 font-display text-[30px] font-extrabold">
            {t("orders.title")} 📦
          </h2>
          {myOrders.length === 0 && <p className="text-mute">{t("orders.none")}</p>}
          {myOrders.map((o) => (
            <Card key={o.id} className="mb-3 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold">{o.order_no}</span>
                <Badge bg={o.status === "delivered" ? "#D6E8B0" : "#FFE1A8"}>
                  {t(`track.status.${o.status}` as never)}
                </Badge>
              </div>
              <div className="mt-1 text-[14px] text-mute">
                {o.items.map((i) => `${i.name_snapshot} ×${i.qty}`).join(" · ")}
              </div>
              <div className="mt-1 font-display font-extrabold text-brand">{inr(o.total)}</div>
            </Card>
          ))}
        </div>
      )}

      {/* modals */}
      {modal?.type === "product" && (
        <ProductModal
          product={modal.product}
          reviews={reviews.filter((r) => r.product_id === modal.product.id)}
          onClose={() => setModal(null)}
          onAdd={() => {
            addToCart(modal.product.id);
            setModal(null);
          }}
          notify={notify}
        />
      )}
      {modal?.type === "cart" && (
        <CartModal
          items={cartItems}
          subtotal={subtotal}
          settings={settings}
          setQty={cart.setQty}
          onClose={() => setModal(null)}
          onCheckout={() => setModal({ type: "checkout" })}
        />
      )}
      {modal?.type === "checkout" && (
        <CheckoutModal
          items={cartItems}
          subtotal={subtotal}
          settings={settings}
          isDemo={isDemo}
          onClose={() => setModal(null)}
          onPlaced={(order) => {
            cart.clear();
            setModal({ type: "orderDone", order });
          }}
          notify={notify}
        />
      )}
      {modal?.type === "orderDone" && (
        <Modal onClose={() => setModal(null)}>
          <div className="py-2.5 text-center">
            <div className="text-[50px]">🎉</div>
            <h3 className="mt-2.5 font-display text-[26px] font-extrabold">
              {t("orderDone.title")}
            </h3>
            <p className="mt-2 text-mute">
              {t("orderDone.order")} <b className="text-ink">{modal.order.order_no}</b>{" "}
              {t("orderDone.body")}
            </p>
            <div className="mt-4 grid gap-2.5">
              <Btn full onClick={() => setModal(null)}>
                {t("orderDone.continue")}
              </Btn>
              <a
                href={`/invoice/${modal.order.order_no}?phone=${modal.order.address_snapshot.phone}`}
                target="_blank"
                className="text-[14px] font-bold text-mute underline"
              >
                {t("orderDone.invoice")}
              </a>
            </div>
          </div>
        </Modal>
      )}
      {modal?.type === "track" && <TrackModal onClose={() => setModal(null)} />}
      {modal?.type === "auth" && (
        <AuthModal
          onClose={() => setModal(null)}
          onSignedIn={(name) => {
            setModal(null);
            notify(`${t("auth.welcomeBack")}, ${name.split(" ")[0]}! 🎉`);
          }}
        />
      )}

      {toast && <Toast message={toast} />}

      {/* footer */}
      <footer className="border-t-4 border-ink bg-brand p-[22px] text-center text-white flex flex-col items-center justify-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-tile border-3 border-ink bg-white p-1.5 shadow-hard-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Rasi Mom & Baby" className="h-full w-full object-contain" />
        </div>
        <div className="font-display text-[18px] font-extrabold">{BUSINESS.name}</div>
        <div className="text-[13px] opacity-95">{BUSINESS.addressShort}</div>
        <div className="text-[13px] opacity-95">{t("footer.hours")}</div>
        {isDemo && (
          <div className="mt-1.5 text-[11px] opacity-80">
            Demo mode — Supabase & Razorpay keys pending
          </div>
        )}
      </footer>
    </div>
  );
}
