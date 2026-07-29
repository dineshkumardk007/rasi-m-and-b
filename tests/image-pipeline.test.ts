/**
 * Geometry tests for the automated fitting. These render real images through
 * sharp rather than mocking it — the whole promise of the feature is that an
 * arbitrary photo lands in an exact box, and only actual pixels prove that.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderRenditions } from "@/lib/image-pipeline";
import { RENDITIONS, type RenditionKind } from "@/lib/images";

const TILE_COLOR = "#0000FF"; // deliberately far from the red product, for contrast

/**
 * A red rectangle of the given size, centred on a white 1400x1400 backdrop.
 *
 * Encoded lossless: a JPEG fixture would soften the red/white boundary enough
 * for chroma subsampling to move the measured edges by several pixels, and the
 * geometry assertions below would then be measuring the fixture rather than the
 * pipeline. Lossy input is covered separately by the EXIF and untrimmable tests.
 */
async function photoOnWhite(productWidth: number, productHeight: number): Promise<Buffer> {
  return photoOn(productWidth, productHeight, "#FFFFFF");
}

/** The same fixture over an arbitrary backdrop colour. */
async function photoOn(
  productWidth: number,
  productHeight: number,
  backdrop: string,
): Promise<Buffer> {
  const product = await sharp({
    create: { width: productWidth, height: productHeight, channels: 3, background: "#FF0000" },
  })
    .png()
    .toBuffer();

  return sharp({ create: { width: 1400, height: 1400, channels: 3, background: backdrop } })
    .composite([{ input: product, gravity: "center" }])
    .png()
    .toBuffer();
}

type Bbox = { left: number; top: number; width: number; height: number } | null;

/** Bounding box of the red product inside a rendered rendition. */
async function redBbox(image: Buffer): Promise<Bbox> {
  const { data, info } = await sharp(image)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = Infinity;
  let top = Infinity;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      // Generous predicate: WebP at q82 softens edges but not by this much.
      if ((data[i] ?? 0) > 150 && (data[i + 1] ?? 255) < 100 && (data[i + 2] ?? 255) < 100) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function pixel(image: Buffer, x: number, y: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(image)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
}

function get(result: Awaited<ReturnType<typeof renderRenditions>>, kind: RenditionKind) {
  if (!result.ok) throw new Error(`expected a render, got: ${result.error}`);
  const rendition = result.renditions.find((r) => r.kind === kind);
  if (!rendition) throw new Error(`no ${kind} rendition`);
  return rendition;
}

describe("renderRenditions", () => {
  it("produces every box at its exact declared size", async () => {
    const result = await renderRenditions(await photoOnWhite(400, 400), TILE_COLOR);
    expect(result.ok).toBe(true);

    for (const kind of ["banner", "tile"] as RenditionKind[]) {
      const spec = RENDITIONS[kind];
      const meta = await sharp(get(result, kind).body).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(spec.width);
      expect(meta.height).toBe(spec.height);
    }
  });

  it("trims the backdrop, so the box is filled by the product not the framing", async () => {
    // A 400x400 product on a 1400x1400 white sheet. Trimming leaves the bare
    // product, which then covers the banner edge to edge. Skipping the trim
    // would scale the whole sheet instead and leave the product a small patch
    // in the middle — see the saturated-backdrop case below for that shape.
    const result = await renderRenditions(await photoOnWhite(400, 400), TILE_COLOR);
    const box = (await redBbox(get(result, "banner").body))!;

    expect(box.width).toBe(RENDITIONS.banner.width);
    expect(box.height).toBe(RENDITIONS.banner.height);
  });

  it("trims an off-white backdrop, not just a pure-white one", async () => {
    // The case that matters in practice: a product shot on a white sheet under
    // a warm bulb is never #FFFFFF. Trimming against pure white left the
    // backdrop in place, so the product rendered as a small patch surrounded by
    // the photographer's sheet instead of filling the box.
    for (const backdrop of ["#F6F4F1", "#EFEAE2", "#F2F2F4"]) {
      const result = await renderRenditions(await photoOn(400, 400, backdrop), TILE_COLOR);
      const box = (await redBbox(get(result, "banner").body))!;
      expect(box.width, `backdrop ${backdrop}`).toBe(RENDITIONS.banner.width);
      expect(box.height, `backdrop ${backdrop}`).toBe(RENDITIONS.banner.height);
    }
  });

  it("leaves a saturated backdrop alone rather than eating into the product", async () => {
    // Pale but clearly coloured — the catalogue's own pink swatch. Bright enough
    // to fool a brightness-only test, and trimming colour risks removing a
    // product's own flat edges, so this one is deliberately left untrimmed.
    const result = await renderRenditions(await photoOn(400, 400, "#FFCBD9"), TILE_COLOR);
    const box = (await redBbox(get(result, "banner").body))!;

    // Untrimmed, the whole 1400x1400 frame is scaled to cover: 400 * (1200/1400)
    // leaves the product a ~343px patch rather than the full box.
    expect(box.height).toBeGreaterThanOrEqual(335);
    expect(box.height).toBeLessThanOrEqual(352);
  });

  it("centres the product in both boxes", async () => {
    const result = await renderRenditions(await photoOnWhite(400, 400), TILE_COLOR);

    for (const kind of ["banner", "tile"] as RenditionKind[]) {
      const spec = RENDITIONS[kind];
      const box = (await redBbox(get(result, kind).body))!;
      const centreX = box.left + box.width / 2;
      const centreY = box.top + box.height / 2;
      expect(Math.abs(centreX - spec.width / 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(centreY - spec.height / 2)).toBeLessThanOrEqual(2);
    }
  });

  it("fills each box edge to edge, leaving no padding", async () => {
    const result = await renderRenditions(await photoOnWhite(400, 400), TILE_COLOR);

    for (const kind of ["banner", "tile"] as RenditionKind[]) {
      const spec = RENDITIONS[kind];
      for (const [x, y] of [
        [4, 4],
        [spec.width - 5, 4],
        [4, spec.height - 5],
        [spec.width - 5, spec.height - 5],
      ] as [number, number][]) {
        const [r, g, b] = await pixel(get(result, kind).body, x, y);
        expect(r, `${kind} @${x},${y}`).toBeGreaterThan(150);
        expect(Math.max(g, b), `${kind} @${x},${y}`).toBeLessThan(100);
      }
    }
  });

  it("covers the box from a tall product and from a wide one alike", async () => {
    for (const [w, h] of [
      [300, 900],
      [1200, 300],
    ] as [number, number][]) {
      const result = await renderRenditions(await photoOnWhite(w, h), TILE_COLOR);
      const box = (await redBbox(get(result, "banner").body))!;
      expect(box.width, `${w}x${h}`).toBe(RENDITIONS.banner.width);
      expect(box.height, `${w}x${h}`).toBe(RENDITIONS.banner.height);
    }
  });

  it("applies EXIF orientation, so portrait phone photos aren't stored sideways", async () => {
    // Half red, half blue. Unrotated that split runs left/right; rotated 90°
    // clockwise it runs top/bottom. Covering the box preserves the split's
    // direction either way, so sampling two corners says which one happened.
    const half = async (color: string) =>
      sharp({ create: { width: 700, height: 1000, channels: 3, background: color } })
        .png()
        .toBuffer();

    const sideways = await sharp({
      create: { width: 1400, height: 1000, channels: 3, background: "#FFFFFF" },
    })
      .composite([
        { input: await half("#FF0000"), left: 0, top: 0 },
        { input: await half("#0000FF"), left: 700, top: 0 },
      ])
      .withMetadata({ orientation: 6 }) // "rotate 90° clockwise"
      .jpeg()
      .toBuffer();

    const banner = get(await renderRenditions(sideways, TILE_COLOR), "banner").body;
    const [topR, , topB] = await pixel(banner, 60, 30);
    const [bottomR, , bottomB] = await pixel(banner, 60, RENDITIONS.banner.height - 30);

    // Rotated: red band on top, blue beneath. Unrotated both would be red.
    expect(topR).toBeGreaterThan(150);
    expect(topB).toBeLessThan(100);
    expect(bottomB).toBeGreaterThan(150);
    expect(bottomR).toBeLessThan(100);
  });

  it("keeps an untrimmable photo rather than rendering nothing", async () => {
    // A photo with no uniform border at all: trimming would eat the whole thing.
    const allRed = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#FF0000" },
    })
      .jpeg()
      .toBuffer();

    const box = (await redBbox(get(await renderRenditions(allRed, TILE_COLOR), "tile").body))!;
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
  });

  it("refuses a photo too small to fill the banner sharply", async () => {
    const small = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "#FF0000" },
    })
      .jpeg()
      .toBuffer();

    const result = await renderRenditions(small, TILE_COLOR);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("400×300");
  });

  it("reports a non-image as a message rather than throwing", async () => {
    const result = await renderRenditions(Buffer.from("this is not a photo"), TILE_COLOR);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("could not be read");
  });
});
