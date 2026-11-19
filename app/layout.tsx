import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { NoZoom } from "@/components/ui/NoZoom";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { getLang } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dictionary";
import { setRequestLang } from "@/lib/i18n/locale";

// Nunito is the ONLY typeface in the app (User Mode, Admin Dashboard, TV Display all inherit it).
// next/font fetches it from Google Fonts at build time and self-hosts it.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // Regular, Medium, SemiBold, Bold, ExtraBold
  variable: "--font-nunito",
  display: "swap",
});

export function generateMetadata(): Metadata { return { title: "Lucky Cat Mahjong", description: translate(getLang(), "app.tagline") }; }
export const viewport: Viewport = { themeColor: "#461F1A", width: "device-width", initialScale: 1, minimumScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  setRequestLang(lang);
  return (
    <html lang={lang} data-i18n={lang === "en" ? "pending" : undefined} suppressHydrationWarning className={nunito.variable}>
      <body className="min-h-screen font-sans"><NoZoom /><I18nProvider initialLang={lang}>{children}</I18nProvider></body>
    </html>
  );
}
