"use client";

/**
 * Phase 0 placeholder home: a design-token showcase used to verify the
 * "Playful Sticker" system before Phase 1 builds the real storefront.
 * Every element here exercises a token from Section 3 of the spec.
 */
import { useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { BUSINESS, CATEGORIES, CATEGORY_META, type Category } from "@/lib/constants";

export default function TokenShowcase() {
  const { lang, setLang, t } = useT();
  const [selected, setSelected] = useState<Category | null>(null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      {/* Ribbon */}
      <div className="rounded-card border-3 border-ink bg-ink px-4 py-2 text-center font-display font-700 text-ribbon">
        {t("ribbon.sameDay", { cutoff: "4 PM" })}
      </div>

      {/* Header row: brand + language toggle */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 place-items-center rounded-tile border-2.5 border-ink bg-brand font-display text-2xl font-extrabold text-paper shadow-hard-3"
          >
            ர
          </span>
          <h1 className="font-display text-3xl font-extrabold">
            {t("brand.name")}
          </h1>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "ta" : "en")}
          className="btn-press rounded-pill border-3 border-ink bg-paper px-5 py-2 font-display font-bold shadow-hard-3"
        >
          {t("nav.language")}
        </button>
      </header>

      {/* Hero headline typography check */}
      <section className="space-y-2">
        <span className="inline-block rounded-pill border-2.5 border-ink bg-paper px-4 py-1 font-display font-bold shadow-hard-3">
          {t("ribbon.rating")}
        </span>
        <h2 className="font-display text-5xl font-extrabold leading-tight">
          {t("hero.headline1")}
          <br />
          <span className="text-brand">{t("hero.headline2")}</span>
        </h2>
        <p className="max-w-xl text-lg text-mute">
          {t("hero.sub", { cutoff: "4 PM" })}
        </p>
        <div className="flex gap-4 pt-2">
          <button className="btn-press rounded-pill border-3 border-ink bg-brand px-6 py-3 font-display font-bold text-paper shadow-hard-3">
            {t("hero.ctaShop")}
          </button>
          <button className="btn-press rounded-pill border-3 border-ink bg-paper px-6 py-3 font-display font-bold shadow-hard-3">
            {t("hero.ctaBrowse")}
          </button>
        </div>
      </section>

      {/* Category grid — hover lift + pressed-in selection */}
      <section>
        <h3 className="mb-4 font-display text-2xl font-extrabold">
          {t("plp.shopByCategory")}
        </h3>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isSelected = selected === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelected(isSelected ? null : cat)}
                style={{ backgroundColor: meta.bg }}
                className={`pop flex flex-col items-center gap-2 rounded-tile-lg border-2.5 border-ink p-4 shadow-hard-5 ${
                  isSelected ? "tile-pressed" : ""
                }`}
              >
                <span className="grid h-14 w-14 place-items-center rounded-full border-2.5 border-ink bg-paper text-2xl">
                  {meta.emoji}
                </span>
                <span className="font-display font-bold">
                  {t(`category.${cat}`)}
                </span>
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: meta.pop }}
                >
                  {isSelected ? t("category.selected") : t("category.browse")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Card + emoji tile check */}
      <section className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {(
          [
            ["🍼", "feeding"],
            ["🧸", "toys"],
            ["🛁", "bath"],
            ["👗", "clothing"],
          ] as const
        ).map(([emoji, cat]) => (
          <div
            key={cat}
            className="pop rounded-card border-2.5 border-ink bg-paper p-3 shadow-hard-4"
          >
            <div
              className="grid aspect-square place-items-center rounded-tile border-2.5 border-ink text-5xl"
              style={{ backgroundColor: CATEGORY_META[cat].bg }}
            >
              {emoji}
            </div>
            <p className="mt-2 font-display font-bold">{t(`category.${cat}`)}</p>
            <p className="text-sm text-mute">{t("common.rupees", { amount: 499 })}</p>
          </div>
        ))}
      </section>

      {/* Toast sample */}
      <div className="mx-auto w-fit rounded-pill border-2.5 border-ink bg-ink px-6 py-2 font-display font-bold text-ribbon shadow-hard-3">
        {t("toast.addedToCart")}
      </div>

      {/* Footer band */}
      <footer className="rounded-card border-t-4 border-3 border-ink bg-brand p-6 text-paper">
        <p className="font-display text-xl font-extrabold">{t("footer.visit")}</p>
        <p>{BUSINESS.address}</p>
        <p>{t("footer.hours", { opensAt: BUSINESS.opensAt })}</p>
      </footer>
    </main>
  );
}
