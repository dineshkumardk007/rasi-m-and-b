/**
 * Bilingual dictionary — every customer-facing string lives here (Section 3.7).
 * No hardcoded strings in components: use useT() (client) or getT() (server).
 * Copy matches the approved reference implementation exactly.
 */

export const LANGUAGES = ["en", "ta"] as const;
export type Language = (typeof LANGUAGES)[number];

const en = {
  // Ribbon & countdown
  "ribbon.sameDay": "⚡ Same-day delivery in Thoothukudi — order before 4 PM 🚚",
  "ribbon.countdown": "⚡ Same-day delivery in Thoothukudi — {time} left to order 🚚",
  "ribbon.afterCutoff": "🌙 Ordering now? Delivered tomorrow in Thoothukudi 🚚",

  // Nav
  "nav.track": "Track",
  "nav.admin": "Admin",
  "nav.store": "Store",
  "nav.orders": "Orders",
  "nav.shop": "Shop",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.language": "தமிழ்",

  // Hero
  "hero.badge": "happy families",
  "hero.headline1": "Everything for",
  "hero.headline2": "your little one",
  "hero.sub":
    "Thoothukudi's most-loved baby store, now online. Shop by age or category — delivered same day.",
  "hero.ctaShop": "Start shopping",
  "hero.ctaBundles": "See bundles",

  // Marquee
  "marquee.title": "Fresh picks",
  "marquee.sub": "just added",

  // Categories
  "category.title": "Shop by category",
  "category.clear": "Clear",
  "category.selected": "Selected ✓",
  "category.browse": "Browse →",

  // Buy again
  "buyAgain.title": "Buy again",
  "buyAgain.add": "Add",

  // Bundles
  "bundles.title": "Curated bundles",
  "bundles.sub": "Put together by Nisha, Harini & Punitha — the same advice you get in store.",
  "bundles.save": "Save",
  "bundles.add": "Add bundle",

  // Shop grid
  "shop.byAge": "Shop by age",
  "shop.filtering": "Filtering:",
  "shop.allAges": "All ages",
  "shop.search": "Search products…",
  "shop.addToCart": "Add to cart",
  "shop.add": "Add",
  "shop.onlyLeft": "Only {count} left!",
  "shop.soldOut": "Sold out",
  "shop.empty": "No products match these filters",
  "shop.clearAll": "Clear all filters",

  // Trust
  "trust.title": "The store you already trust",
  "trust.sub": "The same shelves and the same people from Palayamkottai Road, now on your phone.",
  "trust.hours": "Opens 9 AM daily",
  "trust.reviews": "Google reviews",
  "trust.quote": "Huge toy collection at reasonable prices — the staff patiently helped us choose.",

  // Product detail
  "product.reviews": "Reviews",
  "product.noReviews": "No reviews yet — be the first.",
  "product.writeReview": "Share your experience…",
  "product.postReview": "Post review",
  "product.reviewPending": "Thanks! Your review appears after a quick check. 💛",
  "product.yourName": "Your name",
  "product.ingredients": "Ingredients",
  "product.checkPin": "Delivery at your PIN",
  "product.pinPlaceholder": "PIN code e.g. 628001",
  "product.pinCheck": "Check",
  "product.pinSameDay": "🚚 Same-day delivery available — order before 4 PM!",
  "product.pinTomorrow": "🚚 Delivered by tomorrow in Thoothukudi.",
  "product.pinCourier": "📦 Delivered in 2–4 days by courier.",
  "product.notifyMe": "Notify me when back",
  "product.notifySaved": "We'll message you when it's back 💛",

  // Cart
  "cart.title": "Your cart",
  "cart.empty": "Your cart is empty.",
  "cart.subtotal": "Subtotal",
  "cart.delivery": "Delivery",
  "cart.free": "Free 🎉",
  "cart.freeShort": "Free",
  "cart.addMore": "Add {amount} more for free delivery",
  "cart.checkout": "Checkout",

  // Checkout
  "checkout.title": "Delivery details",
  "checkout.guest": "Ordering as guest.",
  "checkout.name": "Full name",
  "checkout.phone": "Phone (WhatsApp)",
  "checkout.address": "Address",
  "checkout.city": "City",
  "checkout.pin": "PIN code",
  "checkout.continue": "Continue to payment",
  "checkout.payment": "Payment",
  "checkout.discount": "Discount",
  "checkout.total": "Total",
  "checkout.coupon": "Coupon (try WELCOME10)",
  "checkout.apply": "Apply",
  "checkout.couponApplied": "Coupon applied! 🎉",
  "checkout.couponNotFound": "Coupon not found",
  "checkout.couponMin": "Needs minimum {min}",
  "checkout.upi": "UPI — GPay, PhonePe, Paytm",
  "checkout.card": "Credit / Debit card",
  "checkout.cod": "Cash on delivery",
  "checkout.codLimit": "COD available up to {limit} — please pay online for this order.",
  "checkout.processing": "Processing via Razorpay…",
  "checkout.processingTitle": "Processing Payment…",
  "checkout.connectingGateway": "Connecting to Razorpay Payment Gateway…",
  "checkout.awaitingPopup": "Please complete payment in the UPI app or Razorpay popup window.",
  "checkout.doNotClose": "Please do not refresh or close this window while payment is processing.",
  "checkout.secureTransaction": "256-bit SSL Encrypted Payment",
  "checkout.cancelPayment": "Cancel & try another method",
  "checkout.demo": "(Demo — live keys connect at deployment)",
  "checkout.sameDayYes": "🚚 Arrives today — you beat the 4 PM cutoff!",
  "checkout.sameDayNo": "🚚 Arrives tomorrow morning.",
  "checkout.outOfStock": "Some items just sold out — please review your cart.",

  // Order done
  "orderDone.title": "Order confirmed!",
  "orderDone.order": "Order",
  "orderDone.body": "is on its way. WhatsApp updates will follow.",
  "orderDone.continue": "Continue shopping",
  "orderDone.invoice": "View invoice",

  // Track
  "track.title": "Track your order",
  "track.sub": "Just your order number and phone — no login.",
  "track.orderNo": "Order number",
  "track.phone": "Phone",
  "track.cta": "Track order",
  "track.notFound": "No order found. Check the number and phone used at checkout.",
  "track.status.confirmed": "Confirmed",
  "track.status.packed": "Packed",
  "track.status.out_for_delivery": "Out for delivery",
  "track.status.delivered": "Delivered",

  // Auth
  "auth.welcome": "Welcome back 👋",
  "auth.create": "Create your account 🎈",
  "auth.sub": "Track orders and check out faster.",
  "auth.phone": "Phone (WhatsApp)",
  "auth.otp": "OTP",
  "auth.sendOtp": "Send OTP",
  "auth.verify": "Verify & sign in",
  "auth.demoOtp": "Demo mode — any 6 digits work as the OTP.",
  "auth.name": "Your name",
  "auth.signedOut": "Signed out",
  "auth.welcomeBack": "Welcome back",

  // Toasts
  "toast.addedToCart": "Added to cart 🛒",
  "toast.reviewThanks": "Thanks for your review! 💛",

  // Orders page
  "orders.title": "My orders",
  "orders.none": "No orders yet.",

  // Footer
  "footer.hours": "Opens 9 AM daily · WhatsApp us anytime",

  // Misc
  "common.loading": "Opening Rasi…",
  "common.cancel": "Cancel",
  "common.close": "Close",
} as const;

export type TranslationKey = keyof typeof en;

const ta: Record<TranslationKey, string> = {
  "ribbon.sameDay": "⚡ தூத்துக்குடியில் அன்றே டெலிவரி — மாலை 4 மணிக்கு முன் 🚚",
  "ribbon.countdown": "⚡ தூத்துக்குடியில் அன்றே டெலிவரி — ஆர்டர் செய்ய {time} உள்ளது 🚚",
  "ribbon.afterCutoff": "🌙 இப்போது ஆர்டர் செய்தால் நாளை டெலிவரி 🚚",

  "nav.track": "நிலை",
  "nav.admin": "நிர்வாகம்",
  "nav.store": "கடை",
  "nav.orders": "ஆர்டர்",
  "nav.shop": "கடை",
  "nav.signIn": "உள்நுழை",
  "nav.signOut": "வெளியேறு",
  "nav.language": "English",

  "hero.badge": "மகிழ்ச்சியான குடும்பங்கள்",
  "hero.headline1": "உங்கள் குழந்தைக்கு",
  "hero.headline2": "தேவையான அனைத்தும்",
  "hero.sub":
    "தூத்துக்குடியின் நம்பகமான குழந்தை கடை, இப்போது ஆன்லைனில். வயது அல்லது வகைப்படி வாங்குங்கள்.",
  "hero.ctaShop": "வாங்கத் தொடங்கு",
  "hero.ctaBundles": "தொகுப்புகள்",

  "marquee.title": "புதிய தேர்வுகள்",
  "marquee.sub": "புதிதாக",

  "category.title": "வகைப்படி வாங்குங்கள்",
  "category.clear": "அழி",
  "category.selected": "தேர்வு ✓",
  "category.browse": "பார்க்க →",

  "buyAgain.title": "மீண்டும் வாங்கு",
  "buyAgain.add": "சேர்",

  "bundles.title": "தேர்ந்தெடுத்த தொகுப்புகள்",
  "bundles.sub": "நிஷா, ஹரிணி & புனிதா தேர்வு செய்தவை.",
  "bundles.save": "சேமி",
  "bundles.add": "சேர்",

  "shop.byAge": "வயதுப்படி வாங்குங்கள்",
  "shop.filtering": "வடிகட்டல்:",
  "shop.allAges": "அனைத்து வயது",
  "shop.search": "தேடுங்கள்…",
  "shop.addToCart": "சேர்",
  "shop.add": "சேர்",
  "shop.onlyLeft": "{count} மட்டுமே!",
  "shop.soldOut": "விற்றுத் தீர்ந்தது",
  "shop.empty": "பொருட்கள் இல்லை",
  "shop.clearAll": "அனைத்தையும் அழி",

  "trust.title": "நீங்கள் நம்பும் கடை",
  "trust.sub": "பழையம்கோட்டை சாலையின் அதே கடை, அதே அன்பான ஊழியர்கள் — இப்போது உங்கள் மொபைலில்.",
  "trust.hours": "தினமும் காலை 9 மணி",
  "trust.reviews": "கூகுள் மதிப்பாய்வு",
  "trust.quote": "நியாயமான விலையில் பெரிய பொம்மை சேகரிப்பு — ஊழியர்கள் பொறுமையாக உதவினார்கள்.",

  "product.reviews": "மதிப்பாய்வு",
  "product.noReviews": "இன்னும் மதிப்பாய்வு இல்லை.",
  "product.writeReview": "அனுபவத்தைப் பகிருங்கள்…",
  "product.postReview": "மதிப்பாய்வு இடு",
  "product.reviewPending": "நன்றி! சரிபார்ப்புக்குப் பிறகு உங்கள் மதிப்பாய்வு வெளியாகும். 💛",
  "product.yourName": "உங்கள் பெயர்",
  "product.ingredients": "மூலப்பொருட்கள்",
  "product.checkPin": "உங்கள் PIN-இல் டெலிவரி",
  "product.pinPlaceholder": "PIN எ.கா. 628001",
  "product.pinCheck": "சரிபார்",
  "product.pinSameDay": "🚚 அன்றே டெலிவரி — மாலை 4 மணிக்கு முன் ஆர்டர் செய்யுங்கள்!",
  "product.pinTomorrow": "🚚 தூத்துக்குடியில் நாளை டெலிவரி.",
  "product.pinCourier": "📦 கூரியர் மூலம் 2–4 நாட்களில்.",
  "product.notifyMe": "வந்ததும் தெரிவிக்கவும்",
  "product.notifySaved": "வந்ததும் உங்களுக்கு தகவல் அனுப்புவோம் 💛",

  "cart.title": "உங்கள் கூடை",
  "cart.empty": "கூடை காலியாக உள்ளது.",
  "cart.subtotal": "மொத்தம்",
  "cart.delivery": "டெலிவரி",
  "cart.free": "இலவசம் 🎉",
  "cart.freeShort": "இலவசம்",
  "cart.addMore": "இலவச டெலிவரிக்கு மேலும் {amount}",
  "cart.checkout": "செக் அவுட்",

  "checkout.title": "டெலிவரி விவரம்",
  "checkout.guest": "விருந்தினராக.",
  "checkout.name": "முழு பெயர்",
  "checkout.phone": "தொலைபேசி",
  "checkout.address": "முகவரி",
  "checkout.city": "நகரம்",
  "checkout.pin": "பின்",
  "checkout.continue": "பணம் செலுத்த",
  "checkout.payment": "பணம்",
  "checkout.discount": "தள்ளுபடி",
  "checkout.total": "மொத்தம்",
  "checkout.coupon": "கூப்பன்",
  "checkout.apply": "பயன்படுத்து",
  "checkout.couponApplied": "பயன்படுத்தப்பட்டது! 🎉",
  "checkout.couponNotFound": "கூப்பன் இல்லை",
  "checkout.couponMin": "குறைந்தபட்சம் {min}",
  "checkout.upi": "UPI",
  "checkout.card": "கார்டு",
  "checkout.cod": "பணம் டெலிவரியில்",
  "checkout.codLimit": "COD {limit} வரை மட்டுமே — இந்த ஆர்டருக்கு ஆன்லைனில் செலுத்தவும்.",
  "checkout.processing": "Razorpay செயலாக்கம்…",
  "checkout.processingTitle": "பணம் செலுத்தப்படுகிறது…",
  "checkout.connectingGateway": "Razorpay செலுத்தும் நுழைவாயிலுடன் இணைக்கிறது…",
  "checkout.awaitingPopup": "UPI செயலி அல்லது Razorpay சாளரத்தில் செலுத்துதலை முடிக்கவும்.",
  "checkout.doNotClose": "பணம் செலுத்தப்படும் வரை இந்தப் பக்கத்தைப் புதுப்பிக்கவோ மூடவோ வேண்டாம்.",
  "checkout.secureTransaction": "256-பிட் பாதுகாப்புடன் குறியாக்கப்பட்ட பரிவர்த்தனை",
  "checkout.cancelPayment": "ரத்து செய்து மீண்டும் முயற்சிக்கவும்",
  "checkout.demo": "(டெமோ — நேரடி கீகள் பின்னர் இணைக்கப்படும்)",
  "checkout.sameDayYes": "🚚 இன்றே வந்துவிடும் — 4 மணிக்கு முன் ஆர்டர் செய்தீர்கள்!",
  "checkout.sameDayNo": "🚚 நாளை காலை வந்துவிடும்.",
  "checkout.outOfStock": "சில பொருட்கள் விற்றுத் தீர்ந்தன — கூடையை சரிபார்க்கவும்.",

  "orderDone.title": "ஆர்டர் உறுதி!",
  "orderDone.order": "ஆர்டர்",
  "orderDone.body": "வழியில் உள்ளது. வாட்ஸ்அப் தகவல் வரும்.",
  "orderDone.continue": "தொடர்க",
  "orderDone.invoice": "இன்வாய்ஸ் பார்க்க",

  "track.title": "ஆர்டரைக் கண்காணி",
  "track.sub": "ஆர்டர் எண் மற்றும் தொலைபேசி மட்டும்.",
  "track.orderNo": "ஆர்டர் எண்",
  "track.phone": "தொலைபேசி",
  "track.cta": "கண்காணி",
  "track.notFound": "ஆர்டர் இல்லை.",
  "track.status.confirmed": "உறுதி",
  "track.status.packed": "பேக் செய்யப்பட்டது",
  "track.status.out_for_delivery": "டெலிவரிக்கு புறப்பட்டது",
  "track.status.delivered": "டெலிவரி ஆனது",

  "auth.welcome": "வரவேற்கிறோம் 👋",
  "auth.create": "கணக்கை உருவாக்கு 🎈",
  "auth.sub": "ஆர்டர்களை எளிதாகக் கண்காணிக்கவும்.",
  "auth.phone": "தொலைபேசி",
  "auth.otp": "OTP",
  "auth.sendOtp": "OTP அனுப்பு",
  "auth.verify": "சரிபார்த்து உள்நுழை",
  "auth.demoOtp": "டெமோ — எந்த 6 இலக்கமும் OTP ஆக ஏற்கப்படும்.",
  "auth.name": "உங்கள் பெயர்",
  "auth.signedOut": "வெளியேறினீர்கள்",
  "auth.welcomeBack": "வரவேற்கிறோம்",

  "toast.addedToCart": "கூடையில் சேர்க்கப்பட்டது 🛒",
  "toast.reviewThanks": "நன்றி! 💛",

  "orders.title": "என் ஆர்டர்கள்",
  "orders.none": "இன்னும் ஆர்டர்கள் இல்லை.",

  "footer.hours": "தினமும் காலை 9 மணி · வாட்ஸ்அப்",

  "common.loading": "ராசி திறக்கிறது…",
  "common.cancel": "ரத்து",
  "common.close": "மூடு",
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
