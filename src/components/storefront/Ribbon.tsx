"use client";

import { useEffect, useState } from "react";
import type { StoreSettings } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { BUSINESS } from "@/lib/constants";

/** IST clock helpers for the 4 PM same-day cutoff. */
function istNow(): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute"), second: get("second") };
}

/**
 * Top Announcement Marquee Ticker & Same-Day Countdown Ribbon.
 */
export function Ribbon({ settings }: { settings: StoreSettings }) {
  const { t, lang } = useT();
  const [countdownLabel, setCountdownLabel] = useState<string>(t("ribbon.sameDay"));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!settings.same_day_enabled) return;
    const tick = () => {
      const { hour, minute, second } = istNow();
      const cutoff = BUSINESS.sameDayCutoffHour;
      if (hour >= cutoff) {
        setCountdownLabel(t("ribbon.afterCutoff"));
        return;
      }
      const secondsLeft = (cutoff - hour) * 3600 - minute * 60 - second;
      const h = Math.floor(secondsLeft / 3600);
      const m = Math.floor((secondsLeft % 3600) / 60);
      const s = secondsLeft % 60;
      const time =
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m`
          : `${m}m ${String(s).padStart(2, "0")}s`;
      setCountdownLabel(t("ribbon.countdown", { time }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [settings.same_day_enabled, t]);

  if (dismissed) return null;

  const isAnnouncementActive = settings.announcement_enabled ?? true;
  const customText =
    lang === "ta"
      ? settings.announcement_text_ta || settings.announcement_text_en
      : settings.announcement_text_en;

  if (!isAnnouncementActive && !settings.same_day_enabled) return null;

  const bg = settings.announcement_bg || "#2B2140";
  const color = settings.announcement_color || "#FFE1A8";

  const displayText = customText
    ? settings.same_day_enabled
      ? `${customText}  ·  ⚡ ${countdownLabel}`
      : customText
    : countdownLabel;

  return (
    <div
      style={{ backgroundColor: bg, color }}
      className="relative flex items-center justify-between overflow-hidden px-4 py-2 text-center text-[13px] font-extrabold shadow-sm font-body border-b-2 border-ink/20"
    >
      <div className="mx-auto flex items-center justify-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap px-6">
        <span>{displayText}</span>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-extrabold opacity-70 hover:opacity-100 cursor-pointer p-1"
        aria-label="Dismiss banner"
        title="Close"
      >
        ✕
      </button>
    </div>
  );
}
