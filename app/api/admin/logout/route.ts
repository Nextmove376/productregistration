import { after, type NextRequest } from 'next/server';
import { destroySession } from '@/lib/auth';
import { verifySession } from '@/lib/dal';
import { checkCsrf } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { csrfFailed, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Logout is state-changing, so it needs the same origin proof as any mutation —
  // otherwise a third-party page could sign the user out.
  if (!checkCsrf(request)) return csrfFailed();

  const session = await verifySession();

  await destroySession();

  if (session) {
    after(() =>
      logAudit({
        action: 'logout',
        entity: 'session',
        entityId: session.userId,
        actor: session,
        request,
      })
    );
  }

  return ok({ success: true });
}
