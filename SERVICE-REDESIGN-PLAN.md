# Service Pages Redesign — Complete Audit & Upgrade Plan

## 1. Current State Audit

### 1.1 Pages Inventory

| Page | URL | Status |
|------|-----|--------|
| Services Index | `/services` | DB-driven, grid layout |
| Product Registration | `/services/product-registration` | Static, ~50 words |
| MOHAP / EDE | `/services/mohap-registration` | Static, ~45 words |
| Business Setup | `/services/business-setup` | Static, ~40 words |
| Regulatory Approvals | `/services/regulatory-approvals` | Static, ~35 words |
| MOFA & PRO | `/services/mofa-attestation` | Static, ~40 words |
| Trademark & Drugstore | `/services/medical-drugstore` | Static, ~40 words |

### 1.2 Critical Defects Found

**Content:**
- Every page has ~40-50 words of body copy — catastrophic for SEO
- No process/workflow explanation
- No pricing signals or cost context
- No FAQ sections
- No case studies or proof points
- No regulatory body explanations (what is MOHAP? ESMA? DM?)
- No document checklists
- No timeline detail beyond "3-8 weeks"
- No comparison with alternatives (DIY vs. consultant)

**SEO:**
- Zero `generateMetadata()` — all pages share root title/description
- No JSON-LD structured data (Service, FAQPage, BreadcrumbList)
- No canonical URLs
- No OG images per service
- No internal linking between related services
- No breadcrumb navigation
- Thin content — Google will ignore these pages entirely

**UX/UI:**
- All 6 pages are identical templates with different text
- No visual differentiation between services
- No interactive elements (accordion, tabs, comparison)
- No trust signals (client logos, case studies, team expertise)
- No social proof specific to each service
- CTA is the same on every page — "Book a free consultation"
- No sticky CTA on scroll
- No related services sidebar/section

**Conversion:**
- No urgency signals
- No risk reversal (money-back, free consultation detail)
- No specific outcomes/results
- No "who this is for" vs "who this is NOT for"
- No next steps explained
- Contact form is generic — not pre-filled with service context

---

## 2. Competitor Analysis (UAE Regulatory Consultancy Space)

### 2.1 Key Competitors

1. **Decent Consultants** (decentconsultants.ae)
   - 800+ word service pages
   - Detailed process steps (5-7 steps per service)
   - Document checklists
   - Pricing packages visible
   - Client testimonials per service
   - Blog content supporting each service

2. **Flyingcolour** (flyingcolour.com)
   - 1500+ word service pages
   - Comparison tables (Mainland vs Freezone)
   - FAQ sections (8-12 questions per service)
   - Video content
   - Live chat integration
   - Trust badges (DED, DMCC, etc.)

3. **Commitbiz** (commitbiz.com)
   - 2000+ word service pages
   - Step-by-step process with timelines
   - Cost breakdowns
   - Case studies
   - Related services cross-linking
   - Schema markup (Service, FAQPage, LocalBusiness)

4. **Virtuzone** (virtuzone.com)
   - Premium design, 1000+ words per page
   - Calculator tools
   - Comparison matrices
   - Free consultation booking flow
   - Strong brand trust signals

### 2.2 Content Gap Analysis

| Element | Your Site | Competitor Avg | Gap |
|---------|-----------|----------------|-----|
| Word count per service | ~50 | 800-2000 | **CRITICAL** |
| Process steps | 0 | 5-7 | **CRITICAL** |
| FAQ per service | 0 | 8-12 | **CRITICAL** |
| Document checklist | 0 | Yes | High |
| Pricing context | 0 | Packages visible | Medium |
| Case studies | 0 | 2-3 per service | High |
| Related services | 0 | 3-4 cross-links | High |
| Schema markup | 0 | Service + FAQPage | High |
| Breadcrumbs | 0 | Yes | Medium |
| Trust signals | 0 | Per-service | High |

---

## 3. Redesign Strategy

### 3.1 Information Architecture

```
/services                          (Hub — grid of all services)
├── /services/product-registration (Pillar — comprehensive guide)
│   ├── #how-it-works             (Process section)
│   ├── #what-we-register         (Sub-services grid)
│   ├── #documents-required       (Checklist)
│   ├── #timelines-and-costs      (Table)
│   ├── #faq                      (8-12 questions)
│   └── #related-services         (Cross-links)
├── /services/mohap-registration  (Pillar)
├── /services/business-setup      (Pillar)
├── /services/regulatory-approvals(Pillar)
├── /services/mofa-attestation    (Pillar)
└── /services/medical-drugstore   (Pillar)
```

### 3.2 URL Structure (Keep Current — Already Clean)

```
/services/product-registration     — Product Registration in Dubai
/services/mohap-registration       — MOHAP Registration UAE
/services/business-setup           — Business Setup Dubai
/services/regulatory-approvals     — Regulatory Approvals UAE
/services/mofa-attestation         — MOFA Attestation Services
/services/medical-drugstore        — Pharmacy & Drugstore Setup
```

### 3.3 Keyword Mapping

| Service Page | Primary Keyword | Secondary Keywords | Search Intent |
|--------------|-----------------|-------------------|---------------|
| Product Registration | product registration dubai | product registration uae, dubai municipality product registration, esma registration, cosmetic registration dubai, food product registration uae | Transactional + Informational |
| MOHAP Registration | mohap registration uae | mohap product registration, medical device registration uae, pharmaceutical registration dubai, mohap approval | Transactional |
| Business Setup | business setup dubai | company formation dubai, freezone company setup, mainland trade license dubai, start business in dubai | Transactional |
| Regulatory Approvals | regulatory approvals uae | esma certification, gmp certification uae, halal certification dubai, free sale certificate | Transactional |
| MOFA Attestation | mohap attestation dubai | document attestation uae, embassy legalization dubai, mofa services uae | Transactional |
| Medical/Drugstore | pharmacy setup dubai | drugstore license uae, medical store setup, pharmacy registration dubai | Transactional |

### 3.4 Content Outline — Per Service Page

Each service page should follow this structure:

```
1. HERO SECTION
   - H1: [Service Name] in [Location]
   - Subtitle: One-line value proposition
   - Trust badge: "Licensed by [Authority]"
   - CTA: "Get Free Assessment"

2. TRUST BAR
   - Client logos (3-5)
   - "X+ businesses served"
   - Rating/review count

3. OVERVIEW (200-300 words)
   - H2: What is [Service]?
   - Explain the service, who needs it, why it matters
   - Mention relevant authorities (MOHAP, DM, ESMA, etc.)
   - Internal link to related authority page

4. HOW IT WORKS (Process)
   - H2: How We Handle Your [Service]
   - 5-7 numbered steps with icons
   - Timeline per step
   - "What you need to do" vs "What we handle"

5. WHAT'S INCLUDED (Sub-services Grid)
   - H2: What We Register / What We Offer
   - 6-8 cards with icons
   - Brief description per card

6. DOCUMENTS REQUIRED
   - H2: Documents You'll Need
   - Checklist format
   - "Don't have X? We can help with that"

7. TIMELINES & PRICING
   - H2: Timeline & Investment
   - Table: Service variant | Timeline | Starting Price
   - "Prices vary based on complexity"
   - CTA: "Get a precise quote"

8. WHY CHOOSE US
   - H2: Why Businesses Choose NextMove
   - 3-4 differentiators with icons
   - Years of experience
   - Success rate
   - Authority relationships

9. CASE STUDY / SUCCESS STORY
   - H2: [Client Type] Success Story
   - Problem → Solution → Result
   - Quote from client

10. FAQ SECTION
    - H2: Frequently Asked Questions
    - 8-12 questions with accordion
    - Cover: cost, timeline, documents, process, common concerns
    - Schema: FAQPage markup

11. RELATED SERVICES
    - H2: Related Services
    - 3-4 cards linking to other service pages
    - Brief context on why they're related

12. FINAL CTA
    - Full-width section
    - "Ready to get started?"
    - Contact form OR "Book Free Consultation"
    - Phone number, WhatsApp link
```

---

## 4. Technical SEO Requirements

### 4.1 Per-Page Metadata

```typescript
// Example for Product Registration
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Product Registration in Dubai | MOHAP, DM & ESMA — NextMove',
    description: 'Register cosmetics, food, supplements and household goods in Dubai. End-to-end product registration through Dubai Municipality, ESMA and MOIAT. Free assessment.',
    alternates: { canonical: 'https://productregistrationinuae.com/services/product-registration' },
    openGraph: {
      title: 'Product Registration in Dubai — NextMove Services',
      description: '...',
      images: ['/images/og/product-registration.jpg'],
      type: 'website',
    },
  };
}
```

### 4.2 JSON-LD Schema

**Service Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Product Registration in Dubai",
  "provider": { "@type": "ProfessionalService", "name": "Next Move Services" },
  "areaServed": { "@type": "Country", "name": "United Arab Emirates" },
  "description": "...",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "AED", "description": "Free initial assessment" }
}
```

**FAQPage Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "How long does product registration take?", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
  ]
}
```

**BreadcrumbList:**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://productregistrationinuae.com" },
    { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://productregistrationinuae.com/services" },
    { "@type": "ListItem", "position": 3, "name": "Product Registration" }
  ]
}
```

### 4.3 Internal Linking Architecture

```
Homepage → Services Index → Individual Service Pages
    ↓              ↓                    ↓
Blog posts    Related services    Contact form (pre-filled)
    ↓              ↓                    ↓
Team page     Other services      Thank you page
```

**Cross-linking rules:**
- Every service page links to 3-4 related services
- Every service page links to the contact form with `?service=X` pre-fill
- Blog posts link to relevant service pages
- Service pages link to relevant blog posts
- Footer links to all services

### 4.4 Breadcrumb Navigation

```tsx
<nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
  <Link href="/">Home</Link> / <Link href="/services">Services</Link> / <span>Product Registration</span>
</nav>
```

---

## 5. UX & Conversion Strategy

### 5.1 Service Page Layout (Desktop)

```
┌─────────────────────────────────────────────┐
│ HERO — H1 + Subtitle + Trust Badge + CTA   │
├─────────────────────────────────────────────┤
│ TRUST BAR — Logos + Stats                   │
├──────────────────────┬──────────────────────┤
│                      │                      │
│ OVERVIEW             │ STICKY SIDEBAR       │
│ (200-300 words)      │ - Quick contact form │
│                      │ - Phone number       │
├──────────────────────┤ - WhatsApp button    │
│                      │ - Download checklist │
│ HOW IT WORKS         │                      │
│ (5-7 steps)          │                      │
│                      │                      │
├──────────────────────┤                      │
│                      │                      │
│ WHAT'S INCLUDED      │                      │
│ (Grid of cards)      │                      │
│                      │                      │
├──────────────────────┤                      │
│                      │                      │
│ DOCUMENTS REQUIRED   │                      │
│ (Checklist)          │                      │
│                      │                      │
├──────────────────────┤                      │
│                      │                      │
│ TIMELINES & PRICING  │                      │
│ (Table)              │                      │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ WHY CHOOSE US — Differentiators             │
├─────────────────────────────────────────────┤
│ CASE STUDY — Problem → Solution → Result    │
├─────────────────────────────────────────────┤
│ FAQ — Accordion (8-12 questions)            │
├─────────────────────────────────────────────┤
│ RELATED SERVICES — 3-4 cards                │
├─────────────────────────────────────────────┤
│ FINAL CTA — Full width + Contact            │
└─────────────────────────────────────────────┘
```

### 5.2 Mobile Layout

```
┌─────────────────────┐
│ HERO                │
│ H1 + CTA button     │
├─────────────────────┤
│ TRUST BAR (scroll)  │
├─────────────────────┤
│ OVERVIEW            │
├─────────────────────┤
│ HOW IT WORKS        │
│ (Vertical steps)    │
├─────────────────────┤
│ WHAT'S INCLUDED     │
│ (1-column cards)    │
├─────────────────────┤
│ DOCUMENTS           │
├─────────────────────┤
│ TIMELINES           │
├─────────────────────┤
│ STICKY BOTTOM CTA   │
│ [Call] [WhatsApp]   │
├─────────────────────┤
│ WHY CHOOSE US       │
├─────────────────────┤
│ CASE STUDY          │
├─────────────────────┤
│ FAQ                 │
├─────────────────────┤
│ RELATED SERVICES    │
├─────────────────────┤
│ FINAL CTA           │
└─────────────────────┘
```

### 5.3 Conversion Elements

**Primary CTA:** "Get Free Assessment" (links to contact form with service pre-selected)
**Secondary CTA:** "Call Now" (click-to-call on mobile)
**Tertiary CTA:** "WhatsApp Us" (pre-filled message)

**Trust Signals:**
- "Licensed by Dubai Economy & Tourism"
- "X+ years in UAE regulatory consulting"
- "X+ products registered"
- Client logos (Meydan, MOHAP, SPCFZ, etc.)
- Team expertise badges

**Risk Reversal:**
- "Free initial assessment — no obligation"
- "We only take on projects we're confident we can deliver"
- "Transparent pricing — no hidden fees"

---

## 6. Implementation Plan

### Phase 1: Content Creation (1-2 days per service)
- [ ] Write 800-1500 word content for each service page
- [ ] Create 8-12 FAQ questions per service
- [ ] Document checklists per service
- [ ] Process step descriptions
- [ ] Case study content (or realistic placeholder)

### Phase 2: Component Development (2-3 days)
- [ ] Create `ServicePageLayout` component with all sections
- [ ] Create `ProcessSteps` component (numbered steps with icons)
- [ ] Create `DocumentChecklist` component
- [ ] Create `PricingTable` component
- [ ] Create `FAQAccordion` component
- [ ] Create `RelatedServices` component
- [ ] Create `StickyCTA` mobile component
- [ ] Create `Breadcrumb` component
- [ ] Create `StickySidebar` component (desktop)

### Phase 3: SEO Implementation (1 day)
- [ ] Add `generateMetadata()` to each service page
- [ ] Add JSON-LD (Service, FAQPage, BreadcrumbList)
- [ ] Add breadcrumb navigation
- [ ] Add canonical URLs
- [ ] Add OG images per service

### Phase 4: Dynamic Content from DB (1 day)
- [ ] Migrate service content to `services` table (body JSON)
- [ ] Update `app/services/[slug]/page.tsx` to render all sections from DB
- [ ] Admin editor for service content
- [ ] Seed script with full content

### Phase 5: Testing & Launch (1 day)
- [ ] Mobile responsive testing
- [ ] Lighthouse audit (target: 90+ performance)
- [ ] Schema validation (Google Rich Results Test)
- [ ] Internal link verification
- [ ] Form pre-fill testing
- [ ] Deploy to production

---

## 7. Content Templates

### 7.1 Product Registration — Full Content Outline

**H1:** Product Registration in Dubai — MOHAP, Dubai Municipality & ESMA

**Overview (250 words):**
Product registration in Dubai is mandatory for any company selling cosmetics, food items, health supplements, biocides, or household goods in the UAE market. The process involves submitting product formulations, lab reports, and safety documentation to the relevant authority — typically Dubai Municipality (DM), the Emirates Authority for Standardization and Metrology (ESMA), or the Ministry of Industry and Advanced Technology (MOIAT).

At NextMove Services, we manage the entire registration lifecycle: from initial product assessment and document preparation through submission, follow-up, and final approval. Our team has registered hundreds of products across all major categories, and we maintain direct relationships with the reviewing authorities to ensure smooth, timely approvals.

**Process Steps:**
1. Free Product Assessment (1-2 days) — We review your product category, ingredients, and documentation
2. Document Preparation (3-5 days) — We compile all required certificates, lab reports, and artwork
3. Label Review (2-3 days) — We ensure your labels comply with UAE regulations
4. Submission (1 day) — We file the application with the relevant authority
5. Authority Review (2-6 weeks) — We track progress and respond to queries
6. Approval & Certificate (1-3 days) — We collect your registration certificate

**Documents Required:**
- [ ] Free Sale Certificate from country of origin
- [ ] GMP Certificate
- [ ] Product formulation / ingredient list
- [ ] Lab test reports (microbiological, heavy metals)
- [ ] Product artwork / labels (Arabic + English)
- [ ] Manufacturing license
- [ ] Certificate of Analysis (COA)
- [ ] Power of Attorney (authorizing NextMove to act on your behalf)

**FAQ (Sample):**
Q: How long does product registration take in Dubai?
A: Typical timelines range from 3-8 weeks depending on the product category and authority. Simple cosmetic registrations may complete in 3-4 weeks, while food products with novel ingredients may take 6-8 weeks.

Q: How much does product registration cost?
A: Costs vary by product type and complexity. Government fees start from AED 1,000 per product. Our service fees depend on the scope of work. Contact us for a precise quote based on your specific products.

Q: Can I sell products in Dubai without registration?
A: No. Selling unregistered products in the UAE is illegal and can result in fines, product seizure, and business license suspension.

---

## 8. Services Hub Page Redesign

### Current Issues:
- Only shows title, tag, and summary per service
- No visual hierarchy or categorization
- No content supporting SEO
- No process overview

### Redesign:

**Sections:**
1. **Hero** — "Our Services" + subtitle about regulatory expertise
2. **Service Categories** — Group by type (Product Registration, Business Setup, Compliance, Legalization)
3. **Each Service Card** — Icon, title, summary, key benefit, CTA
4. **Process Overview** — "How We Work" (5 steps applicable to all services)
5. **Trust Section** — Stats (years, products registered, success rate)
6. **FAQ** — General questions about working with a regulatory consultant
7. **CTA** — "Not sure which service you need? Let's talk."

---

## 9. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Words per service page | ~50 | 800-1500 |
| FAQ questions per page | 0 | 8-12 |
| Internal links per page | 1-2 | 5-8 |
| Schema types per page | 0 | 3 (Service, FAQPage, BreadcrumbList) |
| Organic traffic (6 months) | Baseline | +200% |
| Contact form submissions | Baseline | +150% |
| Avg time on service page | ~30s | 2-3 min |
| Bounce rate on service pages | ~80% | <50% |

---

## 10. Priority Order

1. **Product Registration** — Highest search volume, most competitive
2. **Business Setup** — High volume, strong intent
3. **MOHAP Registration** — Niche but high-value leads
4. **Regulatory Approvals** — Supports other services
5. **MOFA Attestation** — Moderate volume
6. **Medical/Drugstore** — Niche, lower volume
7. **Services Hub** — Update after all individual pages done
