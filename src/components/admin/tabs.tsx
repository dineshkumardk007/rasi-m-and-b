"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Coupon,
  CustomerRecord,
  DeliverySlab,
  Order,
  Product,
  ProductVariant,
  Review,
  StoreSettings,
} from "@/lib/types";
import { autoTranslateToTamil } from "@/lib/i18n/auto-translate";
import {
  CATEGORIES,
  CATEGORY_META,
  MILESTONES,
  MILESTONE_META,
  TILE_SWATCHES,
  getAllCategories,
  inr,
  type Category,
  type Milestone,
} from "@/lib/constants";
import { Art, Badge, Btn, Card, Field, Modal, Pill, ProductImageSlider, Stars } from "@/components/ui";
import { formatPinSummary, isPinServiceable, parsePinInput } from "@/lib/pin";
import {
  addAdminReviewAction,
  addCouponAction,
  archiveProductAction,
  deleteCouponAction,
  deleteProductImageAction,
  setCouponFeaturedAction,
  uploadProductImageAction,
  moderateReviewAction,
  resetCustomerPasswordAction,
  saveCustomerNoteAction,
  getStaffLogsAction,
  updateProductStockAction,
  updateSettingsAction,
  upsertProductAction,
} from "@/app/admin/actions";

/* ── Products CRUD (archive-not-delete, tile colour picker) ──────────────── */
export function ProductsTab({ products, settings }: { products: Product[]; settings: StoreSettings }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [confirmArchive, setConfirmArchive] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [stockUpdating, setStockUpdating] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  /* ── merged built-in + custom categories ───────────────── */
  const { slugs: allCatSlugs, meta: allCatMeta } = useMemo(
    () => getAllCategories(settings.custom_categories),
    [settings.custom_categories],
  );

  /* ── custom category manager state ─────────────────────── */
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatEn, setNewCatEn] = useState("");
  const [newCatTa, setNewCatTa] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📦");
  const [newCatBg, setNewCatBg] = useState("#E4D6FF");
  const [newCatPop, setNewCatPop] = useState("#9A6BE0");

  const [bulkCategory, setBulkCategory] = useState<string>("all");
  const [bulkAction, setBulkAction] = useState<"discount" | "increase" | "decrease">("discount");
  const [bulkPercent, setBulkPercent] = useState<number>(10);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const active = useMemo(() => {
    return products.filter((p) => {
      if (p.status === "archived") return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = p.name_en.toLowerCase().includes(q) || p.name_ta.includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        if (!matchName && !matchBrand) return false;
      }
      if (catFilter !== "all" && !p.categories.includes(catFilter as Category)) return false;
      if (stockFilter === "low" && (p.stock > p.low_stock_threshold || p.stock === 0)) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      return true;
    });
  }, [products, search, catFilter, stockFilter]);

  const archived = products.filter((p) => p.status === "archived");

  const handleStockDelta = async (productId: string, delta: number) => {
    setStockUpdating(productId);
    await updateProductStockAction(productId, delta);
    setStockUpdating(null);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setEditing("new")}>➕ Add New Product</Btn>
          <Btn small bg="#E4D6FF" color="#2B2140" onClick={() => setShowCatManager((v) => !v)}>📂 {showCatManager ? "Hide" : "Manage"} Categories</Btn>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name/brand..."
            className="rounded-pill border-2.5 border-ink bg-white px-3.5 py-1.5 text-[13px] outline-none shadow-hard-2 focus:border-brand min-w-[220px]"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-pill border-2.5 border-ink bg-white px-3 py-1.5 text-[13px] font-extrabold outline-none shadow-hard-2"
          >
            <option value="all">All Categories</option>
            {allCatSlugs.map((c) => (
              <option key={c} value={c}>
                {allCatMeta[c]?.emoji} {allCatMeta[c]?.en}
              </option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as "all" | "low" | "out")}
            className="rounded-pill border-2.5 border-ink bg-white px-3 py-1.5 text-[13px] font-extrabold outline-none shadow-hard-2"
          >
            <option value="all">All Stock Status</option>
            <option value="low">⚠️ Low Stock (&lt; 5)</option>
            <option value="out">🔴 Out of Stock</option>
          </select>
        </div>
      </div>

      {/* ── Dynamic Category Manager ────────────────────────────── */}
      {showCatManager && (
        <Card className="mb-4 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
            <div className="font-display text-[15px] font-extrabold text-ink">
              📂 Category Manager
            </div>
            <span className="text-[12px] text-mute">Built-in categories (8) + your custom ones. Products can use any of these.</span>
          </div>

          {catError && (
            <div className="rounded-tile border-2 border-ink bg-[#FFCBD9] p-2 text-[12px] font-bold text-ink">
              ⚠️ {catError}
            </div>
          )}

          {/* existing categories */}
          <div className="flex flex-wrap gap-2">
            {allCatSlugs.map((slug) => {
              const m = allCatMeta[slug];
              const isBuiltIn = (CATEGORIES as readonly string[]).includes(slug);
              return (
                <div key={slug} className="flex items-center gap-1 rounded-pill border-2 border-ink px-2.5 py-1" style={{ background: m?.bg }}>
                  <span className="text-[13px] font-extrabold">{m?.emoji} {m?.en}</span>
                  {m?.ta && <span className="text-[11px] text-mute">({m.ta})</span>}
                  {isBuiltIn ? (
                    <span className="text-[10px] text-mute ml-1">built-in</span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setCatError(null);
                        const updated = (settings.custom_categories ?? []).filter((cc) => cc.slug !== slug);
                        const res = await updateSettingsAction({ custom_categories: updated });
                        if (!res.ok) { setCatError(res.error ?? "Failed to save. Please try again."); return; }
                        router.refresh();
                      }}
                      className="ml-1 text-[12px] font-extrabold text-[#E24B4A] hover:scale-110 cursor-pointer"
                      title="Remove custom category"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* add new category */}
          <div className="rounded-tile border-2 border-dashed border-ink/20 bg-cream p-3">
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">➕ Add New Category</span>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex-1 min-w-[100px]">
                <span className="text-[11px] font-bold text-mute">Slug (lowercase)</span>
                <input value={newCatSlug} onChange={(e) => setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} placeholder="bedding" className="mt-1 w-full rounded-pill border-2 border-ink px-3 py-1.5 text-[13px] outline-none" />
              </label>
              <label className="flex-1 min-w-[100px]">
                <span className="text-[11px] font-bold text-mute">English Name</span>
                <input value={newCatEn} onChange={(e) => setNewCatEn(e.target.value)} placeholder="Bedding & Nursery" className="mt-1 w-full rounded-pill border-2 border-ink px-3 py-1.5 text-[13px] outline-none" />
              </label>
              <label className="flex-1 min-w-[100px]">
                <span className="text-[11px] font-bold text-mute">Tamil Name</span>
                <input value={newCatTa} onChange={(e) => setNewCatTa(e.target.value)} placeholder="படுக்கை" className="mt-1 w-full rounded-pill border-2 border-ink px-3 py-1.5 text-[13px] outline-none" />
              </label>
              <label className="w-[70px]">
                <span className="text-[11px] font-bold text-mute">Emoji</span>
                <input value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} className="mt-1 w-full rounded-pill border-2 border-ink px-3 py-1.5 text-[13px] outline-none text-center" />
              </label>
              <label className="w-[80px]">
                <span className="text-[11px] font-bold text-mute">Bg Color</span>
                <input type="color" value={newCatBg} onChange={(e) => setNewCatBg(e.target.value)} className="mt-1 h-[34px] w-full rounded-pill border-2 border-ink cursor-pointer" />
              </label>
              <label className="w-[80px]">
                <span className="text-[11px] font-bold text-mute">Pop Color</span>
                <input type="color" value={newCatPop} onChange={(e) => setNewCatPop(e.target.value)} className="mt-1 h-[34px] w-full rounded-pill border-2 border-ink cursor-pointer" />
              </label>
              <Btn
                small
                bg="#D6E8B0"
                color="#2B2140"
                onClick={async () => {
                  if (!newCatSlug || !newCatEn) return;
                  if (allCatSlugs.includes(newCatSlug)) return;
                  setCatError(null);
                  const updated = [
                    ...(settings.custom_categories ?? []),
                    { slug: newCatSlug, en: newCatEn, ta: newCatTa || newCatEn, emoji: newCatEmoji, bg: newCatBg, pop: newCatPop },
                  ];
                  const res = await updateSettingsAction({ custom_categories: updated });
                  if (!res.ok) { setCatError(res.error ?? "Failed to save. Please try again."); return; }
                  setNewCatSlug(""); setNewCatEn(""); setNewCatTa(""); setNewCatEmoji("📦");
                  router.refresh();
                }}
              >
                ✅ Add Category
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Category Price Modifier Tool */}
      <Card className="mt-3 mb-4 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
          <div className="font-display text-[15px] font-extrabold text-ink">
            🏷️ Bulk Category Price & Discount Modifier Tool
          </div>
          <span className="text-[12px] text-mute">Apply 1-click sales discounts or price adjustments across categories.</span>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <label className="min-w-[140px] flex-1">
            <span className="text-[11px] font-extrabold uppercase text-mute">Target Category</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="mt-1 w-full rounded-pill border-2 border-ink bg-white px-3 py-1.5 text-[13px] font-bold outline-none"
            >
              <option value="all">All Categories ({products.filter(p => p.status !== "archived").length} items)</option>
              {allCatSlugs.map((c) => (
                <option key={c} value={c}>
                  {allCatMeta[c]?.emoji} {allCatMeta[c]?.en}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-[120px] flex-1">
            <span className="text-[11px] font-extrabold uppercase text-mute">Action Mode</span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as "discount" | "increase" | "decrease")}
              className="mt-1 w-full rounded-pill border-2 border-ink bg-white px-3 py-1.5 text-[13px] font-bold outline-none"
            >
              <option value="discount">🏷️ Apply Discount (% OFF)</option>
              <option value="increase">📈 Increase Prices (% UP)</option>
              <option value="decrease">📉 Decrease Prices (% DOWN)</option>
            </select>
          </label>

          <label className="w-[100px]">
            <span className="text-[11px] font-extrabold uppercase text-mute">Percentage (%)</span>
            <input
              type="number"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(Number(e.target.value))}
              className="mt-1 w-full rounded-pill border-2 border-ink px-3 py-1.5 text-[13px] font-bold outline-none"
            />
          </label>

          <Btn
            small
            bg="#D6E8B0"
            color="#2B2140"
            disabled={bulkProcessing}
            onClick={async () => {
              if (bulkPercent <= 0) return;
              setBulkProcessing(true);
              const targets = products.filter((p) => {
                if (p.status === "archived") return false;
                if (bulkCategory !== "all" && !p.categories.includes(bulkCategory as Category)) return false;
                return true;
              });

              for (const p of targets) {
                let newPrice = p.price;
                if (bulkAction === "discount" || bulkAction === "decrease") {
                  newPrice = Math.max(1, Math.round(p.price * (1 - bulkPercent / 100)));
                } else if (bulkAction === "increase") {
                  newPrice = Math.round(p.price * (1 + bulkPercent / 100));
                }
                await upsertProductAction({
                  id: p.id,
                  name_en: p.name_en,
                  name_ta: p.name_ta,
                  brand: p.brand,
                  milestone: p.milestone,
                  categories: p.categories,
                  price: newPrice,
                  mrp: Math.max(p.mrp, newPrice),
                  stock: p.stock,
                  tile_color: p.tile_color,
                  emoji: p.emoji,
                  description_en: p.description_en,
                  description_ta: p.description_ta,
                  images: p.images,
                  size_chart_type: p.size_chart_type,
                  variants: p.variants,
                });
              }
              setBulkProcessing(false);
              router.refresh();
            }}
          >
            {bulkProcessing ? "Applying..." : "⚡ Apply Bulk Price Modifier"}
          </Btn>
        </div>
      </Card>

      <div className="mt-4 grid gap-3">
        {active.map((p) => {
          const isLow = p.stock > 0 && p.stock <= p.low_stock_threshold;
          const isOut = p.stock === 0;

          return (
            <Card key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-[54px] shrink-0">
                  <Art emoji={p.emoji} bg={p.tile_color} h={54} image={p.images[0]} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{p.name_en}</span>
                    {isOut ? (
                      <span className="rounded-full bg-[#FFCBD9] px-2 py-0.5 text-[10px] font-extrabold text-[#E24B4A]">
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="rounded-full bg-[#FFE1A8] px-2 py-0.5 text-[10px] font-extrabold text-[#946800]">
                        Low Stock ({p.stock} left)
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#D6E8B0] px-2 py-0.5 text-[10px] font-extrabold text-[#386B00]">
                        In Stock ({p.stock})
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-mute">
                    {inr(p.price)} {p.mrp > p.price && <span className="line-through text-mute">{inr(p.mrp)}</span>} · Brand: {p.brand || "Rasi"} · {MILESTONE_META[p.milestone].shortEn}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-[10px] border-[1.5px] border-ink bg-[#D6E8B0] px-2 py-[2px] text-[10px] font-extrabold"
                      >
                        {allCatMeta[c]?.en ?? c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Stock Controls & Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-[#E5DBCC]">
                <div className="flex items-center rounded-pill border-2 border-ink bg-paper px-2 py-1 gap-1">
                  <span className="text-[11px] font-extrabold uppercase text-mute mr-1">Stock:</span>
                  <button
                    type="button"
                    disabled={stockUpdating === p.id || p.stock === 0}
                    onClick={() => handleStockDelta(p.id, -1)}
                    className="h-6 w-6 rounded-full border border-ink bg-white font-extrabold text-[12px] hover:bg-[#FFCBD9] disabled:opacity-40 cursor-pointer"
                    title="Decrease stock by 1"
                  >
                    -1
                  </button>
                  <span className="w-7 text-center font-display text-[14px] font-extrabold">{p.stock}</span>
                  <button
                    type="button"
                    disabled={stockUpdating === p.id}
                    onClick={() => handleStockDelta(p.id, 5)}
                    className="h-6 px-1.5 rounded-full border border-ink bg-white font-extrabold text-[11px] hover:bg-[#D6E8B0] disabled:opacity-40 cursor-pointer"
                    title="Add 5 items to stock"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    disabled={stockUpdating === p.id}
                    onClick={() => handleStockDelta(p.id, 10)}
                    className="h-6 px-1.5 rounded-full border border-ink bg-white font-extrabold text-[11px] hover:bg-[#D6E8B0] disabled:opacity-40 cursor-pointer"
                    title="Add 10 items to stock"
                  >
                    +10
                  </button>
                </div>

                <Btn small bg="#C7E9FF" color="#2B2140" onClick={() => setEditing(p)}>
                  Edit ✏️
                </Btn>
                <Btn small bg="#FFCBD9" color="#2B2140" onClick={() => setConfirmArchive(p)}>
                  Archive 📦
                </Btn>
              </div>
            </Card>
          );
        })}
        {active.length === 0 && (
          <div className="rounded-modal border-2.5 border-dashed border-ink bg-paper p-8 text-center text-mute font-extrabold">
            No products match your current search/filter.
          </div>
        )}
        {archived.length > 0 && (
          <p className="mt-2 text-[12px] text-mute">
            {archived.length} archived product(s) — hidden from the store, kept for past order records.
          </p>
        )}
      </div>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          settings={settings}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {confirmArchive && (
        <Modal onClose={() => setConfirmArchive(null)}>
          <h3 className="font-display text-[20px] font-extrabold">
            Archive “{confirmArchive.name_en}”?
          </h3>
          <p className="mt-2 text-[14px] text-mute">
            It disappears from the store but stays in past orders and reports. You can’t
            delete products — only archive them.
          </p>
          <div className="mt-4 flex gap-2.5">
            <Btn full bg="#F2EAE0" color="#2B2140" onClick={() => setConfirmArchive(null)}>
              Keep it
            </Btn>
            <Btn
              full
              bg="#E24B4A"
              onClick={async () => {
                await archiveProductAction(confirmArchive.id);
                setConfirmArchive(null);
                router.refresh();
              }}
            >
              Archive
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductForm({
  product,
  settings,
  onClose,
  onSaved,
}: {
  product: Product | null;
  settings: StoreSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { slugs: formCatSlugs, meta: formCatMeta } = useMemo(
    () => getAllCategories(settings.custom_categories),
    [settings.custom_categories],
  );
  const [f, setF] = useState({
    name_en: product?.name_en ?? "",
    name_ta: product?.name_ta ?? "",
    brand: product?.brand ?? "",
    price: product?.price?.toString() ?? "",
    mrp: product?.mrp?.toString() ?? "",
    gst_rate: product?.gst_rate?.toString() ?? "12",
    stock: product?.stock?.toString() ?? "10",
    milestone: (product?.milestone ?? "newborn") as Milestone,
    categories: (product?.categories ?? []) as Category[],
    emoji: product?.emoji ?? "🧸",
    tile_color: product?.tile_color ?? "#FFE1A8",
    description_en: product?.description_en ?? "",
    description_ta: product?.description_ta ?? "",
    images: product?.images ?? [],
    size_chart_type: product?.size_chart_type ?? "none",
    variants: product?.variants ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const toggleCat = (c: Category) =>
    setF((prev) => ({
      ...prev,
      categories: prev.categories.includes(c)
        ? prev.categories.filter((x) => x !== c)
        : [...prev.categories, c],
    }));

  const save = async () => {
    if (!f.name_en || !f.price || f.categories.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const id = await upsertProductAction({
      id: product?.id,
      name_en: f.name_en,
      name_ta: f.name_ta,
      brand: f.brand,
      milestone: f.milestone,
      categories: f.categories,
      price: Number(f.price),
      mrp: Number(f.mrp) || Number(f.price),
      gst_rate: Number(f.gst_rate) || 12,
      stock: Number(f.stock) || 0,
      tile_color: f.tile_color,
      emoji: f.emoji,
      description_en: f.description_en,
      description_ta: f.description_ta,
      images: f.images,
      size_chart_type: f.size_chart_type as Product["size_chart_type"],
      variants: f.variants,
    });
    // upsertProduct returns null when the database rejects the row. Closing the
    // form regardless made a failed save look like a successful one.
    if (!id) {
      setSaving(false);
      setSaveError("Could not save this product. Check the fields and try again.");
      return;
    }
    onSaved();
  };

  return (
    <Modal onClose={onClose} wide>
      <h3 className="mb-3.5 font-display text-[24px] font-extrabold">
        {product ? "Edit product ✏️" : "Add new product ➕"}
      </h3>
      <Field
        label="Product name (English)"
        value={f.name_en}
        onChange={(v) => {
          const autoTa = autoTranslateToTamil(v);
          setF((prev) => ({
            ...prev,
            name_en: v,
            name_ta: autoTa,
          }));
        }}
        placeholder="Organic Cotton Onesie"
      />
      <Field label="Product name (Tamil)" value={f.name_ta} onChange={(v) => setF({ ...f, name_ta: v })} placeholder="ஆர்கானிக் பருத்தி உடை" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="Brand" value={f.brand} onChange={(v) => setF({ ...f, brand: v })} placeholder="Sebamed" />
        <Field label="Price (₹)" type="number" inputMode="numeric" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
        <Field label="MRP (₹)" type="number" inputMode="numeric" value={f.mrp} onChange={(v) => setF({ ...f, mrp: v })} />
        <div>
          <label className="block text-[12px] font-extrabold uppercase text-mute mb-1">GST Tax Rate</label>
          <select
            value={f.gst_rate}
            onChange={(e) => setF({ ...f, gst_rate: e.target.value })}
            className="w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2 text-[14px] font-bold outline-none"
          >
            <option value="5">5% (Clothing, Swaddles)</option>
            <option value="12">12% (Diapers, Bottles, Toys)</option>
            <option value="18">18% (Skincare, Lotions)</option>
            <option value="0">0% (Books / Exempt)</option>
            <option value="28">28% (Luxury items)</option>
          </select>
        </div>
        <Field label="Stock" type="number" inputMode="numeric" value={f.stock} onChange={(v) => setF({ ...f, stock: v })} />
      </div>
      <label className="mb-3 block">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          Milestone (age — primary)
        </span>
        <select
          value={f.milestone}
          onChange={(e) => setF({ ...f, milestone: e.target.value as Milestone })}
          className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] outline-none"
        >
          {MILESTONES.map((m) => (
            <option key={m} value={m}>
              {MILESTONE_META[m].emoji} {MILESTONE_META[m].shortEn}
            </option>
          ))}
        </select>
      </label>
      <div className="mb-3">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          Categories (pick one or more)
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {formCatSlugs.map((c) => {
            const on = f.categories.includes(c as Category);
            return (
              <Pill key={c} bg={on ? "#D6E8B0" : "#F2EAE0"} onClick={() => toggleCat(c as Category)}>
                {formCatMeta[c]?.emoji} {formCatMeta[c]?.en}
                {on ? " ✓" : ""}
              </Pill>
            );
          })}
        </div>
      </div>
      <Field label="Emoji (image placeholder)" value={f.emoji} onChange={(v) => setF({ ...f, emoji: v })} placeholder="🧸" />
      <div className="mb-3">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          Tile colour
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TILE_SWATCHES.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setF({ ...f, tile_color: col })}
              style={{
                background: col,
                border: `3px solid ${f.tile_color === col ? "#2B2140" : "transparent"}`,
                boxShadow: f.tile_color === col ? "2px 2px 0 #2B2140" : "none",
              }}
              className="h-[34px] w-[34px] rounded-[10px]"
              aria-label={`Tile colour ${col}`}
            />
          ))}
        </div>
      </div>
      <label className="mb-3 block">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          Description (English)
        </span>
        <textarea
          value={f.description_en}
          onChange={(e) => setF({ ...f, description_en: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[15px] outline-none"
        />
      </label>
      <label className="mb-3 block">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          Size Chart Guide
        </span>
        <select
          value={f.size_chart_type ?? "none"}
          onChange={(e) => setF({ ...f, size_chart_type: e.target.value as NonNullable<Product["size_chart_type"]> })}
          className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] outline-none"
        >
          <option value="none">None</option>
          <option value="diaper">🧷 Diaper Weight Guide (NB, S, M, L, XL)</option>
          <option value="clothing">👕 Baby Clothing Age Guide (0-3m, 3-6m...)</option>
          <option value="shoes">👟 Footwear Guide</option>
        </select>
      </label>

      {/* Product Variants UI */}
      <div className="mb-4 rounded-tile border-2 border-dashed border-ink/20 bg-cream p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-[13px] font-extrabold text-ink uppercase">
            📦 Product Variants (Sizes / Packs / Options)
          </span>
          <button
            type="button"
            onClick={() =>
              setF((prev) => ({
                ...prev,
                variants: [
                  ...prev.variants,
                  {
                    id: `v-${Date.now()}`,
                    name_en: "New Variant",
                    name_ta: "புதிய அளவு",
                    price: Number(f.price) || 100,
                    stock: 10,
                  },
                ],
              }))
            }
            className="rounded-pill border-2 border-ink bg-brand px-2.5 py-0.5 text-[12px] font-extrabold text-white shadow-hard-1"
          >
            + Add Variant
          </button>
        </div>
        {f.variants.length === 0 ? (
          <p className="text-[12px] text-mute italic">No variants added. Product will sell as a single standard SKU.</p>
        ) : (
          <div className="grid gap-2">
            {f.variants.map((v, idx) => (
              <div key={v.id || idx} className="flex flex-wrap items-center gap-2 rounded-tile border border-ink/30 bg-white p-2 text-[13px]">
                <input
                  type="text"
                  placeholder="Name (EN)"
                  value={v.name_en}
                  onChange={(e) => {
                    const valEn = e.target.value;
                    const autoTa = autoTranslateToTamil(valEn);
                    const next = [...f.variants];
                    const target = next[idx];
                    if (target) {
                      next[idx] = {
                        ...target,
                        name_en: valEn,
                        name_ta: autoTa,
                      } as ProductVariant;
                      setF({ ...f, variants: next });
                    }
                  }}
                  className="min-w-[110px] flex-1 rounded-pill border border-ink px-2 py-1 outline-none font-bold"
                />
                <input
                  type="text"
                  placeholder="Name (TA)"
                  value={v.name_ta}
                  onChange={(e) => {
                    const next = [...f.variants];
                    const target = next[idx];
                    if (target) {
                      next[idx] = { ...target, name_ta: e.target.value } as ProductVariant;
                      setF({ ...f, variants: next });
                    }
                  }}
                  className="min-w-[110px] flex-1 rounded-pill border border-ink px-2 py-1 outline-none bg-paper font-bold text-brand"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={v.price ?? f.price}
                  onChange={(e) => {
                    const next = [...f.variants];
                    next[idx] = { ...next[idx], price: Number(e.target.value) } as ProductVariant;
                    setF({ ...f, variants: next });
                  }}
                  className="w-[80px] rounded-pill border border-ink px-2 py-1 outline-none"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => {
                    const next = [...f.variants];
                    next[idx] = { ...next[idx], stock: Number(e.target.value) } as ProductVariant;
                    setF({ ...f, variants: next });
                  }}
                  className="w-[70px] rounded-pill border border-ink px-2 py-1 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setF((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));
                  }}
                  className="text-[#E24B4A] font-extrabold text-[14px] px-1 hover:scale-110"
                  title="Remove variant"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductImages
        images={f.images}
        slugHint={f.name_en || product?.slug || "product"}
        tileColor={f.tile_color}
        onChange={(images) => setF({ ...f, images })}
      />
      {product && (
        <p className="mb-3 text-[12px] text-mute">
          Shareable link:{" "}
          <a
            href={`/p/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-ink underline"
          >
            /p/{product.slug}
          </a>
        </p>
      )}

      {saveError && (
        <p className="mb-3 text-[13px] font-bold text-[#E24B4A]">{saveError}</p>
      )}

      <div className="flex gap-2.5">
        <Btn full bg="#F2EAE0" color="#2B2140" onClick={onClose}>
          Cancel
        </Btn>
        <Btn full disabled={saving} onClick={save}>
          {product ? "Save changes" : "Add product"}
        </Btn>
      </div>
    </Modal>
  );
}

/**
 * Product photo manager. Pick a file and the server fits it to both storefront
 * boxes automatically — there is deliberately no crop or resize control here,
 * because a photo that needed manual adjustment would be one the pipeline got
 * wrong, and the fix belongs in lib/image-pipeline.ts rather than in an admin's
 * hands at 11pm.
 *
 * Uploads land in Supabase Storage immediately and the URL is kept in form
 * state — nothing is attached to the product until the form is saved, so
 * cancelling leaves orphan objects rather than a half-saved product. The first
 * image is what the storefront tiles and the modal banner show, which is why
 * both of its renditions are previewed at their true aspect ratios below.
 */
function ProductImages({
  images,
  slugHint,
  tileColor,
  onChange,
}: {
  images: string[];
  slugHint: string;
  /** Padded around the product wherever its shape doesn't fill the box. */
  tileColor: string;
  onChange: (images: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slugHint);
      fd.append("tileColor", tileColor);
      const res = await uploadProductImageAction(fd);
      if (res.ok) uploaded.push(res.url);
      else setError(res.error); // keep going; report the last failure
    }
    if (uploaded.length) onChange([...images, ...uploaded]);
    setBusy(false);
  };

  const remove = async (url: string) => {
    onChange(images.filter((u) => u !== url));
    await deleteProductImageAction(url);
  };

  const makeMain = (url: string) => onChange([url, ...images.filter((u) => u !== url)]);

  const moveLeft = (i: number) => {
    if (i <= 0 || i >= images.length) return;
    const next = [...images];
    const curr = next[i];
    const prev = next[i - 1];
    if (curr !== undefined && prev !== undefined) {
      next[i - 1] = curr;
      next[i] = prev;
      onChange(next);
    }
  };

  const moveRight = (i: number) => {
    if (i < 0 || i >= images.length - 1) return;
    const next = [...images];
    const curr = next[i];
    const nxt = next[i + 1];
    if (curr !== undefined && nxt !== undefined) {
      next[i + 1] = curr;
      next[i] = nxt;
      onChange(next);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          📷 Product Photos & Auto-Slideshow Gallery
        </span>
        {images.length > 0 && (
          <span className="text-[11px] font-bold text-brand bg-[#FFE1A8] px-2 py-0.5 rounded-full border border-ink">
            {images.length} Photo{images.length > 1 ? "s" : ""} Uploaded
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2.5 rounded-tile border-2 border-ink bg-cream p-3">
          <p className="text-[12px] font-extrabold text-ink mb-1.5 flex items-center gap-1.5">
            <span>✨ Customer Auto-Slideshow Live Preview</span>
            <span className="text-[10px] bg-brand text-white px-2 py-0.2 rounded-full font-bold">Auto-Slides every 3.5s</span>
          </p>
          <ProductImageSlider images={images} emoji="🧸" bg={tileColor} ratio="banner" />
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-mute mb-1">
            Uploaded Photos (Photo #1 is MAIN static photo, #2+ auto-slide on click)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((url, i) => (
              <div key={url} className="rounded-tile border-2.5 border-ink bg-white p-2 shadow-hard-2">
                <div className="relative aspect-[5/3] w-full overflow-hidden rounded-tile border border-ink/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-ink bg-white text-[11px] font-extrabold shadow-sm hover:bg-[#FFCBD9]"
                  >
                    ✕
                  </button>
                  <span
                    className={`absolute bottom-1 left-1 rounded-xl border border-ink px-1.5 py-[1px] text-[9px] font-extrabold ${i === 0 ? "bg-brand text-white" : "bg-[#FFE1A8] text-ink"
                      }`}
                  >
                    {i === 0 ? "1. MAIN (STATIC)" : `${i + 1}. SLIDE`}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveLeft(i)}
                      className="px-1.5 py-0.5 rounded border border-ink bg-paper font-bold hover:bg-[#D6E8B0] disabled:opacity-30 cursor-pointer"
                      title="Move left"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={i === images.length - 1}
                      onClick={() => moveRight(i)}
                      className="px-1.5 py-0.5 rounded border border-ink bg-paper font-bold hover:bg-[#D6E8B0] disabled:opacity-30 cursor-pointer"
                      title="Move right"
                    >
                      ▶
                    </button>
                  </div>
                  {i !== 0 ? (
                    <button
                      type="button"
                      onClick={() => makeMain(url)}
                      className="font-extrabold text-brand underline text-[10px]"
                    >
                      Make Main
                    </button>
                  ) : (
                    <span className="text-[10px] font-extrabold text-mute">Main Photo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-tile border-2.5 border-dashed border-ink bg-paper px-4 py-3 font-display text-[13px] font-extrabold hover:bg-cream transition-colors">
        {busy ? "Uploading and fitting photos…" : "📷 Upload Photos (Select multiple files)"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={busy}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = ""; // allow re-picking the same file after a remove
          }}
          className="hidden"
        />
      </label>

      {error && <p className="mt-1.5 text-[12px] font-bold text-[#E24B4A]">{error}</p>}
      {!error && (
        <p className="mt-1.5 text-[12px] text-mute leading-relaxed">
          {images.length === 0
            ? "No photo uploaded yet — storefront shows the emoji tile. "
            : ""}
          Upload multiple feature photos. The <b>1st photo</b> is fixed as the static main tile on store cards, and <b>all remaining photos</b> auto-slide with navigation arrows when customers click the product preview box or visit the details page.
        </p>
      )}
    </div>
  );
}

function formatActivityTime(dateStr?: string | null): { text: string; isToday: boolean } {
  if (!dateStr) return { text: "No activity recorded yet", isToday: false };
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return { text: `Active Today, ${time}`, isToday: true };
  }
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600));
  if (diffHours < 48) return { text: "Active Yesterday", isToday: false };
  return { text: `Active ${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`, isToday: false };
}

/* ── Customers / CRM with segments & active user tracking ─────────────────── */
export function CustomersTab({
  customers,
  orders,
}: {
  customers: CustomerRecord[];
  orders: Order[];
}) {
  const [resetTarget, setResetTarget] = useState<CustomerRecord | null>(null);
  const withStats = useMemo(() => {
    const now = Date.now();
    const rows = customers.map((c) => {
      const theirOrders = orders.filter(
        (o) => (o.address_snapshot.phone || "").replace(/\D/g, "").slice(-10) === c.phone,
      );
      const ltv = theirOrders.reduce((s, o) => s + o.total, 0);
      const lastOrderTime = theirOrders[0] ? new Date(theirOrders[0].placed_at).getTime() : 0;
      const lastLoginTime = c.last_login_at ? new Date(c.last_login_at).getTime() : lastOrderTime;
      const activity = formatActivityTime(c.last_login_at || (theirOrders[0]?.placed_at ?? c.created_at));
      return { c, theirOrders, ltv, last: lastOrderTime, lastLoginTime, activity };
    });
    const sortedByLtv = [...rows].sort((a, b) => b.ltv - a.ltv);
    const topCount = Math.max(1, Math.ceil(rows.length / 10));
    const topIds = new Set(sortedByLtv.slice(0, topCount).map((r) => r.c.id));
    return rows.map((r) => ({
      ...r,
      segment:
        r.theirOrders.length === 0
          ? "new"
          : topIds.has(r.c.id) && r.ltv > 0
            ? "top 10%"
            : now - r.last > 90 * 24 * 3600 * 1000
              ? "lapsed"
              : r.theirOrders.length > 1
                ? "repeat"
                : "new",
    }));
  }, [customers, orders]);

  const activeTodayCount = useMemo(
    () => withStats.filter((r) => r.activity.isToday).length,
    [withStats],
  );

  const segColor: Record<string, string> = {
    new: "#C7E9FF",
    repeat: "#D6E8B0",
    lapsed: "#FFD6C2",
    "top 10%": "#FFE1A8",
  };

  const [custSearch, setCustSearch] = useState("");
  const [segFilter, setSegFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return withStats.filter(({ c, segment }) => {
      if (segFilter !== "all" && segment !== segFilter) return false;
      if (custSearch) {
        const q = custSearch.toLowerCase().replace(/\D/g, "") || custSearch.toLowerCase();
        const qRaw = custSearch.toLowerCase();
        const matchPhone = c.phone.includes(q);
        const matchEmail = c.email?.toLowerCase().includes(qRaw);
        const matchName = (c.name || "").toLowerCase().includes(qRaw);
        if (!matchPhone && !matchEmail && !matchName) return false;
      }
      return true;
    });
  }, [withStats, custSearch, segFilter]);

  return (
    <div className="grid gap-3">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-1">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px]">🔍</span>
          <input
            type="text"
            value={custSearch}
            onChange={(e) => setCustSearch(e.target.value)}
            placeholder="Search by phone number, email, or name..."
            className="w-full rounded-pill border-2.5 border-ink bg-white pl-9 pr-3.5 py-2 text-[13px] outline-none shadow-hard-2 focus:border-brand"
          />
        </div>
        <select
          value={segFilter}
          onChange={(e) => setSegFilter(e.target.value)}
          className="rounded-pill border-2.5 border-ink bg-white px-3 py-2 text-[13px] font-extrabold outline-none shadow-hard-2"
        >
          <option value="all">All Segments ({withStats.length})</option>
          <option value="new">🆕 New</option>
          <option value="repeat">🔁 Repeat</option>
          <option value="lapsed">💤 Lapsed (90d+)</option>
          <option value="top 10%">⭐ Top 10%</option>
        </select>
        {activeTodayCount > 0 && (
          <Badge bg="#D6E8B0">🟢 {activeTodayCount} active today</Badge>
        )}
        <Badge bg="#F2EAE0">{filtered.length} of {withStats.length} shown</Badge>
      </div>

      {customers.length === 0 && (
        <p className="text-mute">Customer records appear after the first order or signup.</p>
      )}
      {filtered.length === 0 && customers.length > 0 && (
        <div className="rounded-modal border-2.5 border-dashed border-ink bg-paper p-8 text-center text-mute font-extrabold">
          No customers match &quot;{custSearch}&quot; {segFilter !== "all" ? `in segment "${segFilter}"` : ""}
        </div>
      )}
      {filtered.map(({ c, theirOrders, ltv, segment, activity }) => (
        <Card key={c.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-display text-[16px] font-extrabold text-ink">{c.name || "Customer"}</span>{" "}
              <span className="text-[14px] text-mute">· {c.phone}</span>{" "}
              <Badge bg={segColor[segment] ?? "#F2EAE0"}>{segment}</Badge>{" "}
              <Badge bg={activity.isToday ? "#D6E8B0" : "#F2EAE0"}>
                {activity.isToday ? `🟢 ${activity.text}` : `🕒 ${activity.text}`}
              </Badge>
              {c.login_count && c.login_count > 1 && (
                <Badge bg="#FFE1A8">🔑 {c.login_count} logins</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[14px]">
              <span>{theirOrders.length} orders · <span className="font-display font-extrabold text-brand">{inr(ltv)}</span></span>
              <Btn
                small
                bg="#D6E8B0"
                color="#2B2140"
                onClick={() => {
                  const phone = c.phone.replace(/\D/g, "");
                  const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
                  const msg = encodeURIComponent(
                    `Hi ${c.name || "there"}! 👋 Greetings from Rasi Mom & Baby (Thoothukudi)! 🛍️\n\nUse code WELCOME10 for FLAT 10% OFF on your next order! Check out our new arrival baby gear here: ${window.location.origin}`,
                  );
                  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
                }}
              >
                📱 WhatsApp Offer
              </Btn>
              <Btn small bg="#FFE1A8" color="#2B2140" onClick={() => setResetTarget(c)}>
                🔑 Reset Password
              </Btn>
            </div>
          </div>
          {c.baby_dob && (
            <div className="mt-1 text-[13px] text-mute">👶 Baby DOB: {c.baby_dob}</div>
          )}
          <NoteField customerId={c.id} initial={c.notes} />
        </Card>
      ))}

      {resetTarget && (
        <ResetPasswordModal customer={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
}

function ResetPasswordModal({ customer, onClose }: { customer: CustomerRecord; onClose: () => void }) {
  const [tempPass, setTempPass] = useState(`Rasi${Math.floor(100000 + Math.random() * 900000)}`);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleReset = async () => {
    if (!tempPass.trim() || tempPass.length < 6) return;
    setSaving(true);
    setFailed(false);
    const ok = await resetCustomerPasswordAction(customer.id, tempPass.trim());
    setSaving(false);
    if (ok) setSuccess(true);
    else setFailed(true);
  };

  const waText = encodeURIComponent(
    `Hi ${customer.name || "Customer"}, your temporary password for Rasi Mom & Baby is: ${tempPass}\n\nPlease sign in at https://rasimomandbaby.vercel.app and change your password.`,
  );
  const waUrl = `https://wa.me/91${customer.phone}?text=${waText}`;

  return (
    <Modal onClose={onClose}>
      <h3 className="font-display text-[20px] font-extrabold text-ink mb-2">
        🔑 Reset Password for {customer.name || customer.phone}
      </h3>
      <p className="text-[13px] text-mute mb-3">
        Set a temporary password. Once saved, it is hashed and updated in Supabase database immediately.
      </p>

      {!success ? (
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-extrabold uppercase text-mute mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              value={tempPass}
              onChange={(e) => setTempPass(e.target.value)}
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2 font-mono text-[15px] font-bold outline-none"
            />
          </div>
          {failed && (
            <div className="rounded-tile border-2 border-ink bg-[#FFCBD9] p-3 text-[13px] font-bold text-ink">
              ✕ Could not update the password in Supabase. Nothing was sent — try again.
            </div>
          )}
          <div className="flex gap-2">
            <Btn full bg="#F2EAE0" color="#2B2140" onClick={onClose}>
              Cancel
            </Btn>
            <Btn full disabled={saving} onClick={handleReset}>
              {saving ? "Saving…" : "Save New Password ✓"}
            </Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-tile border-2 border-ink bg-[#D6E8B0] p-3 text-[13px] font-bold text-ink">
            ✓ Password updated in Supabase database!
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press flex items-center justify-center gap-2 rounded-pill border-2.5 border-ink bg-[#25D366] px-4 py-2 font-display text-[14px] font-extrabold text-white shadow-hard-2 hover:bg-[#1EBE5D]"
          >
            <span>💬 Send Temporary Password to Customer on WhatsApp</span>
          </a>
          <Btn full bg="#F2EAE0" color="#2B2140" onClick={onClose}>
            Done
          </Btn>
        </div>
      )}
    </Modal>
  );
}

function NoteField({ customerId, initial }: { customerId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const save = async () => {
    setStatus("saving");
    const res = await saveCustomerNoteAction(customerId, value);
    setStatus(res.ok ? "idle" : "error");
  };

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && save()}
        placeholder="CRM notes — baby due Aug, prefers Tamil, WhatsApp only…"
        rows={2}
        className="mt-2 w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[14px] outline-none"
      />
      {status === "saving" && <p className="mt-1 text-[11px] text-mute">Saving…</p>}
      {status === "error" && (
        <p className="mt-1 text-[11px] font-bold text-[#E24B4A]">
          ⚠️ Failed to save — check your connection and try again.
        </p>
      )}
    </div>
  );
}

/* ── Coupons ─────────────────────────────────────────────────────────────── */
export function CouponsTab({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [f, setF] = useState({
    code: "",
    type: "percent" as "percent" | "flat",
    value: "",
    min: "",
    validUntil: "",
    usageLimit: "",
  });

  return (
    <div>
      <Card className="p-4">
        <h3 className="mb-3 font-display font-extrabold">Create coupon 🏷️</h3>
        {couponError && (
          <div className="mb-3 rounded-tile border-2 border-ink bg-[#FFCBD9] p-2.5 text-[13px] font-bold text-ink">
            ⚠️ {couponError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Code" value={f.code} onChange={(v) => setF({ ...f, code: v })} placeholder="DIWALI15" />
          <label className="mb-3 block">
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">Type</span>
            <select
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value as "percent" | "flat" })}
              className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] outline-none"
            >
              <option value="percent">% off</option>
              <option value="flat">₹ flat off</option>
            </select>
          </label>
          <Field label="Value" type="number" inputMode="numeric" value={f.value} onChange={(v) => setF({ ...f, value: v })} placeholder="15" />
          <Field label="Min order (₹)" type="number" inputMode="numeric" value={f.min} onChange={(v) => setF({ ...f, min: v })} placeholder="499" />
          {/* Both of these are enforced at redemption already; the form just
              never offered them, so every coupon was unlimited and eternal. */}
          <Field
            label="Expires on (optional)"
            type="date"
            value={f.validUntil}
            onChange={(v) => setF({ ...f, validUntil: v })}
          />
          <Field
            label="Max uses (optional)"
            type="number"
            inputMode="numeric"
            value={f.usageLimit}
            onChange={(v) => setF({ ...f, usageLimit: v })}
            placeholder="Unlimited"
          />
        </div>
        <Btn
          small
          onClick={async () => {
            if (!f.code || !f.value) return;
            setCouponError(null);
            const res = await addCouponAction({
              code: f.code,
              type: f.type,
              value: Number(f.value),
              min_order: Number(f.min) || 0,
              // End of the chosen day, so a coupon dated today works all day.
              valid_until: f.validUntil ? `${f.validUntil}T23:59:59.999Z` : null,
              usage_limit: Number(f.usageLimit) > 0 ? Number(f.usageLimit) : null,
            });
            if (!res.ok) {
              setCouponError(res.error ?? "Failed to create coupon — the code may already exist.");
              return;
            }
            setF({ code: "", type: "percent", value: "", min: "", validUntil: "", usageLimit: "" });
            router.refresh();
          }}
        >
          Add coupon
        </Btn>
      </Card>
      <div className="mt-4 grid gap-2">
        {coupons.map((c) => {
          const expired = !!c.valid_until && new Date(c.valid_until) < new Date();
          const exhausted = c.usage_limit !== null && c.used_count >= c.usage_limit;
          return (
            <Card key={c.code} className="flex items-center justify-between p-3">
              <div>
                <span className="font-display font-extrabold">{c.code}</span>{" "}
                <span className="ml-2 text-[14px] text-mute">
                  {c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} off`} · min{" "}
                  {inr(c.min_order)} · used {c.used_count}
                  {c.usage_limit !== null ? `/${c.usage_limit}` : ""}×
                  {c.valid_until
                    ? ` · till ${new Date(c.valid_until).toLocaleDateString("en-IN")}`
                    : ""}
                </span>
                {(expired || exhausted) && (
                  <span className="ml-2 rounded-pill border-2 border-ink bg-[#FFCBD9] px-2 py-0.5 text-[11px] font-extrabold">
                    {expired ? "EXPIRED" : "LIMIT REACHED"}
                  </span>
                )}
                {c.featured && (
                  <span className="ml-2 rounded-pill border-2 border-ink bg-[#FFE66D] px-2 py-0.5 text-[11px] font-extrabold">
                    ON HOME PAGE
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {/* An expired or exhausted code is never advertised, so offering
                  the toggle on one would promise something checkout refuses. */}
                {!expired && !exhausted && (
                  <Btn
                    small
                    bg={c.featured ? "#F2EAE0" : "#FFE66D"}
                    color="#2B2140"
                    onClick={async () => {
                      await setCouponFeaturedAction(c.code, !c.featured);
                      router.refresh();
                    }}
                  >
                    {c.featured ? "Unfeature" : "Feature"}
                  </Btn>
                )}
                <Btn
                  small
                  bg="#E24B4A"
                  onClick={() => setConfirmDelete(c)}
                >
                  Delete
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h3 className="font-display text-[20px] font-extrabold">
            Delete coupon “{confirmDelete.code}”?
          </h3>
          <p className="mt-2 text-[14px] text-mute">
            Customers can no longer redeem this code. This can’t be undone.
          </p>
          <div className="mt-4 flex gap-2.5">
            <Btn full bg="#F2EAE0" color="#2B2140" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Btn>
            <Btn
              full
              bg="#E24B4A"
              onClick={async () => {
                setCouponError(null);
                const res = await deleteCouponAction(confirmDelete.code);
                setConfirmDelete(null);
                if (!res.ok) {
                  setCouponError(res.error ?? "Failed to delete coupon. Please try again.");
                  return;
                }
                router.refresh();
              }}
            >
              Delete
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Review moderation queue ─────────────────────────────────────────────── */
export function ReviewsTab({ reviews, products }: { reviews: Review[]; products: Product[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");
  const productName = (id: string) => products.find((p) => p.id === id)?.name_en ?? "—";

  const decide = async (id: string, status: "approved" | "rejected") => {
    setReviewError(null);
    const res = await moderateReviewAction(id, status);
    if (!res.ok) {
      setReviewError(res.error ?? "Failed to update this review. Please try again.");
      return;
    }
    router.refresh();
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !text.trim()) return;
    setSubmitting(true);
    setReviewError(null);
    const res = await addAdminReviewAction({
      author_name: authorName.trim(),
      rating,
      text: text.trim(),
      product_id: productId,
    });
    setSubmitting(false);
    if (!res.ok) {
      setReviewError(res.error ?? "Failed to add review. Please try again.");
      return;
    }
    setAuthorName("");
    setText("");
    setShowAdd(false);
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-extrabold text-[18px]">Customer Reviews Management</h3>
        <Btn small bg="#B9EBDD" color="#2B2140" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "✕ Close Form" : "➕ Add Customer Review"}
        </Btn>
      </div>

      {reviewError && (
        <div className="rounded-tile border-2 border-ink bg-[#FFCBD9] p-2.5 text-[13px] font-bold text-ink">
          ⚠️ {reviewError}
        </div>
      )}

      {showAdd && (
        <Card className="p-4 bg-paper border-2.5 border-ink">
          <form onSubmit={handleAddReview} className="grid gap-3">
            <h4 className="font-display font-extrabold text-[15px]">Create & Approve New Review</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-extrabold text-mute uppercase mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karthiga"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full rounded-pill border border-ink px-3 py-1.5 outline-none text-[14px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-extrabold text-mute uppercase mb-1">
                  Rating (1-5 Stars)
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-pill border border-ink px-3 py-1.5 outline-none text-[14px] bg-white"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                  <option value={3}>⭐⭐⭐ (3 Stars)</option>
                  <option value={2}>⭐⭐ (2 Stars)</option>
                  <option value={1}>⭐ (1 Star)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-extrabold text-mute uppercase mb-1">
                Associated Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-pill border border-ink px-3 py-1.5 outline-none text-[14px] bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-extrabold text-mute uppercase mb-1">
                Review Text
              </label>
              <textarea
                rows={3}
                placeholder="Write customer review text here..."
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-tile border border-ink p-2.5 outline-none text-[14px]"
              />
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <Btn small bg="#FFE1A8" color="#2B2140" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "✓ Publish & Feature Review"}
              </Btn>
            </div>
          </form>
        </Card>
      )}

      <div>
        <h4 className="font-display font-extrabold text-[15px] mb-2">Pending Moderation ({pending.length})</h4>
        {pending.length === 0 && <p className="text-[14px] text-mute">Queue is clear ✨</p>}
        {pending.map((r) => (
          <Card key={r.id} className="p-4 mb-2">
            <div className="text-[13px] text-mute">{productName(r.product_id)}</div>
            <div className="mt-1">
              <Stars n={r.rating} />{" "}
              <span className="font-display font-extrabold">{r.author_name}</span>
            </div>
            <p className="mt-1 text-[14px] text-mute">{r.text}</p>
            <div className="mt-3 flex gap-2">
              <Btn small bg="#D6E8B0" color="#2B2140" onClick={() => decide(r.id, "approved")}>
                ✓ Approve
              </Btn>
              <Btn small bg="#FFCBD9" color="#2B2140" onClick={() => decide(r.id, "rejected")}>
                ✕ Reject
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {rest.length > 0 && (
        <div>
          <h4 className="font-display font-extrabold text-[15px] mb-2">Moderated & Approved ({rest.length})</h4>
          <div className="grid gap-2">
            {rest.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-3 text-[14px]">
                <div className="min-w-0">
                  <Stars n={r.rating} /> <b>{r.author_name}</b>{" "}
                  <span className="text-mute">— &ldquo;{r.text}&rdquo;</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge bg={r.status === "approved" ? "#D6E8B0" : "#FFCBD9"}>{r.status}</Badge>
                  {r.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => decide(r.id, "rejected")}
                      className="text-[12px] font-bold text-brand hover:underline cursor-pointer"
                    >
                      Hide
                    </button>
                  )}
                  {r.status === "rejected" && (
                    <button
                      type="button"
                      onClick={() => decide(r.id, "approved")}
                      className="text-[12px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analytics & Revenue Dashboard ────────────────────────────────────────── */
export function AnalyticsTab({
  orders,
  products,
  customers,
}: {
  orders: Order[];
  products: Product[];
  customers: CustomerRecord[];
}) {
  const router = useRouter();
  const [restocking, setRestocking] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = activeOrders.length;
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const activeCustomersCount = customers.length || new Set(orders.map((o) => o.customer_id)).size;

  const lowStock = products.filter(
    (p) => p.status === "active" && p.stock <= p.low_stock_threshold,
  );

  const handleRestock = async (productId: string) => {
    setRestocking(productId);
    await updateProductStockAction(productId, 10);
    setRestocking(null);
    router.refresh();
  };

  const exportOrdersToCSV = () => {
    const headers = ["Order No", "Customer Name", "Phone", "Status", "Payment Method", "Total (INR)", "Placed At"];
    const rows = orders.map((o) => [
      o.order_no,
      `"${(o.address_snapshot.name || "").replace(/"/g, '""')}"`,
      `"${o.address_snapshot.phone || ""}"`,
      o.status,
      o.payment_method,
      o.total,
      new Date(o.placed_at).toLocaleString("en-IN"),
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rasi_revenue_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Revenue Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4" style={{ background: "#FFE1A8" }}>
          <div className="font-display text-[12px] font-extrabold uppercase text-ink/70">
            💰 Total Revenue
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold text-ink">
            {inr(totalRevenue)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-ink/80">From {totalOrders} orders</div>
        </Card>
        <Card className="p-4" style={{ background: "#C7E9FF" }}>
          <div className="font-display text-[12px] font-extrabold uppercase text-ink/70">
            📦 Total Orders
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold text-ink">
            {totalOrders}
          </div>
          <div className="mt-1 text-[11px] font-bold text-ink/80">Fulfilled & active</div>
        </Card>
        <Card className="p-4" style={{ background: "#D6E8B0" }}>
          <div className="font-display text-[12px] font-extrabold uppercase text-ink/70">
            📊 Avg Order Value (AOV)
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold text-ink">
            {inr(aov)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-ink/80">Per customer checkout</div>
        </Card>
        <Card className="p-4" style={{ background: "#FBD0EA" }}>
          <div className="font-display text-[12px] font-extrabold uppercase text-ink/70">
            👥 Active Customers
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold text-ink">
            {activeCustomersCount}
          </div>
          <div className="mt-1 text-[11px] font-bold text-ink/80">Registered & repeat buyers</div>
        </Card>
      </div>

      {/* Quick Export Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div>
          <div className="font-display text-[16px] font-extrabold text-ink">
            📊 Sales Ledger & Financial Export
          </div>
          <p className="text-[13px] text-mute">Download complete store sales reports for accounting.</p>
        </div>
        <Btn small bg="#B9EBDD" color="#2B2140" onClick={exportOrdersToCSV}>
          📥 Export Orders CSV
        </Btn>
      </Card>

      {/* Low Stock Alerts */}
      <Card className="p-4">
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3 mb-3">
          <div>
            <div className="font-display text-[17px] font-extrabold text-ink">
              ⚠️ Low-Stock Automated Inventory Alerts
            </div>
            <p className="text-[13px] text-mute">
              Products below safety stock threshold requiring quick restock.
            </p>
          </div>
          <Badge bg={lowStock.length > 0 ? "#FFCBD9" : "#D6E8B0"}>
            {lowStock.length} Items Alert
          </Badge>
        </div>

        {lowStock.length === 0 ? (
          <p className="text-[13px] text-mute italic py-2">
            ✅ All active items are fully stocked above safety thresholds.
          </p>
        ) : (
          <div className="grid gap-2">
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-tile border-2 border-ink bg-white p-2.5 shadow-hard-1"
              >
                <div className="flex items-center gap-3">
                  <div className="font-display text-[20px]">{p.emoji}</div>
                  <div>
                    <div className="font-display text-[14px] font-extrabold text-ink">
                      {p.name_en}
                    </div>
                    <div className="text-[12px] font-bold text-[#E24B4A]">
                      Stock: {p.stock} units remaining (Threshold: {p.low_stock_threshold})
                    </div>
                  </div>
                </div>
                <Btn
                  small
                  bg="#D6E8B0"
                  color="#2B2140"
                  disabled={restocking === p.id}
                  onClick={() => handleRestock(p.id)}
                >
                  {restocking === p.id ? "Restocking..." : "+10 Restock"}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Reports: monthly GST breakdown for accounting ──────────────────────── */
export function ReportsTab({ orders, products }: { orders: Order[]; products: Product[] }) {
  const months = useMemo(() => {
    const set = new Set(orders.map((o) => o.placed_at.slice(0, 7)));
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return [...set].sort().reverse();
  }, [orders]);
  const [month, setMonth] = useState(months[0] ?? "");

  const [logQuery, setLogQuery] = useState("");
  const [logEntity, setLogEntity] = useState("all");
  const [logs, setLogs] = useState<{ id?: string; user_id?: string; action: string; entity: string; entity_id: string; at: string }[]>([]);

  useEffect(() => {
    getStaffLogsAction(logQuery, logEntity).then((res) => setLogs(res || []));
  }, [logQuery, logEntity]);

  const download = () => {
    const rows = orders.filter(
      (o) => o.placed_at.startsWith(month) && o.status !== "cancelled",
    );
    // Fallback to the product's current rate only for orders placed before
    // gst_rate was snapshotted per line item — every order since then uses
    // what was actually charged, so correcting a product's rate later can't
    // silently rewrite an already-filed month's report.
    const gstRateFor = (id: string | null) =>
      products.find((p) => p.id === id)?.gst_rate ?? 12;
    const header =
      "order_no,date,customer,phone,item,qty,gross,taxable,gst_rate,gst_amount,payment_method,payment_status";
    const lines = rows.flatMap((o) =>
      o.items.map((i) => {
        const rate = i.gst_rate ?? gstRateFor(i.product_id);
        const gross = i.price_snapshot * i.qty;
        const taxable = Math.round((gross * 100) / (100 + rate));
        return [
          o.order_no,
          o.placed_at.slice(0, 10),
          `"${o.address_snapshot.name}"`,
          o.address_snapshot.phone,
          `"${i.name_snapshot}"`,
          i.qty,
          gross,
          taxable,
          rate,
          gross - taxable,
          o.payment_method,
          o.payment_status,
        ].join(",");
      }),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rasi-gst-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const monthOrders = orders.filter(
    (o) => o.placed_at.startsWith(month) && o.status !== "cancelled",
  );
  const revenue = monthOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="grid gap-4">
      <Card className="p-[18px]">
        <h3 className="mb-3 font-display font-extrabold">📈 Monthly GST report</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 block rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] outline-none"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <Btn onClick={download}>⬇️ Download CSV</Btn>
        </div>
        <p className="mt-3 text-[14px] text-mute">
          {monthOrders.length} orders · {inr(revenue)} revenue in {month || "—"}. One row per
          order line with taxable value and GST split — ready for the accountant.
        </p>
      </Card>

      <Card className="p-[18px]">
        <h3 className="mb-3 font-display text-[18px] font-extrabold text-ink">📜 Staff Audit Log</h3>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            value={logQuery}
            onChange={(e) => setLogQuery(e.target.value)}
            placeholder="Search audit action, entity or ID…"
            className="flex-1 min-w-[200px] rounded-pill border-2.5 border-ink bg-paper px-4 py-2 font-body text-[14px] outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {["all", "order", "product", "coupon", "brand", "settings"].map((e) => (
              <Pill
                key={e}
                bg={logEntity === e ? "#2B2140" : "#F2EAE0"}
                color={logEntity === e ? "#fff" : "#2B2140"}
                onClick={() => setLogEntity(e)}
              >
                {e.toUpperCase()}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <p className="text-[13px] text-mute text-center py-4">No audit logs found matching filter.</p>
          ) : (
            logs.map((l, i) => (
              <div key={l.id || i} className="flex flex-wrap items-center justify-between gap-2 rounded-tile border border-ink/20 p-2.5 text-[13px] bg-paper">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge bg="#E4D6FF">{l.entity}</Badge>
                  <span className="font-extrabold text-ink">{l.action}</span>
                  <span className="text-mute font-mono text-[11px]">{l.entity_id}</span>
                </div>
                <div className="text-[11px] text-mute font-mono">
                  {new Date(l.at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── Settings: same-day kill switch + serviceable PINs ───────────────────── */
/* ── Settings: same-day kill switch + future-proof PIN Code Manager ───── */
export function SettingsTab({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [settingsError, setSettingsError] = useState<string | null>(null);
  // Every settings field in this tab goes through this instead of calling
  // updateSettingsAction directly — a failed write used to refresh the page
  // and look identical to success, with nothing telling the admin the value
  // they just set didn't actually save.
  const saveSetting = async (patch: Partial<StoreSettings>) => {
    setSettingsError(null);
    const res = await updateSettingsAction(patch);
    if (!res.ok) setSettingsError(res.error ?? "Failed to save. Please try again.");
    return res;
  };
  const [sameDayEnabled, setSameDayEnabled] = useState(settings.same_day_enabled ?? true);
  const [announcementEnabled, setAnnouncementEnabled] = useState(settings.announcement_enabled ?? true);
  const [offerStripEnabled, setOfferStripEnabled] = useState(settings.offer_strip_enabled ?? true);
  const [universalFreeDelivery, setUniversalFreeDelivery] = useState(settings.universal_free_delivery ?? false);
  const [enableLanguageSwitch, setEnableLanguageSwitch] = useState(settings.enable_language_switch ?? true);
  const [giftWrapEnabled, setGiftWrapEnabled] = useState(settings.gift_wrap_enabled ?? true);

  useEffect(() => {
    setSameDayEnabled(settings.same_day_enabled ?? true);
    setAnnouncementEnabled(settings.announcement_enabled ?? true);
    setOfferStripEnabled(settings.offer_strip_enabled ?? true);
    setUniversalFreeDelivery(settings.universal_free_delivery ?? false);
    setEnableLanguageSwitch(settings.enable_language_switch ?? true);
    setGiftWrapEnabled(settings.gift_wrap_enabled ?? true);
  }, [settings]);

  const [serviceableList, setServiceableList] = useState<string[]>(
    settings.serviceable_pins || [],
  );
  const [unserviceableList, setUnserviceableList] = useState<string[]>(
    settings.unserviceable_pins || [],
  );
  const [newRuleInput, setNewRuleInput] = useState("");
  const [newUnserviceableInput, setNewUnserviceableInput] = useState("");
  const [bulkText, setBulkText] = useState(settings.serviceable_pins.join(", "));
  const [mode, setMode] = useState<"tags" | "bulk">("tags");
  const [testPin, setTestPin] = useState("");
  const [saving, setSaving] = useState(false);

  const [slabs, setSlabs] = useState<DeliverySlab[]>(settings.delivery_slabs || []);
  const [newSlabMin, setNewSlabMin] = useState<number>(0);
  const [newSlabMax, setNewSlabMax] = useState<string>("499");
  const [newSlabFee, setNewSlabFee] = useState<number>(49);

  const saveSettings = async (
    newServiceable: string[],
    newUnserviceable: string[] = unserviceableList,
  ) => {
    setSaving(true);
    await saveSetting({
      serviceable_pins: newServiceable,
      unserviceable_pins: newUnserviceable,
    });
    setSaving(false);
    router.refresh();
  };

  const handleAddRule = (ruleStr: string) => {
    const parsed = parsePinInput(ruleStr);
    if (!parsed.length) return;
    const updated = Array.from(new Set([...serviceableList, ...parsed]));
    setServiceableList(updated);
    setBulkText(updated.join(", "));
    saveSettings(updated);
    setNewRuleInput("");
  };

  const handleRemoveRule = (rule: string) => {
    const updated = serviceableList.filter((r) => r !== rule);
    setServiceableList(updated);
    setBulkText(updated.join(", "));
    saveSettings(updated);
  };

  const handleAddUnserviceable = (ruleStr: string) => {
    const parsed = parsePinInput(ruleStr);
    if (!parsed.length) return;
    const updated = Array.from(new Set([...unserviceableList, ...parsed]));
    setUnserviceableList(updated);
    saveSettings(serviceableList, updated);
    setNewUnserviceableInput("");
  };

  const handleRemoveUnserviceable = (rule: string) => {
    const updated = unserviceableList.filter((r) => r !== rule);
    setUnserviceableList(updated);
    saveSettings(serviceableList, updated);
  };

  const testResult = useMemo(() => {
    if (!/^\d{6}$/.test(testPin.trim())) return null;
    return isPinServiceable(testPin, serviceableList, unserviceableList);
  }, [testPin, serviceableList, unserviceableList]);

  return (
    <div className="grid gap-4">
      {settingsError && (
        <div className="rounded-tile border-2 border-ink bg-[#FFCBD9] p-2.5 text-[13px] font-bold text-ink">
          ⚠️ {settingsError}
        </div>
      )}
      {/* Same-Day Kill Switch */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <div className="font-display font-extrabold text-[16px]">🚚 Same-day delivery switch</div>
          <p className="text-[13px] text-mute">
            Master toggle for ribbon, countdown, and same-day delivery promises across the store.
          </p>
        </div>
        <Pill
          bg={sameDayEnabled ? "#D6E8B0" : "#FFCBD9"}
          onClick={async () => {
            const next = !sameDayEnabled;
            setSameDayEnabled(next);
            await saveSetting({ same_day_enabled: next });
            router.refresh();
          }}
        >
          {sameDayEnabled ? "ON ✓" : "OFF ✕"}
        </Pill>
      </Card>

      {/* Dynamic Announcement Ticker Settings */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/10 pb-3">
          <div>
            <div className="font-display text-[17px] font-extrabold text-ink">
              📢 Top Header Announcement Ribbon (Above Navigation)
            </div>
            <p className="text-[13px] text-mute">
              Fixed banner bar at the very top of the website header announcing store deals & live cutoff countdowns.
            </p>
          </div>
          <Pill
            bg={announcementEnabled ? "#D6E8B0" : "#FFCBD9"}
            onClick={async () => {
              const next = !announcementEnabled;
              setAnnouncementEnabled(next);
              await saveSetting({ announcement_enabled: next });
              router.refresh();
            }}
          >
            {announcementEnabled ? "TOP RIBBON ON ✓" : "OFF ✕"}
          </Pill>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Top Ribbon Announcement Text (English)
            </span>
            <input
              type="text"
              defaultValue={settings.announcement_text_en ?? "🎉 FLAT 10% OFF with code WELCOME10 · 🚚 FREE Delivery on orders over ₹499"}
              onBlur={async (e) => {
                const valEn = e.target.value;
                const autoTa = autoTranslateToTamil(valEn);
                await saveSetting({
                  announcement_text_en: valEn,
                  announcement_text_ta: autoTa,
                });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[14px] outline-none font-bold"
              placeholder="e.g. 🎉 FLAT 10% OFF with code WELCOME10 · 🚚 FREE Delivery on orders over ₹499"
            />
          </label>

          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Top Ribbon Announcement Text (Tamil Auto-Translated)
            </span>
            <input
              type="text"
              defaultValue={settings.announcement_text_ta ?? "🎉 WELCOME10 கூப்பனுடன் 10% தள்ளுபடி · 🚚 ₹499 மேல் இலவச டெலிவரி"}
              onBlur={async (e) => {
                await saveSetting({ announcement_text_ta: e.target.value });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[14px] outline-none bg-paper font-bold text-brand"
              placeholder="தமிழ் அறிவிப்பு..."
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Ribbon Background Color
            </span>
            <input
              type="color"
              defaultValue={settings.announcement_bg ?? "#2B2140"}
              onChange={async (e) => {
                await saveSetting({ announcement_bg: e.target.value });
                router.refresh();
              }}
              className="mt-1 h-10 w-full rounded-pill border-2 border-ink cursor-pointer p-1"
            />
          </label>

          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Ribbon Text Color
            </span>
            <input
              type="color"
              defaultValue={settings.announcement_color ?? "#FFE1A8"}
              onChange={async (e) => {
                await saveSetting({ announcement_color: e.target.value });
                router.refresh();
              }}
              className="mt-1 h-10 w-full rounded-pill border-2 border-ink cursor-pointer p-1"
            />
          </label>
        </div>
      </Card>

      {/* Dedicated Running Offer Ticker (OfferStrip) Settings */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/10 pb-3">
          <div>
            <div className="font-display text-[17px] font-extrabold text-ink">
              ⚡ Hero Running Offer Ticker (OfferStrip) Settings
            </div>
            <p className="text-[13px] text-mute">
              Independent settings for the auto-scrolling offer strip located directly below the main hero section.
            </p>
          </div>
          <Pill
            bg={offerStripEnabled ? "#D6E8B0" : "#FFCBD9"}
            onClick={async () => {
              const next = !offerStripEnabled;
              setOfferStripEnabled(next);
              await saveSetting({ offer_strip_enabled: next });
              router.refresh();
            }}
          >
            {offerStripEnabled ? "OFFER STRIP TICKER ON ✓" : "OFF ✕"}
          </Pill>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Custom Offer Ticker Sentences (English — One per line)
            </span>
            <textarea
              rows={4}
              defaultValue={
                settings.offer_strip_text_en ||
                `10% off with WELCOME10 above ₹499\n₹50 off with RASI50 above ₹999\n🚚 FREE Delivery on ALL Orders!\nSame-day delivery in Thoothukudi`
              }
              onBlur={async (e) => {
                const valEn = e.target.value;
                await saveSetting({
                  offer_strip_text_en: valEn,
                });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink p-3 font-body text-[14px] outline-none font-bold resize-y"
              placeholder="Enter one sentence per line..."
            />
          </label>

          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Custom Offer Ticker Sentences (Tamil — One per line)
            </span>
            <textarea
              rows={4}
              defaultValue={settings.offer_strip_text_ta || ""}
              onBlur={async (e) => {
                await saveSetting({ offer_strip_text_ta: e.target.value });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink p-3 font-body text-[14px] outline-none bg-paper font-bold text-brand resize-y"
              placeholder="Leave empty or enter Tamil sentences line-by-line..."
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Offer Strip Background Color
            </span>
            <input
              type="color"
              defaultValue={settings.offer_strip_bg ?? "#FFE66D"}
              onChange={async (e) => {
                await saveSetting({ offer_strip_bg: e.target.value });
                router.refresh();
              }}
              className="mt-1 h-10 w-full rounded-pill border-2 border-ink cursor-pointer p-1"
            />
          </label>

          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Offer Strip Text Color
            </span>
            <input
              type="color"
              defaultValue={settings.offer_strip_color ?? "#2B2140"}
              onChange={async (e) => {
                await saveSetting({ offer_strip_color: e.target.value });
                router.refresh();
              }}
              className="mt-1 h-10 w-full rounded-pill border-2 border-ink cursor-pointer p-1"
            />
          </label>
        </div>
      </Card>

      {/* Universal Free Delivery Switch & Tiered Rates Slabs */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/10 pb-3">
          <div>
            <div className="font-display text-[17px] font-extrabold text-ink">
              🚚 Delivery Fee & Rates Manager
            </div>
            <p className="text-[13px] text-mute">
              Universal 1-click Free Delivery toggle, base rates, and tiered amount slabs.
            </p>
          </div>
          <Pill
            bg={universalFreeDelivery ? "#D6E8B0" : "#FFCBD9"}
            onClick={async () => {
              const next = !universalFreeDelivery;
              setUniversalFreeDelivery(next);
              await saveSetting({ universal_free_delivery: next });
              router.refresh();
            }}
          >
            {universalFreeDelivery ? "UNIVERSAL FREE DELIVERY ON ✓" : "STANDARD RATES ACTIVE ✕"}
          </Pill>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Standard Base Delivery Fee (₹)
            </span>
            <input
              type="number"
              defaultValue={settings.base_delivery_fee ?? 49}
              onBlur={async (e) => {
                const val = Number(e.target.value) || 0;
                await saveSetting({ base_delivery_fee: val });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[15px] outline-none"
            />
          </label>

          <label>
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Free Delivery Threshold Amount (₹)
            </span>
            <input
              type="number"
              defaultValue={settings.free_delivery_threshold ?? 999}
              onBlur={async (e) => {
                // Not `|| 999` — that treats a deliberate 0 (free delivery on
                // every order, no minimum) as unset and silently reverts it.
                const parsed = Number(e.target.value);
                const val = Number.isFinite(parsed) && parsed >= 0 ? parsed : 999;
                await saveSetting({ free_delivery_threshold: val });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[15px] outline-none"
            />
          </label>
        </div>

        {/* Tiered Slabs List */}
        <div className="border-t-2 border-ink/10 pt-3">
          <div className="font-display text-[14px] font-extrabold text-ink mb-2">
            📊 Tiered Delivery Fee Slabs (Order Amount Ranges)
          </div>

          <div className="space-y-2 mb-3">
            {slabs.length === 0 ? (
              <p className="text-[12px] text-mute italic">No custom slabs configured. Defaulting to base fee and free delivery threshold above.</p>
            ) : (
              slabs.map((slab, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-pill border border-ink/30 bg-paper px-3 py-1.5 text-[13px] font-bold">
                  <div>
                    Range: ₹{slab.min_amount} – {slab.max_amount === null ? "Above" : `₹${slab.max_amount}`} → Fee: <span className={slab.fee === 0 ? "text-[#3D8B37]" : "text-brand"}>{slab.fee === 0 ? "FREE (₹0)" : `₹${slab.fee}`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = slabs.filter((_, i) => i !== idx);
                      setSlabs(updated);
                      await saveSetting({ delivery_slabs: updated });
                      router.refresh();
                    }}
                    className="text-[12px] text-[#E24B4A] hover:underline cursor-pointer"
                  >
                    🗑️ Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Slab Form */}
          <div className="flex flex-wrap items-end gap-2 rounded-card border-2 border-dashed border-ink bg-white p-3">
            <label className="min-w-[100px] flex-1">
              <span className="text-[11px] font-extrabold uppercase text-mute">Min Order (₹)</span>
              <input
                type="number"
                value={newSlabMin}
                onChange={(e) => setNewSlabMin(Number(e.target.value))}
                className="mt-1 w-full rounded-pill border border-ink px-2.5 py-1 text-[13px] outline-none"
              />
            </label>
            <label className="min-w-[100px] flex-1">
              <span className="text-[11px] font-extrabold uppercase text-mute">Max Order (₹ / Blank)</span>
              <input
                type="text"
                placeholder="e.g. 499 (or leave blank)"
                value={newSlabMax}
                onChange={(e) => setNewSlabMax(e.target.value)}
                className="mt-1 w-full rounded-pill border border-ink px-2.5 py-1 text-[13px] outline-none"
              />
            </label>
            <label className="min-w-[90px] flex-1">
              <span className="text-[11px] font-extrabold uppercase text-mute">Delivery Fee (₹)</span>
              <input
                type="number"
                value={newSlabFee}
                onChange={(e) => setNewSlabFee(Number(e.target.value))}
                className="mt-1 w-full rounded-pill border border-ink px-2.5 py-1 text-[13px] outline-none"
              />
            </label>
            <Btn
              small
              bg="#D6E8B0"
              color="#2B2140"
              onClick={async () => {
                const maxVal = newSlabMax.trim() === "" ? null : Number(newSlabMax);
                const item: DeliverySlab = {
                  min_amount: Number(newSlabMin) || 0,
                  max_amount: maxVal,
                  fee: Number(newSlabFee) || 0,
                };
                const updated = [...slabs, item];
                setSlabs(updated);
                await saveSetting({ delivery_slabs: updated });
                router.refresh();
              }}
            >
              + Add Rate Slab
            </Btn>
          </div>
        </div>
      </Card>

      {/* Multi-Language Switcher Kill Switch */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <div className="font-display font-extrabold text-[16px]">🌐 Multi-Language Button Switch (English / தமிழ்)</div>
          <p className="text-[13px] text-mute">
            Show or hide the language selector button (🌐 தமிழ் / EN) in the website header navigation.
          </p>
        </div>
        <Pill
          bg={enableLanguageSwitch ? "#D6E8B0" : "#FFCBD9"}
          onClick={async () => {
            const next = !enableLanguageSwitch;
            setEnableLanguageSwitch(next);
            await saveSetting({ enable_language_switch: next });
            router.refresh();
          }}
        >
          {enableLanguageSwitch ? "ENABLED ✓" : "DISABLED ✕"}
        </Pill>
      </Card>

      {/* Gift Wrapping & Greeting Note Settings */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/10 pb-3">
          <div>
            <div className="font-display text-[17px] font-extrabold text-ink">
              🎁 Gift Wrapping & Greeting Note Settings
            </div>
            <p className="text-[13px] text-mute">
              Enable gift wrap packaging service at checkout and configure the wrap fee.
            </p>
          </div>
          <Pill
            bg={giftWrapEnabled ? "#D6E8B0" : "#FFCBD9"}
            onClick={async () => {
              const next = !giftWrapEnabled;
              setGiftWrapEnabled(next);
              await saveSetting({ gift_wrap_enabled: next });
              router.refresh();
            }}
          >
            {giftWrapEnabled ? "ENABLED ✓" : "DISABLED ✕"}
          </Pill>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="min-w-0 flex-1">
            <span className="font-display text-[12px] font-extrabold uppercase text-mute">
              Gift Wrap Fee (₹)
            </span>
            <input
              type="number"
              defaultValue={settings.gift_wrap_fee ?? 30}
              onBlur={async (e) => {
                const val = Number(e.target.value) || 0;
                await saveSetting({ gift_wrap_fee: val });
                router.refresh();
              }}
              className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2 font-body text-[15px] outline-none"
            />
          </label>
        </div>
      </Card>

      {/* Serviceable PIN Codes Manager */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/10 pb-3">
          <div>
            <div className="font-display text-[17px] font-extrabold text-ink">
              📍 Serviceable PIN Codes Manager
            </div>
            <p className="text-[13px] text-mute">
              Add individual PINs (e.g. <code>628001</code>), ranges (e.g. <code>628001-628020</code>), or district wildcards (e.g. <code>628*</code>).
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode("tags")}
              className={`rounded-pill px-3 py-1 text-[12px] font-bold border-2 border-ink transition-all ${mode === "tags" ? "bg-brand text-white shadow-hard-1" : "bg-white text-ink"
                }`}
            >
              🏷️ Tags & Presets
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`rounded-pill px-3 py-1 text-[12px] font-bold border-2 border-ink transition-all ${mode === "bulk" ? "bg-brand text-white shadow-hard-1" : "bg-white text-ink"
                }`}
            >
              📝 Bulk Editor
            </button>
          </div>
        </div>

        {mode === "tags" && (
          <div className="mt-3.5 grid gap-3">
            {/* Quick Add Rule Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRule(newRuleInput);
                  }
                }}
                placeholder="Enter PIN (628001), Range (628001-628020), or Wildcard (628*)"
                className="min-w-0 flex-1 rounded-pill border-2.5 border-ink px-4 py-2 font-body text-[14px] outline-none"
              />
              <Btn small bg="#B9EBDD" color="#2B2140" disabled={saving} onClick={() => handleAddRule(newRuleInput)}>
                + Add Rule
              </Btn>
            </div>

            {/* Quick Region Presets */}
            <div className="rounded-tile border-2 border-dashed border-ink/20 bg-cream p-3">
              <div className="text-[12px] font-bold text-mute uppercase tracking-wider mb-2">
                ⚡ Quick Region Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddRule("628001-628008")}
                  className="rounded-pill border-2 border-ink bg-white px-2.5 py-1 text-[12px] font-extrabold hover:bg-[#FFE1A8] transition-all"
                >
                  + Thoothukudi Core (628001–628008)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRule("628*")}
                  className="rounded-pill border-2 border-ink bg-white px-2.5 py-1 text-[12px] font-extrabold hover:bg-[#C7E9FF] transition-all"
                >
                  + Entire Thoothukudi District (628*)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRule("627*")}
                  className="rounded-pill border-2 border-ink bg-white px-2.5 py-1 text-[12px] font-extrabold hover:bg-[#FFCBD9] transition-all"
                >
                  + Tirunelveli District (627*)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRule("625*")}
                  className="rounded-pill border-2 border-ink bg-white px-2.5 py-1 text-[12px] font-extrabold hover:bg-[#D6E8B0] transition-all"
                >
                  + Madurai Region (625*)
                </button>
              </div>
            </div>

            {/* Active PIN Chips */}
            <div>
              <div className="text-[13px] font-bold text-ink mb-1.5 flex items-center justify-between">
                <span>Active Serviceable Rules ({serviceableList.length})</span>
                <span className="text-[12px] text-mute">{formatPinSummary(serviceableList)}</span>
              </div>
              {serviceableList.length === 0 ? (
                <p className="text-[13px] text-mute italic">No serviceable PIN rules configured yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1 border-1 border-ink/10 rounded-tile">
                  {serviceableList.map((rule) => (
                    <span
                      key={rule}
                      className="inline-flex items-center gap-1.5 rounded-pill border-2 border-ink bg-[#FFE1A8] px-3 py-1 font-display text-[13px] font-extrabold shadow-hard-1"
                    >
                      {rule}
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule)}
                        className="ml-1 text-ink/60 hover:text-red-600 font-bold"
                        aria-label={`Remove ${rule}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "bulk" && (
          <div className="mt-3 grid gap-2">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={4}
              placeholder="Paste comma or newline separated PINs, ranges (628001-628020), or wildcards (628*)"
              className="w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[14px] outline-none"
            />
            <div className="flex gap-2">
              <Btn
                small
                disabled={saving}
                onClick={() => {
                  const parsed = parsePinInput(bulkText);
                  setServiceableList(parsed);
                  saveSettings(parsed);
                }}
              >
                Save Bulk PIN Rules
              </Btn>
              <Btn small bg="#F2EAE0" color="#2B2140" onClick={() => setBulkText(serviceableList.join(", "))}>
                Reset
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Restricted / Unserviceable Overrides Manager */}
      <Card className="p-4">
        <div className="font-display text-[16px] font-extrabold text-ink">
          ⛔ Explicit Unserviceable / Restricted Exclusions
        </div>
        <p className="text-[13px] text-mute">
          Exclude specific PINs or ranges even if they match a broad wildcard region rule (e.g. exclude <code>628099</code> from <code>628*</code>).
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newUnserviceableInput}
            onChange={(e) => setNewUnserviceableInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUnserviceable(newUnserviceableInput);
              }
            }}
            placeholder="Enter restricted PIN or range (e.g. 628099)"
            className="min-w-0 flex-1 rounded-pill border-2.5 border-ink px-4 py-2 font-body text-[14px] outline-none"
          />
          <Btn small bg="#FFCBD9" color="#2B2140" disabled={saving} onClick={() => handleAddUnserviceable(newUnserviceableInput)}>
            + Restrict PIN
          </Btn>
        </div>

        {unserviceableList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {unserviceableList.map((rule) => (
              <span
                key={rule}
                className="inline-flex items-center gap-1.5 rounded-pill border-2 border-ink bg-[#FFCBD9] px-3 py-1 font-display text-[13px] font-extrabold shadow-hard-1"
              >
                🚫 {rule}
                <button
                  type="button"
                  onClick={() => handleRemoveUnserviceable(rule)}
                  className="ml-1 text-ink/60 hover:text-red-600 font-bold"
                  aria-label={`Remove restriction ${rule}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Interactive Live PIN Tester */}
      <Card className="p-4 bg-paper border-3 border-ink">
        <div className="font-display text-[16px] font-extrabold text-ink flex items-center gap-2">
          🔍 Live Interactive PIN Tester
        </div>
        <p className="text-[13px] text-mute">
          Test any customer PIN code right now to verify if your configured rules grant delivery access.
        </p>

        <div className="mt-3 flex gap-2 items-center">
          <input
            type="text"
            value={testPin}
            onChange={(e) => setTestPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Type 6-digit PIN (e.g. 628005)"
            className="w-48 rounded-pill border-2.5 border-ink px-4 py-2 font-body text-[14px] outline-none"
          />
          {testResult && (
            <div className="flex items-center gap-2">
              {testResult.serviceable ? (
                <Badge bg="#D6E8B0">
                  ✅ Serviceable {testResult.matchedPattern ? `(Matched: ${testResult.matchedPattern})` : ""}
                </Badge>
              ) : (
                <Badge bg="#FFCBD9">
                  ❌ Restricted / Unserviceable {testResult.isExcluded ? "(Explicitly Excluded)" : ""}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Thresholds */}
      <Card className="p-4 text-[14px]">
        <div className="font-display font-extrabold">Delivery Thresholds</div>
        <p className="mt-1 text-mute">
          Free delivery above {inr(settings.free_delivery_threshold)} · COD limit{" "}
          {inr(settings.cod_limit)}
        </p>
      </Card>
    </div>
  );
}

/* ── Custom Box Media & Dimensions Management Tab ────────────────────── */
export function BoxMediaTab({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [boxMedia, setBoxMedia] = useState<Record<string, string>>(settings.box_media || {});
  const [activeSubTab, setActiveSubTab] = useState<"hero" | "categories" | "banner">("hero");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const heroCollageItems = [
    { key: "hero-collage-bath", title: "Baby Care (Hero Tile)", category: "Bath & Skincare", emoji: "🧴", bg: "#C7E9FF", width: 400, height: 260, aspect: "16:10" },
    { key: "hero-collage-toys", title: "Toys & Play (Hero Tile)", category: "Toys & Play", emoji: "🧸", bg: "#FFCBD9", width: 400, height: 260, aspect: "16:10" },
    { key: "hero-collage-clothing", title: "Baby Clothing (Hero Tile)", category: "Clothing", emoji: "👕", bg: "#D6E8B0", width: 400, height: 260, aspect: "16:10" },
    { key: "hero-collage-feeding", title: "Feeding (Hero Tile)", category: "Feeding", emoji: "🍼", bg: "#FFE1A8", width: 400, height: 260, aspect: "16:10" },
    { key: "hero-collage-mom", title: "Maternity & Mom (Hero Tile)", category: "Mom Care", emoji: "🤱", bg: "#FBD0EA", width: 400, height: 260, aspect: "16:10" },
    { key: "hero-collage-diapering", title: "Diapers & Essentials (Hero Tile)", category: "Diapering", emoji: "🧷", bg: "#E4D6FF", width: 400, height: 260, aspect: "16:10" },
  ];

  const categoryItems = CATEGORIES.map((cat) => ({
    key: `cat-${cat}`,
    title: `${CATEGORY_META[cat]?.en || cat} Box`,
    category: cat,
    emoji: CATEGORY_META[cat]?.emoji || "📦",
    bg: CATEGORY_META[cat]?.bg || "#FFE1A8",
    width: 360,
    height: 225,
    aspect: "16:10",
  }));

  const bannerItem = {
    key: "hero-store-banner",
    title: "Flagship Store Showcase Banner (Hero Card)",
    category: "Hero Banner",
    emoji: "🏪",
    bg: "#FE91E8",
    width: 1024,
    height: 576,
    aspect: "16:9",
  };

  const handleFileUpload = async (key: string, file: File) => {
    // box_media is inlined (base64) into the settings row, which is read on
    // EVERY storefront page load — so an oversized or non-image file here bloats
    // every page for every visitor. This path had no validation at all (only the
    // bypassable accept="image/*" hint). Bound it before storing.
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_BYTES = 1_500_000; // 1.5 MB — kept small because it's page-inlined
    if (!ALLOWED.includes(file.type)) {
      setToast("Please choose a JPG, PNG or WebP image.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (file.size > MAX_BYTES) {
      setToast("Image is too large (max 1.5 MB). Please compress it first.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setSavingKey(key);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const updated = { ...boxMedia, [key]: dataUrl };
        setBoxMedia(updated);
        const res = await updateSettingsAction({ box_media: updated });
        setToast(res.ok ? `Saved picture for ${key}!` : (res.error ?? "Failed to save. Please try again."));
        setTimeout(() => setToast(null), res.ok ? 3000 : 5000);
        if (res.ok) router.refresh();
      }
      setSavingKey(null);
    };
    reader.readAsDataURL(file);
  };

  const handleResetImage = async (key: string) => {
    setSavingKey(key);
    const updated = { ...boxMedia };
    delete updated[key];
    setBoxMedia(updated);
    const res = await updateSettingsAction({ box_media: updated });
    setToast(res.ok ? `Reset picture for ${key}!` : (res.error ?? "Failed to save. Please try again."));
    setTimeout(() => setToast(null), res.ok ? 3000 : 5000);
    setSavingKey(null);
    if (res.ok) router.refresh();
  };

  const renderBoxCard = (item: {
    key: string;
    title: string;
    category: string;
    emoji: string;
    bg: string;
    width: number;
    height: number;
    aspect: string;
  }) => {
    const currentImg = boxMedia[item.key];
    const isSaving = savingKey === item.key;

    return (
      <Card key={item.key} className="p-4 flex flex-col justify-between border-3 border-ink shadow-hard-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-display text-[15px] font-extrabold text-ink flex items-center gap-1.5">
              <span>{item.emoji}</span>
              <span>{item.title}</span>
            </span>
            <Badge bg={item.bg}>{item.aspect}</Badge>
          </div>

          {/* Wireframe Helper Guide for Staff */}
          <div className="mb-3 rounded-tile border-2 border-dashed border-ink/40 bg-paper p-2 text-[12px] text-mute">
            <div className="font-bold text-ink flex items-center justify-between">
              <span>📐 Ideal Dimensions:</span>
              <span className="text-brand font-extrabold">{item.width} × {item.height} px</span>
            </div>
            <div className="mt-0.5 text-[11px]">
              Recommended format: PNG / WebP / JPG. Artwork automatically fits the box frame.
            </div>
          </div>

          {/* Visual Box Shape Example & Live Preview */}
          <div
            className="relative w-full rounded-card border-2.5 border-ink p-3 shadow-hard-2 overflow-hidden flex flex-col justify-between min-h-[140px] transition-all"
            style={{ backgroundColor: item.bg }}
          >
            {currentImg ? (
              <div className="relative w-full h-[110px] rounded-tile border-2 border-ink overflow-hidden bg-white/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentImg} alt={item.title} className="w-full h-full object-cover" />
                <span className="absolute top-1 right-1 rounded-pill border border-ink bg-emerald-400 px-2 py-0.5 text-[9px] font-extrabold text-ink">
                  CUSTOM ACTIVE ✓
                </span>
              </div>
            ) : (
              <div className="relative w-full h-[110px] rounded-tile border-2 border-dashed border-ink/40 bg-white/50 flex flex-col items-center justify-center p-2 text-center">
                <span className="text-[28px] opacity-75">{item.emoji}</span>
                <span className="mt-1 font-display text-[11px] font-extrabold text-ink/75">
                  Default Emoji / Pattern Active
                </span>
                <span className="text-[9px] text-mute">({item.width} × {item.height} px Wireframe Shape)</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Controls & Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <label className="btn-press cursor-pointer flex items-center justify-center gap-2 rounded-pill border-2.5 border-ink bg-[#FFE1A8] px-3 py-2 font-display text-[12px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE66D]">
            <span>📷 {currentImg ? "Change Picture" : "Upload Picture"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(item.key, file);
              }}
            />
          </label>

          {currentImg && (
            <button
              type="button"
              onClick={() => handleResetImage(item.key)}
              className="btn-press rounded-pill border-2 border-ink bg-[#FFCBD9] px-3 py-1 text-[11px] font-extrabold text-ink shadow-hard-1 hover:bg-[#FF8DA9]"
            >
              🔄 Reset to Default
            </button>
          )}

          {isSaving && <span className="text-[11px] text-center text-brand font-extrabold animate-pulse">Saving picture…</span>}
        </div>
      </Card>
    );
  };

  return (
    <div className="grid gap-4">
      {toast && (
        <div className="fixed top-20 right-6 z-50 rounded-pill border-3 border-ink bg-[#D6E8B0] px-5 py-2.5 font-display text-[14px] font-extrabold text-ink shadow-hard-4 animate-bounce">
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <Card className="p-5 bg-gradient-to-r from-[#FFE1A8] via-[#FFCBD9] to-[#C7E9FF] border-3 border-ink shadow-hard-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] font-extrabold text-ink flex items-center gap-2">
              <span>🖼️</span>
              <span>Custom Box Media & Wireframe Dimensions</span>
            </h2>
            <p className="mt-1 text-[14px] font-bold text-ink/80">
              Upload custom pictures for storefront cards (Hero Product Wall, Category Grid, Store Banner).
              Each box shows exact width & height recommendations so your uploaded artwork fits perfectly!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Pill
              bg={activeSubTab === "hero" ? "#2B2140" : "#FFF"}
              color={activeSubTab === "hero" ? "#FFF" : "#2B2140"}
              onClick={() => setActiveSubTab("hero")}
            >
              🛍️ Hero Wall (6 Boxes)
            </Pill>
            <Pill
              bg={activeSubTab === "categories" ? "#2B2140" : "#FFF"}
              color={activeSubTab === "categories" ? "#FFF" : "#2B2140"}
              onClick={() => setActiveSubTab("categories")}
            >
              🎨 Category Grid Boxes
            </Pill>
            <Pill
              bg={activeSubTab === "banner" ? "#2B2140" : "#FFF"}
              color={activeSubTab === "banner" ? "#FFF" : "#2B2140"}
              onClick={() => setActiveSubTab("banner")}
            >
              🏪 Store Banner Box
            </Pill>
          </div>
        </div>
      </Card>

      {/* SubTab Content */}
      {activeSubTab === "hero" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-[16px] font-extrabold text-ink">
              🛍️ Hero Product Wall Collage Boxes (Recommended: 400 × 260 px)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {heroCollageItems.map(renderBoxCard)}
          </div>
        </div>
      )}

      {activeSubTab === "categories" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-[16px] font-extrabold text-ink">
              🎨 Shop by Category Grid Boxes (Recommended: 360 × 225 px)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {categoryItems.map(renderBoxCard)}
          </div>
        </div>
      )}

      {activeSubTab === "banner" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-[16px] font-extrabold text-ink">
              🏪 Hero Flagship Store Banner Box (Recommended: 1024 × 576 px)
            </span>
          </div>
          <div className="max-w-md">
            {renderBoxCard(bannerItem)}
          </div>
        </div>
      )}
    </div>
  );
}
