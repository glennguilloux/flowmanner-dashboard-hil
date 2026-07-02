import { NextResponse } from "next/server";
import { getBriefingData } from "@/lib/briefing";

export const dynamic = "force-dynamic";

// Data-only endpoint for the briefing. Returns structured state so the
// client (browser) can call OpenRouter directly with the BYOK key. No
// server-side LLM call — keeps the data path server-bound (DB access) but
// moves the model call to the browser.
export async function GET() {
  try {
    const data = await getBriefingData();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
