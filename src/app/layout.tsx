import type { Metadata, Viewport } from "next";
import { Baloo_2, Karla, Noto_Sans_Tamil } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getLanguage } from "@/lib/i18n/server";
import { CartProvider } from "@/lib/store/CartProvider";
import { SessionProvider } from "@/lib/store/SessionProvider";
import { isDemo } from "@/lib/data/mode";
import { BUSINESS, siteUrl } from "@/lib/constants";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-karla",
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["500", "700"],
  variable: "--font-tamil",
  display: "swap",
});

const DESCRIPTION =
  "Thoothukudi's most-loved baby store. Baby products, toys, clothing and mom care — same-day delivery in Thoothukudi for orders before 4 PM.";

export const metadata: Metadata = {
  // Required for OG/canonical URLs to resolve to absolute links — without it
  // a shared link renders no preview card at all.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BUSINESS.name} — Baby Store, Thoothukudi`,
    template: `%s · ${BUSINESS.name}`,
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: BUSINESS.name,
    locale: "en_IN",
    title: `${BUSINESS.name} — Baby Store, Thoothukudi`,
    description: DESCRIPTION,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: BUSINESS.name }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#EC5D8A",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLanguage();

  return (
    <html
      lang={lang}
      className={`${baloo.variable} ${karla.variable} ${notoTamil.variable}`}
    >
      <body className="min-h-screen antialiased bg-[#FAF8F5] relative">
        {/* Fixed hand-drawn baby-doodle wallpaper — warm off-white base with a
            subtle repeating pattern of bottles, balloons, rattles & safety pins.
            Stays put while content scrolls smoothly over it. */}
        {/* Colorful Neo-Brutalist Background Canvas */}
        <div className="fixed inset-0 -z-30 bg-gradient-to-br from-[#FFEBF2] via-[#FFF6E5] to-[#E8F3FF] pointer-events-none" />

        {/* Ambient Color Blobs — enhanced soft vibrancy */}
        <div className="fixed -top-24 -left-24 -z-20 h-[600px] w-[600px] rounded-full bg-[#FFB8CC]/75 blur-[90px] pointer-events-none" />
        <div className="fixed top-1/4 -right-24 -z-20 h-[550px] w-[550px] rounded-full bg-[#FFD68A]/80 blur-[90px] pointer-events-none" />
        <div className="fixed bottom-1/4 -left-20 -z-20 h-[600px] w-[600px] rounded-full bg-[#B2E2FF]/80 blur-[90px] pointer-events-none" />
        <div className="fixed -bottom-24 -right-20 -z-20 h-[550px] w-[550px] rounded-full bg-[#D8C2FF]/75 blur-[90px] pointer-events-none" />

        {/* Hand-drawn colorful baby-doodle pattern layer — neo-brutalist theme wallpaper */}
        <div
          className="fixed inset-0 -z-10 pointer-events-none opacity-[0.42]"
          style={{
            backgroundImage: "url('/doodle-pattern.svg')",
            backgroundRepeat: "repeat",
            backgroundSize: "360px 360px",
          }}
        />

        <LanguageProvider initialLang={lang}>
          <SessionProvider isDemo={isDemo()}>
            <CartProvider>{children}</CartProvider>
          </SessionProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
