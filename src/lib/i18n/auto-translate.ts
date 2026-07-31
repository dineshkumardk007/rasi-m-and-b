/**
 * Conversational Multilingual English-to-Tamil auto-translator
 * for e-commerce baby product names and variant descriptions.
 * Uses popular Tamil-English conversational terms (Tanglish) rather than dry dictionary translations.
 */

const DICT: Record<string, string> = {
  // Sizes & Milestones (Conversational Tamil)
  newborn: "நியூபார்ன்",
  nb: "NB சைஸ்",
  s: "S சைஸ்",
  m: "M சைஸ்",
  l: "L சைஸ்",
  xl: "XL சைஸ்",
  xxl: "XXL சைஸ்",
  xxxl: "XXXL சைஸ்",
  small: "ஸ்மால் சைஸ்",
  medium: "மீடியம் சைஸ்",
  large: "லார்ஜ் சைஸ்",
  "0-3m": "0-3 மாதங்கள்",
  "3-6m": "3-6 மாதங்கள்",
  "6-12m": "6-12 மாதங்கள்",
  "12-18m": "12-18 மாதங்கள்",
  "18-24m": "18-24 மாதங்கள்",
  "1-2y": "1-2 ஆண்டுகள்",
  "2-3y": "2-3 ஆண்டுகள்",
  "3-4y": "3-4 ஆண்டுகள்",
  "4-5y": "4-5 ஆண்டுகள்",

  // Quantities, Packs & Variants
  variant: "வேரியன்ட்",
  new: "நியூ",
  pack: "பேக்",
  single: "சிங்கிள்",
  pair: "பேர்",
  set: "செட்",
  combo: "காம்போ",
  box: "பாக்ஸ்",
  bottle: "பாட்டில்",
  pcs: "பீஸ்",
  piece: "பீஸ்",

  // Colors (Popular Conversational Tamil)
  pink: "பிங்க்",
  blue: "ப்ளூ",
  yellow: "யெல்லோ",
  green: "க்ரீன்",
  white: "வைட்",
  red: "ரெட்",
  black: "பிளாக்",
  purple: "பர்ப்பிள்",
  orange: "ஆரஞ்சு",
  grey: "க்ரே",
  gray: "க்ரே",
  gold: "கோல்ட்",
  silver: "சில்வர்",
  peach: "பீச்",
  mint: "மிண்ட்",
  cream: "கிரீம்",
  multicolor: "மல்டிகலர்",
  multi: "மல்டிகலர்",

  // Categories & Product Types (Conversational Terms)
  baby: "பேபி",
  mom: "மாம்",
  mother: "மதர்",
  kid: "கிட்",
  kids: "கிட்ஸ்",
  infant: "இன்ஃபன்ட்",
  toddler: "டாட்லர்",
  child: "சைல்டு",
  children: "சில்ட்ரன்",

  diaper: "டைப்பர்",
  diapers: "டைப்பர்கள்",
  wipes: "வைப்ஸ்",
  lotion: "லோஷன்",
  shampoo: "ஷாம்பு",
  soap: "சோப்",
  oil: "ஆயில்",
  powder: "பவுடர்",
  wash: "வாஷ்",
  balm: "பாம்",
  gel: "ஜெல்",
  toy: "டாய்",
  toys: "டாய்ஸ்",
  cotton: "காட்டன்",
  organic: "ஆர்கானிக்",
  dress: "டிரஸ்",
  shirt: "ஷர்ட்",
  frock: "ஃப்ராக்",
  shorts: "ஷார்ட்ஸ்",
  pants: "பேண்ட்",
  shoes: "ஷூ",
  socks: "சாக்க்ஷ்",
  cap: "கேப்",
  hat: "ஹேட்",
  blanket: "பிளாங்கெட்",
  towel: "டவல்",
  mattress: "மெத்தை",
  pillow: "பில்லோ",
  cradle: "தொட்டில்",
  stroller: "ஸ்ட்ரோலர்",
  walker: "வாக்கர்",
  feeder: "ஃபீடர்",
  cup: "கப்",
  sipper: "சிப்பர்",
  nipple: "நிப்பிள்",
  pacifier: "பாசிஃபயர்",
  soft: "சாஃப்ட்",
  pure: "பியூர்",
  fresh: "ப்ரெஷ்",
  gentle: "ஜென்டில்",
  care: "கேர்",
  protection: "ப்ரோடெக்ஷன்",
  safety: "சேஃப்டி",
  comfort: "கம்ஃபோர்ட்",
  premium: "ப்ரீமியம்",
  super: "சூப்பர்",
  ultra: "அல்ட்ரா",
  mini: "மினி",
  jumbo: "ஜம்போ",
};

/**
 * Phonetic English letter-to-Tamil script transliterator fallback.
 */
function phoneticTamil(word: string): string {
  if (!word || !word.trim()) return word;

  let s = word.toLowerCase();

  // Digraphs & Clusters
  s = s.replace(/sh/g, "ஷ்");
  s = s.replace(/ch/g, "ச்");
  s = s.replace(/th/g, "த்");
  s = s.replace(/ph/g, "ஃப்");
  s = s.replace(/ck/g, "க்");
  s = s.replace(/ng/g, "ங்");
  s = s.replace(/zh/g, "ழ்");

  // Vowels
  s = s.replace(/aa/g, "ஆ");
  s = s.replace(/ee/g, "ஈ");
  s = s.replace(/oo/g, "ஊ");
  s = s.replace(/ai/g, "ஐ");
  s = s.replace(/au/g, "ஔ");
  s = s.replace(/ou/g, "ஔ");
  s = s.replace(/a/g, "அ");
  s = s.replace(/e/g, "எ");
  s = s.replace(/i/g, "இ");
  s = s.replace(/o/g, "ஒ");
  s = s.replace(/u/g, "உ");

  // Consonants
  s = s.replace(/k/g, "க்");
  s = s.replace(/g/g, "க்");
  s = s.replace(/c/g, "க்");
  s = s.replace(/s/g, "ஸ்");
  s = s.replace(/j/g, "ஜ்");
  s = s.replace(/t/g, "ட்");
  s = s.replace(/d/g, "ட்");
  s = s.replace(/n/g, "ன்");
  s = s.replace(/p/g, "ப்");
  s = s.replace(/b/g, "ப்");
  s = s.replace(/m/g, "ம்");
  s = s.replace(/y/g, "ய்");
  s = s.replace(/r/g, "ர்");
  s = s.replace(/l/g, "ல்");
  s = s.replace(/v/g, "வ்");
  s = s.replace(/w/g, "வ்");
  s = s.replace(/h/g, "ஹ்");
  s = s.replace(/f/g, "ஃப்");
  s = s.replace(/z/g, "ஸ்");
  s = s.replace(/x/g, "க்ஸ்");

  return s;
}

/**
 * Auto-translates English variant name or product title to Conversational Multilingual Tamil.
 */
export function autoTranslateToTamil(text: string): string {
  if (!text || !text.trim()) return "";

  let str = text.trim();

  // Handle common quantitative patterns
  str = str.replace(/pack of (\d+)/i, "$1 பேக்");
  str = str.replace(/(\d+)\s*pack/i, "$1 பேக்");
  str = str.replace(/set of (\d+)/i, "$1 செட்");
  str = str.replace(/(\d+)\s*set/i, "$1 செட்");
  str = str.replace(/(\d+)\s*pcs/i, "$1 பீஸ்");
  str = str.replace(/(\d+)\s*ml/i, "$1 மி.லி");
  str = str.replace(/(\d+)\s*g/i, "$1 கிராம்");
  str = str.replace(/(\d+)\s*kg/i, "$1 கிலோ");

  const tokens = str.split(/(\s+|[,\-/\(\)])/);
  const translated = tokens.map((token) => {
    if (!token || !token.trim()) return token;
    // Don't translate pure numbers or punctuation
    if (/^[\d\s,\-/\(\)]+$/.test(token)) return token;

    const clean = token.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (DICT[clean]) {
      return DICT[clean];
    }

    // Fallback to phonetic Tamil script transliteration
    return phoneticTamil(clean);
  });

  return translated.join("");
}
