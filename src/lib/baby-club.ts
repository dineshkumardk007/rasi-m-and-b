import type { Coupon } from "./types";
import { isBirthdayMonth, isInClub } from "./baby";

/**
 * The birthday perk.
 *
 * Deliberately NOT a row in the coupons table. A real row would be a public
 * code: once one customer saw "BABYBDAY", it would work for everyone, every
 * month, forever. Instead the code resolves to a coupon only while the asking
 * customer is inside their own baby's birthday month — so it is personal by
 * construction, and there is nothing to leak.
 *
 * Because it has no row, it also has no usage counter to increment; see the
 * guard in placeOrder.
 */

export const BIRTHDAY_COUPON_CODE = "BABYBDAY";
export const BIRTHDAY_COUPON_PERCENT = 10;
export const BIRTHDAY_COUPON_MIN_ORDER = 499;

/** Does this code refer to the birthday perk? Case/space tolerant. */
export function isBirthdayCode(code: string): boolean {
  return code.trim().toUpperCase() === BIRTHDAY_COUPON_CODE;
}

/**
 * The coupon a given baby's date of birth earns right now, or null.
 * Pure — the caller supplies the date, so this is testable without a session.
 */
export function birthdayCouponFor(
  dob: string | null | undefined,
  now = new Date(),
): Coupon | null {
  if (!dob || !isInClub(dob, now) || !isBirthdayMonth(dob, now)) return null;
  return {
    code: BIRTHDAY_COUPON_CODE,
    type: "percent",
    value: BIRTHDAY_COUPON_PERCENT,
    min_order: BIRTHDAY_COUPON_MIN_ORDER,
    // Expires at the end of the birthday month, so the coupon cannot be
    // replayed later even if a stale copy is held somewhere.
    valid_until: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    usage_limit: null,
    used_count: 0,
  };
}
