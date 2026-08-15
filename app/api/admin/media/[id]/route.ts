import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, checkCsrf } from "@/lib/api-auth";
import pool from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  const [rows] = await pool.execute("SELECT * FROM media WHERE id = ?", [mediaId]);
  const items = rows as any[];
  if (items.length === 0) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json(items[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const alt = body?.alt;
  if (typeof alt !== "string") {
    return NextResponse.json({ error: "alt must be a string" }, { status: 400 });
  }
  if (alt.length > 300) {
    return NextResponse.json({ error: "alt text too long (max 300 chars)" }, { status: 400 });
  }

  const [existing] = await pool.execute("SELECT id FROM media WHERE id = ?", [mediaId]);
  if ((existing as any[]).length === 0) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  await pool.execute("UPDATE media SET alt = ? WHERE id = ?", [alt, mediaId]);
  const [updated] = await pool.execute("SELECT * FROM media WHERE id = ?", [mediaId]);
  return NextResponse.json((updated as any[])[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  // Fetch the media record
  const [rows] = await pool.execute("SELECT * FROM media WHERE id = ?", [mediaId]);
  const items = rows as any[];
  if (items.length === 0) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  const media = items[0];

  // Check foreign key references
  const [postRefs] = await pool.execute(
    "SELECT id, title FROM posts WHERE featured_image = ? OR og_image = ? LIMIT 5",
    [media.path, media.path]
  );
  const [serviceRefs] = await pool.execute(
    "SELECT id, title FROM services WHERE hero_image = ? OR og_image = ? LIMIT 5",
    [media.path, media.path]
  );
  const refs = [...(postRefs as any[]), ...(serviceRefs as any[])];

  // If force flag not set and references exist, warn
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  if (refs.length > 0 && !force) {
    return NextResponse.json(
      {
        error: "Media is referenced by other content",
        references: refs.map((r: any) => ({ id: r.id, title: r.title })),
        hint: "Add ?force=true to delete anyway",
      },
      { status: 409 }
    );
  }

  // Delete physical file
  const filePath = join(UPLOAD_DIR, media.path.replace("/api/media/", ""));
  try {
    await unlink(filePath);
  } catch (e: any) {
    if (e.code !== "ENOENT") {
      console.error("Failed to delete file:", filePath, e);
    }
  }

  // Delete thumbnail if exists
  if (media.thumbnail_path) {
    const thumbPath = join(UPLOAD_DIR, media.thumbnail_path.replace("/api/media/", ""));
    try {
      await unlink(thumbPath);
    } catch (e: any) {
      if (e.code !== "ENOENT") {
        console.error("Failed to delete thumbnail:", thumbPath, e);
      }
    }
  }

  // Delete DB record
  await pool.execute("DELETE FROM media WHERE id = ?", [mediaId]);

  return NextResponse.json({ success: true, id: mediaId });
}