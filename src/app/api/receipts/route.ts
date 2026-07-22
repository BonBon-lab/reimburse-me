import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, RECEIPTS_DIR } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

// Only real image types — anything else (svg, html, …) is rejected so a
// stored file can never execute script when served back.
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Upload a receipt photo for an expense. Stores the file in data/receipts/
// and links it to the expense row.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const expenseId = form.get("expenseId");
  const file = form.get("file");

  if (typeof expenseId !== "string" || !(file instanceof File)) {
    return NextResponse.json(
      { error: "expenseId and file are required" },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  }

  const db = getDb();
  const expense = db.prepare("SELECT id FROM expenses WHERE id = ?").get(expenseId);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : "jpg";
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 415 });
  }
  const filename = `${path.basename(expenseId)}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RECEIPTS_DIR, filename), bytes);

  const url = `/api/receipts/${filename}`;
  db.prepare("UPDATE expenses SET has_receipt = 1, receipt_url = ? WHERE id = ?").run(
    url,
    expenseId
  );

  return NextResponse.json({ url });
}
