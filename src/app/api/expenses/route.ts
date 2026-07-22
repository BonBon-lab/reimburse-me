import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { getDb, rowToExpense, EXPENSE_SELECT, RECEIPTS_DIR } from "@/lib/sqlite";

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

// Delete a pending expense (and its receipt file). Expenses already tied to
// a reimbursement report are protected — deleting them would corrupt totals.
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  const expense = db
    .prepare("SELECT id, report_id, receipt_url FROM expenses WHERE id = ?")
    .get(id) as { id: string; report_id: string | null; receipt_url: string | null } | undefined;

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (expense.report_id) {
    return NextResponse.json(
      { error: "Expense is part of a reimbursement report and cannot be deleted" },
      { status: 409 }
    );
  }

  if (expense.receipt_url) {
    const filename = path.basename(expense.receipt_url);
    const filePath = path.join(RECEIPTS_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare("DELETE FROM expenses WHERE id = ?").run(id);

  return NextResponse.json({ deleted: true });
}
