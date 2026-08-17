import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import { requireEditor } from '@/lib/dal';
import ServiceForm, { type ServiceFormValues } from '@/components/admin/ServiceForm';
import { parseServiceBody } from '@/lib/service-content';

export const dynamic = 'force-dynamic';

/**
 * The edit route the services list has always linked to but which never existed,
 * so every Edit click 404'd.
 */
export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireEditor();

  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [rows] = await pool.execute(
    `SELECT id, slug, title, tag, summary, body, icon, hero_image, og_image, sort_order,
            is_active, meta_title, meta_description
       FROM services
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  const service = (rows as any[])[0];
  if (!service) notFound();

  const initial: Partial<ServiceFormValues> = {
    id: service.id,
    title: service.title ?? '',
    slug: service.slug ?? '',
    tag: service.tag ?? '',
    summary: service.summary ?? '',
    icon: service.icon ?? '',
    hero_image: service.hero_image ?? '',
    og_image: service.og_image ?? '',
    sort_order: service.sort_order ?? 0,
    is_active: service.is_active ? 1 : 0,
    meta_title: service.meta_title ?? '',
    meta_description: service.meta_description ?? '',
    // `body` was not selected here, while PUT writes `body=?` unconditionally —
    // so every save through this form silently erased the page content. It is
    // normalised through the same parser the public page uses, which also fills
    // in defaults for rows written before the hero/ourServices model existed.
    body: parseServiceBody(service.body),
  };

  return <ServiceForm mode="edit" initial={initial} />;
}
