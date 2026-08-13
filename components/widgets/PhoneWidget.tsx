'use client';

import { useState } from 'react';
import { Phone, X, MessageCircle } from 'lucide-react';

interface Contact {
  name: string;
  phone: string;
  role: string;
}

const defaultContacts: Contact[] = [
  { name: 'Maher El Delbani', phone: '+971529102088', role: 'Consultant' },
  { name: 'Mariam Shana', phone: '+971505363584', role: 'Regulatory Affairs Specialist' },
  { name: 'Ajin Alex', phone: '+971509707440', role: 'Senior Advisor Associate' },
];

export default function PhoneWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Contact List */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl mb-4 w-80 overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Contact us</h3>
                <p className="text-blue-100 text-xs">Choose a contact to reach</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Contact List */}
          <div className="p-4 space-y-3">
            {defaultContacts.map((contact) => (
              <div
                key={contact.phone}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.role}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-blue-600" />
                  </a>
                  <a
                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=Hi%2C+can+you+help+me%3F+I+am+referring+https%3A%2F%2Fnextmoveservices.ae%2F`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
      >
        <Phone className="w-6 h-6" />
      </button>
    </div>
  );
}
