"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: this one catches failures in the root layout itself,
 * which means it must render its own <html> and <body>.
 *
 * Everything here is inline-styled on purpose. The root layout is what imports
 * globals.css and mounts the fonts and the language provider, and none of that
 * has run by the time this renders — so Tailwind classes and t() would both be
 * unavailable. The colours below are the design tokens from tailwind.config.ts,
 * written out literally, and the copy stays English because there is no
 * provider left to read the language cookie.
 */

const INK = "#2B2140";
const CREAM = "#FFF9F0";
const BRAND = "#EC5D8A";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CREAM,
          color: INK,
          padding: 20,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "#FFFFFF",
            border: `3px solid ${INK}`,
            borderRadius: 18,
            boxShadow: `4px 4px 0 ${INK}`,
            padding: 22,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 52 }} aria-hidden>
            🧸
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
            Rasi Mom &amp; Baby is having a moment
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6 }}>
            Sorry — the site failed to load. Nothing has been charged. Please try
            again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 44,
              width: "100%",
              cursor: "pointer",
              background: BRAND,
              color: "#FFFFFF",
              border: `3px solid ${INK}`,
              borderRadius: 999,
              boxShadow: `3px 3px 0 ${INK}`,
              padding: "11px 20px",
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ margin: "16px 0 0", fontSize: 11, color: "#6B617D" }}>
              Ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
