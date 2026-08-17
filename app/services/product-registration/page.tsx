import type { Metadata } from "next";
import ServicePageLayout from "@/components/services/ServicePageLayout";
import type { ServicePageData } from "@/components/services/ServicePageLayout";

/**
 * ISR floor. The long-form copy below is hand-authored, but ServicePageLayout
 * merges the hero media, "Our Services" cards and logo strip in from the admin
 * panel — without this the page would be built once and an edit would never show
 * up until the next deploy.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Product Registration in Dubai | Dubai Municipality & ESMA | NextMove",
  description: "Expert product registration services in Dubai & UAE. Register cosmetics, food, supplements with Dubai Municipality, ESMA & MOIAT. 98% success rate. Free assessment.",
  alternates: {
    canonical: "https://productregistrationinuae.com/services/product-registration",
  },
  openGraph: {
    title: "Product Registration in Dubai | Dubai Municipality & ESMA | NextMove",
    description: "Expert product registration services in Dubai & UAE. Register cosmetics, food, supplements with Dubai Municipality, ESMA & MOIAT. 98% success rate.",
    url: "https://productregistrationinuae.com/services/product-registration",
    type: "website",
  },
};

const d: ServicePageData = {
  serviceName: "Product Registration",
  tag: "Product Compliance",
  title: "Product Registration in Dubai",
  subtitle: "Get your products approved for sale in the UAE market",
  heroDescription: "We handle product registration with Dubai Municipality (DM), Emirates Authority for Standardization and Metrology (ESMA), and Ministry of Industry and Advanced Technology (MOIAT). From cosmetics to food supplements, we ensure your products meet all UAE regulatory requirements.",
  trustBadge: "98% First-Time Approval Rate",
  canonicalUrl: "https://productregistrationinuae.com/services/product-registration",
  targetCountries: ["UAE", "Pakistan", "India", "Qatar", "Bangladesh", "Sri Lanka", "UK", "China"],
  overview: "Product registration in Dubai is a mandatory regulatory requirement for any company looking to sell consumer products in the UAE market. Whether you're importing cosmetics, food items, health supplements, or household products, you must register each product with the relevant authority before sale. At NextMove, we've helped hundreds of companies navigate this process efficiently, achieving a 98% first-time approval rate.",
  whatIs: "Product registration in Dubai is the process of obtaining official approval from UAE regulatory authorities to legally sell consumer products in the market. The registration process involves submitting product formulations, safety data, labeling, and manufacturing documentation to the appropriate authority based on your product category. Dubai Municipality handles cosmetics, food, and consumer products through their Montaji portal. ESMA manages electronics and electrical products. MOIAT oversees industrial products. Each authority has specific requirements, timelines, and documentation needs that must be met for successful approval.",
  whyImportant: "Product registration is not just a legal requirement—it's essential for market access and consumer safety. Without proper registration, your products cannot be legally sold in the UAE, and you face significant fines, product seizure, and potential business closure. Registration also builds consumer trust, as registered products carry the approval of UAE authorities. Additionally, registered products can be sold across all seven emirates and exported to other GCC countries with minimal additional requirements. For international brands, UAE registration serves as a gateway to the broader Middle East market.",
  whoShouldUse: "Product registration services are essential for: International brands entering the UAE market for the first time; Local manufacturers launching new product lines; Importers and distributors bringing products from overseas; E-commerce sellers listing products on UAE platforms; Retailers expanding their product range; Companies seeking to export UAE-registered products to other GCC countries. Whether you're a startup or an established multinational, if you're selling consumer products in the UAE, you need product registration.",
  process: [
    { step: 1, title: "Product Assessment", description: "We review your product category, ingredients, and target market to determine the correct regulatory authority and requirements.", timeline: "1-2 days" },
    { step: 2, title: "Documentation Preparation", description: "We compile all required certificates including Free Sale Certificate, GMP Certificate, product formulation, and lab test reports.", timeline: "3-5 days" },
    { step: 3, title: "Label Review & Compliance", description: "We review your product labels for UAE compliance, including Arabic labeling requirements and ingredient listing.", timeline: "2-3 days" },
    { step: 4, title: "Application Submission", description: "We file the complete application through the appropriate portal (Montaji for DM, ESMA portal, etc.).", timeline: "1 day" },
    { step: 5, title: "Authority Review & Follow-up", description: "We track progress, respond to queries, and handle any additional requirements from the authority.", timeline: "2-6 weeks" },
    { step: 6, title: "Approval & Certificate", description: "We collect your registration certificate and ensure all documentation is complete for market entry.", timeline: "1-3 days" },
  ],
  included: [
    "Cosmetics & beauty products",
    "Food items & beverages",
    "Health supplements & vitamins",
    "Personal care products",
    "Household cleaning products",
    "Biocides & disinfectants",
    "Label review & Arabic translation",
    "Product formulation review",
    "Lab testing coordination",
    "Montaji portal handling",
    "ESMA registration",
    "MOIAT registration",
  ],
  documents: [
    { text: "Free Sale Certificate from country of origin", required: true },
    { text: "Good Manufacturing Practice (GMP) Certificate", required: true },
    { text: "Product formulation / ingredient list", required: true },
    { text: "Lab test reports (microbiological, heavy metals, stability)", required: true },
    { text: "Product labels in Arabic and English", required: true },
    { text: "Manufacturing license", required: true },
    { text: "Product samples (if required)", required: false },
    { text: "ISO certificates (if available)", required: false },
    { text: "Previous registration certificates (if any)", required: false },
  ],
  pricing: [
    { service: "Cosmetic Registration", timeline: "3-4 weeks", price: "AED 2,500" },
    { service: "Food Product Registration", timeline: "4-6 weeks", price: "AED 3,000" },
    { service: "Health Supplement Registration", timeline: "4-8 weeks", price: "AED 3,500" },
    { service: "Label Review & Compliance", timeline: "2-3 days", price: "AED 500" },
    { service: "Lab Testing Coordination", timeline: "2-4 weeks", price: "AED 1,000" },
    { service: "Product Formulation Review", timeline: "3-5 days", price: "AED 750" },
  ],
  differentiators: [
    { icon: "shield", title: "Authority Relationships", description: "Direct relationships with Dubai Municipality, ESMA, and MOIAT registration departments." },
    { icon: "clock", title: "Fast Processing", description: "30-50% faster registration through our streamlined process and pre-submission review." },
    { icon: "check", title: "98% Success Rate", description: "Thorough pre-submission review ensures your application is complete and compliant." },
    { icon: "users", title: "Dedicated Manager", description: "One point of contact who knows your products and can anticipate authority requirements." },
    { icon: "globe", title: "Multi-Authority Expertise", description: "We handle DM, ESMA, MOIAT, and MOHAP registrations under one roof." },
    { icon: "file-text", title: "Complete Documentation", description: "We prepare all required certificates, translations, and compliance documents." },
  ],
  caseStudy: {
    title: "European Cosmetics Brand Enters UAE Market",
    problem: "A European cosmetics brand wanted to launch 15 products in the UAE but had no knowledge of local regulations, Arabic labeling requirements, or the Montaji portal system.",
    solution: "We conducted a comprehensive product assessment, prepared all required documentation, coordinated lab testing, and handled the complete Montaji registration process for all 15 products simultaneously.",
    result: "All 15 products were registered within 6 weeks, allowing the brand to launch on schedule. They saved 40% on expected costs through our batch processing approach.",
    quote: "NextMove made the impossible possible. We went from zero UAE presence to full market coverage in just 6 weeks.",
    client: "Operations Director, European Cosmetics Brand",
  },
  faq: [
    { question: "How long does product registration take in Dubai?", answer: "Product registration typically takes 3-8 weeks depending on the product category. Cosmetics registration through Dubai Municipality usually takes 3-4 weeks. Food products may take 4-6 weeks. Health supplements can take 4-8 weeks. Complex products or those requiring additional lab testing may take longer." },
    { question: "How much does product registration cost in Dubai?", answer: "Product registration costs vary by category and complexity. Basic cosmetic registration starts at AED 2,500. Food product registration starts at AED 3,000. Health supplement registration starts at AED 3,500. Additional costs may apply for lab testing, label review, and Arabic translation services." },
    { question: "Can I sell products in Dubai without registration?", answer: "No, it is illegal to sell consumer products in the UAE without proper registration. Selling unregistered products can result in fines of AED 10,000 to AED 1,000,000, product seizure, business closure, and potential criminal charges. All products must be registered with the appropriate authority before sale." },
    { question: "What is the Montaji portal?", answer: "Montaji is Dubai Municipality's online portal for product registration. It handles cosmetics, food items, health supplements, and consumer products. The portal allows manufacturers and importers to submit registration applications, upload documentation, track progress, and receive approval certificates electronically." },
    { question: "Do I need a UAE trade license for product registration?", answer: "Yes, you need a valid UAE trade license to register products. The license must be issued by the relevant authority (DED for mainland, free zone authority for free zone companies). If you don't have a UAE trade license, we can help you set up a company first." },
    { question: "What documents are required for product registration?", answer: "Required documents include: Free Sale Certificate from country of origin, GMP Certificate, product formulation/ingredient list, lab test reports, product labels in Arabic and English, and manufacturing license. Some products may require additional documentation." },
    { question: "Can I register products from any country?", answer: "Yes, you can register products from any country, but they must meet UAE regulatory standards. Products must have valid Free Sale Certificate and GMP Certificate from the country of origin. Some countries may require additional documentation or testing." },
    { question: "How long is the registration valid?", answer: "Product registration in Dubai is typically valid for 5 years. After that, you need to renew the registration. We provide renewal reminders and handle the renewal process for our clients." },
    { question: "Do I need to register each product separately?", answer: "Yes, each product (and each variant/flavor/size) needs separate registration. However, similar products from the same manufacturer can often be processed together, which can reduce costs and processing time." },
    { question: "What is the difference between DM, ESMA, and MOIAT registration?", answer: "Dubai Municipality (DM) handles cosmetics, food, and consumer products through the Montaji portal. ESMA (Emirates Authority for Standardization and Metrology) handles electronics and electrical products. MOIAT (Ministry of Industry and Advanced Technology) handles industrial products. The correct authority depends on your product category." },
  ],
  relatedServices: [
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "GMP verification, free-sale certificates, and lab testing coordination.", tag: "Compliance" },
    { slug: "mohap-registration", title: "MOHAP Registration", summary: "Medical devices, pharmaceuticals, and health products registration.", tag: "Healthcare" },
    { slug: "business-setup", title: "Business Setup", summary: "Company formation and trade license processing in Dubai.", tag: "Formation" },
  ],
};

export default function ProductRegistrationPage() {
  return <ServicePageLayout data={d} />;
}
