"use client";

import { useState } from "react";
import { Save, X, Plus, Trash2 } from "lucide-react";

export type AgentBase = {
  id: string;
  name: string;
  role: string;
  model: string | null;
  avatarUrl: string | null;
  instructions: string | null;
  capabilities: string[];
  status: string;
  icon: string | null;
  description: string | null;
};

type Props = {
  agent?: AgentBase;
  onSave: (agent: AgentBase) => void;
  onCancel: () => void;
};

export function AgentEditor({ agent, onSave, onCancel }: Props) {
  const [name, setName] = useState(agent?.name ?? "");
  const [role, setRole] = useState(agent?.role ?? "");
  const [model, setModel] = useState(agent?.model ?? "");
  const [avatarUrl, setAvatarUrl] = useState(agent?.avatarUrl ?? "");
  const [instructions, setInstructions] = useState(agent?.instructions ?? "");
  const [capabilities, setCapabilities] = useState<string[]>(
    agent?.capabilities ?? [],
  );
  const [status, setStatus] = useState(agent?.status ?? "active");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [newCapability, setNewCapability] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const url = agent ? `/api/agents/${agent.id}` : "/api/agents";
      const method = agent ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          model: model.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          instructions: instructions.trim() || null,
          capabilities,
          status,
          description: description.trim() || null,
        }),
      });

      const data = (await res.json()) as { ok: boolean; data?: AgentBase; error?: string };
      if (data.ok && data.data) {
        onSave(data.data);
      } else {
        setError(data.error ?? "Failed to save agent");
      }
    } catch {
      setError("Network error — could not save agent");
    } finally {
      setSaving(false);
    }
  }

  function addCapability() {
    const cap = newCapability.trim();
    if (cap && !capabilities.includes(cap)) {
      setCapabilities((prev) => [...prev, cap]);
      setNewCapability("");
    }
  }

  function removeCapability(cap: string) {
    setCapabilities((prev) => prev.filter((c) => c !== cap));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
            placeholder="e.g. Scout"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Role *
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
            placeholder="e.g. research_scout"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
            placeholder="e.g. llama.cpp:qwen3-27b"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Avatar (emoji)
          </label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
            placeholder="e.g. 🤖"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
          placeholder="What does this agent handle?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Instructions (system prompt)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
          placeholder="Full system prompt in markdown..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Capabilities
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={newCapability}
            onChange={(e) => setNewCapability(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCapability();
              }
            }}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
            placeholder="e.g. web_search, code_review"
          />
          <button
            type="button"
            onClick={addCapability}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        {capabilities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                {cap}
                <button
                  type="button"
                  onClick={() => removeCapability(cap)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!name.trim() || !role.trim() || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : agent ? "Update Agent" : "Create Agent"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
