"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEGAL_DOCS, LEGAL_SHORT } from "@/lib/legal/content";
import type {
  BabyRegistry,
  Banner,
  Brand,
  Bundle,
  Order,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useCart } from "@/lib/store/CartProvider";
import { useWishlist } from "@/lib/store/WishlistProvider";
import { useSession } from "@/lib/store/SessionProvider";
import { inr, CATEGORY_META } from "@/lib/constants";
import { Art, Badge, Breadcrumbs, Card, Modal, Toast, Btn } from "@/components/ui";
import { computeReviewAggregate } from "@/lib/seo/jsonld";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getBabyRegistryBySlugAction, myOrdersAction, recordCartAbandonedAction } from "@/app/customer-actions";
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
/**
 * These modals (checkout, auth/OTP, cart, track-order, registry, quick-view,
 * profile, wishlist) account for most of modals.tsx/RegistryModal.tsx —
 * together nearly 2,000 lines — but every render site below is gated behind
 * `modal?.type === "..."`, so none of them are ever mounted on first paint.
 * Loading them as separate chunks (rather than bundled into the initial
 * homepage JS) cuts what every first-time visitor has to download and parse
 * before the page is interactive; a modal's own chunk only loads the moment
 * it's actually opened. `ssr:false` because these are pure client interactions
 * with nothing to render server-side while closed.
 */
const AuthModal = dynamic(() => import("./modals").then((m) => m.AuthModal), { ssr: false });
const CartModal = dynamic(() => import("./modals").then((m) => m.CartModal), { ssr: false });
const CheckoutModal = dynamic(() => import("./modals").then((m) => m.CheckoutModal), { ssr: false });
const ProductModal = dynamic(() => import("./modals").then((m) => m.ProductModal), { ssr: false });
const ProfileModal = dynamic(() => import("./modals").then((m) => m.ProfileModal), { ssr: false });
const TrackModal = dynamic(() => import("./modals").then((m) => m.TrackModal), { ssr: false });
const WishlistModal = dynamic(() => import("./modals").then((m) => m.WishlistModal), { ssr: false });
const CreateRegistryModal = dynamic(
  () => import("./RegistryModal").then((m) => m.CreateRegistryModal),
  { ssr: false },
);
const ViewRegistryModal = dynamic(
  () => import("./RegistryModal").then((m) => m.ViewRegistryModal),
  { ssr: false },
);
import {
  BrandRail,
  DealOfTheDay,
  OfferStrip,
  PromoBanner,
  ReviewsStrip,
} from "./merch";
import { Ribbon } from "./Ribbon";
import { BabyClub } from "./BabyClub";
import { WhatsAppFab } from "./WhatsAppFab";
import { PwaInstallBanner } from "./PwaInstallBanner";
import { RecentlyViewed } from "./RecentlyViewed";
import { recordView } from "@/lib/store/recently-viewed";
import { BUSINESS } from "@/lib/constants";

export interface StorefrontProps {
  products: Product[];
  bundles: Bundle[];
  reviews: Review[];
  settings: StoreSettings;
  /** Live banners for every slot; each section picks the ones it owns. */
  banners: Banner[];
  brands: Brand[];
  isDemo: boolean;
  /** Visual breadcrumb trail, mirroring the page's BreadcrumbList JSON-LD.
   * Only set by category/brand pages — the plain homepage has none. */
  breadcrumb?: { name: string; href: string }[];
  /** Filters restored from the URL — category from the path, the rest from the query. */
  initialCategory?: string;
  initialMilestone?: string;
  initialQuery?: string;
  initialBrand?: string;
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
  | { type: "createRegistry" }
  | { type: "viewRegistry"; registry: BabyRegistry }
  | null;

export default function Storefront(props: StorefrontProps) {
  const { products, bundles, reviews, settings, banners, brands, isDemo } = props;
  const { t, lang, setLang } = useT();
  const cart = useCart();
  const wishlist = useWishlist();
  const { session, signOut } = useSession();
  const router = useRouter();

  const [route, setRoute] = useState<"home" | "orders">("home");
  const [milestone, setMilestoneState] = useState<string>(props.initialMilestone ?? "all");
  const [category, setCategoryState] = useState<string>(props.initialCategory ?? "all");
  const [query, setQueryState] = useState(props.initialQuery ?? "");
  const [brand, setBrandState] = useState<string>(props.initialBrand ?? "all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "newest">("default");
  const [isOffline, setIsOffline] = useState(false);

  // If the owner turns the language switch off, the toggle button disappears
  // — but a visitor who already switched to Tamil before that (cookie/
  // localStorage already set) would otherwise be stuck on it with no way
  // back, since the only control for changing it is now hidden.
  useEffect(() => {
    if (!(settings.enable_language_switch ?? true) && lang !== "en") setLang("en");
  }, [settings.enable_language_switch, lang, setLang]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // /brand/[slug] and /c/[category] reuse this whole component (cart, quick
  // view, search, age pills all behave exactly as they do everywhere else)
  // but previously still rendered the full homepage stack — hero, Fresh
  // Picks, deals, other carousels, all pulling from every product — with
  // only the grid at the bottom actually filtered. A brand page is supposed
  // to show just that brand's shelf, not the homepage with a filter buried
  // in it. breadcrumb is only ever passed by those two pages.
  const isFocusedListing = Boolean(props.breadcrumb);

  // Page-level <h1> text (rendered sr-only below). Computed here so the nested
  // index access narrows cleanly rather than inline in JSX.
  const pageHeading = (() => {
    if (brand !== "all") {
      const b = brands.find((x) => x.name === brand);
      return `${b?.name ?? brand} — ${BUSINESS.name}`;
    }
    if (category !== "all") {
      const cm = (CATEGORY_META as Record<string, { en: string; ta: string } | undefined>)[category];
      const name = cm ? (lang === "ta" ? cm.ta : cm.en) : category;
      return `${name} — ${BUSINESS.name}, ${BUSINESS.city}`;
    }
    return `${BUSINESS.name} — Baby & Mom Store in ${BUSINESS.city}`;
  })();

  /**
   * Filters are mirrored into the URL so a filtered view can be shared, linked
   * and indexed. Category is a route change (each category is its own page);
   * age and search only rewrite the address bar via the history API, which
   * keeps typing instant instead of firing a server render per keystroke.
   */
  const urlFor = useCallback((cat: string, ms: string, q: string, br: string) => {
    const params = new URLSearchParams();
    if (ms !== "all") params.set("age", ms);
    if (q.trim()) params.set("q", q.trim());
    if (br !== "all") params.set("brand", br);
    const qs = params.toString();
    return `${cat === "all" ? "/" : `/c/${cat}`}${qs ? `?${qs}` : ""}`;
  }, []);

  const setCategory = useCallback(
    (c: string) => {
      setCategoryState(c);
      router.push(urlFor(c, milestone, query, brand), { scroll: false });
    },
    [router, urlFor, milestone, query, brand],
  );

  const setMilestone = useCallback(
    (m: string) => {
      setMilestoneState(m);
      window.history.replaceState(null, "", urlFor(category, m, query, brand));
    },
    [urlFor, category, query, brand],
  );

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  // Debounce history state sync for search query to avoid thrashing replaceState on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(null, "", urlFor(category, milestone, query, brand));
    }, 300);
    return () => clearTimeout(timer);
  }, [urlFor, category, milestone, query, brand]);

  const setBrand = useCallback(
    (b: string) => {
      setBrandState(b);
      window.history.replaceState(null, "", urlFor(category, milestone, query, b));
    },
    [urlFor, category, milestone, query],
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Other pages (e.g. the baby registry) can't reach this component's local
  // modal state directly, so they hand off "open the cart" via a URL param
  // instead. Strip it from the URL right after so back/refresh don't reopen it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("openCart") === "1") {
      setModal({ type: "cart" });
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // Real aggregate from approved reviews, replacing the hardcoded BUSINESS.rating
  // placeholder wherever a rating/review-count actually renders on this page.
  const reviewAggregate = useMemo(() => computeReviewAggregate(reviews), [reviews]);

  const suggestions = useMemo(() => {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          p.name_ta.includes(q) ||
          p.brand.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [query, products]);

  const filtered = useMemo(() => {
    const matches = products.filter(
      (p) =>
        (inStockOnly ? p.stock > 0 : p.stock >= 0) &&
        (maxPrice === null || p.price <= maxPrice) &&
        (milestone === "all" || p.milestone === milestone) &&
        (category === "all" || p.categories.includes(category as never)) &&
        (brand === "all" || p.brand === brand) &&
        (!query ||
          p.name_en.toLowerCase().includes(query.toLowerCase()) ||
          p.name_ta.includes(query) ||
          p.brand.toLowerCase().includes(query.toLowerCase())),
    );
    if (sortBy === "price_asc") return [...matches].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") return [...matches].sort((a, b) => b.price - a.price);
    // "Newest": products arrive oldest-first (the catalog query orders by
    // created_at ascending), so reversing the already-filtered, order-preserved
    // list surfaces the newest first without needing a separate created_at field
    // threaded through the client-facing Product type.
    if (sortBy === "newest") return [...matches].reverse();
    return matches;
  }, [products, milestone, category, query, brand, maxPrice, inStockOnly, sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const regSlug = params.get("registry");
    if (regSlug) {
      getBabyRegistryBySlugAction(regSlug).then((reg) => {
        if (reg) setModal({ type: "viewRegistry", registry: reg });
      });
    }
  }, []);

  const addToCart = useCallback(
    (itemId: string, variantId?: string) => {
      // Bundles carry a "b:" prefix; report either one as a trackable line.
      const bundle = itemId.startsWith("b:")
        ? bundles.find((b) => b.id === itemId.slice(2))
        : undefined;
      const product = bundle ? undefined : products.find((p) => p.id === itemId);
      const variant = product?.variants?.find((v) => v.id === variantId);

      // Only the cart modal's own +/- stepper checked this before — every
      // "Add to cart" button elsewhere (product tiles, Fresh Picks, Buy
      // Again, Baby Club, Bought Together) had no ceiling at all, so
      // clicking it repeatedly on a low-stock item could push the cart past
      // what's actually available.
      if (!bundle) {
        const maxStock = variant ? variant.stock : (product?.stock ?? 0);
        const currentQty =
          cart.lines.find((l) => l.itemId === itemId && (l.variantId ?? null) === (variantId ?? null))
            ?.qty ?? 0;
        if (currentQty >= maxStock) {
          notify(t("shop.onlyLeft", { count: maxStock }));
          return;
        }
      }

      cart.add(itemId, variantId);
      notify(t("toast.addedToCart"));

      if (bundle) {
        trackAddToCart({ id: bundle.id, name: bundle.name_en, price: bundle.bundle_price });
      } else if (product) {
        trackAddToCart({
          id: product.id,
          name: variant ? `${product.name_en} — ${variant.name_en}` : product.name_en,
          price: variant?.price ?? product.price,
        });
      }
    },
    [cart, notify, t, products, bundles],
  );

  /** Quick view — the moment a customer shows interest in one product. */
  const openProduct = useCallback((p: Product) => {
    trackViewContent({ id: p.id, name: p.name_en, price: p.price });
    recordView(p.id);
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
                variantId: undefined as string | undefined,
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
          if (!p) return null;
          const variant = l.variantId ? p.variants?.find((v) => v.id === l.variantId) : undefined;
          const variantName = variant ? (lang === "ta" ? variant.name_ta : variant.name_en) : null;
          const baseName = lang === "ta" ? p.name_ta : p.name_en;
          return {
            itemId: l.itemId,
            variantId: l.variantId,
            qty: l.qty,
            name: variantName ? `${baseName} — ${variantName}` : baseName,
            price: variant?.price ?? p.price,
            emoji: p.emoji,
            bg: p.tile_color,
            maxStock: variant ? variant.stock : p.stock,
            isBundle: false,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart.lines, products, bundles, lang],
  );
  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  // The badge must count what's actually in cartItems (what checkout sees),
  // not raw cart.lines — a line whose product/bundle was since deleted or
  // deactivated resolves to nothing here but still has a qty in localStorage,
  // and cart.count summing lines directly would show a nonzero badge over an
  // empty cart modal.
  const cartCount = cartItems.reduce((s, c) => s + c.qty, 0);

  // Actually drop those unresolvable lines from the stored cart, once the
  // catalog has loaded, instead of merely hiding them from the count above —
  // otherwise they sit in localStorage forever.
  useEffect(() => {
    if (products.length === 0 && bundles.length === 0) return;
    for (const l of cart.lines) {
      const resolves = l.itemId.startsWith("b:")
        ? bundles.some((b) => b.id === l.itemId.slice(2))
        : products.some((p) => p.id === l.itemId);
      if (!resolves) cart.setQty(l.itemId, 0, l.variantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the catalog or the line set changes, not on every cart function identity change
  }, [cart.lines, products, bundles]);

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
    <div className="relative min-h-screen overflow-x-hidden text-ink bg-gradient-to-br from-[#FFFDF8] via-[#FFE1A8]/20 via-[#FFCBD9]/20 via-[#E4D6FF]/15 to-[#C7E9FF]/20">
      {/* ── UNORGANIZED CHILDREN'S CRAYON ART & NEO-BRUTALIST WALLPAPER BACKGROUND LAYER ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {/* Hand-Drawn Children Crayon Art & Polka Pattern Texture Overlay */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `
              radial-gradient(#EC5D8A 2.5px, transparent 2.5px),
              radial-gradient(#3B9EDB 2.5px, transparent 2.5px),
              radial-gradient(#F59E0B 2.5px, transparent 2.5px),
              radial-gradient(#9A6BE0 2.5px, transparent 2.5px)
            `,
            backgroundSize: `44px 44px, 44px 44px, 44px 44px, 44px 44px`,
            backgroundPosition: `0 0, 22px 22px, 11px 33px, 33px 11px`
          }}
        />

        {/* Unorganized Neo-Brutalist Floating Crayon Stamps & Badges in Margin Areas */}
        {/* Floating Crayon Badge 1: Top Left Margin */}
        <div className="absolute top-28 left-3 hidden xl:flex items-center gap-1.5 rounded-[18px_6px_20px_8px] border-2.5 border-ink bg-[#FFE66D] px-3 py-1.5 font-display text-[12px] font-extrabold text-ink -rotate-6 shadow-hard-3 animate-crayon-float opacity-85">
          <span className="text-[16px]">🖍️</span>
          <span>Crayon Art</span>
        </div>

        {/* Floating Crayon Badge 2: Mid Right Margin */}
        <div className="absolute top-96 right-4 hidden xl:flex items-center gap-1.5 rounded-[8px_20px_6px_18px] border-2.5 border-ink bg-[#FFCBD9] px-3 py-1.5 font-display text-[12px] font-extrabold text-ink rotate-8 shadow-hard-3 animate-crayon-wiggle opacity-85">
          <span className="text-[16px]">🧸</span>
          <span>Baby Play</span>
        </div>

        {/* Floating Crayon Badge 3: Mid Left Margin */}
        <div className="absolute top-[680px] left-4 hidden xl:flex items-center gap-1.5 rounded-pill border-2.5 border-ink bg-[#C7E9FF] px-3.5 py-1.5 font-display text-[12px] font-extrabold text-ink -rotate-4 shadow-hard-3 animate-crayon-float opacity-85">
          <span className="text-[16px]">🍼</span>
          <span>Pure & Pure</span>
        </div>

        {/* Floating Crayon Badge 4: Lower Right Margin */}
        <div className="absolute top-[1100px] right-5 hidden xl:flex items-center gap-1.5 rounded-[16px_8px_18px_6px] border-2.5 border-ink bg-[#D6E8B0] px-3 py-1.5 font-display text-[12px] font-extrabold text-ink rotate-6 shadow-hard-3 animate-crayon-wiggle opacity-85">
          <span className="text-[16px]">⭐</span>
          <span>Happy Smiles</span>
        </div>

        {/* Floating Crayon Badge 5: Bottom Left Margin */}
        <div className="absolute top-[1600px] left-3 hidden xl:flex items-center gap-1.5 rounded-[6px_18px_8px_16px] border-2.5 border-ink bg-[#E4D6FF] px-3 py-1.5 font-display text-[12px] font-extrabold text-ink -rotate-8 shadow-hard-3 animate-crayon-float opacity-85">
          <span className="text-[16px]">🎈</span>
          <span>Rasi Baby</span>
        </div>
      </div>

      <div className="relative z-10">
        {isOffline && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#FF6B8B] px-4 py-2 text-center font-display text-[13px] font-extrabold text-white border-b-2.5 border-ink shadow-md animate-fadeIn">
            <span>⚠️ You are currently offline. Browsing in cached mode — reconnecting...</span>
          </div>
        )}

        <ErrorBoundary fallbackTitle="Announcement banner temporarily unavailable">
          <Ribbon settings={settings} />
        </ErrorBoundary>

        {/* nav */}
        <div className="mx-auto flex w-full max-w-[1240px] flex-col lg:flex-row items-center justify-between gap-2.5 px-2.5 sm:px-5 py-2.5 sm:py-3.5">
          <div className="flex w-full lg:w-auto items-center justify-between gap-3">
            <button
              onClick={openHome}
              className="rainbow-border-hover flex shrink-0 items-center gap-1.5 sm:gap-2.5 cursor-pointer px-2.5 py-1.5 sm:px-3 sm:py-2 select-none"
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

          {/* Search Bar - Compact Neo-Brutalist Pill */}
          <div className="relative w-full sm:w-auto sm:max-w-[280px] lg:max-w-[320px] my-1 lg:my-0 flex-1 sm:flex-initial">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group relative flex w-full items-center rounded-full border-2.5 border-ink bg-white shadow-hard-2 focus-within:ring-2 focus-within:ring-ink focus-within:shadow-hard-3 overflow-hidden transition-all duration-300 min-h-[38px] sm:min-h-[44px]"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, toys..."
                className="w-full bg-transparent px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-ink placeholder:text-mute/80 outline-none"
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
                className="btn-press shrink-0 flex items-center justify-center bg-[#FF5A78] text-white px-3.5 sm:px-4 py-2 hover:bg-[#E04866] cursor-pointer transition-all duration-300 group-hover:bg-[#FF4769] min-h-[38px] sm:min-h-[44px]"
                aria-label="Search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
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

            {/* Predictive Instant Live Search Suggestions Panel */}
            {query.trim().length >= 2 && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-card border-3 border-ink bg-white p-2.5 shadow-hard-4 animate-fadeIn">
                <div className="flex items-center justify-between text-[12px] font-extrabold text-mute uppercase px-2 pb-1.5 border-b border-ink/10">
                  <span>⚡ {t("search.liveResults")} ({suggestions.length})</span>
                </div>
                <div className="sticker-scrollbar mt-1 space-y-1.5 max-h-[320px] overflow-y-auto">
                  {suggestions.map((p) => {
                    const pName = lang === "ta" ? p.name_ta : p.name_en;
                    const isOut = p.stock === 0;
                    const isLow = p.stock > 0 && p.stock <= p.low_stock_threshold;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          openProduct(p);
                          setQuery("");
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-tile border-2 border-transparent p-2 text-left hover:border-ink hover:bg-[#FFF6ED] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-[52px] shrink-0">
                            <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" image={p.images[0]} alt="" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-extrabold text-ink group-hover:text-brand transition-colors">
                              {pName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[12px] text-mute mt-0.5">
                              {p.brand && <span className="font-bold text-ink">{p.brand}</span>}
                              {p.brand && <span>·</span>}
                              {isOut ? (
                                <span className="text-[#E24B4A] font-extrabold">{t("shop.outOfStockBadge")}</span>
                              ) : isLow ? (
                                <span className="text-[#946800] font-extrabold">
                                  {t("shop.onlyLeft", { count: p.stock })}
                                </span>
                              ) : (
                                <span className="text-[#386B00] font-bold">{t("shop.inStockBadge")}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-display text-[14px] font-extrabold text-brand">
                            {inr(p.price)}
                          </div>
                          {p.mrp > p.price && (
                            <div className="text-[12px] text-mute line-through">
                              {inr(p.mrp)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 flex-wrap justify-center lg:justify-end">
            {(settings.enable_language_switch ?? true) && (
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "ta" : "en")}
                className="btn-press shrink-0 flex items-center rounded-pill border-2 sm:border-2.5 border-ink bg-[#B9EBDD] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[38px] sm:min-h-[44px] cursor-pointer"
              >
                {t("nav.language")}
              </button>
            )}

            <button
              type="button"
              onClick={() => setModal({ type: "track" })}
              className="btn-press shrink-0 flex items-center rounded-pill border-2 sm:border-2.5 border-ink bg-[#FFE1A8] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[38px] sm:min-h-[44px] cursor-pointer"
            >
              {t("nav.track")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (session) {
                  router.push("/account");
                } else {
                  setModal({ type: "auth" });
                }
              }}
              className="btn-press shrink-0 flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-[#FFE1A8] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[38px] sm:min-h-[44px] cursor-pointer"
              aria-label={t("nav.profile")}
            >
              <span>👤</span>
              <span>{session ? session.name.split(" ")[0] : t("nav.signIn")}</span>
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setModal({ type: "cart" })}
              className="btn-press shrink-0 relative flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-[#FF6B8B] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[38px] sm:min-h-[44px] cursor-pointer hover:bg-[#FF5A78] transition-colors"
              aria-label={t("cart.title")}
            >
              <span>🛒</span>
              <span>{t("nav.cart")}</span>
              {cartCount > 0 && (
                <span className="ml-0.5 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-white bg-ink text-[12px] sm:text-[12px] font-extrabold text-white leading-none shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => setModal({ type: "wishlist" })}
              className="btn-press shrink-0 relative flex items-center gap-1 rounded-pill border-2 sm:border-2.5 border-ink bg-[#A0D2EB] px-2.5 sm:px-3.5 py-1 sm:py-[6px] font-display text-[12px] sm:text-[13px] font-extrabold text-ink shadow-hard-2 min-h-[38px] sm:min-h-[44px] cursor-pointer"
              aria-label="Wishlist"
            >
              <span>♡</span>
              <span>Wishlist</span>
              {wishlist.count > 0 && (
                <span className="ml-0.5 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-white bg-ink text-[12px] sm:text-[12px] font-extrabold text-white leading-none shadow-sm">
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
          {/* Page-level heading. Home/category/brand share this component and its
              visible "title" is the Hero graphic (an <h2>), so this <h1> is
              screen-reader/SEO only — it gives crawlers and heading-navigation a
              real landmark that was previously missing on the site's top URLs. */}
          <h1 className="sr-only">{pageHeading}</h1>
          {route === "home" && isFocusedListing && (
            <div>
              {props.breadcrumb && <Breadcrumbs items={props.breadcrumb} />}

              <div className="mx-auto max-w-[1240px] px-4 sm:px-5 pt-3 sm:pt-5 pb-1">
                {brand !== "all" ? (
                  (() => {
                    const b = brands.find((x) => x.name === brand);
                    return (
                      <div className="flex items-center gap-3">
                        {b?.logo_url && (
                          <div className="h-[56px] w-[56px] shrink-0 overflow-hidden rounded-tile border-2.5 border-ink bg-white shadow-hard-2">
                            {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo, not worth Next/Image's overhead here */}
                            <img src={b.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
                          </div>
                        )}
                        <div>
                          <h2 className="font-display text-[22px] sm:text-[28px] font-extrabold text-ink">
                            {b?.name ?? brand}
                          </h2>
                          <p className="text-[13px] font-bold text-mute">
                            {filtered.length} product{filtered.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div>
                    <h2 className="font-display text-[22px] sm:text-[28px] font-extrabold text-ink">
                      {(() => {
                        const cm = (CATEGORY_META as Record<string, { en: string; ta: string } | undefined>)[category];
                        return cm ? (lang === "ta" ? cm.ta : cm.en) : category;
                      })()}
                    </h2>
                    <p className="text-[13px] font-bold text-mute">
                      {filtered.length} product{filtered.length === 1 ? "" : "s"}
                    </p>
                  </div>
                )}
              </div>

              <ErrorBoundary fallbackTitle="Product grid temporarily unavailable">
                <ShopGrid
                  filtered={filtered}
                  milestone={milestone}
                  setMilestone={setMilestone}
                  category={category}
                  setCategory={setCategory}
                  query={query}
                  setQuery={setQuery}
                  brand={brand}
                  setBrand={setBrand}
                  brands={brands}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  inStockOnly={inStockOnly}
                  setInStockOnly={setInStockOnly}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  addToCart={addToCart}
                  openProduct={openProduct}
                />
              </ErrorBoundary>
            </div>
          )}
          {route === "home" && !isFocusedListing && (
            <div>
              <Hero setCategory={setCategory} settings={settings} reviewCount={reviewAggregate?.reviewCount} />
              <OfferStrip settings={settings} />

              <FreshPicksSection
                products={products}
                openProduct={openProduct}
                addToCart={addToCart}
                onViewAll={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
                onExploreBundles={() => document.getElementById("bundles")?.scrollIntoView({ behavior: "smooth" })}
              />
              <DealOfTheDay products={products} openProduct={openProduct} />
              <BundlesSection bundles={bundles} addToCart={(b) => addToCart(`b:${b.id}`)} />

              <CategoryGrid category={category} setCategory={setCategory} settings={settings} />
              <BrandRail brands={brands} />
              <PromoBanner banners={banners} />
              <BabyClub
                products={products}
                addToCart={addToCart}
                openProduct={openProduct}
                onCreateRegistry={() => setModal({ type: "createRegistry" })}
              />
              <BuyAgain products={buyAgain} addToCart={addToCart} openProduct={openProduct} />
              <RecentlyViewed
                products={products}
                addToCart={addToCart}
                openProduct={openProduct}
              />
              <ErrorBoundary fallbackTitle="Product grid temporarily unavailable">
                <ShopGrid
                  filtered={filtered}
                  milestone={milestone}
                  setMilestone={setMilestone}
                  category={category}
                  setCategory={setCategory}
                  query={query}
                  setQuery={setQuery}
                  brand={brand}
                  setBrand={setBrand}
                  brands={brands}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  inStockOnly={inStockOnly}
                  setInStockOnly={setInStockOnly}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  addToCart={addToCart}
                  openProduct={openProduct}
                />
              </ErrorBoundary>
              <ReviewsStrip reviews={reviews} products={products} />
              <Trust rating={reviewAggregate?.rating} reviewCount={reviewAggregate?.reviewCount} />
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
            onAdd={(variantId) => {
              addToCart(modal.product.id, variantId);
              setModal(null);
            }}
            notify={notify}
            onAddItem={addToCart}
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
              // Seeds the WhatsApp cart-reminder workflow. Fire-and-forget: a
              // logging failure must never block the customer reaching checkout.
              void recordCartAbandonedAction(
                cartItems.reduce((n, c) => n + c.qty, 0),
              ).catch(() => { });
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
        {modal?.type === "profile" && (
          <ProfileModal
            onClose={() => setModal(null)}
            onSignOut={() => setModal({ type: "confirmSignOut" })}
            onOpenOrders={() => setRoute("orders")}
            onOpenRegistry={() => setModal({ type: "createRegistry" })}
          />
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
        {modal?.type === "createRegistry" && (
          <CreateRegistryModal
            products={products}
            onClose={() => setModal(null)}
            onCreated={(slug) => {
              setModal(null);
              notify(`🎁 Registry created! Link: /registry/${slug}`);
            }}
          />
        )}
        {modal?.type === "viewRegistry" && (
          <ViewRegistryModal
            registry={modal.registry}
            products={products}
            onClose={() => setModal(null)}
            onAddToCart={(p) => {
              addToCart(p.id);
              notify(`Added ${p.name_en} as a gift! 🎁`);
            }}
          />
        )}

        <WhatsAppFab />
        <PwaInstallBanner />

        {toast && <Toast message={toast} />}

        {/* Mobile Sticky Floating Cart Bar */}
        {cartCount > 0 && !modal && (
          <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
            <button
              type="button"
              onClick={() => setModal({ type: "cart" })}
              className="btn-press flex w-full items-center justify-between rounded-pill border-3 border-ink bg-brand px-5 py-3 font-display text-[15px] font-extrabold text-white shadow-hard-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink text-[12px] text-white">
                  {cartCount}
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
            <div className="mt-1.5 text-[12px] opacity-80">
              Demo mode — Supabase & Razorpay keys pending
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
