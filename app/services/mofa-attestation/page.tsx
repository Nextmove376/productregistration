import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import { content as d } from "./content";

/** ISR floor — admin edits merged in by ServicePageLayout appear within 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "MOFA Attestation Dubai | Document Legalization & PRO Services | NextMove",
  description: "Expert MOFA attestation services in Dubai. Embassy legalization, certified translations, and PRO services. Fast processing. Free consultation.",
  alternates: { canonical: "https://productregistrationinuae.com/services/mofa-attestation" },
  openGraph: {
    title: "MOFA Attestation Dubai | Document Legalization & PRO Services | NextMove",
    description: "Expert MOFA attestation services in Dubai. Embassy legalization, certified translations, and PRO services. Fast processing.",
    url: "https://productregistrationinuae.com/services/mofa-attestation",
    type: "website",
  },
};

export default function MOFAPage() {
  return <ServicePageLayout data={d} />;
}
