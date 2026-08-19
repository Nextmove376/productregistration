import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import { content as d } from "./content";

/**
 * ISR floor. The built-in copy now lives in `./content`, and ServicePageLayout
 * merges anything the admin panel has saved for this slug over the top of it —
 * without this the page would be built once and an edit would never show up
 * until the next deploy.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Product Registration in Dubai | Dubai Municipality & ESMA | NextMove",
  description: "Expert product registration services in Dubai & UAE. Register cosmetics, food, supplements with Dubai Municipality, ESMA & MOIAT. 98% success rate. Free assessment.",
  alternates: {
    canonical: "https://productregistrationinuae.com/services/product-registration",
  },
  openGraph: {
    title: "Product Registration in Dubai | Dubai Municipality & ESMA | NextMove",
    description: "Expert product registration services in Dubai & UAE. Register cosmetics, food, supplements with Dubai Municipality, ESMA & MOIAT. 98% success rate.",
    url: "https://productregistrationinuae.com/services/product-registration",
    type: "website",
  },
};

export default function ProductRegistrationPage() {
  return <ServicePageLayout data={d} />;
}
