"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { BUSINESS, inr } from "@/lib/constants";
import type { Product } from "@/lib/types";

/**
 * Share a product.
 *
 * On a phone this opens the OS share sheet, which is where WhatsApp actually
 * lives — the single tap most customers here expect. Desktop browsers mostly
 * lack navigator.share, so those fall back to an explicit WhatsApp link plus
 * copy-to-clipboard. Both paths share the /p/[slug] URL, never the filtered
 * storefront URL, so the recipient lands on the product page with its own
 * preview card.
 */
export function ShareButton({
  product,
  notify,
  small,
}: {
  product: Product;
  notify: (m: string) => void;
  /** Compact styling for the quick-view modal. */
  small?: boolean;
}) {
  const { t, lang } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  const name = lang === "ta" ? product.name_ta : product.name_en;
  const url =
    typeof window === "undefined" ? "" : `${window.location.origin}/p/${product.slug}`;
  const message = `${t("share.message", { store: BUSINESS.name })}\n${name} — ${inr(product.price)}\n${url}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify(t("toast.linkCopied"));
    } catch {
      // Clipboard is blocked without HTTPS or permission — show the raw URL so
      // the customer can still select and copy it by hand.
      window.prompt(t("share.copyLink"), url);
    }
    setMenuOpen(false);
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: name, text: message, url });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to
        // the menu rather than leaving the tap with no result.
      }
    }
    setMenuOpen((open) => !open);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        className={`btn-press rounded-pill border-2.5 border-ink bg-[#B9EBDD] font-display font-extrabold text-ink shadow-hard-2 ${
          small ? "px-3.5 py-[7px] text-[13px] min-h-[38px]" : "px-5 py-2.5 text-[15px] min-h-[44px]"
        }`}
        aria-label={t("share.button")}
      >
        🔗 {t("share.button")}
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-20 mt-2 w-[220px] overflow-hidden rounded-card border-3 border-ink bg-paper shadow-hard-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="block border-b-2 border-ink px-4 py-3 text-left text-[14px] font-bold hover:bg-[#D6E8B0]"
          >
            💬 {t("share.whatsapp")}
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="block w-full px-4 py-3 text-left text-[14px] font-bold hover:bg-[#FFE1A8]"
          >
            🔗 {t("share.copyLink")}
          </button>
        </div>
      )}
    </div>
  );
}
