import "server-only";
import type { Product } from "@/lib/types";
import type { Category } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row mapping */
export function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name_en: row.name_en,
    name_ta: row.name_ta,
    slug: row.slug,
    brand: row.brand,
    milestone: row.milestone,
    categories: (row.product_categories ?? []).map((c: any) => c.category as Category),
    price: row.price,
    mrp: row.mrp,
    gst_rate: Number(row.gst_rate),
    stock: row.stock,
    low_stock_threshold: row.low_stock_threshold,
    status: row.status,
    tile_color: row.tile_color,
    emoji: row.emoji,
    images: row.images ?? [],
    description_en: row.description_en,
    description_ta: row.description_ta,
    ingredients: row.ingredients,
  };
}
