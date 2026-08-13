'use client';

import { useState } from 'react';

const tabs = [
  {
    id: 'story',
    title: 'Story',
    content: 'Welcome to Next Move Services â€” your trusted partner for product registration in Dubai and business setup in UAE. We help businesses secure fast approvals for cosmetics, food items, health supplements, and more through Dubai Municipality.',
  },
  {
    id: 'mission',
    title: 'Mission',
    content: 'Our mission is to simplify business setup in UAE and product registration in Dubai by providing end-to-end, reliable support across all regulatory processes.',
  },
  {
    id: 'vision',
    title: 'Vision',
    content: 'Our vision is to become the UAE\'s most trusted one-stop solution for business setup in UAE and product registration in Dubai.',
  },
];

export default function AboutPreview() {
  const [activeTab, setActiveTab] = useState('story');

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Fast & Reliable Product Registration in Dubai and Business Setup in UAE.
            </h2>
            <div className="flex gap-4 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  {tab.title}
                </button>
              ))}
            </div>
            <p className="text-gray-600">{tabs.find((t) => t.id === activeTab)?.content}</p>
          </div>
          <div>
            <img src="/images/about-image.jpg" alt="About NextMove" className="rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
