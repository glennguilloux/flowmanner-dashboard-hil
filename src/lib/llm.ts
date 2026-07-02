// Homelab llama.cpp client. OpenAI-compatible endpoint at :11434.
// HARD RULE: this is the only LLM this app talks to. No SaaS, no fallback.

const LLM_URL = process.env.LLM_URL ?? "http://localhost:11434";
const LLM_MODEL =
  process.env.LLM_MODEL ?? "Qwen3.6-27B-Q5_K_M-mtp.gguf";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatResponse = {
  choices: Array<{
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// The model (Qwen3) uses extended thinking — it writes to reasoning_content
// first, then emits the final answer in content. We need a generous max_tokens
// budget so the thinking can finish and the actual answer gets emitted.
const THINKING_BUDGET = 4096;

export async function chat(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<{ content: string; usage: ChatResponse["usage"] }> {
  const maxTokens = opts?.maxTokens ?? THINKING_BUDGET;
  const temperature = opts?.temperature ?? 0.3;

  const res = await fetch(`${LLM_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as ChatResponse;
  const choice = data.choices[0];
  if (!choice) throw new Error("LLM returned no choices");

  return {
    content: choice.message.content || "",
    usage: data.usage,
  };
}

export type { ChatMessage };
