/**
 * Product image rules, shared by the admin upload action and the bulk import
 * script. Pure helpers only (no "server-only") so scripts/ can import them.
 */

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — phone photos fit comfortably

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Map a file extension to its content type. Returns null for unsupported files. */
export function contentTypeForExtension(ext: string): string | null {
  const normalized = ext.replace(/^\./, "").toLowerCase();
  const match = Object.entries(ALLOWED_IMAGE_TYPES).find(
    ([, e]) => e === (normalized === "jpeg" ? "jpg" : normalized),
  );
  return match ? match[0] : null;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Storage key for an upload. The random suffix keeps re-uploads of the same
 * product from overwriting each other (and busts any CDN cache).
 */
export function imageObjectPath(slugHint: string, contentType: string, random: string): string {
  const ext = ALLOWED_IMAGE_TYPES[contentType] ?? "jpg";
  const base = slugify(slugHint) || "product";
  return `${base}/${random}.${ext}`;
}

export function publicUrlFor(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${objectPath}`;
}

/** Recover the storage key from a public URL, for deletes. Null if the URL is external. */
export function objectPathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : url.slice(at + marker.length);
}

export type ImageValidation = { ok: true } | { ok: false; error: string };

export function validateImage(contentType: string, bytes: number): ImageValidation {
  if (!ALLOWED_IMAGE_TYPES[contentType]) {
    return { ok: false, error: "Only JPG, PNG, WebP or AVIF images are allowed." };
  }
  if (bytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image is larger than 5 MB — please resize and try again." };
  }
  if (bytes === 0) {
    return { ok: false, error: "That file is empty." };
  }
  return { ok: true };
}
