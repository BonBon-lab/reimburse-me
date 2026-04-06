"use client";

import { useState, useEffect, useCallback } from "react";
import { scanReceiptLocal } from "@/lib/ocr";
import {
  Expense,
  ArchivedReport,
  loadExpenses,
  saveExpenses,
  loadReports,
  saveReports,
  saveReceiptImage,
  loadReceiptImage,
  hydrateReceipts,
} from "@/lib/store";

// ─── Constants ───
const CATEGORIES = [
  { id: "samples", label: "Samples", icon: "✂️", color: "#E8927C" },
  { id: "convection", label: "Convection Fee", icon: "🧵", color: "#7C9CE8" },
  { id: "material", label: "Material / Fabric", icon: "🧶", color: "#9CE87C" },
  { id: "photoshoot", label: "Photo Shoot", icon: "📸", color: "#E8D47C" },
  { id: "shipping", label: "Shipping", icon: "📦", color: "#C47CE8" },
  { id: "marketing", label: "Marketing", icon: "📱", color: "#7CE8D4" },
  { id: "other", label: "Other", icon: "📝", color: "#E87CA0" },
];

function formatRp(a: number) {
  return "Rp " + a.toLocaleString("id-ID");
}
function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function getCat(id: string) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[6];
}

// ─── Bottom Nav ───
function BottomNav({
  active,
  onNav,
  pendingCount,
}: {
  active: string;
  onNav: (p: string) => void;
  pendingCount: number;
}) {
  const items = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "add", icon: "➕", label: "Add" },
    { id: "report", icon: "📋", label: "Report" },
    { id: "history", icon: "📁", label: "History" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        background: "rgba(22,22,26,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 max(20px, env(safe-area-inset-bottom))",
        zIndex: 100,
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNav(item.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            opacity: active === item.id ? 1 : 0.4,
            transition: "all 0.2s",
            transform: active === item.id ? "scale(1.1)" : "scale(1)",
          }}
        >
          <span
            style={{
              fontSize: item.id === "add" ? 28 : 22,
              background:
                item.id === "add"
                  ? "linear-gradient(135deg, #E8927C, #E8D47C)"
                  : "none",
              borderRadius: item.id === "add" ? 14 : 0,
              padding: item.id === "add" ? "4px 18px" : 0,
            }}
          >
            {item.icon}
          </span>
          {item.id === "dashboard" && pendingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: 2,
                background: "#E8927C",
                color: "#16161A",
                fontSize: 10,
                fontWeight: 800,
                borderRadius: 10,
                padding: "1px 6px",
                minWidth: 16,
                textAlign: "center",
              }}
            >
              {pendingCount}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: active === item.id ? "#E8927C" : "#888",
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard ───
function Dashboard({
  expenses,
  onViewReceipt,
}: {
  expenses: Expense[];
  onViewReceipt: (e: Expense) => void;
}) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat: Record<string, number> = {};
  expenses.forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  });
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div style={{ padding: "20px 0 24px" }}>
        <p style={{ fontSize: 13, color: "#888", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
          Pending Reimbursement
        </p>
        <h1
          style={{
            fontSize: 36, fontWeight: 800, margin: "4px 0 0",
            color: expenses.length > 0 ? "#E8927C" : "#9CE87C",
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}
        >
          {formatRp(total)}
        </h1>
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
          {expenses.length > 0
            ? `${expenses.length} unreimbursed expense${expenses.length !== 1 ? "s" : ""}`
            : "All caught up! No pending expenses 🎉"}
        </p>
      </div>

      {expenses.length === 0 && (
        <div
          style={{
            textAlign: "center", padding: "60px 20px",
            background: "rgba(156,232,124,0.05)", borderRadius: 20,
            border: "1px solid rgba(156,232,124,0.15)",
          }}
        >
          <span style={{ fontSize: 64 }}>✨</span>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#9CE87C", margin: "16px 0 8px" }}>
            All Clear!
          </p>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.5 }}>
            No pending expenses. Tap ➕ to log when you make a purchase.
          </p>
        </div>
      )}

      {sortedCats.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 18, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 14px" }}>Breakdown</p>
          {sortedCats.map(([catId, amt]) => {
            const cat = getCat(catId);
            const pct = total > 0 ? (amt / total) * 100 : 0;
            return (
              <div key={catId} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#ccc" }}>{cat.icon} {cat.label}</span>
                  <span style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>{formatRp(amt)}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 2, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expenses.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 12px" }}>Pending Expenses</p>
          {expenses.map((exp) => {
            const cat = getCat(exp.category);
            return (
              <div key={exp.id} onClick={() => onViewReceipt(exp)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${cat.color}18`, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: "#ddd", margin: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.note}</p>
                  <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>{formatDate(exp.date)} {exp.hasReceipt ? "• 🧾" : ""}</p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#E8927C", margin: 0, flexShrink: 0 }}>{formatRp(exp.amount)}</p>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Add Expense ───
function AddExpense({
  onAdd,
  onNav,
}: {
  onAdd: (e: Expense) => void;
  onNav: (p: string) => void;
}) {
  const [mode, setMode] = useState<null | "scan" | "manual">(null);
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState("");
  const [saved, setSaved] = useState(false);

  const resetForm = () => {
    setMode(null); setCategory(null); setAmount(""); setNote("");
    setDate(new Date().toISOString().slice(0, 10)); setHasReceipt(false);
    setReceiptPreview(null); setScanning(false); setScanStage("");
  };

  const handleSave = () => {
    if (!category || !amount) return;
    onAdd({
      id: Date.now(), category,
      amount: parseInt(String(amount).replace(/\D/g, "")) || 0,
      date, note: note || getCat(category).label,
      hasReceipt, receiptImage: receiptPreview || null,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); resetForm(); onNav("dashboard"); }, 1200);
  };

  const handleScan = async (file: File) => {
    setScanning(true);
    setScanStage("Preparing...");
    setHasReceipt(true);

    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      // Try server-side AI first (if API key is configured)
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await fetch("/api/expenses/scan", { method: "POST", body: formData });

      if (res.ok) {
        const parsed = await res.json();
        if (!parsed.error) {
          await new Promise((r) => setTimeout(r, 300));
          setAmount(String(parsed.amount || ""));
          setDate(parsed.date || new Date().toISOString().slice(0, 10));
          setNote(parsed.note || "");
          setCategory(parsed.category || "other");
          setScanStage("done");
          setScanning(false);
          return;
        }
      }
    } catch {
      // API not available — fall through to local OCR
    }

    // Local OCR (no API key needed — runs on device)
    try {
      const result = await scanReceiptLocal(file, (stage) => {
        setScanStage(stage);
      });

      setAmount(String(result.amount || ""));
      setDate(result.date || new Date().toISOString().slice(0, 10));
      setNote(result.note || "");
      setCategory(result.category || "other");
      setScanStage("done");
      setScanning(false);
    } catch {
      setScanStage("Could not read receipt. Please fill in manually.");
      setScanning(false);
      setMode("manual");
    }
  };

  if (saved) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 16 }}>
        <div className="animate-pop" style={{ fontSize: 64 }}>✅</div>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>Expense Logged!</p>
        <p style={{ fontSize: 14, color: "#888" }}>That took seconds, not hours 😉</p>
      </div>
    );
  }

  if (mode === null) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 8px", fontFamily: "'DM Serif Display', Georgia, serif" }}>Log Expense</h2>
        <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px" }}>How would you like to add it?</p>
        <button onClick={() => setMode("scan")} style={{ width: "100%", padding: "28px 24px", marginBottom: 14, background: "linear-gradient(145deg, rgba(232,146,124,0.15), rgba(232,212,124,0.08))", border: "2px solid rgba(232,146,124,0.3)", borderRadius: 20, cursor: "pointer", textAlign: "left" as const }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 40 }}>📷</span>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#F5F0EB", margin: 0 }}>Scan Receipt</p>
              <p style={{ fontSize: 13, color: "#999", margin: "4px 0 0" }}>AI auto-fills everything from photo</p>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: "6px 12px", background: "rgba(232,146,124,0.2)", borderRadius: 8, display: "inline-block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#E8927C", letterSpacing: 0.5 }}>✨ RECOMMENDED</span>
          </div>
        </button>
        <button onClick={() => setMode("manual")} style={{ width: "100%", padding: "24px", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.06)", borderRadius: 20, cursor: "pointer", textAlign: "left" as const }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 36 }}>✏️</span>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#F5F0EB", margin: 0 }}>Enter Manually</p>
              <p style={{ fontSize: 13, color: "#999", margin: "4px 0 0" }}>Type in the details yourself</p>
            </div>
          </div>
        </button>
      </div>
    );
  }

  if (mode === "scan" && !category) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <button onClick={resetForm} style={{ background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 24px", fontFamily: "'DM Serif Display', Georgia, serif" }}>📷 Scan Receipt</h2>
        {!scanning && !receiptPreview && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, borderRadius: 20, cursor: "pointer", border: "3px dashed rgba(232,146,124,0.4)", background: "rgba(232,146,124,0.05)" }}>
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleScan(e.target.files[0]); }} />
            <span style={{ fontSize: 56, marginBottom: 12 }}>📸</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#E8927C", margin: "0 0 6px" }}>Tap to take photo</p>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>or select from gallery</p>
          </label>
        )}
        {scanning && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 40 }}>
            {receiptPreview && <img src={receiptPreview} alt="Receipt" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 16, objectFit: "cover", border: "2px solid rgba(232,146,124,0.3)" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="animate-spin" style={{ width: 24, height: 24, border: "3px solid #E8927C", borderTopColor: "transparent", borderRadius: "50%" }} />
              <p style={{ fontSize: 15, color: "#E8927C", fontWeight: 600, margin: 0 }}>{scanStage}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isPostScan = mode === "scan";
  const inputBg = (filled: any) => isPostScan && filled ? "rgba(156,232,124,0.06)" : "rgba(255,255,255,0.04)";
  const inputBorder = (filled: any) => isPostScan && filled ? "2px solid rgba(156,232,124,0.25)" : "2px solid rgba(255,255,255,0.08)";

  return (
    <div className="animate-fadeUp" style={{ padding: "20px 20px 100px" }}>
      <button onClick={resetForm} style={{ background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer", padding: "0 0 16px", fontWeight: 600 }}>← Back</button>
      {isPostScan && receiptPreview && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><span style={{ fontSize: 20 }}>✅</span><p style={{ fontSize: 15, fontWeight: 700, color: "#9CE87C", margin: 0 }}>AI extracted the data below</p></div>
          <img src={receiptPreview} alt="Receipt" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 14, border: "2px solid rgba(156,232,124,0.3)", opacity: 0.8 }} />
        </div>
      )}
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 20px", fontFamily: "'DM Serif Display', Georgia, serif" }}>{isPostScan ? "Review & Save" : "Enter Details"}</h2>

      <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Category</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ background: category === cat.id ? `${cat.color}20` : "rgba(255,255,255,0.03)", border: category === cat.id ? `2px solid ${cat.color}` : "2px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
            <span style={{ fontSize: 20 }}>{cat.icon}</span>
            <span style={{ fontSize: 12, color: category === cat.id ? "#F5F0EB" : "#888", fontWeight: 600 }}>{cat.label}</span>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Amount (Rp)</p>
      <input type="text" inputMode="numeric" placeholder="e.g. 450000" value={amount} onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: inputBg(amount), border: inputBorder(amount), borderRadius: 14, padding: "16px", fontSize: 24, fontWeight: 700, color: "#F5F0EB", outline: "none" }} />

      <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "20px 0 10px" }}>Note</p>
      <input type="text" placeholder="What was this for?" value={note} onChange={(e) => setNote(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: inputBg(note), border: inputBorder(note), borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "#F5F0EB", outline: "none" }} />

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Date</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: inputBg(date), border: inputBorder(date), borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "#F5F0EB", outline: "none", colorScheme: "dark" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 10px" }}>Receipt</p>
          {isPostScan ? (
            <div style={{ padding: "14px 16px", background: "rgba(156,232,124,0.1)", border: "2px solid rgba(156,232,124,0.3)", borderRadius: 14, fontSize: 14, fontWeight: 600, color: "#9CE87C", textAlign: "center" }}>🧾 Attached</div>
          ) : (
            <label style={{ display: "block", padding: "14px 16px", background: hasReceipt ? "rgba(232,146,124,0.15)" : "rgba(255,255,255,0.04)", border: hasReceipt ? "2px solid #E8927C" : "2px solid rgba(255,255,255,0.08)", borderRadius: 14, fontSize: 14, textAlign: "center" as const, color: hasReceipt ? "#E8927C" : "#666", cursor: "pointer", fontWeight: 600 }}>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) { setHasReceipt(true); const r = new FileReader(); r.onload = (ev) => setReceiptPreview(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} />
              {hasReceipt ? "🧾 Attached" : "📷 Add Photo"}
            </label>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={!amount || !category}
        style={{ width: "100%", marginTop: 28, padding: "18px", background: amount && category ? "linear-gradient(135deg, #E8927C, #E8D47C)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: amount && category ? "#16161A" : "#555", cursor: amount && category ? "pointer" : "default", transition: "all 0.3s", letterSpacing: 0.5 }}>
        Save Expense
      </button>
    </div>
  );
}

// ─── Report ───
function Report({
  expenses,
  onReimburse,
}: {
  expenses: Expense[];
  onReimburse: (ids: number[], data: any) => void;
}) {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [generated, setGenerated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [done, setDone] = useState(false);

  const filtered = expenses.filter((e) => e.date >= dateFrom && e.date <= dateTo);
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const byCat: Record<string, { items: Expense[]; total: number }> = {};
  filtered.forEach((e) => {
    if (!byCat[e.category]) byCat[e.category] = { items: [], total: 0 };
    byCat[e.category].items.push(e);
    byCat[e.category].total += e.amount;
  });

  const handleMarkReimbursed = () => {
    setMarking(true);
    setTimeout(() => {
      onReimburse(
        filtered.map((e) => e.id),
        { dateFrom, dateTo, total, count: filtered.length, breakdown: { ...byCat } }
      );
      setMarking(false);
      setDone(true);
    }, 1500);
  };

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 16, padding: "0 20px" }}>
        <div className="animate-pop" style={{ fontSize: 64 }}>💰</div>
        <p style={{ fontSize: 22, fontWeight: 800, color: "#9CE87C", fontFamily: "'DM Serif Display', Georgia, serif" }}>Reimbursed!</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#F5F0EB" }}>{formatRp(total)}</p>
        <p style={{ fontSize: 14, color: "#888", textAlign: "center", lineHeight: 1.5 }}>
          {filtered.length} expenses archived. Dashboard cleared.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 24px", fontFamily: "'DM Serif Display', Georgia, serif" }}>Reimbursement Report</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 8px" }}>From</p>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setGenerated(false); }}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#F5F0EB", outline: "none", colorScheme: "dark" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: "0 0 8px" }}>To</p>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setGenerated(false); }}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#F5F0EB", outline: "none", colorScheme: "dark" }} />
        </div>
      </div>
      <button onClick={() => setGenerated(true)}
        style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #7C9CE8, #9CE87C)", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, color: "#16161A", cursor: "pointer", letterSpacing: 0.5, marginBottom: 24 }}>
        {generated ? "🔄 Regenerate" : "📋 Generate Report"}
      </button>

      {generated && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
          <span style={{ fontSize: 48 }}>📭</span>
          <p style={{ fontSize: 15, margin: "12px 0 0" }}>No expenses in this date range</p>
        </div>
      )}

      {generated && filtered.length > 0 && (
        <div className="animate-fadeUp">
          <div style={{ background: "linear-gradient(145deg, rgba(232,146,124,0.12), rgba(232,212,124,0.08))", borderRadius: 20, padding: 24, marginBottom: 24, border: "1px solid rgba(232,146,124,0.2)" }}>
            <p style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, margin: 0 }}>Total Reimbursement</p>
            <p style={{ fontSize: 34, fontWeight: 800, color: "#F5F0EB", margin: "6px 0", fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(total)}</p>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>{filtered.length} expenses • {formatDate(dateFrom)} – {formatDate(dateTo)}</p>
          </div>

          {Object.entries(byCat).sort((a, b) => b[1].total - a[1].total).map(([catId, data]) => {
            const cat = getCat(catId);
            return (
              <div key={catId} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 16, marginBottom: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#ddd" }}>{cat.icon} {cat.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: cat.color }}>{formatRp(data.total)}</span>
                </div>
                {data.items.map((exp) => (
                  <div key={exp.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: 13 }}>
                    <div><span style={{ color: "#aaa" }}>{exp.note}</span><span style={{ color: "#555", marginLeft: 8 }}>{formatDate(exp.date)}</span></div>
                    <span style={{ color: "#ccc", fontWeight: 600 }}>{formatRp(exp.amount)}</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={{ flex: 1, padding: "16px", background: "rgba(232,146,124,0.12)", border: "2px solid rgba(232,146,124,0.3)", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#E8927C", cursor: "pointer" }}>📤 Share via WA</button>
            <button style={{ flex: 1, padding: "16px", background: "rgba(124,156,232,0.12)", border: "2px solid rgba(124,156,232,0.3)", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#7C9CE8", cursor: "pointer" }}>📥 Export PDF</button>
          </div>

          {!confirmOpen ? (
            <button onClick={() => setConfirmOpen(true)}
              style={{ width: "100%", marginTop: 20, padding: "18px", background: "linear-gradient(135deg, #9CE87C, #7CE8D4)", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#16161A", cursor: "pointer", letterSpacing: 0.5 }}>
              ✅ Mark All as Reimbursed
            </button>
          ) : (
            <div className="animate-fadeUp" style={{ marginTop: 20, padding: 24, borderRadius: 20, background: "rgba(156,232,124,0.08)", border: "2px solid rgba(156,232,124,0.3)" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#F5F0EB", margin: "0 0 8px" }}>Confirm Reimbursement</p>
              <p style={{ fontSize: 14, color: "#aaa", margin: "0 0 20px", lineHeight: 1.5 }}>
                Mark <strong style={{ color: "#9CE87C" }}>{filtered.length} expenses</strong> totaling <strong style={{ color: "#9CE87C" }}>{formatRp(total)}</strong> as reimbursed?
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#888", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleMarkReimbursed} disabled={marking}
                  style={{ flex: 1, padding: "14px", background: marking ? "rgba(156,232,124,0.2)" : "linear-gradient(135deg, #9CE87C, #7CE8D4)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#16161A", cursor: marking ? "default" : "pointer" }}>
                  {marking ? "Processing..." : "Yes, Reimburse"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History ───
function History({
  archivedReports,
  onViewReceipt,
}: {
  archivedReports: ArchivedReport[];
  onViewReceipt: (e: Expense) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [periodFilter, setPeriodFilter] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = [...new Set(archivedReports.map((r) => new Date(r.reimbursedAt + "T00:00:00").getFullYear()))];
  if (years.length === 0) years.push(new Date().getFullYear());

  const getGroupKey = (report: ArchivedReport) => {
    const d = new Date(report.reimbursedAt + "T00:00:00");
    if (periodFilter === "monthly") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (periodFilter === "quarterly") return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    if (periodFilter === "yearly") return `${d.getFullYear()}`;
    return "all";
  };

  const formatGroupLabel = (key: string) => {
    if (periodFilter === "all") return "All Time";
    if (periodFilter === "yearly") return key;
    if (periodFilter === "quarterly") { const [y, q] = key.split("-"); return `${q} ${y}`; }
    const [y, m] = key.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  const filteredReports = periodFilter === "all" ? archivedReports : archivedReports.filter((r) => new Date(r.reimbursedAt + "T00:00:00").getFullYear() === selectedYear);

  const groups: Record<string, { reports: (ArchivedReport & { globalIdx: number })[]; total: number; count: number }> = {};
  filteredReports.forEach((report) => {
    const key = getGroupKey(report);
    if (!groups[key]) groups[key] = { reports: [], total: 0, count: 0 };
    groups[key].reports.push({ ...report, globalIdx: archivedReports.indexOf(report) });
    groups[key].total += report.total;
    groups[key].count += report.count;
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F5F0EB", margin: "0 0 8px", fontFamily: "'DM Serif Display', Georgia, serif" }}>📁 Reimbursement History</h2>
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>Browse past reimbursements by period</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["monthly", "quarterly", "yearly", "all"].map((tab) => (
          <button key={tab} onClick={() => setPeriodFilter(tab)}
            style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: periodFilter === tab ? "linear-gradient(135deg, #E8927C, #E8D47C)" : "rgba(255,255,255,0.05)", color: periodFilter === tab ? "#16161A" : "#888" }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {periodFilter !== "all" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {years.sort((a, b) => b - a).map((year) => (
            <button key={year} onClick={() => setSelectedYear(year)}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: selectedYear === year ? "2px solid #E8927C" : "2px solid rgba(255,255,255,0.08)", background: selectedYear === year ? "rgba(232,146,124,0.1)" : "transparent", color: selectedYear === year ? "#E8927C" : "#666", cursor: "pointer" }}>
              {year}
            </button>
          ))}
        </div>
      )}

      {archivedReports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#555" }}>
          <span style={{ fontSize: 48 }}>📭</span>
          <p style={{ fontSize: 15, margin: "12px 0 0" }}>No reimbursement history yet</p>
        </div>
      ) : sortedKeys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#555" }}>
          <span style={{ fontSize: 40 }}>📭</span>
          <p style={{ fontSize: 14, margin: "12px 0 0" }}>No reimbursements in {selectedYear}</p>
        </div>
      ) : (
        sortedKeys.map((groupKey) => {
          const group = groups[groupKey];
          return (
            <div key={groupKey} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: "#F5F0EB", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatGroupLabel(groupKey)}</p>
                  <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>{group.reports.length} reimbursement{group.reports.length !== 1 ? "s" : ""} • {group.count} expenses</p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#9CE87C", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(group.total)}</p>
              </div>

              {group.reports.map((report) => {
                const isExpanded = expandedIdx === report.globalIdx;
                const itemsByCat: Record<string, Expense[]> = {};
                (report.items || []).forEach((e) => { if (!itemsByCat[e.category]) itemsByCat[e.category] = []; itemsByCat[e.category].push(e); });

                return (
                  <div key={report.globalIdx} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, marginBottom: 10, border: isExpanded ? "1px solid rgba(156,232,124,0.2)" : "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#ddd", margin: 0 }}>{formatDate(report.dateFrom)} – {formatDate(report.dateTo)}</p>
                          <p style={{ fontSize: 11, color: "#666", margin: "2px 0 0" }}>{report.count} expenses</p>
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "#9CE87C", margin: 0 }}>{formatRp(report.total)}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {report.categories.map((cat, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${getCat(cat.id).color}15`, color: getCat(cat.id).color, fontWeight: 600 }}>
                            {getCat(cat.id).icon} {formatRp(cat.total)}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(156,232,124,0.1)", color: "#9CE87C", fontWeight: 700 }}>✅ Reimbursed</span>
                        <button onClick={() => setExpandedIdx(isExpanded ? null : report.globalIdx)}
                          style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 11, fontWeight: 700, background: isExpanded ? "rgba(232,146,124,0.15)" : "rgba(255,255,255,0.06)", border: isExpanded ? "1px solid rgba(232,146,124,0.3)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: isExpanded ? "#E8927C" : "#aaa", cursor: "pointer" }}>
                          {isExpanded ? "Hide ▲" : "Details ▼"}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="animate-fadeUp" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0 16px 16px" }}>
                        {Object.entries(itemsByCat).sort((a, b) => b[1].reduce((s, e) => s + e.amount, 0) - a[1].reduce((s, e) => s + e.amount, 0)).map(([catId, items]) => {
                          const cat = getCat(catId);
                          return (
                            <div key={catId} style={{ marginTop: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#ddd" }}>{cat.icon} {cat.label}</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: cat.color }}>{formatRp(items.reduce((s, e) => s + e.amount, 0))}</span>
                              </div>
                              {items.map((exp) => (
                                <div key={exp.id} onClick={() => onViewReceipt(exp)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, color: "#bbb", margin: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.note}</p>
                                    <p style={{ fontSize: 10, color: "#555", margin: "2px 0 0" }}>
                                      {formatDate(exp.date)}
                                      {exp.hasReceipt && <span style={{ marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "rgba(232,212,124,0.1)", color: "#E8D47C", fontSize: 9, fontWeight: 600 }}>🧾 View</span>}
                                    </p>
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ccc", flexShrink: 0 }}>{formatRp(exp.amount)}</span>
                                  <span style={{ fontSize: 14, color: "#555", flexShrink: 0 }}>›</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Receipt Modal ───
function ReceiptModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  if (!expense) return null;
  const cat = getCat(expense.category);
  const img = expense.receiptImage && expense.receiptImage !== "__stored__" ? expense.receiptImage : loadReceiptImage(expense.id);

  return (
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 390, background: "#1E1E24", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: "100%", minHeight: 240, maxHeight: 400, background: img ? "#000" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {img ? (
            <img src={img} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: 400 }} />
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <span style={{ fontSize: 56, opacity: 0.3 }}>🧾</span>
              <p style={{ fontSize: 14, color: "#555", margin: "12px 0 0" }}>No receipt image</p>
            </div>
          )}
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${cat.color}18` }}>{cat.icon}</div>
            <div>
              <p style={{ fontSize: 11, color: "#888", margin: 0, textTransform: "uppercase", fontWeight: 600 }}>{cat.label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#E8927C", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>{formatRp(expense.amount)}</p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Note</span>
              <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600, textAlign: "right", maxWidth: "65%" }}>{expense.note}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Date</span>
              <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>{formatDate(expense.date)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#666" }}>Receipt</span>
              <span style={{ fontSize: 13, color: img ? "#9CE87C" : "#E8927C", fontWeight: 600 }}>{img ? "✅ Archived" : "❌ No image"}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "16px", background: "rgba(255,255,255,0.05)", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 14, fontWeight: 700, color: "#888", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [archivedReports, setArchivedReports] = useState<ArchivedReport[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedExpenses = hydrateReceipts(loadExpenses());
    const storedReports = loadReports();
    // Hydrate report items too
    storedReports.forEach((r) => {
      r.items = hydrateReceipts(r.items || []);
    });
    setExpenses(storedExpenses);
    setArchivedReports(storedReports);
    setLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    saveExpenses(expenses);
    // Save receipt images separately
    expenses.forEach((e) => {
      if (e.receiptImage && e.receiptImage !== "__stored__") {
        saveReceiptImage(e.id, e.receiptImage);
      }
    });
  }, [expenses, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveReports(archivedReports);
    // Save archived receipt images
    archivedReports.forEach((r) => {
      (r.items || []).forEach((e) => {
        if (e.receiptImage && e.receiptImage !== "__stored__") {
          saveReceiptImage(e.id, e.receiptImage);
        }
      });
    });
  }, [archivedReports, loaded]);

  const addExpense = useCallback((exp: Expense) => {
    setExpenses((prev) => [exp, ...prev]);
  }, []);

  const handleReimburse = useCallback((ids: number[], reportData: any) => {
    const catSummary = Object.entries(reportData.breakdown).map(([catId, data]: [string, any]) => ({
      id: catId,
      total: data.total,
    }));
    const archivedItems = expenses.filter((e) => ids.includes(e.id));
    setArchivedReports((prev) => [
      {
        dateFrom: reportData.dateFrom,
        dateTo: reportData.dateTo,
        total: reportData.total,
        count: reportData.count,
        categories: catSummary,
        items: archivedItems,
        reimbursedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setExpenses((prev) => prev.filter((e) => !ids.includes(e.id)));
  }, [expenses]);

  if (!loaded) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#16161A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid #E8927C", borderTopColor: "transparent", borderRadius: "50%" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#16161A", color: "#F5F0EB", position: "relative" }}>
      {/* Top Bar */}
      <div style={{ padding: "max(16px, env(safe-area-inset-top)) 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#F5F0EB", fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: 0.5 }}>💅 ReimburseMe</h1>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg, #E8927C, #E8D47C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#16161A" }}>GF</div>
      </div>

      {page === "dashboard" && <Dashboard expenses={expenses} onViewReceipt={setViewingReceipt} />}
      {page === "add" && <AddExpense onAdd={addExpense} onNav={setPage} />}
      {page === "report" && <Report expenses={expenses} onReimburse={handleReimburse} />}
      {page === "history" && <History archivedReports={archivedReports} onViewReceipt={setViewingReceipt} />}

      <BottomNav active={page} onNav={setPage} pendingCount={expenses.length} />
      {viewingReceipt && <ReceiptModal expense={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
    </div>
  );
}
