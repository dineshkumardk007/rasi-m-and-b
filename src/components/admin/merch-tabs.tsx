"use client";

/**
 * Admin for the merchandising rows: home-page banners and brands.
 *
 * Both follow the pattern the products tab set — a list with an edit modal,
 * uploads that land in storage immediately and are only attached to a row when
 * the form is saved, so an abandoned form leaves an orphan object rather than a
 * half-saved record.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Banner, BannerSlot, Brand } from "@/lib/types";
import { Badge, Btn, Card, Field, Modal, Pill } from "@/components/ui";
import { MERCH_IMAGE_SPECS, type MerchImageKind } from "@/lib/merch-image-specs";
import { isBannerLive } from "@/lib/merchandising";
import {
  deleteBannerAction,
  deleteBrandAction,
  uploadMerchImageAction,
  upsertBannerAction,
  upsertBrandAction,
} from "@/app/admin/actions";

/** Shared uploader: pick a file, get back a URL already fitted to the slot. */
function ImagePicker({
  kind,
  slugHint,
  value,
  onChange,
  aspect,
}: {
  kind: MerchImageKind;
  slugHint: string;
  value: string;
  onChange: (url: string) => void;
  aspect: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spec = MERCH_IMAGE_SPECS[kind];

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    fd.append("slug", slugHint || kind);

    const res = await uploadMerchImageAction(fd);
    if (res.ok) onChange(res.url);
    else setError(res.error);
    setBusy(false);
  };

  return (
    <div className="mb-3">
      <span className="font-display text-[12px] font-extrabold uppercase text-mute">
        Image · {spec.label}
      </span>

      {value && (
        <div
          className={`mt-1.5 ${aspect} w-full overflow-hidden rounded-tile border-2.5 border-ink bg-white`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of a just-uploaded object */}
          <img src={value} alt="" className="h-full w-full object-contain" />
        </div>
      )}

      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-tile border-2.5 border-dashed border-ink bg-paper px-4 py-2.5 font-display text-[13px] font-extrabold">
        {busy ? "Fitting to the slot…" : value ? "Replace image" : "Choose image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy}
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="hidden"
        />
      </label>

      {error && <p className="mt-1.5 text-[12px] font-bold text-[#E24B4A]">{error}</p>}
    </div>
  );
}

/** `2026-07-30T18:30:00.000Z` ⇄ the `datetime-local` the browser wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/* ── Banners ─────────────────────────────────────────────────────────────── */

export function BannersTab({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  const hero = banners.filter((b) => b.slot === "hero");
  const mid = banners.filter((b) => b.slot === "mid");

  const remove = async (banner: Banner) => {
    await deleteBannerAction(banner.id);
    setConfirmDelete(null);
    router.refresh();
  };

  const row = (banner: Banner) => {
    const live = isBannerLive(banner);
    return (
      <Card key={banner.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <div className="aspect-[3/1] w-[180px] shrink-0 overflow-hidden rounded-tile border-2.5 border-ink bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail */}
          <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold">{banner.alt || "Untitled banner"}</span>
            <Badge bg={live ? "#D6E8B0" : "#F2EAE0"}>{live ? "Live" : "Not showing"}</Badge>
            {!banner.active && <Badge bg="#FFCBD9">Switched off</Badge>}
          </div>
          <div className="mt-1 text-[12px] text-mute">
            Position {banner.sort}
            {banner.link_url ? ` · links to ${banner.link_url}` : " · no link"}
          </div>
          <div className="text-[12px] text-mute">
            {banner.starts_at || banner.ends_at
              ? `${banner.starts_at ? new Date(banner.starts_at).toLocaleString("en-IN") : "always"} → ${
                  banner.ends_at ? new Date(banner.ends_at).toLocaleString("en-IN") : "always"
                }`
              : "No schedule"}
          </div>
        </div>

        <div className="flex gap-2">
          <Btn small bg="#F2EAE0" color="#2B2140" onClick={() => setEditing(banner)}>
            Edit
          </Btn>
          <Btn small bg="#FFCBD9" color="#2B2140" onClick={() => setConfirmDelete(banner)}>
            Delete
          </Btn>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Btn onClick={() => setEditing("new")}>➕ Add banner</Btn>
        <p className="text-[12px] text-mute">
          Hero slides rotate at the top of the home page. The mid slot shows one banner
          between the bundles and the Baby Club.
        </p>
      </div>

      <h3 className="mb-2 font-display text-[16px] font-extrabold uppercase text-mute">
        Hero carousel ({hero.length})
      </h3>
      <div className="mb-5 grid gap-3">
        {hero.length === 0 ? (
          <p className="text-[13px] text-mute">
            No hero banners yet — the home page shows the built-in hero until you add one.
          </p>
        ) : (
          hero.map(row)
        )}
      </div>

      <h3 className="mb-2 font-display text-[16px] font-extrabold uppercase text-mute">
        Mid-page promo ({mid.length})
      </h3>
      <div className="grid gap-3">
        {mid.length === 0 ? (
          <p className="text-[13px] text-mute">Nothing in the mid slot.</p>
        ) : (
          mid.map(row)
        )}
      </div>

      {editing && (
        <BannerForm
          banner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h3 className="mb-2 font-display text-[20px] font-extrabold">Delete this banner?</h3>
          <p className="mb-4 text-[14px] text-mute">
            It disappears from the home page immediately. The image stays in storage.
          </p>
          <div className="flex gap-2.5">
            <Btn full bg="#F2EAE0" color="#2B2140" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Btn>
            <Btn full onClick={() => void remove(confirmDelete)}>
              Delete
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BannerForm({
  banner,
  onClose,
  onSaved,
}: {
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    slot: (banner?.slot ?? "hero") as BannerSlot,
    image_url: banner?.image_url ?? "",
    alt: banner?.alt ?? "",
    link_url: banner?.link_url ?? "",
    sort: String(banner?.sort ?? 0),
    starts_at: toLocalInput(banner?.starts_at ?? null),
    ends_at: toLocalInput(banner?.ends_at ?? null),
    active: banner?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!f.image_url) {
      setError("Choose an image first.");
      return;
    }
    setSaving(true);
    setError(null);

    const id = await upsertBannerAction({
      ...(banner ? { id: banner.id } : {}),
      slot: f.slot,
      image_url: f.image_url,
      alt: f.alt.trim(),
      link_url: f.link_url.trim() || null,
      sort: Number(f.sort) || 0,
      starts_at: fromLocalInput(f.starts_at),
      ends_at: fromLocalInput(f.ends_at),
      active: f.active,
    });

    if (!id) {
      setSaving(false);
      setError("Could not save this banner. Check the fields and try again.");
      return;
    }
    onSaved();
  };

  return (
    <Modal onClose={onClose} wide>
      <h3 className="mb-3.5 font-display text-[24px] font-extrabold">
        {banner ? "Edit banner" : "Add banner"}
      </h3>

      <div className="mb-3">
        <span className="font-display text-[12px] font-extrabold uppercase text-mute">Slot</span>
        <div className="mt-2 flex gap-2">
          {(["hero", "mid"] as BannerSlot[]).map((slot) => (
            <Pill
              key={slot}
              bg={f.slot === slot ? "#D6E8B0" : "#F2EAE0"}
              onClick={() => setF({ ...f, slot })}
            >
              {slot === "hero" ? "Hero carousel" : "Mid-page promo"}
              {f.slot === slot ? " ✓" : ""}
            </Pill>
          ))}
        </div>
      </div>

      <ImagePicker
        kind="banner"
        slugHint={f.alt || f.slot}
        value={f.image_url}
        onChange={(url) => setF({ ...f, image_url: url })}
        aspect="aspect-[3/1]"
      />

      <Field
        label="Description (for screen readers)"
        value={f.alt}
        onChange={(v) => setF({ ...f, alt: v })}
        placeholder="Diwali offers on baby care"
      />
      <Field
        label="Links to (optional)"
        value={f.link_url}
        onChange={(v) => setF({ ...f, link_url: v })}
        placeholder="/c/diapering"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="Position"
          type="number"
          inputMode="numeric"
          value={f.sort}
          onChange={(v) => setF({ ...f, sort: v })}
        />
        <label className="mb-3 block">
          <span className="font-display text-[12px] font-extrabold uppercase text-mute">
            Starts (optional)
          </span>
          <input
            type="datetime-local"
            value={f.starts_at}
            onChange={(e) => setF({ ...f, starts_at: e.target.value })}
            className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2.5 font-body text-[14px] outline-none"
          />
        </label>
        <label className="mb-3 block">
          <span className="font-display text-[12px] font-extrabold uppercase text-mute">
            Ends (optional)
          </span>
          <input
            type="datetime-local"
            value={f.ends_at}
            onChange={(e) => setF({ ...f, ends_at: e.target.value })}
            className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2.5 font-body text-[14px] outline-none"
          />
        </label>
      </div>

      <label className="mb-4 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={f.active}
          onChange={(e) => setF({ ...f, active: e.target.checked })}
          className="h-5 w-5 accent-[#EC5D8A]"
        />
        <span className="text-[14px] font-bold">Switched on</span>
      </label>

      {error && <p className="mb-3 text-[13px] font-bold text-[#E24B4A]">{error}</p>}

      <div className="flex gap-2.5">
        <Btn full bg="#F2EAE0" color="#2B2140" onClick={onClose}>
          Cancel
        </Btn>
        <Btn full disabled={saving} onClick={() => void save()}>
          {banner ? "Save changes" : "Add banner"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Brands ──────────────────────────────────────────────────────────────── */

export function BrandsTab({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);

  const remove = async (brand: Brand) => {
    await deleteBrandAction(brand.id);
    setConfirmDelete(null);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Btn onClick={() => setEditing("new")}>➕ Add brand</Btn>
        <p className="text-[12px] text-mute">
          Brands appear as a logo rail on the home page and each gets its own page at
          /brand/slug.
        </p>
      </div>

      <div className="grid gap-3">
        {brands.length === 0 && (
          <p className="text-[13px] text-mute">
            No brands yet — the logo rail stays hidden until you add one.
          </p>
        )}
        {brands.map((brand) => (
          <Card key={brand.id} className="flex items-center gap-3 p-3.5">
            <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-tile border-2.5 border-ink bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail */}
              <img src={brand.logo_url} alt="" className="h-full w-full object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold">{brand.name}</span>
                {!brand.active && <Badge bg="#FFCBD9">Hidden</Badge>}
              </div>
              <div className="text-[12px] text-mute">
                /brand/{brand.slug} · position {brand.sort}
              </div>
            </div>
            <div className="flex gap-2">
              <Btn small bg="#F2EAE0" color="#2B2140" onClick={() => setEditing(brand)}>
                Edit
              </Btn>
              <Btn small bg="#FFCBD9" color="#2B2140" onClick={() => setConfirmDelete(brand)}>
                Delete
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <BrandForm
          brand={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h3 className="mb-2 font-display text-[20px] font-extrabold">
            Delete {confirmDelete.name}?
          </h3>
          <p className="mb-4 text-[14px] text-mute">
            Products keep their brand name and stay on sale — they only lose the logo link.
          </p>
          <div className="flex gap-2.5">
            <Btn full bg="#F2EAE0" color="#2B2140" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Btn>
            <Btn full onClick={() => void remove(confirmDelete)}>
              Delete
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BrandForm({
  brand,
  onClose,
  onSaved,
}: {
  brand: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    logo_url: brand?.logo_url ?? "",
    sort: String(brand?.sort ?? 0),
    active: brand?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Keep the slug in step with the name until someone edits it by hand. */
  const setName = (name: string) => {
    const auto = f.slug === "" || f.slug === slugFrom(f.name);
    setF({ ...f, name, slug: auto ? slugFrom(name) : f.slug });
  };

  const save = async () => {
    if (!f.logo_url) {
      setError("Choose a logo first.");
      return;
    }
    setSaving(true);
    setError(null);

    const id = await upsertBrandAction({
      ...(brand ? { id: brand.id } : {}),
      name: f.name,
      slug: f.slug,
      logo_url: f.logo_url,
      sort: Number(f.sort) || 0,
      active: f.active,
    });

    if (!id) {
      setSaving(false);
      setError("Could not save. Check the name and that the web address is not already used.");
      return;
    }
    onSaved();
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3.5 font-display text-[24px] font-extrabold">
        {brand ? "Edit brand" : "Add brand"}
      </h3>

      <Field label="Brand name" value={f.name} onChange={setName} placeholder="Sebamed" />
      <Field
        label="Web address (/brand/…)"
        value={f.slug}
        onChange={(v) => setF({ ...f, slug: slugFrom(v) })}
        placeholder="sebamed"
      />

      <ImagePicker
        kind="brandLogo"
        slugHint={f.slug || f.name}
        value={f.logo_url}
        onChange={(url) => setF({ ...f, logo_url: url })}
        aspect="aspect-square max-w-[160px]"
      />

      <Field
        label="Position"
        type="number"
        inputMode="numeric"
        value={f.sort}
        onChange={(v) => setF({ ...f, sort: v })}
      />

      <label className="mb-4 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={f.active}
          onChange={(e) => setF({ ...f, active: e.target.checked })}
          className="h-5 w-5 accent-[#EC5D8A]"
        />
        <span className="text-[14px] font-bold">Show on the storefront</span>
      </label>

      {error && <p className="mb-3 text-[13px] font-bold text-[#E24B4A]">{error}</p>}

      <div className="flex gap-2.5">
        <Btn full bg="#F2EAE0" color="#2B2140" onClick={onClose}>
          Cancel
        </Btn>
        <Btn full disabled={saving} onClick={() => void save()}>
          {brand ? "Save changes" : "Add brand"}
        </Btn>
      </div>
    </Modal>
  );
}

function slugFrom(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
