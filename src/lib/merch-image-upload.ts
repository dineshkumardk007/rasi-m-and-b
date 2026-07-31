/**
 * Uploads for the images a shopkeeper manages directly — banner slides and
 * brand logos — fitted to their slot the same way product photos are.
 *
 * Both go into the existing product-images bucket rather than a second one:
 * its policy is already "world reads, staff write", which is exactly what these
 * need, and a new bucket would mean another migration for no different rule.
 * The path prefix is what keeps them apart.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fitToBox } from "./fit-box";
import { PRODUCT_IMAGE_BUCKET, publicUrlFor, slugify } from "./images";
import { MERCH_IMAGE_SPECS, type MerchImageKind } from "./merch-image-specs";

export type MerchUploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadMerchImage(
  supabase: SupabaseClient,
  options: {
    supabaseUrl: string;
    kind: MerchImageKind;
    /** Names the object so the bucket stays browsable. */
    slugHint: string;
    source: Buffer;
    random: string;
  },
): Promise<MerchUploadResult> {
  const spec = MERCH_IMAGE_SPECS[options.kind];

  const fitted = await fitToBox(options.source, {
    width: spec.width,
    height: spec.height,
    strategy: spec.strategy,
    inset: spec.inset,
    background: spec.background,
    format: "webp",
  });

  if (!fitted.ok) return { ok: false, error: fitted.error };

  const name = slugify(options.slugHint) || options.kind;
  const objectPath = `${spec.folder}/${name}-${options.random}.webp`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(objectPath, fitted.body as Uint8Array, {
      contentType: "image/webp",
      cacheControl: "31536000", // immutable: the random suffix changes on re-upload
      upsert: false,
    });

  if (error) return { ok: false, error: `Upload failed: ${error.message}` };
  return { ok: true, url: publicUrlFor(options.supabaseUrl, objectPath) };
}
