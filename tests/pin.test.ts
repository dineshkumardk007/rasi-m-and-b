import { describe, expect, it } from "vitest";
import { formatPinSummary, isPinMatch, isPinServiceable, parsePinInput } from "@/lib/pin";

describe("isPinMatch()", () => {
  it("matches exact 6-digit PINs", () => {
    expect(isPinMatch("628001", "628001")).toBe(true);
    expect(isPinMatch("628001", "628002")).toBe(false);
  });

  it("matches PIN ranges", () => {
    expect(isPinMatch("628005", "628001-628010")).toBe(true);
    expect(isPinMatch("628001", "628001-628010")).toBe(true);
    expect(isPinMatch("628010", "628001-628010")).toBe(true);
    expect(isPinMatch("628011", "628001-628010")).toBe(false);
    expect(isPinMatch("628000", "628001-628010")).toBe(false);
  });

  it("matches wildcard prefixes", () => {
    expect(isPinMatch("628001", "628*")).toBe(true);
    expect(isPinMatch("628999", "628*")).toBe(true);
    expect(isPinMatch("627001", "628*")).toBe(false);
    expect(isPinMatch("600001", "62*")).toBe(false);
    expect(isPinMatch("628001", "628")).toBe(true);
  });
});

describe("isPinServiceable()", () => {
  it("evaluates serviceability against allowed list", () => {
    const allowed = ["628001", "628002", "628003-628010", "627*"];
    expect(isPinServiceable("628001", allowed).serviceable).toBe(true);
    expect(isPinServiceable("628005", allowed).serviceable).toBe(true);
    expect(isPinServiceable("627123", allowed).serviceable).toBe(true);
    expect(isPinServiceable("600001", allowed).serviceable).toBe(false);
  });

  it("respects unserviceable/excluded PIN overrides", () => {
    const allowed = ["628*"];
    const excluded = ["628099"];
    expect(isPinServiceable("628001", allowed, excluded).serviceable).toBe(true);
    expect(isPinServiceable("628099", allowed, excluded).serviceable).toBe(false);
    expect(isPinServiceable("628099", allowed, excluded).isExcluded).toBe(true);
  });
});

describe("parsePinInput()", () => {
  it("cleans and extracts valid PIN patterns", () => {
    const raw = " 628001, 628002-628010 \n 628* , invalid, 628001 ";
    const parsed = parsePinInput(raw);
    expect(parsed).toEqual(["628001", "628002-628010", "628*"]);
  });
});

describe("formatPinSummary()", () => {
  it("formats patterns for display", () => {
    expect(formatPinSummary(["628001", "628002-628010", "628*"])).toBe(
      "628001, Range 628002-628010, Prefix 628*",
    );
  });
});
