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
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "rasi.cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  /** (itemId, variantId) together identify a line — two variants of the same
   *  product are separate lines, each with their own quantity. */
  add: (itemId: string, variantId?: string) => void;
  setQty: (itemId: string, qty: number, variantId?: string) => void;
  clear: () => void;
}

const sameLine = (l: CartLine, itemId: string, variantId?: string) =>
  l.itemId === itemId && (l.variantId ?? null) === (variantId ?? null);

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* corrupted cart — start fresh */
    }
  }, []);

  // Functional updates so rapid successive adds never clobber each other.
  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const add = useCallback(
    (itemId: string, variantId?: string) =>
      update((prev) =>
        prev.some((l) => sameLine(l, itemId, variantId))
          ? prev.map((l) => (sameLine(l, itemId, variantId) ? { ...l, qty: l.qty + 1 } : l))
          : [...prev, { itemId, variantId, qty: 1 }],
      ),
    [update],
  );

  const setQty = useCallback(
    (itemId: string, qty: number, variantId?: string) =>
      update((prev) =>
        qty <= 0
          ? prev.filter((l) => !sameLine(l, itemId, variantId))
          : prev.map((l) => (sameLine(l, itemId, variantId) ? { ...l, qty } : l)),
      ),
    [update],
  );

  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add,
      setQty,
      clear,
    }),
    [lines, add, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
