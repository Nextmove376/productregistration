const logos = [
  { src: '/logos/mohap-1.svg', alt: 'Ministry of Health and Prevention (MOHAP)' },
  { src: '/logos/DRUG.svg', alt: 'UAE Drug Registration authority' },
  { src: '/logos/Sira-Logo.webp', alt: 'SIRA — Security Industry Regulatory Agency' },
  { src: '/logos/logo-blue-e1761295131394.webp', alt: 'Dubai Municipality' },
  { src: '/logos/SPCFZ-Sharjah.png', alt: 'SPC Free Zone Sharjah' },
  { src: '/logos/wArtboard-3.svg', alt: 'UAE regulatory partner' },
  { src: '/logos/wArtboard-2.svg', alt: 'UAE government partner' },
  { src: '/logos/wArtboard-1.svg', alt: 'UAE licensing partner' },
  { src: '/logos/67da7400f25dbf4c5bb11dc0_Meydan-FZ.webp', alt: 'Meydan Free Zone' },
  { src: '/logos/UAE-Ministry-of-Industry-Advanced-Technology.svg', alt: 'UAE Ministry of Industry and Advanced Technology' },
];

export default function LogoTicker() {
  return (
    <section aria-label="Regulators and authorities we work with" className="border-y border-border/60 bg-white py-8">
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee-track flex w-max items-center gap-14 group-hover:[animation-play-state:paused]">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-14" aria-hidden={dup === 1}>
              {logos.map((l) => (
                <img
                  key={l.src}
                  src={l.src}
                  alt={l.alt}
                  loading="lazy"
                  decoding="async"
                  height={48}
                  className="h-10 w-auto max-w-[150px] object-contain sm:h-12"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
