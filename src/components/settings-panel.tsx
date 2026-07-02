"use client";

import { useState, useEffect } from "react";
import { X, Key, Cpu, Check, Trash2, Loader2 } from "lucide-react";
import {
  DEFAULT_OR_MODEL,
  OR_MODEL_PLACEHOLDER,
  getOrKey,
  getOrModel,
  setOrKey,
  setOrModel,
  orTestKey,
} from "@/lib/openrouter";

type Props = {
  open: boolean;
  onClose: () => void;
  onChange: () => void; // called when key or model changes, so the briefing re-renders
};

export function SettingsPanel({ open, onClose, onChange }: Props) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(DEFAULT_OR_MODEL);
  const [keyVisible, setKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  // Sync state from localStorage when the panel opens.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setKey(getOrKey());
      setModel(getOrModel() || OR_MODEL_PLACEHOLDER);
      setTestResult(null);
      setTestOk(null);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSave() {
    setOrKey(key);
    setOrModel(model);
    onChange();
    onClose();
  }

  function handleClear() {
    setKey("");
    setOrKey("");
    setOrModel("");
    onChange();
  }

  async function handleTest() {
    if (!key) {
      setTestResult("Enter a key first");
      setTestOk(false);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestOk(null);
    const res = await orTestKey(key);
    setTesting(false);
    if (res.ok) {
      setTestOk(true);
      setTestResult(`OK · ${res.count} models available · e.g. ${res.sample?.join(", ")}`);
    } else {
      setTestOk(false);
      setTestResult(res.error ?? "Test failed");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Status banner */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-800 p-3 text-sm">
            {getOrKey() ? (
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-4 w-4" />
                OpenRouter key set · Model: <code className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs">{getOrModel()}</code>
              </div>
            ) : (
              <div className="text-slate-600 dark:text-slate-400">
                <strong>Homelab LLM (default).</strong> Set a key to switch to OpenRouter
                for the executive briefing.
              </div>
            )}
          </div>

          {/* API key */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Key className="h-3 w-3" />
              OpenRouter API Key
            </label>
            <div className="flex gap-2">
              <input
                type={keyVisible ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="flex-1 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setKeyVisible((v) => !v)}
                className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3 text-xs text-slate-600 hover:bg-slate-50"
              >
                {keyVisible ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Stored in your browser&apos;s localStorage. Never sent to our server.
            </p>
          </div>

          {/* Model — freeform text input. Paste any OpenRouter model id from
              https://openrouter.ai/models. Suggestions are kept as a datalist
              for convenience but you can type anything. */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Cpu className="h-3 w-3" />
              Model ID
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={OR_MODEL_PLACEHOLDER}
              list="or-model-suggestions"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500"
              autoComplete="off"
              spellCheck={false}
            />
            <datalist id="or-model-suggestions">
              <option value="qwen/qwen-2.5-7b-instruct" />
              <option value="meta-llama/llama-3.1-8b-instruct" />
              <option value="google/gemini-flash-1.5" />
              <option value="anthropic/claude-3-haiku" />
              <option value="openai/gpt-4o-mini" />
              <option value="z-ai/glm-5.2" />
            </datalist>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Any model id from <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">openrouter.ai/models</a>. Suggestions: qwen, llama, gemini, claude, gpt-4o.
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={[
                "rounded-xl border p-3 text-sm",
                testOk
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700",
              ].join(" ")}
            >
              {testResult}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 p-4">
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear key
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !key}
              className="rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test key"
              )}
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
