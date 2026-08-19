/**
 * Built-in content for /services/mofa-attestation.
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
  serviceName: "MOFA Attestation",
  tag: "Government Services",
  title: "MOFA Attestation & PRO Services",
  subtitle: "Document attestation, embassy legalization, and public relations paperwork handled end-to-end",
  heroDescription: "We handle MOFA attestation, embassy legalization, certified translations, and all PRO services at government counters. Our experienced team ensures your documents are properly attested and legalized for use in the UAE.",
  trustBadge: "Authorized PRO Services Provider",
  canonicalUrl: "https://productregistrationinuae.com/services/mofa-attestation",
  targetCountries: ["UAE", "Pakistan", "India", "Qatar", "Bangladesh", "Sri Lanka", "UK", "China"],
  overview: "Document attestation and legalization is a critical requirement for businesses operating in the UAE. Whether you need educational certificates attested for employment, commercial documents legalized for business setup, or product certificates verified for registration, the process involves multiple government entities. At NextMove, we handle the entire attestation chain from origin country verification through MOFA attestation and embassy legalization.",
  whatIs: "MOFA attestation is the process of verifying documents through the UAE Ministry of Foreign Affairs for legal use in the UAE. This includes educational certificates, commercial documents, power of attorney, and product certificates. The attestation process involves verification in the country of origin, UAE embassy legalization, MOFA attestation, and certified Arabic translation.",
  whyImportant: "MOFA attestation is essential for: Legal validity of documents in the UAE; Employment visa processing; Business setup and trade license; Product registration; Court proceedings; Government tenders; Banking and financial transactions. Without proper attestation, your documents are not legally recognized in the UAE.",
  whoShouldUse: "MOFA attestation services are essential for: Professionals seeking employment in UAE; Businesses setting up in Dubai; Companies registering products; Individuals requiring document legalization; Legal professionals; Educational institutions; Healthcare professionals. Whether you need personal or commercial document attestation, we handle the entire process.",
  process: [
    { step: 1, title: "Document Review", description: "We assess which documents need attestation and determine the required attestation chain.", timeline: "1 day" },
    { step: 2, title: "Origin Verification", description: "We coordinate verification in the country of origin through relevant authorities.", timeline: "1-2 weeks" },
    { step: 3, title: "MOFA Submission", description: "We submit documents to UAE Ministry of Foreign Affairs for attestation.", timeline: "2-3 days" },
    { step: 4, title: "Embassy Legalization", description: "We process embassy legalization where required by specific countries.", timeline: "3-5 days" },
    { step: 5, title: "Translation", description: "We arrange certified Arabic translations by approved translators.", timeline: "2-3 days" },
    { step: 6, title: "Delivery", description: "We deliver fully attested and translated documents to your location.", timeline: "1 day" },
  ],
  included: [
    "MOFA attestation",
    "Embassy legalization",
    "Certified Arabic translations",
    "Visa and Emirates ID processing",
    "Corporate PRO retainer",
    "Document clearance",
    "Certificate verification",
    "Notarization services",
    "Apostille services",
    "Document courier services",
  ],
  documents: [
    { text: "Original documents to be attested", required: true },
    { text: "Passport copies", required: true },
    { text: "Previous attestation certificates (if any)", required: false },
    { text: "Authorization letter", required: true },
    { text: "Photographs (for certain documents)", required: false },
  ],
  pricing: [
    { service: "MOFA Attestation (per document)", timeline: "2-3 days", price: "AED 300" },
    { service: "Embassy Legalization", timeline: "3-5 days", price: "AED 500" },
    { service: "Certified Translation", timeline: "2-3 days", price: "AED 200" },
    { service: "PRO Retainer (monthly)", timeline: "Ongoing", price: "AED 2,000" },
    { service: "Document Courier", timeline: "3-5 days", price: "AED 150" },
    { service: "Notarization", timeline: "1-2 days", price: "AED 250" },
  ],
  differentiators: [
    { icon: "shield", title: "Government Access", description: "Direct access to MOFA and embassy counters for faster processing." },
    { icon: "clock", title: "Fast Turnaround", description: "Most attestations completed within one week through our streamlined process." },
    { icon: "check", title: "Full Chain", description: "We handle the entire attestation chain from origin to final delivery." },
    { icon: "users", title: "Experienced PROs", description: "Team with years of government liaison and document processing experience." },
    { icon: "globe", title: "Multi-Country", description: "We handle attestations from all major countries including Pakistan, India, UK, and China." },
    { icon: "file-text", title: "All Document Types", description: "Educational, commercial, personal, and legal documents handled." },
  ],
  caseStudy: {
    title: "Indian Professional's Employment Visa Processing",
    problem: "An Indian professional needed urgent attestation of educational certificates for a Dubai employment visa, but the standard process would take 4-6 weeks.",
    solution: "We expedited the entire attestation chain, coordinating with Indian authorities, UAE embassy, and MOFA simultaneously. We also arranged certified Arabic translations.",
    result: "All documents were attested and translated within 10 days, allowing the professional to start their new job on schedule.",
    quote: "NextMove saved my job offer. They completed in 10 days what normally takes 6 weeks.",
    client: "Senior Engineer, Multinational Company",
  },
  faq: [
    { question: "What is MOFA attestation?", answer: "MOFA attestation is the UAE Ministry of Foreign Affairs verification of documents for legal use in the UAE. It confirms that your documents are genuine and can be legally used for official purposes in the UAE." },
    { question: "How long does attestation take?", answer: "MOFA attestation takes 2-3 days. The full chain including origin verification takes 2-4 weeks depending on the country of origin and document type. Expedited processing is available for urgent cases." },
    { question: "Which documents need attestation?", answer: "Educational certificates, commercial documents, power of attorney, birth certificates, marriage certificates, and product certificates typically need attestation. The specific requirements depend on the purpose of use." },
    { question: "Do you handle translations?", answer: "Yes, we provide certified Arabic translations as part of our attestation service. All translations are done by MOFA-approved translators and are accepted by all UAE government entities." },
    { question: "Can I attest documents from any country?", answer: "Yes, we handle attestations from all major countries including Pakistan, India, Bangladesh, Sri Lanka, UK, China, and many others. Each country has specific requirements that we handle." },
    { question: "What is the difference between attestation and apostille?", answer: "Attestation is the process of verifying documents through multiple authorities. Apostille is a simplified process for countries that are part of the Hague Convention. UAE is not part of the Hague Convention, so attestation is required." },
    { question: "Do I need to be present for attestation?", answer: "No, we handle the entire process on your behalf. You only need to provide the original documents and authorization. We handle all government interactions and deliver the attested documents to you." },
    { question: "How much does attestation cost?", answer: "MOFA attestation costs AED 300 per document. Embassy legalization costs AED 500. Certified translation costs AED 200. Total costs depend on the number of documents and required services." },
    { question: "What is a PRO retainer?", answer: "A PRO retainer is a monthly service where we handle all your government document processing needs. This includes visa processing, document attestation, government filings, and other PRO services. It is ideal for businesses with ongoing document processing needs." },
    { question: "Can you handle urgent attestation?", answer: "Yes, we offer expedited processing for urgent cases. Additional fees may apply for same-day or next-day processing. Contact us for urgent attestation needs." },
  ],
  relatedServices: [
    { slug: "business-setup", title: "Business Setup", summary: "Company formation and trade license processing.", tag: "Formation" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "Certifications and compliance documentation.", tag: "Compliance" },
    { slug: "product-registration", title: "Product Registration", summary: "Register products for UAE market entry.", tag: "Compliance" },
  ],
};
