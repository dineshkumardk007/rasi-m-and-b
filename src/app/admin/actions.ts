"use server";

import { revalidatePath } from "next/cache";
import {
  addAdminReview,
  addCoupon,
  archiveProduct,
  deleteBanner,
  deleteBrand,
  deleteCoupon,
  moderateReview,
  requireStaff,
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
  revalidatePath("/admin");
  revalidatePath("/");
  return id;
}

export async function deleteBannerAction(id: string) {
  const userId = await gate();
  await deleteBanner(userId, id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function upsertBrandAction(input: BrandInput) {
  const userId = await gate();
  const id = await upsertBrand(userId, input);
  revalidatePath("/admin");
  revalidatePath("/");
  return id;
}

export async function deleteBrandAction(id: string) {
  const userId = await gate();
  await deleteBrand(userId, id);
  revalidatePath("/admin");
  revalidatePath("/");
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

export async function updateProductStockAction(id: string, delta: number) {
  const userId = await gate();
  const ok = await updateProductStock(userId, id, delta);
  revalidatePath("/admin");
  revalidatePath("/");
  return ok;
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

export async function addAdminReviewAction(input: { author_name: string; rating: number; text: string; product_id: string }) {
  const userId = await gate();
  await addAdminReview(userId, input);
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

/** Admin Username & Password login — issues an HMAC-signed session cookie. */
export async function loginAdminAction(
  username: string,
  passcode: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = await clientKey();

  if (await isLockedOut(key)) {
    return { ok: false, error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const result = verifyAdminCredentials(username, passcode);

  if (!result.ok) {
    await recordFailedAttempt(key);
    return {
      ok: false,
      error:
        result.reason === "not_configured"
          ? "Admin login is not configured on this deployment. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET."
          : "Incorrect Admin Username or Password.",
    };
  }

  const token = createSessionToken();
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
