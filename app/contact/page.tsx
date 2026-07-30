import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us | Free Consultation — Next Move Services UAE',
  description: 'Get in touch with Next Move Services Dubai for product registration, MOHAP approvals, business setup and PRO services. Response within one business day.',
  alternates: { canonical: 'https://productregistrationinuae.com/contact' },
  openGraph: {
    title: 'Contact Us | Next Move Services',
    description: 'Get in touch for product registration, MOHAP approvals, and business setup in UAE.',
    url: 'https://productregistrationinuae.com/contact',
    images: [{ url: '/images/hero-dubai.jpg', width: 1920, height: 1200 }],
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
