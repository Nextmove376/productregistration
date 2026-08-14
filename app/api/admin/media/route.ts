import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';
import { writeFile, mkdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import sharp from 'sharp';

// Security: Allowed MIME types and their extensions
const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/svg+xml': ['svg'],
  'image/gif': ['gif'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 5;

// Generate SEO-friendly filename
function generateSeoFilename(originalName: string, ext: string): string {
  const baseName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, 50); // Limit length
  
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${baseName}-${timestamp}-${random}.${ext}`;
}

// Generate image metadata for SEO
async function getImageMetadata(buffer: Buffer, mimeType: string) {
  try {
    if (mimeType === 'image/svg+xml') {
      return { width: null, height: null };
    }
    
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || null,
      height: metadata.height || null,
    };
  } catch {
    return { width: null, height: null };
  }
}

// Create optimized thumbnail
async function createThumbnail(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  try {
    if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
      return null; // Skip thumbnails for SVG and GIF
    }
    
    const thumbnailDir = join(process.cwd(), 'public', 'uploads', 'thumbnails');
    await mkdir(thumbnailDir, { recursive: true });
    
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = join(thumbnailDir, thumbnailFilename);
    
    await sharp(buffer)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return `/uploads/thumbnails/${thumbnailFilename}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM media';
  let countQuery = 'SELECT COUNT(*) as total FROM media';
  const params: any[] = [];
  const countParams: any[] = [];

  if (search) {
    query += ' WHERE filename LIKE ? OR alt LIKE ?';
    countQuery += ' WHERE filename LIKE ? OR alt LIKE ?';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
    countParams.push(searchPattern, searchPattern);
  }

  query += ' ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.execute(query, params);
  const [countRows] = await pool.execute(countQuery, countParams);
  const total = (countRows as any[])[0].total;

  return NextResponse.json({ 
    data: rows, 
    total, 
    page, 
    limit,
    totalPages: Math.ceil(total / limit)
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const altTexts = formData.getAll('alt') as string[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES_PER_REQUEST} files per upload` }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const alt = altTexts[i] || '';

      // Validate file type
      if (!ALLOWED_TYPES[file.type]) {
        errors.push({ filename: file.name, error: 'Invalid file type' });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ filename: file.name, error: 'File too large (max 10MB)' });
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Get image metadata
      const { width, height } = await getImageMetadata(buffer, file.type);

      // Generate SEO-friendly filename
      const ext = ALLOWED_TYPES[file.type][0];
      const filename = generateSeoFilename(file.name, ext);
      const filepath = join(process.cwd(), 'public', 'uploads', filename);
      const publicPath = `/uploads/${filename}`;

      // Ensure upload directory exists
      await mkdir(join(process.cwd(), 'public', 'uploads'), { recursive: true });

      // Write file
      await writeFile(filepath, buffer);

      // Create thumbnail
      const thumbnailPath = await createThumbnail(buffer, file.type, filename);

      // Insert into DB
      const [result] = await pool.execute(
        'INSERT INTO media (filename, path, alt, width, height, size_bytes, mime_type, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [file.name, publicPath, alt, width, height, file.size, file.type, thumbnailPath]
      );

      results.push({
        id: (result as any).insertId,
        path: publicPath,
        filename: file.name,
        alt,
        width,
        height,
        size_bytes: file.size,
        mime_type: file.type,
        thumbnail_path: thumbnailPath,
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: results.length,
      errors: errors.length > 0 ? errors : undefined,
      data: results.length === 1 ? results[0] : results,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
