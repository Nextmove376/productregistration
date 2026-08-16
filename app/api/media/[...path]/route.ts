import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { readFile, stat } from 'fs/promises';
import { join, extname, resolve, sep } from 'path';
import { sanitizeSvg } from '@/lib/sanitize';
import { logger } from '@/lib/logger';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  // NOTE: `.svg` is deliberately absent — see `svgResponse` below.
};

/** Only these extensions are ever served. Anything else is 404, not octet-stream. */
const SERVABLE = new Set([...Object.keys(MIME_MAP), '.svg']);

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogg']);

/**
 * Headers applied to every media response.
 *
 * The CSP + sandbox pair is what makes serving user-uploaded files safe: even if
 * a file is somehow interpreted as a document, it can load nothing and run
 * nothing, and it is treated as a unique opaque origin.
 */
function baseHeaders(contentType: string, size?: number): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (size !== undefined) headers['Content-Length'] = String(size);
  return headers;
}

/** Weak validator built from size + mtime — cheap and good enough for immutable uploads. */
function makeEtag(size: number, mtimeMs: number): string {
  return `W/"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

/**
 * SVG is an executable document format: a `<script>` inside one runs on this
 * origin. This route previously served uploaded SVGs as `image/svg+xml` inline
 * with a one-year immutable cache, which made any uploaded SVG a persistent
 * same-origin XSS.
 *
 * SVGs are now parsed and stripped through DOMPurify before being sent, so what
 * reaches the browser has no scripts, event handlers, or external references.
 */
async function svgResponse(fullPath: string, headers: Record<string, string>) {
  const raw = await readFile(fullPath, 'utf8');
  const clean = sanitizeSvg(raw);
  const body = Buffer.from(clean, 'utf8');

  return new NextResponse(body, {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Length': String(body.byteLength),
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const requested = segments.join('/');

  if (requested.includes('\0')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  /**
   * Traversal guard.
   *
   * The previous check was `filePath.includes("..")`, a substring test that both
   * rejects legitimate names containing ".." and misses encoded variants. This
   * resolves the path and confirms it is genuinely inside the upload directory.
   */
  const fullPath = resolve(UPLOAD_DIR, requested);
  const root = resolve(UPLOAD_DIR);
  if (fullPath !== root && !fullPath.startsWith(root + sep)) {
    logger.warn('media.traversal_blocked', { requested });
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const ext = extname(fullPath).toLowerCase();
  if (!SERVABLE.has(ext)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const etag = makeEtag(fileStat.size, fileStat.mtimeMs);
    const lastModified = new Date(fileStat.mtimeMs).toUTCString();

    // Conditional request — saves re-sending the body on every page view.
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch.split(',').some((t) => t.trim() === etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': 'public, max-age=31536000, immutable' },
      });
    }

    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
    const headers = {
      ...baseHeaders(contentType, fileStat.size),
      ETag: etag,
      'Last-Modified': lastModified,
    };

    if (ext === '.svg') {
      return svgResponse(fullPath, headers);
    }

    // Range support so video can be scrubbed instead of downloaded whole.
    const rangeHeader = request.headers.get('range');
    if (rangeHeader && VIDEO_EXTS.has(ext)) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (match) {
        const size = fileStat.size;
        let start = match[1] ? Number(match[1]) : 0;
        let end = match[2] ? Number(match[2]) : size - 1;

        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` },
          });
        }
        end = Math.min(end, size - 1);
        start = Math.max(0, start);

        const stream = createReadStream(fullPath, { start, end });
        return new NextResponse(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }

    // Stream rather than buffering the whole file into memory.
    const stream = createReadStream(fullPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: VIDEO_EXTS.has(ext) ? { ...headers, 'Accept-Ranges': 'bytes' } : headers,
    });
  } catch (e: any) {
    if (e?.code === 'ENOENT' || e?.code === 'ENOTDIR') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    logger.error('media.serve_failed', { err: e, requested });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
