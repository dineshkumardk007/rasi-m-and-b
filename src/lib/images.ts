/**
 * Product image rules, shared by the admin upload action and the bulk import
 * script. Pure helpers only (no "server-only") so scripts/ can import them.
 *
 * One upload produces a fixed set of renditions rather than a single file, so
 * the admin never crops or resizes anything by hand. See image-pipeline.ts for
 * the rendering itself; this module owns the naming and the size rules that
 * both the server action and the scripts have to agree on.
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
 * The two boxes the storefront actually renders a product in. Every upload is
 * cropped to fill both edge-to-edge (see image-pipeline.ts), so a photo shot at
 * any aspect ratio lands correctly in each without the admin touching it.
 */
export const RENDITIONS = {
  /** Wide banner at the top of the product modal and the PDP hero. */
  banner: { width: 1200, height: 400 },
  /** Card tile on the home grid, Fresh Picks, carousels and related rows. */
  tile: { width: 600, height: 360 },
} as const;

export type RenditionKind = keyof typeof RENDITIONS;

/** Renditions are always WebP — one format keeps the derivation below total. */
export const RENDITION_EXT = "webp";
export const RENDITION_CONTENT_TYPE = "image/webp";
export const RENDITION_QUALITY = 82;

/**
 * Smallest source we accept, in each axis. A cover-fit crop scales by
 * max(boxWidth/srcWidth, boxHeight/srcHeight), so avoiding enlargement needs
 * the source to already be at least as large as every box in BOTH width and
 * height — not just on its longest side, since a portrait photo cover-cropped
 * into a wide box scales on the axis that's short, whichever one that is.
 * The banner happens to be the largest box on both axes, so it alone sets the
 * floor. Below this a photo can only be enlarged to fill a box, which reads as
 * visibly soft on the storefront — so it's rejected at upload with a message
 * rather than silently blurred.
 */
export const MIN_SOURCE_WIDTH = Math.max(...Object.values(RENDITIONS).map((r) => r.width));
export const MIN_SOURCE_HEIGHT = Math.max(...Object.values(RENDITIONS).map((r) => r.height));

/**
 * Storage keys for one upload. The random stem keeps re-uploads of the same
 * product from overwriting each other (and busts any CDN cache); the suffix
 * says which rendition the object is, so a banner can be found from a tile URL
 * by string swap alone — no extra column, no second lookup.
 *
 *   nappy-rash-cream/9f3c…-tile.webp
 *   nappy-rash-cream/9f3c…-banner.webp
 *   nappy-rash-cream/9f3c…-original.jpg
 */
export function renditionObjectPath(
  slugHint: string,
  random: string,
  kind: RenditionKind,
): string {
  const base = slugify(slugHint) || "product";
  return `${base}/${random}-${kind}.${RENDITION_EXT}`;
}

/**
 * Key for the untouched upload. Kept so the catalogue can be re-rendered into
 * different boxes later (a layout change, a third rendition) without asking
 * anyone to find and re-upload the original photos.
 */
export function originalObjectPath(
  slugHint: string,
  random: string,
  contentType: string,
): string {
  const ext = ALLOWED_IMAGE_TYPES[contentType] ?? "jpg";
  const base = slugify(slugHint) || "product";
  return `${base}/${random}-original.${ext}`;
}

/**
 * The banner that pairs with a stored tile URL.
 *
 * Products carry only the tile URL in `images[]`. Anything that isn't one of
 * our tile keys — a legacy upload, an externally hosted URL — comes back
 * unchanged, so old rows keep rendering instead of 404ing while the backfill
 * catches up.
 */
export function bannerUrlFor(tileUrl: string): string {
  const suffix = `-tile.${RENDITION_EXT}`;
  return tileUrl.endsWith(suffix)
    ? `${tileUrl.slice(0, -suffix.length)}-banner.${RENDITION_EXT}`
    : tileUrl;
}

/** True when this URL is one of our generated tiles (rather than a legacy file). */
export function isManagedTileUrl(url: string): boolean {
  return objectPathFromUrl(url) !== null && url.endsWith(`-tile.${RENDITION_EXT}`);
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

/**
 * Reject photos too small to cover every box sharply. Checked on the actual
 * (not longest-edge) width and height — orientation matters for a cover-fit
 * crop — after decoding, so the message can name the real size uploaded.
 */
export function validateDimensions(width: number, height: number): ImageValidation {
  if (width < MIN_SOURCE_WIDTH || height < MIN_SOURCE_HEIGHT) {
    return {
      ok: false,
      error:
        `That photo is ${width}×${height} — too small to fill the product banner sharply ` +
        `without enlarging it. Please upload one at least ${MIN_SOURCE_WIDTH}×${MIN_SOURCE_HEIGHT}px.`,
    };
  }
  return { ok: true };
}

/**
 * Every object belonging to one upload, given the tile URL held on the product.
 * Used on delete so removing a photo doesn't strand its banner and original in
 * the bucket. Returns an empty list for legacy or externally hosted URLs.
 */
export function relatedObjectPaths(tileUrl: string): string[] {
  const tilePath = objectPathFromUrl(tileUrl);
  if (!tilePath) return [];

  const suffix = `-tile.${RENDITION_EXT}`;
  if (!tilePath.endsWith(suffix)) return [tilePath]; // legacy single-file upload

  const stem = tilePath.slice(0, -suffix.length);
  return [
    tilePath,
    `${stem}-banner.${RENDITION_EXT}`,
    // The original keeps its source extension, so cover the ones we accept.
    ...Object.values(ALLOWED_IMAGE_TYPES).map((ext) => `${stem}-original.${ext}`),
  ];
}
