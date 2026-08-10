'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, MessageCircle, X } from 'lucide-react';
import type { WidgetAgent } from '@/lib/settings';

type Props = {
  whatsapp: { enabled: boolean; greeting: string; agents: WidgetAgent[] };
  phone: { enabled: boolean; greeting: string; agents: WidgetAgent[] };
};

type Panel = 'whatsapp' | 'phone' | null;

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const waLink = (phone: string, name: string) =>
  `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hi ${name.split(' ')[0]}, I'd like help with product registration in the UAE.`
  )}`;

/**
 * Floating WhatsApp + call widgets, both driven by admin settings.
 *
 * Rendered as one component so only one panel can be open at a time — two
 * independent widgets used to be able to cover each other on small screens.
 */
export default function ContactWidgets({ whatsapp, phone }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanel(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const waAgents = whatsapp.enabled ? whatsapp.agents.filter((a) => a.phone) : [];
  const phoneAgents = phone.enabled ? phone.agents.filter((a) => a.phone) : [];
  if (!waAgents.length && !phoneAgents.length) return null;

  const agents = panel === 'whatsapp' ? waAgents : phoneAgents;
  const isWa = panel === 'whatsapp';

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {panel && (
        <div
          role="dialog"
          aria-label={isWa ? 'Chat on WhatsApp' : 'Call us'}
          className="w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_24px_60px_-20px_rgba(15,34,51,0.45)]"
        >
          <div className={`flex items-start justify-between p-4 ${isWa ? 'bg-[#128C7E]' : 'bg-ink'} text-white`}>
            <div>
              <h2 className="text-base font-semibold">{isWa ? 'Chat with us' : 'Call our team'}</h2>
              <p className="mt-0.5 text-xs text-white/75">
                {isWa ? whatsapp.greeting : phone.greeting}
              </p>
            </div>
            <button
              onClick={() => setPanel(null)}
              aria-label="Close"
              className="rounded-full p-1 transition hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {agents.map((agent) => (
              <li key={agent.phone}>
                <a
                  href={isWa ? waLink(agent.phone, agent.name) : `tel:${agent.phone}`}
                  {...(isWa ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={() => setPanel(null)}
                  className="flex items-center gap-3 p-3.5 transition hover:bg-slate-50"
                >
                  {agent.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={agent.photo_url}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                    >
                      {initials(agent.name)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{agent.name}</span>
                    <span className="block truncate text-xs text-slate-500">{agent.role}</span>
                    {agent.hours && <span className="block truncate text-[11px] text-slate-400">{agent.hours}</span>}
                  </span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      isWa ? 'bg-[#25D366]/12 text-[#128C7E]' : 'bg-ink/8 text-ink'
                    }`}
                  >
                    {isWa ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        {phoneAgents.length > 0 && (
          <button
            onClick={() => setPanel(panel === 'phone' ? null : 'phone')}
            aria-label="Call our team"
            aria-expanded={panel === 'phone'}
            className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Phone className="h-5 w-5" />
          </button>
        )}
        {waAgents.length > 0 && (
          <button
            onClick={() => setPanel(panel === 'whatsapp' ? null : 'whatsapp')}
            aria-label="Chat on WhatsApp"
            aria-expanded={panel === 'whatsapp'}
            className="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#128C7E] focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}
