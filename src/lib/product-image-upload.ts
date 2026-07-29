/**
 * The one place a product photo becomes storage objects.
 *
 * The admin action, the bulk folder import and the backfill script all call
 * this, so a photo added through the UI and a photo added from a folder end up
 * byte-identical. Anything that lives in only one of those paths is a bug
 * waiting for the day someone runs the other one.
 *
 * Takes the Supabase client as an argument rather than importing one: the
 * server action needs the request-scoped service-role client, the scripts need
 * their own dotenv-configured one, and this module has no business choosing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderRenditions } from "./image-pipeline";
import {
  PRODUCT_IMAGE_BUCKET,
  originalObjectPath,
  publicUrlFor,
  renditionObjectPath,
} from "./images";

export type UploadSetResult =
  | { ok: true; url: string; objectPaths: string[] }
  | { ok: false; error: string };

/**
 * Render one source photo into every rendition and store the whole set under a
 * shared random stem.
 *
 * Returns the *tile* URL, which is what `products.images` holds; the banner is
 * recovered from it by bannerUrlFor(). `random` is injected so callers control
 * the stem (and so tests are deterministic).
 */
export async function uploadProductImageSet(
  supabase: SupabaseClient,
  options: {
    supabaseUrl: string;
    slugHint: string;
    source: Buffer;
    contentType: string;
    tileColor: string | null | undefined;
    random: string;
  },
): Promise<UploadSetResult> {
  const { supabaseUrl, slugHint, source, contentType, tileColor, random } = options;

  const rendered = await renderRenditions(source, tileColor);
  if (!rendered.ok) return { ok: false, error: rendered.error };

  // The original is kept alongside the renditions so a future layout change can
  // re-render the whole catalogue without anyone hunting down source photos.
  const uploads = [
    ...rendered.renditions.map((r) => ({
      path: renditionObjectPath(slugHint, random, r.kind),
      body: r.body as Uint8Array,
      contentType: r.contentType,
    })),
    {
      path: originalObjectPath(slugHint, random, contentType),
      body: source as Uint8Array,
      contentType,
    },
  ];

  for (const upload of uploads) {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(upload.path, upload.body, {
        contentType: upload.contentType,
        cacheControl: "31536000", // immutable: the random stem changes on re-upload
        upsert: false,
      });

    if (error) {
      // Don't leave a half-written set behind — a tile whose banner is missing
      // renders as a broken image on every product modal.
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploads.map((u) => u.path));
      return { ok: false, error: `Upload failed: ${error.message}` };
    }
  }

  return {
    ok: true,
    url: publicUrlFor(supabaseUrl, renditionObjectPath(slugHint, random, "tile")),
    objectPaths: uploads.map((u) => u.path),
  };
}
