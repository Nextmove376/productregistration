import type { Metadata } from "next";
import "./globals.css";
import WhatsAppWidget from "@/components/widgets/WhatsAppWidget";
import PhoneWidget from "@/components/widgets/PhoneWidget";

const title = "Product Registration in UAE | MOHAP & Dubai Municipality";
const description = "End-to-end product registration in Dubai and UAE business setup: MOHAP approvals, Dubai Municipality & ESMA registration, freezone formation and PRO services.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", url: "https://productregistrationinuae.com" },
  twitter: { card: "summary_large_image" },
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
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              name: "Next Move Services",
              description,
              areaServed: "AE",
              telephone: "+971 52 910 2088",
              email: "registrations@nextmoveservices.ae",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Iliya Tower 1, Office#207, PB#234823",
                addressLocality: "Dubai",
                addressCountry: "AE",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <WhatsAppWidget />
        <PhoneWidget />
      </body>
    </html>
  );
}
