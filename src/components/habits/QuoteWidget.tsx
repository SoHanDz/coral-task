"use client";

import { useEffect, useState } from "react";
import { QuoteManagerDialog } from "@/components/habits/QuoteManagerDialog";
import type { HabitQuote } from "@/lib/habits/types";

interface QuoteWidgetProps {
  quotes: HabitQuote[];
}

export function QuoteWidget({ quotes }: QuoteWidgetProps) {
  // Picked client-side on mount (not during render) so a prerendered page
  // doesn't bake in one fixed quote — each load gets its own random pick.
  const [quote, setQuote] = useState<HabitQuote | null>(null);

  useEffect(() => {
    if (quotes.length === 0) {
      setQuote(null);
      return;
    }
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [quotes]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="min-w-0 flex-1 text-sm italic text-slate-600">
        {quote ? `"${quote.text}"` : "Chưa có quote nào — thêm một câu truyền cảm hứng."}
      </p>
      <QuoteManagerDialog
        quotes={quotes}
        trigger={
          <button type="button" className="shrink-0 text-xs font-medium text-primary hover:underline">
            Quản lý quote
          </button>
        }
      />
    </div>
  );
}
