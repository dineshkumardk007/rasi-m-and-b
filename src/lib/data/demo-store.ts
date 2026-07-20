import "server-only";
import type {
  Bundle,
  Coupon,
  CustomerRecord,
  Order,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import type { Category } from "@/lib/constants";
import { CATALOG } from "./seed-catalog";

/**
 * DEMO MODE store — used only while Supabase env keys are absent, so the full
 * site can be exercised before credentials arrive. In-memory (resets on server
 * restart) and mirrors exactly what the Supabase implementation persists.
 * Every function in repository.ts switches on isDemo(); nothing else may
 * import this module.
 */

export interface DemoDB {
  products: Product[];
  bundles: Bundle[];
  coupons: Coupon[];
  reviews: Review[];
  orders: Order[];
  customers: CustomerRecord[];
  settings: StoreSettings;
  events: { type: string; payload: Record<string, unknown>; at: string }[];
  staffLog: { action: string; entity: string; entity_id: string; at: string }[];
  orderSeq: number;
}

function buildProducts(): Product[] {
  return CATALOG.map((row, i) => ({
    id: `demo-p${i + 1}`,
    name_en: row.name_en,
    name_ta: row.name_ta,
    slug: row.slug,
    brand: row.brand,
    milestone: row.milestone,
    categories: row.categories as Category[],
    price: row.price,
    mrp: row.mrp,
    gst_rate: row.gst_rate,
    stock: row.stock,
    low_stock_threshold: 5,
    status: "active",
    tile_color: row.tile_color,
    emoji: row.emoji,
    images: [],
    description_en: row.description_en,
    description_ta: row.description_ta,
    ingredients: row.ingredients ?? null,
  }));
}

/** The three curated bundles from the approved reference. */
function buildBundles(products: Product[]): Bundle[] {
  const idsBySlug = (slugs: string[]) =>
    slugs
      .map((s) => products.find((p) => p.slug === s)?.id)
      .filter((x): x is string => Boolean(x));
  return [
    {
      id: "demo-b1",
      name_en: "Hospital Bag Bundle",
      name_ta: "மருத்துவமனை பை",
      slug: "hospital-bag-bundle",
      product_ids: idsBySlug([
        "newborn-swaddle-set-3",
        "feeding-bottle-125ml-slow",
        "sebamed-baby-wash-200ml",
        "sebamed-baby-lotion-200ml",
      ]),
      bundle_price: 2299,
      mrp: 2824,
      status: "active",
      emoji: "🏥",
      tile_color: "#FFE1A8",
      items_en: ["Swaddle Set", "Feeding Bottle", "Sebamed Wash", "Sebamed Lotion"],
    },
    {
      id: "demo-b2",
      name_en: "First Foods Bundle",
      name_ta: "முதல் உணவு",
      slug: "first-foods-bundle",
      product_ids: idsBySlug([
        "baby-cereal-ragi-300g",
        "sipper-cup-240ml",
        "rattle-teether-set-6",
      ]),
      bundle_price: 999,
      mrp: 1323,
      status: "active",
      emoji: "🥣",
      tile_color: "#D6E8B0",
      items_en: ["Ragi Cereal", "Sipper Cup", "Teether Set"],
    },
    {
      id: "demo-b3",
      name_en: "New Mom Care Bundle",
      name_ta: "புதிய அம்மா",
      slug: "new-mom-care-bundle",
      product_ids: idsBySlug(["nursing-cover-cotton", "stretch-mark-oil-100ml"]),
      bundle_price: 949,
      mrp: 1348,
      status: "active",
      emoji: "💝",
      tile_color: "#FBD0EA",
      items_en: ["Nursing Cover", "Stretch Mark Oil"],
    },
  ];
}

function buildInitial(): DemoDB {
  const products = buildProducts();
  return {
    products,
    bundles: buildBundles(products),
    coupons: [
      { code: "WELCOME10", type: "percent", value: 10, min_order: 499, valid_until: null, usage_limit: null, used_count: 0 },
      { code: "RASI50", type: "flat", value: 50, min_order: 999, valid_until: null, usage_limit: null, used_count: 0 },
    ],
    reviews: [
      {
        id: "demo-r1",
        product_id: products.find((p) => p.slug === "sebamed-baby-wash-200ml")?.id ?? "",
        author_name: "Priya",
        rating: 5,
        text: "Genuine Sebamed at a fair price. Same trust as buying in store.",
        status: "approved",
        created_at: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "demo-r2",
        product_id: products.find((p) => p.slug === "wooden-shape-sorter")?.id ?? "",
        author_name: "Karthika",
        rating: 5,
        text: "Lovely wooden toy, exactly like the collection in the shop. My son loves it.",
        status: "approved",
        created_at: "2026-07-05T10:00:00.000Z",
      },
    ],
    orders: [],
    customers: [],
    settings: {
      same_day_enabled: true,
      // TODO: replace with the owner's confirmed serviceable PIN list
      serviceable_pins: ["628001", "628002", "628003", "628004", "628005", "628008"],
      free_delivery_threshold: 999,
      cod_limit: 3000,
    },
    events: [],
    staffLog: [],
    orderSeq: 1001,
  };
}

// Survive Next.js dev-server HMR reloads.
const g = globalThis as typeof globalThis & { __rasiDemoDB?: DemoDB };

export function demoDB(): DemoDB {
  if (!g.__rasiDemoDB) g.__rasiDemoDB = buildInitial();
  return g.__rasiDemoDB;
}
