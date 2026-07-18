import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld";
import { organizationJsonLd, softwareApplicationJsonLd, webSiteJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: "MotiveFX.AI — Research smarter. Move faster.",
  description:
    "AI market intelligence for stocks, crypto, pink slips, sports betting, and prediction markets. Tiered plans from Lite to Elite.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MotiveFX.AI — Research smarter. Move faster.",
    description: "Five intelligence markets. One terminal. Pick your tier.",
    url: SITE.url,
    siteName: "MotiveFX.AI",
  },
  icons: {
    icon: "/brand/motivefx-icon.png",
    apple: "/brand/motivefx-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <JsonLdScript data={[organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()]} />
        {children}
      </body>
    </html>
  );
}
