import { getServiceNav, getTeamNav } from '@/lib/nav';
import HeaderNav from '@/components/layout/HeaderNav';

/**
 * Server wrapper that supplies the header's dropdown contents.
 *
 * Kept at the same path and with the same empty-props signature as the old client
 * component, so all nine `<Header />` call sites are unchanged. The queries run on the
 * server inside each page's own ISR window rather than as a client fetch, so the menu is
 * in the first paint with no flash of a shorter nav.
 */
export default async function Header() {
  const [services, team] = await Promise.all([getServiceNav(), getTeamNav()]);
  return <HeaderNav services={services} team={team} />;
}
