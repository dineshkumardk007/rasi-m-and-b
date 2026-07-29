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

  it("trims the backdrop and scales the product to the inset, not the photo", async () => {
    // A 400x400 product on a 1400x1400 white sheet. Trimming must leave 400x400,
    // which then fits the banner's 840x280 inset box by height: 400 * 0.7 = 280.
    const result = await renderRenditions(await photoOnWhite(400, 400), TILE_COLOR);
    const banner = get(result, "banner");
    const box = await redBbox(banner.body);

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(275);
    expect(box!.width).toBeLessThanOrEqual(285);
    expect(box!.height).toBeGreaterThanOrEqual(275);
    expect(box!.height).toBeLessThanOrEqual(285);
  });

  it("trims an off-white backdrop, not just a pure-white one", async () => {
    // The case that matters in practice: a product shot on a white sheet under
    // a warm bulb is never #FFFFFF. Trimming against pure white left the
    // backdrop in place, so the product rendered inside a visible pale
    // rectangle floating on its tile colour.
    for (const backdrop of ["#F6F4F1", "#EFEAE2", "#F2F2F4"]) {
      const result = await renderRenditions(await photoOn(400, 400, backdrop), TILE_COLOR);
      const box = (await redBbox(get(result, "banner").body))!;
      // Trimmed to the 400x400 product, the banner's 280px inset height binds.
      expect(box.height, `backdrop ${backdrop}`).toBeGreaterThanOrEqual(275);
      expect(box.height, `backdrop ${backdrop}`).toBeLessThanOrEqual(285);

      // And the backdrop is genuinely gone: just outside the product is padding.
      const [r, g, b] = await pixel(get(result, "banner").body, box.left - 6, 200);
      expect(b, `backdrop ${backdrop} padding`).toBeGreaterThan(200);
      expect(Math.max(r, g), `backdrop ${backdrop} padding`).toBeLessThan(60);
    }
  });

  it("leaves a saturated backdrop alone rather than eating into the product", async () => {
    // Pale but clearly coloured — the catalogue's own pink swatch. Bright enough
    // to fool a brightness-only test, and trimming colour risks removing a
    // product's own flat edges, so this one is deliberately left untrimmed.
    const result = await renderRenditions(await photoOn(400, 400, "#FFCBD9"), TILE_COLOR);
    const box = (await redBbox(get(result, "banner").body))!;
    // Untrimmed, the full 1400x1400 frame is fitted, so the product within it
    // ends up far smaller than the 280px a trimmed render would give.
    expect(box.height).toBeLessThan(120);
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

  it("pads the leftover space with the product's tile colour", async () => {
    const result = await renderRenditions(await photoOnWhite(400, 400), TILE_COLOR);
    const [r, g, b] = await pixel(get(result, "banner").body, 8, 8);
    expect(r).toBeLessThan(40);
    expect(g).toBeLessThan(40);
    expect(b).toBeGreaterThan(200);
  });

  it("falls back to white when the tile colour isn't a usable swatch", async () => {
    const result = await renderRenditions(await photoOnWhite(400, 400), "not-a-colour");
    const [r, g, b] = await pixel(get(result, "banner").body, 8, 8);
    expect(Math.min(r, g, b)).toBeGreaterThan(230);
  });

  it("fits a tall product by height and a wide one by width, never cropping either", async () => {
    const tall = await renderRenditions(await photoOnWhite(300, 900), TILE_COLOR);
    const tallBox = (await redBbox(get(tall, "banner").body))!;
    // Height binds: 900 -> 280 (the banner inset height), width follows at 1:3.
    expect(tallBox.height).toBeGreaterThanOrEqual(275);
    expect(tallBox.height).toBeLessThanOrEqual(285);
    expect(tallBox.width).toBeGreaterThanOrEqual(88);
    expect(tallBox.width).toBeLessThanOrEqual(100);

    const wide = await renderRenditions(await photoOnWhite(1200, 300), TILE_COLOR);
    const wideBox = (await redBbox(get(wide, "banner").body))!;
    // Width binds: 1200 -> 840 (the banner inset width), height follows at 4:1.
    expect(wideBox.width).toBeGreaterThanOrEqual(834);
    expect(wideBox.width).toBeLessThanOrEqual(846);
    expect(wideBox.height).toBeGreaterThanOrEqual(204);
    expect(wideBox.height).toBeLessThanOrEqual(216);
  });

  it("never lets the product touch the edge of the box", async () => {
    const result = await renderRenditions(await photoOnWhite(1200, 1200), TILE_COLOR);

    for (const kind of ["banner", "tile"] as RenditionKind[]) {
      const spec = RENDITIONS[kind];
      const box = (await redBbox(get(result, kind).body))!;
      expect(box.left).toBeGreaterThan(0);
      expect(box.top).toBeGreaterThan(0);
      expect(box.left + box.width).toBeLessThan(spec.width);
      expect(box.top + box.height).toBeLessThan(spec.height);
    }
  });

  it("applies EXIF orientation, so portrait phone photos aren't stored sideways", async () => {
    // A wide red bar that EXIF says to rotate 90°: it must come out tall.
    const bar = await sharp({
      create: { width: 500, height: 200, channels: 3, background: "#FF0000" },
    })
      .png()
      .toBuffer();

    const sideways = await sharp({
      create: { width: 1400, height: 1000, channels: 3, background: "#FFFFFF" },
    })
      .composite([{ input: bar, gravity: "center" }])
      .withMetadata({ orientation: 6 }) // "rotate 90° clockwise"
      .jpeg()
      .toBuffer();

    const box = (await redBbox(get(await renderRenditions(sideways, TILE_COLOR), "banner").body))!;
    expect(box.height).toBeGreaterThan(box.width);
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
