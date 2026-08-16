import { requireAdminRole } from '@/lib/dal';
import { SETTING_DEFS, SETTING_GROUPS, getPublicSettings } from '@/lib/settings';
import SettingsClient from '@/components/admin/SettingsClient';

export const dynamic = 'force-dynamic';

/**
 * Settings are admin-only (editors can manage content but not site configuration).
 *
 * The field list comes from the server-side registry in `lib/settings.ts`, so the
 * UI can no longer drift out of sync with what the API accepts. Previously the page
 * hard-coded 8 fields while the API allowed 12, leaving `phone_numbers`,
 * `whatsapp_contacts`, `social_links` and `og_image` uneditable.
 */
export default async function AdminSettingsPage() {
  await requireAdminRole();
  const values = await getPublicSettings();

  return <SettingsClient defs={SETTING_DEFS} groups={SETTING_GROUPS} initialValues={values} />;
}
