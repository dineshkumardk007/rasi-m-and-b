import { describe, expect, it } from "vitest";
import {
  bannerUrlFor,
  isManagedTileUrl,
  MIN_SOURCE_LONG_EDGE,
  objectPathFromUrl,
  originalObjectPath,
  publicUrlFor,
  relatedObjectPaths,
  renditionObjectPath,
  validateDimensions,
  validateImage,
} from "@/lib/images";

const SUPABASE = "https://abcdefgh.supabase.co";
const url = (path: string) => publicUrlFor(SUPABASE, path);

describe("rendition object paths", () => {
  it("names each rendition off a shared stem", () => {
    expect(renditionObjectPath("Muslin Swaddle", "stem123", "tile")).toBe(
      "muslin-swaddle/stem123-tile.webp",
    );
    expect(renditionObjectPath("Muslin Swaddle", "stem123", "banner")).toBe(
      "muslin-swaddle/stem123-banner.webp",
    );
  });

  it("keeps the original's own extension", () => {
    expect(originalObjectPath("Muslin Swaddle", "stem123", "image/png")).toBe(
      "muslin-swaddle/stem123-original.png",
    );
    expect(originalObjectPath("Muslin Swaddle", "stem123", "image/jpeg")).toBe(
      "muslin-swaddle/stem123-original.jpg",
    );
  });

  it("falls back to a usable folder for an unnameable product", () => {
    expect(renditionObjectPath("!!!", "stem123", "tile")).toBe("product/stem123-tile.webp");
  });
});

describe("bannerUrlFor", () => {
  it("derives the banner from the stored tile URL", () => {
    expect(bannerUrlFor(url("swaddle/stem123-tile.webp"))).toBe(
      url("swaddle/stem123-banner.webp"),
    );
  });

  it("leaves legacy uploads alone so old rows keep rendering", () => {
    const legacy = url("swaddle/stem123.jpg");
    expect(bannerUrlFor(legacy)).toBe(legacy);
  });

  it("leaves externally hosted images alone", () => {
    const external = "https://images.example.com/photo.jpg";
    expect(bannerUrlFor(external)).toBe(external);
  });

  it("does not mistake a product folder named 'tile' for a rendition", () => {
    const legacy = url("tile/stem123.webp");
    expect(bannerUrlFor(legacy)).toBe(legacy);
  });
});

describe("isManagedTileUrl", () => {
  it("recognises our own tiles", () => {
    expect(isManagedTileUrl(url("swaddle/stem123-tile.webp"))).toBe(true);
  });

  it("rejects legacy and external URLs", () => {
    expect(isManagedTileUrl(url("swaddle/stem123.jpg"))).toBe(false);
    expect(isManagedTileUrl("https://images.example.com/stem123-tile.webp")).toBe(false);
  });
});

describe("relatedObjectPaths", () => {
  it("covers both renditions and every possible original", () => {
    const paths = relatedObjectPaths(url("swaddle/stem123-tile.webp"));
    expect(paths).toContain("swaddle/stem123-tile.webp");
    expect(paths).toContain("swaddle/stem123-banner.webp");
    expect(paths).toContain("swaddle/stem123-original.jpg");
    expect(paths).toContain("swaddle/stem123-original.png");
  });

  it("deletes just the one file for a legacy upload", () => {
    expect(relatedObjectPaths(url("swaddle/stem123.jpg"))).toEqual(["swaddle/stem123.jpg"]);
  });

  it("refuses to touch anything hosted elsewhere", () => {
    expect(relatedObjectPaths("https://images.example.com/photo.jpg")).toEqual([]);
  });

  it("round-trips through objectPathFromUrl", () => {
    const path = renditionObjectPath("swaddle", "stem123", "tile");
    expect(objectPathFromUrl(url(path))).toBe(path);
  });
});

describe("validateImage", () => {
  it("accepts the formats a phone or a supplier actually sends", () => {
    expect(validateImage("image/jpeg", 2_000_000).ok).toBe(true);
    expect(validateImage("image/webp", 100).ok).toBe(true);
  });

  it("rejects non-images, oversized files and empty files", () => {
    expect(validateImage("application/pdf", 1000).ok).toBe(false);
    expect(validateImage("image/jpeg", 9_000_000).ok).toBe(false);
    expect(validateImage("image/jpeg", 0).ok).toBe(false);
  });
});

describe("validateDimensions", () => {
  it("accepts a normal phone photo in either orientation", () => {
    expect(validateDimensions(4032, 3024).ok).toBe(true);
    expect(validateDimensions(3024, 4032).ok).toBe(true);
  });

  it("accepts a photo exactly at the floor", () => {
    expect(validateDimensions(MIN_SOURCE_LONG_EDGE, 400).ok).toBe(true);
  });

  it("rejects a thumbnail, naming the size that was sent", () => {
    const result = validateDimensions(400, 300);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("400×300");
  });

  it("rejects a long thin strip that has no height to work with", () => {
    expect(validateDimensions(2000, 120).ok).toBe(false);
  });
});
