'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';

const serviceLinks = [
  { label: 'MOHAP Registration', href: '/services/mohap-registration' },
  { label: 'Product Registration', href: '/services/product-registration' },
  { label: 'Medical Drugstore', href: '/services/medical-drugstore' },
  { label: 'Regulatory Approvals', href: '/services/regulatory-approvals' },
  { label: 'Business Setup', href: '/services/business-setup' },
  { label: 'MOFA Attestation', href: '/services/mofa-attestation' },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            NextMove
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600">Home</Link>
            <div className="relative group">
              <button className="flex items-center text-gray-700 hover:text-blue-600">
                Services <ChevronDown className="ml-1 w-4 h-4" />
              </button>
              <div className="absolute hidden group-hover:block w-64 bg-white shadow-lg rounded-lg mt-2 py-2">
                {serviceLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block px-4 py-2 text-gray-700 hover:bg-blue-50">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/about" className="text-gray-700 hover:text-blue-600">Who we are</Link>
            <Link href="/team" className="text-gray-700 hover:text-blue-600">Team</Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
            <Link href="/blog" className="text-gray-700 hover:text-blue-600">Blog</Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <Link href="/" className="block py-2 text-gray-700">Home</Link>
            <button onClick={() => setServicesOpen(!servicesOpen)} className="flex items-center py-2 text-gray-700">
              Services <ChevronDown className="ml-1 w-4 h-4" />
            </button>
            {servicesOpen && (
              <div className="pl-4">
                {serviceLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block py-2 text-gray-600">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/about" className="block py-2 text-gray-700">Who we are</Link>
            <Link href="/team" className="block py-2 text-gray-700">Team</Link>
            <Link href="/contact" className="block py-2 text-gray-700">Contact</Link>
            <Link href="/blog" className="block py-2 text-gray-700">Blog</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
