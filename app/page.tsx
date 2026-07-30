import Hero from '@/components/landing/Hero';
import LogoTicker from '@/components/landing/LogoTicker';
import WhoWeAre from '@/components/landing/WhoWeAre';
import Services from '@/components/landing/Services';
import Values from '@/components/landing/Values';
import WhyUs from '@/components/landing/WhyUs';
import Partner from '@/components/sections/Partner';
import Testimonials from '@/components/sections/Testimonials';
import Insights from '@/components/sections/Insights';
import FAQ from '@/components/sections/FAQ';
import ContactCta from '@/components/sections/ContactCta';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What documents do I need for product registration?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Requirements vary by category, but typically include a valid trade license, product artwork, ingredient list, certificate of free sale, GMP certificate, and lab analysis.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does MOHAP registration take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For medical devices and medicines, expect 8–14 weeks depending on classification and dossier completeness.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mainland or Freezone — which is right for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It depends on where your customers are and what activities you'll perform. We map both scenarios (cost, ownership, visa quota, restrictions) before you commit.",
      },
    },
    {
      '@type': 'Question',
      name: 'Will I have a dedicated advisor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. You're paired with a single point of contact who owns your file end-to-end and stays with you through renewals and future filings.",
      },
    },
  ],
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />
      <main id="main-content">
        <Hero />
        <LogoTicker />
        <WhoWeAre />
        <Services />
        <Values />
        <WhyUs />
        <Partner />
        <Testimonials />
        <Insights />
        <FAQ />
        <ContactCta />
      </main>
      <Footer />
    </div>
  );
}
