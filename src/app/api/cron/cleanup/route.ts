import { NextResponse } from "next/server";
import { isDemo } from "@/lib/data/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/env.mjs";

/**
 * Automated maintenance cron endpoint: purges expired rate limit attempt logs
 * and stale records older than 24 hours.
 *
 * Protected with CRON_SECRET header verification.
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let purged = 0;

  if (!isDemo()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.rpc("purge_stale_rate_limits", {
        p_older_than_seconds: 86400,
      });
      if (!error && typeof data === "number") {
        purged = data;
      }
    } catch {
      // Fail gracefully if migration function is pending
    }
  }

  return NextResponse.json({ success: true, purged });
}
