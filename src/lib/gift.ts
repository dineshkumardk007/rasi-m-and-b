/**
 * Gift orders.
 *
 * Baby products are heavily gifted — showers, first birthdays, naming days — so
 * an order can be marked as a gift. Two consequences follow, and both matter to
 * the person receiving the parcel:
 *
 *  1. Prices are hidden on the invoice. Handing someone a gift with the price
 *     printed on it is the whole thing you are trying to avoid.
 *  2. The sender's message travels with the order and is printed instead.
 */

/** Matches the orders_gift_message_len constraint in the migration. */
export const GIFT_MESSAGE_MAX = 300;

export interface GiftFields {
  is_gift?: boolean;
  gift_message?: string | null;
}

/** Should money be shown for this order? */
export function showPrices(order: GiftFields): boolean {
  return order.is_gift !== true;
}

/** Normalise a message for storage: trimmed, capped, empty becomes null. */
export function normalizeGiftMessage(
  message: string | null | undefined,
  isGift: boolean,
): string | null {
  if (!isGift) return null;
  const trimmed = (message ?? "").trim().slice(0, GIFT_MESSAGE_MAX);
  return trimmed.length > 0 ? trimmed : null;
}
