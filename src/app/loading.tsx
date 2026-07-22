import { getT } from "@/lib/i18n/server";

/**
 * Shown while a route segment streams in. Every page here is force-dynamic and
 * hits the database for live stock, so on a slow phone connection there is a
 * real gap before anything paints — this fills it with the brand rather than a
 * blank white screen.
 */
export default async function Loading() {
  const { t } = await getT();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream text-ink">
      <div className="text-[52px] motion-safe:animate-bounce" aria-hidden>
        🍼
      </div>
      <p className="font-display text-[15px] font-extrabold" role="status">
        {t("common.loading")}
      </p>
    </main>
  );
}
