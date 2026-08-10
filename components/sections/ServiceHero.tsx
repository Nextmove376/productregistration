import Link from 'next/link';
import Image from 'next/image';

interface ServiceHeroProps {
  title: string;
  description: string;
  image: string;
}

export default function ServiceHero({ title, description, image }: ServiceHeroProps) {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{title}</h1>
            <p className="text-xl mb-8 text-blue-100">{description}</p>
            <Link href="/contact" className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50">
              Schedule a Call
            </Link>
          </div>
          <div className="hidden md:block">
            <Image src={image} alt={title} width={800} height={600} className="rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
