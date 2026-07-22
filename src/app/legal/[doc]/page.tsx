import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/data/catalog";
import { DELIVERY_FEE } from "@/lib/data/orders";
import { getLanguage } from "@/lib/i18n/server";
import { BUSINESS, inr } from "@/lib/constants";
import {
  LEGAL_DOCS,
  LEGAL_LAST_UPDATED,
  getLegalContent,
  type LegalDocSlug,
  type LegalVars,
} from "@/lib/legal/content";

/**
 * The four policy documents, one route. Razorpay checks that each is reachable
 * at its own URL before activating a merchant account, and customers land here
 * from the footer.
 *
 * Dynamic because the copy quotes live store settings — the delivery fee, free
 * delivery threshold, COD ceiling and serviceable PINs are all admin-editable.
 */

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ doc: string }>;
}

const isLegalDoc = (value: string): value is LegalDocSlug =>
  (LEGAL_DOCS as readonly string[]).includes(value);

async function loadVars(): Promise<LegalVars> {
  const settings = await getSettings();
  return {
    deliveryFee: inr(DELIVERY_FEE),
    freeAbove: inr(settings.free_delivery_threshold),
    codLimit: inr(settings.cod_limit),
    pins: settings.serviceable_pins.join(", "),
    returnDays: BUSINESS.returnWindowDays,
    business: BUSINESS.name,
    address: BUSINESS.address,
    city: BUSINESS.city,
    cutoff: "4 PM",
    phone: BUSINESS.phone,
    email: BUSINESS.email,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalDoc(doc)) return {};

  const lang = await getLanguage();
  const content = getLegalContent(doc, lang, await loadVars());

  return {
    title: content.title,
    description: content.intro,
    alternates: { canonical: `/legal/${doc}` },
    openGraph: { title: `${content.title} · ${BUSINESS.name}`, description: content.intro },
  };
}

export default async function LegalPage({ params }: Props) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();

  const lang = await getLanguage();
  const content = getLegalContent(doc, lang, await loadVars());

  const updated = new Intl.DateTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <main className="mx-auto min-h-screen max-w-[720px] bg-cream px-5 py-6 text-ink">
      <Link
        href="/"
        className="mb-4 inline-block rounded-pill border-2.5 border-ink bg-paper px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
      >
        ← {BUSINESS.name}
      </Link>

      <article className="rounded-card border-3 border-ink bg-paper p-[22px] shadow-hard-4">
        <h1 className="font-display text-[26px] font-extrabold leading-tight">
          {content.title}
        </h1>
        <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[.5px] text-mute font-display">
          {lang === "ta" ? "கடைசியாக புதுப்பிக்கப்பட்டது" : "Last updated"} · {updated}
        </p>
        <p className="mt-3 font-body text-[15px] leading-relaxed">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading} className="mt-7">
            <h2 className="font-display text-[18px] font-extrabold">{section.heading}</h2>
            {section.body.map((line, i) =>
              line.startsWith("• ") ? (
                <p
                  key={i}
                  className="mt-1.5 pl-4 font-body text-[15px] leading-relaxed -indent-4"
                >
                  {line}
                </p>
              ) : (
                <p key={i} className="mt-2 font-body text-[15px] leading-relaxed">
                  {line}
                </p>
              ),
            )}
          </section>
        ))}
      </article>

      <p className="mt-6 text-center text-[12px] text-mute">
        {BUSINESS.name} · {BUSINESS.addressShort}
      </p>
    </main>
  );
}
