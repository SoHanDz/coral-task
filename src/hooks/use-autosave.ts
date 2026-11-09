"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced save. Only the latest scheduled value is written; `flush` writes a
 * pending value immediately (used before the caller switches context), and a
 * pending value is also flushed on unmount so the last keystrokes are not lost.
 */
export function useAutosave<T>(
  save: (value: T) => Promise<void>,
  delayMs = 800,
): {
  schedule: (value: T) => void;
  flush: () => void;
  status: AutosaveStatus;
  error: string | null;
} {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    saveRef.current = save;
  });

  const run = useCallback(async (value: T) => {
    if (alive.current) setStatus("saving");
    try {
      await saveRef.current(value);
      if (alive.current) {
        setError(null);
        setStatus("saved");
      }
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra, thử lại nhé.");
        setStatus("error");
      }
    }
  }, []);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) void run(next.value);
  }, [run]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      const next = pending.current;
      pending.current = null;
      if (next) void saveRef.current(next.value).catch(() => {});
    };
  }, []);

  return { schedule, flush, status, error };
}
