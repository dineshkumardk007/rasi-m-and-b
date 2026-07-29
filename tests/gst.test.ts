import { describe, expect, it } from "vitest";
import {
  invoiceLines,
  splitGstInclusive,
  totalTax,
  totalTaxable,
} from "@/lib/gst";

/**
 * The tax invoice is a legal document, and its arithmetic previously lived
 * inline in a page component with no test at all. The property that matters
 * most: the split must reconcile exactly with what the customer was charged.
 */

describe("GST on inclusive prices", () => {
  it("splits a 12% inclusive price into taxable value and tax", () => {
    // ₹560 at 12% → 560 / 1.12 = 500 taxable, 60 tax
    expect(splitGstInclusive(560, 12)).toEqual({
      gross: 560,
      taxable: 500,
      tax: 60,
      rate: 12,
    });
  });

  it("splits a 5% inclusive price", () => {
    // ₹525 at 5% → 500 taxable, 25 tax
    expect(splitGstInclusive(525, 5)).toEqual({
      gross: 525,
      taxable: 500,
      tax: 25,
      rate: 5,
    });
  });

  it("always reconciles: taxable + tax equals the amount charged", () => {
    // Rounding the taxable value and taking tax as the remainder is what keeps
    // this true. Rounding both independently leaves the invoice off by a rupee.
    for (const gross of [1, 7, 99, 449, 585, 1299, 2347, 9999]) {
      for (const rate of [0, 5, 12, 18, 28]) {
        const s = splitGstInclusive(gross, rate);
        expect(s.taxable + s.tax).toBe(gross);
      }
    }
  });

  it("treats a zero rate as entirely taxable value", () => {
    expect(splitGstInclusive(500, 0)).toEqual({
      gross: 500,
      taxable: 500,
      tax: 0,
      rate: 0,
    });
  });

  it("multiplies by quantity before splitting", () => {
    const [line] = invoiceLines(
      [{ product_id: "p1", name_snapshot: "Swaddle", price_snapshot: 560, qty: 3 }],
      () => 12,
    );
    expect(line!.gross).toBe(1680);
    expect(line!.taxable + line!.tax).toBe(1680);
  });

  it("applies each product's own rate across a mixed basket", () => {
    const rates: Record<string, number> = { p1: 12, p2: 5 };
    const lines = invoiceLines(
      [
        { product_id: "p1", name_snapshot: "Swaddle", price_snapshot: 560, qty: 1 },
        { product_id: "p2", name_snapshot: "Cereal", price_snapshot: 525, qty: 1 },
      ],
      (id) => rates[id ?? ""] ?? 12,
    );
    expect(lines.map((l) => l.tax)).toEqual([60, 25]);
    expect(totalTax(lines)).toBe(85);
    expect(totalTaxable(lines)).toBe(1000);
  });

  it("falls back to the default rate for an unknown product", () => {
    const lines = invoiceLines(
      [{ product_id: null, name_snapshot: "Deleted item", price_snapshot: 560, qty: 1 }],
      (id) => (id === null ? 12 : 5),
    );
    expect(lines[0]!.rate).toBe(12);
    expect(lines[0]!.tax).toBe(60);
  });

  it("totals reconcile with the sum of the lines charged", () => {
    const lines = invoiceLines(
      [
        { product_id: "p1", name_snapshot: "A", price_snapshot: 449, qty: 2 },
        { product_id: "p2", name_snapshot: "B", price_snapshot: 1299, qty: 1 },
        { product_id: "p3", name_snapshot: "C", price_snapshot: 97, qty: 3 },
      ],
      () => 18,
    );
    const charged = lines.reduce((s, l) => s + l.gross, 0);
    expect(totalTaxable(lines) + totalTax(lines)).toBe(charged);
  });
});
