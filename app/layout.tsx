import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Nunito is the ONLY typeface in the app (User Mode, Admin Dashboard, TV Display all inherit it).
// next/font fetches it from Google Fonts at build time and self-hosts it.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // Regular, Medium, SemiBold, Bold, ExtraBold
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = { title: "Lucky Cat Mahjong", description: "Your Mahjong Companion" };
export const viewport: Viewport = { themeColor: "#461F1A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={nunito.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
