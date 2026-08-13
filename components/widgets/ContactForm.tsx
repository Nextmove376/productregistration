'use client';

import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '', service: '', message: '' });
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="mt-4 font-serif text-2xl text-foreground">Thank you!</h3>
        <p className="mt-2 text-muted-foreground">We have received your enquiry and will respond within one business day.</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-foreground"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Full name</label>
          <input
            type="text"
            placeholder="Your full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input
            type="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]"
            required
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
          <input
            type="tel"
            placeholder="+971 50 000 0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Company name</label>
          <input
            type="text"
            placeholder="Your company LLC"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Service needed</label>
        <select
          value={formData.service}
          onChange={(e) => setFormData({ ...formData, service: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]"
          required
        >
          <option value="">Choose a service...</option>
          <option>MOHAP / EDE Registration</option>
          <option>Product Registration</option>
          <option>Regulatory Approvals</option>
          <option>MOFA &amp; PRO Services</option>
          <option>Business Setup</option>
          <option>Trademark &amp; Drugstore</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Your message</label>
        <textarea
          rows={4}
          placeholder="Tell us briefly about your project..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--teal)]"
          required
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--navy)] py-4 text-sm font-medium text-[var(--cream)] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === 'loading' ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cream)] border-t-transparent" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Send Message
          </>
        )}
      </button>
    </form>
  );
}
