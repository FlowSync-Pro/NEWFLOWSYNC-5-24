import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SpeedInsights } from "@vercel/speed-insights/next";
import MetaPixel from "@/components/MetaPixel";
import GoogleTagManager from "@/components/GoogleTagManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "FlowSync — Drive every kind of delivery, your way";
const description =
  "FlowSync is the driver-owned marketplace for grocery, food, furniture, courier, pharmacy, senior errands, moving, and auto parts delivery. Pick your service, build your profile, keep more of what you earn.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s · FlowSync",
  },
  description,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title,
    description,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  // Meta domain verification (Business Settings → Brand Safety → Domains).
  other: {
    "facebook-domain-verification":
      process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION ??
      "ih9zjpk5stwwwehn8qehjd7csvupd4",
    // Impact.com site ownership verification — proves we own flowsyncdriver.com
    // so Impact attributes affiliate conversions back to FlowSync.
    "impact-site-verification": "2de5e941-38d7-4691-9fe9-d3422a7f60aa",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Comma-separated list of Meta Pixel IDs so we can dual-fire during the
  // migration from the old flowsyncdrivers.com pixel to the new
  // flowsyncdriver.com pixel. Ad campaigns currently target the old pixel —
  // we keep firing both until the new pixel has enough learning data to
  // safely migrate campaigns and sunset the old one.
  //
  //   1719247029245897 — OLD (flowsyncdrivers.com) — where current ads live
  //   2070476707153491 — NEW (flowsyncdriver.com) — long-term home
  const metaPixelIds = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "2070476707153491,1719247029245897")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fbAppId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description,
        slogan: "Drive every kind of delivery, your way.",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <GoogleTagManager />
        <MetaPixel pixelIds={metaPixelIds} />
        {fbAppId && <meta property="fb:app_id" content={fbAppId} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}
