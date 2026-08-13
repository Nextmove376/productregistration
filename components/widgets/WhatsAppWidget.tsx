'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface Agent {
  name: string;
  role: string;
  phone: string;
  photo_url: string;
}

const defaultAgents: Agent[] = [
  { name: 'Maher El Delbani', role: 'Consultant', phone: '+971529102088', photo_url: '/images/maher.svg' },
  { name: 'Mariam Shana', role: 'Regulatory Affairs Specialist', phone: '+971505363584', photo_url: '/images/mariam.svg' },
  { name: 'Ajin Alex', role: 'Senior Advisor Associate', phone: '+971509707440', photo_url: '/images/ajin.svg' },
];

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl mb-4 w-80 overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Chat with us</h3>
                <p className="text-green-100 text-xs">Typically replies within minutes</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-green-700 rounded-full transition-colors" aria-label="Close chat">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Choose an agent</p>
            {defaultAgents.map((agent) => (
              <a
                key={agent.phone}
                href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}?text=Hi+${agent.name.split(' ')[0]}%2C+can+you+help+me%3F+I+am+referring+https%3A%2F%2Fnextmoveservices.ae%2F`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
              >
                <div className="relative">
                  <img src={agent.photo_url} alt={agent.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-green-100" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">{agent.name}</p>
                  <p className="text-xs text-gray-500">{agent.role}</p>
                </div>
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            ))}
          </div>
          <div className="px-4 pb-4">
            <p className="text-xs text-center text-gray-400">Powered by WhatsApp</p>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-110 relative"
        aria-label="Open WhatsApp chat"
      >
        <MessageCircle className="w-6 h-6" />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">1</span>
        )}
      </button>
    </div>
  );
}
