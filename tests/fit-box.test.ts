/**
 * Tests for the any-image-to-an-exact-box converter. Renders real pixels
 * through sharp, because "did not distort the subject" and "did not crop the
 * frame" are claims only measurement can settle.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { DEFAULT_BOX, fitToBox, type FitStrategy } from "@/lib/fit-box";

const ALL: FitStrategy[] = ["blur", "mirror", "color", "attention", "cover"];
/** Strategies that fit the whole frame in rather than cropping to fill. */
const WHOLE_FRAME: FitStrategy[] = ["blur", "mirror", "color"];

/**
 * An 800x800 source with a small red square dead centre on white.
 *
 * The square is deliberately small: `mirror` reflects the fitted image's edges
 * back into the margins, and a large subject would be reflected too, so a
 * bounding box would then span the subject *plus its copies* and measure
 * nothing useful. At 200px the reflections stay in the white surround and the
 * box isolates the real subject in every strategy.
 */
async function squareSource(subject = 200): Promise<Buffer> {
  const red = await sharp({
    create: { width: subject, height: subject, channels: 3, background: "#FF0000" },
  })
    .png()
    .toBuffer();

  return sharp({ create: { width: 800, height: 800, channels: 3, background: "#FFFFFF" } })
    .composite([{ input: red, gravity: "center" }])
    .png()
    .toBuffer();
}

type Bbox = { left: number; top: number; width: number; height: number } | null;

async function bboxOf(
  image: Buffer,
  match: (r: number, g: number, b: number) => boolean,
): Promise<Bbox> {
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
      if (match(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

const isRed = (r: number, g: number, b: number) => r > 150 && g < 90 && b < 90;

async function pixel(image: Buffer, x: number, y: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(image)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
}

function body(result: Awaited<ReturnType<typeof fitToBox>>): Buffer {
  if (!result.ok) throw new Error(`expected a fit, got: ${result.error}`);
  return result.body;
}

describe("fitToBox", () => {
  it("hits the box exactly, whatever the strategy", async () => {
    const source = await squareSource();
    for (const strategy of ALL) {
      const meta = await sharp(body(await fitToBox(source, { strategy }))).metadata();
      expect(meta.width, strategy).toBe(DEFAULT_BOX.width);
      expect(meta.height, strategy).toBe(DEFAULT_BOX.height);
      expect(meta.format, strategy).toBe("webp");
    }
  });

  it("never distorts the subject — a square stays square in every strategy", async () => {
    const source = await squareSource();
    for (const strategy of ALL) {
      const box = (await bboxOf(body(await fitToBox(source, { strategy })), isRed))!;
      const skew = Math.abs(box.width - box.height) / Math.max(box.width, box.height);
      expect(skew, `${strategy} skewed the subject`).toBeLessThan(0.02);
    }
  });

  it("keeps the whole frame when fitting in, and crops when filling", async () => {
    const source = await squareSource();

    // A whole-frame fit scales by min(600/800, 360/800) = 0.45, so the 200px
    // subject lands at 90px. Filling the box scales by 0.75 and gives 150px —
    // bigger on screen, but only because the frame's edges were cropped away.
    for (const strategy of WHOLE_FRAME) {
      const box = (await bboxOf(body(await fitToBox(source, { strategy })), isRed))!;
      expect(box.height, strategy).toBeGreaterThanOrEqual(85);
      expect(box.height, strategy).toBeLessThanOrEqual(95);
    }

    const filled = (await bboxOf(body(await fitToBox(source, { strategy: "cover" })), isRed))!;
    expect(filled.height).toBeGreaterThanOrEqual(144);
    expect(filled.height).toBeLessThanOrEqual(156);
  });

  it("scales attention up to fill, letting content choose the crop", async () => {
    // Where attention crops is decided by sharp's saliency search, so pinning
    // it to a pixel would test sharp rather than this module. What must hold is
    // that it fills the box by scaling up, the way cover does.
    const box = (await bboxOf(
      body(await fitToBox(await squareSource(), { strategy: "attention" })),
      isRed,
    ))!;
    expect(box.height).toBeGreaterThan(120);
  });

  it("centres the subject", async () => {
    const source = await squareSource();
    for (const strategy of WHOLE_FRAME) {
      const box = (await bboxOf(body(await fitToBox(source, { strategy })), isRed))!;
      expect(Math.abs(box.left + box.width / 2 - DEFAULT_BOX.width / 2), strategy).toBeLessThan(3);
      expect(Math.abs(box.top + box.height / 2 - DEFAULT_BOX.height / 2), strategy).toBeLessThan(3);
    }
  });

  it("fills the margins with real content for blur and mirror, flat colour for color", async () => {
    const source = await squareSource();

    // Far left of the box is margin: the source is square, the box is wide.
    const flat = await pixel(body(await fitToBox(source, { strategy: "color", background: "#00FF00" })), 6, 180);
    expect(flat[1]).toBeGreaterThan(200);
    expect(Math.max(flat[0], flat[2])).toBeLessThan(60);

    // Mirror reflects the source's own white edge back, so the margin is white
    // rather than the requested padding colour — proof it ignored `background`.
    const mirrored = await pixel(
      body(await fitToBox(source, { strategy: "mirror", background: "#00FF00" })),
      6,
      180,
    );
    expect(mirrored[1] - Math.min(mirrored[0], mirrored[2])).toBeLessThan(40);

    const blurred = await pixel(
      body(await fitToBox(source, { strategy: "blur", background: "#00FF00" })),
      6,
      180,
    );
    expect(blurred[1] - Math.min(blurred[0], blurred[2])).toBeLessThan(40);
  });

  it("reflects the edge outward when the margin is narrow enough", async () => {
    // 800x600 into 600x360 fits at 480x360, so each side margin is 60px — an
    // eighth of the fitted width, well inside what mirroring handles. A blue
    // strip on the source's left edge must therefore reappear in that margin.
    const striped = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#FFFFFF" },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 40, height: 600, channels: 3, background: "#0000FF" },
          })
            .png()
            .toBuffer(),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const isBlue = (r: number, g: number, b: number) => b > 150 && r < 90 && g < 90;

    const mirrored = await fitToBox(striped, { strategy: "mirror" });
    expect(mirrored.ok && mirrored.strategy).toBe("mirror");

    // sharp reflects about the edge, so the strip's copy lands just inside the
    // margin next to the image rather than at the far edge of the box.
    const reflected = (await bboxOf(body(mirrored), isBlue))!;
    expect(reflected.left).toBeLessThan(60);

    // Padding instead of reflecting leaves the margin clear of the strip.
    const padded = (await bboxOf(
      body(await fitToBox(striped, { strategy: "color", background: "#FFFFFF" })),
      isBlue,
    ))!;
    expect(padded.left).toBeGreaterThanOrEqual(55);
  });

  it("refuses to mirror when the margin would fold the subject back in", async () => {
    // A portrait source in a landscape box needs margins wider than the fitted
    // image itself, which reflects the subject into both margins — one centred
    // product renders as three. Falling back to blur is the safe outcome.
    const portrait = await sharp({
      create: { width: 400, height: 800, channels: 3, background: "#FFFFFF" },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 200, height: 200, channels: 3, background: "#FF0000" },
          })
            .png()
            .toBuffer(),
          gravity: "center",
        },
      ])
      .png()
      .toBuffer();

    const result = await fitToBox(portrait, { strategy: "mirror" });
    expect(result.ok && result.strategy).toBe("blur");
    expect(result.ok && result.requestedStrategy).toBe("mirror");

    const meta = await sharp(body(result)).metadata();
    expect(meta.width).toBe(DEFAULT_BOX.width);
    expect(meta.height).toBe(DEFAULT_BOX.height);
  });

  it("leaves the strategy unchanged when mirroring is safe", async () => {
    // The counterpart to the fallback: a modest aspect change reports `mirror`
    // and sets no requestedStrategy, so callers can tell the two apart.
    const landscape = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#FFFFFF" },
    })
      .png()
      .toBuffer();

    const result = await fitToBox(landscape, { strategy: "mirror" });
    expect(result.ok && result.strategy).toBe("mirror");
    expect(result.ok && result.requestedStrategy).toBeUndefined();
  });

  it("honours a custom box size", async () => {
    const meta = await sharp(
      body(await fitToBox(await squareSource(), { width: 1200, height: 400 })),
    ).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(400);
  });

  it("honours inset, leaving a deliberate margin", async () => {
    const source = await squareSource();
    const full = (await bboxOf(body(await fitToBox(source, { strategy: "color" })), isRed))!;
    const inset = (await bboxOf(
      body(await fitToBox(source, { strategy: "color", inset: 0.5 })),
      isRed,
    ))!;
    expect(inset.height).toBeLessThan(full.height * 0.6);
  });

  it("crops away frame edges under cover but keeps them when fitting in", async () => {
    // A blue strip on the very top edge of the source: fitting the whole frame
    // in keeps it, filling the box scales past it and crops it off entirely.
    const strip = await sharp({
      create: { width: 800, height: 800, channels: 3, background: "#FFFFFF" },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 800, height: 40, channels: 3, background: "#0000FF" },
          })
            .png()
            .toBuffer(),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const isBlue = (r: number, g: number, b: number) => b > 150 && r < 90 && g < 90;

    expect(await bboxOf(body(await fitToBox(strip, { strategy: "color" })), isBlue)).not.toBeNull();
    expect(await bboxOf(body(await fitToBox(strip, { strategy: "cover" })), isBlue)).toBeNull();
  });

  it("writes jpeg and png when asked", async () => {
    const source = await squareSource();
    expect((await sharp(body(await fitToBox(source, { format: "jpeg" }))).metadata()).format).toBe("jpeg");
    expect((await sharp(body(await fitToBox(source, { format: "png" }))).metadata()).format).toBe("png");
  });

  it("reports whether a small source had to be enlarged", async () => {
    const small = await sharp({
      create: { width: 200, height: 200, channels: 3, background: "#FF0000" },
    })
      .png()
      .toBuffer();

    const enlarged = await fitToBox(small, { enlarge: true });
    expect(enlarged.ok && enlarged.upscaled).toBe(true);

    const asIs = await fitToBox(small, { enlarge: false, strategy: "color" });
    expect(asIs.ok && asIs.upscaled).toBe(false);
    // Left at its true size, centred — so it occupies only part of the box.
    const box = (await bboxOf(body(asIs), isRed))!;
    expect(box.height).toBeLessThanOrEqual(205);
  });

  it("applies EXIF orientation before fitting", async () => {
    const wide = await sharp({
      create: { width: 800, height: 400, channels: 3, background: "#FF0000" },
    })
      .withMetadata({ orientation: 6 }) // rotate 90° clockwise
      .jpeg()
      .toBuffer();

    const box = (await bboxOf(body(await fitToBox(wide, { strategy: "color" })), isRed))!;
    expect(box.height).toBeGreaterThan(box.width);
  });

  it("handles a transparent PNG without falling over", async () => {
    const logo = await sharp("public/logo.png").toBuffer();
    const result = await fitToBox(logo, { strategy: "color", background: "#FFCBD9" });
    expect(result.ok).toBe(true);
    const meta = await sharp(body(result)).metadata();
    expect(meta.width).toBe(DEFAULT_BOX.width);
    expect(meta.height).toBe(DEFAULT_BOX.height);
  });

  it("returns errors as values", async () => {
    const notAnImage = await fitToBox(Buffer.from("nope"));
    expect(notAnImage.ok).toBe(false);
    if (!notAnImage.ok) expect(notAnImage.error).toContain("could not be read");

    const badInset = await fitToBox(await squareSource(), { inset: 0 });
    expect(badInset.ok).toBe(false);

    const badBox = await fitToBox(await squareSource(), { width: 0 });
    expect(badBox.ok).toBe(false);
  });
});
