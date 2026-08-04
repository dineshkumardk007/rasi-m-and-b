"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { BUSINESS } from "@/lib/constants";

/**
 * Floating "chat with us" button.
 *
 * In Thoothukudi a WhatsApp conversation is often more trusted than an online
 * checkout — a parent wants to ask whether a formula is in stock, or which size
 * fits, before paying. Losing that question loses the sale.
 *
 * Renders nothing when the shop has no phone number configured, rather than
 * linking to a broken chat.
 */
export function WhatsAppFab() {
  const { t } = useT();
  // Collapses to icon-only once the page scrolls, so it stops competing with
  // content for attention — expands back the moment the visitor scrolls back
  // up near the top. Mobile already hides the label at every scroll position
  // (no room for it there), so this only visibly changes anything on sm+.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const digits = (BUSINESS.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;

  // wa.me wants country code + number, no punctuation.
  const number = digits.length === 10 ? `91${digits}` : digits;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(t("whatsapp.prefill"))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp.chat")}
      /*
       * bottom-20 on phones keeps it clear of the sticky cart bar; sm:bottom-5
       * drops it back down on desktop where nothing else occupies that corner.
       */
      className={`btn-press fixed bottom-20 right-4 z-40 flex items-center rounded-pill border-3 border-ink bg-[#25D366] py-3 font-display text-[14px] font-extrabold text-white shadow-hard-4 transition-all duration-300 sm:bottom-5 print:hidden ${
        scrolled ? "gap-0 px-3" : "gap-2 px-4"
      }`}
    >
      <span className="text-[18px]" aria-hidden>
        💬
      </span>
      <span
        className={`hidden overflow-hidden whitespace-nowrap transition-all duration-300 sm:inline ${
          scrolled ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
        }`}
      >
        {t("whatsapp.chat")}
      </span>
    </a>
  );
}
