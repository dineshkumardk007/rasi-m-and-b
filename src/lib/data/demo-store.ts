import "server-only";
import type {
  BabyRegistry,
  Banner,
  Brand,
  Bundle,
  Coupon,
  CustomerRecord,
  Order,
  Product,
  Review,
  StaffAccount,
  PendingApproval,
  StoreSettings,
  Subscription,
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
  banners: Banner[];
  brands: Brand[];
  coupons: Coupon[];
  reviews: Review[];
  orders: Order[];
  customers: CustomerRecord[];
  registries: BabyRegistry[];
  subscriptions: Subscription[];
  staffAccounts: StaffAccount[];
  pendingApprovals: PendingApproval[];
  settings: StoreSettings;
  events: { type: string; payload: Record<string, unknown>; at: string }[];
  staffLog: { staff_name?: string; action: string; entity: string; entity_id: string; at: string }[];
  orderSeq: number;
}

/**
 * Demo brands, derived from the names already in the seed catalogue so the
 * rail shows the shop's real suppliers. Logos fall back to the store mark:
 * demo mode has no storage bucket to hold real brand artwork.
 */
function buildBrands(): Brand[] {
  const names = [...new Set(CATALOG.map((row) => row.brand))].filter(Boolean).sort();
  return names.map((name, i) => ({
    id: `demo-br${i + 1}`,
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    logo_url: "/logo.png",
    sort: i,
    active: true,
  }));
}

/**
 * Two hero slides and one mid-page promo, pointing at images that really exist
 * in public/ so the carousel can be exercised without a storage bucket.
 */
function buildBanners(): Banner[] {
  return [
    {
      id: "demo-bn1",
      slot: "hero",
      image_url: "/hero-store.jpg",
      alt: "Rasi Mom & Baby store in Thoothukudi",
      link_url: "/c/feeding",
      sort: 0,
      starts_at: null,
      ends_at: null,
      active: true,
    },
    {
      id: "demo-bn2",
      slot: "hero",
      image_url: "/hero-wallpaper.png",
      alt: "Same-day delivery across Thoothukudi",
      link_url: null,
      sort: 1,
      starts_at: null,
      ends_at: null,
      active: true,
    },
    {
      id: "demo-bn3",
      slot: "mid",
      image_url: "/hero-wallpaper.png",
      alt: "Join the Baby Club",
      link_url: null,
      sort: 0,
      starts_at: null,
      ends_at: null,
      active: true,
    },
  ];
}

function buildProducts(brands: Brand[]): Product[] {
  const idByName = new Map(brands.map((b) => [b.name, b.id]));
  return CATALOG.map((row, i) => {
    let variants: Product["variants"] = undefined;
    let size_chart_type: Product["size_chart_type"] = undefined;

    if (row.slug.includes("diaper")) {
      size_chart_type = "diaper";
      variants = [
        { id: `v-${row.slug}-nb`, name_en: "NB Size (< 5kg)", name_ta: "NB சைஸ் (< 5கி)", price: row.price - 50, mrp: row.mrp - 50, stock: 20 },
        { id: `v-${row.slug}-s`, name_en: "S Size (4–8kg)", name_ta: "S சைஸ் (4–8கி)", price: row.price - 20, mrp: row.mrp - 20, stock: 25 },
        { id: `v-${row.slug}-m`, name_en: "M Size (7–12kg)", name_ta: "M சைஸ் (7–12கி)", price: row.price, mrp: row.mrp, stock: row.stock },
        { id: `v-${row.slug}-l`, name_en: "L Size (9–14kg)", name_ta: "L சைஸ் (9–14கி)", price: row.price + 50, mrp: row.mrp + 50, stock: 15 },
        { id: `v-${row.slug}-xl`, name_en: "XL Size (12–17kg)", name_ta: "XL சைஸ் (12–17கி)", price: row.price + 100, mrp: row.mrp + 100, stock: 10 },
      ];
    } else if (row.categories.includes("clothing")) {
      size_chart_type = "clothing";
      variants = [
        { id: `v-${row.slug}-03m`, name_en: "0–3 Months", name_ta: "0–3 மாதங்கள்", price: row.price, mrp: row.mrp, stock: row.stock },
        { id: `v-${row.slug}-36m`, name_en: "3–6 Months", name_ta: "3–6 மாதங்கள்", price: row.price + 30, mrp: row.mrp + 30, stock: 15 },
        { id: `v-${row.slug}-612m`, name_en: "6–12 Months", name_ta: "6–12 மாதங்கள்", price: row.price + 50, mrp: row.mrp + 50, stock: 12 },
      ];
    } else if (row.slug.includes("wash") || row.slug.includes("lotion")) {
      variants = [
        { id: `v-${row.slug}-200`, name_en: "200 ml Bottle", name_ta: "200 மிலி பாட்டில்", price: row.price, mrp: row.mrp, stock: row.stock },
        { id: `v-${row.slug}-400`, name_en: "400 ml Bottle", name_ta: "400 மிலி பாட்டில்", price: Math.round(row.price * 1.7), mrp: Math.round(row.mrp * 1.7), stock: 10 },
      ];
    }

    return {
      id: `demo-p${i + 1}`,
      name_en: row.name_en,
      name_ta: row.name_ta,
      slug: row.slug,
      brand: row.brand,
      brand_id: idByName.get(row.brand) ?? null,
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
      variants,
      size_chart_type,
    };
  });
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
  const brands = buildBrands();
  const products = buildProducts(brands);
  return {
    products,
    bundles: buildBundles(products),
    banners: buildBanners(),
    brands,
    coupons: [
      { code: "WELCOME10", type: "percent", value: 10, min_order: 499, valid_until: null, usage_limit: null, used_count: 0, featured: true },
      { code: "RASI50", type: "flat", value: 50, min_order: 999, valid_until: null, usage_limit: null, used_count: 0, featured: true },
    ],
    reviews: [
      {
        id: "demo-r1",
        product_id: products.find((p) => p.slug === "wooden-shape-sorter")?.id ?? "",
        author_name: "Karthiga",
        rating: 5,
        text: "Huge toy collection at reasonable prices — the staff patiently helped us choose.",
        status: "approved",
        created_at: "2026-07-28T10:00:00.000Z",
      },
      {
        id: "demo-r2",
        product_id: products[0]?.id ?? "",
        author_name: "Amal Home",
        rating: 5,
        text: "Had a great experience shopping here for my newborn baby. The staff were very supportive and made the whole process easy and comfortable for us. Special thanks to Susmita & Nisha!",
        status: "approved",
        created_at: "2026-07-25T10:00:00.000Z",
      },
      {
        id: "demo-r3",
        product_id: products.find((p) => p.slug === "wooden-shape-sorter")?.id ?? "",
        author_name: "Maha Raja",
        rating: 5,
        text: "I highly recommend Rasi Mom & Baby to every parent! 🧸🎉 The toy collection is fantastic and the baby products are of great quality with excellent service.",
        status: "approved",
        created_at: "2026-07-24T10:00:00.000Z",
      },
      {
        id: "demo-r4",
        product_id: products[1]?.id ?? "",
        author_name: "Brinda Devi",
        rating: 5,
        text: "Today I bought a car for my little king Goldwin 👑 Really happy and satisfied by the service. Good choice of shop for our little ones! 👶🏻✨",
        status: "approved",
        created_at: "2026-07-22T10:00:00.000Z",
      },
      {
        id: "demo-r5",
        product_id: products[2]?.id ?? "",
        author_name: "Joshua D",
        rating: 5,
        text: "I would say this is the bestest shop for mommy and kids in Tuticorin. The collections in every category is amazing and worth the price. Whatever things we buy here is long lasting.",
        status: "approved",
        created_at: "2026-07-20T10:00:00.000Z",
      },
      {
        id: "demo-r6",
        product_id: products[3]?.id ?? "",
        author_name: "R. Nanda Kumar",
        rating: 5,
        text: "I recently visited this shop to buy a gift for a baby, and I was really impressed! They have a great collection of toys, especially remote cars and fun gift items for kids.",
        status: "approved",
        created_at: "2026-07-18T10:00:00.000Z",
      },
      {
        id: "demo-r7",
        product_id: products[4]?.id ?? "",
        author_name: "Suganya Raj",
        rating: 5,
        text: "I recently purchased kids clothes online from Rasi Mom & Baby shop, and I’m really happy with the experience. The quality of the products is amazing, and delivery was quick.",
        status: "approved",
        created_at: "2026-07-15T10:00:00.000Z",
      },
      {
        id: "demo-r8",
        product_id: products[5]?.id ?? "",
        author_name: "Mari Appan",
        rating: 5,
        text: "Bike collection is very good! Had a very nice experience visiting Rasi Mom & Baby. Loved the service and response by the team. 👍👍👍👍👍",
        status: "approved",
        created_at: "2026-07-12T10:00:00.000Z",
      },
      {
        id: "demo-r9",
        product_id: products[6]?.id ?? "",
        author_name: "P Sakthivel",
        rating: 5,
        text: "Very nice rating! The staff were very supportive and made the whole process easy and comfortable for us throughout the purchase.",
        status: "approved",
        created_at: "2026-07-10T10:00:00.000Z",
      },
    ],
    orders: [],
    customers: [
      {
        id: "demo-c1",
        name: "Devi Lakshmi",
        phone: "9876543210",
        email: "devi@example.com",
        language: "en",
        whatsapp_opt_in: true,
        baby_dob: "2025-11-15",
        notes: "Prefers organic products. Frequent store visitor.",
        created_at: "2026-06-01T10:00:00.000Z",
        addresses: [
          {
            id: "addr-1",
            customer_id: "demo-c1",
            label: "Home",
            name: "Devi Lakshmi",
            phone: "9876543210",
            line: "12, Beach Road, Near Pearl City Beach",
            city: "Thoothukudi",
            pin: "628001",
            is_default: true,
          },
          {
            id: "addr-2",
            customer_id: "demo-c1",
            label: "Parents' House",
            name: "Devi Lakshmi",
            phone: "9876543210",
            line: "45, Palayamkottai Road",
            city: "Thoothukudi",
            pin: "628002",
            is_default: false,
          },
        ],
      },
    ],
    registries: [],
    subscriptions: [],
    staffAccounts: [
      {
        id: "demo-staff-1",
        username: "priya_manager",
        phone: "9876543210",
        password_hash: "scrypt:demo-salt:demo-hash",
        role: "manager",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-staff-2",
        username: "rahul_sales",
        phone: "9123456780",
        password_hash: "scrypt:demo-salt:demo-hash",
        role: "staff",
        status: "active",
        created_at: new Date().toISOString(),
      },
    ],
    pendingApprovals: [],
    settings: {
      same_day_enabled: true,
      serviceable_pins: ["628001", "628002", "628003", "628004", "628005", "628008"],
      free_delivery_threshold: 999,
      cod_limit: 3000,
      gift_wrap_enabled: true,
      gift_wrap_fee: 30,
      enable_language_switch: true,
      announcement_enabled: true,
      announcement_text_en: "🎉 FLAT 10% OFF with code WELCOME10 · 🚚 FREE Delivery on orders over ₹999 · ⚡ Express 3-Hour Store Delivery in Thoothukudi",
      announcement_text_ta: "🎉 WELCOME10 கூப்பனுடன் 10% தள்ளுபடி · 🚚 ₹999 மேல் இலவச டெலிவரி · ⚡ தூத்துக்குடியில் 3 மணி நேர விரைவு டெலிவரி",
      announcement_bg: "#2B2140",
      announcement_color: "#FFE1A8",
      announcement_link: "",
    },
    events: [],
    staffLog: [],
    orderSeq: 1001,
  };
}

// Survive Next.js dev-server HMR reloads.
const g = globalThis as typeof globalThis & { __rasiDemoDB?: DemoDB };

export function demoDB(): DemoDB {
  if (!g.__rasiDemoDB) {
    g.__rasiDemoDB = buildInitial();
  } else {
    // Refresh reviews and catalog from initial setup so HMR updates are instant
    const fresh = buildInitial();
    g.__rasiDemoDB.reviews = fresh.reviews;
  }
  return g.__rasiDemoDB;
}
