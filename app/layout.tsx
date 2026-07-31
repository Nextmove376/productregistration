import type { Metadata } from "next";
import "./globals.css";

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
  icons: { icon: [{ url: '/favicon.png', type: 'image/png' }, { url: '/favicon.ico', type: 'image/x-icon' }] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.png" type="image/png" />
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
      </body>
    </html>
  );
}
