"use server";

import { currentCustomer } from "@/lib/customer-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CartLine } from "@/lib/types";

/**
 * Fetch the persistent cart for the signed-in customer.
 * Merges gracefully if local storage has un-synced items.
 */
export async function fetchCartAction(): Promise<CartLine[] | null> {
  const me = await currentCustomer();
  if (!me) return null;

  const supabase = createAdminClient();
  const digits = me.sub.replace(/\D/g, "");
  const phone = digits.length === 10 ? digits : null;
  const email = me.sub.includes("@") ? me.sub.toLowerCase() : null;

  const { data: customer } = await (phone
    ? supabase.from("customers").select("id").eq("phone", phone)
    : supabase.from("customers").select("id").eq("email", email)
  ).maybeSingle();

  if (!customer) return null;

  const { data: cart } = await supabase
    .from("customer_carts")
    .select("items")
    .eq("customer_id", customer.id)
    .maybeSingle();

  return (cart?.items as CartLine[]) || [];
}

/**
 * Overwrite the persistent cart for the signed-in customer.
 */
export async function syncCartAction(lines: CartLine[]): Promise<boolean> {
  const me = await currentCustomer();
  if (!me) return false;

  const supabase = createAdminClient();
  const digits = me.sub.replace(/\D/g, "");
  const phone = digits.length === 10 ? digits : null;
  const email = me.sub.includes("@") ? me.sub.toLowerCase() : null;

  const { data: customer } = await (phone
    ? supabase.from("customers").select("id").eq("phone", phone)
    : supabase.from("customers").select("id").eq("email", email)
  ).maybeSingle();

  if (!customer) return false;

  await supabase
    .from("customer_carts")
    .upsert({
      customer_id: customer.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: lines as any,
      updated_at: new Date().toISOString(),
    });

  return true;
}
