// Server-side SQLite storage. All data lives in <project>/data/ —
// reimburseme.db for records, receipts/ for photos. No cloud required.
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
export const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT '📝',
  color       TEXT NOT NULL DEFAULT '#888888',
  is_default  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reimbursement_reports (
  id            TEXT PRIMARY KEY,
  date_from     TEXT NOT NULL,
  date_to       TEXT NOT NULL,
  total_amount  INTEGER NOT NULL,
  expense_count INTEGER NOT NULL DEFAULT 0,
  receipt_count INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'submitted',
  breakdown     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id            TEXT PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  amount        INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'IDR',
  date          TEXT NOT NULL,
  note          TEXT,
  has_receipt   INTEGER NOT NULL DEFAULT 0,
  receipt_url   TEXT,
  ai_extracted  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending',
  report_id     TEXT REFERENCES reimbursement_reports(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON expenses(status, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_report ON expenses(report_id);
`;

const DEFAULT_CATEGORIES: [string, string, string, number][] = [
  ["Samples", "👗", "#E8927C", 1],
  ["Convection Fee", "🧵", "#7CB9E8", 2],
  ["Material", "🧶", "#9FE2BF", 3],
  ["Photoshoot", "📸", "#C3A6FF", 4],
  ["Shipping", "📦", "#FFD580", 5],
  ["Marketing", "📣", "#FF9AA2", 6],
  ["Other", "📝", "#B0B0B0", 7],
];

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
  db = new Database(path.join(DATA_DIR, "reimburseme.db"));
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  const seed = db.prepare(
    "INSERT OR IGNORE INTO categories (id, name, icon, color, is_default, sort_order) VALUES (?, ?, ?, ?, 1, ?)"
  );
  for (const [name, icon, color, order] of DEFAULT_CATEGORIES) {
    seed.run(randomUUID(), name, icon, color, order);
  }
  return db;
}

// SQLite stores booleans as 0/1 — convert rows to the shape the UI expects.
export function rowToExpense(row: Record<string, unknown>) {
  return {
    ...row,
    has_receipt: !!row.has_receipt,
    ai_extracted: !!row.ai_extracted,
  };
}

export const EXPENSE_SELECT = `
  SELECT e.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
  FROM expenses e JOIN categories c ON c.id = e.category_id
`;
