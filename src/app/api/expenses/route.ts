import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, rowToExpense, EXPENSE_SELECT } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "pending";
  const db = getDb();
  const rows = db
    .prepare(`${EXPENSE_SELECT} WHERE e.status = ? ORDER BY e.date DESC, e.created_at DESC`)
    .all(status) as Record<string, unknown>[];
  return NextResponse.json(rows.map(rowToExpense));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { category_id, amount, date, note, has_receipt, receipt_url, ai_extracted } = body;

  if (!category_id || typeof amount !== "number" || !date) {
    return NextResponse.json(
      { error: "category_id, amount and date are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO expenses (id, category_id, amount, currency, date, note, has_receipt, receipt_url, ai_extracted, status)
     VALUES (?, ?, ?, 'IDR', ?, ?, ?, ?, ?, 'pending')`
  ).run(
    id,
    category_id,
    Math.round(amount),
    date,
    note || "",
    has_receipt ? 1 : 0,
    receipt_url || null,
    ai_extracted ? 1 : 0
  );

  const row = db
    .prepare(`${EXPENSE_SELECT} WHERE e.id = ?`)
    .get(id) as Record<string, unknown>;
  return NextResponse.json(rowToExpense(row));
}
