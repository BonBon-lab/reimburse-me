import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
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

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type || "image/jpeg";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `You are a receipt/invoice data extractor for a small fashion clothing brand in Indonesia. Extract data and return ONLY valid JSON with no markdown or backticks:

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
- Note should include vendor name if visible`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content
      ?.filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("") || "";

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
