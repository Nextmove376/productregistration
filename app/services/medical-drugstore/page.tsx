import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import { content as d } from "./content";

/** ISR floor — admin edits merged in by ServicePageLayout appear within 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pharmacy Setup Dubai | Drugstore License & Medical Registration | NextMove",
  description: "Expert pharmacy setup services in Dubai. Drugstore licensing, UAE trademark registration, and medical store setup. 98% success rate. Free consultation.",
  alternates: { canonical: "https://productregistrationinuae.com/services/medical-drugstore" },
  openGraph: {
    title: "Pharmacy Setup Dubai | Drugstore License & Medical Registration | NextMove",
    description: "Expert pharmacy setup services in Dubai. Drugstore licensing, UAE trademark registration, and medical store setup. 98% success rate.",
    url: "https://productregistrationinuae.com/services/medical-drugstore",
    type: "website",
  },
};

export default function MedicalDrugstorePage() {
  return <ServicePageLayout data={d} />;
}
