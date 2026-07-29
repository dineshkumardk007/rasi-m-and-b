"use client";

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
      className="btn-press fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-pill border-3 border-ink bg-[#25D366] px-4 py-3 font-display text-[14px] font-extrabold text-white shadow-hard-4 sm:bottom-5 print:hidden"
    >
      <span className="text-[18px]" aria-hidden>
        💬
      </span>
      <span className="hidden sm:inline">{t("whatsapp.chat")}</span>
    </a>
  );
}
