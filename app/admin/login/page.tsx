import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/**
 * Server Component wrapper.
 *
 * `searchParams` is read here rather than with `useSearchParams()` in the client
 * form: it is a Request-time API, so it opts this page into dynamic rendering and
 * avoids the "useSearchParams should be wrapped in a suspense boundary"
 * prerender error.
 *
 * This route deliberately sits outside `app/admin/(protected)/`, so it renders
 * without the sidebar and without a session check.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === 'string' ? params.next : undefined;

  // Only same-site admin paths, so `?next=` can't become an open redirect.
  const next = raw && raw.startsWith('/admin') && !raw.startsWith('//') ? raw : '/admin/dashboard';

  return <LoginForm next={next} />;
}
