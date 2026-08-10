import type { Metadata } from 'next';
import Link from 'next/link';
import { sanitizeRichText } from '@/lib/sanitize';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const blogPosts: Record<string, { title: string; content: string; date: string; tag: string; description: string }> = {
  'open-a-pharmacy-in-dubai-uae': {
    title: 'Open a Pharmacy in Dubai UAE: Foreign Investor Guide 2026',
    date: 'Jul 20, 2026',
    tag: 'Guide',
    description: 'Complete guide for foreign investors looking to open a pharmacy in Dubai. Covers MOHAP licensing, 100% ownership rules, and step-by-step setup process.',
    content: `
      <p>Opening a pharmacy in Dubai as a foreign investor requires careful planning and understanding of UAE regulations.</p>
      <h2>Requirements for Pharmacy Setup</h2>
      <p>Foreign investors can now own 100% of pharmacies in UAE under recent regulatory changes.</p>
      <h2>MOHAP Approval Process</h2>
      <p>The Ministry of Health and Prevention (MOHAP) oversees pharmacy licensing in UAE.</p>
    `,
  },
  'how-to-register-a-product-in-dubai': {
    title: 'How to Register a Product in Dubai, UAE: The Complete Step-by-Step Guide (2026)',
    date: 'Jul 15, 2026',
    tag: 'Playbook',
    description: 'Step-by-step guide to registering products in Dubai through Dubai Municipality, ESMA, and MOHAP. Covers cosmetics, food, supplements, and medical devices.',
    content: `
      <p>Product registration in Dubai involves multiple steps and regulatory approvals.</p>
      <h2>Step 1: Documentation</h2>
      <p>Prepare all required documentation including product specifications and safety data.</p>
      <h2>Step 2: Submission</h2>
      <p>Submit through Dubai Municipality's Montaji system.</p>
    `,
  },
  'how-to-set-up-a-business-in-dubai-uae': {
    title: 'Set Up a Business in Dubai: Mainland vs Free Zone vs Offshore — Complete 2026 Guide',
    date: 'Jul 10, 2026',
    tag: 'Comparison',
    description: 'Compare mainland, free zone, and offshore business setup in Dubai. Covers costs, ownership, visa quotas, and which option is right for your business.',
    content: `
      <p>Choosing the right business setup option in UAE depends on your business goals.</p>
      <h2>Mainland Setup</h2>
      <p>Mainland companies can trade directly within the UAE market.</p>
      <h2>Free Zone Setup</h2>
      <p>Free zones offer 100% foreign ownership and tax benefits.</p>
    `,
  },
};

const BASE_URL = 'https://productregistrationinuae.com';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts[slug];
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | Next Move Services`,
    description: post.description,
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      images: [{ url: '/images/hero-dubai.jpg', width: 1920, height: 1200 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts[slug];

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="text-center">
            <h1 className="font-serif text-5xl">Post not found</h1>
            <Link href="/blog" className="mt-6 inline-block text-sm underline underline-offset-4">Back to blog →</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            datePublished: post.date,
            description: post.description,
            url: `${BASE_URL}/blog/${slug}`,
            publisher: { '@type': 'Organization', name: 'Next Move Services' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
          }),
        }}
      />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%)' }} />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 md:pt-32">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-[var(--cream)]/70 hover:text-[var(--cream)] mb-8">
            ← Back to insights
          </Link>
          <div className="mb-6 text-xs uppercase tracking-[0.2em] text-[var(--teal)]">{post.tag}</div>
          <h1 className="font-serif text-4xl leading-tight md:text-6xl">{post.title}</h1>
          <div className="mt-6 text-sm text-[var(--cream)]/60">{post.date}</div>
        </div>
      </section>
      <article className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-[var(--navy)] prose-p:text-muted-foreground prose-a:text-[var(--teal-deep)]" dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content) }} />
      </article>
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-4xl leading-[1.02] md:text-6xl">
                Need help?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Book a free consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
