"use server";

import { demoDB } from "@/lib/data/demo-store";
import { isDemo } from "@/lib/data/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/events";
import type { Order } from "@/lib/types";

/** Orders for the signed-in customer's phone (Buy again + My orders). */
export async function myOrdersAction(phone: string): Promise<Order[]> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(clean)) return [];
  if (isDemo())
    return demoDB().orders.filter(
      (o) => o.address_snapshot.phone.replace(/\D/g, "").slice(-10) === clean,
    );
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .contains("address_snapshot", { phone: clean })
    .order("placed_at", { ascending: false })
    .limit(20);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (data ?? []).map((row: any) => ({
    id: row.id,
    order_no: row.order_no,
    customer_id: row.customer_id,
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    subtotal: row.subtotal,
    delivery_fee: row.delivery_fee,
    discount: row.discount,
    coupon_code: row.coupon_code,
    total: row.total,
    address_snapshot: row.address_snapshot,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    items: (row.order_items ?? []).map((i: any) => ({
      product_id: i.product_id,
      name_snapshot: i.name_snapshot,
      price_snapshot: i.price_snapshot,
      qty: i.qty,
    })),
    placed_at: row.placed_at,
    language: "en" as const,
  }));
}

/** Notify-me-when-back (wishlist restock alert). */
export async function notifyRestockAction(
  productId: string,
  phone: string | null,
): Promise<boolean> {
  await logEvent("wishlist.notify_restock", { product_id: productId, phone });
  if (!isDemo() && phone) {
    const supabase = createAdminClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone.replace(/\D/g, "").slice(-10))
      .maybeSingle();
    if (customer)
      await supabase
        .from("wishlist")
        .upsert({ customer_id: customer.id, product_id: productId, notify_restock: true });
  }
  return true;
}
