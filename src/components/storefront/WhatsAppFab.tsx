"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { BUSINESS } from "@/lib/constants";
import { Modal } from "@/components/ui";

/**
 * Floating "chat with us" button.
 * Opens an on-site Support Modal first to reduce friction,
 * offering quick FAQs before kicking them out to WhatsApp.
 */
export function WhatsAppFab() {
  const { t } = useT();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const digits = (BUSINESS.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;

  const number = digits.length === 10 ? `91${digits}` : digits;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(t("whatsapp.prefill"))}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Support & Chat"
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
          Support & Chat
        </span>
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="w-full max-w-[400px]">
            <h3 className="mb-4 font-display text-[22px] font-extrabold text-ink">
              How can we help? 🧸
            </h3>
            
            <div className="mb-5 grid gap-3">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border-3 border-ink bg-[#25D366] p-4 font-display text-[16px] font-extrabold text-white shadow-hard-3 hover:bg-[#20bd5a] active:scale-95 transition-all"
              >
                <span className="text-[24px]">💬</span>
                Chat on WhatsApp
              </a>
              
              <a
                href={`tel:+91${digits}`}
                className="flex items-center gap-3 rounded-2xl border-3 border-ink bg-paper p-4 font-display text-[16px] font-extrabold text-ink shadow-hard-3 hover:bg-cream active:scale-95 transition-all"
              >
                <span className="text-[24px]">📞</span>
                Call {BUSINESS.phone}
              </a>
            </div>

            <div className="rounded-xl border-2 border-ink bg-[#FFF6ED] p-3">
              <h4 className="mb-2 font-display text-[14px] font-extrabold text-mute uppercase tracking-wider">
                Quick Answers
              </h4>
              <ul className="grid gap-3 text-[13px] text-ink/80">
                <li>
                  <strong className="text-ink">Delivery Time?</strong><br />
                  Same-day delivery in Thoothukudi. 2-3 days anywhere else in Tamil Nadu.
                </li>
                <li>
                  <strong className="text-ink">Returns & Exchanges?</strong><br />
                  We accept returns for unworn clothing within 7 days. Toys & diapers are non-returnable.
                </li>
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
