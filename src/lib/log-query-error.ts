import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Logs AND reports a genuine Supabase query error, tagged with where it
 * happened. Several data-layer functions across this app used to check
 * `error` only to decide whether to fall back to demo data or return
 * false/null — the error itself was then discarded, so a real production
 * failure (bad grants, a constraint, a network blip) left no trace anywhere.
 */
export function logQueryError(area: string, fn: string, error: unknown) {
  if (!error) return;
  console.error(`[${area}] ${fn} failed:`, error);
  Sentry.captureException(
    error instanceof Error ? error : new Error(`[${area}] ${fn}: ${JSON.stringify(error)}`),
    { tags: { area, fn } },
  );
}
