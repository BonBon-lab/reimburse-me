"use client";

export interface Expense {
  id: number;
  category: string;
  amount: number;
  date: string;
  note: string;
  hasReceipt: boolean;
  receiptImage?: string | null;
}

export interface ArchivedReport {
  dateFrom: string;
  dateTo: string;
  total: number;
  count: number;
  categories: { id: string; total: number }[];
  items: Expense[];
  reimbursedAt: string;
}

const EXPENSES_KEY = "reimburse_expenses";
const REPORTS_KEY = "reimburse_reports";

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  if (typeof window === "undefined") return;
  // Strip receipt images to save localStorage space, keep a flag
  const lite = expenses.map((e) => ({
    ...e,
    receiptImage: e.receiptImage ? "__stored__" : null,
  }));
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(lite));
}

// Separate storage for receipt images (they can be large)
export function saveReceiptImage(expenseId: number, dataUrl: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`receipt_${expenseId}`, dataUrl);
  } catch {
    // localStorage full — silently fail
    console.warn("Could not save receipt image — storage may be full");
  }
}

export function loadReceiptImage(expenseId: number): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`receipt_${expenseId}`);
}

export function deleteReceiptImage(expenseId: number) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`receipt_${expenseId}`);
}

export function loadReports(): ArchivedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveReports(reports: ArchivedReport[]) {
  if (typeof window === "undefined") return;
  // Strip receipt images from archived items too
  const lite = reports.map((r) => ({
    ...r,
    items: r.items.map((e) => ({
      ...e,
      receiptImage: e.receiptImage ? "__stored__" : null,
    })),
  }));
  localStorage.setItem(REPORTS_KEY, JSON.stringify(lite));
}

// Hydrate expenses with their receipt images
export function hydrateReceipts(expenses: Expense[]): Expense[] {
  return expenses.map((e) => ({
    ...e,
    receiptImage:
      e.receiptImage === "__stored__"
        ? loadReceiptImage(e.id)
        : e.receiptImage || null,
  }));
}
