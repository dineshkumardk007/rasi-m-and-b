/**
 * Bilingual dictionary — every customer-facing string lives here (Section 3.7).
 * No hardcoded strings in components: use useT() (client) or getT() (server).
 *
 * Keys are grouped by surface. Tamil copy is conversational Thoothukudi-friendly
 * Tamil, not literary translation. {placeholders} are interpolated by t().
 */

export const LANGUAGES = ["en", "ta"] as const;
export type Language = (typeof LANGUAGES)[number];

const en = {
  // Brand & ribbon
  "brand.name": "Rasi Mom & Baby",
  "ribbon.sameDay": "🚚 Same-day delivery in Thoothukudi — order before {cutoff}!",
  "ribbon.rating": "⭐ 4.8 · 2,360+ happy families",

  // Nav
  "nav.track": "Track",
  "nav.admin": "Admin",
  "nav.orders": "Orders",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.cart": "Cart",
  "nav.language": "தமிழ்", // shows the OTHER language as the toggle label
  "nav.searchPlaceholder": "Search for bottles, toys, dresses…",

  // Hero
  "hero.headline1": "Everything your baby needs,",
  "hero.headline2": "delivered today",
  "hero.sub":
    "Thoothukudi's most-loved baby store — now at your doorstep. Trusted brands, unique toys, and same-day delivery before {cutoff}.",
  "hero.ctaShop": "Shop by age",
  "hero.ctaBrowse": "Browse categories",

  // Milestones
  "milestone.newborn": "Newborn",
  "milestone.newborn.range": "0–3 months",
  "milestone.infant": "Infant",
  "milestone.infant.range": "3–12 months",
  "milestone.toddler": "Toddler",
  "milestone.toddler.range": "1–3 years",
  "milestone.mom": "For Mom",
  "milestone.mom.range": "Mom care",

  // Categories
  "category.feeding": "Feeding",
  "category.bath": "Bath & Skincare",
  "category.toys": "Toys & Play",
  "category.clothing": "Clothing",
  "category.diapering": "Diapering",
  "category.gear": "Gear",
  "category.health": "Health & Safety",
  "category.mom": "Mom Care",
  "category.browse": "Browse →",
  "category.selected": "Selected ✓",

  // Product listing
  "plp.freshPicks": "Fresh picks",
  "plp.shopByCategory": "Shop by Category",
  "plp.shopByAge": "Shop by Age",
  "plp.clearAll": "Clear all",
  "plp.emptyTitle": "Nothing matches those filters",
  "plp.emptySub": "Try removing a filter, or browse everything below.",
  "plp.addToCart": "Add to cart",
  "plp.outOfStock": "Out of stock",
  "plp.lowStock": "Only {count} left!",

  // Cart & checkout scaffolding
  "cart.title": "Your cart",
  "cart.empty": "Your cart is empty",
  "cart.freeDeliveryProgress": "₹{amount} away from free delivery",
  "cart.freeDeliveryUnlocked": "🎉 Free delivery unlocked!",
  "cart.checkout": "Checkout",
  "cart.total": "Total",

  // Trust
  "trust.title": "Loved by 2,360+ families",
  "trust.staffLine": "Ask for {names} — they'll help you find exactly what you need.",

  // Footer
  "footer.hours": "Open daily from {opensAt}",
  "footer.visit": "Visit us",

  // Toasts / misc
  "toast.addedToCart": "Added to cart ✓",
  "toast.languageChanged": "Language switched",
  "common.loading": "Loading…",
  "common.close": "Close",
  "common.rupees": "₹{amount}",
} as const;

export type TranslationKey = keyof typeof en;

const ta: Record<TranslationKey, string> = {
  "brand.name": "ராசி மாம் & பேபி",
  "ribbon.sameDay": "🚚 தூத்துக்குடியில் அன்றே டெலிவரி — {cutoff}க்கு முன் ஆர்டர் செய்யுங்கள்!",
  "ribbon.rating": "⭐ 4.8 · 2,360+ மகிழ்ச்சியான குடும்பங்கள்",

  "nav.track": "ஆர்டர் நிலை",
  "nav.admin": "நிர்வாகம்",
  "nav.orders": "ஆர்டர்கள்",
  "nav.signIn": "உள்நுழைய",
  "nav.signOut": "வெளியேறு",
  "nav.cart": "கூடை",
  "nav.language": "English",
  "nav.searchPlaceholder": "பாட்டில், பொம்மை, உடை… தேடுங்கள்",

  "hero.headline1": "உங்கள் குழந்தைக்கு தேவையான எல்லாம்,",
  "hero.headline2": "இன்றே வீட்டுக்கு",
  "hero.sub":
    "தூத்துக்குடியின் பிரியமான பேபி ஸ்டோர் — இப்போது உங்கள் வீட்டு வாசலில். நம்பகமான பிராண்டுகள், தனித்துவமான பொம்மைகள், {cutoff}க்கு முன் ஆர்டர் செய்தால் அன்றே டெலிவரி.",
  "hero.ctaShop": "வயது வாரியாக ஷாப்பிங்",
  "hero.ctaBrowse": "வகைகளைப் பாருங்கள்",

  "milestone.newborn": "பச்சிளம் குழந்தை",
  "milestone.newborn.range": "0–3 மாதம்",
  "milestone.infant": "கைக்குழந்தை",
  "milestone.infant.range": "3–12 மாதம்",
  "milestone.toddler": "தளர்நடை",
  "milestone.toddler.range": "1–3 வயது",
  "milestone.mom": "அம்மாவுக்காக",
  "milestone.mom.range": "தாய் பராமரிப்பு",

  "category.feeding": "உணவு ஊட்டுதல்",
  "category.bath": "குளியல் & சரும பராமரிப்பு",
  "category.toys": "பொம்மைகள் & விளையாட்டு",
  "category.clothing": "உடைகள்",
  "category.diapering": "டயப்பர்",
  "category.gear": "குழந்தை உபகரணங்கள்",
  "category.health": "ஆரோக்கியம் & பாதுகாப்பு",
  "category.mom": "தாய் பராமரிப்பு",
  "category.browse": "பார்க்க →",
  "category.selected": "தேர்வு ✓",

  "plp.freshPicks": "புதிய வரவுகள்",
  "plp.shopByCategory": "வகை வாரியாக",
  "plp.shopByAge": "வயது வாரியாக",
  "plp.clearAll": "எல்லாம் நீக்கு",
  "plp.emptyTitle": "இந்த வடிகட்டிகளுக்கு பொருள் இல்லை",
  "plp.emptySub": "ஒரு வடிகட்டியை நீக்கி பாருங்கள், அல்லது கீழே எல்லாம் பாருங்கள்.",
  "plp.addToCart": "கூடையில் சேர்",
  "plp.outOfStock": "இருப்பு இல்லை",
  "plp.lowStock": "{count} மட்டுமே உள்ளது!",

  "cart.title": "உங்கள் கூடை",
  "cart.empty": "உங்கள் கூடை காலியாக உள்ளது",
  "cart.freeDeliveryProgress": "இலவச டெலிவரிக்கு இன்னும் ₹{amount}",
  "cart.freeDeliveryUnlocked": "🎉 இலவச டெலிவரி கிடைத்தது!",
  "cart.checkout": "ஆர்டர் செய்",
  "cart.total": "மொத்தம்",

  "trust.title": "2,360+ குடும்பங்களின் அன்பு",
  "trust.staffLine": "{names} — இவர்களிடம் கேளுங்கள், உங்களுக்கு தேவையானதை கண்டுபிடித்து தருவார்கள்.",

  "footer.hours": "தினமும் {opensAt} முதல் திறந்திருக்கும்",
  "footer.visit": "எங்களை பார்வையிடுங்கள்",

  "toast.addedToCart": "கூடையில் சேர்க்கப்பட்டது ✓",
  "toast.languageChanged": "மொழி மாற்றப்பட்டது",
  "common.loading": "ஏற்றுகிறது…",
  "common.close": "மூடு",
  "common.rupees": "₹{amount}",
};

export const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, ta };

/** Interpolate {placeholders}. Missing keys fall back to English, then the key itself. */
export function translate(
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const raw = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
