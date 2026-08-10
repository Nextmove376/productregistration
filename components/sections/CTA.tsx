import Link from 'next/link';
import Image from 'next/image';

export default function CTA() {
  return (
    <section className="relative py-20 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Logo & Description */}
          <div>
            <Image src="/images/logo.png" alt="NextMove Services" width={160} height={48} className="h-16 w-auto brightness-0 invert mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Start Your Business in UAE?
            </h2>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              Get in touch with our experts for a free consultation. We'll guide you through the entire process of product registration, business setup, and regulatory compliance in the UAE.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-blue-100">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-blue-200">Call or WhatsApp</p>
                  <p className="font-semibold">+971 52 910 2088</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-blue-100">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-blue-200">Visit us at</p>
                  <p className="font-semibold">Next Move Services, Dubai, UAE</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - CTA Box */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">Get Free Consultation</h3>
            <div className="w-16 h-1 bg-green-500 rounded mb-6" />
            <p className="text-blue-100 mb-6">
              Fill out the form below and our team will get back to you within 24 hours.
            </p>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Your Name" 
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-green-500"
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-green-500"
              />
              <input 
                type="tel" 
                placeholder="Phone Number" 
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-green-500"
              />
              <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-blue-200 focus:outline-none focus:border-green-500">
                <option value="">Select Service</option>
                <option value="product">Product Registration</option>
                <option value="business">Business Setup</option>
                <option value="regulatory">Regulatory Approvals</option>
                <option value="mofa">MOFA Attestation</option>
              </select>
              <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg">
                Get Free Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
