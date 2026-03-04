import "./globals.css";
import type { Metadata } from "next";
import { Inter, Cairo, Amiri } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { locales } from "../../i18n";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Munajjam Desktop",
  description:
    "Desktop workspace for local Quran recitation alignment, review, and timestamp editing.",
  icons: {
    icon: "/itqan_logo.svg",
    apple: "/itqan_logo.svg",
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  // Await params in Next.js 16
  const { locale } = await params;

  // Enable static rendering for this locale
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  const isRTL = locale === "ar";
  const fontClass = isRTL ? `${cairo.variable} ${amiri.variable}` : inter.variable;

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      className="dark"
      suppressHydrationWarning
    >
      <body
        className={`${fontClass} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
