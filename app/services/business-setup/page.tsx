import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import { content as d } from "./content";

/** ISR floor — admin edits merged in by ServicePageLayout appear within 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Business Setup Dubai | Company Formation & Trade License | NextMove",
  description: "Expert business setup services in Dubai & UAE. Mainland, freezone, and offshore company formation. Trade license processing. 98% success rate. Free consultation.",
  alternates: { canonical: "https://productregistrationinuae.com/services/business-setup" },
  openGraph: {
    title: "Business Setup Dubai | Company Formation & Trade License | NextMove",
    description: "Expert business setup services in Dubai & UAE. Mainland, freezone, and offshore company formation. Trade license processing. 98% success rate.",
    url: "https://productregistrationinuae.com/services/business-setup",
    type: "website",
  },
};

export default function BusinessSetupPage() {
  return <ServicePageLayout data={d} />;
}
