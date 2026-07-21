/**
 * Storefront event tracking — one call site per event, dispatched to whichever
 * of Meta Pixel / GA4 is configured (see components/Analytics.tsx).
 *
 * Every function is a no-op when the tag is absent, so components can call them
 * unconditionally and nothing breaks in dev or on a keyless deploy.
 *
 * Rule: no personal data. Product ids, names, prices and totals only — never a
 * customer's name, phone, address or order number.
 */

const CURRENCY = "INR";

type Trackable = {
  id: string;
  name: string;
  price: number;
  qty?: number;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

function meta(event: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) window.fbq("track", event, params);
}

function ga(event: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) window.gtag("event", event, params);
}

const gaItems = (items: Trackable[]) =>
  items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.qty ?? 1,
  }));

const total = (items: Trackable[]) =>
  items.reduce((sum, i) => sum + i.price * (i.qty ?? 1), 0);

/** A product page or quick-view was opened. */
export function trackViewContent(item: Trackable) {
  meta("ViewContent", {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price,
    currency: CURRENCY,
  });
  ga("view_item", { currency: CURRENCY, value: item.price, items: gaItems([item]) });
}

export function trackAddToCart(item: Trackable) {
  meta("AddToCart", {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price * (item.qty ?? 1),
    currency: CURRENCY,
  });
  ga("add_to_cart", {
    currency: CURRENCY,
    value: item.price * (item.qty ?? 1),
    items: gaItems([item]),
  });
}

/** Checkout opened — the denominator for abandoned-checkout rate. */
export function trackBeginCheckout(items: Trackable[]) {
  meta("InitiateCheckout", {
    content_ids: items.map((i) => i.id),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.qty ?? 1), 0),
    value: total(items),
    currency: CURRENCY,
  });
  ga("begin_checkout", { currency: CURRENCY, value: total(items), items: gaItems(items) });
}

/**
 * Order placed. `value` is the order total actually charged (after delivery and
 * discount), not the cart subtotal, so ad platforms optimise on real revenue.
 */
export function trackPurchase(orderValue: number, items: Trackable[]) {
  meta("Purchase", {
    content_ids: items.map((i) => i.id),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.qty ?? 1), 0),
    value: orderValue,
    currency: CURRENCY,
  });
  ga("purchase", {
    currency: CURRENCY,
    value: orderValue,
    items: gaItems(items),
  });
}

/** What customers type in the shop search — the cheapest demand signal there is. */
export function trackSearch(query: string) {
  meta("Search", { search_string: query });
  ga("search", { search_term: query });
}
