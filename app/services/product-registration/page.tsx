import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const metadata: Metadata = {
  title: "Product Registration in Dubai - NextMove",
  description: "Register cosmetics, food, supplements in Dubai. Free assessment.",
};

const d: ServicePageData = {
  serviceName: "Product Registration",
  tag: "Product Compliance",
  title: "Product Registration in Dubai",
  subtitle: "Get your products approved for sale in the UAE",
  heroDescription: "We handle product registration with DM, ESMA, and MOIAT.",
  overview: "Product registration is mandatory for cosmetics, food, supplements in UAE.",
  process: [
    { step: 1, title: "Assessment", description: "We review your products.", timeline: "1-2 days" },
    { step: 2, title: "Documents", description: "We compile certificates.", timeline: "3-5 days" },
    { step: 3, title: "Labels", description: "We review UAE compliance.", timeline: "2-3 days" },
    { step: 4, title: "Submission", description: "We file the application.", timeline: "1 day" },
    { step: 5, title: "Follow-up", description: "We track progress.", timeline: "2-6 weeks" },
    { step: 6, title: "Approval", description: "We collect your certificate.", timeline: "1-3 days" },
  ],
  included: ["Cosmetics", "Food items", "Health supplements", "Biocides", "Personal care", "Label review"],
  documents: [
    { text: "Free Sale Certificate" },
    { text: "GMP Certificate" },
    { text: "Product formulation" },
    { text: "Lab test reports" },
    { text: "Labels in Arabic and English" },
    { text: "Manufacturing license" },
  ],
  pricing: [
    { service: "Cosmetic Registration", timeline: "3-4 weeks", price: "AED 2,500" },
    { service: "Food Registration", timeline: "4-6 weeks", price: "AED 3,000" },
    { service: "Label Review", timeline: "2-3 days", price: "AED 500" },
  ],
  differentiators: [
    { icon: "shield", title: "Authority Links", description: "Direct relationships with DM, ESMA, MOIAT." },
    { icon: "clock", title: "Fast Processing", description: "30-50% faster registration." },
    { icon: "check", title: "98% Success Rate", description: "Thorough pre-submission review." },
    { icon: "users", title: "Dedicated Manager", description: "One point of contact." },
  ],
  faq: [
    { question: "How long does it take?", answer: "3-8 weeks depending on category." },
    { question: "How much does it cost?", answer: "From AED 2,500 per product." },
    { question: "Can I sell without registration?", answer: "No, it is illegal in UAE." },
    { question: "Do I need a trade license?", answer: "Yes, we can help with that." },
  ],
  relatedServices: [
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "GMP and free-sale certificates.", tag: "Compliance" },
    { slug: "mohap-registration", title: "MOHAP Registration", summary: "Medical devices and pharma.", tag: "Healthcare" },
    { slug: "business-setup", title: "Business Setup", summary: "Company formation.", tag: "Formation" },
  ],
};

export default function ProductRegistrationPage() {
  return <ServicePageLayout data={d} />;
}
