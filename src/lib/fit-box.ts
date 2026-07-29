/**
 * Convert any image to an exact box — 600x360 (5:3) by default — without
 * distorting the subject.
 *
 * The hard part is never the resize, it's the leftover space. A square photo
 * going into a 5:3 box has to either lose 40% of its height or gain new pixels
 * on the left and right, and the strategies below are the honest ways to do
 * that with real pixels:
 *
 *   blur      Fit the whole image in, fill the margins with a scaled, blurred
 *             copy of itself. Nothing is cropped or stretched, and the margins
 *             carry the original's own colours and lighting. Works on any
 *             image, which is why it's the default.
 *   mirror    Fit the whole image in, extend the margins by mirroring the edge
 *             pixels outward. The margins are literally the original's pixels,
 *             so colour and grain match exactly — the best result when the
 *             background is plain, soft or gradient, and the worst when it has
 *             strong structure running to the edge, which mirrors visibly.
 *             Falls back to `blur` when the margin is too wide to mirror
 *             safely; see MAX_MIRROR_MARGIN_RATIO.
 *   color     Fit the whole image in, pad with a flat colour. Predictable and
 *             clean; makes no attempt to look like a wider photograph.
 *   attention Fill the box edge-to-edge, cropping to the region sharp scores as
 *             most salient. Nothing is stretched, but content is lost.
 *   cover     Fill the box edge-to-edge from the centre. Same trade as
 *             attention, without the saliency search.
 *
 * What none of these do is invent background that was never photographed. That
 * is generative outpainting and it needs an image model; sharp can only move,
 * repeat and blur the pixels it was given. `blur` and `mirror` are the closest
 * honest approximations, and on plain backgrounds `mirror` is very close.
 *
 * Pure and dependency-light on purpose — no "server-only", no Supabase, no
 * product concepts — so a route, a script or a test can all call it.
 */
import sharp from "sharp";
import type { Sharp } from "sharp";

/** The card tile box. Callers can override per call. */
export const DEFAULT_BOX = { width: 600, height: 360 } as const;

export type FitStrategy = "blur" | "mirror" | "color" | "attention" | "cover";

export type FitFormat = "webp" | "jpeg" | "png";

export type FitOptions = {
  width?: number;
  height?: number;
  strategy?: FitStrategy;
  /**
   * Share of the box the original image occupies, for the strategies that fit
   * it whole. 1 uses every available pixel; lower values leave a deliberate
   * margin. Ignored by `cover` and `attention`, which always fill the box.
   */
  inset?: number;
  /** Padding colour for `color`. Any CSS colour sharp understands. */
  background?: string;
  format?: FitFormat;
  quality?: number;
  /** Allow a source smaller than the box to be scaled up. */
  enlarge?: boolean;
};

export type FitResult =
  | {
      ok: true;
      body: Buffer;
      width: number;
      height: number;
      format: FitFormat;
      /** The strategy that actually ran, which `mirror` may downgrade. */
      strategy: FitStrategy;
      /** Set when the requested strategy was unsafe for this image's shape. */
      requestedStrategy?: FitStrategy;
      sourceWidth: number;
      sourceHeight: number;
      /** True when the source had to be enlarged, so the result is soft. */
      upscaled: boolean;
    }
  | { ok: false; error: string };

const DEFAULTS = {
  strategy: "blur" as FitStrategy,
  inset: 1,
  background: "#FFFFFF",
  format: "webp" as FitFormat,
  quality: 82,
  enlarge: true,
};

/** Blur radius, scaled to the box so a big box doesn't get a timid blur. */
function blurSigma(width: number): number {
  return Math.max(8, Math.round(width / 25));
}

/** How far past the box edge the blurred backdrop is zoomed, hiding its framing. */
const BACKDROP_ZOOM = 1.15;

/**
 * The widest margin `mirror` will attempt, as a share of the fitted image.
 *
 * Mirroring reflects the edge band outward. While the margin stays narrow that
 * band is background and the result is seamless. Once the margin approaches the
 * fitted image's own size — a portrait photo going into a landscape box, say —
 * the reflection reaches past the background and folds the subject back into
 * the margin, so a single centred product comes out as three. Past this ratio
 * the request falls back to `blur`, and the result reports which strategy
 * actually ran.
 */
const MAX_MIRROR_MARGIN_RATIO = 0.5;

function encode(pipeline: Sharp, format: FitFormat, quality: number): Promise<Buffer> {
  if (format === "jpeg") return pipeline.jpeg({ quality }).toBuffer();
  if (format === "png") return pipeline.png().toBuffer();
  return pipeline.webp({ quality }).toBuffer();
}

/** Scale to fit wholly inside the target, preserving aspect exactly. */
async function scaleToFit(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  boxWidth: number,
  boxHeight: number,
  enlarge: boolean,
): Promise<{ body: Buffer; width: number; height: number; upscaled: boolean }> {
  const raw = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const scale = enlarge ? raw : Math.min(raw, 1);

  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  return {
    body: await sharp(source)
      .resize(width, height, { fit: "fill", kernel: "lanczos3" })
      .toBuffer(),
    width,
    height,
    upscaled: scale > 1,
  };
}

/** Margins needed to grow a fitted image out to the full box. */
function margins(fittedWidth: number, fittedHeight: number, width: number, height: number) {
  const dx = width - fittedWidth;
  const dy = height - fittedHeight;
  return {
    left: Math.floor(dx / 2),
    right: Math.ceil(dx / 2),
    top: Math.floor(dy / 2),
    bottom: Math.ceil(dy / 2),
    any: dx > 0 || dy > 0,
  };
}

/**
 * A blurred, over-scaled copy of the image, used as the backdrop the fitted
 * image sits on. Zoomed past the box so its own framing isn't recognisable
 * behind the sharp copy.
 */
async function blurredBackdrop(
  source: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  const zoomWidth = Math.round(width * BACKDROP_ZOOM);
  const zoomHeight = Math.round(height * BACKDROP_ZOOM);

  return sharp(source)
    .resize(zoomWidth, zoomHeight, { fit: "cover", position: "center" })
    .blur(blurSigma(width))
    .extract({
      left: Math.round((zoomWidth - width) / 2),
      top: Math.round((zoomHeight - height) / 2),
      width,
      height,
    })
    .toBuffer();
}

/**
 * Fit `source` into an exact box.
 *
 * Errors come back as values rather than thrown: this runs against whatever a
 * user picked, and "that file isn't an image" is an outcome, not an exception.
 */
export async function fitToBox(source: Buffer, options: FitOptions = {}): Promise<FitResult> {
  const width = options.width ?? DEFAULT_BOX.width;
  const height = options.height ?? DEFAULT_BOX.height;
  const strategy = options.strategy ?? DEFAULTS.strategy;
  const inset = options.inset ?? DEFAULTS.inset;
  const background = options.background ?? DEFAULTS.background;
  const format = options.format ?? DEFAULTS.format;
  const quality = options.quality ?? DEFAULTS.quality;
  const enlarge = options.enlarge ?? DEFAULTS.enlarge;

  if (width < 1 || height < 1) return { ok: false, error: "Box size must be positive." };
  if (inset <= 0 || inset > 1) return { ok: false, error: "Inset must be between 0 and 1." };

  // EXIF orientation first, or a portrait phone photo is fitted sideways.
  let normalized;
  try {
    normalized = await sharp(source, { failOn: "none" })
      .rotate()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, error: "That file could not be read as an image." };
  }

  const sourceWidth = normalized.info.width;
  const sourceHeight = normalized.info.height;
  const done = (body: Buffer, upscaled: boolean, ran: FitStrategy = strategy): FitResult => ({
    ok: true,
    body,
    width,
    height,
    format,
    strategy: ran,
    ...(ran === strategy ? {} : { requestedStrategy: strategy }),
    sourceWidth,
    sourceHeight,
    upscaled,
  });

  // Crop-to-fill strategies need no margin handling at all.
  if (strategy === "cover" || strategy === "attention") {
    const body = await encode(
      sharp(normalized.data).resize(width, height, {
        fit: "cover",
        position: strategy === "attention" ? sharp.strategy.attention : "center",
        kernel: "lanczos3",
      }),
      format,
      quality,
    );
    return done(body, sourceWidth < width || sourceHeight < height);
  }

  const fitted = await scaleToFit(
    normalized.data,
    sourceWidth,
    sourceHeight,
    Math.round(width * inset),
    Math.round(height * inset),
    enlarge,
  );

  const edge = margins(fitted.width, fitted.height, width, height);

  // Already the exact box — every strategy agrees, so skip the margin work.
  if (!edge.any) return done(await encode(sharp(fitted.body), format, quality), fitted.upscaled);

  // A margin approaching the fitted image's own size would fold the subject
  // back on itself, so mirror steps aside for the strategy that always works.
  const mirrorUnsafe =
    strategy === "mirror" &&
    (Math.max(edge.left, edge.right) > fitted.width * MAX_MIRROR_MARGIN_RATIO ||
      Math.max(edge.top, edge.bottom) > fitted.height * MAX_MIRROR_MARGIN_RATIO);

  const effective: FitStrategy = mirrorUnsafe ? "blur" : strategy;

  if (effective === "blur") {
    const backdrop = await blurredBackdrop(normalized.data, width, height);
    const body = await encode(
      sharp(backdrop).composite([{ input: fitted.body, gravity: "center" }]),
      format,
      quality,
    );
    return done(body, fitted.upscaled, effective);
  }

  const body = await encode(
    sharp(fitted.body).extend({
      left: edge.left,
      right: edge.right,
      top: edge.top,
      bottom: edge.bottom,
      ...(effective === "mirror" ? { extendWith: "mirror" as const } : { background }),
    }),
    format,
    quality,
  );

  return done(body, fitted.upscaled, effective);
}
