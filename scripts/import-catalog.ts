/**
 * Bulk catalog import from CSV — the path real client data arrives through.
 *   pnpm import:catalog path/to/catalog.csv
 *
 * Column reference: see catalog-template.csv. `categories` is |-separated.
 * Upserts by slug (safe to re-run); rows failing validation are reported and
 * skipped — a bad row never aborts the whole import.
 */
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { adminClient, VALID_CATEGORIES, VALID_MILESTONES } from "./lib";

const rowSchema = z.object({
  slug: z.string().min(1),
  name_en: z.string().min(1),
  name_ta: z.string().min(1),
  brand: z.string().default(""),
  milestone: z.enum(VALID_MILESTONES),
  categories: z
    .string()
    .transform((s) => s.split("|").map((c) => c.trim()).filter(Boolean))
    .pipe(z.array(z.enum(VALID_CATEGORIES)).min(1)),
  price: z.coerce.number().int().min(0),
  mrp: z.coerce.number().int().min(0),
  gst_rate: z.coerce.number().min(0).max(28).default(12),
  stock: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  status: z.enum(["active", "archived"]).default("active"),
  tile_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFCBD9"),
  emoji: z.string().default("🧸"),
  images: z
    .string()
    .default("")
    .transform((s) => s.split("|").map((u) => u.trim()).filter(Boolean)),
  description_en: z.string().default(""),
  description_ta: z.string().default(""),
  ingredients: z
    .string()
    .default("")
    .transform((s) => (s.length ? s : null)),
});

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: pnpm import:catalog path/to/catalog.csv");
    process.exit(1);
  }

  const records: Record<string, string>[] = parse(readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`Importing ${records.length} rows from ${file}…`);
  const supabase = adminClient();
  let ok = 0;
  const failures: string[] = [];

  for (const [index, record] of records.entries()) {
    const line = index + 2; // header is line 1
    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) {
      failures.push(
        `line ${line} (${record.slug ?? "?"}): ` +
          parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "),
      );
      continue;
    }

    const { categories, ...product } = parsed.data;
    const { data, error } = await supabase
      .from("products")
      .upsert(product, { onConflict: "slug" })
      .select("id")
      .single();

    if (error || !data) {
      failures.push(`line ${line} (${parsed.data.slug}): ${error?.message}`);
      continue;
    }

    await supabase.from("product_categories").delete().eq("product_id", data.id);
    const { error: catError } = await supabase
      .from("product_categories")
      .insert(categories.map((category) => ({ product_id: data.id, category })));
    if (catError) {
      failures.push(`line ${line} (${parsed.data.slug}) categories: ${catError.message}`);
      continue;
    }
    ok++;
  }

  console.log(`\n✅ Imported ${ok}/${records.length} products.`);
  if (failures.length) {
    console.error(`\n⚠️  ${failures.length} row(s) skipped:`);
    for (const f of failures) console.error(`   • ${f}`);
    process.exitCode = 1;
  }
}

main();
