"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  addAdminReview,
  addCoupon,
  archiveProduct,
  deleteBanner,
  deleteBrand,
  deleteCoupon,
  moderateReview,
  getStaffLogs,
  quickRestockProduct,
  refundOrder,
  requireStaff,
  resetCustomerPassword,
  saveCustomerNote,
  setCouponFeatured,
  setOrderStatus,
  updateProductStock,
  updateSettings,
  upsertBanner,
  upsertBrand,
  upsertProduct,
  type BannerInput,
  type BrandInput,
  type ProductInput,
} from "@/lib/data/admin";
import type { Coupon, OrderStatus, StoreSettings } from "@/lib/types";
import { randomUUID } from "node:crypto";
import { isDemo } from "@/lib/data/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/env.mjs";
import { PRODUCT_IMAGE_BUCKET, relatedObjectPaths, validateImage } from "@/lib/images";
import { uploadProductImageSet } from "@/lib/product-image-upload";
import { uploadMerchImage } from "@/lib/merch-image-upload";

/** Every admin action re-checks the staff gate server-side, then audits. */

async function gate() {
  const staff = await requireStaff();
  if (!staff) throw new Error("Not authorized");
  return staff.userId;
}

/**
 * Owner-only gate. Staff-management actions (create/disable accounts, reset
 * passwords, resolve approvals) must verify the caller's ROLE, not just that
 * they hold a valid staff session — otherwise any authenticated staff account
 * can escalate itself to owner. requireStaff() returns the role claim straight
 * from the signed session cookie, so this cannot be spoofed client-side.
 */
async function gateOwner() {
  const staff = await requireStaff();
  if (!staff) throw new Error("Not authorized");
  if (staff.role !== "owner") throw new Error("Owner access required");
  return staff.userId;
}

export type ActionResult = { ok: boolean; queued?: boolean; error?: string };

/**
 * Gate for sensitive (destructive/financial) actions. An owner executes
 * immediately; a manager/staff account has the action recorded as a pending
 * approval for the owner to review, and the mutation is NOT run here — it runs
 * later via executeApprovedAction when the owner approves. Returns whether the
 * caller should execute now, or the queued result to return straight back.
 */
async function ownerOrQueue(
  actionType: string,
  description: string,
  payload: Record<string, unknown>,
): Promise<{ execute: true; userId: string } | { execute: false; result: ActionResult }> {
  const staff = await requireStaff();
  if (!staff) throw new Error("Not authorized");
  if (!requiresApproval(staff.role)) return { execute: true, userId: staff.userId };
  const queued = await requestApproval(staff.userId, staff.username, actionType, description, payload);
  if (!queued) {
    return { execute: false, result: { ok: false, error: "Could not submit this for approval. Please try again." } };
  }
  return { execute: false, result: { ok: true, queued: true } };
}

/**
 * Take one product photo and fit it to the storefront's boxes automatically.
 *
 * The admin picks a file and nothing else: the pipeline renders the 3:1 banner
 * and the 5:3 card tile, padding each with the product's own tile_color, and
 * all three objects (both renditions plus the untouched original) are stored
 * under a shared random stem. Only the tile URL is returned — the banner is
 * derived from it by bannerUrlFor(), which is why `products.images` needs no
 * new column to hold two renditions.
 *
 * Goes through the service-role client because the bucket's write policy wants
 * is_staff(), and the admin session is a signed cookie rather than a Supabase
 * auth user — so RLS would reject an anon-key upload from the browser. The
 * gate() above is therefore the only thing standing between a caller and the
 * bucket: keep it first.
 *
 * The returned URL is held in form state and persisted by upsertProductAction,
 * so an abandoned form leaves orphan objects but never a broken product row.
 */
export async function uploadProductImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await gate();

  if (isDemo()) {
    return { ok: false, error: "Image upload needs Supabase keys — currently in demo mode." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file received." };

  const check = validateImage(file.type, file.size);
  if (!check.ok) return { ok: false, error: check.error };

  const result = await uploadProductImageSet(createAdminClient(), {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    slugHint: (formData.get("slug") as string | null) ?? "product",
    source: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
    tileColor: formData.get("tileColor") as string | null,
    random: randomUUID(),
  });

  return result.ok ? { ok: true, url: result.url } : result;
}

/**
 * Remove a product photo and everything rendered from it. Ignores images
 * hosted elsewhere, and handles legacy single-file uploads too.
 */
export async function deleteProductImageAction(url: string): Promise<void> {
  await gate();
  if (isDemo()) return;
  const paths = relatedObjectPaths(url);
  if (!paths.length) return;
  // remove() ignores keys that aren't there, so listing every possible original
  // extension is cheaper than a list() round-trip to find the real one.
  await createAdminClient().storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
}

/**
 * Upload a banner slide or a brand logo, fitted to its slot.
 *
 * Separate from the product upload because the destination and the fit differ:
 * a banner is cropped to fill its 3:1 frame, a logo is contained on white and
 * never cropped. Both land in the same bucket behind the same staff gate.
 */
export async function uploadMerchImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await gate();

  if (isDemo()) {
    return { ok: false, error: "Image upload needs Supabase keys — currently in demo mode." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file received." };

  const check = validateImage(file.type, file.size);
  if (!check.ok) return { ok: false, error: check.error };

  const kind = formData.get("kind") === "brandLogo" ? "brandLogo" : "banner";

  return uploadMerchImage(createAdminClient(), {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    kind,
    slugHint: (formData.get("slug") as string | null) ?? kind,
    source: Buffer.from(await file.arrayBuffer()),
    random: randomUUID(),
  });
}

export async function upsertBannerAction(input: BannerInput) {
  const userId = await gate();
  const id = await upsertBanner(userId, input);
  revalidateTag("catalog:banners"); // storefront caches banners for up to 45s
  revalidatePath("/admin");
  revalidatePath("/");
  return id;
}

export async function deleteBannerAction(id: string): Promise<ActionResult> {
  const g = await ownerOrQueue("banner.delete", `Delete banner ${id}`, { id });
  if (!g.execute) return g.result;
  const res = await deleteBanner(g.userId, id);
  if (!res.ok) return res;
  revalidateTag("catalog:banners");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function upsertBrandAction(input: BrandInput) {
  const userId = await gate();
  const id = await upsertBrand(userId, input);
  revalidateTag("catalog:brands"); // storefront caches active brands for up to 45s
  revalidatePath("/admin");
  revalidatePath("/");
  return id;
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  const g = await ownerOrQueue("brand.delete", `Delete brand ${id}`, { id });
  if (!g.execute) return g.result;
  const res = await deleteBrand(g.userId, id);
  if (!res.ok) return res;
  revalidateTag("catalog:brands");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function setCouponFeaturedAction(code: string, featured: boolean) {
  const userId = await gate();
  await setCouponFeatured(userId, code, featured);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setOrderStatusAction(orderId: string, status: OrderStatus) {
  const userId = await gate();
  const ok = await setOrderStatus(userId, orderId, status);
  revalidatePath("/admin");
  revalidatePath("/");
  return ok;
}

export async function refundOrderAction(orderId: string): Promise<ActionResult> {
  const g = await ownerOrQueue("order.refund", `Refund order ${orderId}`, { orderId });
  if (!g.execute) return g.result;
  const res = await refundOrder(g.userId, orderId);
  revalidatePath("/admin");
  revalidatePath("/");
  return res;
}

export async function getStaffLogsAction(query?: string, entity?: string) {
  await gate();
  return getStaffLogs(query, entity);
}

export async function upsertProductAction(input: ProductInput) {
  const userId = await gate();
  const id = await upsertProduct(userId, input);
  revalidateTag("catalog:products"); // storefront caches the active catalog for up to 45s
  revalidatePath("/admin");
  revalidatePath("/");
  return id;
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  const g = await ownerOrQueue("product.archive", `Archive product ${id}`, { id });
  if (!g.execute) return g.result;
  await archiveProduct(g.userId, id);
  revalidateTag("catalog:products");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function updateProductStockAction(id: string, delta: number) {
  const userId = await gate();
  const ok = await updateProductStock(userId, id, delta);
  revalidateTag("catalog:products");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok;
}

export async function addCouponAction(coupon: Omit<Coupon, "used_count">): Promise<ActionResult> {
  const g = await ownerOrQueue("coupon.add", `Create coupon ${coupon.code}`, { coupon });
  if (!g.execute) return g.result;
  const ok = await addCoupon(g.userId, coupon);
  revalidatePath("/admin");
  return { ok };
}

export async function deleteCouponAction(code: string): Promise<ActionResult> {
  const g = await ownerOrQueue("coupon.delete", `Delete coupon ${code}`, { code });
  if (!g.execute) return g.result;
  await deleteCoupon(g.userId, code);
  revalidatePath("/admin");
  return { ok: true };
}

export async function moderateReviewAction(
  reviewId: string,
  status: "approved" | "rejected",
): Promise<ActionResult> {
  const userId = await gate();
  const res = await moderateReview(userId, reviewId, status);
  if (!res.ok) return res;
  revalidateTag("catalog:reviews"); // storefront caches approved reviews for up to 45s
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function addAdminReviewAction(input: {
  author_name: string;
  rating: number;
  text: string;
  product_id: string;
}): Promise<ActionResult> {
  const userId = await gate();
  const res = await addAdminReview(userId, input);
  if (!res.ok) return res;
  revalidateTag("catalog:reviews");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function saveCustomerNoteAction(customerId: string, notes: string): Promise<ActionResult> {
  const userId = await gate();
  const res = await saveCustomerNote(userId, customerId, notes);
  if (!res.ok) return res;
  revalidatePath("/admin");
  return { ok: true };
}

export async function resetCustomerPasswordAction(customerId: string, newPassword: string) {
  const userId = await gate();
  const ok = await resetCustomerPassword(userId, customerId, newPassword);
  revalidatePath("/admin");
  return ok;
}

export async function quickRestockProductAction(productId: string, addedStock: number) {
  const userId = await gate();
  const ok = await quickRestockProduct(userId, productId, addedStock);
  revalidateTag("catalog:products");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok;
}

export async function updateSettingsAction(patch: Partial<StoreSettings>): Promise<ActionResult> {
  const userId = await gate();
  const res = await updateSettings(userId, patch);
  if (!res.ok) return { ok: false, error: res.error ?? "Failed to save. Please try again." };
  revalidateTag("catalog:settings"); // storefront caches settings for up to 45s
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

import { cookies, headers } from "next/headers";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  clearAttempts,
  createSessionToken,
  isLockedOut,
  recordFailedAttempt,
  verifyAdminCredentials,
} from "@/lib/admin-session";

/** Throttle key: the client IP as Vercel reports it, "unknown" behind a proxy that strips it. */
async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
}

import { hashPassword } from "@/lib/admin-password";
import {
  createStaffAccount,
  executeApprovedAction,
  getPendingApproval,
  requestApproval,
  resetStaffPassword,
  resolvePendingApproval,
  toggleStaffStatus,
} from "@/lib/data/admin";
import { requiresApproval } from "@/lib/approvals";
import type { StaffRole } from "@/lib/types";

/** Admin Username & Password login — issues an HMAC-signed session cookie. */
export async function loginAdminAction(
  username: string,
  passcode: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = await clientKey();

  if (await isLockedOut(key)) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const result = await verifyAdminCredentials(username, passcode);

  if (!result.ok) {
    await recordFailedAttempt(key);
    return {
      ok: false,
      error:
        result.reason === "not_configured"
          ? "Admin login is not configured on this deployment. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET."
          : result.reason === "disabled"
            ? "This staff account has been disabled by the shop owner."
            : "Incorrect Admin Username or Password.",
    };
  }

  const token = createSessionToken(result.id, result.username, result.role);
  if (!token) {
    return { ok: false, error: "Admin session secret is missing or too short (32+ characters)." };
  }

  await clearAttempts(key);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/admin");
  return { ok: true };
}

/** Admin logout */
export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  revalidatePath("/admin");
}

/* ── Staff Management Actions (Owner only) ────────────────────────────────── */

export async function createStaffAccountAction(
  username: string,
  phone: string,
  role: StaffRole,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  await gateOwner();
  if (!username.trim() || !password.trim()) {
    return { ok: false, error: "Username and password are required" };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }
  const passHash = hashPassword(password);
  const res = await createStaffAccount(username.trim(), phone.trim(), role, passHash);
  if (res.ok) revalidatePath("/admin");
  return res;
}

export async function resetStaffPasswordAction(
  staffId: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  await gateOwner();
  if (newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }
  const passHash = hashPassword(newPassword);
  const ok = await resetStaffPassword(staffId, passHash);
  if (!ok) return { ok: false, error: "Failed to reset password. Please try again." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleStaffStatusAction(
  staffId: string,
  status: "active" | "disabled",
): Promise<{ ok: boolean; error?: string }> {
  await gateOwner();
  const ok = await toggleStaffStatus(staffId, status);
  if (!ok) return { ok: false, error: "Failed to update staff status. Please try again." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function approveActionRequestAction(
  approvalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ownerId = await gateOwner();
  const approval = await getPendingApproval(approvalId);
  if (!approval || approval.status !== "pending")
    return { ok: false, error: "This request no longer exists or was already resolved." };
  // Run the real mutation FIRST; only mark the request resolved if it succeeded,
  // so a failed action stays in the queue rather than silently disappearing.
  const res = await executeApprovedAction(approval, ownerId);
  if (!res.ok) return res;
  await resolvePendingApproval(approvalId, ownerId, "approved");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function rejectActionRequestAction(approvalId: string): Promise<{ ok: boolean }> {
  const staff = await gateOwner();
  await resolvePendingApproval(approvalId, staff, "rejected");
  revalidatePath("/admin");
  return { ok: true };
}
