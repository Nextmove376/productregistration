import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const metadata: Metadata = {
  title: "MOHAP Registration UAE - Medical Devices & Pharmaceuticals - NextMove",
  description: "Register medical devices, medicines and pharmaceuticals with MOHAP. End-to-end registration service. Free assessment.",
};

const d: ServicePageData = {
  serviceName: "MOHAP Registration",
  tag: "Healthcare Regulatory",
  title: "MOHAP / EDE Registration",
  subtitle: "Medical devices, medicines and pharmaceuticals approved by the UAE Ministry of Health",
  heroDescription: "We manage the entire MOHAP registration process for medical devices, prescription medicines, OTC drugs, and health products.",
  trustBadge: "MOHAP Registered Consultant",
  overview: "The Ministry of Health and Prevention (MOHAP) regulates all medical devices, pharmaceuticals, and health products in the UAE. Registration is mandatory before any healthcare product can be marketed or sold. The process requires detailed dossiers, clinical data, and compliance with UAE-specific labeling requirements. At NextMove, we have extensive experience navigating MOHAP requirements and maintain direct communication with the registration department.",
  process: [
    { step: 1, title: "Product Classification", description: "We classify your product under the correct MOHAP category.", timeline: "1-2 days" },
    { step: 2, title: "Dossier Preparation", description: "We compile technical dossiers, clinical data, and safety reports.", timeline: "1-2 weeks" },
    { step: 3, title: "Label Review", description: "We ensure Arabic labeling and UAE-specific requirements.", timeline: "3-5 days" },
    { step: 4, title: "Submission", description: "We file the complete application with MOHAP.", timeline: "1 day" },
    { step: 5, title: "Authority Review", description: "We track progress and respond to queries.", timeline: "4-12 weeks" },
    { step: 6, title: "Approval", description: "We collect your MOHAP registration certificate.", timeline: "1-3 days" },
  ],
  included: ["Class I-IV medical devices", "Prescription medicines", "Over-the-counter drugs", "Health supplements", "Establishment licensing", "Renewals and variations"],
  documents: [
    { text: "Free Sale Certificate from country of origin" },
    { text: "GMP Certificate" },
    { text: "Technical dossier / product master file" },
    { text: "Clinical evaluation reports" },
    { text: "Risk analysis documentation" },
    { text: "Product labels in Arabic and English" },
    { text: "Manufacturing license" },
    { text: "Power of Attorney" },
  ],
  pricing: [
    { service: "Medical Device Registration", timeline: "8-14 weeks", price: "AED 5,000" },
    { service: "Pharmaceutical Registration", timeline: "12-20 weeks", price: "AED 8,000" },
    { service: "Health Supplement Registration", timeline: "6-10 weeks", price: "AED 3,500" },
    { service: "Establishment License", timeline: "4-6 weeks", price: "AED 3,000" },
  ],
  differentiators: [
    { icon: "shield", title: "MOHAP Relationships", description: "Direct access to MOHAP registration department." },
    { icon: "clock", title: "Dossier Expertise", description: "We know exactly what MOHAP reviewers look for." },
    { icon: "check", title: "High Approval Rate", description: "Thorough preparation reduces rejection risk." },
    { icon: "users", title: "Healthcare Specialists", description: "Team with pharmaceutical and medical device expertise." },
  ],
  faq: [
    { question: "How long does MOHAP registration take?", answer: "8-20 weeks depending on product class and complexity." },
    { question: "What products need MOHAP registration?", answer: "All medical devices, pharmaceuticals, and health products sold in UAE." },
    { question: "How much does it cost?", answer: "From AED 3,500 for supplements to AED 8,000+ for pharmaceuticals." },
    { question: "Do I need a local authorized representative?", answer: "Yes, you need a UAE-based authorized representative or local agent." },
  ],
  relatedServices: [
    { slug: "product-registration", title: "Product Registration", summary: "Cosmetics, food, and consumer products.", tag: "Compliance" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "GMP verification and lab testing.", tag: "Compliance" },
    { slug: "medical-drugstore", title: "Pharmacy Setup", summary: "Drugstore licensing and setup.", tag: "Healthcare" },
  ],
};

export default function MOHAPPage() {
  return <ServicePageLayout data={d} />;
}
