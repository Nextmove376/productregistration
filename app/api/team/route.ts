import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  bio: z.string().max(2000).optional().default(""),
  linkedin: z.string().url().optional().or(z.literal("")),
  photo_url: z.string().max(500).optional().default(""),
  phone: z.string().max(20).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().default(""),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.number().int().min(0).max(1).optional().default(1),
});

export async function GET() {
  const [rows] = await pool.execute(
    "SELECT id, name, role, bio, linkedin, photo_url, phone, email, whatsapp, sort_order, is_active FROM team_members ORDER BY sort_order"
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const body = await request.json();
  const validation = teamMemberSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Validation failed", details: validation.error.issues }, { status: 400 });
  }
  const d = validation.data;
  const [result] = await pool.execute(
    "INSERT INTO team_members (name, role, bio, linkedin, photo_url, phone, email, whatsapp, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [d.name, d.role, d.bio ?? "", d.linkedin ?? null, d.photo_url ?? "", d.phone ?? "", d.email ?? null, d.whatsapp ?? "", d.sort_order ?? 0, d.is_active ?? 1]
  );
  return NextResponse.json({ id: (result as any).insertId });
}
