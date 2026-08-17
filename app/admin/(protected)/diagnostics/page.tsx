import { requireAdminRole } from '@/lib/dal';
import DiagnosticsClient from '@/components/admin/DiagnosticsClient';

export const dynamic = 'force-dynamic';

/**
 * Database diagnostics.
 *
 * Admin-only, because the repair action runs DDL. This screen exists so a schema that
 * has fallen behind the code can be identified and fixed from the panel, instead of
 * guessing at a "Could not load …" toast and hand-pasting SQL into phpMyAdmin.
 */
export default async function DiagnosticsPage() {
  await requireAdminRole();
  return <DiagnosticsClient />;
}
