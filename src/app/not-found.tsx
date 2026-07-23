import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { BUSINESS } from "@/lib/constants";

/**
 * 404. Reached from notFound() in the product and category routes — a sold-out
 * product whose link is still doing the rounds on WhatsApp lands here, so the
 * copy points at the shop rather than apologising.
 */
export default async function NotFound() {
  const { t } = await getT();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10 text-ink">
      <div className="w-full max-w-[440px] rounded-card border-3 border-ink bg-paper p-[22px] text-center shadow-hard-4">
        <div className="text-[52px]" aria-hidden>
          🔍
        </div>
        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-tight">
          {t("notFound.title")}
        </h1>
        <p className="mt-3 font-body text-[15px] leading-relaxed">{t("notFound.body")}</p>
        <Link
          href="/"
          className="btn-press mt-6 inline-block min-h-[44px] w-full rounded-pill border-3 border-ink bg-brand px-5 py-[11px] font-display text-[15px] font-extrabold text-white shadow-hard-3"
        >
          {t("notFound.cta")}
        </Link>
      </div>
      <p className="mt-6 text-center text-[12px] text-mute">{BUSINESS.addressShort}</p>
    </main>
  );
}
