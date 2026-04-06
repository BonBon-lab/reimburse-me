"use client";

let Tesseract: any = null;
async function loadTesseract() {
  if (!Tesseract) {
    const mod = await import("tesseract.js");
    Tesseract = mod.default || mod;
  }
  return Tesseract;
}
export interface OCRResult {
  amount: number;
  date: string;
  note: string;
  category: string;
  confidence: number;
  rawText: string;
}

// ─── Amount Extraction ───
// Looks for Indonesian Rupiah patterns in receipt text
function extractAmount(text: string): number {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Step 1: Look for "Total" / "Grand Total" / "TOTAL" line — most reliable
  const totalPatterns = [
    /(?:grand\s*total|total\s*(?:bayar|belanja|harga|pembayaran|keseluruhan)|total|jumlah|subtotal|sub\s*total)/i,
  ];

  for (const pattern of totalPatterns) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (pattern.test(lines[i])) {
        const amount = parseAmountFromLine(lines[i]);
        if (amount > 0) return amount;
        // Check next line too (amount might be on line below "Total")
        if (i + 1 < lines.length) {
          const nextAmount = parseAmountFromLine(lines[i + 1]);
          if (nextAmount > 0) return nextAmount;
        }
      }
    }
  }

  // Step 2: Look for Rp/IDR prefix patterns anywhere
  const rpPattern = /(?:Rp\.?|IDR)\s*([0-9][0-9.,]*[0-9])/gi;
  const amounts: number[] = [];
  let match;
  while ((match = rpPattern.exec(text)) !== null) {
    const parsed = parseNumberString(match[1]);
    if (parsed >= 1000) amounts.push(parsed); // ignore tiny amounts
  }
  if (amounts.length > 0) {
    // Return the largest amount (likely the total)
    return Math.max(...amounts);
  }

  // Step 3: Look for any large number (likely IDR amount)
  const numberPattern = /([0-9]{1,3}(?:[.,][0-9]{3})+)/g;
  const bigNumbers: number[] = [];
  while ((match = numberPattern.exec(text)) !== null) {
    const parsed = parseNumberString(match[1]);
    if (parsed >= 10000) bigNumbers.push(parsed);
  }
  if (bigNumbers.length > 0) {
    return Math.max(...bigNumbers);
  }

  // Step 4: Look for plain large numbers
  const plainNumbers = text.match(/\b([0-9]{5,})\b/g);
  if (plainNumbers) {
    const nums = plainNumbers.map(Number).filter((n) => n >= 10000);
    if (nums.length > 0) return Math.max(...nums);
  }

  return 0;
}

function parseAmountFromLine(line: string): number {
  // Try Rp/IDR prefix first
  const rpMatch = line.match(/(?:Rp\.?|IDR)\s*([0-9][0-9.,]*[0-9])/i);
  if (rpMatch) return parseNumberString(rpMatch[1]);

  // Try formatted number with dots/commas
  const numMatch = line.match(/([0-9]{1,3}(?:[.,][0-9]{3})+)/);
  if (numMatch) return parseNumberString(numMatch[1]);

  // Try plain large number
  const plainMatch = line.match(/\b([0-9]{5,})\b/);
  if (plainMatch) return parseInt(plainMatch[1]);

  return 0;
}

function parseNumberString(s: string): number {
  // "1.200.000" or "1,200,000" → 1200000
  const cleaned = s.replace(/[.,]/g, "");
  return parseInt(cleaned) || 0;
}

// ─── Date Extraction ───
function extractDate(text: string): string {
  const today = new Date().toISOString().slice(0, 10);

  // DD/MM/YYYY or DD-MM-YYYY
  const dateMatch1 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateMatch1) {
    const [, d, m, y] = dateMatch1;
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  // YYYY-MM-DD
  const dateMatch2 = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (dateMatch2) {
    const [, y, m, d] = dateMatch2;
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  // Indonesian date: "5 April 2026" or "5 Apr 2026"
  const indoMonths: Record<string, string> = {
    januari: "01", februari: "02", maret: "03", april: "04",
    mei: "05", juni: "06", juli: "07", agustus: "08",
    september: "09", oktober: "10", november: "11", desember: "12",
    jan: "01", feb: "02", mar: "03", apr: "04",
    may: "05", jun: "06", jul: "07", aug: "08", agu: "08",
    sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12",
  };
  const indoPattern = /(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|may|jun|jul|aug|agu|sep|okt|oct|nov|des|dec)\s+(\d{4})/i;
  const indoMatch = text.match(indoPattern);
  if (indoMatch) {
    const [, d, m, y] = indoMatch;
    const month = indoMonths[m.toLowerCase()];
    if (month) return `${y}-${month}-${d.padStart(2, "0")}`;
  }

  return today;
}

// ─── Category Guessing ───
function guessCategory(text: string): string {
  const lower = text.toLowerCase();

  const keywords: Record<string, string[]> = {
    samples: ["sample", "sampel", "prototype", "proto", "pattern", "pola"],
    convection: ["konveksi", "convection", "jahit", "sewing", "produksi", "production", "garment", "bordir", "sablon"],
    material: ["kain", "fabric", "bahan", "katun", "cotton", "linen", "polyester", "benang", "thread", "resleting", "zipper", "kancing", "button", "tanah abang", "tekstil"],
    photoshoot: ["foto", "photo", "studio", "model", "photographer", "shoot", "makeup", "lokasi"],
    shipping: ["jne", "j&t", "sicepat", "anteraja", "pos indonesia", "gosend", "grab", "kirim", "ongkir", "shipping", "courier", "kurir", "ekspedisi"],
    marketing: ["ads", "iklan", "instagram", "ig", "facebook", "fb", "tiktok", "promote", "promosi", "endorse", "influencer", "campaign"],
  };

  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (lower.includes(word)) return category;
    }
  }

  return "other";
}

// ─── Note Extraction ───
function extractNote(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);

  // First non-empty line is often the store/vendor name
  if (lines.length > 0) {
    // Skip lines that look like addresses or phone numbers
    for (const line of lines.slice(0, 5)) {
      if (/^[A-Z]/.test(line) && line.length > 3 && line.length < 50) {
        // Skip if it's mostly numbers (phone, address)
        const alphaRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
        if (alphaRatio > 0.4) {
          return line.slice(0, 60);
        }
      }
    }
    return lines[0].slice(0, 60);
  }

  return "Scanned receipt";
}

// ─── Main OCR Function ───
export async function scanReceiptLocal(
  imageFile: File,
  onProgress?: (stage: string) => void
): Promise<OCRResult> {
  onProgress?.("Loading OCR engine...");

  const T = await loadTesseract();
  const result = await T.recognize(imageFile, "ind+eng", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const pct = Math.round((m.progress || 0) * 100);
        onProgress?.(`Reading receipt... ${pct}%`);
      }
    },
  });

  const rawText = result.data.text;
  const confidence = result.data.confidence / 100;

  onProgress?.("Extracting data...");

  const amount = extractAmount(rawText);
  const date = extractDate(rawText);
  const category = guessCategory(rawText);
  const note = extractNote(rawText);

  return {
    amount,
    date,
    note,
    category,
    confidence,
    rawText,
  };
}
