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
 * Full-width ink bar with the same-day promise and a LIVE countdown to the
 * 4 PM cutoff. Hidden entirely when the owner kill-switch is off.
 */
export function Ribbon({ settings }: { settings: StoreSettings }) {
  const { t } = useT();
  const [label, setLabel] = useState<string>(t("ribbon.sameDay"));

  useEffect(() => {
    if (!settings.same_day_enabled) return;
    const tick = () => {
      const { hour, minute, second } = istNow();
      const cutoff = BUSINESS.sameDayCutoffHour;
      if (hour >= cutoff) {
        setLabel(t("ribbon.afterCutoff"));
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
      setLabel(t("ribbon.countdown", { time }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [settings.same_day_enabled, t]);

  if (!settings.same_day_enabled) return null;

  return (
    <div className="bg-ink px-3 py-[9px] text-center text-[14px] font-extrabold text-ribbon font-body">
      {label}
    </div>
  );
}
