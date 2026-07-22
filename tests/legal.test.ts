import { describe, expect, it } from "vitest";
import {
  LEGAL_DOCS,
  LEGAL_SHORT,
  LEGAL_TITLES,
  getLegalContent,
  type LegalVars,
} from "@/lib/legal/content";
import { LANGUAGES } from "@/lib/i18n/dictionary";

/**
 * These four documents are what Razorpay checks before activating the merchant
 * account, so "it renders at all, in both languages, with the store's real
 * numbers in it" is worth pinning down.
 */

const vars = (over: Partial<LegalVars> = {}): LegalVars => ({
  deliveryFee: "₹49",
  freeAbove: "₹999",
  codLimit: "₹3,000",
  pins: "628001, 628002",
  returnDays: 7,
  business: "Rasi Mom & Baby",
  address: "176, Palayamkottai Rd, Thoothukudi 628001",
  city: "Thoothukudi",
  cutoff: "4 PM",
  phone: null,
  email: null,
  ...over,
});

describe("policy documents", () => {
  it("builds every document in every language with real content", () => {
    for (const lang of LANGUAGES) {
      for (const doc of LEGAL_DOCS) {
        const content = getLegalContent(doc, lang, vars());

        expect(content.title).toBe(LEGAL_TITLES[lang][doc]);
        expect(content.intro.length).toBeGreaterThan(20);
        expect(content.sections.length).toBeGreaterThan(2);

        for (const section of content.sections) {
          expect(section.heading.trim()).not.toBe("");
          expect(section.body.length).toBeGreaterThan(0);
          for (const line of section.body) expect(line.trim()).not.toBe("");
        }
      }
    }
  });

  it("ends every document with a contact section", () => {
    for (const lang of LANGUAGES) {
      for (const doc of LEGAL_DOCS) {
        const { sections } = getLegalContent(doc, lang, vars());
        const last = sections.at(-1);
        expect(last?.body.join(" ")).toContain("Rasi Mom & Baby");
      }
    }
  });

  it("leaves no unresolved template placeholder in the rendered copy", () => {
    for (const lang of LANGUAGES) {
      for (const doc of LEGAL_DOCS) {
        const { intro, sections } = getLegalContent(doc, lang, vars());
        const all = [intro, ...sections.flatMap((s) => [s.heading, ...s.body])].join("\n");
        expect(all).not.toMatch(/\{\w+\}/);
        expect(all).not.toContain("undefined");
      }
    }
  });

  it("quotes the store settings it was given rather than hardcoded numbers", () => {
    const shipping = getLegalContent("shipping", "en", vars({ deliveryFee: "₹75", freeAbove: "₹1,500" }));
    const body = shipping.sections.flatMap((s) => s.body).join(" ");
    expect(body).toContain("₹75");
    expect(body).toContain("₹1,500");
    expect(body).not.toContain("₹49");
  });

  it("states the configured return window in the refund policy", () => {
    const refunds = getLegalContent("refunds", "en", vars({ returnDays: 10 }));
    expect(refunds.sections.flatMap((s) => s.body).join(" ")).toContain("10 days");
  });

  it("omits contact channels that are not configured, and shows them when they are", () => {
    const without = getLegalContent("privacy", "en", vars());
    const withoutText = without.sections.flatMap((s) => s.body).join(" ");
    expect(withoutText).not.toContain("Phone");
    expect(withoutText).not.toContain("Email");

    const withChannels = getLegalContent(
      "privacy",
      "en",
      vars({ phone: "+91 98765 43210", email: "hello@example.in" }),
    );
    const withText = withChannels.sections.flatMap((s) => s.body).join(" ");
    expect(withText).toContain("+91 98765 43210");
    expect(withText).toContain("hello@example.in");
  });

  it("has a short label and a title for every document in both languages", () => {
    for (const lang of LANGUAGES) {
      for (const doc of LEGAL_DOCS) {
        expect(LEGAL_SHORT[lang][doc].trim()).not.toBe("");
        expect(LEGAL_TITLES[lang][doc].trim()).not.toBe("");
      }
    }
  });
});
