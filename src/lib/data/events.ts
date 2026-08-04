import "server-only";
import { after } from "next/server";
import { demoDB } from "./demo-store";
import { isDemo } from "./mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { logQueryError } from "@/lib/log-query-error";

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
    const { data, error } = await supabase
      .from("events")
      .insert({ type, payload })
      .select("id")
      .single();
    if (error) {
      // If this insert fails, the event doesn't exist anywhere — not
      // delivered, not queued, not in the drain's pending set. It's just
      // gone, and whatever downstream automation (WhatsApp, n8n) depended on
      // it never fires, with nothing to retry and no trace of why.
      logQueryError("events", "logEvent", error);
      return;
    }
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

// A permanently-broken payload (deleted n8n workflow, malformed template) used
// to retry forever — once a day via the cron drain, silently, with no counter
// and nothing to tell a transient blip from a dead end. Give up after this
// many failed attempts and dead-letter the row instead.
const MAX_DELIVERY_ATTEMPTS = 8;

async function deliverToN8n(
  eventId: string | null,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return; // Phase 4 credential not yet supplied

  let delivered = false;
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
    delivered = res.ok;
  } catch {
    delivered = false;
  }

  if (isDemo() || !eventId) return;
  const supabase = createAdminClient();

  if (delivered) {
    await supabase
      .from("events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return;
  }

  // Failed (network error, timeout, or a non-2xx from n8n). Bump the attempt
  // counter; dead-letter once the budget is exhausted so the drain query stops
  // selecting it and this becomes visible in logs instead of retrying silently
  // forever.
  const { data: current, error: readErr } = await supabase
    .from("events")
    .select("attempts")
    .eq("id", eventId)
    .single();
  logQueryError("events", "deliverToN8n:read_attempts", readErr);
  const attempts = (current?.attempts ?? 0) + 1;
  const patch: Record<string, unknown> = {
    attempts,
    last_attempt_at: new Date().toISOString(),
  };
  if (attempts >= MAX_DELIVERY_ATTEMPTS) {
    patch.dead_lettered_at = new Date().toISOString();
    console.error(
      `[events] Giving up on event ${eventId} (${type}) after ${attempts} failed delivery attempts — dead-lettered.`,
    );
  }
  const { error: writeErr } = await supabase.from("events").update(patch).eq("id", eventId);
  logQueryError("events", "deliverToN8n:write_attempts", writeErr);
}

/** Retry any events that never reached n8n. Called by a Vercel cron. */
export async function drainPendingEvents(limit = 25): Promise<number> {
  if (isDemo()) return 0;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, type, payload")
    .is("processed_at", null)
    .is("dead_lettered_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  logQueryError("events", "drainPendingEvents", error);
  for (const row of data ?? [])
    await deliverToN8n(row.id, row.type, row.payload as Record<string, unknown>);
  return data?.length ?? 0;
}
