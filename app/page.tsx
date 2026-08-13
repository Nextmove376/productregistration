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

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
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
