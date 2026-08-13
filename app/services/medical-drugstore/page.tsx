import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const metadata: Metadata = {
  title: "Pharmacy Setup Dubai - Drugstore License & Medical Registration - NextMove",
  description: "Set up a pharmacy or drugstore in Dubai. UAE trademark registration, drugstore licensing, and medical store setup. Free consultation.",
};

const d: ServicePageData = {
  serviceName: "Medical & Drugstore",
  tag: "Healthcare Business",
  title: "Trademark & Drugstore Setup",
  subtitle: "UAE trademark registration and turnkey medical drugstore setup with full compliance",
  heroDescription: "We handle trademark filing, drugstore establishment, pharmacy licensing, and all ministry inspections.",
  trustBadge: "Licensed Healthcare Consultant",
  overview: "Setting up a pharmacy or drugstore in the UAE requires navigating MOHAP licensing, Dubai Municipality inspections, and strict regulatory compliance. From trademark registration to pharmacy fit-out advisory and ministry inspections, every step must meet healthcare standards. At NextMove, we provide end-to-end support for healthcare business setup, ensuring your pharmacy or drugstore launches fully compliant.",
  process: [
    { step: 1, title: "Feasibility Assessment", description: "We assess your business model and regulatory requirements.", timeline: "1-2 days" },
    { step: 2, title: "Trademark Filing", description: "We file UAE trademark applications.", timeline: "1 day" },
    { step: 3, title: "License Application", description: "We prepare and submit drugstore license applications.", timeline: "1-2 weeks" },
    { step: 4, title: "Fit-out Advisory", description: "We advise on pharmacy layout and compliance requirements.", timeline: "1-2 weeks" },
    { step: 5, title: "Ministry Inspections", description: "We coordinate MOHAP and municipality inspections.", timeline: "2-4 weeks" },
    { step: 6, title: "Opening", description: "We deliver all licenses and approvals for opening.", timeline: "1-3 days" },
  ],
  included: ["UAE trademark filing", "Trademark opposition", "Drugstore establishment", "Pharmacy fit-out advisory", "Ministry inspections", "License renewals"],
  documents: [
    { text: "Passport copies of owners" },
    { text: "Pharmacist qualification certificates" },
    { text: "Proposed pharmacy location details" },
    { text: "Trade name reservation" },
    { text: "No objection certificate" },
  ],
  pricing: [
    { service: "Trademark Registration", timeline: "4-6 months", price: "AED 5,000" },
    { service: "Drugstore License", timeline: "4-8 weeks", price: "AED 15,000" },
    { service: "Pharmacy Fit-out Advisory", timeline: "1-2 weeks", price: "AED 3,000" },
    { service: "Inspection Coordination", timeline: "2-4 weeks", price: "AED 2,000" },
  ],
  differentiators: [
    { icon: "shield", title: "Healthcare Expertise", description: "Deep knowledge of MOHAP pharmacy requirements." },
    { icon: "clock", title: "Turnkey Solutions", description: "From license to opening day." },
    { icon: "check", title: "Compliance Guaranteed", description: "We ensure full regulatory compliance." },
    { icon: "users", title: "Pharmacy Specialists", description: "Team with healthcare business experience." },
  ],
  faq: [
    { question: "How do I open a pharmacy in Dubai?", answer: "You need MOHAP approval, a drugstore license, qualified pharmacist, and compliant premises. We handle the entire process." },
    { question: "How long does it take?", answer: "4-8 weeks for licensing. Trademark registration takes 4-6 months separately." },
    { question: "How much does it cost?", answer: "From AED 15,000 for drugstore licensing. Trademark registration from AED 5,000." },
    { question: "Do I need a pharmacist?", answer: "Yes, UAE law requires a licensed pharmacist to manage every pharmacy." },
  ],
  relatedServices: [
    { slug: "mohap-registration", title: "MOHAP Registration", summary: "Medical device and pharma registration.", tag: "Healthcare" },
    { slug: "business-setup", title: "Business Setup", summary: "Company formation and trade license.", tag: "Formation" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "Certifications and compliance.", tag: "Compliance" },
  ],
};

export default function MedicalDrugstorePage() {
  return <ServicePageLayout data={d} />;
}
