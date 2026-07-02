"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Shared polling hook for dashboard panels. Fetches data from an API route
 * on mount and every `intervalS` seconds thereafter. Returns the latest
 * data, a loading flag, a countdown for the next refresh, and a manual
 * refresh function.
 *
 * Usage:
 *   const { data, loading, secondsLeft, refresh } = usePolling<HealthData>("/api/system-health");
 */
/* eslint-disable react-hooks/set-state-in-effect */
export function usePolling<T>(url: string, opts?: { intervalS?: number }) {
  const intervalS = opts?.intervalS ?? 30;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(intervalS);
  const secondsRef = useRef(intervalS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) {
        const d = (await res.json()) as T;
        setData(d);
      }
    } catch {
      // Keep previous data on fetch failure
    } finally {
      setLoading(false);
      secondsRef.current = intervalS;
      setSecondsLeft(intervalS);
    }
  }, [url, intervalS]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      secondsRef.current -= 1;
      if (secondsRef.current <= 0) {
        fetchData();
      } else {
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, secondsLeft, refresh: fetchData };
}
/* eslint-enable react-hooks/set-state-in-effect */
