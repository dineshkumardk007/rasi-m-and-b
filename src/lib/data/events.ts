import "server-only";
import { after } from "next/server";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Event outbox. Order flows must succeed even if n8n/WhatsApp is down
 * (Section 5 rule): the event row is the durable record; delivery to n8n is
 * handed to `after()` here plus a retry drain (api/cron/drain-events) that
 * re-sends anything left unprocessed.
 */
export async function logEvent(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (isDemo()) {
    demoDB().events.unshift({ type, payload, at: new Date().toISOString() });
  } else {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .insert({ type, payload })
      .select("id")
      .single();
    // Delivery runs after the response; failure leaves processed_at null for the drain.
    if (data) await scheduleDelivery(data.id, type, payload);
    return;
  }
  await scheduleDelivery(null, type, payload);
}

/**
 * Send the event without making the customer wait for n8n.
 *
 * This used to be a bare `void deliverToN8n(...)`, which loses the send
 * outright on Vercel: the serverless function can be frozen as soon as the
 * response is flushed, so a promise nobody is awaiting is abandoned mid-fetch.
 * The event then sat unprocessed until the nightly drain, and a customer's
 * order confirmation could be a day late. `after()` keeps the invocation alive
 * until the callback settles, while still not blocking the response.
 */
function scheduleDelivery(
  eventId: string | null,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> | void {
  try {
    after(() => deliverToN8n(eventId, type, payload));
  } catch {
    // No request scope — seed scripts and tests call into the order flow
    // directly, and after() throws there. Send inline instead.
    return deliverToN8n(eventId, type, payload);
  }
}

async function deliverToN8n(
  eventId: string | null,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return; // Phase 4 credential not yet supplied
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rasi-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({ type, payload, event_id: eventId }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok && eventId && !isDemo()) {
      const supabase = createAdminClient();
      await supabase
        .from("events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventId);
    }
  } catch {
    // Leave unprocessed; the drain endpoint retries.
  }
}

/** Retry any events that never reached n8n. Called by a Vercel cron. */
export async function drainPendingEvents(limit = 25): Promise<number> {
  if (isDemo()) return 0;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("id, type, payload")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  for (const row of data ?? [])
    await deliverToN8n(row.id, row.type, row.payload as Record<string, unknown>);
  return data?.length ?? 0;
}
