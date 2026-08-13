import Link from 'next/link';

const posts = [
  { 
    title: 'Product Registration in Dubai: Complete 2025 Guide', 
    excerpt: 'A step-by-step guide to registering cosmetics, health supplements, and food items with Dubai Municipality.',
    slug: 'product-registration-dubai-guide',
    date: 'Jan 15, 2025',
    image: '/images/blog-1.jpg'
  },
  { 
    title: 'Business Setup in UAE: Free Zone vs Mainland', 
    excerpt: 'Which option is best for your company? We compare costs, ownership, and visa eligibility.',
    slug: 'business-setup-uae-free-zone-mainland',
    date: 'Jan 10, 2025',
    image: '/images/blog-2.jpg'
  },
  { 
    title: 'MOHAP Approval Process for Medical Devices', 
    excerpt: 'Everything you need to know about Class I, II, and III medical device registration in the UAE.',
    slug: 'mohap-approval-medical-devices',
    date: 'Jan 5, 2025',
    image: '/images/blog-3.jpg'
  },
];

export default function BlogPreview() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Blog</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">
            Latest Insights
          </h2>
          <div className="w-20 h-1 bg-blue-600 rounded mx-auto" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-2">{post.date}</p>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{post.title}</h3>
                <p className="text-gray-600 text-sm">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/blog" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            View All Posts
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
