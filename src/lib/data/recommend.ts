import "server-only";
import type { Product } from "@/lib/types";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProducts } from "./catalog";

/**
 * "Often bought with" — real co-purchase counts, not a hand-written rule.
 *
 * Reads which products actually appeared in the same orders as the one being
 * viewed and ranks by how often. A young shop has few orders, so there is a
 * deliberate fallback: when the evidence is thin, top up from the same
 * category. An empty row here would just look broken, and a shop with ten
 * orders should still be able to cross-sell.
 */

const MAX_SUGGESTIONS = 3;

/** Orders scanned for co-purchase evidence. Recent behaviour beats ancient. */
const ORDER_SCAN_LIMIT = 500;

export interface Suggestions {
  products: Product[];
  /** True when the list came from co-purchase data rather than the fallback. */
  fromPurchaseData: boolean;
}

export async function frequentlyBoughtWith(productId: string): Promise<Suggestions> {
  const all = await getActiveProducts();
  const self = all.find((p) => p.id === productId);
  if (!self) return { products: [], fromPurchaseData: false };

  const counts = await coPurchaseCounts(productId);

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => all.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p) && p!.stock > 0);

  const picks = ranked.slice(0, MAX_SUGGESTIONS);
  const fromPurchaseData = picks.length > 0;

  // Thin evidence — top up with same-category items so the row is never empty.
  if (picks.length < MAX_SUGGESTIONS) {
    const chosen = new Set([productId, ...picks.map((p) => p.id)]);
    const sameCategory = all.filter(
      (p) =>
        !chosen.has(p.id) &&
        p.stock > 0 &&
        p.categories.some((c) => self.categories.includes(c)),
    );
    picks.push(...sameCategory.slice(0, MAX_SUGGESTIONS - picks.length));
  }

  return { products: picks, fromPurchaseData };
}

/** product_id → number of orders it shared with `productId`. */
async function coPurchaseCounts(productId: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const bump = (id: string) => {
    if (id && id !== productId) counts.set(id, (counts.get(id) ?? 0) + 1);
  };

  if (isDemo()) {
    for (const order of demoDB().orders) {
      if (!order.items.some((i) => i.product_id === productId)) continue;
      for (const item of order.items) bump(item.product_id);
    }
    return counts;
  }

  const supabase = createAdminClient();

  // Orders containing this product…
  const { data: mine } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("product_id", productId)
    .limit(ORDER_SCAN_LIMIT);

  const orderIds = [...new Set((mine ?? []).map((r) => r.order_id).filter(Boolean))];
  if (orderIds.length === 0) return counts;

  // …and everything else in those same orders.
  const { data: siblings } = await supabase
    .from("order_items")
    .select("product_id")
    .in("order_id", orderIds);

  for (const row of siblings ?? []) bump(row.product_id);
  return counts;
}
