import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import { content as d } from "./content";

/** ISR floor — admin edits merged in by ServicePageLayout appear within 5 minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Regulatory Approvals UAE | ESMA, GMP, Halal Certification | NextMove",
  description: "Expert regulatory approval services in UAE. ESMA certification, GMP verification, Halal certification, and lab testing coordination. 98% success rate. Free assessment.",
  alternates: { canonical: "https://productregistrationinuae.com/services/regulatory-approvals" },
  openGraph: {
    title: "Regulatory Approvals UAE | ESMA, GMP, Halal Certification | NextMove",
    description: "Expert regulatory approval services in UAE. ESMA certification, GMP verification, Halal certification, and lab testing coordination. 98% success rate.",
    url: "https://productregistrationinuae.com/services/regulatory-approvals",
    type: "website",
  },
};

export default function RegulatoryApprovalsPage() {
  return <ServicePageLayout data={d} />;
}
