"use client";

import { useEffect, useState } from "react";
import { glowStyle } from "@/lib/constants";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-[480px] animate-bounce-short sm:bottom-6 sm:left-auto sm:right-6 sm:w-[380px]">
      <div
        className="rounded-card border-3 border-ink bg-[#FFF6E5] p-3.5 shadow-hard-3"
        style={glowStyle("#FFD68A")}
      >
        <div className="flex items-center gap-3">
          <span className="text-[28px]">📱</span>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-[15px] font-extrabold text-ink leading-tight">
              Install Rasi App
            </h4>
            <p className="text-[12px] text-mute leading-snug">
              Add to your phone for 1-tap fast baby shopping!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[18px] text-mute hover:text-ink px-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="btn-press w-full rounded-pill border-2.5 border-ink bg-[#8CE0CE] px-4 py-1.5 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#6FD4BD]"
          >
            📲 Add to Home Screen
          </button>
        </div>
      </div>
    </div>
  );
}
