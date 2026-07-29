"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useSession } from "@/lib/store/SessionProvider";
import {
  MILESTONE_META,
  glowStyle,
  inr,
  type Milestone,
} from "@/lib/constants";
import {
  BIRTHDAY_COUPON_CODE,
  BIRTHDAY_COUPON_PERCENT,
} from "@/lib/baby-club";
import {
  ageInMonths,
  daysToBirthday,
  formatAge,
  isBirthdayMonth,
  milestoneForDob,
  nextMilestone,
} from "@/lib/baby";
import { myBabyDobAction, saveBabyDobAction } from "@/app/customer-actions";
import { Art, Btn, Card } from "@/components/ui";

/**
 * Baby birthday club.
 *
 * A parent stores one date; from it the storefront shows an age-matched strip,
 * a heads-up before the next stage, and a birthday-month discount. This is the
 * reason to shop a specialist baby store rather than a marketplace, so it sits
 * high on the page — but only for signed-in customers, and it stays silent
 * until a date is actually saved.
 */
export function BabyClub({
  products,
  addToCart,
  openProduct,
}: {
  products: Product[];
  addToCart: (id: string) => void;
  openProduct?: (p: Product) => void;
}) {
  const { t, lang } = useT();
  const { session } = useSession();

  const [dob, setDob] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setDob(null);
      setLoaded(false);
      return;
    }
    myBabyDobAction().then((value) => {
      if (cancelled) return;
      setDob(value);
      setDraft(value ?? "");
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session || !loaded) return null;

  const save = async (value: string | null) => {
    setSaving(true);
    setError(null);
    const res = await saveBabyDobAction(value);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save.");
      return;
    }
    setDob(value);
    setEditing(false);
  };

  /* ── No date yet: a single, low-friction prompt ─────────────────────────── */
  if (!dob) {
    return (
      <div className="mx-auto max-w-[1080px] px-5 pt-[18px]">
        <Card className="p-4" style={glowStyle("#FBD0EA")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[30px]">👶</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[18px] font-extrabold">{t("baby.addDob")}</h2>
              <p className="mt-0.5 text-[13px] text-mute">{t("baby.dobHelp")}</p>
            </div>
            {!editing && (
              <Btn small bg="#FFE1A8" color="#2B2140" onClick={() => setEditing(true)}>
                {t("baby.addDob")}
              </Btn>
            )}
          </div>

          {editing && (
            <div className="mt-3 flex flex-wrap items-end gap-2.5">
              <label className="min-w-[200px] flex-1">
                <span className="font-display text-[11px] font-extrabold uppercase text-mute">
                  {t("baby.dobLabel")}
                </span>
                <input
                  type="date"
                  value={draft}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDraft(e.target.value)}
                  className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] outline-none"
                />
              </label>
              <Btn small disabled={saving || !draft} onClick={() => save(draft)}>
                {saving ? "…" : t("baby.save")}
              </Btn>
              <Btn small bg="#F2EAE0" color="#2B2140" onClick={() => setEditing(false)}>
                ✕
              </Btn>
            </div>
          )}
          {error && <p className="mt-2 text-[13px] font-bold text-[#E24B4A]">{error}</p>}
        </Card>
      </div>
    );
  }

  /* ── Date saved: age-matched picks ──────────────────────────────────────── */
  const months = ageInMonths(dob);
  const milestone = milestoneForDob(dob);
  const age = formatAge(months, lang);
  const upcoming = nextMilestone(dob);
  const birthdayMonth = isBirthdayMonth(dob);
  const days = daysToBirthday(dob);

  const picks = milestone
    ? products.filter((p) => p.milestone === (milestone as Milestone) && p.stock > 0).slice(0, 8)
    : [];

  return (
    <div className="mx-auto max-w-[1080px] px-5 pt-[18px]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-[22px] font-extrabold">
          {milestone ? t("baby.pickedFor", { age }) : t("baby.title")}
        </h2>
        <button
          type="button"
          onClick={() => {
            setDraft(dob);
            setEditing(true);
          }}
          className="text-[12px] font-bold text-mute underline"
        >
          ✏️
        </button>
      </div>

      {/* Birthday perk — the month itself, or a countdown when it's close */}
      {birthdayMonth ? (
        <Card className="mb-3 p-3" style={glowStyle("#FFCBD9")}>
          <p className="font-display text-[15px] font-extrabold">
            {t("baby.birthdayMonth", {
              code: BIRTHDAY_COUPON_CODE,
              percent: BIRTHDAY_COUPON_PERCENT,
            })}
          </p>
        </Card>
      ) : days !== null && days <= 30 ? (
        <Card className="mb-3 p-3" style={glowStyle("#FFE1A8")}>
          <p className="font-display text-[14px] font-extrabold">
            {t("baby.birthdaySoon", { days })}
          </p>
        </Card>
      ) : null}

      {editing && (
        <Card className="mb-3 p-3">
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="min-w-[200px] flex-1">
              <span className="font-display text-[11px] font-extrabold uppercase text-mute">
                {t("baby.dobLabel")}
              </span>
              <input
                type="date"
                value={draft}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDraft(e.target.value)}
                className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] outline-none"
              />
            </label>
            <Btn small disabled={saving || !draft} onClick={() => save(draft)}>
              {saving ? "…" : t("baby.save")}
            </Btn>
            <Btn small bg="#FFCBD9" color="#2B2140" onClick={() => save(null)}>
              {t("baby.remove")}
            </Btn>
            <Btn small bg="#F2EAE0" color="#2B2140" onClick={() => setEditing(false)}>
              ✕
            </Btn>
          </div>
          {error && <p className="mt-2 text-[13px] font-bold text-[#E24B4A]">{error}</p>}
        </Card>
      )}

      {/* Outgrown the age guide — say so instead of showing nothing */}
      {!milestone && <p className="text-[14px] text-mute">{t("baby.graduated")}</p>}

      {picks.length > 0 && (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {picks.map((p) => (
              <Card
                key={p.id}
                className={`pop glow-card w-40 shrink-0 p-2.5 ${
                  openProduct ? "cursor-pointer group hover:border-brand" : ""
                }`}
                style={glowStyle(p.tile_color)}
                onClick={() => openProduct?.(p)}
              >
                <Art emoji={p.emoji} bg={p.tile_color} h={90} image={p.images[0]} alt={p.name_en} />
                <div className="mt-2 text-[12px] font-bold leading-[1.2] group-hover:text-brand transition-colors">
                  {lang === "ta" ? p.name_ta : p.name_en}
                </div>
                <div className="mt-1 font-display font-extrabold text-brand">{inr(p.price)}</div>
                <div className="mt-2" onClick={(e) => openProduct && e.stopPropagation()}>
                  <Btn small full onClick={() => addToCart(p.id)}>
                    {t("buyAgain.add")}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>

          {upcoming && (
            <p className="mt-1 text-[13px] text-mute">
              {t("baby.nextStage", { months: upcoming.inMonths })}{" "}
              <span className="font-bold text-ink">
                {MILESTONE_META[upcoming.milestone].emoji}{" "}
                {lang === "ta"
                  ? MILESTONE_META[upcoming.milestone].shortTa
                  : MILESTONE_META[upcoming.milestone].shortEn}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
