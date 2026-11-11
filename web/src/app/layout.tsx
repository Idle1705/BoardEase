import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Hanken_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Locked brand fonts (SIL Open Font License). next/font self-hosts them at build time:
// one variable file each, no request to Google from the visitor's browser.
const familjen = Familjen_Grotesk({ variable: "--font-familjen", subsets: ["latin"], display: "swap" });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BoardEase: rooms for rent in Davao City", template: "%s | BoardEase" },
  description:
    "Find bedspaces, dorms, boarding houses and apartments near your school or work in Davao City. Compare monthly rent, distance and amenities on one map.",
  openGraph: {
    title: "BoardEase: rooms for rent in Davao City",
    description: "Compare bedspaces, dorms and apartments by monthly rent and distance on one map.",
    type: "website",
    locale: "en_PH",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${familjen.variable} ${hanken.variable} antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
