'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Mail, Phone, Building, Globe, Clock, ChevronDown } from 'lucide-react';

type Submission = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  service: string | null;
  message: string;
  source_page: string | null;
  status: string;
  mail_status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/submissions?status=${filter}`)
      .then(res => res.json())
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/admin/submissions?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="space-y-4">
        {submissions.map((s) => (
          <div key={s.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-gray-500">{s.service || 'General enquiry'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.new}`}>
                  {s.status}
                </span>
                {s.mail_status === 'failed' && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Email failed</span>
                )}
                <span className="text-sm text-gray-500">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded === s.id ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expanded === s.id && (
              <div className="px-6 pb-4 border-t">
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline">{s.email}</a>
                    </div>
                    {s.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${s.phone}`} className="text-blue-600 hover:underline">{s.phone}</a>
                      </div>
                    )}
                    {s.company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span>{s.company}</span>
                      </div>
                    )}
                    {s.source_page && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{s.source_page}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{new Date(s.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Message</div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{s.message}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {['new', 'contacted', 'qualified', 'won', 'lost'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(s.id, status)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        s.status === status
                          ? STATUS_COLORS[status]
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {submissions.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No submissions found. They&apos;ll appear here when visitors fill out the contact form.
          </div>
        )}
      </div>
    </div>
  );
}
