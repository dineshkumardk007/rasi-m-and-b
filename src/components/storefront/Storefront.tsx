"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEGAL_DOCS, LEGAL_SHORT } from "@/lib/legal/content";
import type { Bundle, Order, Product, Review, StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useCart } from "@/lib/store/CartProvider";
import { useWishlist } from "@/lib/store/WishlistProvider";
import { useSession } from "@/lib/store/SessionProvider";
import { inr } from "@/lib/constants";
import { Badge, Card, Modal, Toast, Btn } from "@/components/ui";
import { myOrdersAction } from "@/app/customer-actions";
import {
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  trackViewContent,
} from "@/lib/analytics";
import {
  BundlesSection,
  BuyAgain,
  CategoryGrid,
  FreshPicksSection,
  Hero,
  ShopGrid,
  Trust,
} from "./sections";
import {
  AuthModal,
  CartModal,
  CheckoutModal,
  ProductModal,
  ProfileModal,
  TrackModal,
  WishlistModal,
} from "./modals";
import { Ribbon } from "./Ribbon";
import { BUSINESS } from "@/lib/constants";

export interface StorefrontProps {
  products: Product[];
  bundles: Bundle[];
  reviews: Review[];
  settings: StoreSettings;
  isDemo: boolean;
  /** Filters restored from the URL — category from the path, the rest from the query. */
  initialCategory?: string;
  initialMilestone?: string;
  initialQuery?: string;
}

export type ModalState =
  | { type: "product"; product: Product }
  | { type: "cart" }
  | { type: "checkout" }
  | { type: "orderDone"; order: Order; invoiceToken: string | null }
  | { type: "track" }
  | { type: "auth" }
  | { type: "confirmSignOut" }
  | { type: "profile" }
  | { type: "wishlist" }
  | null;

export default function Storefront(props: StorefrontProps) {
  const { products, bundles, reviews, settings, isDemo } = props;
  const { t, lang, setLang } = useT();
  const cart = useCart();
  const wishlist = useWishlist();
  const { session, signOut } = useSession();
  const router = useRouter();

  const [route, setRoute] = useState<"home" | "orders">("home");
  const [milestone, setMilestoneState] = useState<string>(props.initialMilestone ?? "all");
  const [category, setCategoryState] = useState<string>(props.initialCategory ?? "all");
  const [query, setQueryState] = useState(props.initialQuery ?? "");

  /**
   * Filters are mirrored into the URL so a filtered view can be shared, linked
   * and indexed. Category is a route change (each category is its own page);
   * age and search only rewrite the address bar via the history API, which
   * keeps typing instant instead of firing a server render per keystroke.
   */
  const urlFor = useCallback((cat: string, ms: string, q: string) => {
    const params = new URLSearchParams();
    if (ms !== "all") params.set("age", ms);
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    return `${cat === "all" ? "/" : `/c/${cat}`}${qs ? `?${qs}` : ""}`;
  }, []);

  const setCategory = useCallback(
    (c: string) => {
      setCategoryState(c);
      router.push(urlFor(c, milestone, query), { scroll: false });
    },
    [router, urlFor, milestone, query],
  );

  const setMilestone = useCallback(
    (m: string) => {
      setMilestoneState(m);
      window.history.replaceState(null, "", urlFor(category, m, query));
    },
    [urlFor, category, query],
  );

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      window.history.replaceState(null, "", urlFor(category, milestone, q));
    },
    [urlFor, category, milestone],
  );
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

      // Bundles carry a "b:" prefix; report either one as a trackable line.
      const bundle = itemId.startsWith("b:")
        ? bundles.find((b) => b.id === itemId.slice(2))
        : undefined;
      const product = bundle ? undefined : products.find((p) => p.id === itemId);
      if (bundle) {
        trackAddToCart({ id: bundle.id, name: bundle.name_en, price: bundle.bundle_price });
      } else if (product) {
        trackAddToCart({ id: product.id, name: product.name_en, price: product.price });
      }
    },
    [cart, notify, t, products, bundles],
  );

  /** Quick view — the moment a customer shows interest in one product. */
  const openProduct = useCallback((p: Product) => {
    trackViewContent({ id: p.id, name: p.name_en, price: p.price });
    setModal({ type: "product", product: p });
  }, []);

  // Search terms, once typing settles — noisy per-keystroke events help nobody.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) return;
    const timer = window.setTimeout(() => trackSearch(term), 900);
    return () => window.clearTimeout(timer);
  }, [query]);

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
    if (session) myOrdersAction().then(setMyOrders);
    else setMyOrders([]);
  }, [session, modal]);

  const buyAgain = useMemo(() => {
    const names = new Set(myOrders.flatMap((o) => o.items.map((i) => i.name_snapshot)));
    return products.filter((p) => names.has(p.name_en)).slice(0, 6);
  }, [myOrders, products]);

  const openOrders = useCallback(() => {
    setRoute("orders");
    setCategoryState("all");
    setMilestoneState("all");
    setQueryState("");
    router.push("/", { scroll: false });
  }, [router]);

  const openHome = useCallback(() => {
    setRoute("home");
    setCategoryState("all");
    setMilestoneState("all");
    setQueryState("");
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen overflow-x-hidden text-ink">
      <Ribbon settings={settings} />

      {/* nav */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-col lg:flex-row items-center justify-between gap-2.5 px-2.5 sm:px-5 py-2.5 sm:py-3.5">
        <div className="flex w-full lg:w-auto items-center justify-between gap-3">
          <button
            onClick={openHome}
            className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 cursor-pointer"
            aria-label={BUSINESS.name}
          >
            <div className="flex h-[36px] w-[36px] sm:h-[44px] sm:w-[44px] shrink-0 items-center justify-center rounded-tile border-2 sm:border-3 border-ink bg-white p-1 shadow-hard-2 sm:shadow-hard-3 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Rasi Logo" className="h-full w-full object-contain" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-text-logo.png"
              alt="Rasi Mom and Baby"
              className="h-[22px] xs:h-[26px] sm:h-[38px] w-auto object-contain shrink-0"
            />
          </button>
        </div>

        {/* Search Bar - Centered Neo-Brutalist Pill with smooth animated Search Button */}
        <div className="w-full lg:max-w-[420px] xl:max-w-[480px] my-1 lg:my-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="group relative flex w-full items-center rounded-full border-2.5 border-ink bg-white shadow-hard-2 focus-within:ring-2 focus-within:ring-ink focus-within:shadow-hard-3 overflow-hidden transition-all duration-300"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for baby products, toys, maternity & more..."
              className="w-full bg-transparent px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-ink placeholder:text-mute/80 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="px-2 text-[12px] font-bold text-mute hover:text-ink transition-colors"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="btn-press shrink-0 flex items-center justify-center bg-[#FF5A78] text-white px-3.5 sm:px-4 py-2 hover:bg-[#E04866] cursor-pointer transition-all duration-300 group-hover:bg-[#FF4769]"
              aria-label="Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transition-transform duration-300 ease-spring group-hover:scale-115 group-hover:rotate-12 group-active:scale-95"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </button>
          </form>
        </div>

        {/* Right Action Buttons */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2 flex-wrap justify-center lg:justify-end">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="btn-press shrink-0 flex items-center rounded-pill border-2 sm:border-2.5 border-ink bg-[#B9EBDD] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[11px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[32px] sm:min-h-[36px] cursor-pointer"
          >
            {t("nav.language")}
          </button>

          <button
            type="button"
            onClick={() => setModal({ type: "track" })}
            className="btn-press shrink-0 flex items-center rounded-pill border-2 sm:border-2.5 border-ink bg-[#FFE1A8] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[11px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[32px] sm:min-h-[36px] cursor-pointer"
          >
            {t("nav.track")}
          </button>

          <button
            type="button"
            onClick={() => setModal(session ? { type: "profile" } : { type: "auth" })}
            className="btn-press shrink-0 flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-[#FFE1A8] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[11px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[32px] sm:min-h-[36px] cursor-pointer"
            aria-label="Profile"
          >
            <span>👤</span>
            <span>{session ? session.name.split(" ")[0] : t("nav.signIn")}</span>
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setModal({ type: "cart" })}
            className="btn-press shrink-0 relative flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-[#FF6B8B] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[11px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[32px] sm:min-h-[36px] cursor-pointer hover:bg-[#FF5A78] transition-colors"
            aria-label={t("cart.title")}
          >
            <span>🛒</span>
            <span>Cart</span>
            {cart.count > 0 && (
              <span className="ml-0.5 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-white bg-ink text-[10px] sm:text-[11px] font-extrabold text-white leading-none shadow-sm">
                {cart.count}
              </span>
            )}
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => setModal({ type: "wishlist" })}
            className="btn-press shrink-0 relative flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-[#A0D2EB] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[11px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[32px] sm:min-h-[36px] cursor-pointer"
            aria-label="Wishlist"
          >
            <span>♡</span>
            <span>Wishlist</span>
            {wishlist.count > 0 && (
              <span className="ml-0.5 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-white bg-ink text-[10px] sm:text-[11px] font-extrabold text-white leading-none shadow-sm">
                {wishlist.count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      {modal?.type === "profile" && (
        <ProfileModal
          onClose={() => setModal(null)}
          onSignOut={() => setModal({ type: "confirmSignOut" })}
          onOpenOrders={openOrders}
        />
      )}

      <main id="main-content">
        {route === "home" && (
          <div>
            <Hero />
            <FreshPicksSection
              products={products}
              openProduct={openProduct}
              addToCart={addToCart}
              onViewAll={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
              onExploreBundles={() => document.getElementById("bundles")?.scrollIntoView({ behavior: "smooth" })}
            />
            <CategoryGrid category={category} setCategory={setCategory} />
            <BuyAgain products={buyAgain} addToCart={addToCart} openProduct={openProduct} />
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
              openProduct={openProduct}
            />
            <Trust />
          </div>
        )}

        {route === "orders" && session && (
          <div className="mx-auto max-w-[720px] px-5 pb-16 pt-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-ink/10">
              <h2 className="font-display text-[30px] font-extrabold flex items-center gap-2">
                <span>📦</span> {t("orders.title")}
              </h2>
              <button
                type="button"
                onClick={openHome}
                aria-label="Close orders page and return home"
                className="btn-press flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FFE1A8] font-display text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            {myOrders.length === 0 && <p className="text-mute">{t("orders.none")}</p>}
            {myOrders.map((o) => (
              <Card key={o.id} className="relative mb-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold">{o.order_no}</span>
                  <div className="flex items-center gap-2">
                    <Badge bg={o.status === "delivered" ? "#D6E8B0" : "#FFE1A8"}>
                      {t(`track.status.${o.status}` as never)}
                    </Badge>
                    <button
                      type="button"
                      onClick={openHome}
                      title="Close and return to home page"
                      aria-label="Return to home page"
                      className="btn-press flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-[#FFFDF7] font-display text-[12px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-[14px] text-mute">
                  {o.items.map((i) => `${i.name_snapshot} ×${i.qty}`).join(" · ")}
                </div>
                <div className="mt-1 font-display font-extrabold text-brand">{inr(o.total)}</div>
              </Card>
            ))}
          </div>
        )}
      </main>

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
          onCheckout={() => {
            if (!session) {
              setModal({ type: "auth" });
              notify(t("checkout.signInRequired"));
              return;
            }
            trackBeginCheckout(
              cartItems.map((c) => ({
                id: c.itemId,
                name: c.name,
                price: c.price,
                qty: c.qty,
              })),
            );
            setModal({ type: "checkout" });
          }}
        />
      )}
      {modal?.type === "checkout" && (
        <CheckoutModal
          items={cartItems}
          subtotal={subtotal}
          settings={settings}
          isDemo={isDemo}
          onClose={() => setModal(null)}
          onPlaced={(order, invoiceToken) => {
            // Report the charged total (delivery and discount included) so ad
            // platforms optimise against real revenue, not the cart subtotal.
            trackPurchase(
              order.total,
              order.items.map((i) => ({
                id: i.product_id,
                name: i.name_snapshot,
                price: i.price_snapshot,
                qty: i.qty,
              })),
            );
            cart.clear();
            setModal({ type: "orderDone", order, invoiceToken });
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
              {modal.invoiceToken && (
                <a
                  href={`/invoice/${modal.order.order_no}?t=${modal.invoiceToken}`}
                  target="_blank"
                  className="text-[14px] font-bold text-mute underline"
                >
                  {t("orderDone.invoice")}
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}
      {modal?.type === "track" && (
        <TrackModal onClose={() => setModal(null)} myOrders={myOrders} />
      )}
      {modal?.type === "wishlist" && (
        <WishlistModal
          products={products}
          onClose={() => setModal(null)}
          onAddToCart={addToCart}
          onOpenProduct={openProduct}
        />
      )}
      {modal?.type === "auth" && (
        <AuthModal
          onClose={() => setModal(null)}
          onSignedIn={(name) => {
            setModal(null);
            notify(`Welcome, ${name.split(" ")[0]}! 🎉`);
          }}
        />
      )}
      {modal?.type === "confirmSignOut" && (
        <Modal onClose={() => setModal(null)}>
          <div className="py-2 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-3 border-ink bg-[#FFE1A8] font-display text-[26px] shadow-hard-3">
              👋
            </div>
            <h3 className="font-display text-[22px] font-extrabold text-ink">
              Do you want to sign out?
            </h3>
            <p className="mt-2 text-[14px] leading-[1.5] text-mute">
              Are you sure you want to sign out of your Rasi Mom & Baby account?
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={async () => {
                  setModal(null);
                  await signOut();
                  setRoute("home");
                  notify("Signed out successfully. Come back soon! 👋💛");
                }}
                className="btn-press flex-1 rounded-pill border-2.5 border-ink bg-[#FFCBD9] py-2.5 font-display text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#E24B4A] hover:text-white transition-all cursor-pointer"
              >
                Yes, Sign Out
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="btn-press flex-1 rounded-pill border-2.5 border-ink bg-[#F2EAE0] py-2.5 font-display text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] transition-all cursor-pointer"
              >
                No, Stay Signed In
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} />}

      {/* Mobile Sticky Floating Cart Bar */}
      {cart.count > 0 && !modal && (
        <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
          <button
            type="button"
            onClick={() => setModal({ type: "cart" })}
            className="btn-press flex w-full items-center justify-between rounded-pill border-3 border-ink bg-brand px-5 py-3 font-display text-[15px] font-extrabold text-white shadow-hard-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink text-[12px] text-white">
                {cart.count}
              </span>
              <span>{t("cart.title")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{inr(subtotal)}</span>
              <span>{t("cart.checkout")} →</span>
            </div>
          </button>
        </div>
      )}

      {/* footer */}
      <footer className="border-t-4 border-ink bg-brand p-[22px] text-center text-white flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-3 rounded-card border-3 border-ink bg-white px-4 py-2 shadow-hard-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile border-2.5 border-ink bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Rasi Logo" className="h-full w-full object-contain" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-text-logo.png" alt="Rasi Mom and Baby" className="h-[32px] w-auto object-contain" />
        </div>
        <div className="text-[13px] opacity-95">{BUSINESS.addressShort}</div>
        <div className="text-[13px] opacity-95">{t("footer.hours")}</div>
        {/*
          Policy links. Razorpay checks these are reachable from the storefront
          before activating the merchant account, and customers look for them
          here before paying a shop they have not bought from before.
        */}
        <nav
          aria-label={t("footer.legal")}
          className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12px]"
        >
          <Link href="/contact" className="underline underline-offset-2 opacity-95">
            {t("footer.contact")}
          </Link>
          {LEGAL_DOCS.map((doc) => (
            <Link
              key={doc}
              href={`/legal/${doc}`}
              className="underline underline-offset-2 opacity-95"
            >
              {LEGAL_SHORT[lang][doc]}
            </Link>
          ))}
        </nav>
        {isDemo && (
          <div className="mt-1.5 text-[11px] opacity-80">
            Demo mode — Supabase & Razorpay keys pending
          </div>
        )}
      </footer>
    </div>
  );
}
