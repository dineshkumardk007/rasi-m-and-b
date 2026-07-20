"use server";

import { revalidatePath } from "next/cache";
import {
  addCoupon,
  archiveProduct,
  deleteCoupon,
  moderateReview,
  requireStaff,
  saveCustomerNote,
  setOrderStatus,
  updateSettings,
  upsertProduct,
  type ProductInput,
} from "@/lib/data/admin";
import type { Coupon, OrderStatus, StoreSettings } from "@/lib/types";

/** Every admin action re-checks the staff gate server-side, then audits. */

async function gate() {
  const staff = await requireStaff();
  if (!staff) throw new Error("Not authorized");
  return staff.userId;
}

export async function setOrderStatusAction(orderId: string, status: OrderStatus) {
  const userId = await gate();
  const ok = await setOrderStatus(userId, orderId, status);
  revalidatePath("/admin");
  revalidatePath("/");
  return ok;
}

export async function upsertProductAction(input: ProductInput) {
  const userId = await gate();
  const id = await upsertProduct(userId, input);
  revalidatePath("/admin");
  revalidatePath("/");
  return id;
}

export async function archiveProductAction(id: string) {
  const userId = await gate();
  await archiveProduct(userId, id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function addCouponAction(coupon: Omit<Coupon, "used_count">) {
  const userId = await gate();
  const ok = await addCoupon(userId, coupon);
  revalidatePath("/admin");
  return ok;
}

export async function deleteCouponAction(code: string) {
  const userId = await gate();
  await deleteCoupon(userId, code);
  revalidatePath("/admin");
}

export async function moderateReviewAction(reviewId: string, status: "approved" | "rejected") {
  const userId = await gate();
  await moderateReview(userId, reviewId, status);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveCustomerNoteAction(customerId: string, notes: string) {
  const userId = await gate();
  await saveCustomerNote(userId, customerId, notes);
  revalidatePath("/admin");
}

export async function updateSettingsAction(patch: Partial<StoreSettings>) {
  const userId = await gate();
  await updateSettings(userId, patch);
  revalidatePath("/admin");
  revalidatePath("/");
}
