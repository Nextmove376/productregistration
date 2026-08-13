import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const metadata: Metadata = {
  title: "Business Setup Dubai - Company Formation & Trade License - NextMove",
  description: "Set up your business in Dubai. Mainland, freezone, and offshore company formation. Trade license processing. Free consultation.",
};

const d: ServicePageData = {
  serviceName: "Business Setup",
  tag: "Company Formation",
  title: "Business Setup in Dubai",
  subtitle: "Mainland, freezone, and offshore company formation in the UAE",
  heroDescription: "We handle everything from trade license processing to freezone company formation across Dubai and the UAE.",
  trustBadge: "Licensed by Dubai Economy and Tourism",
  overview: "Setting up a business in Dubai requires navigating complex regulatory frameworks, choosing the right jurisdiction, and obtaining the correct trade license. Whether you need a mainland license for direct UAE market access, a freezone setup for 100% ownership, or an offshore structure for international operations, NextMove guides you through every step. We have helped hundreds of companies establish their UAE presence.",
  process: [
    { step: 1, title: "Consultation", description: "We assess your business needs and recommend the best jurisdiction.", timeline: "1 day" },
    { step: 2, title: "Jurisdiction Selection", description: "We help choose mainland, freezone, or offshore based on your needs.", timeline: "1-2 days" },
    { step: 3, title: "Documentation", description: "We prepare all required documents and applications.", timeline: "2-3 days" },
    { step: 4, title: "License Filing", description: "We submit applications to the relevant authority.", timeline: "1 day" },
    { step: 5, title: "Processing", description: "We track approval and handle any queries.", timeline: "1-3 weeks" },
    { step: 6, title: "Setup Complete", description: "We deliver your trade license and company documents.", timeline: "1-2 days" },
  ],
  included: ["Mainland trade license", "SHAMS freezone setup", "Meydan freezone setup", "SPC freezone setup", "Bank account opening assistance", "Visa processing"],
  documents: [
    { text: "Passport copies of shareholders" },
    { text: "Emirates ID (if resident)" },
    { text: "Proof of address" },
    { text: "Business plan summary" },
    { text: "NOC from current sponsor (if applicable)" },
    { text: "Educational certificates (for certain activities)" },
  ],
  pricing: [
    { service: "Mainland Trade License", timeline: "1-2 weeks", price: "AED 12,000" },
    { service: "Freezone Company (SHAMS)", timeline: "3-5 days", price: "AED 8,500" },
    { service: "Freezone Company (Meydan)", timeline: "3-5 days", price: "AED 9,000" },
    { service: "Offshore Company", timeline: "1-2 weeks", price: "AED 7,500" },
  ],
  differentiators: [
    { icon: "shield", title: "Jurisdiction Expertise", description: "We recommend the best structure for your business model." },
    { icon: "clock", title: "Fast Processing", description: "Most licenses processed within 1-2 weeks." },
    { icon: "check", title: "End-to-End Service", description: "From license to bank account to visa." },
    { icon: "users", title: "DED Relationships", description: "Direct access to Dubai Economy and Tourism." },
  ],
  faq: [
    { question: "Mainland vs Freezone - which is better?", answer: "Mainland allows direct UAE market trading. Freezone offers 100% ownership and tax benefits. We recommend based on your specific needs." },
    { question: "How long does company formation take?", answer: "Freezone setup: 3-5 days. Mainland: 1-2 weeks. Offshore: 1-2 weeks." },
    { question: "How much does it cost?", answer: "From AED 7,500 for offshore to AED 12,000+ for mainland, depending on activity and jurisdiction." },
    { question: "Do I need to be in Dubai?", answer: "No, we can handle the entire process remotely. Physical presence is only needed for bank account opening." },
  ],
  relatedServices: [
    { slug: "product-registration", title: "Product Registration", summary: "Register products for UAE market.", tag: "Compliance" },
    { slug: "mofa-attestation", title: "MOFA Attestation", summary: "Document attestation and legalization.", tag: "Legal" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "Certifications and compliance.", tag: "Compliance" },
  ],
};

export default function BusinessSetupPage() {
  return <ServicePageLayout data={d} />;
}
