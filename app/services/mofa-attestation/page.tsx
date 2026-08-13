import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const metadata: Metadata = {
  title: "MOFA Attestation Dubai - Document Legalization & PRO Services - NextMove",
  description: "MOFA attestation, embassy legalization, certified translations, and PRO services in Dubai. Fast processing. Free consultation.",
};

const d: ServicePageData = {
  serviceName: "MOFA Attestation",
  tag: "Government Services",
  title: "MOFA Attestation & PRO Services",
  subtitle: "Document attestation, embassy legalization, and public relations paperwork handled end-to-end",
  heroDescription: "We handle MOFA attestation, embassy legalization, certified translations, and all PRO services at government counters.",
  trustBadge: "Authorized PRO Services Provider",
  overview: "Document attestation and legalization is a critical requirement for businesses operating in the UAE. Whether you need educational certificates attested for employment, commercial documents legalized for business setup, or product certificates verified for registration, the process involves multiple government entities. At NextMove, we handle the entire attestation chain from origin country verification through MOFA attestation and embassy legalization.",
  process: [
    { step: 1, title: "Document Review", description: "We assess which documents need attestation and the required chain.", timeline: "1 day" },
    { step: 2, title: "Origin Verification", description: "We coordinate verification in the country of origin.", timeline: "1-2 weeks" },
    { step: 3, title: "MOFA Submission", description: "We submit documents to UAE Ministry of Foreign Affairs.", timeline: "2-3 days" },
    { step: 4, title: "Embassy Legalization", description: "We process embassy legalization where required.", timeline: "3-5 days" },
    { step: 5, title: "Translation", description: "We arrange certified Arabic translations.", timeline: "2-3 days" },
    { step: 6, title: "Delivery", description: "We deliver fully attested and translated documents.", timeline: "1 day" },
  ],
  included: ["MOFA attestation", "Embassy legalization", "Certified translations", "Visa and Emirates ID processing", "Corporate PRO retainer", "Document clearance"],
  documents: [
    { text: "Original documents to be attested" },
    { text: "Passport copies" },
    { text: "Previous attestation certificates (if any)" },
    { text: "Authorization letter" },
  ],
  pricing: [
    { service: "MOFA Attestation (per document)", timeline: "2-3 days", price: "AED 300" },
    { service: "Embassy Legalization", timeline: "3-5 days", price: "AED 500" },
    { service: "Certified Translation", timeline: "2-3 days", price: "AED 200" },
    { service: "PRO Retainer (monthly)", timeline: "Ongoing", price: "AED 2,000" },
  ],
  differentiators: [
    { icon: "shield", title: "Government Access", description: "Direct access to MOFA and embassy counters." },
    { icon: "clock", title: "Fast Turnaround", description: "Most attestations completed within one week." },
    { icon: "check", title: "Full Chain", description: "We handle the entire attestation chain end-to-end." },
    { icon: "users", title: "Experienced PROs", description: "Team with years of government liaison experience." },
  ],
  faq: [
    { question: "What is MOFA attestation?", answer: "MOFA attestation is the UAE Ministry of Foreign Affairs verification of documents for legal use in the UAE." },
    { question: "How long does attestation take?", answer: "2-7 days for MOFA attestation. Full chain including origin verification: 2-4 weeks." },
    { question: "Which documents need attestation?", answer: "Educational certificates, commercial documents, power of attorney, and product certificates typically need attestation." },
    { question: "Do you handle translations?", answer: "Yes, we provide certified Arabic translations as part of our attestation service." },
  ],
  relatedServices: [
    { slug: "business-setup", title: "Business Setup", summary: "Company formation and trade license.", tag: "Formation" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "Certifications and compliance.", tag: "Compliance" },
    { slug: "product-registration", title: "Product Registration", summary: "Register products for UAE market.", tag: "Compliance" },
  ],
};

export default function MOFAPage() {
  return <ServicePageLayout data={d} />;
}
