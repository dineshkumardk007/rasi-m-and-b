import type { Language } from "@/lib/i18n/dictionary";

/**
 * Policy copy for the four documents Razorpay requires a merchant to publish
 * before activation (privacy, terms, refunds, shipping).
 *
 * These live here rather than in the shared dictionary for two reasons: the
 * prose is an order of magnitude longer than any UI string, and it is
 * parameterised — the delivery fee, free-delivery threshold, COD ceiling and
 * serviceable PINs are admin-editable store settings, so the page reads them at
 * request time. A policy that quotes a hardcoded ₹49 becomes a false statement
 * the moment the owner changes the setting.
 *
 * Everything asserted here is behaviour that exists in the code. Do not add
 * clauses describing processes the site does not actually implement.
 */

export const LEGAL_DOCS = ["privacy", "terms", "refunds", "shipping"] as const;
export type LegalDocSlug = (typeof LEGAL_DOCS)[number];

/**
 * Bumped by hand when the wording changes. Deliberately not `new Date()` — a
 * policy that claims it was revised today, every day, tells a customer nothing.
 */
export const LEGAL_LAST_UPDATED = "2026-07-22";

export interface LegalVars {
  /** Formatted currency, e.g. "₹49" */
  deliveryFee: string;
  freeAbove: string;
  codLimit: string;
  /** Serviceable PIN codes, already joined for display */
  pins: string;
  returnDays: number;
  business: string;
  address: string;
  city: string;
  cutoff: string;
  phone: string | null;
  email: string | null;
}

export interface LegalSection {
  heading: string;
  /** Rendered as paragraphs; a leading "• " marks a bullet. */
  body: string[];
}

export interface LegalContent {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/**
 * Document titles, kept separate from the bodies so the footer and the contact
 * page can label a link without building the whole parameterised document.
 * The builders below read from here, so there is one spelling of each title.
 */
export const LEGAL_TITLES: Record<Language, Record<LegalDocSlug, string>> = {
  en: {
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    refunds: "Refund & Cancellation Policy",
    shipping: "Shipping & Delivery Policy",
  },
  ta: {
    privacy: "தனியுரிமைக் கொள்கை",
    terms: "விதிமுறைகள் மற்றும் நிபந்தனைகள்",
    refunds: "பணத் திரும்பப்பெறுதல் மற்றும் ரத்துக் கொள்கை",
    shipping: "டெலிவரிக் கொள்கை",
  },
};

/** Footer-length labels — the full titles are too long for a pill. */
export const LEGAL_SHORT: Record<Language, Record<LegalDocSlug, string>> = {
  en: {
    privacy: "Privacy",
    terms: "Terms",
    refunds: "Refunds",
    shipping: "Delivery",
  },
  ta: {
    privacy: "தனியுரிமை",
    terms: "விதிமுறைகள்",
    refunds: "பணத் திரும்பப்பெறுதல்",
    shipping: "டெலிவரி",
  },
};

/** How to reach us, appended to every policy so each document stands alone. */
function contactLines(v: LegalVars, lang: Language): string[] {
  const lines: string[] = [];
  if (lang === "en") {
    lines.push(`${v.business}, ${v.address}.`);
    if (v.phone) lines.push(`• Phone / WhatsApp: ${v.phone}`);
    if (v.email) lines.push(`• Email: ${v.email}`);
    lines.push("We reply to messages during shop hours, from 9 AM daily.");
  } else {
    lines.push(`${v.business}, ${v.address}.`);
    if (v.phone) lines.push(`• தொலைபேசி / வாட்ஸ்அப்: ${v.phone}`);
    if (v.email) lines.push(`• மின்னஞ்சல்: ${v.email}`);
    lines.push("கடை நேரத்தில், தினமும் காலை 9 மணி முதல், உங்கள் செய்திகளுக்குப் பதிலளிக்கிறோம்.");
  }
  return lines;
}

const EN: Record<LegalDocSlug, (v: LegalVars) => LegalContent> = {
  privacy: (v) => ({
    title: LEGAL_TITLES.en.privacy,
    intro: `This policy explains what ${v.business} collects when you shop with us online, why we collect it, and who else sees it.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "When you place an order we ask for the details needed to deliver it and nothing more:",
          "• Your name, phone number and delivery address, including PIN code.",
          "• The items, quantities and total of your order.",
          "• If you create an account, your phone number or email address and a password, which is stored only as a one-way hash — we cannot read it.",
          "We do not ask for your date of birth, your child's date of birth, your PAN, your Aadhaar, or any government identifier.",
        ],
      },
      {
        heading: "Payment details",
        body: [
          "We never see or store your card, UPI or netbanking details. Online payments are handled entirely by Razorpay, a PCI-DSS compliant payment gateway. Your payment credentials are entered on Razorpay's own checkout and go straight to them.",
          "What comes back to us is limited to a payment reference, the amount, and whether the payment succeeded.",
          "For Cash on Delivery orders no payment details exist at all — you pay our delivery person.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "If analytics is enabled on this site we use Meta Pixel and/or Google Analytics 4 to understand which products people look at, so we know what to stock.",
          "These events carry product IDs, names, prices and order totals. They never carry your name, phone number, delivery address or order number.",
          "You can block them with any standard ad or tracker blocker; the shop works exactly the same either way.",
        ],
      },
      {
        heading: "Who else sees your data",
        body: [
          "Only the services that make an order work:",
          "• Supabase — the database that stores your order, hosted in the cloud.",
          "• Razorpay — for online payments, as described above.",
          "• WhatsApp, through our messaging provider — so we can send you order confirmations and delivery updates on the number you gave us.",
          "• Vercel — which serves this website.",
          "We do not sell your data. We do not share it with advertisers, data brokers, or anyone else, for any price.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Order records are kept as long as we are required to for tax and accounting purposes. Account details are kept until you ask us to delete them.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "Write to us and we will tell you what we hold about you, correct anything wrong, or delete your account and its data. We will act on the request within a reasonable time.",
          "Deleting your account does not erase invoices we are legally required to retain.",
        ],
      },
      { heading: "Contact us", body: contactLines(v, "en") },
    ],
  }),

  terms: (v) => ({
    title: LEGAL_TITLES.en.terms,
    intro: `These terms apply when you buy from ${v.business} through this website.`,
    sections: [
      {
        heading: "Orders",
        body: [
          "Placing an order is an offer to buy, not a completed sale. The sale is confirmed when we accept your order and send you a confirmation.",
          "We may decline or cancel an order if the item turns out to be out of stock, if the price or description was listed in error, or if we cannot deliver to your address. If you have already paid for an order we cancel, you get a full refund.",
        ],
      },
      {
        heading: "Prices",
        body: [
          "All prices are in Indian Rupees and include applicable taxes unless stated otherwise.",
          `Delivery is ${v.deliveryFee}, free on orders above ${v.freeAbove}.`,
          "We can change prices at any time, but never after you have placed an order — the price you saw at checkout is the price you pay.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "You can pay online through Razorpay, or by Cash on Delivery.",
          `Cash on Delivery is available on orders up to ${v.codLimit}. We may withdraw the Cash on Delivery option for a phone number that has refused delivery on multiple previous orders.`,
        ],
      },
      {
        heading: "Product information",
        body: [
          "We describe our products as accurately as we can, and photographs are of the actual product wherever possible. Packaging and colours can vary slightly between batches from the manufacturer.",
          "Always follow the manufacturer's instructions and age guidance printed on the product, especially for toys, feeding equipment and skincare. Nothing on this site is medical advice — talk to your paediatrician about your child's health.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "Keep your password to yourself. You are responsible for orders placed from your account. Tell us at once if you think someone else is using it.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          `These terms are governed by the laws of India. Any dispute falls under the exclusive jurisdiction of the courts at ${v.city}, Tamil Nadu.`,
        ],
      },
      { heading: "Contact us", body: contactLines(v, "en") },
    ],
  }),

  refunds: (v) => ({
    title: LEGAL_TITLES.en.refunds,
    intro:
      "If something is not right, tell us. We would rather fix it than have you stuck with something you cannot use.",
    sections: [
      {
        heading: "Cancelling an order",
        body: [
          "You can cancel free of charge any time before the order is dispatched — message us with your order number.",
          "Once an order is out for delivery it cannot be cancelled, but you can refuse it at the door, and for a prepaid order we will refund you.",
        ],
      },
      {
        heading: "Returns",
        body: [
          `You have ${v.returnDays} days from delivery to raise a return or replacement.`,
          "The item must be unused, in its original packaging, with seals and labels intact.",
          "Tell us your order number and what is wrong, and send a photo if the item arrived damaged — it makes the whole thing faster.",
        ],
      },
      {
        heading: "What we cannot take back",
        body: [
          "For hygiene and safety reasons, these cannot be returned once opened or once the seal is broken:",
          "• Diapers, wipes and nappy pads.",
          "• Feeding bottles, nipples, teats, soothers and breast pumps.",
          "• Innerwear and any clothing worn next to the skin.",
          "• Skincare, oils, lotions and any consumable.",
          "This does not apply if the item reached you damaged, expired, or was not what you ordered — in those cases we always take it back.",
        ],
      },
      {
        heading: "How you get your money back",
        body: [
          "Once we have the item back and have checked it, we approve the refund the same day wherever we can.",
          "• Paid online: the money goes back to the card, UPI ID or account you paid from. Razorpay typically settles this within 5 to 7 working days.",
          "• Paid by Cash on Delivery: we refund by UPI or bank transfer to an account in your name, usually within 5 to 7 working days of approval.",
          "Delivery charges are refunded too when the return is our fault — a damaged, wrong or expired item.",
        ],
      },
      {
        heading: "Late or missing refunds",
        body: [
          "If the approved refund has not reached you within 7 working days, contact us with your order number and we will chase it with the payment gateway.",
        ],
      },
      { heading: "Contact us", body: contactLines(v, "en") },
    ],
  }),

  shipping: (v) => ({
    title: LEGAL_TITLES.en.shipping,
    intro: `How and when your order reaches you in ${v.city}.`,
    sections: [
      {
        heading: "Where we deliver",
        body: [
          `We deliver within ${v.city}. The PIN codes we currently serve are: ${v.pins}.`,
          "If your PIN code is not on that list, checkout will tell you before you pay. Message us — we can often still work something out.",
        ],
      },
      {
        heading: "Same-day delivery",
        body: [
          `Order before ${v.cutoff} on a working day, to a serviceable PIN code, and your order goes out the same day.`,
          `After ${v.cutoff} it goes out the next day.`,
          "Same-day delivery depends on the item being in stock and on us being open. During heavy rain, festivals or local disruption it may take an extra day — if that happens we message you rather than leave you guessing.",
        ],
      },
      {
        heading: "Delivery charges",
        body: [
          `Delivery is ${v.deliveryFee} per order.`,
          `Orders above ${v.freeAbove} ship free.`,
          "The exact charge is shown at checkout before you pay. There are no charges added afterwards.",
        ],
      },
      {
        heading: "Tracking your order",
        body: [
          "Every order gets an order number. Use the Track option on this site with that number and the phone number you ordered with, to see where it has reached.",
          "We also send updates on WhatsApp to the number you gave us.",
        ],
      },
      {
        heading: "If nobody is home",
        body: [
          "Our delivery person will call the number on the order. If we cannot reach you we try again the same day or the next.",
          "After two failed attempts we bring the order back to the shop and contact you to arrange it again.",
        ],
      },
      { heading: "Contact us", body: contactLines(v, "en") },
    ],
  }),
};

const TA: Record<LegalDocSlug, (v: LegalVars) => LegalContent> = {
  privacy: (v) => ({
    title: LEGAL_TITLES.ta.privacy,
    intro: `நீங்கள் ${v.business} இணையதளத்தில் வாங்கும்போது நாங்கள் என்ன தகவல் சேகரிக்கிறோம், ஏன் சேகரிக்கிறோம், யார் அதைப் பார்க்கிறார்கள் என்பதை இந்தக் கொள்கை விளக்குகிறது.`,
    sections: [
      {
        heading: "நாங்கள் சேகரிப்பவை",
        body: [
          "ஆர்டரை டெலிவரி செய்யத் தேவையான விவரங்களை மட்டுமே கேட்கிறோம்:",
          "• உங்கள் பெயர், தொலைபேசி எண், முகவரி மற்றும் பின் கோடு.",
          "• ஆர்டரில் உள்ள பொருட்கள், எண்ணிக்கை மற்றும் மொத்தத் தொகை.",
          "• கணக்கு உருவாக்கினால், உங்கள் தொலைபேசி எண் அல்லது மின்னஞ்சல் மற்றும் கடவுச்சொல். கடவுச்சொல் ஹாஷ் வடிவில் மட்டுமே சேமிக்கப்படுகிறது — எங்களால் அதைப் படிக்க முடியாது.",
          "உங்கள் அல்லது உங்கள் குழந்தையின் பிறந்த தேதி, பான், ஆதார் எதுவும் நாங்கள் கேட்பதில்லை.",
        ],
      },
      {
        heading: "பணப் பரிவர்த்தனை விவரங்கள்",
        body: [
          "உங்கள் கார்டு, யுபிஐ அல்லது நெட் பேங்கிங் விவரங்களை நாங்கள் பார்ப்பதுமில்லை, சேமிப்பதுமில்லை. ஆன்லைன் பணப் பரிவர்த்தனைகளை Razorpay முழுமையாகக் கையாளுகிறது.",
          "எங்களுக்குத் திரும்ப வருவது பணப் பரிவர்த்தனை குறிப்பு எண், தொகை, மற்றும் பணம் வெற்றிகரமாகச் சென்றதா என்பது மட்டுமே.",
          "பணம் கொடுத்து வாங்கும் (COD) ஆர்டர்களில் இத்தகைய விவரங்களே இல்லை.",
        ],
      },
      {
        heading: "பகுப்பாய்வு",
        body: [
          "எந்தப் பொருட்களை மக்கள் பார்க்கிறார்கள் என்பதை அறிய Meta Pixel மற்றும் Google Analytics 4 பயன்படுத்தப்படலாம்.",
          "இவை பொருளின் பெயர், விலை, மொத்தத் தொகையை மட்டுமே அனுப்புகின்றன. உங்கள் பெயர், தொலைபேசி எண், முகவரி, ஆர்டர் எண் ஒருபோதும் அனுப்பப்படுவதில்லை.",
        ],
      },
      {
        heading: "உங்கள் தகவலை யார் பார்க்கிறார்கள்",
        body: [
          "ஆர்டரை நிறைவேற்றத் தேவையான சேவைகள் மட்டுமே:",
          "• Supabase — ஆர்டரைச் சேமிக்கும் தரவுத்தளம்.",
          "• Razorpay — ஆன்லைன் பணப் பரிவர்த்தனைக்கு.",
          "• வாட்ஸ்அப் — ஆர்டர் உறுதிப்படுத்தல் மற்றும் டெலிவரி தகவல் அனுப்ப.",
          "• Vercel — இந்த இணையதளத்தை வழங்குகிறது.",
          "உங்கள் தகவலை நாங்கள் விற்பதில்லை. விளம்பரதாரர்களுக்கோ வேறு யாருக்கோ எந்த விலைக்கும் தருவதில்லை.",
        ],
      },
      {
        heading: "எவ்வளவு காலம் வைத்திருக்கிறோம்",
        body: [
          "வரி மற்றும் கணக்குத் தேவைக்கு எவ்வளவு காலம் தேவையோ அவ்வளவு காலம் ஆர்டர் பதிவுகள் வைக்கப்படும். கணக்கு விவரங்கள் நீங்கள் நீக்கச் சொல்லும் வரை இருக்கும்.",
        ],
      },
      {
        heading: "உங்கள் உரிமைகள்",
        body: [
          "எங்களிடம் உள்ள உங்கள் தகவலை அறியவும், தவறுகளைத் திருத்தவும், கணக்கை நீக்கவும் எங்களைத் தொடர்பு கொள்ளுங்கள்.",
          "சட்டப்படி வைத்திருக்க வேண்டிய விலைப்பட்டியல்கள் கணக்கு நீக்கத்தால் அழிக்கப்படுவதில்லை.",
        ],
      },
      { heading: "தொடர்புக்கு", body: contactLines(v, "ta") },
    ],
  }),

  terms: (v) => ({
    title: LEGAL_TITLES.ta.terms,
    intro: `இந்த இணையதளத்தில் ${v.business} கடையிலிருந்து வாங்கும்போது இந்த விதிமுறைகள் பொருந்தும்.`,
    sections: [
      {
        heading: "ஆர்டர்கள்",
        body: [
          "ஆர்டர் செய்வது வாங்குவதற்கான விருப்பம் மட்டுமே; விற்பனை முழுமையடைவதில்லை. நாங்கள் ஏற்று உறுதிப்படுத்தல் அனுப்பும்போதே விற்பனை உறுதியாகிறது.",
          "பொருள் இருப்பில் இல்லாதபோது, விலை அல்லது விவரம் தவறாகப் பதிவாகியிருந்தால், அல்லது உங்கள் முகவரிக்கு டெலிவரி செய்ய முடியாதபோது ஆர்டரை நாங்கள் ரத்து செய்யலாம். ஏற்கனவே பணம் செலுத்தியிருந்தால் முழுத் தொகையும் திரும்பக் கிடைக்கும்.",
        ],
      },
      {
        heading: "விலைகள்",
        body: [
          "அனைத்து விலைகளும் இந்திய ரூபாயில், பொருந்தக்கூடிய வரிகள் உட்பட.",
          `டெலிவரிக் கட்டணம் ${v.deliveryFee}; ${v.freeAbove}க்கு மேல் இலவசம்.`,
          "விலைகளை எப்போது வேண்டுமானாலும் மாற்றலாம், ஆனால் நீங்கள் ஆர்டர் செய்த பிறகு அல்ல — செக்அவுட்டில் பார்த்த விலையே நீங்கள் செலுத்தும் விலை.",
        ],
      },
      {
        heading: "பணம் செலுத்துதல்",
        body: [
          "Razorpay மூலம் ஆன்லைனிலோ, அல்லது பொருள் வந்ததும் பணமாகவோ (COD) செலுத்தலாம்.",
          `${v.codLimit} வரையிலான ஆர்டர்களுக்கு COD உண்டு. முன்பு பலமுறை டெலிவரியை மறுத்த எண்ணுக்கு COD வசதியை நிறுத்தலாம்.`,
        ],
      },
      {
        heading: "பொருள் விவரங்கள்",
        body: [
          "பொருட்களை முடிந்தவரை துல்லியமாக விவரிக்கிறோம். தயாரிப்பாளரின் பேட்ச் மாறும்போது பேக்கிங் மற்றும் நிறத்தில் சிறிது வேறுபாடு இருக்கலாம்.",
          "பொம்மைகள், உணவூட்டும் பொருட்கள், சரும பராமரிப்புப் பொருட்களுக்குத் தயாரிப்பாளரின் அறிவுறுத்தல்களையும் வயது வரம்பையும் பின்பற்றுங்கள். இந்தத் தளத்தில் உள்ள எதுவும் மருத்துவ ஆலோசனை அல்ல — உங்கள் குழந்தை நல மருத்துவரிடம் கேளுங்கள்.",
        ],
      },
      {
        heading: "உங்கள் கணக்கு",
        body: [
          "உங்கள் கடவுச்சொல்லை உங்களிடமே வைத்திருங்கள். உங்கள் கணக்கிலிருந்து செய்யப்படும் ஆர்டர்களுக்கு நீங்களே பொறுப்பு. வேறு யாரோ பயன்படுத்துவதாகத் தோன்றினால் உடனே தெரிவியுங்கள்.",
        ],
      },
      {
        heading: "பொருந்தும் சட்டம்",
        body: [
          `இந்திய சட்டங்கள் பொருந்தும். எந்தவொரு தகராறும் தமிழ்நாடு, ${v.city} நீதிமன்றங்களின் தனி எல்லைக்குள் வரும்.`,
        ],
      },
      { heading: "தொடர்புக்கு", body: contactLines(v, "ta") },
    ],
  }),

  refunds: (v) => ({
    title: LEGAL_TITLES.ta.refunds,
    intro: "ஏதேனும் சரியில்லை என்றால் சொல்லுங்கள். பயன்படுத்த முடியாத பொருளுடன் உங்களை விட்டுவிடுவதைவிட அதைச் சரிசெய்வதே எங்கள் விருப்பம்.",
    sections: [
      {
        heading: "ஆர்டரை ரத்து செய்தல்",
        body: [
          "ஆர்டர் அனுப்பப்படுவதற்கு முன் எப்போது வேண்டுமானாலும் இலவசமாக ரத்து செய்யலாம் — ஆர்டர் எண்ணுடன் எங்களுக்குச் செய்தி அனுப்புங்கள்.",
          "டெலிவரிக்குப் புறப்பட்ட பிறகு ரத்து செய்ய முடியாது; ஆனால் வீட்டு வாசலில் மறுக்கலாம். முன்பணம் செலுத்திய ஆர்டராக இருந்தால் பணம் திரும்பக் கிடைக்கும்.",
        ],
      },
      {
        heading: "திருப்பி அனுப்புதல்",
        body: [
          `பொருள் கிடைத்த நாளிலிருந்து ${v.returnDays} நாட்களுக்குள் திருப்பி அனுப்பவோ மாற்றவோ கேட்கலாம்.`,
          "பொருள் பயன்படுத்தப்படாமல், அசல் பேக்கிங்கில், சீல் மற்றும் லேபிள் சேதமின்றி இருக்க வேண்டும்.",
          "ஆர்டர் எண்ணையும் என்ன பிரச்சினை என்பதையும் சொல்லுங்கள். பொருள் சேதமாக வந்திருந்தால் புகைப்படம் அனுப்புங்கள் — வேலை விரைவாக முடியும்.",
        ],
      },
      {
        heading: "திரும்பப் பெற முடியாதவை",
        body: [
          "சுகாதாரம் மற்றும் பாதுகாப்புக் காரணங்களுக்காக, திறந்த பிறகு அல்லது சீல் உடைந்த பிறகு இவற்றைத் திரும்பப் பெற முடியாது:",
          "• டயப்பர், துடைப்பான்கள் மற்றும் நாப்பி பேட்கள்.",
          "• பால் புட்டிகள், நிப்பிள்கள், சூத்தர்கள் மற்றும் பிரஸ்ட் பம்புகள்.",
          "• உள்ளாடைகள் மற்றும் தோலோடு நேரடியாக அணியும் ஆடைகள்.",
          "• சரும பராமரிப்பு, எண்ணெய், லோஷன் மற்றும் உட்கொள்ளும் பொருட்கள்.",
          "பொருள் சேதமாக, காலாவதியாக, அல்லது நீங்கள் ஆர்டர் செய்யாத பொருளாக வந்தால் இது பொருந்தாது — அப்போது நாங்கள் எப்போதும் திரும்பப் பெறுவோம்.",
        ],
      },
      {
        heading: "பணம் எப்படித் திரும்பக் கிடைக்கும்",
        body: [
          "பொருள் திரும்பக் கிடைத்து சரிபார்த்ததும், முடிந்தவரை அதே நாளில் பணத் திரும்பப்பெறுதலை அங்கீகரிக்கிறோம்.",
          "• ஆன்லைனில் செலுத்தியிருந்தால்: நீங்கள் செலுத்திய அதே கார்டு, யுபிஐ அல்லது கணக்குக்கே பணம் திரும்பும். Razorpay வழக்கமாக 5 முதல் 7 வேலை நாட்களுக்குள் இதை முடிக்கும்.",
          "• COD ஆக செலுத்தியிருந்தால்: உங்கள் பெயரில் உள்ள கணக்குக்கு யுபிஐ அல்லது வங்கிப் பரிமாற்றம் மூலம், அங்கீகரித்த 5 முதல் 7 வேலை நாட்களுக்குள்.",
          "பொருள் சேதம், தவறு அல்லது காலாவதி என எங்கள் தவறாக இருந்தால் டெலிவரிக் கட்டணமும் திரும்பக் கிடைக்கும்.",
        ],
      },
      {
        heading: "தாமதமான பணத் திரும்பப்பெறுதல்",
        body: [
          "அங்கீகரிக்கப்பட்ட பணம் 7 வேலை நாட்களுக்குள் வரவில்லை என்றால், ஆர்டர் எண்ணுடன் எங்களைத் தொடர்பு கொள்ளுங்கள். நாங்கள் பேமெண்ட் கேட்வேயிடம் விசாரிப்போம்.",
        ],
      },
      { heading: "தொடர்புக்கு", body: contactLines(v, "ta") },
    ],
  }),

  shipping: (v) => ({
    title: LEGAL_TITLES.ta.shipping,
    intro: `${v.city}யில் உங்கள் ஆர்டர் எப்படி, எப்போது வந்து சேரும்.`,
    sections: [
      {
        heading: "எங்கு டெலிவரி செய்கிறோம்",
        body: [
          `${v.city} எல்லைக்குள் டெலிவரி செய்கிறோம். தற்போது சேவை உள்ள பின் கோடுகள்: ${v.pins}.`,
          "உங்கள் பின் கோடு இந்தப் பட்டியலில் இல்லையென்றால், பணம் செலுத்தும் முன்பே செக்அவுட் அதைத் தெரிவிக்கும். எங்களுக்குச் செய்தி அனுப்புங்கள் — பெரும்பாலும் ஏதாவது வழி செய்யலாம்.",
        ],
      },
      {
        heading: "அன்றைய டெலிவரி",
        body: [
          `வேலை நாளில் ${v.cutoff}க்கு முன், சேவை உள்ள பின் கோடுக்கு ஆர்டர் செய்தால், அன்றே அனுப்பப்படும்.`,
          `${v.cutoff}க்குப் பிறகு அடுத்த நாள் அனுப்பப்படும்.`,
          "பொருள் இருப்பில் இருப்பதையும் கடை திறந்திருப்பதையும் பொறுத்தது. கனமழை, பண்டிகை அல்லது உள்ளூர் இடையூறு இருந்தால் ஒரு நாள் கூடுதலாகலாம் — அப்படி நேர்ந்தால் உங்களுக்குச் செய்தி அனுப்புவோம்.",
        ],
      },
      {
        heading: "டெலிவரிக் கட்டணம்",
        body: [
          `ஒரு ஆர்டருக்கு ${v.deliveryFee}.`,
          `${v.freeAbove}க்கு மேல் இலவசம்.`,
          "சரியான கட்டணம் பணம் செலுத்தும் முன் செக்அவுட்டில் காட்டப்படும். அதன் பிறகு எந்தக் கட்டணமும் சேர்க்கப்படாது.",
        ],
      },
      {
        heading: "ஆர்டரைக் கண்காணித்தல்",
        body: [
          "ஒவ்வொரு ஆர்டருக்கும் ஒரு ஆர்டர் எண் உண்டு. அந்த எண்ணையும் ஆர்டர் செய்த தொலைபேசி எண்ணையும் கொண்டு இந்தத் தளத்தில் 'Track' மூலம் பார்க்கலாம்.",
          "நீங்கள் கொடுத்த எண்ணுக்கு வாட்ஸ்அப்பிலும் தகவல் அனுப்புகிறோம்.",
        ],
      },
      {
        heading: "வீட்டில் யாரும் இல்லாவிட்டால்",
        body: [
          "எங்கள் டெலிவரி நபர் ஆர்டரில் உள்ள எண்ணுக்கு அழைப்பார். தொடர்பு கிடைக்கவில்லை என்றால் அன்றோ அடுத்த நாளோ மீண்டும் முயற்சிப்போம்.",
          "இரண்டு முறை தோல்வியுற்ற பிறகு பொருளைக் கடைக்குத் திருப்பிக் கொண்டுவந்து, மீண்டும் ஏற்பாடு செய்ய உங்களைத் தொடர்பு கொள்வோம்.",
        ],
      },
      { heading: "தொடர்புக்கு", body: contactLines(v, "ta") },
    ],
  }),
};

export function getLegalContent(
  doc: LegalDocSlug,
  lang: Language,
  vars: LegalVars,
): LegalContent {
  return (lang === "ta" ? TA : EN)[doc](vars);
}
