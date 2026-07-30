'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    service: '',
    details: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // TODO: Add API integration
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Your Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>
      <div>
        <input
          type="tel"
          placeholder="Your Contact"
          value={formData.contact}
          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>
      <div>
        <input
          type="email"
          placeholder="Your Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>
      <div>
        <select
          value={formData.service}
          onChange={(e) => setFormData({ ...formData, service: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          required
        >
          <option value="">Choose Service Type</option>
          <option value="medical">Medical Devices And Medicines Registration</option>
          <option value="drugstore">Drug Store Setup</option>
          <option value="cosmetic">Cosmetic Products</option>
          <option value="supplements">Health Supplements</option>
          <option value="food">Food Items Registration</option>
          <option value="biocides">Biocides And Detergents Registration</option>
        </select>
      </div>
      <div>
        <textarea
          placeholder="Your Details"
          value={formData.details}
          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          rows={4}
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        Send <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
