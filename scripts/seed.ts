/**
 * Seed the database with the ~40-SKU placeholder catalog.
 *   pnpm seed
 * Idempotent: upserts by slug, so re-running is safe. Real catalog data
 * replaces this via `pnpm import:catalog file.csv` with no code changes.
 */
import { adminClient } from "./lib";
import { CATALOG } from "../src/lib/data/seed-catalog";

async function main() {
  const supabase = adminClient();
  let ok = 0;

  for (const row of CATALOG) {
    const { categories, ...product } = row;

    const { data, error } = await supabase
      .from("products")
      .upsert(product, { onConflict: "slug" })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`✗ ${row.slug}: ${error?.message ?? "no row returned"}`);
      process.exitCode = 1;
      continue;
    }

    // Replace category links to match the row exactly.
    await supabase.from("product_categories").delete().eq("product_id", data.id);
    const { error: catError } = await supabase
      .from("product_categories")
      .insert(categories.map((category) => ({ product_id: data.id, category })));

    if (catError) {
      console.error(`✗ ${row.slug} categories: ${catError.message}`);
      process.exitCode = 1;
      continue;
    }
    ok++;
  }

  console.log(`\n✅ Seeded ${ok}/${CATALOG.length} products.`);
}

main();
