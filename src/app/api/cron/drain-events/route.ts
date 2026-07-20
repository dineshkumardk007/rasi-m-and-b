import { NextResponse } from "next/server";
import { drainPendingEvents } from "@/lib/data/events";

/**
 * Retry queue drain: re-sends events that never reached n8n (order creation
 * must succeed even when n8n/WhatsApp is down — Section 5 rule).
 * Schedule on Vercel: vercel.json crons → "/api/cron/drain-events" every 5 min.
 */
export async function GET(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const drained = await drainPendingEvents();
  return NextResponse.json({ drained });
}
