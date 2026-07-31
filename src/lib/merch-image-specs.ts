/**
 * Sizes and fitting rules for the images a shopkeeper manages.
 *
 * Deliberately separate from merch-image-upload.ts: the admin form needs to
 * print "1200 × 400" next to a file picker, and that file runs in the browser.
 * Importing the uploader there would pull sharp — a native Node module — into
 * the client bundle and break the page at build time. Only the type is taken
 * from fit-box, and type imports are erased, so nothing follows it here.
 */
import type { FitStrategy } from "./fit-box";

export const MERCH_IMAGE_SPECS = {
  /**
   * Hero and mid-page slides. Cropped to fill because a banner is designed
   * artwork at this ratio, and letterboxing one reads as a mistake — the admin
   * form states the size so nobody has to guess.
   */
  banner: {
    folder: "banners",
    width: 1200,
    height: 400,
    strategy: "cover" as FitStrategy,
    inset: 1,
    background: "#FFFFFF",
    label: "1200 × 400",
  },
  /**
   * Brand marks. Contained on white with a margin and never cropped: these are
   * other companies' logos, and a clipped one looks broken rather than styled.
   */
  brandLogo: {
    folder: "brands",
    width: 300,
    height: 300,
    strategy: "color" as FitStrategy,
    inset: 0.8,
    background: "#FFFFFF",
    label: "300 × 300",
  },
} as const;

export type MerchImageKind = keyof typeof MERCH_IMAGE_SPECS;
