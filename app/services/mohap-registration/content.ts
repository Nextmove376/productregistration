/**
 * Built-in content for /services/mohap-registration.
 *
 * Moved out of `page.tsx` verbatim so it can be imported by more than the page —
 * `scripts/seed-service-body.ts` reads it to load this copy into `services.body`,
 * which is what makes the admin panel show the page's real text instead of blank
 * boxes. The page still renders it as its fallback; see `resolveServiceContent()`
 * in `lib/service-content.ts` for how an admin edit wins over it.
 *
 * A plain sibling module rather than an extra named export from `page.tsx`: only
 * `page`/`layout`/`route` filenames are special to the App Router, so a module
 * beside them is unambiguously safe.
 */

import type { ServicePageData } from "@/components/services/ServicePageLayout";

export const content: ServicePageData = {
  serviceName: "MOHAP Registration",
  tag: "Healthcare Regulatory",
  title: "MOHAP / EDE Registration",
  subtitle: "Medical devices, medicines, and pharmaceuticals approved by the UAE Ministry of Health",
  heroDescription: "We manage the entire MOHAP registration process for medical devices, prescription medicines, OTC drugs, and health products. Our team has direct relationships with the MOHAP registration department, ensuring faster processing and higher approval rates.",
  trustBadge: "MOHAP Registered Consultant",
  canonicalUrl: "https://productregistrationinuae.com/services/mohap-registration",
  targetCountries: ["UAE", "Pakistan", "India", "Qatar", "Bangladesh", "Sri Lanka", "UK", "China"],
  overview: "The Ministry of Health and Prevention (MOHAP) regulates all medical devices, pharmaceuticals, and health products in the UAE. Registration is mandatory before any healthcare product can be marketed or sold. The process requires detailed dossiers, clinical data, and compliance with UAE-specific labeling requirements. At NextMove, we have extensive experience navigating MOHAP requirements and maintain direct communication with the registration department.",
  whatIs: "MOHAP registration is the process of obtaining approval from the UAE Ministry of Health and Prevention to legally sell medical devices, pharmaceuticals, and health products in the UAE market. This includes Class I-IV medical devices, prescription medicines, over-the-counter drugs, health supplements, and establishment licensing. The registration process involves submitting comprehensive technical dossiers, clinical evaluation reports, risk analysis documentation, and product labels in Arabic and English.",
  whyImportant: "MOHAP registration is critical for healthcare product manufacturers and distributors because: It's a legal requirement for selling medical products in the UAE; It ensures product safety and efficacy for UAE consumers; It provides access to the entire UAE healthcare market; It serves as a gateway to other GCC countries; It builds credibility with healthcare professionals and institutions. Without MOHAP registration, your products cannot be legally sold, and you face significant penalties including fines, product seizure, and potential criminal charges.",
  whoShouldUse: "MOHAP registration services are essential for: Medical device manufacturers entering the UAE market; Pharmaceutical companies launching new drugs; Health supplement brands; Medical equipment distributors; Healthcare product importers; Companies seeking to export UAE-registered products to other GCC countries. Whether you're a startup or an established multinational, if you're selling healthcare products in the UAE, you need MOHAP registration.",
  process: [
    { step: 1, title: "Product Classification", description: "We classify your product under the correct MOHAP category (Class I-IV for devices, pharmaceutical categories for medicines).", timeline: "1-2 days" },
    { step: 2, title: "Dossier Preparation", description: "We compile technical dossiers, clinical data, risk analysis, and safety reports according to MOHAP requirements.", timeline: "1-2 weeks" },
    { step: 3, title: "Label Review", description: "We ensure Arabic labeling meets MOHAP requirements, including all required warnings, instructions, and regulatory information.", timeline: "3-5 days" },
    { step: 4, title: "Submission", description: "We file the complete application with MOHAP through their online portal and pay all required fees.", timeline: "1 day" },
    { step: 5, title: "Authority Review", description: "We track progress, respond to queries, and handle any additional requirements from MOHAP reviewers.", timeline: "4-12 weeks" },
    { step: 6, title: "Approval", description: "We collect your MOHAP registration certificate and ensure all documentation is complete.", timeline: "1-3 days" },
  ],
  included: [
    "Class I medical devices",
    "Class II medical devices",
    "Class III medical devices",
    "Class IV medical devices",
    "Prescription medicines",
    "Over-the-counter drugs",
    "Health supplements",
    "Establishment licensing",
    "Renewals and variations",
    "Post-market surveillance",
    "Adverse event reporting",
    "Product lifecycle management",
  ],
  documents: [
    { text: "Free Sale Certificate from country of origin", required: true },
    { text: "Good Manufacturing Practice (GMP) Certificate", required: true },
    { text: "Technical dossier / product master file", required: true },
    { text: "Clinical evaluation reports", required: true },
    { text: "Risk analysis documentation", required: true },
    { text: "Product labels in Arabic and English", required: true },
    { text: "Manufacturing license", required: true },
    { text: "Power of Attorney", required: true },
    { text: "ISO 13485 certificate (for medical devices)", required: false },
    { text: "Previous registration certificates (if any)", required: false },
  ],
  pricing: [
    { service: "Medical Device Registration (Class I)", timeline: "4-6 weeks", price: "AED 3,500" },
    { service: "Medical Device Registration (Class II-IV)", timeline: "8-14 weeks", price: "AED 5,000" },
    { service: "Pharmaceutical Registration", timeline: "12-20 weeks", price: "AED 8,000" },
    { service: "Health Supplement Registration", timeline: "6-10 weeks", price: "AED 3,500" },
    { service: "Establishment License", timeline: "4-6 weeks", price: "AED 3,000" },
    { service: "Renewal & Variation", timeline: "2-4 weeks", price: "AED 2,000" },
  ],
  differentiators: [
    { icon: "shield", title: "MOHAP Relationships", description: "Direct access to MOHAP registration department for faster processing." },
    { icon: "clock", title: "Dossier Expertise", description: "We know exactly what MOHAP reviewers look for, reducing rejection risk." },
    { icon: "check", title: "High Approval Rate", description: "98% first-time approval rate through thorough pre-submission review." },
    { icon: "users", title: "Healthcare Specialists", description: "Team with pharmaceutical and medical device expertise." },
    { icon: "file-text", title: "Complete Documentation", description: "We prepare all required dossiers, clinical reports, and compliance documents." },
    { icon: "globe", title: "GCC Coverage", description: "MOHAP registration can be leveraged for other GCC country approvals." },
  ],
  caseStudy: {
    title: "Indian Medical Device Manufacturer Enters UAE",
    problem: "An Indian manufacturer of Class II medical devices wanted to enter the UAE market but had no experience with MOHAP requirements or Arabic labeling standards.",
    solution: "We prepared comprehensive technical dossiers, coordinated clinical evaluations, handled Arabic labeling, and managed the complete MOHAP registration process for 5 medical devices.",
    result: "All 5 devices were registered within 10 weeks, allowing the manufacturer to secure distribution agreements with major UAE hospitals.",
    quote: "NextMove's expertise in MOHAP registration was invaluable. They knew exactly what documentation was needed and how to present it for maximum approval chances.",
    client: "Regulatory Affairs Manager, Indian Medical Device Company",
  },
  faq: [
    { question: "How long does MOHAP registration take?", answer: "MOHAP registration timelines vary by product class. Class I medical devices: 4-6 weeks. Class II-IV devices: 8-14 weeks. Pharmaceuticals: 12-20 weeks. Health supplements: 6-10 weeks. Complex products or those requiring additional clinical data may take longer." },
    { question: "What products need MOHAP registration?", answer: "All medical devices (Class I-IV), pharmaceuticals (prescription and OTC), health supplements, and certain health products sold in the UAE require MOHAP registration. This includes both locally manufactured and imported products." },
    { question: "How much does MOHAP registration cost?", answer: "MOHAP registration costs vary by product class and complexity. Class I devices start at AED 3,500. Class II-IV devices start at AED 5,000. Pharmaceuticals start at AED 8,000. Health supplements start at AED 3,500. Additional costs may apply for clinical evaluations and lab testing." },
    { question: "Do I need a local authorized representative?", answer: "Yes, you need a UAE-based authorized representative or local agent for MOHAP registration. The representative is responsible for post-market surveillance, adverse event reporting, and maintaining the registration. We can act as your authorized representative." },
    { question: "What is the difference between Class I, II, III, and IV medical devices?", answer: "Medical devices are classified based on risk level. Class I: Low risk (e.g., bandages, tongue depressors). Class II: Medium-low risk (e.g., surgical gloves, pregnancy tests). Class III: Medium-high risk (e.g., orthopedic implants, glucose monitors). Class IV: High risk (e.g., pacemakers, heart valves). Higher classes require more extensive documentation and longer processing times." },
    { question: "Can I use my existing CE mark or FDA approval for MOHAP registration?", answer: "While CE mark or FDA approval can support your MOHAP application, they don't guarantee approval. MOHAP has its own requirements and may request additional documentation. However, having these certifications can significantly speed up the review process." },
    { question: "How long is MOHAP registration valid?", answer: "MOHAP registration is typically valid for 5 years. After that, you need to renew the registration. We provide renewal reminders and handle the renewal process for our clients." },
    { question: "What is establishment licensing?", answer: "Establishment licensing is required for companies that manufacture, import, or distribute medical products in the UAE. The license ensures that your facilities meet MOHAP requirements for storage, handling, and distribution of healthcare products." },
    { question: "Do I need to register each product separately?", answer: "Yes, each product (and each variant/size) needs separate MOHAP registration. However, similar products from the same manufacturer can often be processed together, which can reduce costs and processing time." },
    { question: "What post-market obligations do I have after MOHAP registration?", answer: "After MOHAP registration, you must: Monitor product performance and report adverse events; Maintain proper storage and handling conditions; Keep registration documentation current; Renew registration before expiry; Report any product recalls or safety issues to MOHAP." },
  ],
  relatedServices: [
    { slug: "product-registration", title: "Product Registration", summary: "Register cosmetics, food, and consumer products with Dubai Municipality.", tag: "Compliance" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "GMP verification, free-sale certificates, and lab testing.", tag: "Compliance" },
    { slug: "medical-drugstore", title: "Pharmacy Setup", summary: "Drugstore licensing and pharmacy establishment.", tag: "Healthcare" },
  ],
};
