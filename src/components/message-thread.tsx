"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { messages } from "@/db/schema";
import { Send } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type Message = typeof messages.$inferSelect;

export function MessageThread({
  parentType,
  parentId,
  messages,
  currentUser,
}: {
  parentType: "strategy" | "tactic";
  parentId: string;
  messages: Message[];
  currentUser: { id: string; name: string };
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [items, setItems] = useState<Message[]>(messages);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    parentType === "strategy"
      ? `/api/strategies/${parentId}/messages`
      : `/api/tactics/${parentId}/messages`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      parentType,
      parentId,
      authorType: "human",
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: content.trim(),
      createdAt: new Date(),
    };
    setItems((prev) => [...prev, optimistic]);

    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setItems((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</p>
        )}
        {items.map((msg) => (
          <div
            key={msg.id}
            className={[
              "flex gap-3",
              msg.authorType === "human" ? "flex-row-reverse" : "",
            ].join(" ")}
          >
            <div
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                msg.authorType === "human"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-emerald-100 text-emerald-700",
              ].join(" ")}
            >
              {msg.authorType === "human" ? "👤" : "🤖"}
            </div>
            <div
              className={[
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                msg.authorType === "human"
                  ? "rounded-tr-none bg-indigo-600 text-white"
                  : "rounded-tl-none bg-slate-100 dark:bg-slate-800 text-slate-800",
              ].join(" ")}
            >
              <p className="text-xs font-medium opacity-80">
                {msg.authorName} ·{" "}
                <time
                  dateTime={new Date(msg.createdAt).toISOString()}
                  title={new Date(msg.createdAt).toLocaleString()}
                >
                  {formatDistanceToNow(new Date(msg.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              </p>
              <p className="mt-1">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-rose-700">Send failed: {error}</p>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message agents..."
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="inline-flex h-10 items-center gap-1 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Send
        </button>
      </form>
    </div>
  );
}