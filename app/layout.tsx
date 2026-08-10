import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import ContactWidgets from "@/components/widgets/ContactWidgets";
import Tracker from "@/components/Tracker";

const sora = Sora({ subsets: ["latin"], weight: ["500","600","700"], variable: "--font-display-loaded", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-sans-loaded", display: "swap" });

const title = "Product Registration in UAE | MOHAP & Dubai Municipality";
const description = "End-to-end product registration in Dubai and UAE business setup: MOHAP approvals, Dubai Municipality & ESMA registration, freezone formation and PRO services.";
const BASE_URL = "https://productregistrationinuae.com";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title,
    description,
    type: "website",
    url: BASE_URL,
    siteName: "Next Move Services",
    images: [{ url: "/images/hero-dubai.jpg", width: 1920, height: 1200, alt: "Dubai skyline — product registration and business setup in UAE" }],
    locale: "en_AE",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/hero-dubai.jpg"],
  },
  alternates: { canonical: BASE_URL },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  return (
    <html lang="en" className={`h-full antialiased ${sora.variable} ${jakarta.variable}`}>
      <head>
        <link rel="icon" href="data:image/png;base64,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" type="image/png" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="256x256" />
        <meta name="theme-color" content="#1a2b3b" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              name: "Next Move Services",
              url: BASE_URL,
              description,
              areaServed: "AE",
              telephone: "+971 52 910 2088",
              email: "hello@nextmoveservices.ae",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Iliya Tower 1, Office# 207, PB#234823",
                addressLocality: "Dubai",
                addressCountry: "AE",
              },
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
                opens: "08:30",
                closes: "17:30",
              },
              sameAs: [
                "https://wa.me/971529102088",
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ContactWidgets
          whatsapp={{
            enabled: settings.whatsapp_enabled,
            greeting: settings.whatsapp_greeting,
            agents: settings.whatsapp_agents,
          }}
          phone={{
            enabled: settings.phone_enabled,
            greeting: settings.phone_greeting,
            agents: settings.phone_agents,
          }}
        />
        {/* useSearchParams needs a Suspense boundary or the whole tree opts out
            of static rendering. */}
        <Suspense fallback={null}>
          <Tracker />
        </Suspense>
      </body>
    </html>
  );
}
