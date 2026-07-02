// Browser-side OpenRouter client. Called only when the operator has set
// a BYOK key in localStorage. Server never sees the key.
//
// Matches your byok-openrouter.html pattern: key in localStorage, call goes
// browser → OpenRouter, no proxy.

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export const OR_KEY_STORAGE = "or_api_key";
export const OR_MODEL_STORAGE = "or_model";

// Sensible default if the user hasn't set one. Any OpenRouter model id works —
// paste whatever you want from https://openrouter.ai/models.
export const DEFAULT_OR_MODEL = "qwen/qwen-2.5-7b-instruct";

export const OR_MODEL_PLACEHOLDER = "qwen/qwen-2.5-7b-instruct";

export type OrMessage = { role: "system" | "user" | "assistant"; content: string };

export function getOrKey(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(OR_KEY_STORAGE) ?? "").trim();
}

export function getOrModel(): string {
  if (typeof window === "undefined") return DEFAULT_OR_MODEL;
  return (localStorage.getItem(OR_MODEL_STORAGE) ?? DEFAULT_OR_MODEL).trim();
}

export function setOrKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(OR_KEY_STORAGE, key);
  else localStorage.removeItem(OR_KEY_STORAGE);
}

export function setOrModel(model: string) {
  if (typeof window === "undefined") return;
  if (model) localStorage.setItem(OR_MODEL_STORAGE, model);
}

export type OrChatResponse = {
  ok: boolean;
  content?: string;
  model?: string;
  tokens?: { prompt: number; completion: number; total: number };
  error?: string;
};

export async function orChat(
  messages: OrMessage[],
  opts?: { model?: string; maxTokens?: number; temperature?: number },
): Promise<OrChatResponse> {
  const key = getOrKey();
  if (!key) return { ok: false, error: "No OpenRouter key set" };

  const model = opts?.model ?? getOrModel();
  const maxTokens = opts?.maxTokens ?? 4096;
  const temperature = opts?.temperature ?? 0.3;

  try {
    const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://flowmanner.dev",
        "X-Title": "FlowManner HIL",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `OpenRouter ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const choice = data.choices[0];
    if (!choice) return { ok: false, error: "OpenRouter returned no choices" };

    return {
      ok: true,
      content: choice.message.content,
      model: data.model,
      tokens: data.usage
        ? {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens,
          }
        : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Test the key by listing available models. Returns the count + first 3 names.
export async function orTestKey(
  key: string,
): Promise<{ ok: boolean; count?: number; sample?: string[]; error?: string }> {
  if (!key) return { ok: false, error: "No key" };
  try {
    const res = await fetch(`${OPENROUTER_URL}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `OpenRouter ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { data: Array<{ id: string }> };
    return {
      ok: true,
      count: data.data.length,
      sample: data.data.slice(0, 3).map((m) => m.id),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
