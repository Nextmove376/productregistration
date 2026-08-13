import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const metadata: Metadata = {
  title: "Regulatory Approvals UAE - ESMA, GMP, Halal Certification - NextMove",
  description: "Obtain regulatory approvals including ESMA certification, GMP verification, Halal certification, and lab testing coordination. Free assessment.",
};

const d: ServicePageData = {
  serviceName: "Regulatory Approvals",
  tag: "Compliance & Certification",
  title: "Regulatory Approvals in the UAE",
  subtitle: "Certifications and compliance documentation your products need before reaching a regulator",
  heroDescription: "We coordinate all prerequisite certifications including free-sale certificates, GMP verification, lab testing, and Halal certification.",
  trustBadge: "Certified Compliance Consultant",
  overview: "Before a product can be registered with UAE authorities, it often needs prerequisite certifications: free-sale certificates from the country of origin, GMP verification, laboratory testing, Halal certification, and ISO alignment. These documents form the foundation of any successful registration application. At NextMove, we coordinate the entire certification chain so your registration dossier is complete and compliant from day one.",
  process: [
    { step: 1, title: "Gap Analysis", description: "We identify which certifications your products already have and which are missing.", timeline: "1-2 days" },
    { step: 2, title: "Certification Planning", description: "We create a roadmap for obtaining all required certifications.", timeline: "2-3 days" },
    { step: 3, title: "Lab Coordination", description: "We coordinate testing with accredited laboratories.", timeline: "1-3 weeks" },
    { step: 4, title: "Application Filing", description: "We submit certification applications to relevant bodies.", timeline: "3-5 days" },
    { step: 5, title: "Follow-up", description: "We track progress and handle any queries.", timeline: "2-6 weeks" },
    { step: 6, title: "Certificate Delivery", description: "We deliver all completed certifications.", timeline: "1-3 days" },
  ],
  included: ["Free-sale certificates", "GMP verification", "Lab testing coordination", "Halal certification", "ISO alignment", "Certificate attestation"],
  documents: [
    { text: "Existing certifications from country of origin" },
    { text: "Manufacturing facility details" },
    { text: "Product specifications" },
    { text: "Previous audit reports" },
    { text: "Quality management documentation" },
  ],
  pricing: [
    { service: "Free-Sale Certificate Processing", timeline: "2-4 weeks", price: "AED 1,500" },
    { service: "GMP Verification", timeline: "4-8 weeks", price: "AED 3,000" },
    { service: "Halal Certification", timeline: "4-6 weeks", price: "AED 2,500" },
    { service: "Lab Testing Coordination", timeline: "2-4 weeks", price: "AED 1,000" },
  ],
  differentiators: [
    { icon: "shield", title: "Accredited Partners", description: "We work with accredited labs and certification bodies." },
    { icon: "clock", title: "Parallel Processing", description: "We run multiple certifications simultaneously." },
    { icon: "check", title: "Complete Chain", description: "We manage the entire certification chain end-to-end." },
    { icon: "users", title: "Compliance Experts", description: "Team with deep regulatory knowledge." },
  ],
  faq: [
    { question: "What certifications do I need for UAE product registration?", answer: "Typically: Free-Sale Certificate, GMP Certificate, and lab test reports. Some products also need Halal certification." },
    { question: "How long does it take to get certified?", answer: "2-8 weeks depending on the certification type and your existing documentation." },
    { question: "Can I get certifications from any country?", answer: "Certifications must be from recognized authorities in the country of manufacture." },
    { question: "Do you handle attestation and legalization?", answer: "Yes, we manage MOFA attestation and embassy legalization for all documents." },
  ],
  relatedServices: [
    { slug: "product-registration", title: "Product Registration", summary: "Register products for UAE market.", tag: "Compliance" },
    { slug: "mohap-registration", title: "MOHAP Registration", summary: "Medical device and pharma registration.", tag: "Healthcare" },
    { slug: "mofa-attestation", title: "MOFA Attestation", summary: "Document legalization.", tag: "Legal" },
  ],
};

export default function RegulatoryApprovalsPage() {
  return <ServicePageLayout data={d} />;
}
