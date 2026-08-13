import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

const blogPostSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  excerpt: z.string().max(500).optional().default(""),
  content: z.string().min(1),
  featured_image: z.string().url().optional().or(z.literal("")),
  image_alt: z.string().max(200).optional().default(""),
  category_id: z.number().int().optional().nullable(),
  author: z.string().max(100).optional().default(""),
  status: z.enum(["draft", "scheduled", "published"]).default("draft"),
  published_at: z.string().optional().nullable(),
  meta_title: z.string().max(200).optional().default(""),
  meta_description: z.string().max(300).optional().default(""),
  og_image: z.string().url().optional().or(z.literal("")),
  reading_minutes: z.number().int().min(0).optional().default(0),
});

export async function GET() {
  const [rows] = await pool.execute(
    "SELECT id, slug, title, excerpt, featured_image, status, published_at, reading_minutes, views, created_at FROM posts ORDER BY created_at DESC"
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const body = await request.json();
  const validation = blogPostSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Validation failed", details: validation.error.issues }, { status: 400 });
  }
  const d = validation.data;
  const [result] = await pool.execute(
    "INSERT INTO posts (title, slug, excerpt, content, featured_image, image_alt, category_id, author, status, published_at, meta_title, meta_description, og_image, reading_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [d.title, d.slug, d.excerpt ?? "", d.content, d.featured_image ?? null, d.image_alt ?? "", d.category_id ?? null, d.author ?? "", d.status, d.published_at ?? null, d.meta_title ?? "", d.meta_description ?? "", d.og_image ?? null, d.reading_minutes ?? 0]
  );
  return NextResponse.json({ id: (result as any).insertId });
}
