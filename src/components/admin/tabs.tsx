"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Coupon,
  CustomerRecord,
  Order,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import {
  CATEGORIES,
  CATEGORY_META,
  MILESTONES,
  MILESTONE_META,
  TILE_SWATCHES,
  inr,
  type Category,
  type Milestone,
} from "@/lib/constants";
import { Art, Badge, Btn, Card, Field, Modal, Pill, Stars } from "@/components/ui";
import { formatPinSummary, isPinServiceable, parsePinInput } from "@/lib/pin";
import {
  addCouponAction,
  archiveProductAction,
  deleteCouponAction,
  deleteProductImageAction,
  uploadProductImageAction,
  moderateReviewAction,
  saveCustomerNoteAction,
  updateProductStockAction,
  updateSettingsAction,
  upsertProductAction,
} from "@/app/admin/actions";

/* ── Products CRUD (archive-not-delete, tile colour picker) ──────────────── */
export function ProductsTab({ products }: { products: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [confirmArchive, setConfirmArchive] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [stockUpdating, setStockUpdating] = useState<string | null>(null);

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
        <Btn onClick={() => setEditing("new")}>➕ Add New Product</Btn>
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].en}
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
                        {CATEGORY_META[c].en}
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
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name_en: product?.name_en ?? "",
    name_ta: product?.name_ta ?? "",
    brand: product?.brand ?? "",
    price: product?.price?.toString() ?? "",
    mrp: product?.mrp?.toString() ?? "",
    stock: product?.stock?.toString() ?? "10",
    milestone: (product?.milestone ?? "newborn") as Milestone,
    categories: (product?.categories ?? []) as Category[],
    emoji: product?.emoji ?? "🧸",
    tile_color: product?.tile_color ?? "#FFE1A8",
    description_en: product?.description_en ?? "",
    description_ta: product?.description_ta ?? "",
    images: product?.images ?? [],
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
      stock: Number(f.stock) || 0,
      tile_color: f.tile_color,
      emoji: f.emoji,
      description_en: f.description_en,
      description_ta: f.description_ta,
      images: f.images,
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
      <Field label="Product name (English)" value={f.name_en} onChange={(v) => setF({ ...f, name_en: v })} placeholder="Organic Cotton Onesie" />
      <Field label="Product name (Tamil)" value={f.name_ta} onChange={(v) => setF({ ...f, name_ta: v })} placeholder="ஆர்கானிக் பருத்தி உடை" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Brand" value={f.brand} onChange={(v) => setF({ ...f, brand: v })} placeholder="Sebamed" />
        <Field label="Price (₹)" type="number" inputMode="numeric" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
        <Field label="MRP (₹)" type="number" inputMode="numeric" value={f.mrp} onChange={(v) => setF({ ...f, mrp: v })} />
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
          {CATEGORIES.map((c) => {
            const on = f.categories.includes(c);
            return (
              <Pill key={c} bg={on ? "#D6E8B0" : "#F2EAE0"} onClick={() => toggleCat(c)}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].en}
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
      <label className="mb-4 block">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">
          Description (Tamil)
        </span>
        <textarea
          value={f.description_ta}
          onChange={(e) => setF({ ...f, description_ta: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[15px] outline-none"
        />
      </label>
      <ProductImages
        images={f.images}
        slugHint={f.name_en || product?.slug || "product"}
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
 * Product photo manager. Uploads land in Supabase Storage immediately and the
 * URL is kept in form state — nothing is attached to the product until the
 * form is saved, so cancelling leaves an orphan object rather than a half-saved
 * product. The first image is what the storefront tiles show.
 */
function ProductImages({
  images,
  slugHint,
  onChange,
}: {
  images: string[];
  slugHint: string;
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

  return (
    <div className="mb-4">
      <span className="font-display text-[12px] font-extrabold uppercase text-mute">
        Product photos
      </span>

      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2.5">
          {images.map((url, i) => (
            <div key={url} className="w-[92px]">
              <div className="relative h-[92px] w-[92px] overflow-hidden rounded-tile border-2.5 border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of a just-uploaded blob */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(url)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-white text-[12px] font-extrabold shadow-hard-2"
                >
                  ✕
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-xl border-2 border-ink bg-brand px-1.5 text-[9px] font-extrabold text-white">
                    MAIN
                  </span>
                )}
              </div>
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makeMain(url)}
                  className="mt-1 w-full text-[11px] font-extrabold text-mute underline"
                >
                  Make main
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <label className="mt-2.5 flex cursor-pointer items-center justify-center gap-2 rounded-tile border-2.5 border-dashed border-ink bg-paper px-4 py-3 font-display text-[13px] font-extrabold">
        {busy ? "Uploading…" : "📷 Add photos (JPG, PNG or WebP · max 5 MB)"}
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
      {images.length === 0 && !error && (
        <p className="mt-1.5 text-[12px] text-mute">
          No photo yet — the storefront shows the emoji tile until you add one.
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
  const withStats = useMemo(() => {
    const now = Date.now();
    const rows = customers.map((c) => {
      const theirOrders = orders.filter(
        (o) => o.address_snapshot.phone.replace(/\D/g, "").slice(-10) === c.phone,
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

  return (
    <div className="grid gap-3">
      {/* Activity Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border-3 border-ink bg-white p-4 shadow-hard-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-[20px] font-extrabold text-ink">
            👥 {customers.length} Members
          </span>
          <span className="rounded-pill border-2 border-ink bg-[#D6E8B0] px-3 py-1 font-display text-[13px] font-extrabold text-ink shadow-hard-2">
            🟢 {activeTodayCount} Active Today
          </span>
        </div>
        <div className="text-[13px] font-bold text-mute">
          Tracking daily sign-ins & active store users
        </div>
      </div>

      {withStats.length === 0 && (
        <p className="text-mute">Customer records appear after the first order or signup.</p>
      )}
      {withStats.map(({ c, theirOrders, ltv, segment, activity }) => (
        <Card key={c.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-display text-[16px] font-extrabold text-ink">{c.name}</span>{" "}
              <span className="text-[14px] text-mute">· {c.phone}</span>{" "}
              <Badge bg={segColor[segment] ?? "#F2EAE0"}>{segment}</Badge>{" "}
              <Badge bg={activity.isToday ? "#D6E8B0" : "#F2EAE0"}>
                {activity.isToday ? `🟢 ${activity.text}` : `🕒 ${activity.text}`}
              </Badge>
              {c.login_count && c.login_count > 1 && (
                <Badge bg="#FFE1A8">🔑 {c.login_count} logins</Badge>
              )}
            </div>
            <div className="text-[14px]">
              {theirOrders.length} orders ·{" "}
              <span className="font-display font-extrabold text-brand">{inr(ltv)}</span>
            </div>
          </div>
          {c.baby_dob && (
            <div className="mt-1 text-[13px] text-mute">👶 Baby DOB: {c.baby_dob}</div>
          )}
          <NoteField customerId={c.id} initial={c.notes} />
        </Card>
      ))}
    </div>
  );
}

function NoteField({ customerId, initial }: { customerId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== initial && saveCustomerNoteAction(customerId, value)}
      placeholder="CRM notes — baby due Aug, prefers Tamil, WhatsApp only…"
      rows={2}
      className="mt-2 w-full rounded-tile border-2.5 border-ink px-3.5 py-2.5 font-body text-[14px] outline-none"
    />
  );
}

/* ── Coupons ─────────────────────────────────────────────────────────────── */
export function CouponsTab({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [f, setF] = useState({ code: "", type: "percent" as "percent" | "flat", value: "", min: "" });

  return (
    <div>
      <Card className="p-4">
        <h3 className="mb-3 font-display font-extrabold">Create coupon 🏷️</h3>
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
        </div>
        <Btn
          small
          onClick={async () => {
            if (!f.code || !f.value) return;
            await addCouponAction({
              code: f.code,
              type: f.type,
              value: Number(f.value),
              min_order: Number(f.min) || 0,
              valid_until: null,
              usage_limit: null,
            });
            setF({ code: "", type: "percent", value: "", min: "" });
            router.refresh();
          }}
        >
          Add coupon
        </Btn>
      </Card>
      <div className="mt-4 grid gap-2">
        {coupons.map((c) => (
          <Card key={c.code} className="flex items-center justify-between p-3">
            <div>
              <span className="font-display font-extrabold">{c.code}</span>{" "}
              <span className="ml-2 text-[14px] text-mute">
                {c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} off`} · min{" "}
                {inr(c.min_order)} · used {c.used_count}×
              </span>
            </div>
            <Btn
              small
              bg="#E24B4A"
              onClick={async () => {
                await deleteCouponAction(c.code);
                router.refresh();
              }}
            >
              Delete
            </Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Review moderation queue ─────────────────────────────────────────────── */
export function ReviewsTab({ reviews, products }: { reviews: Review[]; products: Product[] }) {
  const router = useRouter();
  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");
  const productName = (id: string) => products.find((p) => p.id === id)?.name_en ?? "—";

  const decide = async (id: string, status: "approved" | "rejected") => {
    await moderateReviewAction(id, status);
    router.refresh();
  };

  return (
    <div className="grid gap-3">
      <h3 className="font-display font-extrabold">Pending ({pending.length})</h3>
      {pending.length === 0 && <p className="text-[14px] text-mute">Queue is clear ✨</p>}
      {pending.map((r) => (
        <Card key={r.id} className="p-4">
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
      {rest.length > 0 && (
        <>
          <h3 className="mt-2 font-display font-extrabold">Moderated</h3>
          {rest.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-3 text-[14px]">
              <div className="min-w-0">
                <Stars n={r.rating} /> <b>{r.author_name}</b>{" "}
                <span className="text-mute">— {r.text.slice(0, 60)}</span>
              </div>
              <Badge bg={r.status === "approved" ? "#D6E8B0" : "#FFCBD9"}>{r.status}</Badge>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Reports: monthly GST-ready CSV ──────────────────────────────────────── */
export function ReportsTab({ orders, products }: { orders: Order[]; products: Product[] }) {
  const months = useMemo(() => {
    const set = new Set(orders.map((o) => o.placed_at.slice(0, 7)));
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return [...set].sort().reverse();
  }, [orders]);
  const [month, setMonth] = useState(months[0] ?? "");

  const download = () => {
    const rows = orders.filter(
      (o) => o.placed_at.startsWith(month) && o.status !== "cancelled",
    );
    const gstRateFor = (id: string | null) =>
      products.find((p) => p.id === id)?.gst_rate ?? 12;
    const header =
      "order_no,date,customer,phone,item,qty,gross,taxable,gst_rate,gst_amount,payment_method,payment_status";
    const lines = rows.flatMap((o) =>
      o.items.map((i) => {
        const rate = gstRateFor(i.product_id);
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
  );
}

/* ── Settings: same-day kill switch + serviceable PINs ───────────────────── */
/* ── Settings: same-day kill switch + future-proof PIN Code Manager ───── */
export function SettingsTab({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
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

  const saveSettings = async (
    newServiceable: string[],
    newUnserviceable: string[] = unserviceableList,
  ) => {
    setSaving(true);
    await updateSettingsAction({
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
      {/* Same-Day Kill Switch */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <div className="font-display font-extrabold text-[16px]">🚚 Same-day delivery switch</div>
          <p className="text-[13px] text-mute">
            Master toggle for ribbon, countdown, and same-day delivery promises across the store.
          </p>
        </div>
        <Pill
          bg={settings.same_day_enabled ? "#D6E8B0" : "#FFCBD9"}
          onClick={async () => {
            await updateSettingsAction({ same_day_enabled: !settings.same_day_enabled });
            router.refresh();
          }}
        >
          {settings.same_day_enabled ? "ON ✓" : "OFF ✕"}
        </Pill>
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
              className={`rounded-pill px-3 py-1 text-[12px] font-bold border-2 border-ink transition-all ${
                mode === "tags" ? "bg-brand text-white shadow-hard-1" : "bg-white text-ink"
              }`}
            >
              🏷️ Tags & Presets
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`rounded-pill px-3 py-1 text-[12px] font-bold border-2 border-ink transition-all ${
                mode === "bulk" ? "bg-brand text-white shadow-hard-1" : "bg-white text-ink"
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
