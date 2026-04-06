"use client";

import { useState, useEffect, useCallback } from "react";
import { scanReceiptLocal } from "@/lib/ocr";
import {
  Category,
  Expense,
  ReimbursementReport,
  getCategories,
  getExpenses,
  addExpense,
  getReports,
  markAsReimbursed,
  uploadReceipt,
} from "@/lib/db";

function formatRp(a: number) { return "Rp " + a.toLocaleString("id-ID"); }
function formatDate(s: string) { return new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

function BottomNav({ active, onNav, pendingCount }: { active: string; onNav: (p: string) => void; pendingCount: number }) {
  const items = [{ id: "dashboard", icon: "📊", label: "Dashboard" }, { id: "add", icon: "➕", label: "Add" }, { id: "report", icon: "📋", label: "Report" }, { id: "history", icon: "📁", label: "History" }];
  return (<div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(22,22,26,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-around", padding: "8px 0 max(20px, env(safe-area-inset-bottom))", zIndex: 100 }}>
    {items.map((item) => (<button key={item.id} onClick={() => onNav(item.id)} style={{ background: "none", border: "none", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: active === item.id ? 1 : 0.4, transition: "all 0.2s", transform: active === item.id ? "scale(1.1)" : "scale(1)" }}>
      <span style={{ fontSize: item.id === "add" ? 28 : 22, background: item.id === "add" ? "linear-gradient(135deg, #E8927C, #E8D47C)" : "none", borderRadius: item.id === "add" ? 14 : 0, padding: item.id === "add" ? "4px 18px" : 0 }}>{item.icon}</span>
      {item.id === "dashboard" && pendingCount > 0 && (<span style={{ position: "absolute", top: -4, right: 2, background: "#E8927C", color: "#16161A", fontSize: 10, fontWeight: 800, borderRadius: 10, padding: "1px 6px", minWidth: 16, textAlign: "center" }}>{pendingCount}</span>)}
      <span style={{ fontSize: 10, color: active === item.id ? "#E8927C" : "#888", fontWeight: 600, letterSpacing: 0.5 }}>{item.label}</span>
    </button>))}
  </div>);
}

function Dashboard({ expenses, categories, onViewReceipt }: { expenses: Expense[]; categories: Category[]; onViewReceipt: (e: Expense) => void }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat: Record<string, { cat: Category; amount: number }> = {};
  expenses.forEach((e) => { const cat = categories.find((c) => c.id === e.category_id); if (!cat) return; if (!byCat[cat.id]) byCat[cat.id] = { cat, amount: 0 }; byCat[cat.id].amount += e.amount; });
  const sortedCats = Object.values(byCat).sort((a, b) => b.amount - a.amount);
  return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ padding: "20px 0 24px" }}>
      <p style={{ fontSize: 13, color: "#888", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Pending Reimbursement</p>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "4px 0 0", color: expenses.length > 0 ? "#E8927C" : "#9CE87C", fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(total)}</h1>
      <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>{expenses.length > 0 ? `${expenses.length} unreimbursed expense${expenses.length !== 1 ? "s" : ""}` : "All caught up! No pending expenses 🎉"}</p>
    </div>
    {expenses.length === 0 && (<div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(156,232,124,0.05)", borderRadius: 20, border: "1px solid rgba(156,232,124,0.15)" }}><span style={{ fontSize: 64 }}>✨</span><p style={{ fontSize: 18, fontWeight: 700, color: "#9CE87C", margin: "16px 0 8px" }}>All Clear!</p><p style={{ fontSize: 14, color: "#888", lineHeight: 1.5 }}>No pending expenses. Tap ➕ to log when you make a purchase.</p></div>)}
    {sortedCats.length > 0 && (<div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 18, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
      <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 14px" }}>Breakdown</p>
      {sortedCats.map(({ cat, amount }) => { const pct = total > 0 ? (amount / total) * 100 : 0; return (<div key={cat.id} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 13, color: "#ccc" }}>{cat.icon} {cat.name}</span><span style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>{formatRp(amount)}</span></div><div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 2, transition: "width 0.6s ease" }} /></div></div>); })}
    </div>)}
    {expenses.length > 0 && (<><p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 12px" }}>Pending Expenses</p>
      {expenses.map((exp) => (<div key={exp.id} onClick={() => onViewReceipt(exp)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${exp.category_color || "#888"}18`, flexShrink: 0 }}>{exp.category_icon || "📝"}</div>
        <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 14, color: "#ddd", margin: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.note}</p><p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>{formatDate(exp.date)} {exp.has_receipt ? "• 🧾" : ""}</p></div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#E8927C", margin: 0, flexShrink: 0 }}>{formatRp(exp.amount)}</p>
      </div>))}</>)}
  </div>);
}

function AddExpenseView({ categories, onSaved }: { categories: Category[]; onSaved: () => void }) {
  const [mode, setMode] = useState<null | "scan" | "manual">(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState(""); const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hasReceipt, setHasReceipt] = useState(false); const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false); const [scanStage, setScanStage] = useState("");
  const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false);
  const resetForm = () => { setMode(null); setCategoryId(null); setAmount(""); setNote(""); setDate(new Date().toISOString().slice(0, 10)); setHasReceipt(false); setReceiptFile(null); setReceiptPreview(null); setScanning(false); setScanStage(""); };

  const handleSave = async () => {
    if (!categoryId || !amount || saving) return; setSaving(true);
    try {
      const exp = await addExpense({ category_id: categoryId, amount: parseInt(String(amount).replace(/\D/g, "")) || 0, date, note: note || categories.find(c => c.id === categoryId)?.name || "Expense", has_receipt: hasReceipt });
      if (receiptFile && exp.id) { try { const url = await uploadReceipt(exp.id, receiptFile); const { createClient } = await import("@/lib/supabase"); const supabase = createClient(); await supabase.from("expenses").update({ receipt_url: url }).eq("id", exp.id); } catch (e) { console.warn("Receipt upload failed:", e); } }
      setSaved(true); setTimeout(() => { setSaved(false); resetForm(); onSaved(); }, 1200);
    } catch (e) { console.error("Save failed:", e); alert("Failed to save. Try again."); }
    setSaving(false);
  };

  const handleScan = async (file: File) => {
    setScanning(true); setScanStage("Preparing..."); setHasReceipt(true); setReceiptFile(file);
    const reader = new FileReader(); reader.onload = (e) => setReceiptPreview(e.target?.result as string); reader.readAsDataURL(file);
    try { const formData = new FormData(); formData.append("receipt", file); const res = await fetch("/api/expenses/scan", { method: "POST", body: formData });
      if (res.ok) { const parsed = await res.json(); if (!parsed.error) { setAmount(String(parsed.amount || "")); setDate(parsed.date || new Date().toISOString().slice(0, 10)); setNote(parsed.note || "");
        const cat = categories.find(c => c.name.toLowerCase().includes(parsed.category)) || categories.find(c => c.name === "Other"); if (cat) setCategoryId(cat.id); setScanStage("done"); setScanning(false); return; } }
    } catch {}
    try { const result = await scanReceiptLocal(file, (stage) => setScanStage(stage)); setAmount(String(result.amount || "")); setDate(result.date || new Date().toISOString().slice(0, 10)); setNote(result.note || "");
      const cat = categories.find(c => c.name.toLowerCase().includes(result.category)) || categories.find(c => c.name === "Other"); if (cat) setCategoryId(cat.id); setScanStage("done"); setScanning(false);
    } catch { setScanStage("Could not read. Fill manually."); setScanning(false); setMode("manual"); }
  };

  if (saved) return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 16 }}><div className="animate-pop" style={{ fontSize: 64 }}>✅</div><p style={{ fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>Expense Saved!</p><p style={{ fontSize: 14, color: "#888" }}>Stored in cloud ☁️</p></div>);

  if (mode === null) return (<div style={{ padding: "20px 20px 100px" }}>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 8px", fontFamily: "'DM Serif Display', Georgia, serif" }}>Log Expense</h2><p style={{ fontSize: 14, color: "#888", margin: "0 0 28px" }}>How would you like to add it?</p>
    <button onClick={() => setMode("scan")} style={{ width: "100%", padding: "28px 24px", marginBottom: 14, background: "linear-gradient(145deg, rgba(232,146,124,0.15), rgba(232,212,124,0.08))", border: "2px solid rgba(232,146,124,0.3)", borderRadius: 20, cursor: "pointer", textAlign: "left" as const }}><div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 40 }}>📷</span><div><p style={{ fontSize: 17, fontWeight: 800, color: "#F5F0EB", margin: 0 }}>Scan Receipt</p><p style={{ fontSize: 13, color: "#999", margin: "4px 0 0" }}>AI auto-fills everything</p></div></div><div style={{ marginTop: 14, padding: "6px 12px", background: "rgba(232,146,124,0.2)", borderRadius: 8, display: "inline-block" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#E8927C", letterSpacing: 0.5 }}>✨ RECOMMENDED</span></div></button>
    <button onClick={() => setMode("manual")} style={{ width: "100%", padding: "24px", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.06)", borderRadius: 20, cursor: "pointer", textAlign: "left" as const }}><div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 36 }}>✏️</span><div><p style={{ fontSize: 17, fontWeight: 800, color: "#F5F0EB", margin: 0 }}>Enter Manually</p><p style={{ fontSize: 13, color: "#999", margin: "4px 0 0" }}>Type in the details</p></div></div></button>
  </div>);

  if (mode === "scan" && !categoryId) return (<div style={{ padding: "20px 20px 100px" }}>
    <button onClick={resetForm} style={{ background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>← Back</button>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 24px", fontFamily: "'DM Serif Display', Georgia, serif" }}>📷 Scan Receipt</h2>
    {!scanning && !receiptPreview && (<label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, borderRadius: 20, cursor: "pointer", border: "3px dashed rgba(232,146,124,0.4)", background: "rgba(232,146,124,0.05)" }}><input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleScan(e.target.files[0]); }} /><span style={{ fontSize: 56, marginBottom: 12 }}>📸</span><p style={{ fontSize: 16, fontWeight: 700, color: "#E8927C", margin: "0 0 6px" }}>Tap to take photo</p><p style={{ fontSize: 13, color: "#888", margin: 0 }}>or select from gallery</p></label>)}
    {scanning && (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 40 }}>{receiptPreview && <img src={receiptPreview} alt="Receipt" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 16, objectFit: "cover", border: "2px solid rgba(232,146,124,0.3)" }} />}<div style={{ display: "flex", alignItems: "center", gap: 12 }}><div className="animate-spin" style={{ width: 24, height: 24, border: "3px solid #E8927C", borderTopColor: "transparent", borderRadius: "50%" }} /><p style={{ fontSize: 15, color: "#E8927C", fontWeight: 600, margin: 0 }}>{scanStage}</p></div></div>)}
  </div>);

  const isPostScan = mode === "scan";
  const ib = (f: any) => isPostScan && f ? "rgba(156,232,124,0.06)" : "rgba(255,255,255,0.04)";
  const ibr = (f: any) => isPostScan && f ? "2px solid rgba(156,232,124,0.25)" : "2px solid rgba(255,255,255,0.08)";
  return (<div className="animate-fadeUp" style={{ padding: "20px 20px 100px" }}>
    <button onClick={resetForm} style={{ background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>← Back</button>
    {isPostScan && receiptPreview && (<div style={{ marginBottom: 20 }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><span style={{ fontSize: 20 }}>✅</span><p style={{ fontSize: 15, fontWeight: 700, color: "#9CE87C", margin: 0 }}>AI extracted the data below</p></div><img src={receiptPreview} alt="Receipt" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 14, border: "2px solid rgba(156,232,124,0.3)", opacity: 0.8 }} /></div>)}
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 20px", fontFamily: "'DM Serif Display', Georgia, serif" }}>{isPostScan ? "Review & Save" : "Enter Details"}</h2>
    <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Category</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>{categories.map((cat) => (<button key={cat.id} onClick={() => setCategoryId(cat.id)} style={{ background: categoryId === cat.id ? `${cat.color}20` : "rgba(255,255,255,0.03)", border: categoryId === cat.id ? `2px solid ${cat.color}` : "2px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}><span style={{ fontSize: 20 }}>{cat.icon}</span><span style={{ fontSize: 12, color: categoryId === cat.id ? "#F5F0EB" : "#888", fontWeight: 600 }}>{cat.name}</span></button>))}</div>
    <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Amount (Rp)</p>
    <input type="text" inputMode="numeric" placeholder="e.g. 450000" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: ib(amount), border: ibr(amount), borderRadius: 14, padding: "16px", fontSize: 24, fontWeight: 700, color: "#F5F0EB", outline: "none" }} />
    <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "20px 0 10px" }}>Note</p>
    <input type="text" placeholder="What was this for?" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: ib(note), border: ibr(note), borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "#F5F0EB", outline: "none" }} />
    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
      <div style={{ flex: 1 }}><p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Date</p><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: ib(date), border: ibr(date), borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "#F5F0EB", outline: "none", colorScheme: "dark" }} /></div>
      <div style={{ flex: 1 }}><p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Receipt</p>
        {isPostScan ? (<div style={{ padding: "14px 16px", background: "rgba(156,232,124,0.1)", border: "2px solid rgba(156,232,124,0.3)", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "#9CE87C", textAlign: "center" }}>🧾 Attached</div>) : (<label style={{ display: "block", padding: "14px 16px", background: hasReceipt ? "rgba(232,146,124,0.15)" : "rgba(255,255,255,0.04)", border: hasReceipt ? "2px solid #E8927C" : "2px solid rgba(255,255,255,0.08)", borderRadius: 14, fontSize: 14, textAlign: "center" as const, color: hasReceipt ? "#E8927C" : "#666", cursor: "pointer", fontWeight: 600 }}><input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) { setHasReceipt(true); setReceiptFile(e.target.files[0]); const r = new FileReader(); r.onload = (ev) => setReceiptPreview(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />{hasReceipt ? "🧾 Attached" : "📷 Add Photo"}</label>)}
      </div>
    </div>
    <button onClick={handleSave} disabled={!amount || !categoryId || saving} style={{ width: "100%", marginTop: 28, padding: "18px", background: amount && categoryId && !saving ? "linear-gradient(135deg, #E8927C, #E8D47C)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: amount && categoryId ? "#16161A" : "#555", cursor: amount && categoryId && !saving ? "pointer" : "default", transition: "all 0.3s" }}>{saving ? "Saving..." : "Save Expense"}</button>
  </div>);
}

function Report({ expenses, categories, onReimbursed }: { expenses: Expense[]; categories: Category[]; onReimbursed: () => void }) {
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [generated, setGenerated] = useState(false); const [confirmOpen, setConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false); const [done, setDone] = useState(false);
  const filtered = expenses.filter((e) => e.date >= dateFrom && e.date <= dateTo);
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const byCat: Record<string, { cat: Category; items: Expense[]; total: number }> = {};
  filtered.forEach((e) => { const cat = categories.find((c) => c.id === e.category_id); if (!cat) return; if (!byCat[cat.id]) byCat[cat.id] = { cat, items: [], total: 0 }; byCat[cat.id].items.push(e); byCat[cat.id].total += e.amount; });
  const handleMark = async () => { setMarking(true); try { const bd = Object.fromEntries(Object.entries(byCat).map(([k, v]) => [v.cat.name, v.total])); await markAsReimbursed(filtered.map(e => e.id), dateFrom, dateTo, total, bd); setDone(true); setTimeout(() => onReimbursed(), 2000); } catch (e) { alert("Failed. Try again."); } setMarking(false); };
  if (done) return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 16, padding: "0 20px" }}><div className="animate-pop" style={{ fontSize: 64 }}>💰</div><p style={{ fontSize: 22, fontWeight: 800, color: "#9CE87C", fontFamily: "'DM Serif Display', Georgia, serif" }}>Reimbursed!</p><p style={{ fontSize: 16, fontWeight: 700, color: "#F5F0EB" }}>{formatRp(total)}</p><p style={{ fontSize: 14, color: "#888" }}>Saved to cloud ☁️</p></div>);
  return (<div style={{ padding: "20px 20px 100px" }}>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 24px", fontFamily: "'DM Serif Display', Georgia, serif" }}>Reimbursement Report</h2>
    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}><div style={{ flex: 1 }}><p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 8px" }}>From</p><input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setGenerated(false); }} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#F5F0EB", outline: "none", colorScheme: "dark" }} /></div><div style={{ flex: 1 }}><p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 8px" }}>To</p><input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setGenerated(false); }} style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#F5F0EB", outline: "none", colorScheme: "dark" }} /></div></div>
    <button onClick={() => setGenerated(true)} style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #7C9CE8, #9CE87C)", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, color: "#16161A", cursor: "pointer", marginBottom: 24 }}>{generated ? "🔄 Regenerate" : "📋 Generate Report"}</button>
    {generated && filtered.length === 0 && (<div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}><span style={{ fontSize: 48 }}>📭</span><p style={{ fontSize: 15, margin: "12px 0 0" }}>No expenses in this range</p></div>)}
    {generated && filtered.length > 0 && (<div className="animate-fadeUp">
      <div style={{ background: "linear-gradient(145deg, rgba(232,146,124,0.12), rgba(232,212,124,0.08))", borderRadius: 20, padding: 24, marginBottom: 24, border: "1px solid rgba(232,146,124,0.2)" }}><p style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: 0 }}>Total Reimbursement</p><p style={{ fontSize: 34, fontWeight: 800, color: "#F5F0EB", margin: "6px 0", fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(total)}</p><p style={{ fontSize: 13, color: "#888", margin: 0 }}>{filtered.length} expenses • {formatDate(dateFrom)} – {formatDate(dateTo)}</p></div>
      {Object.values(byCat).sort((a, b) => b.total - a.total).map(({ cat, items, total: ct }) => (<div key={cat.id} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 16, marginBottom: 12, border: "1px solid rgba(255,255,255,0.04)" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontSize: 15, fontWeight: 700, color: "#ddd" }}>{cat.icon} {cat.name}</span><span style={{ fontSize: 15, fontWeight: 800, color: cat.color }}>{formatRp(ct)}</span></div>{items.map(exp => (<div key={exp.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: 13 }}><div><span style={{ color: "#aaa" }}>{exp.note}</span><span style={{ color: "#555", marginLeft: 8 }}>{formatDate(exp.date)}</span></div><span style={{ color: "#ccc", fontWeight: 600 }}>{formatRp(exp.amount)}</span></div>))}</div>))}
      {!confirmOpen ? (<button onClick={() => setConfirmOpen(true)} style={{ width: "100%", marginTop: 20, padding: "18px", background: "linear-gradient(135deg, #9CE87C, #7CE8D4)", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#16161A", cursor: "pointer" }}>✅ Mark All as Reimbursed</button>) : (
        <div className="animate-fadeUp" style={{ marginTop: 20, padding: 24, borderRadius: 20, background: "rgba(156,232,124,0.08)", border: "2px solid rgba(156,232,124,0.3)" }}><p style={{ fontSize: 16, fontWeight: 700, color: "#F5F0EB", margin: "0 0 8px" }}>Confirm Reimbursement</p><p style={{ fontSize: 14, color: "#aaa", margin: "0 0 20px" }}>Mark <strong style={{ color: "#9CE87C" }}>{filtered.length} expenses</strong> totaling <strong style={{ color: "#9CE87C" }}>{formatRp(total)}</strong> as reimbursed?</p><div style={{ display: "flex", gap: 12 }}><button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#888", cursor: "pointer" }}>Cancel</button><button onClick={handleMark} disabled={marking} style={{ flex: 1, padding: "14px", background: marking ? "rgba(156,232,124,0.2)" : "linear-gradient(135deg, #9CE87C, #7CE8D4)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#16161A", cursor: marking ? "default" : "pointer" }}>{marking ? "Processing..." : "Yes, Reimburse"}</button></div></div>)}
    </div>)}
  </div>);
}

function History({ reports, categories, onViewReceipt }: { reports: (ReimbursementReport & { items: Expense[] })[]; categories: Category[]; onViewReceipt: (e: Expense) => void }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [periodFilter, setPeriodFilter] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const years = [...new Set(reports.map(r => new Date(r.created_at).getFullYear()))]; if (years.length === 0) years.push(new Date().getFullYear());
  const getKey = (r: ReimbursementReport) => { const d = new Date(r.created_at); if (periodFilter === "monthly") return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; if (periodFilter === "quarterly") return `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}`; if (periodFilter === "yearly") return `${d.getFullYear()}`; return "all"; };
  const fmtLabel = (k: string) => { if (periodFilter === "all") return "All Time"; if (periodFilter === "yearly") return k; if (periodFilter === "quarterly") { const [y,q] = k.split("-"); return `${q} ${y}`; } const [y,m] = k.split("-"); const ms = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${ms[parseInt(m)-1]} ${y}`; };
  const fr = periodFilter === "all" ? reports : reports.filter(r => new Date(r.created_at).getFullYear() === selectedYear);
  const groups: Record<string, { reports: typeof reports; total: number; count: number }> = {};
  fr.forEach(r => { const k = getKey(r); if (!groups[k]) groups[k] = { reports: [], total: 0, count: 0 }; groups[k].reports.push(r); groups[k].total += r.total_amount; groups[k].count += r.expense_count; });
  const sk = Object.keys(groups).sort((a,b) => b.localeCompare(a));
  return (<div style={{ padding: "20px 20px 100px" }}>
    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 8px", fontFamily: "'DM Serif Display', Georgia, serif" }}>📁 History</h2><p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>Past reimbursements</p>
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{["monthly","quarterly","yearly","all"].map(t => (<button key={t} onClick={() => setPeriodFilter(t)} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: periodFilter === t ? "linear-gradient(135deg, #E8927C, #E8D47C)" : "rgba(255,255,255,0.05)", color: periodFilter === t ? "#16161A" : "#888" }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>))}</div>
    {periodFilter !== "all" && (<div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{years.sort((a,b) => b-a).map(y => (<button key={y} onClick={() => setSelectedYear(y)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: selectedYear === y ? "2px solid #E8927C" : "2px solid rgba(255,255,255,0.08)", background: selectedYear === y ? "rgba(232,146,124,0.1)" : "transparent", color: selectedYear === y ? "#E8927C" : "#666", cursor: "pointer" }}>{y}</button>))}</div>)}
    {reports.length === 0 ? (<div style={{ textAlign: "center", padding: "60px 20px", color: "#555" }}><span style={{ fontSize: 48 }}>📭</span><p style={{ fontSize: 15, margin: "12px 0 0" }}>No history yet</p></div>) : sk.length === 0 ? (<div style={{ textAlign: "center", padding: "40px 20px", color: "#555" }}><span style={{ fontSize: 40 }}>📭</span><p style={{ fontSize: 14, margin: "12px 0 0" }}>No reimbursements in {selectedYear}</p></div>) : (
      sk.map(gk => { const g = groups[gk]; return (<div key={gk} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}><div><p style={{ fontSize: 17, fontWeight: 800, color: "#F5F0EB", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{fmtLabel(gk)}</p><p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>{g.reports.length} reimbursement{g.reports.length !== 1 ? "s" : ""}</p></div><p style={{ fontSize: 20, fontWeight: 800, color: "#9CE87C", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(g.total)}</p></div>
        {g.reports.map((rpt) => { const gi = reports.indexOf(rpt); const exp = expandedIdx === gi; const ic: Record<string, { cat: Category; items: Expense[] }> = {}; (rpt.items||[]).forEach(e => { const c = categories.find(cc => cc.id === e.category_id); if (!c) return; if (!ic[c.id]) ic[c.id] = { cat: c, items: [] }; ic[c.id].items.push(e); });
          return (<div key={gi} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, marginBottom: 10, border: exp ? "1px solid rgba(156,232,124,0.2)" : "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div><p style={{ fontSize: 14, fontWeight: 700, color: "#ddd", margin: 0 }}>{formatDate(rpt.date_from)} – {formatDate(rpt.date_to)}</p><p style={{ fontSize: 11, color: "#666", margin: "2px 0 0" }}>{rpt.expense_count} expenses</p></div><p style={{ fontSize: 16, fontWeight: 800, color: "#9CE87C", margin: 0 }}>{formatRp(rpt.total_amount)}</p></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(156,232,124,0.1)", color: "#9CE87C", fontWeight: 700 }}>✅ Reimbursed</span><button onClick={() => setExpandedIdx(exp ? null : gi)} style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 11, fontWeight: 700, background: exp ? "rgba(232,146,124,0.15)" : "rgba(255,255,255,0.06)", border: exp ? "1px solid rgba(232,146,124,0.3)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: exp ? "#E8927C" : "#aaa", cursor: "pointer" }}>{exp ? "Hide ▲" : "Details ▼"}</button></div></div>
            {exp && (<div className="animate-fadeUp" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0 16px 16px" }}>{Object.values(ic).map(({ cat, items }) => (<div key={cat.id} style={{ marginTop: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: "#ddd" }}>{cat.icon} {cat.name}</span><span style={{ fontSize: 13, fontWeight: 800, color: cat.color }}>{formatRp(items.reduce((s,e)=>s+e.amount,0))}</span></div>{items.map(e => (<div key={e.id} onClick={() => onViewReceipt(e)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 12, color: "#bbb", margin: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.note}</p><p style={{ fontSize: 10, color: "#555", margin: "2px 0 0" }}>{formatDate(e.date)}{e.has_receipt && <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "rgba(232,212,124,0.1)", color: "#E8D47C", fontSize: 9, fontWeight: 600 }}>🧾</span>}</p></div><span style={{ fontSize: 13, fontWeight: 700, color: "#ccc", flexShrink: 0 }}>{formatRp(e.amount)}</span><span style={{ fontSize: 14, color: "#555" }}>›</span></div>))}</div>))}</div>)}
          </div>); })}
      </div>); })
    )}
  </div>);
}

function ReceiptModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  if (!expense) return null; const img = expense.receipt_url;
  return (<div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 390, background: "#1E1E24", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ width: "100%", minHeight: 240, maxHeight: 400, background: img ? "#000" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{img ? <img src={img} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: 400 }} /> : <div style={{ textAlign: "center", padding: 40 }}><span style={{ fontSize: 56, opacity: 0.3 }}>🧾</span><p style={{ fontSize: 14, color: "#555", margin: "12px 0 0" }}>No receipt image</p></div>}</div>
      <div style={{ padding: "20px 24px" }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${expense.category_color || "#888"}18` }}>{expense.category_icon || "📝"}</div><div><p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{expense.category_name || "Expense"}</p><p style={{ fontSize: 22, fontWeight: 800, color: "#E8927C", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(expense.amount)}</p></div></div><div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, color: "#666" }}>Note</span><span style={{ fontSize: 13, color: "#ccc", fontWeight: 600, textAlign: "right", maxWidth: "65%" }}>{expense.note}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, color: "#666" }}>Date</span><span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>{formatDate(expense.date)}</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "#666" }}>Receipt</span><span style={{ fontSize: 13, color: img ? "#9CE87C" : "#E8927C", fontWeight: 600 }}>{img ? "✅ Archived" : "❌ No image"}</span></div></div></div>
      <button onClick={onClose} style={{ width: "100%", padding: "16px", background: "rgba(255,255,255,0.05)", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 14, fontWeight: 700, color: "#888", cursor: "pointer" }}>Close</button>
    </div>
  </div>);
}

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<(ReimbursementReport & { items: Expense[] })[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);
  const [loaded, setLoaded] = useState(false); const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try { const [cats, exps, reps] = await Promise.all([getCategories(), getExpenses("pending"), getReports()]); setCategories(cats); setExpenses(exps); setReports(reps); setLoaded(true); }
    catch (e: any) { console.error("Load failed:", e); setError("Could not connect to database."); setLoaded(true); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const handleSaved = () => { setPage("dashboard"); loadData(); };
  const handleReimbursed = () => { setPage("dashboard"); loadData(); };

  if (!loaded) return (<div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}><div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid #E8927C", borderTopColor: "transparent", borderRadius: "50%" }} /><p style={{ color: "#888", fontSize: 14 }}>Loading...</p></div>);
  if (error) return (<div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#16161A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}><span style={{ fontSize: 48 }}>⚠️</span><p style={{ color: "#E8927C", fontSize: 16, fontWeight: 700, textAlign: "center" }}>{error}</p><button onClick={() => { setError(null); setLoaded(false); loadData(); }} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #E8927C, #E8D47C)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#16161A", cursor: "pointer" }}>Retry</button></div>);

  return (<div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#16161A", color: "#F5F0EB", position: "relative" }}>
    <div style={{ padding: "max(16px, env(safe-area-inset-top)) 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#F5F0EB", fontFamily: "'DM Serif Display', Georgia, serif" }}>💅 ReimburseMe</h1>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg, #E8927C, #E8D47C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#16161A" }}>GF</div>
    </div>
    {page === "dashboard" && <Dashboard expenses={expenses} categories={categories} onViewReceipt={setViewingReceipt} />}
    {page === "add" && <AddExpenseView categories={categories} onSaved={handleSaved} />}
    {page === "report" && <Report expenses={expenses} categories={categories} onReimbursed={handleReimbursed} />}
    {page === "history" && <History reports={reports} categories={categories} onViewReceipt={setViewingReceipt} />}
    <BottomNav active={page} onNav={setPage} pendingCount={expenses.length} />
    {viewingReceipt && <ReceiptModal expense={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
  </div>);
}
