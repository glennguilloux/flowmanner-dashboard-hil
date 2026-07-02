"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, AlertTriangle, Settings, Cpu } from "lucide-react";
import {
  getOrKey,
  getOrModel,
  orChat,
} from "@/lib/openrouter";
import {
  formatBriefingPrompt,
  BRIEFING_SYSTEM_PROMPT,
} from "@/lib/briefing-format";
import type { BriefingData } from "@/lib/briefing-types";
import { SettingsPanel } from "@/components/settings-panel";
import { apiFetch } from "@/lib/apiFetch";

type Mode = "homelab" | "openrouter";

type Tokens = { prompt: number; completion: number; total: number };

type BriefingResponse = {
  ok: boolean;
  briefing: string | null;
  provider?: Mode;
  model?: string;
  tokens?: Tokens;
  error?: string;
  generatedAt?: string;
};

export function ExecutiveBriefing() {
  const [mode, setMode] = useState<Mode>("homelab");
  const [orModel, setOrModelState] = useState("");
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    provider?: Mode;
    model?: string;
    tokens?: Tokens;
    generatedAt?: string;
  }>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  function refreshMode() {
    const hasKey = !!getOrKey();
    setMode(hasKey ? "openrouter" : "homelab");
    setOrModelState(getOrModel());
  }

  // Initialize mode from localStorage on mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshMode();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      if (mode === "openrouter") {
        // Browser → OpenRouter directly with BYOK key.
        const dataRes = await apiFetch("/api/briefing/data", { cache: "no-store" });
        const dataJson = (await dataRes.json()) as {
          ok: boolean;
          data?: BriefingData;
          error?: string;
        };
        if (!dataJson.ok || !dataJson.data) {
          throw new Error(dataJson.error ?? "Failed to fetch briefing data");
        }
        const prompt = formatBriefingPrompt(dataJson.data);
        const res = await orChat(
          [
            { role: "system", content: BRIEFING_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          { maxTokens: 2048, temperature: 0.3 },
        );
        if (!res.ok || !res.content) {
          throw new Error(res.error ?? "OpenRouter returned no content");
        }
        setBriefing(res.content);
        setMeta({
          provider: "openrouter",
          model: res.model ?? getOrModel(),
          tokens: res.tokens,
          generatedAt: new Date().toISOString(),
        });
      } else {
        // Server-side homelab LLM.
        const res = await apiFetch("/api/briefing", { method: "POST" });
        const data = (await res.json()) as BriefingResponse;
        if (!data.ok || !data.briefing) {
          throw new Error(data.error ?? "Homelab LLM returned no briefing");
        }
        setBriefing(data.briefing);
        setMeta({
          provider: "homelab",
          model: data.model,
          tokens: data.tokens,
          generatedAt: data.generatedAt,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Briefing failed");
    } finally {
      setLoading(false);
    }
  }

  const providerLabel =
    mode === "openrouter"
      ? `OpenRouter · ${orModel.split("/").pop() ?? orModel}`
      : "Homelab · Qwen3-27B";

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Executive Briefing
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Cpu className="h-3 w-3" />
              {providerLabel} · browser→model direct, no server proxy
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            title="AI Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">AI</span>
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {briefing ? "Regenerate" : "Generate Briefing"}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {briefing && (
        <div className="mt-3 space-y-3">
          <div className="whitespace-pre-line rounded-xl border border-indigo-100 bg-white dark:bg-slate-900 p-4 text-sm leading-relaxed text-slate-700">
            {briefing}
          </div>
          {meta.generatedAt && (
            <p className="text-xs text-slate-400">
              Generated at {new Date(meta.generatedAt).toLocaleTimeString()}
              {" · "}
              <span className="text-slate-500 dark:text-slate-400">{meta.model}</span>
              {meta.tokens && ` · ${meta.tokens.total} tokens`}
            </p>
          )}
        </div>
      )}

      {!briefing && !loading && !error && (
        <p className="rounded-xl border border-dashed border-indigo-200 p-4 text-sm text-slate-500 dark:text-slate-400">
          Click <strong>Generate Briefing</strong> to synthesize a decision brief
          from live PR, CI, mission, and inbox data via {providerLabel}.
        </p>
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChange={refreshMode}
      />
    </div>
  );
}
