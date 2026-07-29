"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "rasi.wishlist";

interface WishlistContextValue {
  items: string[];
  count: number;
  toggle: (itemId: string) => void;
  has: (itemId: string) => boolean;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as string[]);
    } catch {
      /* fallback empty */
    }
  }, []);

  const update = useCallback((fn: (prev: string[]) => string[]) => {
    setItems((prev) => {
      const next = fn(prev);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggle = useCallback(
    (itemId: string) =>
      update((prev) =>
        prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
      ),
    [update],
  );

  const has = useCallback((itemId: string) => items.includes(itemId), [items]);

  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      toggle,
      has,
      clear,
    }),
    [items, toggle, has, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
