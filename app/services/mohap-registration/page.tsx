import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import { content as d } from "./content";

/** ISR floor — admin edits merged in by ServicePageLayout appear within 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "MOHAP Registration UAE | Medical Devices & Pharmaceuticals | NextMove",
  description: "Expert MOHAP registration services in UAE. Register medical devices, pharmaceuticals, and health products with the Ministry of Health. 98% success rate. Free assessment.",
  alternates: { canonical: "https://productregistrationinuae.com/services/mohap-registration" },
  openGraph: {
    title: "MOHAP Registration UAE | Medical Devices & Pharmaceuticals | NextMove",
    description: "Expert MOHAP registration services in UAE. Register medical devices, pharmaceuticals, and health products with the Ministry of Health. 98% success rate.",
    url: "https://productregistrationinuae.com/services/mohap-registration",
    type: "website",
  },
};

export default function MOHAPPage() {
  return <ServicePageLayout data={d} />;
}
