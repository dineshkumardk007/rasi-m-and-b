"use client";

/**
 * Recently viewed products.
 *
 * Kept in localStorage rather than the database on purpose: it is useful to a
 * signed-out visitor (most first-time shoppers), needs no round trip, and keeps
 * browsing history off the server — nothing here is worth the privacy cost of
 * storing per account.
 *
 * Stores ids only. Names and prices are resolved from the live catalogue at
 * render time, so a price change or a rename never shows stale data, and an
 * archived product simply disappears from the strip.
 */

const KEY = "rasi.recentlyViewed";
const MAX = 12;

export function recordView(productId: string): void {
  if (typeof window === "undefined" || !productId) return;
  try {
    const next = [productId, ...readIds().filter((id) => id !== productId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    // Same-tab listeners: the storage event only fires in *other* tabs.
    window.dispatchEvent(new CustomEvent(VIEW_EVENT));
  } catch {
    // Private browsing / quota — a missing history is not worth an error.
  }
}

export function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function clearViews(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(VIEW_EVENT));
  } catch {
    /* ignore */
  }
}

export const VIEW_EVENT = "rasi:recently-viewed";
