import Link from 'next/link';
import Image from 'next/image';
import { getSettings, getMenu, FALLBACK_HEADER_MENU } from '@/lib/settings';
import HeaderNav from './HeaderNav';

export default async function Header() {
  const [settings, menu] = await Promise.all([getSettings(), getMenu('header')]);
  const items = menu.length ? menu : FALLBACK_HEADER_MENU;

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center" aria-label={settings.site_name}>
          <Image
            src={settings.logo_header}
            alt={settings.site_name}
            width={240}
            height={64}
            priority
            sizes="(max-width: 768px) 160px, 240px"
            className="h-12 w-auto md:h-14"
          />
        </Link>
        <HeaderNav items={items} />
      </div>
    </header>
  );
}
