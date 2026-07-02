"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { messages } from "@/db/schema";
import { Send } from "lucide-react";

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
  const [content, setContent] = useState("");
  const [items, setItems] = useState<Message[]>(messages);
  const [submitting, setSubmitting] = useState(false);

  const endpoint =
    parentType === "strategy"
      ? `/api/strategies/${parentId}/messages`
      : `/api/tactics/${parentId}/messages`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);

    const optimistic: Message = {
      id: "temp",
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
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      setContent("");
      // In a real app we would refresh from server; here we keep the optimistic row.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-500">No messages yet.</p>
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
                  : "rounded-tl-none bg-slate-100 text-slate-800",
              ].join(" ")}
            >
              <p className="text-xs font-medium opacity-80">
                {msg.authorName} ·{" "}
                {formatDistanceToNow(new Date(msg.createdAt), {
                  addSuffix: true,
                })}
              </p>
              <p className="mt-1">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message agents..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
