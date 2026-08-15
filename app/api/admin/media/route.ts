import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, checkCsrf, checkRateLimit } from "@/lib/api-auth";
import pool from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_REQUEST,
  validateMagicBytes,
  isVideoType,
} from "@/lib/media-validation";

const UPLOAD_DIR = join(process.cwd(), "uploads");

function generateSeoFilename(originalName: string, ext: string): string {
  const baseName = originalName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${baseName}-${timestamp}-${random}.${ext}`;
}

async function getImageMetadata(buffer: Buffer, mimeType: string) {
  try {
    if (mimeType === "image/svg+xml" || isVideoType(mimeType)) {
      return { width: null, height: null };
    }
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width || null, height: metadata.height || null };
  } catch {
    return { width: null, height: null };
  }
}

async function createThumbnail(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string | null> {
  try {
    if (mimeType === "image/svg+xml" || mimeType === "image/gif" || isVideoType(mimeType)) {
      return null;
    }
    const thumbnailDir = join(UPLOAD_DIR, "thumbnails");
    await mkdir(thumbnailDir, { recursive: true });
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = join(thumbnailDir, thumbnailFilename);
    await sharp(buffer)
      .resize(300, 300, { fit: "cover", position: "center" })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    return `thumbnails/${thumbnailFilename}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const search = url.searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM media";
  let countQuery = "SELECT COUNT(*) as total FROM media";
  const params: any[] = [];
  const countParams: any[] = [];

  if (search) {
    query += " WHERE filename LIKE ? OR alt LIKE ?";
    countQuery += " WHERE filename LIKE ? OR alt LIKE ?";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
    countParams.push(searchPattern, searchPattern);
  }

  query += " ORDER BY uploaded_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.execute(query, params);
  const [countRows] = await pool.execute(countQuery, countParams);
  const total = (countRows as any[])[0].total;

  // Rewrite paths to use API route
  const data = (rows as any[]).map((row) => ({
    ...row,
    path: `/api/media/${row.path.replace(/^\/uploads\//, "").replace(/^\/api\/media\//, "")}`,
    thumbnail_path: row.thumbnail_path
      ? `/api/media/${row.thumbnail_path.replace(/^\/uploads\//, "").replace(/^\/api\/media\//, "")}`
      : null,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`upload:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const altTexts = formData.getAll("alt") as string[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_REQUEST} files per upload` },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const alt = altTexts[i] || "";

      if (!ALLOWED_TYPES[file.type]) {
        errors.push({ filename: file.name, error: "Invalid file type" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ filename: file.name, error: "File too large (max 10MB)" });
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Magic byte validation
      if (!validateMagicBytes(buffer, file.type)) {
        errors.push({ filename: file.name, error: "File content does not match declared type" });
        continue;
      }

      const { width, height } = await getImageMetadata(buffer, file.type);
      const ext = ALLOWED_TYPES[file.type][0];
      const filename = generateSeoFilename(file.name, ext);
      const filepath = join(UPLOAD_DIR, filename);
      const storagePath = filename; // relative to UPLOAD_DIR

      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(filepath, buffer);

      const thumbnailRelPath = await createThumbnail(buffer, file.type, filename);

      const [result] = await pool.execute(
        "INSERT INTO media (filename, path, alt, width, height, size_bytes, mime_type, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [file.name, storagePath, alt, width, height, file.size, file.type, thumbnailRelPath]
      );

      results.push({
        id: (result as any).insertId,
        path: `/api/media/${storagePath}`,
        filename: file.name,
        alt,
        width,
        height,
        size_bytes: file.size,
        mime_type: file.type,
        thumbnail_path: thumbnailRelPath ? `/api/media/${thumbnailRelPath}` : null,
      });
    }

    return NextResponse.json({
      success: true,
      uploaded: results.length,
      errors: errors.length > 0 ? errors : undefined,
      data: results.length === 1 ? results[0] : results,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}