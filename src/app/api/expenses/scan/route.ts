import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const EXTRACTION_PROMPT = `You are a receipt/invoice data extractor for a small fashion clothing brand in Indonesia. Extract data and return ONLY valid JSON with no markdown or backticks:

{"amount":<integer in IDR>,"date":"<YYYY-MM-DD>","note":"<description max 60 chars>","category":"<category>","confidence":<0.0-1.0>}

Categories:
- samples: sample garments, prototypes
- convection: production/sewing/manufacturing fees (konveksi)
- material: fabric, thread, buttons, zippers, raw materials
- photoshoot: photography, model fees, studio rental
- shipping: delivery, courier, logistics
- marketing: ads, social media, promotion
- other: packaging, equipment, misc

Rules:
- Amount must be integer IDR (no decimals)
- If foreign currency, convert to approximate IDR
- Date format YYYY-MM-DD, use today if not visible
- Note should include vendor name if visible`;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("receipt") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = (file.type ||
      "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      // Simple extraction task — skip adaptive thinking for lower latency
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({
      amount: parsed.amount || 0,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      note: parsed.note || "Unknown expense",
      category: parsed.category || "other",
      confidence: parsed.confidence || 0.5,
    });
  } catch (error) {
    console.error("Receipt scan error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}
