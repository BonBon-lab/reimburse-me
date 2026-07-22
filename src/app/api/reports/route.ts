import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb, rowToExpense, EXPENSE_SELECT } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const reports = db
    .prepare("SELECT * FROM reimbursement_reports ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  const itemsStmt = db.prepare(
    `${EXPENSE_SELECT} WHERE e.report_id = ? ORDER BY e.date DESC`
  );
  const result = reports.map((report) => ({
    ...report,
    breakdown: report.breakdown ? JSON.parse(report.breakdown as string) : null,
    items: (itemsStmt.all(report.id) as Record<string, unknown>[]).map(rowToExpense),
  }));
  return NextResponse.json(result);
}

// Compile pending expenses into a reimbursement report and mark them reimbursed.
export async function POST(request: NextRequest) {
  const { expenseIds, dateFrom, dateTo, total, breakdown } = await request.json();

  if (!Array.isArray(expenseIds) || expenseIds.length === 0 || !dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "expenseIds, dateFrom and dateTo are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const placeholders = expenseIds.map(() => "?").join(",");
  const receiptCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM expenses WHERE id IN (${placeholders}) AND has_receipt = 1`
      )
      .get(...expenseIds) as { n: number }
  ).n;

  const id = randomUUID();
  const createReport = db.transaction(() => {
    db.prepare(
      `INSERT INTO reimbursement_reports (id, date_from, date_to, total_amount, expense_count, receipt_count, status, breakdown)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)`
    ).run(
      id,
      dateFrom,
      dateTo,
      Math.round(total || 0),
      expenseIds.length,
      receiptCount,
      breakdown ? JSON.stringify(breakdown) : null
    );
    db.prepare(
      `UPDATE expenses SET status = 'reimbursed', report_id = ? WHERE id IN (${placeholders})`
    ).run(id, ...expenseIds);
  });
  createReport();

  return NextResponse.json({ id });
}
