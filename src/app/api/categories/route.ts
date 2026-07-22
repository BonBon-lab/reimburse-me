import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM categories ORDER BY sort_order")
    .all() as Record<string, unknown>[];
  return NextResponse.json(
    rows.map((r) => ({ ...r, is_default: !!r.is_default }))
  );
}
