import type { Metadata } from "next";
import Link from "next/link";
import { getLanguage } from "@/lib/i18n/server";
import { BUSINESS } from "@/lib/constants";
import { LEGAL_DOCS, LEGAL_TITLES } from "@/lib/legal/content";

/**
 * Contact Us — the fourth page Razorpay looks for, and the one customers
 * actually use. Channels render only when configured: BUSINESS.phone and
 * BUSINESS.email are TODO nulls until the owner supplies them, and publishing a
 * placeholder number on a real shop's contact page is worse than publishing none.
 */

export const dynamic = "force-dynamic";

const COPY = {
  en: {
    title: "Contact us",
    intro: "Come to the shop, call us, or message us on WhatsApp — whichever is easiest.",
    visit: "Visit the shop",
    hours: "Hours",
    hoursValue: `Opens ${BUSINESS.opensAt} daily`,
    reach: "Reach us",
    pending: "Our phone and email are being set up. Until then, please visit the shop.",
    policies: "Our policies",
    directions: "Get directions",
  },
  ta: {
    title: "தொடர்புக்கு",
    intro: "கடைக்கு வாருங்கள், அழையுங்கள், அல்லது வாட்ஸ்அப்பில் செய்தி அனுப்புங்கள் — உங்களுக்கு எது எளிதோ அது.",
    visit: "கடைக்கு வாருங்கள்",
    hours: "நேரம்",
    hoursValue: `தினமும் காலை ${BUSINESS.opensAt} மணிக்குத் திறக்கிறது`,
    reach: "எங்களைத் தொடர்பு கொள்ள",
    pending: "எங்கள் தொலைபேசி மற்றும் மின்னஞ்சல் அமைக்கப்பட்டு வருகிறது. அதுவரை கடைக்கு வாருங்கள்.",
    policies: "எங்கள் கொள்கைகள்",
    directions: "வழி காட்டு",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  const c = COPY[lang];
  return {
    title: c.title,
    description: `${BUSINESS.name}, ${BUSINESS.addressShort}. ${c.intro}`,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const lang = await getLanguage();
  const c = COPY[lang];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${BUSINESS.name}, ${BUSINESS.address}`,
  )}`;

  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-5 py-6 text-ink">
      <Link
        href="/"
        className="mb-4 inline-block rounded-pill border-2.5 border-ink bg-paper px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
      >
        ← {BUSINESS.name}
      </Link>

      <div className="rounded-card border-3 border-ink bg-paper p-[22px] shadow-hard-4">
        <h1 className="font-display text-[26px] font-extrabold leading-tight">{c.title}</h1>
        <p className="mt-3 font-body text-[15px] leading-relaxed">{c.intro}</p>

        <section className="mt-7">
          <h2 className="font-display text-[18px] font-extrabold">{c.visit}</h2>
          <p className="mt-2 font-body text-[15px] leading-relaxed">{BUSINESS.address}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press mt-3 inline-block rounded-pill border-3 border-ink bg-brand px-5 py-[11px] font-display text-[15px] font-extrabold text-white shadow-hard-3"
          >
            📍 {c.directions}
          </a>
        </section>

        <section className="mt-7">
          <h2 className="font-display text-[18px] font-extrabold">{c.hours}</h2>
          <p className="mt-2 font-body text-[15px] leading-relaxed">{c.hoursValue}</p>
        </section>

        <section className="mt-7">
          <h2 className="font-display text-[18px] font-extrabold">{c.reach}</h2>
          {BUSINESS.phone || BUSINESS.email ? (
            <div className="mt-2 flex flex-col gap-2">
              {BUSINESS.phone && (
                <a
                  href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
                  className="font-body text-[15px] leading-relaxed underline"
                >
                  📞 {BUSINESS.phone}
                </a>
              )}
              {BUSINESS.email && (
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="font-body text-[15px] leading-relaxed underline"
                >
                  ✉️ {BUSINESS.email}
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 font-body text-[15px] leading-relaxed text-mute">{c.pending}</p>
          )}
        </section>

        <section className="mt-7">
          <h2 className="font-display text-[18px] font-extrabold">{c.policies}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEGAL_DOCS.map((doc) => (
              <Link
                key={doc}
                href={`/legal/${doc}`}
                className="btn-press rounded-pill border-2.5 border-ink bg-[#F2EAE0] px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
              >
                {LEGAL_TITLES[lang][doc]}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
