import { describe, expect, it } from "vitest";
import { GIFT_MESSAGE_MAX, normalizeGiftMessage, showPrices } from "@/lib/gift";

describe("showPrices()", () => {
  it("hides money only on gift orders", () => {
    expect(showPrices({ is_gift: true })).toBe(false);
    expect(showPrices({ is_gift: false })).toBe(true);
  });

  it("shows prices when the flag is absent — every pre-existing order", () => {
    expect(showPrices({})).toBe(true);
    expect(showPrices({ is_gift: undefined })).toBe(true);
  });
});

describe("normalizeGiftMessage()", () => {
  it("drops the message entirely when the order is not a gift", () => {
    expect(normalizeGiftMessage("Congratulations!", false)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeGiftMessage("  Welcome baby!  ", true)).toBe("Welcome baby!");
  });

  it("treats a blank message as no message", () => {
    expect(normalizeGiftMessage("   ", true)).toBeNull();
    expect(normalizeGiftMessage("", true)).toBeNull();
    expect(normalizeGiftMessage(null, true)).toBeNull();
    expect(normalizeGiftMessage(undefined, true)).toBeNull();
  });

  it("caps at the length the database constraint allows", () => {
    const long = "a".repeat(GIFT_MESSAGE_MAX + 50);
    const result = normalizeGiftMessage(long, true)!;
    // Over-long notes must be cut here; the DB check would reject the insert
    // after stock had already been decremented.
    expect(result.length).toBe(GIFT_MESSAGE_MAX);
  });
});
