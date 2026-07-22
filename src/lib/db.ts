"use client";

// Client-side data layer. Talks to the local API routes (backed by SQLite
// in <project>/data/) — same function signatures the UI has always used.

export interface Category { id: string; name: string; icon: string; color: string; is_default: boolean; sort_order: number; }
export interface Expense { id: string; category_id: string; category_name?: string; category_icon?: string; category_color?: string; amount: number; date: string; note: string; has_receipt: boolean; receipt_url: string | null; status: string; report_id: string | null; created_at: string; }
export interface ReimbursementReport { id: string; date_from: string; date_to: string; total_amount: number; expense_count: number; receipt_count: number; status: string; breakdown: any; created_at: string; }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  return api<Category[]>("/api/categories");
}

export async function getExpenses(status: string = "pending"): Promise<Expense[]> {
  return api<Expense[]>(`/api/expenses?status=${encodeURIComponent(status)}`);
}

export async function addExpense(expense: { category_id: string; amount: number; date: string; note: string; has_receipt: boolean; receipt_url?: string | null; ai_extracted?: boolean; }): Promise<Expense> {
  return api<Expense>("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await api(`/api/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function uploadReceipt(expenseId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("expenseId", expenseId);
  form.append("file", file);
  const { url } = await api<{ url: string }>("/api/receipts", {
    method: "POST",
    body: form,
  });
  return url;
}

export async function getReports(): Promise<(ReimbursementReport & { items: Expense[] })[]> {
  return api<(ReimbursementReport & { items: Expense[] })[]>("/api/reports");
}

export async function markAsReimbursed(expenseIds: string[], dateFrom: string, dateTo: string, total: number, breakdown: any): Promise<void> {
  await api("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expenseIds, dateFrom, dateTo, total, breakdown }),
  });
}
