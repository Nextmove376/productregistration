import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { revalidateTag } from "next/cache";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [rows] = await pool.execute(
    "UPDATE posts SET status = \"published\" WHERE status = \"scheduled\" AND published_at <= NOW()"
  );
  const affected = (rows as any).affectedRows;
  if (affected > 0) {
    revalidateTag("blog", { revalidate: true });
    revalidateTag("services", { revalidate: true });
  }
  return NextResponse.json({ success: true, published: affected });
}
