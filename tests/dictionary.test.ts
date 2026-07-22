import { describe, expect, it } from "vitest";
import { LANGUAGES, dictionaries, translate } from "@/lib/i18n/dictionary";

/**
 * TypeScript already forces the Tamil table to have every English key. What it
 * cannot check is the *content*: a key left as an empty string, or a Tamil
 * string that dropped the {time} placeholder the countdown interpolates into.
 * Both render as visibly broken UI for Tamil readers only — the half of the
 * audience least likely to be the one testing the site.
 */

const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();

describe("dictionary", () => {
  it("has a non-empty string for every key in every language", () => {
    for (const lang of LANGUAGES) {
      for (const [key, value] of Object.entries(dictionaries[lang])) {
        expect(value.trim(), `${lang}.${key} is empty`).not.toBe("");
      }
    }
  });

  it("uses the same interpolation placeholders in Tamil as in English", () => {
    for (const key of Object.keys(dictionaries.en) as (keyof typeof dictionaries.en)[]) {
      expect(placeholders(dictionaries.ta[key]), `mismatch on "${key}"`).toEqual(
        placeholders(dictionaries.en[key]),
      );
    }
  });

  it("leaves no Tamil entry as an untranslated copy of the English", () => {
    // Keys that are legitimately the same in both tables:
    //   nav.language — the toggle shows the *other* language's own name
    //   auth.otp     — "OTP" is the borrowed term Tamil UI uses as-is
    const allowed = new Set(["nav.language", "auth.otp"]);
    const identical = (Object.keys(dictionaries.en) as (keyof typeof dictionaries.en)[])
      .filter((k) => !allowed.has(k))
      .filter((k) => dictionaries.ta[k] === dictionaries.en[k]);

    expect(identical).toEqual([]);
  });
});

describe("translate()", () => {
  it("interpolates named variables", () => {
    expect(translate("en", "ribbon.countdown", { time: "2h 10m" })).toContain("2h 10m");
  });

  it("leaves an unsupplied placeholder visible rather than printing undefined", () => {
    expect(translate("en", "ribbon.countdown", {})).toContain("{time}");
  });

  it("falls back to English for a key missing from the other language", () => {
    // Simulates a key added to en and not yet to ta.
    const key = "shop.addToCart" as const;
    const saved = dictionaries.ta[key];
    // @ts-expect-error — deliberately blanking a key to test the fallback path
    delete dictionaries.ta[key];
    expect(translate("ta", key)).toBe(dictionaries.en[key]);
    dictionaries.ta[key] = saved;
  });
});
