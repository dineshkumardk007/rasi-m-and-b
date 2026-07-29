/**
 * Re-render every product photo already in the catalogue through the current
 * pipeline, so photos uploaded before the automated fitting existed sit in the
 * storefront boxes the same way new ones do.
 *
 *   pnpm reprocess:images --dry      # report what would change, touch nothing
 *   pnpm reprocess:images            # re-render and repoint products.images
 *   pnpm reprocess:images --force    # also re-render photos already fitted
 *   pnpm reprocess:images --prune    # delete the superseded objects afterwards
 *
 * Safe to re-run. By default an already-fitted photo is left alone, so a second
 * run is a no-op; `--force` re-renders from the stored original, which is what
 * you want after changing a rendition's size or inset in lib/images.ts.
 *
 * Superseded objects are kept unless `--prune` is passed. Storage is cheap and
 * a run that produced something unexpected is then a matter of pointing the
 * rows back, rather than a re-shoot.
 */
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { adminClient } from "./lib";
import {
  ALLOWED_IMAGE_TYPES,
  PRODUCT_IMAGE_BUCKET,
  contentTypeForExtension,
  isManagedTileUrl,
  objectPathFromUrl,
  publicUrlFor,
  relatedObjectPaths,
  RENDITION_EXT,
} from "../src/lib/images";
import { uploadProductImageSet } from "../src/lib/product-image-upload";

const dryRun = process.argv.includes("--dry");
const force = process.argv.includes("--force");
const prune = process.argv.includes("--prune");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type Product = {
  id: string;
  slug: string;
  name_en: string;
  tile_color: string;
  images: string[];
};

/**
 * The bytes to re-render from.
 *
 * For an already-fitted photo that means the stored original, never the tile —
 * re-rendering a rendition would bake its padding into the next one. The
 * original's extension isn't recorded anywhere, so the accepted ones are tried
 * in turn; a `--force` run on a photo uploaded before originals were kept finds
 * none and is skipped rather than degraded.
 */
async function fetchSource(
  url: string,
): Promise<{ body: Buffer; contentType: string } | { error: string }> {
  const candidates: string[] = [];

  if (isManagedTileUrl(url)) {
    const tilePath = objectPathFromUrl(url)!;
    const stem = tilePath.slice(0, -`-tile.${RENDITION_EXT}`.length);
    for (const ext of Object.values(ALLOWED_IMAGE_TYPES)) {
      candidates.push(publicUrlFor(supabaseUrl, `${stem}-original.${ext}`));
    }
  } else {
    candidates.push(url); // legacy or externally hosted: the URL is the original
  }

  for (const candidate of candidates) {
    const res = await fetch(candidate);
    if (!res.ok) continue;
    const body = Buffer.from(await res.arrayBuffer());
    const contentType =
      contentTypeForExtension(extname(new URL(candidate).pathname)) ??
      res.headers.get("content-type") ??
      "image/jpeg";
    return { body, contentType };
  }

  return { error: "no source photo found (uploaded before originals were kept)" };
}

async function main() {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name_en, tile_color, images");

  if (error || !data) {
    console.error(`❌ Could not read products: ${error?.message}`);
    process.exit(1);
  }

  const products = data as Product[];
  const withPhotos = products.filter((p) => p.images.length > 0);

  console.log(
    `\n🖼  ${products.length} product(s) · ${withPhotos.length} with photos · ` +
      `${force ? "re-rendering everything" : "skipping already-fitted photos"}\n`,
  );

  let changed = 0;
  let skipped = 0;
  const failures: string[] = [];
  const superseded: string[] = [];

  for (const product of withPhotos) {
    const pending = product.images.filter((url) => force || !isManagedTileUrl(url));
    if (pending.length === 0) {
      skipped += product.images.length;
      continue;
    }

    console.log(`  ${product.name_en}`);

    const nextImages: string[] = [];
    let productChanged = false;

    for (const url of product.images) {
      if (!force && isManagedTileUrl(url)) {
        nextImages.push(url); // already fitted; leave it exactly as it is
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`    → would re-render ${url.split("/").pop()}`);
        nextImages.push(url);
        productChanged = true;
        continue;
      }

      const source = await fetchSource(url);
      if ("error" in source) {
        console.log(`    ⚠️  ${source.error} — kept as is`);
        failures.push(`${product.name_en}: ${source.error}`);
        nextImages.push(url);
        continue;
      }

      const result = await uploadProductImageSet(supabase, {
        supabaseUrl,
        slugHint: product.slug,
        source: source.body,
        contentType: source.contentType,
        tileColor: product.tile_color,
        random: randomUUID(),
      });

      if (!result.ok) {
        console.log(`    ⚠️  ${result.error} — kept as is`);
        failures.push(`${product.name_en}: ${result.error}`);
        nextImages.push(url);
        continue;
      }

      console.log(`    ✅ re-rendered`);
      superseded.push(...relatedObjectPaths(url));
      nextImages.push(result.url);
      productChanged = true;
    }

    if (productChanged && !dryRun) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ images: nextImages })
        .eq("id", product.id);

      if (updateError) {
        console.log(`    ❌ could not save: ${updateError.message}`);
        failures.push(`${product.name_en}: ${updateError.message}`);
        continue;
      }
      changed += 1;
    } else if (productChanged) {
      changed += 1;
    }
  }

  // Only after every row points at its new photo, so an interrupted run can
  // never leave a product pointing at an object that has just been deleted.
  if (prune && superseded.length && !dryRun) {
    const { error: removeError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(superseded);
    console.log(
      removeError
        ? `\n⚠️  Could not prune old objects: ${removeError.message}`
        : `\n🧹 Pruned ${superseded.length} superseded object(s).`,
    );
  } else if (superseded.length && !dryRun) {
    console.log(`\n💤 ${superseded.length} superseded object(s) left in place — pass --prune to delete.`);
  }

  console.log(`\n${changed} product(s) updated · ${skipped} photo(s) already fitted`);

  if (failures.length) {
    console.log(`\n⚠️  ${failures.length} photo(s) could not be re-rendered:`);
    for (const f of failures) console.log(`    ${f}`);
    console.log(`\n   These products kept their existing photo. Re-upload a larger one to fix.`);
  }

  console.log(dryRun ? "\n🔍 Dry run — nothing changed.\n" : "\n✨ Done.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
