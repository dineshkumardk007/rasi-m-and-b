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
  add: (itemId: string) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
}

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
    (itemId: string) =>
      update((prev) =>
        prev.some((l) => l.itemId === itemId)
          ? prev.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + 1 } : l))
          : [...prev, { itemId, qty: 1 }],
      ),
    [update],
  );

  const setQty = useCallback(
    (itemId: string, qty: number) =>
      update((prev) =>
        qty <= 0
          ? prev.filter((l) => l.itemId !== itemId)
          : prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
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
