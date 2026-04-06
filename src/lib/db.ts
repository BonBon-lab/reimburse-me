"use client";

import { createClient } from "./supabase";

export interface Category { id: string; name: string; icon: string; color: string; is_default: boolean; sort_order: number; }
export interface Expense { id: string; category_id: string; category_name?: string; category_icon?: string; category_color?: string; amount: number; date: string; note: string; has_receipt: boolean; receipt_url: string | null; status: string; report_id: string | null; created_at: string; }
export interface ReimbursementReport { id: string; date_from: string; date_to: string; total_amount: number; expense_count: number; receipt_count: number; status: string; breakdown: any; created_at: string; }

export async function getCategories(): Promise<Category[]> {
  const sb = createClient();
  const { data, error } = await sb.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function getExpenses(status: string = "pending"): Promise<Expense[]> {
  const sb = createClient();
  const { data, error } = await sb.from("expenses").select("*, categories(name, icon, color)").eq("status", status).order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map((e: any) => ({ ...e, category_name: e.categories?.name, category_icon: e.categories?.icon, category_color: e.categories?.color }));
}

export async function addExpense(expense: { category_id: string; amount: number; date: string; note: string; has_receipt: boolean; receipt_url?: string | null; ai_extracted?: boolean; }): Promise<Expense> {
  const sb = createClient();
  const { data, error } = await sb.from("expenses").insert({ ...expense, status: "pending", currency: "IDR" }).select("*, categories(name, icon, color)").single();
  if (error) throw error;
  return { ...data, category_name: data.categories?.name, category_icon: data.categories?.icon, category_color: data.categories?.color };
}

export async function uploadReceipt(expenseId: string, file: File): Promise<string> {
  const sb = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${expenseId}/receipt.${ext}`;
  const { error } = await sb.storage.from("receipts").upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}

export async function getReports(): Promise<(ReimbursementReport & { items: Expense[] })[]> {
  const sb = createClient();
  const { data: reports, error } = await sb.from("reimbursement_reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const result = [];
  for (const report of reports || []) {
    const { data: items } = await sb.from("expenses").select("*, categories(name, icon, color)").eq("report_id", report.id).order("date", { ascending: false });
    result.push({ ...report, items: (items || []).map((e: any) => ({ ...e, category_name: e.categories?.name, category_icon: e.categories?.icon, category_color: e.categories?.color })) });
  }
  return result;
}

export async function markAsReimbursed(expenseIds: string[], dateFrom: string, dateTo: string, total: number, breakdown: any): Promise<void> {
  const sb = createClient();
  const { data: withReceipt } = await sb.from("expenses").select("id").in("id", expenseIds).eq("has_receipt", true);
  const { data: report, error: re } = await sb.from("reimbursement_reports").insert({ date_from: dateFrom, date_to: dateTo, total_amount: total, expense_count: expenseIds.length, receipt_count: withReceipt?.length || 0, status: "submitted", breakdown }).select().single();
  if (re) throw re;
  const { error: ue } = await sb.from("expenses").update({ status: "reimbursed", report_id: report.id }).in("id", expenseIds);
  if (ue) throw ue;
}
