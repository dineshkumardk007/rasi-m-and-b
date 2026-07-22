"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/LanguageProvider";
import { BUSINESS } from "@/lib/constants";

/**
 * Route-segment error boundary. Without this, an exception thrown in any server
 * component drops the customer onto Next's stock error screen — an unstyled
 * page that, in production, says only "Application error". That is not a thing
 * to show someone who is mid-checkout.
 *
 * This boundary sits inside the root layout, so the language provider and the
 * fonts are still mounted; global-error.tsx covers the case where the layout
 * itself is what failed.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();

  useEffect(() => {
    // Vercel captures this; the digest is what ties it to the server-side trace.
    console.error("Storefront error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 py-10 text-ink">
      <div className="w-full max-w-[440px] rounded-card border-3 border-ink bg-paper p-[22px] text-center shadow-hard-4">
        <div className="text-[52px]" aria-hidden>
          🧸
        </div>
        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-tight">
          {t("error.title")}
        </h1>
        <p className="mt-3 font-body text-[15px] leading-relaxed">{t("error.body")}</p>

        <div className="mt-6 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="btn-press min-h-[44px] w-full rounded-pill border-3 border-ink bg-brand px-5 py-[11px] font-display text-[15px] font-extrabold text-white shadow-hard-3"
          >
            {t("error.retry")}
          </button>
          <Link
            href="/"
            className="btn-press min-h-[44px] w-full rounded-pill border-3 border-ink bg-[#FFE1A8] px-5 py-[11px] font-display text-[15px] font-extrabold text-ink shadow-hard-3"
          >
            {t("error.home")}
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 font-body text-[11px] text-mute">
            Ref: {error.digest}
          </p>
        )}
      </div>
      <p className="mt-6 text-center text-[12px] text-mute">{BUSINESS.addressShort}</p>
    </main>
  );
}
