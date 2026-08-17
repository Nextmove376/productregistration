import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

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

const d: ServicePageData = {
  serviceName: "Regulatory Approvals",
  tag: "Compliance & Certification",
  title: "Regulatory Approvals in the UAE",
  subtitle: "Certifications and compliance documentation your products need before reaching a regulator",
  heroDescription: "We coordinate all prerequisite certifications including free-sale certificates, GMP verification, lab testing, and Halal certification. Our team ensures your products meet all UAE regulatory requirements before registration.",
  trustBadge: "Certified Compliance Consultant",
  canonicalUrl: "https://productregistrationinuae.com/services/regulatory-approvals",
  targetCountries: ["UAE", "Pakistan", "India", "Qatar", "Bangladesh", "Sri Lanka", "UK", "China"],
  overview: "Before a product can be registered with UAE authorities, it often needs prerequisite certifications: free-sale certificates from the country of origin, GMP verification, laboratory testing, Halal certification, and ISO alignment. These documents form the foundation of any successful registration application. At NextMove, we coordinate the entire certification chain so your registration dossier is complete and compliant from day one.",
  whatIs: "Regulatory approvals are the prerequisite certifications and compliance documents required before product registration in the UAE. This includes free-sale certificates (proving the product is legally sold in the country of origin), GMP certificates (proving manufacturing quality standards), laboratory testing (proving product safety), Halal certification (for products containing animal-derived ingredients), and ISO alignment (proving quality management systems).",
  whyImportant: "Regulatory approvals are essential because: They form the foundation of any successful product registration; UAE authorities require these documents before processing applications; Missing certifications cause delays and rejections; Proper certification builds consumer trust; It ensures product safety and quality. Without proper regulatory approvals, your product registration application will be rejected, causing significant delays and additional costs.",
  whoShouldUse: "Regulatory approval services are essential for: Manufacturers entering the UAE market; Importers bringing products from overseas; Companies seeking product registration; Businesses expanding product lines; Exporters targeting GCC markets; Companies without existing certifications. Whether you need a single certification or a complete compliance package, we handle the entire process.",
  process: [
    { step: 1, title: "Gap Analysis", description: "We identify which certifications your products already have and which are missing for UAE registration.", timeline: "1-2 days" },
    { step: 2, title: "Certification Planning", description: "We create a roadmap for obtaining all required certifications, including timelines and costs.", timeline: "2-3 days" },
    { step: 3, title: "Lab Coordination", description: "We coordinate testing with accredited laboratories for product safety and quality verification.", timeline: "1-3 weeks" },
    { step: 4, title: "Application Filing", description: "We submit certification applications to relevant bodies and track progress.", timeline: "3-5 days" },
    { step: 5, title: "Follow-up", description: "We track progress, handle queries, and ensure timely completion of all certifications.", timeline: "2-6 weeks" },
    { step: 6, title: "Certificate Delivery", description: "We deliver all completed certifications and ensure they meet UAE authority requirements.", timeline: "1-3 days" },
  ],
  included: [
    "Free-sale certificates",
    "GMP verification",
    "Lab testing coordination",
    "Halal certification",
    "ISO alignment",
    "Certificate attestation",
    "Product safety testing",
    "Microbiological testing",
    "Heavy metals testing",
    "Stability testing",
    "Certificate legalization",
    "Compliance consulting",
  ],
  documents: [
    { text: "Existing certifications from country of origin", required: true },
    { text: "Manufacturing facility details", required: true },
    { text: "Product specifications", required: true },
    { text: "Previous audit reports", required: false },
    { text: "Quality management documentation", required: true },
    { text: "Product samples for testing", required: true },
    { text: "Manufacturing process documentation", required: false },
    { text: "Raw material certificates", required: false },
  ],
  pricing: [
    { service: "Free-Sale Certificate Processing", timeline: "2-4 weeks", price: "AED 1,500" },
    { service: "GMP Verification", timeline: "4-8 weeks", price: "AED 3,000" },
    { service: "Halal Certification", timeline: "4-6 weeks", price: "AED 2,500" },
    { service: "Lab Testing Coordination", timeline: "2-4 weeks", price: "AED 1,000" },
    { service: "ISO Alignment Consulting", timeline: "4-8 weeks", price: "AED 5,000" },
    { service: "Certificate Attestation", timeline: "1-2 weeks", price: "AED 800" },
  ],
  differentiators: [
    { icon: "shield", title: "Accredited Partners", description: "We work with accredited laboratories and certification bodies worldwide." },
    { icon: "clock", title: "Parallel Processing", description: "We run multiple certifications simultaneously to reduce overall timeline." },
    { icon: "check", title: "Complete Chain", description: "We manage the entire certification chain from start to finish." },
    { icon: "users", title: "Compliance Experts", description: "Team with deep regulatory knowledge and certification experience." },
    { icon: "globe", title: "Global Network", description: "We coordinate with certification bodies in all major manufacturing countries." },
    { icon: "file-text", title: "Documentation", description: "We prepare all required documentation and handle government interactions." },
  ],
  caseStudy: {
    title: "Chinese Manufacturer Achieves UAE Compliance",
    problem: "A Chinese cosmetics manufacturer wanted to enter the UAE market but had no existing certifications recognized by UAE authorities.",
    solution: "We coordinated GMP verification, free-sale certificate processing, Halal certification, and laboratory testing simultaneously. We also handled all document attestation and Arabic translation.",
    result: "All certifications were completed within 6 weeks, allowing the manufacturer to proceed with product registration immediately.",
    quote: "NextMove transformed our compliance status from zero to fully certified in just 6 weeks. Their parallel processing approach saved us months.",
    client: "Export Manager, Chinese Cosmetics Manufacturer",
  },
  faq: [
    { question: "What certifications do I need for UAE product registration?", answer: "Typically required certifications include: Free-Sale Certificate from country of origin, GMP Certificate, and laboratory test reports. Some products also require Halal certification, ISO alignment, and product-specific testing. Requirements vary by product category." },
    { question: "How long does it take to get certified?", answer: "Certification timelines vary by type: Free-Sale Certificate: 2-4 weeks. GMP Verification: 4-8 weeks. Halal Certification: 4-6 weeks. Lab Testing: 2-4 weeks. We run multiple certifications simultaneously to reduce overall timeline." },
    { question: "Can I get certifications from any country?", answer: "Certifications must be from recognized authorities in the country of manufacture. We work with certification bodies in all major manufacturing countries including China, India, Pakistan, UK, and European countries." },
    { question: "Do you handle attestation and legalization?", answer: "Yes, we manage MOFA attestation and embassy legalization for all certifications. This ensures your documents are legally recognized by UAE authorities." },
    { question: "What is GMP verification?", answer: "GMP (Good Manufacturing Practice) verification confirms that your manufacturing facility meets international quality standards. It is required for most product registrations in the UAE and ensures product safety and consistency." },
    { question: "Do I need Halal certification?", answer: "Halal certification is required for products containing animal-derived ingredients, food products, and cosmetics. It is not required for all products but can significantly improve market acceptance in the UAE and GCC region." },
    { question: "What is a free-sale certificate?", answer: "A free-sale certificate proves that your product is legally sold in the country of origin. It is issued by the relevant government authority in your country and is required for most product registrations in the UAE." },
    { question: "Can I use existing certifications for UAE registration?", answer: "Yes, existing certifications can be used if they are from recognized authorities and meet UAE requirements. However, some certifications may need additional verification or attestation for UAE use." },
    { question: "How much does certification cost?", answer: "Certification costs vary by type and complexity. Free-Sale Certificate processing starts at AED 1,500. GMP Verification starts at AED 3,000. Halal Certification starts at AED 2,500. Lab testing costs depend on the specific tests required." },
    { question: "What if my product fails testing?", answer: "If your product fails testing, we provide detailed analysis of the failure reasons and recommend corrective actions. We can coordinate re-testing after improvements are made. Our thorough pre-submission review minimizes the risk of testing failures." },
  ],
  relatedServices: [
    { slug: "product-registration", title: "Product Registration", summary: "Register products for UAE market entry.", tag: "Compliance" },
    { slug: "mohap-registration", title: "MOHAP Registration", summary: "Medical device and pharmaceutical registration.", tag: "Healthcare" },
    { slug: "mofa-attestation", title: "MOFA Attestation", summary: "Document legalization and attestation services.", tag: "Legal" },
  ],
};

export default function RegulatoryApprovalsPage() {
  return <ServicePageLayout data={d} />;
}
