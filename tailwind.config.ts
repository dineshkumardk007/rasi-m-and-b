import type { Config } from "tailwindcss";

/**
 * "Playful Sticker" design system — Section 3 of the build spec.
 * All colours, radii and hard-offset shadows live here as the single source
 * of truth. Components must use these tokens, never raw hex values.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2B2140", // deep plum — ALL outlines and body text
        cream: "#FFF9F0", // page background
        paper: "#FFFFFF", // card surfaces
        brand: "#EC5D8A", // primary action / brand accent ("pink")
        mute: "#6B617D", // secondary text
        ribbon: "#FFE1A8", // ink-bar text / toast text
        cat: {
          feeding: { bg: "#FFE1A8", pop: "#F59E0B" },
          bath: { bg: "#C7E9FF", pop: "#3B9EDB" },
          toys: { bg: "#FFCBD9", pop: "#EC5D8A" },
          clothing: { bg: "#D6E8B0", pop: "#7CB342" },
          diapering: { bg: "#E4D6FF", pop: "#9A6BE0" },
          gear: { bg: "#B9EBDD", pop: "#1FB995" },
          health: { bg: "#FFD6C2", pop: "#F26B4A" },
          mom: { bg: "#FBD0EA", pop: "#D65BB0" },
        },
      },
      fontFamily: {
        display: ["var(--font-baloo)", "system-ui", "sans-serif"], // headlines & UI
        body: ["var(--font-karla)", "system-ui", "sans-serif"], // paragraphs & inputs
        tamil: ["var(--font-tamil)", "var(--font-karla)", "sans-serif"],
      },
      borderRadius: {
        pill: "22px", // buttons / pills
        card: "18px", // cards
        modal: "24px", // modals
        tile: "14px", // emoji tiles (small)
        "tile-lg": "20px", // category tiles (large)
      },
      borderWidth: {
        "2.5": "2.5px", // standard sticker outline
        "3": "3px", // buttons / emphasised outlines
        "4": "4px", // modals / big surfaces
      },
      boxShadow: {
        // Hard offset shadows only — never blurred.
        "hard-2": "2px 2px 0 #2B2140", // pressed-in tiles
        "hard-3": "3px 3px 0 #2B2140", // buttons / pills
        "hard-4": "4px 4px 0 #2B2140", // cards
        "hard-5": "5px 5px 0 #2B2140", // category tiles
        "hard-6": "6px 6px 0 #2B2140", // trust panel / modals
        none: "none",
      },
      keyframes: {
        // "Fresh picks" marquee: duplicated list translated -50%.
        slide: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "slide 36s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
