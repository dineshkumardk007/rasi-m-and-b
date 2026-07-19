/**
 * Real business data — Section 1 of the spec. Use verbatim across the site.
 * The values marked TODO are awaiting owner confirmation; do not invent them.
 */
export const BUSINESS = {
  name: "Rasi Mom & Baby",
  address:
    "176, Palayamkottai Rd, opp. Rajaji Park, Thoothukudi, Tamil Nadu 628001",
  city: "Thoothukudi",
  opensAt: "9:00 AM",
  closesAt: null as string | null, // TODO: confirm closing time with owner before footer is finalized
  rating: 4.8,
  reviewCount: 2360,
  staff: ["Nisha", "Harini", "Punitha"] as const, // consent confirmation pending
  sameDayCutoffHour: 16, // 4 PM local — same-day delivery cutoff
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

/**
 * Category → colour + emoji badge. Class names are written out in full
 * (not template-built) so Tailwind's static extraction keeps them.
 */
export const CATEGORY_META: Record<
  Category,
  { bg: string; pop: string; bgClass: string; popTextClass: string; emoji: string }
> = {
  feeding: { bg: "#FFE1A8", pop: "#F59E0B", bgClass: "bg-cat-feeding-bg", popTextClass: "text-cat-feeding-pop", emoji: "🍼" },
  bath: { bg: "#C7E9FF", pop: "#3B9EDB", bgClass: "bg-cat-bath-bg", popTextClass: "text-cat-bath-pop", emoji: "🛁" },
  toys: { bg: "#FFCBD9", pop: "#EC5D8A", bgClass: "bg-cat-toys-bg", popTextClass: "text-cat-toys-pop", emoji: "🧸" },
  clothing: { bg: "#D6E8B0", pop: "#7CB342", bgClass: "bg-cat-clothing-bg", popTextClass: "text-cat-clothing-pop", emoji: "👶" },
  diapering: { bg: "#E4D6FF", pop: "#9A6BE0", bgClass: "bg-cat-diapering-bg", popTextClass: "text-cat-diapering-pop", emoji: "🧷" },
  gear: { bg: "#B9EBDD", pop: "#1FB995", bgClass: "bg-cat-gear-bg", popTextClass: "text-cat-gear-pop", emoji: "🛒" },
  health: { bg: "#FFD6C2", pop: "#F26B4A", bgClass: "bg-cat-health-bg", popTextClass: "text-cat-health-pop", emoji: "🩹" },
  mom: { bg: "#FBD0EA", pop: "#D65BB0", bgClass: "bg-cat-mom-bg", popTextClass: "text-cat-mom-pop", emoji: "🤱" },
};

/** The 8-swatch tile palette admins pick product tile colours from. */
export const TILE_SWATCHES = CATEGORIES.map((c) => CATEGORY_META[c].bg);
