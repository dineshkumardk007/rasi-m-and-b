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
import { useSession } from "@/lib/store/SessionProvider";
import { fetchCartAction, syncCartAction } from "@/app/cart-actions";

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
  const { session } = useSession();

  // 1. Initial load from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* corrupted cart — start fresh */
    }
  }, []);

  // 2. Load from remote and merge when session appears
  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetchCartAction().then((remoteCart) => {
      if (!alive || !remoteCart) return;
      setLines((prev) => {
        // Simple merge: keep remote cart, append local items that aren't in remote
        const merged = [...remoteCart];
        for (const local of prev) {
          if (!merged.some((r) => sameLine(r, local.itemId, local.variantId))) {
            merged.push(local);
          }
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        // Push merged state back to server
        if (merged.length > remoteCart.length) {
          syncCartAction(merged).catch(console.error);
        }
        return merged;
      });
    }).catch(console.error);
    return () => { alive = false; };
  }, [session]);

  // Functional updates so rapid successive adds never clobber each other.
  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      
      // Fire and forget sync if session exists. We don't block the UI update.
      // In a more robust system, we would debounce this.
      syncCartAction(next).catch(console.error);
      
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
