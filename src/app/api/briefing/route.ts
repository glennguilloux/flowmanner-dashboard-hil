import { NextResponse } from "next/server";
import { chat, LLM_MODEL } from "@/lib/llm";
import { logLlmUsage } from "@/lib/usage";
import {
  getBriefingData,
} from "@/lib/briefing";
import {
  formatBriefingPrompt,
  BRIEFING_SYSTEM_PROMPT,
} from "@/lib/briefing-format";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // LLM thinking takes time

// Server-side homelab LLM briefing. `briefing.ts` produces the structured
// data, `briefing-format.ts` (browser-safe) produces the prompt from it.
export async function POST() {
  try {
    const data = await getBriefingData();
    const prompt = formatBriefingPrompt(data);

    const { content, usage } = await chat(
      [
        { role: "system", content: BRIEFING_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { maxTokens: 8192, temperature: 0.2 },
    );

    // Log LLM usage (fire-and-forget)
    logLlmUsage({
      model: LLM_MODEL,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      source: "briefing",
    });

    return NextResponse.json({
      ok: true,
      provider: "homelab",
      model: process.env.LLM_MODEL ?? "Qwen3.6-27B-Q5_K_M-mtp.gguf",
      briefing: content || "(LLM returned empty response)",
      tokens: usage,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        provider: "homelab",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
