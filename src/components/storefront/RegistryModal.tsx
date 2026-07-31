"use client";

import { useState } from "react";
import type { BabyRegistry, Product } from "@/lib/types";
import { useSession } from "@/lib/store/SessionProvider";
import { inr } from "@/lib/constants";
import { Art, Btn, Modal } from "@/components/ui";
import { createBabyRegistryAction } from "@/app/customer-actions";

export function CreateRegistryModal({
  products,
  onClose,
  onCreated,
}: {
  products: Product[];
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const { session } = useSession();
  const [title, setTitle] = useState(`${session?.name || "Our"}'s Baby Shower Registry 👶`);
  const [parentName, setParentName] = useState(session?.name || "");
  const [babyName, setBabyName] = useState("Baby");
  const [eventDate, setEventDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    products.slice(0, 4).map((p) => p.id),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedIds.length === 0) {
      setError("Please select at least 1 product for your registry");
      return;
    }
    setSubmitting(true);
    setError(null);

    const items = selectedIds.map((id) => ({
      product_id: id,
      desired_qty: 1,
      purchased_qty: 0,
    }));

    const res = await createBabyRegistryAction(
      title,
      parentName,
      babyName,
      eventDate,
      items,
    );

    setSubmitting(false);
    if (res.ok && res.slug) {
      onCreated(res.slug);
    } else {
      setError(res.error ?? "Failed to create registry");
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[28px]">🎁</span>
        <div>
          <h3 className="font-display text-[22px] font-extrabold text-ink leading-tight">
            Create Baby Shower Registry
          </h3>
          <p className="text-[12px] font-semibold text-mute">
            Select items you need so family & friends can gift them directly!
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3 font-body">
        <div>
          <label className="block text-[11px] font-extrabold uppercase text-mute mb-1">
            Registry Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2 font-display text-[15px] font-extrabold outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-mute mb-1">
              Parent(s) Name
            </label>
            <input
              type="text"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2 text-[14px] font-bold outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-mute mb-1">
              Expected Date / Baby Shower Date
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2 text-[14px] font-bold outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold uppercase text-mute mb-1">
            Select Items for your Registry ({selectedIds.length} chosen)
          </label>
          <div className="max-h-[220px] overflow-y-auto space-y-1.5 p-1 rounded-tile border-2 border-ink/20 bg-paper">
            {products.map((p) => {
              const selected = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`flex items-center justify-between p-2 rounded-tile border-2 cursor-pointer transition-all ${
                    selected
                      ? "border-ink bg-[#D6E8B0] shadow-hard-1"
                      : "border-ink/20 bg-white hover:bg-cream"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-tile overflow-hidden shrink-0">
                      <Art emoji={p.emoji} bg={p.tile_color} ratio="tile" />
                    </div>
                    <div>
                      <div className="font-display text-[13px] font-extrabold text-ink">{p.name_en}</div>
                      <div className="text-[11px] font-bold text-brand">{inr(p.price)}</div>
                    </div>
                  </div>
                  <span className="font-display text-[16px] font-extrabold">
                    {selected ? "✓ Added" : "+ Pick"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[13px] font-bold text-red-600 text-center">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Btn full bg="#F2EAE0" color="#2B2140" type="button" onClick={onClose}>
            Cancel
          </Btn>
          <Btn full disabled={submitting} type="submit">
            {submitting ? "Creating Registry…" : "Create & Get Link 🎁"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

export function ViewRegistryModal({
  registry,
  products,
  onClose,
  onAddToCart,
}: {
  registry: BabyRegistry;
  products: Product[];
  onClose: () => void;
  onAddToCart: (p: Product) => void;
}) {
  const [copied, setCopied] = useState(false);
  const regProducts = registry.items.map((i) => ({
    item: i,
    product: products.find((p) => p.id === i.product_id),
  })).filter((x) => x.product !== undefined);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/?registry=${registry.slug}`;

  return (
    <Modal onClose={onClose} wide>
      <div className="rounded-card border-3 border-ink bg-[#FFE1A8] p-4 text-center shadow-hard-3 mb-4">
        <span className="text-[32px]">🎁</span>
        <h3 className="font-display text-[22px] font-extrabold text-ink mt-1">
          {registry.title}
        </h3>
        <p className="text-[13px] font-bold text-mute">
          By {registry.parent_name} · Event Date: {registry.event_date}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="btn-press rounded-pill border-2.5 border-ink bg-white px-4 py-1.5 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-cream"
          >
            {copied ? "✓ Registry Link Copied!" : "🔗 Share Registry Link"}
          </button>
        </div>
      </div>

      <h4 className="font-display text-[16px] font-extrabold text-ink mb-2">
        Wishlist Items ({regProducts.length})
      </h4>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {regProducts.map(({ item, product }) => {
          if (!product) return null;
          return (
            <div
              key={product.id}
              className="flex items-center justify-between rounded-card border-2.5 border-ink bg-white p-3 shadow-hard-2"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-tile overflow-hidden shrink-0">
                  <Art emoji={product.emoji} bg={product.tile_color} ratio="tile" />
                </div>
                <div>
                  <div className="font-display text-[15px] font-extrabold text-ink">{product.name_en}</div>
                  <div className="text-[13px] font-extrabold text-brand">{inr(product.price)}</div>
                </div>
              </div>

              <Btn
                small
                bg="#D6E8B0"
                color="#2B2140"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
              >
                🎁 Gift This Item
              </Btn>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
