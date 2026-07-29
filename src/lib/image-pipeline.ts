/**
 * Turns whatever photo an admin picked into the exact renditions the storefront
 * boxes need. Nothing here is interactive: there is no crop handle, no resize
 * step and no per-product tuning, because the whole point is that adding a
 * product means choosing a file and nothing else.
 *
 * The sequence, per upload:
 *
 *   1. Apply EXIF orientation, so portrait phone photos aren't stored sideways.
 *   2. Trim the uniform border the photo was shot against, so the product is
 *      centred on itself rather than on the photographer's framing. Without
 *      this a tightly-cropped photo and a loosely-cropped one sit side by side
 *      on the grid at wildly different sizes.
 *   3. Scale the product to `inset` of each box and centre it on a canvas of
 *      the product's own tile_color, which fills the leftover space that the
 *      aspect-ratio difference leaves behind.
 *
 * Step 3 never enlarges. A photo that passed validateDimensions has the pixels
 * to fill its box; one that somehow doesn't is left at its true size and padded
 * further, which reads as a slightly small product rather than a blurry one.
 *
 * No "server-only" here: scripts/import-images.ts and scripts/reprocess-images.ts
 * run the identical pipeline from plain Node, so a bulk import and an admin
 * upload can never drift apart.
 */
import sharp from "sharp";
import {
  RENDITIONS,
  RENDITION_CONTENT_TYPE,
  RENDITION_QUALITY,
  validateDimensions,
  type RenditionKind,
} from "./images";

/**
 * How far a pixel may sit from the border colour and still count as background.
 * Low enough to leave a product's own pale edges alone, high enough to absorb
 * the JPEG noise and soft studio shadow around a white-backdrop shot.
 */
const TRIM_THRESHOLD = 12;

/**
 * A trim that swallows almost everything means the photo was near-uniform and
 * the detection was wrong — a flat-lay on a busy backdrop, say. Below this
 * share of the original area we keep the untrimmed image instead.
 */
const MIN_TRIM_AREA_RATIO = 0.05;

/**
 * What counts as a "near-white" backdrop worth trimming.
 *
 * Real photos are never #FFFFFF: a product shot on a white sheet under a warm
 * bulb lands somewhere around #F6F4F1, and trimming against pure white misses
 * it entirely — the product then renders inside a visible off-white rectangle
 * floating on its tile colour. So the border colour is sampled from the photo
 * and trimmed against itself, gated on being both light and close to neutral.
 *
 * The neutrality gate is what keeps this to *near-white* borders specifically:
 * a pale but saturated backdrop (the catalogue's own #FFCBD9 pink, say) is
 * light enough to pass a brightness test alone, and trimming coloured borders
 * risks eating products that genuinely have flat-colour edges.
 */
const NEAR_WHITE_MIN_CHANNEL = 205;
const NEAR_WHITE_MAX_SPREAD = 24;

/** Below this alpha the corner is transparent, and the trim runs on alpha. */
const TRANSPARENT_ALPHA = 16;

const DEFAULT_TILE_COLOR = "#FFFFFF";

export type RenderedRendition = {
  kind: RenditionKind;
  body: Buffer;
  contentType: string;
  width: number;
  height: number;
};

export type RenderResult =
  | { ok: true; renditions: RenderedRendition[]; sourceWidth: number; sourceHeight: number }
  | { ok: false; error: string };

/** sharp accepts many colour forms; products only ever carry a hex swatch. */
function safeTileColor(tileColor: string | null | undefined): string {
  return tileColor && /^#[0-9a-fA-F]{6}$/.test(tileColor) ? tileColor : DEFAULT_TILE_COLOR;
}

/** The photo's top-left pixel, which is the backdrop on any framed product shot. */
async function cornerPixel(
  input: Buffer,
): Promise<{ r: number; g: number; b: number; alpha: number }> {
  const { data } = await sharp(input)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0, alpha: data[3] ?? 255 };
}

/**
 * Strip the uniform border a product was shot against.
 *
 * Trims transparent cut-outs on their alpha channel and near-white backdrops
 * against their own sampled colour. A photo shot on anything else — a wooden
 * table, a coloured blanket — is left alone, because there is no border there
 * to remove and guessing would cost product rather than background.
 *
 * Returns the input untouched whenever the trim fails or eats the image.
 */
async function trimBorder(
  input: Buffer,
): Promise<{ body: Buffer; width: number; height: number }> {
  const original = await sharp(input).metadata();
  const originalArea = (original.width ?? 1) * (original.height ?? 1);
  const untouched = { body: input, width: original.width ?? 0, height: original.height ?? 0 };

  const corner = await cornerPixel(input);
  const lightest = Math.max(corner.r, corner.g, corner.b);
  const darkest = Math.min(corner.r, corner.g, corner.b);

  const isTransparent = corner.alpha < TRANSPARENT_ALPHA;
  const isNearWhite =
    darkest >= NEAR_WHITE_MIN_CHANNEL && lightest - darkest <= NEAR_WHITE_MAX_SPREAD;

  if (!isTransparent && !isNearWhite) return untouched;

  try {
    const trimmed = await sharp(input)
      .trim(
        isTransparent
          ? { threshold: TRIM_THRESHOLD } // default reference is the corner: transparent
          : { background: { r: corner.r, g: corner.g, b: corner.b }, threshold: TRIM_THRESHOLD },
      )
      .toBuffer({ resolveWithObject: true });

    const area = trimmed.info.width * trimmed.info.height;
    if (area / originalArea >= MIN_TRIM_AREA_RATIO) {
      return { body: trimmed.data, width: trimmed.info.width, height: trimmed.info.height };
    }
  } catch {
    // sharp rejects a fully uniform image; fall through to the untrimmed copy.
  }

  return untouched;
}

/** Scale to cover the full box, filling it 100% edge-to-edge. */
async function renderOne(
  product: Buffer,
  _productWidth: number,
  _productHeight: number,
  kind: RenditionKind,
  _tileColor: string,
): Promise<RenderedRendition> {
  const { width, height } = RENDITIONS[kind];

  const body = await sharp(product)
    .resize(width, height, { fit: "cover", position: "center", kernel: "lanczos3" })
    .webp({ quality: RENDITION_QUALITY })
    .toBuffer();

  return { kind, body, contentType: RENDITION_CONTENT_TYPE, width, height };
}

/**
 * Render every rendition from one source photo.
 *
 * `tileColor` is the product's own swatch, so the padding reads as part of the
 * tile rather than as a letterbox. Errors come back as values — the admin needs
 * to see "that photo is too small", not a stack trace.
 */
export async function renderRenditions(
  source: Buffer,
  tileColor: string | null | undefined,
): Promise<RenderResult> {
  let oriented;
  try {
    oriented = await sharp(source, { failOn: "none" })
      .rotate() // applies EXIF orientation
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: "That file could not be read as an image." };
  }

  const sourceWidth = oriented.info.width;
  const sourceHeight = oriented.info.height;

  const dimensionCheck = validateDimensions(sourceWidth, sourceHeight);
  if (!dimensionCheck.ok) return { ok: false, error: dimensionCheck.error };

  const trimmed = await trimBorder(oriented.data);
  const canvas = safeTileColor(tileColor);

  const renditions = await Promise.all(
    (Object.keys(RENDITIONS) as RenditionKind[]).map((kind) =>
      renderOne(trimmed.body, trimmed.width, trimmed.height, kind, canvas),
    ),
  );

  return { ok: true, renditions, sourceWidth, sourceHeight };
}
