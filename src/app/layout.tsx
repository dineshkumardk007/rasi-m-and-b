import type { Metadata, Viewport } from "next";
import { Baloo_2, Karla, Noto_Sans_Tamil } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getLanguage } from "@/lib/i18n/server";
import { CartProvider } from "@/lib/store/CartProvider";
import { SessionProvider } from "@/lib/store/SessionProvider";
import { isDemo } from "@/lib/data/mode";
import { BUSINESS } from "@/lib/constants";
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

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} — Baby Store, Thoothukudi`,
    template: `%s · ${BUSINESS.name}`,
  },
  description:
    "Thoothukudi's most-loved baby store. Baby products, toys, clothing and mom care — same-day delivery in Thoothukudi for orders before 4 PM.",
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
      <body className="min-h-screen antialiased">
        <LanguageProvider initialLang={lang}>
          <SessionProvider isDemo={isDemo()}>
            <CartProvider>{children}</CartProvider>
          </SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
