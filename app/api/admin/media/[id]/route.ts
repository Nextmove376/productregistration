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
  try {
    console.log("[DELETE] Request received");
    console.log("[DELETE] Origin:", request.headers.get("origin"));
    console.log("[DELETE] Host:", request.headers.get("host"));
    console.log("[DELETE] Cookie present:", !!request.headers.get("cookie"));

    const { error } = await requireAdmin(request);
    if (error) {
      console.log("[DELETE] Auth failed:", JSON.stringify(error));
      return error;
    }
    console.log("[DELETE] Auth passed");

    if (!checkCsrf(request)) {
      console.log("[DELETE] CSRF failed");
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
    console.log("[DELETE] CSRF passed");

    const { id } = await params;
    const mediaId = parseInt(id, 10);
    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }
    console.log("[DELETE] Deleting media ID:", mediaId);

    // Fetch the media record
    const [rows] = await pool.execute("SELECT * FROM media WHERE id = ?", [mediaId]);
    const items = rows as any[];
    if (items.length === 0) {
      console.log("[DELETE] Media not found");
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    const media = items[0];
    console.log("[DELETE] Found media:", media.filename, "path:", media.path);

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
    console.log("[DELETE] Found", refs.length, "references");

    // If force flag not set and references exist, warn
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";
    if (refs.length > 0 && !force) {
      console.log("[DELETE] Blocked by references");
      return NextResponse.json(
        {
          error: "Media is referenced by other content",
          references: refs.map((r: any) => ({ id: r.id, title: r.title })),
          hint: "Add ?force=true to force delete",
        },
        { status: 409 }
      );
    }

    // Delete physical file
    const filePath = join(UPLOAD_DIR, media.path.replace("/api/media/", ""));
    console.log("[DELETE] Deleting file:", filePath);
    try {
      await unlink(filePath);
      console.log("[DELETE] File deleted");
    } catch (e: any) {
      if (e.code !== "ENOENT") {
        console.error("[DELETE] Failed to delete file:", filePath, e);
      } else {
        console.log("[DELETE] File already deleted");
      }
    }

    // Delete thumbnail if exists
    if (media.thumbnail_path) {
      const thumbPath = join(UPLOAD_DIR, media.thumbnail_path.replace("/api/media/", ""));
      console.log("[DELETE] Deleting thumbnail:", thumbPath);
      try {
        await unlink(thumbPath);
      } catch (e: any) {
        if (e.code !== "ENOENT") {
          console.error("[DELETE] Failed to delete thumbnail:", thumbPath, e);
        }
      }
    }

    // Delete DB record
    console.log("[DELETE] Deleting DB record");
    await pool.execute("DELETE FROM media WHERE id = ?", [mediaId]);
    console.log("[DELETE] Done");

    return NextResponse.json({ success: true, id: mediaId });
  } catch (err: any) {
    console.error("[DELETE] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

