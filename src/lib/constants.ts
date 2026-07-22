/**
 * Real business data — Section 1 of the spec. Use verbatim across the site.
 * The values marked TODO are awaiting owner confirmation; do not invent them.
 */
export const BUSINESS = {
  name: "Rasi Mom & Baby",
  address:
    "176, Palayamkottai Rd, opp. Rajaji Park, Thoothukudi, Tamil Nadu 628001",
  addressShort: "176, Palayamkottai Rd, opp. Rajaji Park, Thoothukudi 628001",
  /** The same address, split for schema.org PostalAddress. */
  postal: {
    street: "176, Palayamkottai Rd, opp. Rajaji Park",
    locality: "Thoothukudi",
    region: "Tamil Nadu",
    postalCode: "628001",
    country: "IN",
  },
  city: "Thoothukudi",
  opensAt: "9:00 AM",
  closesAt: null as string | null, // TODO: confirm closing time with owner before footer is finalized
  rating: 4.8,
  reviewCount: 2360,
  staff: ["Nisha", "Harini", "Punitha"] as const, // consent confirmation pending
  sameDayCutoffHour: 16, // 4 PM local — same-day delivery cutoff
  gstin: null as string | null, // TODO: owner's GST number (invoice footer)
  // TODO: REQUIRED before Razorpay merchant activation — the gateway checks that
  // a reachable phone and email are published on /contact. The legal pages and
  // the contact page render each channel only when it is non-null, so leaving
  // these unset ships an incomplete (but not fabricated) contact page.
  phone: null as string | null, // e.g. "+91 98765 43210"
  email: null as string | null, // e.g. "hello@rasimomandbaby.in"
  /**
   * Window in days a customer has to raise a return/replacement, counted from
   * delivery. Quoted verbatim in the refund policy, so it is a business
   * decision rather than a constant to guess at.
   */
  returnWindowDays: 7, // TODO: confirm with owner — 7 is the common local default
  socials: {
    // TODO: real URLs from owner (Section 9)
    whatsapp: null as string | null,
    instagram: null as string | null,
    facebook: null as string | null,
    youtube: null as string | null,
  },
} as const;

export const MILESTONES = ["newborn", "infant", "toddler", "mom"] as const;
export type Milestone = (typeof MILESTONES)[number];

export const CATEGORIES = [
  "feeding",
  "bath",
  "toys",
  "clothing",
  "diapering",
  "gear",
  "health",
  "mom",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Milestone display metadata — copy matches the approved reference exactly. */
export const MILESTONE_META: Record<
  Milestone,
  { en: string; ta: string; shortEn: string; shortTa: string; emoji: string; bg: string }
> = {
  newborn: { en: "Newborn 0–3 months", ta: "பிறந்த குழந்தை", shortEn: "0–3 months", shortTa: "0–3 மாதம்", emoji: "🍼", bg: "#FFE1A8" },
  infant: { en: "Infant 3–12 months", ta: "சிசு", shortEn: "3–12 months", shortTa: "3–12 மாதம்", emoji: "🧸", bg: "#C7E9FF" },
  toddler: { en: "Toddler 1–3 years", ta: "தளிர்நடை", shortEn: "1–3 years", shortTa: "1–3 வயது", emoji: "🚂", bg: "#D6E8B0" },
  mom: { en: "For Mom", ta: "அம்மாவுக்காக", shortEn: "For Mom", shortTa: "அம்மாவுக்கு", emoji: "🌸", bg: "#FBD0EA" },
};

/** Category display metadata — colours and copy match the approved reference. */
export const CATEGORY_META: Record<
  Category,
  { en: string; ta: string; emoji: string; bg: string; pop: string }
> = {
  feeding: { en: "Feeding", ta: "உணவளித்தல்", emoji: "🍼", bg: "#FFE1A8", pop: "#F59E0B" },
  bath: { en: "Bath & Skincare", ta: "குளியல்", emoji: "🫧", bg: "#C7E9FF", pop: "#3B9EDB" },
  toys: { en: "Toys & Play", ta: "பொம்மைகள்", emoji: "🧸", bg: "#FFCBD9", pop: "#EC5D8A" },
  clothing: { en: "Clothing", ta: "ஆடைகள்", emoji: "👕", bg: "#D6E8B0", pop: "#7CB342" },
  diapering: { en: "Diapering", ta: "டயப்பர்", emoji: "🧷", bg: "#E4D6FF", pop: "#9A6BE0" },
  gear: { en: "Gear", ta: "உபகரணங்கள்", emoji: "🛒", bg: "#B9EBDD", pop: "#1FB995" },
  health: { en: "Health & Safety", ta: "ஆரோக்கியம்", emoji: "🌡️", bg: "#FFD6C2", pop: "#F26B4A" },
  mom: { en: "Mom Care", ta: "அம்மா பராமரிப்பு", emoji: "🌸", bg: "#FBD0EA", pop: "#D65BB0" },
};

/** The 8-swatch tile palette admins pick product tile colours from. */
export const TILE_SWATCHES = [
  "#FFE1A8", "#C7E9FF", "#FFCBD9", "#D6E8B0", "#E4D6FF", "#B9EBDD", "#FFD6C2", "#FBD0EA",
] as const;

/**
 * Hover glow: each pastel tile swatch maps to its saturated twin from
 * CATEGORY_META.pop, so a lit-up card stays inside the eight brand colours
 * instead of introducing a ninth. Unknown colours fall back to brand pink.
 */
const TILE_GLOW: Record<string, string> = {
  "#FFE1A8": "#F59E0B", // amber
  "#C7E9FF": "#3B9EDB", // blue
  "#FFCBD9": "#EC5D8A", // pink
  "#D6E8B0": "#7CB342", // green
  "#E4D6FF": "#9A6BE0", // violet
  "#B9EBDD": "#1FB995", // teal
  "#FFD6C2": "#F26B4A", // coral
  "#FBD0EA": "#D65BB0", // magenta
};

export const glowFor = (tile: string): string =>
  TILE_GLOW[tile.trim().toUpperCase()] ?? "#EC5D8A";

/** Inline `--glow` for the .glow-card utility. */
export const glowStyle = (tile: string): Record<string, string> => ({ "--glow": glowFor(tile) });

/**
 * Absolute site origin, never with a trailing slash — NEXT_PUBLIC_SITE_URL is
 * commonly pasted with one, which was producing "//c/feeding" in the sitemap.
 */
export const siteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Format INR like the reference: ₹1,299 */
export const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
