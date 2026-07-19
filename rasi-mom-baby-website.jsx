import { useState, useEffect, useMemo } from "react";

/* ============ Rasi Mom & Baby — Complete Website (Playful Skin) ============
   Full storefront + cart + checkout + auth + order tracking + bundles +
   coupons + reviews + admin panel. Sticker/toy aesthetic throughout.
   Real store: 176 Palayamkottai Rd, opp Rajaji Park, Thoothukudi 628001.
=========================================================================== */

/* ---- palette ---- */
const INK = "#2B2140";      // outlines + text
const CREAM = "#FFF9F0";    // page
const PAPER = "#FFFFFF";    // cards
const PINK = "#EC5D8A";     // primary action
const MUTE = "#6B617D";     // secondary text

const MILESTONES = [
  { id: "newborn", en: "Newborn 0–3m", short_en: "0–3 months", short_ta: "0–3 மாதம்", en_full: "Newborn 0–3 months", ta: "பிறந்த குழந்தை", emoji: "🍼", bg: "#FFE1A8" },
  { id: "infant", en: "Infant 3–12m", short_en: "3–12 months", short_ta: "3–12 மாதம்", en_full: "Infant 3–12 months", ta: "சிசு", emoji: "🧸", bg: "#C7E9FF" },
  { id: "toddler", en: "Toddler 1–3y", short_en: "1–3 years", short_ta: "1–3 வயது", en_full: "Toddler 1–3 years", ta: "தளிர்நடை", emoji: "🚂", bg: "#D6E8B0" },
  { id: "mom", en: "For Mom", short_en: "For Mom", short_ta: "அம்மாவுக்கு", en_full: "For Mom", ta: "அம்மாவுக்காக", emoji: "🌸", bg: "#FBD0EA" },
];

const CATEGORIES = [
  { id: "feeding", en: "Feeding", ta: "உணவளித்தல்", emoji: "🍼", bg: "#FFE1A8", pop: "#F59E0B" },
  { id: "bath", en: "Bath & Skincare", ta: "குளியல்", emoji: "🫧", bg: "#C7E9FF", pop: "#3B9EDB" },
  { id: "toys", en: "Toys & Play", ta: "பொம்மைகள்", emoji: "🧸", bg: "#FFCBD9", pop: "#EC5D8A" },
  { id: "clothing", en: "Clothing", ta: "ஆடைகள்", emoji: "👕", bg: "#D6E8B0", pop: "#7CB342" },
  { id: "diapering", en: "Diapering", ta: "டயப்பர்", emoji: "🧷", bg: "#E4D6FF", pop: "#9A6BE0" },
  { id: "gear", en: "Gear", ta: "உபகரணங்கள்", emoji: "🛒", bg: "#B9EBDD", pop: "#1FB995" },
  { id: "health", en: "Health & Safety", ta: "ஆரோக்கியம்", emoji: "🌡️", bg: "#FFD6C2", pop: "#F26B4A" },
  { id: "mom", en: "Mom Care", ta: "அம்மா பராமரிப்பு", emoji: "🌸", bg: "#FBD0EA", pop: "#D65BB0" },
];

const SEED_PRODUCTS = [
  { id: "p1", name: "Organic Cotton Swaddle Set (3 pack)", price: 899, mrp: 1199, milestone: "newborn", categories: ["clothing"], stock: 24, emoji: "🍼", bg: "#FFE1A8", desc: "Breathable mulmul cotton swaddles, gentle on newborn skin. Made in Tirupur." },
  { id: "p2", name: "Anti-Colic Feeding Bottle 150ml", price: 449, mrp: 549, milestone: "newborn", categories: ["feeding"], stock: 40, emoji: "🍼", bg: "#B9EBDD", desc: "BPA-free bottle with slow-flow nipple for newborn feeding." },
  { id: "p3", name: "Sebamed Baby Wash Extra Soft 200ml", price: 585, mrp: 650, milestone: "newborn", categories: ["bath"], stock: 35, emoji: "🫧", bg: "#C7E9FF", desc: "pH 5.5 soap-free wash — the Sebamed range Rasi is known for." },
  { id: "p4", name: "Baby Massage Oil — Coconut & Almond", price: 320, mrp: 380, milestone: "newborn", categories: ["bath", "health"], stock: 55, emoji: "🧴", bg: "#FFD6C2", desc: "Cold-pressed traditional blend for daily massage." },
  { id: "p5", name: "Silicone Teether & Rattle Set", price: 380, mrp: 499, milestone: "infant", categories: ["toys", "feeding"], stock: 32, emoji: "🧸", bg: "#FFCBD9", desc: "Food-grade silicone teethers, easy for small hands to grip." },
  { id: "p6", name: "6-in-1 Baby Cereal Sampler", price: 650, mrp: 780, milestone: "infant", categories: ["feeding"], stock: 18, emoji: "🥣", bg: "#D6E8B0", desc: "Ragi, rice and multigrain first foods for 6 months+." },
  { id: "p7", name: "Crawling Knee Pads (2 pairs)", price: 299, mrp: 399, milestone: "infant", categories: ["clothing", "gear"], stock: 27, emoji: "🧦", bg: "#E4D6FF", desc: "Cushioned cotton knee pads for confident crawlers." },
  { id: "p8", name: "Wooden Stacking Train Toy", price: 749, mrp: 999, milestone: "toddler", categories: ["toys"], stock: 15, emoji: "🚂", bg: "#FFCBD9", desc: "Channapatna-style wooden toy with non-toxic colours — from Rasi's famous toy wall." },
  { id: "p9", name: "Musical Activity Cube", price: 1299, mrp: 1599, milestone: "toddler", categories: ["toys"], stock: 9, emoji: "🎵", bg: "#E4D6FF", desc: "5-sided discovery cube with lights, shapes and Tamil rhymes." },
  { id: "p10", name: "Toddler Sipper Cup with Straw", price: 349, mrp: 429, milestone: "toddler", categories: ["feeding"], stock: 38, emoji: "🥤", bg: "#B9EBDD", desc: "Spill-proof sipper for independent drinking, 12m+." },
  { id: "p11", name: "Nursing Cover & Pillow Combo", price: 1150, mrp: 1450, milestone: "mom", categories: ["mom", "feeding"], stock: 12, emoji: "🌸", bg: "#FBD0EA", desc: "Soft feeding pillow with breathable nursing cover." },
  { id: "p12", name: "Stretch Mark Care Cream 100g", price: 540, mrp: 650, milestone: "mom", categories: ["mom", "bath"], stock: 30, emoji: "🤰", bg: "#FFCBD9", desc: "Shea butter and vitamin E cream for pre & post-natal care." },
];

const BUNDLES = [
  { id: "b1", name: "Hospital Bag Bundle", nameTa: "மருத்துவமனை பை", emoji: "🏥", bg: "#FFE1A8", milestone: "newborn", categories: [], price: 1899, mrp: 2348, stock: 99, isBundle: true, desc: "Swaddle + bottle + Sebamed wash + oil — the first week, packed and ready.", items: ["Swaddle Set", "Feeding Bottle", "Sebamed Wash", "Massage Oil"] },
  { id: "b2", name: "First Foods Bundle", nameTa: "முதல் உணவு", emoji: "🥣", bg: "#D6E8B0", milestone: "infant", categories: [], price: 1199, mrp: 1459, stock: 99, isBundle: true, desc: "Cereal + sipper + teether for the 6-month milestone.", items: ["Cereal Sampler", "Sipper Cup", "Teether Set"] },
  { id: "b3", name: "New Mom Care Bundle", nameTa: "புதிய அம்மா", emoji: "💝", bg: "#FBD0EA", milestone: "mom", categories: [], price: 1499, mrp: 2100, stock: 99, isBundle: true, desc: "Nursing combo + care cream — a thoughtful gift for her.", items: ["Nursing Combo", "Care Cream"] },
];

const SEED_COUPONS = [
  { code: "WELCOME10", type: "percent", value: 10, min: 499 },
  { code: "RASI50", type: "flat", value: 50, min: 999 },
];
const SEED_REVIEWS = {
  p8: [{ name: "Karthika", rating: 5, text: "Lovely wooden toy, exactly like the collection in the shop. My son loves it." }],
  p3: [{ name: "Priya", rating: 5, text: "Genuine Sebamed at a fair price. Same trust as buying in store." }],
};

const STORAGE_KEY = "rasi-store-v4";
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const uid = () => Math.random().toString(36).slice(2, 9);

async function loadStore() {
  try { const r = await window.storage.get(STORAGE_KEY); if (r && r.value) return JSON.parse(r.value); } catch (e) {}
  return { products: SEED_PRODUCTS, orders: [], coupons: SEED_COUPONS, reviews: SEED_REVIEWS,
    users: [{ id: "u-admin", name: "Rasi Admin", email: "admin@rasi.in", password: "rasi123", role: "admin" }] };
}
async function saveStore(s) { try { await window.storage.set(STORAGE_KEY, JSON.stringify(s)); } catch (e) { console.error(e); } }

/* ---------- style helpers (sticker system) ---------- */
const card = (extra = {}) => ({ background: PAPER, border: `3px solid ${INK}`, borderRadius: 18, boxShadow: `4px 4px 0 ${INK}`, ...extra });
const pill = (bg, color = INK) => ({ background: bg, border: `2.5px solid ${INK}`, borderRadius: 22, padding: "7px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", color, boxShadow: `2px 2px 0 ${INK}`, fontFamily: "'Baloo 2',sans-serif" });

const Btn = ({ children, onClick, bg = PINK, color = "#fff", full, small, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? "#D8D2E0" : bg, color: disabled ? "#8A8398" : color, border: `3px solid ${INK}`,
      borderRadius: 22, fontWeight: 800, fontFamily: "'Baloo 2',sans-serif", cursor: disabled ? "default" : "pointer",
      boxShadow: disabled ? "none" : `3px 3px 0 ${INK}`, padding: small ? "7px 16px" : "11px 20px", fontSize: small ? 13 : 15,
      width: full ? "100%" : "auto", transition: "transform .12s" }}
    onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "translate(2px,2px)")}
    onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
    {children}
  </button>
);

const Field = ({ label, ...props }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5, color: MUTE }}>{label}</span>
    <input {...props} style={{ marginTop: 4, width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 14px",
      border: `2.5px solid ${INK}`, background: PAPER, color: INK, fontSize: 15, fontFamily: "'Karla',sans-serif", outline: "none" }} />
  </label>
);

const Badge = ({ children, bg = "#FFE1A8" }) => (
  <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: bg, border: `2px solid ${INK}` }}>{children}</span>
);

const Stars = ({ n }) => <span style={{ color: "#F59E0B", letterSpacing: 1 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;

const Art = ({ p, h = 150 }) => (
  <div style={{ height: h, background: p.bg || "#FFE1A8", border: `2.5px solid ${INK}`, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: h * 0.34, position: "relative" }}>
    <span>{p.emoji || "🧸"}</span>
    {p.isBundle && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 12, background: PINK, color: "#fff", border: `2px solid ${INK}` }}>BUNDLE</span>}
  </div>
);

const Modal = ({ onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(43,33,64,0.55)" }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: wide ? 640 : 440, maxHeight: "92vh", overflowY: "auto",
      background: CREAM, border: `4px solid ${INK}`, borderRadius: 24, boxShadow: `6px 6px 0 ${INK}`, padding: 22 }}>
      {children}
    </div>
  </div>
);

/* ================= APP ================= */
export default function RasiSite() {
  const [store, setStore] = useState(null);
  const [session, setSession] = useState(null);
  const [route, setRoute] = useState("home");
  const [lang, setLang] = useState("en");
  const [milestone, setMilestone] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [adminTab, setAdminTab] = useState("dashboard");

  useEffect(() => { loadStore().then(setStore); }, []);
  const persist = (n) => { setStore(n); saveStore(n); };
  const notify = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const t = (en, ta) => (lang === "ta" ? ta : en);

  const products = store?.products || [];
  const catalog = [...products, ...BUNDLES];
  const findItem = (id) => catalog.find((p) => p.id === id);

  const filtered = useMemo(() => products.filter((p) =>
    (milestone === "all" || p.milestone === milestone) &&
    (category === "all" || (p.categories || []).includes(category)) &&
    (!query || p.name.toLowerCase().includes(query.toLowerCase()))
  ), [products, milestone, category, query]);

  const cartItems = cart.map((c) => ({ ...c, product: findItem(c.productId) })).filter((c) => c.product);
  const subtotal = cartItems.reduce((s, c) => s + c.product.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const addToCart = (p) => {
    setCart((prev) => { const ex = prev.find((c) => c.productId === p.id);
      return ex ? prev.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + 1 } : c)) : [...prev, { productId: p.id, qty: 1 }]; });
    notify(t("Added to cart 🛒", "கூடையில் சேர்க்கப்பட்டது 🛒"));
  };
  const setQty = (id, qty) => setCart((prev) => (qty <= 0 ? prev.filter((c) => c.productId !== id) : prev.map((c) => (c.productId === id ? { ...c, qty } : c))));

  const buyAgain = useMemo(() => {
    if (!session || !store) return [];
    const names = new Set();
    store.orders.filter((o) => o.userId === session.id).forEach((o) => o.items.forEach((i) => names.add(i.name)));
    return products.filter((p) => names.has(p.name)).slice(0, 6);
  }, [session, store, products]);

  const doLogin = (email, password) => {
    const u = store.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) return notify(t("Email or password doesn't match", "பொருந்தவில்லை"));
    setSession(u); setModal(null); notify(`${t("Welcome back", "வரவேற்கிறோம்")}, ${u.name.split(" ")[0]}! 🎉`);
    if (u.role === "admin") setRoute("admin");
  };
  const doSignup = (name, email, password) => {
    email = email.trim().toLowerCase();
    if (!name || !email || password.length < 4) return notify(t("Fill all fields (password 4+)", "எல்லாவற்றையும் நிரப்பவும்"));
    if (store.users.some((x) => x.email === email)) return notify(t("Account exists — sign in", "கணக்கு உள்ளது"));
    const u = { id: "u-" + uid(), name, email, password, role: "customer", joined: new Date().toISOString(), notes: "" };
    persist({ ...store, users: [...store.users, u] });
    setSession(u); setModal(null); notify(t("Account created! 🎈", "கணக்கு உருவாக்கப்பட்டது! 🎈"));
  };

  const computeTotals = (coupon) => {
    const delivery = subtotal > 999 ? 0 : 49;
    let discount = 0;
    if (coupon && subtotal >= coupon.min) discount = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    return { delivery, discount, total: subtotal + delivery - discount };
  };
  const placeOrder = (address, payMethod, coupon) => {
    const { delivery, discount, total } = computeTotals(coupon);
    const order = { id: "RSB-" + String(1001 + store.orders.length), userId: session?.id || "guest",
      customer: address.name, phone: address.phone, address: `${address.line}, ${address.city} — ${address.pin}`,
      items: cartItems.map((c) => ({ name: c.product.name, qty: c.qty, price: c.product.price })),
      subtotal, delivery, discount, coupon: coupon?.code || null, total, status: "Confirmed", payMethod, date: new Date().toISOString() };
    const nextProducts = products.map((p) => { const line = cart.find((c) => c.productId === p.id); return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p; });
    persist({ ...store, orders: [order, ...store.orders], products: nextProducts });
    setCart([]); setModal({ type: "orderDone", data: order });
  };

  const saveProduct = (form) => {
    if (!form.name || !form.price) return notify("Name and price required");
    const clean = { ...form, price: +form.price, mrp: +form.mrp || +form.price, stock: +form.stock || 0 };
    const next = form.id ? products.map((p) => (p.id === form.id ? { ...p, ...clean } : p)) : [{ ...clean, id: "p-" + uid() }, ...products];
    persist({ ...store, products: next }); setModal(null); notify(form.id ? "Product updated ✓" : "Product added ✓");
  };
  const deleteProduct = (id) => { persist({ ...store, products: products.filter((p) => p.id !== id) }); notify("Product removed"); };
  const setOrderStatus = (id, status) => persist({ ...store, orders: store.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
  const saveCustomerNote = (id, notes) => persist({ ...store, users: store.users.map((u) => (u.id === id ? { ...u, notes } : u)) });
  const addCoupon = (c) => { if (!c.code || !c.value) return notify("Code and value required");
    persist({ ...store, coupons: [...store.coupons, { ...c, code: c.code.toUpperCase(), value: +c.value, min: +c.min || 0 }] }); notify("Coupon added ✓"); };
  const deleteCoupon = (code) => persist({ ...store, coupons: store.coupons.filter((c) => c.code !== code) });
  const addReview = (pid, r) => { const reviews = { ...(store.reviews || {}) }; reviews[pid] = [...(reviews[pid] || []), r]; persist({ ...store, reviews }); notify(t("Thanks for your review! 💛", "நன்றி! 💛")); };

  if (!store) return <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Baloo 2',sans-serif" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 40 }}>🍼</div><p style={{ color: MUTE }}>Opening Rasi…</p></div></div>;
  const isAdmin = session?.role === "admin";

  return (
    <div style={{ background: CREAM, color: INK, fontFamily: "'Baloo 2','Karla',sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Karla:wght@400;600;700&family=Noto+Sans+Tamil:wght@500;700&display=swap');
        .body-f { font-family:'Karla','Noto Sans Tamil',sans-serif; }
        .marquee { display:flex; gap:18px; width:max-content; animation: slide 36s linear infinite; }
        .marquee:hover { animation-play-state: paused; }
        @keyframes slide { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .pop { transition: transform .16s ease; }
        .pop:hover { transform: translateY(-4px) rotate(-1deg); }
        .blob { position:absolute; border-radius:50%; opacity:.45; z-index:0; }
        @media (prefers-reduced-motion: reduce){ .marquee{animation:none} .pop{transition:none} }
        select { font-family:'Karla',sans-serif; }
        @media (max-width: 720px){
          .hero-grid{ grid-template-columns:1fr !important; }
          .hero-grid > div:last-child{ display:none; }
          .cat-grid{ grid-template-columns:1fr 1fr !important; }
          .prod-grid{ grid-template-columns:1fr 1fr !important; }
          h1{ font-size:34px !important; }
        }
      `}</style>

      {/* ribbon */}
      <div style={{ background: INK, color: "#FFE1A8", textAlign: "center", fontWeight: 800, fontSize: 14, padding: "9px 12px" }} className="body-f">
        ⚡ {t("Same-day delivery in Thoothukudi — order before 4 PM 🚚", "தூத்துக்குடியில் அன்றே டெலிவரி — மாலை 4 மணிக்கு முன் 🚚")}
      </div>

      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", maxWidth: 1080, margin: "0 auto", flexWrap: "wrap" }}>
        <button onClick={() => { setRoute("home"); setMilestone("all"); setCategory("all"); }} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: PINK, border: `3px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 19, boxShadow: `3px 3px 0 ${INK}` }}>ர</div>
          <div style={{ lineHeight: 1, textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Rasi</div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: PINK, fontWeight: 800 }}>Mom & Baby</div>
          </div>
        </button>
        <div style={{ flex: 1 }} />
        <button style={pill("#B9EBDD")} onClick={() => setLang(lang === "en" ? "ta" : "en")}>{lang === "en" ? "தமிழ்" : "English"}</button>
        <button style={pill("#FFE1A8")} onClick={() => setModal({ type: "track" })}>{t("Track", "நிலை")}</button>
        {isAdmin && <button style={pill(route === "admin" ? INK : "#E4D6FF", route === "admin" ? "#fff" : INK)} onClick={() => setRoute(route === "admin" ? "home" : "admin")}>{route === "admin" ? t("Store", "கடை") : "Admin"}</button>}
        {session && !isAdmin && <button style={pill("#D6E8B0")} onClick={() => setRoute(route === "orders" ? "home" : "orders")}>{route === "orders" ? t("Shop", "கடை") : t("Orders", "ஆர்டர்")}</button>}
        {session ? <button style={pill("#FFCBD9")} onClick={() => { setSession(null); setRoute("home"); notify(t("Signed out", "வெளியேறினீர்கள்")); }}>{t("Sign out", "வெளியேறு")}</button>
          : <button style={pill("#FFE1A8")} onClick={() => setModal({ type: "auth" })}>{t("Sign in", "உள்நுழை")}</button>}
        <button style={{ ...pill(PINK, "#fff"), position: "relative" }} onClick={() => setModal({ type: "cart" })}>
          🛒{cartCount > 0 && <span style={{ position: "absolute", top: -8, right: -8, background: INK, color: "#fff", fontSize: 11, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{cartCount}</span>}
        </button>
      </div>

      {/* ===== HOME ===== */}
      {route === "home" && (
        <HomeView t={t} milestone={milestone} setMilestone={setMilestone} category={category} setCategory={setCategory}
          query={query} setQuery={setQuery} filtered={filtered} products={products} buyAgain={buyAgain}
          addToCart={addToCart} openProduct={(p) => setModal({ type: "product", data: p })} />
      )}

      {/* ===== CUSTOMER ORDERS ===== */}
      {route === "orders" && session && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 16 }}>{t("My orders", "என் ஆர்டர்கள்")} 📦</h2>
          {store.orders.filter((o) => o.userId === session.id).length === 0 && <p className="body-f" style={{ color: MUTE }}>{t("No orders yet.", "இன்னும் ஆர்டர்கள் இல்லை.")}</p>}
          {store.orders.filter((o) => o.userId === session.id).map((o) => (
            <div key={o.id} style={{ ...card(), padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800 }}>{o.id}</span>
                <Badge bg={o.status === "Delivered" ? "#D6E8B0" : "#FFE1A8"}>{o.status}</Badge>
              </div>
              <div className="body-f" style={{ fontSize: 14, color: MUTE, marginTop: 4 }}>{o.items.map((i) => `${i.name} ×${i.qty}`).join(" · ")}</div>
              <div style={{ fontWeight: 800, marginTop: 4, color: PINK }}>{inr(o.total)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ===== ADMIN ===== */}
      {route === "admin" && isAdmin && (
        <AdminView t={t} store={store} products={products} adminTab={adminTab} setAdminTab={setAdminTab}
          openForm={(d) => setModal({ type: "productForm", data: d })} confirmDelete={(p) => setModal({ type: "confirmDelete", data: p })}
          setOrderStatus={setOrderStatus} saveCustomerNote={saveCustomerNote} addCoupon={addCoupon} deleteCoupon={deleteCoupon} />
      )}

      {/* ===== MODALS ===== */}
      {modal?.type === "product" && <ProductModal p={modal.data} reviews={(store.reviews || {})[modal.data.id] || []} session={session} t={t} onClose={() => setModal(null)} onAdd={() => { addToCart(modal.data); setModal(null); }} onReview={(r) => addReview(modal.data.id, r)} onLogin={() => setModal({ type: "auth" })} />}
      {modal?.type === "cart" && <CartModal t={t} cartItems={cartItems} subtotal={subtotal} setQty={setQty} onClose={() => setModal(null)} onCheckout={() => setModal({ type: "checkout" })} />}
      {modal?.type === "checkout" && <CheckoutModal session={session} subtotal={subtotal} coupons={store.coupons} t={t} computeTotals={computeTotals} onClose={() => setModal(null)} onPlace={placeOrder} needLogin={() => setModal({ type: "auth" })} notify={notify} />}
      {modal?.type === "orderDone" && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 50 }}>🎉</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, marginTop: 10 }}>{t("Order confirmed!", "ஆர்டர் உறுதி!")}</h3>
            <p className="body-f" style={{ color: MUTE, marginTop: 8 }}>{t("Order", "ஆர்டர்")} <b style={{ color: INK }}>{modal.data.id}</b> {t("is on its way. WhatsApp updates will follow.", "வழியில் உள்ளது. வாட்ஸ்அப் தகவல் வரும்.")}</p>
            <div style={{ marginTop: 18 }}><Btn full onClick={() => setModal(null)}>{t("Continue shopping", "தொடர்க")}</Btn></div>
          </div>
        </Modal>
      )}
      {modal?.type === "track" && <TrackModal orders={store.orders} t={t} onClose={() => setModal(null)} />}
      {modal?.type === "auth" && <AuthModal t={t} onClose={() => setModal(null)} onLogin={doLogin} onSignup={doSignup} />}
      {modal?.type === "productForm" && <ProductFormModal data={modal.data} onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal?.type === "confirmDelete" && (
        <Modal onClose={() => setModal(null)}>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>Delete "{modal.data.name}"?</h3>
          <p className="body-f" style={{ fontSize: 14, color: MUTE, marginTop: 8 }}>This removes the product from the store.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Btn full bg="#F2EAE0" color={INK} onClick={() => setModal(null)}>Keep it</Btn>
            <Btn full bg="#E24B4A" onClick={() => { deleteProduct(modal.data.id); setModal(null); }}>Delete</Btn>
          </div>
        </Modal>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: INK, color: "#FFE1A8", padding: "12px 22px", borderRadius: 24, fontWeight: 800, boxShadow: `4px 4px 0 rgba(0,0,0,0.2)` }}>{toast}</div>}

      {/* footer */}
      <div style={{ background: PINK, borderTop: `4px solid ${INK}`, color: "#fff", textAlign: "center", padding: 22 }} className="body-f">
        <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Baloo 2',sans-serif" }}>Rasi Mom & Baby</div>
        <div style={{ fontSize: 13, opacity: .95 }}>176, Palayamkottai Rd, opp. Rajaji Park, Thoothukudi 628001</div>
        <div style={{ fontSize: 13, opacity: .95 }}>{t("Opens 9 AM daily · WhatsApp us anytime", "தினமும் காலை 9 மணி · வாட்ஸ்அப்")}</div>
        <div style={{ fontSize: 11, opacity: .8, marginTop: 6 }}>Demo — admin: admin@rasi.in / rasi123</div>
      </div>
    </div>
  );
}

/* ================= HOME VIEW ================= */
function HomeView({ t, milestone, setMilestone, category, setCategory, query, setQuery, filtered, products, buyAgain, addToCart, openProduct }) {
  const marquee = products.slice(0, 8);
  const scrollShop = () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  return (
    <div>
      {/* hero */}
      <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "26px 20px 8px" }}>
        <div className="blob" style={{ width: 220, height: 220, background: "#FFCBD9", top: -20, right: 10 }} />
        <div className="blob" style={{ width: 140, height: 140, background: "#C7E9FF", bottom: 0, left: -30 }} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 26, alignItems: "center" }} className="hero-grid">
          <div>
            <span style={{ ...card({ borderRadius: 30, boxShadow: `3px 3px 0 ${INK}` }), padding: "7px 16px", fontWeight: 800, fontSize: 14, display: "inline-block" }}>⭐ 4.8 · 2,360+ {t("happy families", "மகிழ்ச்சியான குடும்பங்கள்")}</span>
            <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.06, margin: "16px 0 10px" }}>
              {t("Everything for", "உங்கள் குழந்தைக்கு")}<br /><span style={{ color: PINK }}>{t("your little one", "தேவையான அனைத்தும்")}</span> 🎈
            </h1>
            <p className="body-f" style={{ fontSize: 16, color: MUTE, margin: "0 0 20px", maxWidth: 420 }}>
              {t("Thoothukudi's most-loved baby store, now online. Shop by age or category — delivered same day.", "தூத்துக்குடியின் நம்பகமான குழந்தை கடை, இப்போது ஆன்லைனில். வயது அல்லது வகைப்படி வாங்குங்கள்.")}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Btn onClick={scrollShop}>{t("Start shopping", "வாங்கத் தொடங்கு")} →</Btn>
              <Btn bg="#FFE1A8" color={INK} onClick={() => document.getElementById("bundles")?.scrollIntoView({ behavior: "smooth" })}>{t("See bundles", "தொகுப்புகள்")}</Btn>
            </div>
          </div>
          <div style={{ position: "relative", height: 290 }}>
            {[{ e: "🧸", c: "#FFCBD9", x: 40, y: 6, r: -6, s: 118 }, { e: "🍼", c: "#FFE1A8", x: 186, y: 34, r: 8, s: 92 },
              { e: "🫧", c: "#C7E9FF", x: 18, y: 146, r: 5, s: 98 }, { e: "🌸", c: "#FBD0EA", x: 168, y: 158, r: -8, s: 108 }].map((b, i) => (
              <div key={i} className="pop" style={{ position: "absolute", left: b.x, top: b.y, width: b.s, height: b.s, background: b.c,
                border: `3px solid ${INK}`, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: b.s * 0.42, transform: `rotate(${b.r}deg)`, boxShadow: `4px 4px 0 ${INK}` }}>{b.e}</div>
            ))}
          </div>
        </div>
      </div>

      {/* auto-scroll marquee */}
      <div style={{ margin: "18px 0 6px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 8px", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 22 }}>{t("Fresh picks", "புதிய தேர்வுகள்")}</span>
          <span style={{ fontSize: 14, color: "#9A6BE0", fontWeight: 800 }}>· {t("just added", "புதிதாக")} ✨</span>
        </div>
        <div style={{ overflow: "hidden", padding: "6px 0 12px", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)", maskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)" }}>
          <div className="marquee">
            {[...marquee, ...marquee].map((p, i) => (
              <button key={i} onClick={() => openProduct(p)} className="pop" style={{ width: 150, flexShrink: 0, ...card({ borderRadius: 18 }), padding: 10, textAlign: "left", cursor: "pointer" }}>
                <Art p={p} h={90} />
                <div className="body-f" style={{ fontWeight: 700, fontSize: 13, marginTop: 8, lineHeight: 1.15 }}>{p.name}</div>
                <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 800, color: PINK }}>{inr(p.price)}</span>
                  <span style={{ fontSize: 11, textDecoration: "line-through", color: "#B4AABF" }}>{inr(p.mrp)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* shop by category */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 24 }}>{t("Shop by category", "வகைப்படி வாங்குங்கள்")}</span><span style={{ fontSize: 22 }}>🎨</span>
          {category !== "all" && <button onClick={() => setCategory("all")} style={{ marginLeft: "auto", ...pill("#FFCBD9") }}>{t("Clear", "அழி")} ✕</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }} className="cat-grid">
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button key={c.id} onClick={() => { setCategory(on ? "all" : c.id); scrollShop(); }} className="pop" style={{ background: c.bg, border: `3px solid ${INK}`, borderRadius: 20, padding: "16px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer",
                boxShadow: on ? `2px 2px 0 ${INK}` : `5px 5px 0 ${INK}`, transform: on ? "translate(3px,3px)" : "none" }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#fff", border: `3px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27 }}>{c.emoji}</div>
                <span style={{ fontWeight: 800, fontSize: 14, textAlign: "center", lineHeight: 1.1 }}>{t(c.en, c.ta)}</span>
                <span className="body-f" style={{ fontSize: 11, fontWeight: 700, color: c.pop }}>{on ? t("Selected ✓", "தேர்வு ✓") : t("Browse →", "பார்க்க →")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* buy again */}
      {buyAgain.length > 0 && (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 20px 0" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>🔁 {t("Buy again", "மீண்டும் வாங்கு")}</h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {buyAgain.map((p) => (
              <div key={p.id} style={{ flexShrink: 0, width: 160, ...card(), padding: 10 }}>
                <Art p={p} h={90} />
                <div className="body-f" style={{ fontSize: 12, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ fontWeight: 800, marginTop: 4, color: PINK }}>{inr(p.price)}</div>
                <div style={{ marginTop: 8 }}><Btn small full onClick={() => addToCart(p)}>{t("Add", "சேர்")}</Btn></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* bundles */}
      <div id="bundles" style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px 0" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>{t("Curated bundles", "தேர்ந்தெடுத்த தொகுப்புகள்")} 🎁</h2>
        <p className="body-f" style={{ fontSize: 14, color: MUTE, marginBottom: 14 }}>{t("Put together by Nisha, Harini & Punitha — the same advice you get in store.", "நிஷா, ஹரிணி & புனிதா தேர்வு செய்தவை.")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }} className="cat-grid">
          {BUNDLES.map((b) => (
            <div key={b.id} style={{ ...card(), padding: 12, display: "flex", flexDirection: "column" }}>
              <Art p={b} h={100} />
              <div style={{ fontWeight: 800, marginTop: 10 }}>{t(b.name, b.nameTa)}</div>
              <div className="body-f" style={{ fontSize: 12, color: MUTE, flex: 1, marginTop: 2 }}>{b.items.join(" + ")}</div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, color: PINK }}>{inr(b.price)}</span>
                <span style={{ fontSize: 12, textDecoration: "line-through", color: "#B4AABF" }}>{inr(b.mrp)}</span>
                <Badge bg="#D6E8B0">{t("Save", "சேமி")} {inr(b.mrp - b.price)}</Badge>
              </div>
              <div style={{ marginTop: 10 }}><Btn small full onClick={() => addToCart(b)}>{t("Add bundle", "சேர்")}</Btn></div>
            </div>
          ))}
        </div>
      </div>

      {/* shop grid */}
      <div id="shop" style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 20px 8px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
          {category === "all" ? t("Shop by age", "வயதுப்படி வாங்குங்கள்") : t(CATEGORIES.find((c) => c.id === category)?.en, CATEGORIES.find((c) => c.id === category)?.ta)}
        </h2>
        {(category !== "all" || milestone !== "all") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }} className="body-f">
            <span style={{ color: MUTE, fontSize: 14 }}>{t("Filtering:", "வடிகட்டல்:")}</span>
            {milestone !== "all" && <span style={{ ...pill("#FFE1A8") }}>{MILESTONES.find((m) => m.id === milestone)?.emoji} {t(MILESTONES.find((m) => m.id === milestone)?.short_en, MILESTONES.find((m) => m.id === milestone)?.short_ta)} <span onClick={() => setMilestone("all")} style={{ cursor: "pointer" }}>✕</span></span>}
            {category !== "all" && <span style={{ ...pill("#B9EBDD") }}>{CATEGORIES.find((c) => c.id === category)?.emoji} {t(CATEGORIES.find((c) => c.id === category)?.en, CATEGORIES.find((c) => c.id === category)?.ta)} <span onClick={() => setCategory("all")} style={{ cursor: "pointer" }}>✕</span></span>}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
          <button onClick={() => setMilestone("all")} style={milestone === "all" ? pill(INK, "#fff") : pill("#F2EAE0")}>{t("All ages", "அனைத்து வயது")}</button>
          {MILESTONES.map((m) => (
            <button key={m.id} onClick={() => setMilestone(m.id)} style={{ whiteSpace: "nowrap", ...(milestone === m.id ? pill(INK, "#fff") : pill(m.bg)) }}>{m.emoji} {t(m.short_en, m.short_ta)}</button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search products…", "தேடுங்கள்…")}
          className="body-f" style={{ marginTop: 10, width: "100%", maxWidth: 340, boxSizing: "border-box", borderRadius: 22, padding: "10px 18px", border: `2.5px solid ${INK}`, background: PAPER, fontSize: 15, outline: "none" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 16 }} className="prod-grid">
          {filtered.map((p) => (
            <div key={p.id} className="pop" style={{ ...card(), padding: 10, display: "flex", flexDirection: "column" }}>
              <button onClick={() => openProduct(p)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><Art p={p} h={130} /></button>
              <div style={{ flex: 1, marginTop: 8 }}>
                <div className="body-f" style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 800, color: PINK }}>{inr(p.price)}</span>
                  {p.mrp > p.price && <span style={{ fontSize: 11, textDecoration: "line-through", color: "#B4AABF" }}>{inr(p.mrp)}</span>}
                </div>
                {p.stock <= 5 && p.stock > 0 && <div style={{ fontSize: 11, fontWeight: 800, color: "#F59E0B", marginTop: 3 }}>{t(`Only ${p.stock} left!`, `${p.stock} மட்டுமே!`)}</div>}
                {p.stock === 0 && <div style={{ fontSize: 11, fontWeight: 800, color: "#E24B4A", marginTop: 3 }}>{t("Sold out", "விற்றுத் தீர்ந்தது")}</div>}
              </div>
              <div style={{ marginTop: 8 }}><Btn small full disabled={p.stock === 0} onClick={() => addToCart(p)}>{t("Add to cart", "சேர்")}</Btn></div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, ...card({ background: "#F2EAE0" }), marginTop: 8 }}>
            <div style={{ fontSize: 30 }}>🔍</div>
            <p style={{ fontWeight: 800, marginTop: 6 }}>{t("No products match these filters", "பொருட்கள் இல்லை")}</p>
            <button className="body-f" style={{ marginTop: 8, background: "none", border: "none", textDecoration: "underline", color: MUTE, cursor: "pointer", fontWeight: 700 }} onClick={() => { setMilestone("all"); setCategory("all"); setQuery(""); }}>{t("Clear all filters", "அனைத்தையும் அழி")}</button>
          </div>
        )}
      </div>

      {/* trust */}
      <div style={{ maxWidth: 1080, margin: "16px auto 40px", padding: "0 20px" }}>
        <div style={{ ...card({ background: "#FFE1A8", boxShadow: `6px 6px 0 ${INK}` }), padding: 24, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "center" }} className="cat-grid">
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>{t("The store you already trust", "நீங்கள் நம்பும் கடை")} 💛</h2>
            <p className="body-f" style={{ fontSize: 14, color: "#7A5A1E", margin: "8px 0 12px", lineHeight: 1.5 }}>
              {t("The same shelves and the same people from Palayamkottai Road, now on your phone.", "பழையம்கோட்டை சாலையின் அதே கடை, அதே அன்பான ஊழியர்கள் — இப்போது உங்கள் மொபைலில்.")}
            </p>
            <div className="body-f" style={{ fontSize: 13, fontWeight: 700 }}>📍 176, Palayamkottai Rd, opp. Rajaji Park, Thoothukudi 628001</div>
            <div className="body-f" style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>🕘 {t("Opens 9 AM daily", "தினமும் காலை 9 மணி")} · 💬 WhatsApp</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {["Nisha", "Harini", "Punitha"].map((n) => <span key={n} style={{ ...pill("#fff") }}>👩 {n}</span>)}
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...card(), padding: 16 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: PINK }}>4.8 <span style={{ fontSize: 16, color: "#F59E0B" }}>★★★★★</span></div>
              <div className="body-f" style={{ fontSize: 13, color: MUTE }}>2,360+ {t("Google reviews", "கூகுள் மதிப்பாய்வு")}</div>
            </div>
            <div style={{ ...card(), padding: 14 }} className="body-f">
              <Stars n={5} /> <span style={{ fontWeight: 800 }}>Karthiga</span>
              <p style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>{t("Huge toy collection at reasonable prices — the staff patiently helped us choose.", "நியாயமான விலையில் பெரிய பொம்மை சேகரிப்பு — ஊழியர்கள் பொறுமையாக உதவினார்கள்.")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= PRODUCT MODAL ================= */
function ProductModal({ p, reviews, session, t, onClose, onAdd, onReview, onLogin }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  return (
    <Modal onClose={onClose} wide>
      <Art p={p} h={190} />
      <h3 style={{ fontSize: 24, fontWeight: 800, marginTop: 14 }}>{p.name}</h3>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: PINK }}>{inr(p.price)}</span>
        {p.mrp > p.price && <span style={{ textDecoration: "line-through", fontSize: 14, color: "#B4AABF" }}>{inr(p.mrp)}</span>}
        <Badge bg={(MILESTONES.find((m) => m.id === p.milestone) || {}).bg || "#FFE1A8"}>{(MILESTONES.find((m) => m.id === p.milestone) || {}).short_en}</Badge>
      </div>
      <p className="body-f" style={{ marginTop: 10, fontSize: 15, color: MUTE, lineHeight: 1.5 }}>{p.desc}</p>
      <div style={{ marginTop: 14 }}><Btn full disabled={p.stock === 0} onClick={onAdd}>{t("Add to cart", "கூடையில் சேர்")} — {inr(p.price)}</Btn></div>

      {!p.isBundle && (
        <div style={{ marginTop: 22 }}>
          <h4 style={{ fontWeight: 800, marginBottom: 8 }}>{t("Reviews", "மதிப்பாய்வு")} ({reviews.length}) ⭐</h4>
          {reviews.length === 0 && <p className="body-f" style={{ fontSize: 14, color: MUTE }}>{t("No reviews yet — be the first.", "இன்னும் மதிப்பாய்வு இல்லை.")}</p>}
          {reviews.map((r, i) => (
            <div key={i} className="body-f" style={{ ...card({ borderRadius: 14, boxShadow: "none" }), padding: 12, marginBottom: 8, fontSize: 14 }}>
              <Stars n={r.rating} /> <span style={{ fontWeight: 800 }}>{r.name}</span>
              <p style={{ marginTop: 4, color: MUTE }}>{r.text}</p>
            </div>
          ))}
          {session ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: n <= rating ? "#F59E0B" : "#D8D2E0" }}>★</button>)}
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t("Share your experience…", "அனுபவத்தைப் பகிருங்கள்…")}
                className="body-f" style={{ width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 14px", border: `2.5px solid ${INK}`, fontSize: 14, outline: "none" }} />
              <div style={{ marginTop: 8 }}><Btn small onClick={() => { if (text.trim()) { onReview({ name: session.name.split(" ")[0], rating, text: text.trim() }); setText(""); } }}>{t("Post review", "மதிப்பாய்வு இடு")}</Btn></div>
            </div>
          ) : (
            <button className="body-f" style={{ marginTop: 8, background: "none", border: "none", textDecoration: "underline", color: MUTE, fontWeight: 700, cursor: "pointer" }} onClick={onLogin}>{t("Sign in to write a review", "மதிப்பாய்வு எழுத உள்நுழையவும்")}</button>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ================= CART MODAL ================= */
function CartModal({ t, cartItems, subtotal, setQty, onClose, onCheckout }) {
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>{t("Your cart", "உங்கள் கூடை")} 🛒</h3>
      {cartItems.length === 0 && <p className="body-f" style={{ color: MUTE }}>{t("Your cart is empty.", "கூடை காலியாக உள்ளது.")}</p>}
      {cartItems.map((c) => (
        <div key={c.productId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `2px dashed #E5DBCC` }}>
          <div style={{ width: 48, flexShrink: 0 }}><Art p={c.product} h={48} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="body-f" style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.product.name}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: PINK }}>{inr(c.product.price)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setQty(c.productId, c.qty - 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: `2.5px solid ${INK}`, background: "#F2EAE0", fontWeight: 800, cursor: "pointer" }}>−</button>
            <span style={{ fontWeight: 800, width: 16, textAlign: "center" }}>{c.qty}</span>
            <button onClick={() => setQty(c.productId, Math.min(c.qty + 1, c.product.stock))} style={{ width: 28, height: 28, borderRadius: "50%", border: `2.5px solid ${INK}`, background: "#D6E8B0", fontWeight: 800, cursor: "pointer" }}>+</button>
          </div>
        </div>
      ))}
      {cartItems.length > 0 && (
        <div style={{ marginTop: 16 }} className="body-f">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{t("Subtotal", "மொத்தம்")}</span><span style={{ fontWeight: 800 }}>{inr(subtotal)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 4 }}><span>{t("Delivery", "டெலிவரி")}</span><span style={{ fontWeight: 800 }}>{subtotal > 999 ? t("Free 🎉", "இலவசம் 🎉") : inr(49)}</span></div>
          {subtotal <= 999 && <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>{t(`Add ${inr(1000 - subtotal)} more for free delivery`, `இலவச டெலிவரிக்கு மேலும் ${inr(1000 - subtotal)}`)}</div>}
          <div style={{ marginTop: 16 }}><Btn full onClick={onCheckout}>{t("Checkout", "செக் அவுட்")} →</Btn></div>
        </div>
      )}
    </Modal>
  );
}

/* ================= CHECKOUT MODAL ================= */
function CheckoutModal({ session, subtotal, coupons, t, computeTotals, onClose, onPlace, needLogin, notify }) {
  const [step, setStep] = useState("address");
  const [f, setF] = useState({ name: session?.name || "", phone: "", line: "", city: "Thoothukudi", pin: "" });
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [paying, setPaying] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone.length >= 10 && f.line && f.pin.length >= 6;
  const { delivery, discount, total } = computeTotals(coupon);
  const applyCoupon = () => {
    const c = coupons.find((x) => x.code === code.trim().toUpperCase());
    if (!c) return notify(t("Coupon not found", "கூப்பன் இல்லை"));
    if (subtotal < c.min) return notify(t(`Needs minimum ${inr(c.min)}`, `குறைந்தபட்சம் ${inr(c.min)}`));
    setCoupon(c); notify(t("Coupon applied! 🎉", "பயன்படுத்தப்பட்டது! 🎉"));
  };
  const pay = (method) => { setPaying(true); setTimeout(() => { onPlace(f, method, coupon); setPaying(false); }, 1400); };
  return (
    <Modal onClose={onClose}>
      {step === "address" && (
        <div>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>{t("Delivery details", "டெலிவரி விவரம்")} 🚚</h3>
          {!session && <div className="body-f" style={{ marginBottom: 12, fontSize: 14, padding: 12, borderRadius: 14, background: "#FFE1A8", border: `2.5px solid ${INK}` }}>{t("Ordering as guest.", "விருந்தினராக.")} <button style={{ fontWeight: 800, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }} onClick={needLogin}>{t("Sign in", "உள்நுழை")}</button></div>}
          <Field label={t("Full name", "முழு பெயர்")} value={f.name} onChange={set("name")} placeholder="Priya Raman" />
          <Field label={t("Phone (WhatsApp)", "தொலைபேசி")} value={f.phone} onChange={set("phone")} placeholder="98765 43210" />
          <Field label={t("Address", "முகவரி")} value={f.line} onChange={set("line")} placeholder={t("12, Beach Road", "12, பீச் ரோடு")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("City", "நகரம்")} value={f.city} onChange={set("city")} />
            <Field label={t("PIN code", "பின்")} value={f.pin} onChange={set("pin")} placeholder="628001" />
          </div>
          <Btn full disabled={!valid} onClick={() => setStep("pay")}>{t("Continue to payment", "பணம் செலுத்த")} →</Btn>
        </div>
      )}
      {step === "pay" && (
        <div>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{t("Payment", "பணம்")} 💳</h3>
          <div style={{ ...card({ borderRadius: 14, boxShadow: "none" }), padding: 14, marginBottom: 14 }} className="body-f">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{t("Subtotal", "மொத்தம்")}</span><span>{inr(subtotal)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 4 }}><span>{t("Delivery", "டெலிவரி")}</span><span>{delivery === 0 ? t("Free", "இலவசம்") : inr(delivery)}</span></div>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 4, color: "#7CB342" }}><span>{t("Discount", "தள்ளுபடி")} ({coupon.code})</span><span>−{inr(discount)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontWeight: 800, color: PINK, fontSize: 17 }}><span>{t("Total", "மொத்தம்")}</span><span>{inr(total)}</span></div>
          </div>
          {!coupon && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("Coupon (try WELCOME10)", "கூப்பன்")} className="body-f" style={{ flex: 1, borderRadius: 22, padding: "9px 16px", border: `2.5px solid ${INK}`, textTransform: "uppercase", outline: "none", minWidth: 0 }} />
              <Btn small bg="#E4D6FF" color={INK} onClick={applyCoupon}>{t("Apply", "பயன்படுத்து")}</Btn>
            </div>
          )}
          {paying ? (
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 40 }}>💳</div>
              <p style={{ fontWeight: 800, marginTop: 10 }}>{t("Processing via Razorpay…", "Razorpay செயலாக்கம்…")}</p>
              <p className="body-f" style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>(Demo — live keys connect at deployment)</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {[["📱", t("UPI — GPay, PhonePe, Paytm", "UPI"), "UPI / Razorpay", "#B9EBDD"],
                ["💳", t("Credit / Debit card", "கார்டு"), "Card / Razorpay", "#C7E9FF"],
                ["💵", t("Cash on delivery", "பணம் டெலிவரியில்"), "Cash on delivery", "#FFE1A8"]].map(([icon, label, method, bg]) => (
                <button key={method} onClick={() => pay(method)} style={{ ...card({ borderRadius: 16 }), padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontWeight: 800, fontFamily: "'Baloo 2',sans-serif", textAlign: "left", background: bg }}>
                  <span style={{ fontSize: 24 }}>{icon}</span><span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ================= TRACK MODAL ================= */
function TrackModal({ orders, t, onClose }) {
  const [no, setNo] = useState("");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState(undefined);
  const STAGES = ["Confirmed", "Packed", "Out for delivery", "Delivered"];
  const lookup = () => { const o = orders.find((x) => x.id.toLowerCase() === no.trim().toLowerCase() && x.phone === phone.trim()); setFound(o || null); };
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t("Track your order", "ஆர்டரைக் கண்காணி")} 📦</h3>
      <p className="body-f" style={{ fontSize: 14, color: MUTE, marginBottom: 14 }}>{t("Just your order number and phone — no login.", "ஆர்டர் எண் மற்றும் தொலைபேசி மட்டும்.")}</p>
      <Field label={t("Order number", "ஆர்டர் எண்")} value={no} onChange={(e) => setNo(e.target.value)} placeholder="RSB-1001" />
      <Field label={t("Phone", "தொலைபேசி")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
      <Btn full onClick={lookup}>{t("Track order", "கண்காணி")}</Btn>
      {found === null && <p className="body-f" style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: "#E24B4A" }}>{t("No order found. Check the number and phone used at checkout.", "ஆர்டர் இல்லை.")}</p>}
      {found && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800 }}>{found.id} · <span style={{ color: PINK }}>{inr(found.total)}</span></div>
          <div style={{ marginTop: 12 }}>
            {STAGES.map((s, i) => {
              const reached = STAGES.indexOf(found.status) >= i;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2.5px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: reached ? "#D6E8B0" : "#fff" }}>{reached ? "✓" : i + 1}</div>
                  <span className="body-f" style={{ fontWeight: reached ? 800 : 400, color: reached ? INK : MUTE }}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ================= AUTH MODAL ================= */
function AuthModal({ t, onClose, onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{mode === "login" ? t("Welcome back 👋", "வரவேற்கிறோம் 👋") : t("Create your account 🎈", "கணக்கை உருவாக்கு 🎈")}</h3>
      <p className="body-f" style={{ fontSize: 14, color: MUTE, marginBottom: 14 }}>{t("Track orders and check out faster.", "ஆர்டர்களை எளிதாகக் கண்காணிக்கவும்.")}</p>
      {mode === "signup" && <Field label={t("Your name", "உங்கள் பெயர்")} value={f.name} onChange={set("name")} placeholder="Priya Raman" />}
      <Field label={t("Email", "மின்னஞ்சல்")} type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" />
      <Field label={t("Password", "கடவுச்சொல்")} type="password" value={f.password} onChange={set("password")} placeholder="••••••" />
      <Btn full onClick={() => (mode === "login" ? onLogin(f.email, f.password) : onSignup(f.name, f.email, f.password))}>{mode === "login" ? t("Sign in", "உள்நுழை") : t("Create account", "உருவாக்கு")}</Btn>
      <button className="body-f" style={{ marginTop: 12, width: "100%", background: "none", border: "none", textDecoration: "underline", color: MUTE, fontWeight: 700, cursor: "pointer" }} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? t("New here? Create an account", "புதியவரா? கணக்கை உருவாக்கு") : t("Already have an account? Sign in", "கணக்கு உள்ளதா? உள்நுழை")}
      </button>
      <p className="body-f" style={{ marginTop: 12, fontSize: 12, textAlign: "center", color: MUTE }}>Admin demo: admin@rasi.in / rasi123</p>
    </Modal>
  );
}

/* ================= PRODUCT FORM (admin) ================= */
function ProductFormModal({ data, onClose, onSave }) {
  const [f, setF] = useState(data || { name: "", price: "", mrp: "", stock: 10, milestone: "newborn", categories: [], emoji: "🧸", bg: "#FFE1A8", desc: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleCat = (id) => setF((prev) => { const cats = prev.categories || []; return { ...prev, categories: cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id] }; });
  return (
    <Modal onClose={onClose} wide>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>{data ? "Edit product ✏️" : "Add new product ➕"}</h3>
      <Field label="Product name" value={f.name} onChange={set("name")} placeholder="Organic Cotton Onesie" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Price (₹)" type="number" value={f.price} onChange={set("price")} />
        <Field label="MRP (₹)" type="number" value={f.mrp} onChange={set("mrp")} />
        <Field label="Stock" type="number" value={f.stock} onChange={set("stock")} />
      </div>
      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: MUTE }}>Milestone (age — primary)</span>
        <select value={f.milestone} onChange={set("milestone")} style={{ marginTop: 4, width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 14px", border: `2.5px solid ${INK}`, background: PAPER, fontSize: 15, outline: "none" }}>
          {MILESTONES.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.short_en}</option>)}
        </select>
      </label>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: MUTE }}>Categories (pick one or more)</span>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const on = (f.categories || []).includes(cat.id);
            return <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)} style={on ? pill("#D6E8B0") : pill("#F2EAE0")}>{cat.emoji} {cat.en}{on ? " ✓" : ""}</button>;
          })}
        </div>
      </div>
      <Field label="Emoji (image placeholder)" value={f.emoji} onChange={set("emoji")} placeholder="🧸" />
      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: MUTE }}>Tile colour</span>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {["#FFE1A8", "#C7E9FF", "#FFCBD9", "#D6E8B0", "#E4D6FF", "#B9EBDD", "#FFD6C2", "#FBD0EA"].map((col) => (
            <button key={col} type="button" onClick={() => setF({ ...f, bg: col })} style={{ width: 34, height: 34, borderRadius: 10, background: col, border: `3px solid ${f.bg === col ? INK : "transparent"}`, cursor: "pointer", boxShadow: f.bg === col ? `2px 2px 0 ${INK}` : "none" }} />
          ))}
        </div>
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: MUTE }}>Description</span>
        <textarea value={f.desc} onChange={set("desc")} rows={3} className="body-f" style={{ marginTop: 4, width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 14px", border: `2.5px solid ${INK}`, fontSize: 15, outline: "none" }} />
      </label>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn full bg="#F2EAE0" color={INK} onClick={onClose}>Cancel</Btn>
        <Btn full onClick={() => onSave(f)}>{data ? "Save changes" : "Add product"}</Btn>
      </div>
    </Modal>
  );
}

/* ================= ADMIN VIEW ================= */
function AdminView({ t, store, products, adminTab, setAdminTab, openForm, confirmDelete, setOrderStatus, saveCustomerNote, addCoupon, deleteCoupon }) {
  const tabs = [["dashboard", "📊 Dashboard"], ["products", "📦 Products"], ["orders", "🚚 Orders"], ["customers", "👥 Customers"], ["coupons", "🏷️ Coupons"]];
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 20px 60px" }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
        {tabs.map(([id, label]) => <button key={id} onClick={() => setAdminTab(id)} style={{ whiteSpace: "nowrap", ...(adminTab === id ? pill(INK, "#fff") : pill("#F2EAE0")) }}>{label}</button>)}
      </div>

      {adminTab === "dashboard" && (() => {
        const revenue = store.orders.reduce((s, o) => s + o.total, 0);
        const customers = store.users.filter((u) => u.role === "customer").length;
        const low = products.filter((p) => p.stock <= 5);
        const cod = store.orders.filter((o) => o.payMethod === "Cash on delivery" && o.status !== "Delivered").reduce((s, o) => s + o.total, 0);
        const metrics = [["Revenue", inr(revenue), "#FFE1A8"], ["Orders", store.orders.length, "#C7E9FF"], ["Customers", customers, "#D6E8B0"], ["COD pending", inr(cod), "#FFCBD9"]];
        return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="cat-grid">
              {metrics.map(([lbl, v, bg]) => (
                <div key={lbl} style={{ ...card({ background: bg }), padding: 16 }}>
                  <div className="body-f" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#5A5268" }}>{lbl}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card(), padding: 18, marginTop: 16 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 8 }}>⚠️ Low stock</h3>
              {low.length === 0 ? <p className="body-f" style={{ fontSize: 14, color: MUTE }}>All products well stocked.</p> :
                low.map((p) => <div key={p.id} className="body-f" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "2px dashed #E5DBCC", fontSize: 14 }}><span>{p.name}</span><span style={{ fontWeight: 800, color: PINK }}>{p.stock} left</span></div>)}
            </div>
            <div style={{ ...card(), padding: 18, marginTop: 16 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Recent orders</h3>
              {store.orders.slice(0, 5).map((o) => <div key={o.id} className="body-f" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "2px dashed #E5DBCC", fontSize: 14 }}><span>{o.id} · {o.customer}</span><span style={{ fontWeight: 800 }}>{inr(o.total)}</span></div>)}
              {store.orders.length === 0 && <p className="body-f" style={{ fontSize: 14, color: MUTE }}>No orders yet.</p>}
            </div>
          </div>
        );
      })()}

      {adminTab === "products" && (
        <div>
          <Btn onClick={() => openForm(null)}>➕ Add new product</Btn>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {products.map((p) => (
              <div key={p.id} style={{ ...card(), padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 54, flexShrink: 0 }}><Art p={p} h={54} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="body-f" style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div className="body-f" style={{ fontSize: 12, color: MUTE }}>{inr(p.price)} · stock {p.stock} · {(MILESTONES.find((m) => m.id === p.milestone) || {}).short_en}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {(p.categories || []).map((cid) => <span key={cid} style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "#D6E8B0", border: `1.5px solid ${INK}` }}>{(CATEGORIES.find((c) => c.id === cid) || {}).en || cid}</span>)}
                    {(!p.categories || p.categories.length === 0) && <span style={{ fontSize: 10, fontWeight: 800, color: "#F59E0B" }}>No category set</span>}
                  </div>
                </div>
                <Btn small bg="#C7E9FF" color={INK} onClick={() => openForm(p)}>Edit</Btn>
                <Btn small bg="#E24B4A" onClick={() => confirmDelete(p)}>Delete</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === "orders" && (
        <div style={{ display: "grid", gap: 12 }}>
          {store.orders.length === 0 && <p className="body-f" style={{ color: MUTE }}>Orders will appear here.</p>}
          {store.orders.map((o) => (
            <div key={o.id} style={{ ...card(), padding: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div className="body-f"><span style={{ fontWeight: 800 }}>{o.id}</span> · {o.customer} · <span style={{ fontSize: 14, color: MUTE }}>{o.phone}</span></div>
                <div style={{ fontWeight: 800, color: PINK }}>{inr(o.total)}</div>
              </div>
              <div className="body-f" style={{ fontSize: 14, color: MUTE, marginTop: 4 }}>{o.address}</div>
              <div className="body-f" style={{ fontSize: 14, marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{o.items.map((i) => `${i.name} ×${i.qty}`).join(" · ")} <Badge bg="#FFE1A8">{o.payMethod}</Badge>{o.coupon && <Badge bg="#D6E8B0">{o.coupon}</Badge>}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {["Confirmed", "Packed", "Out for delivery", "Delivered"].map((s) => (
                  <button key={s} onClick={() => setOrderStatus(o.id, s)} style={o.status === s ? pill("#D6E8B0") : pill("#F2EAE0")}>{s}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {adminTab === "customers" && (
        <div style={{ display: "grid", gap: 12 }}>
          {store.users.filter((u) => u.role === "customer").length === 0 && <p className="body-f" style={{ color: MUTE }}>Customer accounts appear here after signups.</p>}
          {store.users.filter((u) => u.role === "customer").map((u) => {
            const uOrders = store.orders.filter((o) => o.userId === u.id);
            const spent = uOrders.reduce((s, o) => s + o.total, 0);
            return (
              <div key={u.id} style={{ ...card(), padding: 16 }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }} className="body-f">
                  <div><span style={{ fontWeight: 800 }}>{u.name}</span> <span style={{ fontSize: 14, color: MUTE }}>· {u.email}</span></div>
                  <div style={{ fontSize: 14 }}>{uOrders.length} orders · <span style={{ fontWeight: 800, color: PINK }}>{inr(spent)}</span></div>
                </div>
                <textarea defaultValue={u.notes} placeholder="CRM notes — baby due Aug, prefers Tamil, WhatsApp only…" onBlur={(e) => saveCustomerNote(u.id, e.target.value)}
                  className="body-f" style={{ marginTop: 8, width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 14px", border: `2.5px solid ${INK}`, fontSize: 14, outline: "none" }} rows={2} />
              </div>
            );
          })}
        </div>
      )}

      {adminTab === "coupons" && <CouponsTab coupons={store.coupons} onAdd={addCoupon} onDelete={deleteCoupon} />}
    </div>
  );
}

function CouponsTab({ coupons, onAdd, onDelete }) {
  const [f, setF] = useState({ code: "", type: "percent", value: "", min: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div>
      <div style={{ ...card(), padding: 16 }}>
        <h3 style={{ fontWeight: 800, marginBottom: 12 }}>Create coupon 🏷️</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="cat-grid">
          <Field label="Code" value={f.code} onChange={set("code")} placeholder="DIWALI15" />
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: MUTE }}>Type</span>
            <select value={f.type} onChange={set("type")} style={{ marginTop: 4, width: "100%", boxSizing: "border-box", borderRadius: 14, padding: "10px 14px", border: `2.5px solid ${INK}`, background: PAPER, fontSize: 15, outline: "none" }}>
              <option value="percent">% off</option><option value="flat">₹ flat off</option>
            </select>
          </label>
          <Field label="Value" type="number" value={f.value} onChange={set("value")} placeholder="15" />
          <Field label="Min order (₹)" type="number" value={f.min} onChange={set("min")} placeholder="499" />
        </div>
        <Btn small onClick={() => { onAdd(f); setF({ code: "", type: "percent", value: "", min: "" }); }}>Add coupon</Btn>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {coupons.map((c) => (
          <div key={c.code} style={{ ...card(), padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="body-f"><span style={{ fontWeight: 800 }}>{c.code}</span> <span style={{ fontSize: 14, color: MUTE, marginLeft: 8 }}>{c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} off`} · min {inr(c.min)}</span></div>
            <Btn small bg="#E24B4A" onClick={() => onDelete(c.code)}>Delete</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}
