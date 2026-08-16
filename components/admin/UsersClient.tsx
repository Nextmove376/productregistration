'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck, Loader2, Unlock, UserX, UserCheck, KeyRound, X, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  locked: boolean;
  failed_attempts: number;
}

const CONTROL =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10';
const LABEL = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500';

export default function UsersClient({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts((prev) => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.get('/api/admin/users'));
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (user: AdminUser, body: Record<string, unknown>, successMessage: string) => {
    setBusyId(user.id);
    try {
      await api.put(`/api/admin/users/${user.id}`, body);
      addToast('success', successMessage);
      await load();
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const unlock = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await api.patch(`/api/admin/users/${user.id}`, { action: 'unlock' });
      addToast('success', `${user.email} unlocked`);
      await load();
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Unlock failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Admins manage everything. Editors can manage content but not users or settings.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Last login</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {u.name}
                        {u.id === currentUserId && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">you</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => mutate(u, { role: e.target.value }, `${u.email} is now ${e.target.value}`)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-sm disabled:opacity-50"
                        aria-label={`Role for ${u.email}`}
                      >
                        <option value="admin">admin</option>
                        <option value="editor">editor</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-gray-100 text-gray-600 ring-gray-200'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {u.locked && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        {u.locked && (
                          <button
                            onClick={() => unlock(u)}
                            disabled={busyId === u.id}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                            title="Unlock account"
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setResetFor(u)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          title="Set new password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {u.id !== currentUserId && (
                          <button
                            onClick={() =>
                              mutate(
                                u,
                                { is_active: u.is_active ? 0 : 1 },
                                `${u.email} ${u.is_active ? 'deactivated' : 'reactivated'}`
                              )
                            }
                            disabled={busyId === u.id}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                            title={u.is_active ? 'Deactivate' : 'Reactivate'}
                          >
                            {busyId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={(email) => {
            setShowCreate(false);
            addToast('success', `${email} created`);
            load();
          }}
        />
      )}

      {resetFor && (
        <ResetPasswordDialog
          user={resetFor}
          onClose={() => setResetFor(null)}
          onDone={() => {
            const email = resetFor.email;
            setResetFor(null);
            addToast('success', `Password updated for ${email}. Their existing sessions were signed out.`);
            load();
          }}
        />
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string) => void }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'editor', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/admin/users', form);
      onCreated(form.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the user');
      setSaving(false);
    }
  };

  return (
    <Dialog title="Add user" onClose={onClose}>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="new-name" className={LABEL}>
            Name
          </label>
          <input
            id="new-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={CONTROL}
            required
          />
        </div>
        <div>
          <label htmlFor="new-email" className={LABEL}>
            Email
          </label>
          <input
            id="new-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={CONTROL}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="new-role" className={LABEL}>
            Role
          </label>
          <select
            id="new-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={CONTROL}
          >
            <option value="editor">Editor — content only</option>
            <option value="admin">Admin — full access</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-password" className={LABEL}>
            Temporary password
          </label>
          <input
            id="new-password"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={`${CONTROL} font-mono`}
            autoComplete="new-password"
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            At least 12 characters with upper case, lower case and a number.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create user
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/admin/users/${user.id}`, { password });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the password');
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Set password — ${user.email}`} onClose={onClose}>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="reset-password" className={LABEL}>
            New password
          </label>
          <input
            id="reset-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${CONTROL} font-mono`}
            autoComplete="new-password"
            required
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-400">
            At least 12 characters with upper case, lower case and a number. This signs the user out
            of all existing sessions.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </div>
      </form>
    </Dialog>
  );
}
