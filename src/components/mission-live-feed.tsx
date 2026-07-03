"use client";

import { useEffect, useState, useRef } from "react";
import { Radio, Loader2, WifiOff } from "lucide-react";

type MissionEvent = {
  type: string;
  data?: Record<string, unknown>;
  message?: string;
};

type Props = {
  missionId: string;
};

type ConnectionState = "connecting" | "live" | "disconnected" | "error";

export function MissionLiveFeed({ missionId }: Props) {
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/missions/${missionId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setConnectionState("live");

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as MissionEvent;
        setEvents((prev) => [...prev.slice(-49), parsed]); // keep last 50
        if (parsed.type === "error") {
          setConnectionState("error");
          es.close();
        }
      } catch {
        // ignore unparseable events
      }
    };

    es.onerror = () => {
      setConnectionState("disconnected");
      // EventSource auto-reconnects, so we don't close it here
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [missionId]);

  const statusColor: Record<ConnectionState, string> = {
    connecting: "text-amber-500",
    live: "text-emerald-500",
    disconnected: "text-slate-400",
    error: "text-rose-500",
  };

  const StatusIcon =
    connectionState === "live"
      ? Radio
      : connectionState === "connecting"
        ? Loader2
        : WifiOff;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-4">
      <div className="mb-3 flex items-center gap-2">
        <StatusIcon
          className={`h-4 w-4 ${statusColor[connectionState]} ${
            connectionState === "connecting" ? "animate-spin" : ""
          }`}
        />
        <span
          className={`text-xs font-medium capitalize ${statusColor[connectionState]}`}
        >
          {connectionState === "live"
            ? "Live"
            : connectionState === "connecting"
              ? "Connecting..."
              : connectionState === "error"
                ? "FM unreachable"
                : "Disconnected"}
        </span>
        <span className="ml-auto text-xs text-slate-400">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Waiting for events...
        </p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
          {events.map((evt, i) => (
            <div
              key={i}
              className={[
                "rounded px-2 py-1",
                evt.type === "error"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
              ].join(" ")}
            >
              <span className="text-slate-400">[{evt.type}]</span> {" "}
              {evt.message ??
                (evt.data ? JSON.stringify(evt.data).slice(0, 120) : "—")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
