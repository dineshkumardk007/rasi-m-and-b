/**
 * Bulk-upload product photos from a local folder.
 *
 *   pnpm import:images "C:/path/to/photos"          # upload and attach
 *   pnpm import:images "C:/path/to/photos" --dry    # show matches, change nothing
 *
 * Filenames are matched to products by slug. Take the filename, drop the
 * extension and any `-1` / `-2` suffix, slugify it, then look for a product
 * whose slug matches exactly — falling back to a containment match, then to the
 * product name. Numbered suffixes attach extra photos in order, so:
 *
 *   muslin-swaddle-wraps.jpg     → main photo
 *   muslin-swaddle-wraps-2.jpg   → second photo
 *
 * Re-running replaces a product's photos with what the folder holds, so the
 * folder stays the source of truth and repeat runs don't pile up duplicates.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { adminClient } from "./lib";
import {
  PRODUCT_IMAGE_BUCKET,
  contentTypeForExtension,
  imageObjectPath,
  publicUrlFor,
  slugify,
  validateImage,
} from "../src/lib/images";

const folder = process.argv[2] ?? "";
const dryRun = process.argv.includes("--dry");

if (!folder) {
  console.error('Usage: pnpm import:images "C:/path/to/photos" [--dry]');
  process.exit(1);
}

if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`❌ Not a folder: ${folder}`);
  process.exit(1);
}

type Candidate = { file: string; slug: string; order: number };

/** "muslin-swaddle-2.jpg" → { slug: "muslin-swaddle", order: 2 } */
function parseName(file: string): Candidate {
  const stem = basename(file, extname(file));
  const numbered = /^(.*?)[-_ ]?(\d+)$/.exec(stem);
  return numbered
    ? { file, slug: slugify(numbered[1] ?? stem), order: Number(numbered[2]) }
    : { file, slug: slugify(stem), order: 1 };
}

async function main() {
  const supabase = adminClient();

  const { data: products, error } = await supabase.from("products").select("id, slug, name_en");
  if (error || !products) {
    console.error(`❌ Could not read products: ${error?.message}`);
    process.exit(1);
  }

  const files = readdirSync(folder).filter((f) => contentTypeForExtension(extname(f)) !== null);
  if (files.length === 0) {
    console.error(`❌ No JPG/PNG/WebP/AVIF files found in ${folder}`);
    process.exit(1);
  }

  // Group photos by the product they belong to.
  const matched = new Map<string, Candidate[]>();
  const unmatched: string[] = [];

  for (const file of files) {
    const candidate = parseName(file);
    const product =
      products.find((p) => p.slug === candidate.slug) ??
      products.find((p) => p.slug.includes(candidate.slug) || candidate.slug.includes(p.slug)) ??
      products.find((p) => slugify(p.name_en) === candidate.slug);

    if (!product) {
      unmatched.push(file);
      continue;
    }
    const list = matched.get(product.id) ?? [];
    list.push(candidate);
    matched.set(product.id, list);
  }

  console.log(
    `\n📷 ${files.length} image file(s) · ${matched.size} product(s) matched · ${unmatched.length} unmatched\n`,
  );

  for (const [productId, candidates] of matched) {
    const product = products.find((p) => p.id === productId)!;
    candidates.sort((a, b) => a.order - b.order);
    console.log(`  ${product.name_en}`);
    for (const c of candidates) console.log(`    ← ${c.file}`);

    if (dryRun) continue;

    const urls: string[] = [];
    for (const c of candidates) {
      const path = join(folder, c.file);
      const bytes = readFileSync(path);
      const contentType = contentTypeForExtension(extname(c.file));
      if (!contentType) continue;

      const check = validateImage(contentType, bytes.byteLength);
      if (!check.ok) {
        console.log(`    ⚠️  skipped ${c.file} — ${check.error}`);
        continue;
      }

      const objectPath = imageObjectPath(product.slug, contentType, randomUUID());
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(objectPath, bytes, { contentType, cacheControl: "31536000", upsert: false });

      if (uploadError) {
        console.log(`    ⚠️  failed ${c.file} — ${uploadError.message}`);
        continue;
      }
      urls.push(publicUrlFor(process.env.NEXT_PUBLIC_SUPABASE_URL!, objectPath));
    }

    if (urls.length) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ images: urls })
        .eq("id", productId);
      console.log(
        updateError ? `    ❌ ${updateError.message}` : `    ✅ ${urls.length} photo(s) attached`,
      );
    }
  }

  if (unmatched.length) {
    console.log(`\n⚠️  No product matched these files — rename them to the product slug:`);
    for (const f of unmatched) console.log(`    ${f}  (read as "${parseName(f).slug}")`);
    console.log(`\n   Product slugs: ${products.map((p) => p.slug).join(", ")}`);
  }

  console.log(dryRun ? "\n🔍 Dry run — nothing uploaded.\n" : "\n✨ Done.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
