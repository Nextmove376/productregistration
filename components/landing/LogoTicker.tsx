import LogoMarquee from '@/components/ui/LogoMarquee';
import type { LogoItem } from '@/lib/service-content';

/**
 * The landing-page trust bar.
 *
 * The rendering is delegated to `LogoMarquee`, which the service pages use too, so
 * the two strips can no longer drift apart — they had, and this one was still
 * forcing every brand to render black via `grayscale opacity-70` while the service
 * one had already been fixed. Only the section chrome differs, because the two sit
 * on different backgrounds.
 */

const logos: LogoItem[] = [
  { imageUrl: '/logos/mohap-1.svg', label: 'Ministry of Health and Prevention (MOHAP)', href: '' },
  { imageUrl: '/logos/DRUG.svg', label: 'UAE Drug Registration authority', href: '' },
  {
    imageUrl: '/logos/Sira-Logo.webp',
    label: 'SIRA — Security Industry Regulatory Agency',
    href: '',
  },
  { imageUrl: '/logos/logo-blue-e1761295131394.webp', label: 'Dubai Municipality', href: '' },
  { imageUrl: '/logos/SPCFZ-Sharjah.png', label: 'SPC Free Zone Sharjah', href: '' },
  { imageUrl: '/logos/wArtboard-3.svg', label: 'UAE regulatory partner', href: '' },
  { imageUrl: '/logos/wArtboard-2.svg', label: 'UAE government partner', href: '' },
  { imageUrl: '/logos/wArtboard-1.svg', label: 'UAE licensing partner', href: '' },
  {
    imageUrl: '/logos/67da7400f25dbf4c5bb11dc0_Meydan-FZ.webp',
    label: 'Meydan Free Zone',
    href: '',
  },
  {
    imageUrl: '/logos/UAE-Ministry-of-Industry-Advanced-Technology.svg',
    label: 'UAE Ministry of Industry and Advanced Technology',
    href: '',
  },
];

export default function LogoTicker() {
  return (
    <section
      aria-label="Regulators and authorities we work with"
      className="border-y border-border/60 bg-card py-8"
    >
      <LogoMarquee items={logos} />
    </section>
  );
}
