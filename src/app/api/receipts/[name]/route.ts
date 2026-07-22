import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { RECEIPTS_DIR } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
};

// Serve a stored receipt image from data/receipts/.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const safeName = path.basename(name); // blocks path traversal
  const filePath = path.join(RECEIPTS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = safeName.split(".").pop()?.toLowerCase() || "jpg";
  const body = fs.readFileSync(filePath);
  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
