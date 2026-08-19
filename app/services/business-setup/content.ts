/**
 * Built-in content for /services/business-setup.
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
  serviceName: "Business Setup",
  tag: "Company Formation",
  title: "Business Setup in Dubai",
  subtitle: "Mainland, freezone, and offshore company formation in the UAE",
  heroDescription: "We handle everything from trade license processing to freezone company formation across Dubai and the UAE. Whether you need a mainland license for direct UAE market access, a freezone setup for 100% ownership, or an offshore structure for international operations, we guide you through every step.",
  trustBadge: "Licensed by Dubai Economy and Tourism",
  canonicalUrl: "https://productregistrationinuae.com/services/business-setup",
  targetCountries: ["UAE", "Pakistan", "India", "Qatar", "Bangladesh", "Sri Lanka", "UK", "China"],
  overview: "Setting up a business in Dubai requires navigating complex regulatory frameworks, choosing the right jurisdiction, and obtaining the correct trade license. Whether you need a mainland license for direct UAE market access, a freezone setup for 100% ownership, or an offshore structure for international operations, NextMove guides you through every step.",
  whatIs: "Business setup in Dubai is the process of legally establishing a company in the UAE. This involves choosing the right jurisdiction (mainland, freezone, or offshore), selecting the appropriate business activity, obtaining a trade license, and setting up all necessary registrations. Dubai offers three main types of company formation: Mainland (DED license for direct UAE market access), Freezone (100% foreign ownership with specific activity limitations), and Offshore (for international operations without UAE market access).",
  whyImportant: "Setting up a business in Dubai is essential for accessing the UAE's growing economy, leveraging Dubai's strategic location between East and West, taking advantage of tax benefits (0% corporate tax for most businesses), accessing world-class infrastructure, and building credibility in the Middle East market.",
  whoShouldUse: "Business setup services are essential for international companies entering the UAE market, entrepreneurs starting new businesses, freelancers and consultants, e-commerce businesses, companies seeking to establish regional headquarters, and businesses requiring UAE presence for product registration.",
  process: [
    { step: 1, title: "Consultation", description: "We assess your business needs, target market, and recommend the best jurisdiction and business structure.", timeline: "1 day" },
    { step: 2, title: "Jurisdiction Selection", description: "We help choose mainland, freezone, or offshore based on your specific needs and business model.", timeline: "1-2 days" },
    { step: 3, title: "Documentation", description: "We prepare all required documents including business plan, shareholder documents, and application forms.", timeline: "2-3 days" },
    { step: 4, title: "License Filing", description: "We submit applications to the relevant authority (DED for mainland, freezone authority for freezone).", timeline: "1 day" },
    { step: 5, title: "Processing", description: "We track approval, handle any queries, and coordinate with the authority for faster processing.", timeline: "1-3 weeks" },
    { step: 6, title: "Setup Complete", description: "We deliver your trade license, company documents, and assist with bank account opening and visa processing.", timeline: "1-2 days" },
  ],
  included: [
    "Mainland trade license (DED)",
    "SHAMS freezone setup",
    "Meydan freezone setup",
    "SPC freezone setup",
    "JAFZA freezone setup",
    "DMCC freezone setup",
    "Offshore company formation",
    "Bank account opening assistance",
    "Visa processing",
    "Office space solutions",
    "PRO services",
    "Company restructuring",
  ],
  documents: [
    { text: "Passport copies of shareholders", required: true },
    { text: "Emirates ID (if resident)", required: false },
    { text: "Proof of address (utility bill or bank statement)", required: true },
    { text: "Business plan summary", required: true },
    { text: "NOC from current sponsor (if applicable)", required: false },
    { text: "Educational certificates (for certain activities)", required: false },
    { text: "Bank reference letter", required: false },
    { text: "CV/Resume of shareholders", required: false },
  ],
  pricing: [
    { service: "Mainland Trade License (DED)", timeline: "1-2 weeks", price: "AED 12,000" },
    { service: "Freezone Company (SHAMS)", timeline: "3-5 days", price: "AED 8,500" },
    { service: "Freezone Company (Meydan)", timeline: "3-5 days", price: "AED 9,000" },
    { service: "Freezone Company (SPC)", timeline: "3-5 days", price: "AED 8,000" },
    { service: "Offshore Company", timeline: "1-2 weeks", price: "AED 7,500" },
    { service: "Bank Account Opening", timeline: "1-2 weeks", price: "AED 2,000" },
  ],
  differentiators: [
    { icon: "shield", title: "Jurisdiction Expertise", description: "We recommend the best structure for your specific business model and target market." },
    { icon: "clock", title: "Fast Processing", description: "Most licenses processed within 1-2 weeks through our streamlined process." },
    { icon: "check", title: "End-to-End Service", description: "From license to bank account to visa—we handle everything." },
    { icon: "users", title: "DED Relationships", description: "Direct access to Dubai Economy and Tourism for faster processing." },
    { icon: "globe", title: "Freezone Network", description: "Partnerships with all major Dubai freezones for best rates and terms." },
    { icon: "file-text", title: "Complete Documentation", description: "We prepare all required documents and handle all government interactions." },
  ],
  caseStudy: {
    title: "Pakistani Tech Startup Expands to Dubai",
    problem: "A Pakistani tech startup wanted to establish a Dubai presence to serve GCC clients but was unsure about the best jurisdiction and business structure for their SaaS business.",
    solution: "We recommended a SHAMS freezone setup for 100% ownership and tax benefits, handled all documentation, and coordinated bank account opening with a local bank.",
    result: "The company was established within 5 days and had their bank account operational within 2 weeks. They saved 30% on setup costs through our freezone partnerships.",
    quote: "NextMove made the entire process seamless. We went from idea to operational Dubai company in just 5 days.",
    client: "CEO, Pakistani Tech Startup",
  },
  faq: [
    { question: "Mainland vs Freezone - which is better?", answer: "Mainland (DED license) allows direct UAE market trading and government contracts but requires a local service agent. Freezone offers 100% foreign ownership and tax benefits but limits you to freezone activities and international trade. We recommend based on your specific business model and target market." },
    { question: "How long does company formation take?", answer: "Freezone setup: 3-5 days. Mainland: 1-2 weeks. Offshore: 1-2 weeks. Bank account opening: 1-2 weeks additional. Total time from start to operational company: 2-4 weeks." },
    { question: "How much does it cost to set up a company in Dubai?", answer: "Costs vary by jurisdiction and business activity. Freezone starts at AED 8,000. Mainland starts at AED 12,000. Offshore starts at AED 7,500. Additional costs for bank account opening (AED 2,000), visa processing (AED 3,000-5,000), and office space." },
    { question: "Do I need to be in Dubai to set up a company?", answer: "No, we can handle the entire process remotely. Physical presence is only needed for bank account opening (some banks require in-person verification). We can arrange video calls for bank account opening with some banks." },
    { question: "Can I open a bank account without being in Dubai?", answer: "Some banks allow remote account opening with video verification. We work with banks that offer this service. However, some banks still require in-person verification. We will recommend the best option based on your needs." },
    { question: "What is a local service agent?", answer: "A local service agent (LSA) is a UAE national who acts as your company's local representative for mainland companies. They do not have any ownership or management control—they simply fulfill the legal requirement. We can arrange LSA services for mainland companies." },
    { question: "How many visas can I get with my company?", answer: "Visa allocation depends on your office space and jurisdiction. Freezone companies typically get 1-6 visas depending on the package. Mainland companies get visas based on office space (1 visa per 9 sq meters). We can help you choose the right package for your needs." },
    { question: "Can I change my business activity later?", answer: "Yes, you can add or change business activities after company formation. This requires an amendment to your trade license and may involve additional fees. We handle all license amendments and activity changes." },
    { question: "What are the ongoing compliance requirements?", answer: "Annual license renewal, visa renewals, financial record keeping, and VAT registration (if applicable). We provide ongoing compliance support and reminders for all renewal deadlines." },
    { question: "Can I operate multiple businesses under one license?", answer: "Generally, each business activity requires a separate license. However, some freezones allow multiple related activities under one license. We can advise on the best structure for your business portfolio." },
  ],
  relatedServices: [
    { slug: "product-registration", title: "Product Registration", summary: "Register products for UAE market entry.", tag: "Compliance" },
    { slug: "mofa-attestation", title: "MOFA Attestation", summary: "Document attestation and legalization services.", tag: "Legal" },
    { slug: "regulatory-approvals", title: "Regulatory Approvals", summary: "Certifications and compliance documentation.", tag: "Compliance" },
  ],
};
