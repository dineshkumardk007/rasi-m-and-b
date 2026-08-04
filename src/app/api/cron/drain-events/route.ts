import { NextResponse } from "next/server";
import { drainPendingEvents } from "@/lib/data/events";
import { env } from "@/env.mjs";

/**
 * Retry queue drain: re-sends events that never reached n8n (order creation
 * must succeed even when n8n/WhatsApp is down — Section 5 rule).
 *
 * Scheduled in vercel.json. It runs once a day, because daily is the only
 * frequency Vercel's Hobby plan allows — so a delivery that fails inline can
 * wait up to 24h for the retry. On Pro, change the schedule to a 5-minute cron
 * ("*\/5 * * * *"); nothing in this route needs to change.
 *
 * Note this is the backstop, not the primary path: logEvent() delivers inline
 * via after(), so the drain only matters when n8n was actually unreachable.
 */
export async function GET(request: Request) {
  // Fails closed: without CRON_SECRET set, there's no way to distinguish
  // Vercel's dispatcher from a public caller, so the route refuses everyone
  // rather than running unauthenticated. Set CRON_SECRET in the Vercel
  // project env — Vercel then sends it as this Authorization header itself.
  const secret = env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const drained = await drainPendingEvents();
  return NextResponse.json({ drained });
}
