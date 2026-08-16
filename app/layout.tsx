import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import WhatsAppWidget from "@/components/widgets/WhatsAppWidget";
import PhoneWidget from "@/components/widgets/PhoneWidget";
import PageviewTracker from "@/components/analytics/PageviewTracker";

const title = "Product Registration in UAE | MOHAP & Dubai Municipality | NextMove";
const description = "End-to-end product registration in Dubai and UAE business setup: MOHAP approvals, Dubai Municipality & ESMA registration, freezone formation and PRO services. 98% success rate.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://productregistrationinuae.com"),
  alternates: {
    canonical: "https://productregistrationinuae.com",
  },
  openGraph: {
    title,
    description,
    url: "https://productregistrationinuae.com",
    siteName: "NextMove Services",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Global Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Next Move Services",
    description,
    url: "https://productregistrationinuae.com",
    telephone: "+971 52 910 2088",
    email: "registrations@nextmoveservices.ae",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Iliya Tower 1, Office#207, PB#234823",
      addressLocality: "Dubai",
      addressCountry: "AE",
    },
    areaServed: [
      { "@type": "Country", name: "UAE" },
      { "@type": "Country", name: "Pakistan" },
      { "@type": "Country", name: "India" },
      { "@type": "Country", name: "Qatar" },
      { "@type": "Country", name: "Bangladesh" },
      { "@type": "Country", name: "Sri Lanka" },
      { "@type": "Country", name: "UK" },
      { "@type": "Country", name: "China" },
    ],
    serviceType: [
      "Product Registration",
      "MOHAP Registration",
      "Business Setup",
      "MOFA Attestation",
      "Regulatory Approvals",
      "Medical & Drugstore Setup",
    ],
    priceRange: "AED 500 - AED 15,000",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  };

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <WhatsAppWidget />
        <PhoneWidget />
        {/*
          Suspense is required: PageviewTracker reads useSearchParams(), which is a
          request-time API. Without a boundary here it would opt every statically
          prerendered public page out of static rendering (or fail the build).
        */}
        <Suspense fallback={null}>
          <PageviewTracker />
        </Suspense>
      </body>
    </html>
  );
}
