"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { getHabitQuotes } from "@/app/actions/habitQuotes";
import type { HabitQuote } from "@/lib/habits/types";

interface QuotesContextValue {
  quotes: HabitQuote[];
  refreshQuotes: () => void;
}

// Outside the provider (e.g. the login page) there are simply no quotes.
const QuotesContext = createContext<QuotesContextValue>({ quotes: [], refreshQuotes: () => {} });

/**
 * Loads the signed-in user's quotes once for the whole dashboard, so the
 * ghost mascot and the "Quản lý Quote" dialog share one list instead of each
 * page's top bar fetching its own.
 */
export function QuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<HabitQuote[]>([]);
  const [, startTransition] = useTransition();

  const refreshQuotes = useCallback(() => {
    startTransition(async () => {
      setQuotes(await getHabitQuotes());
    });
  }, []);

  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  const value = useMemo(() => ({ quotes, refreshQuotes }), [quotes, refreshQuotes]);

  return <QuotesContext value={value}>{children}</QuotesContext>;
}

export function useQuotes(): QuotesContextValue {
  return useContext(QuotesContext);
}
