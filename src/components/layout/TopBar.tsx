"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { getHabitQuotes } from "@/app/actions/habitQuotes";
import { QuoteManagerDialog } from "@/components/habits/QuoteManagerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HabitQuote } from "@/lib/habits/types";

interface TopBarProps {
  /** Omit to render a plain page title instead of the personalized greeting. */
  email?: string | null;
  title?: string;
}

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function TopBar({ email, title }: TopBarProps) {
  // Starts null so the initial (and prerendered) render never reads the
  // current time — Next's static prerendering rejects `new Date()` during
  // render. The real clock is filled in after mount, client-side only.
  const [now, setNow] = useState<Date | null>(null);
  const displayName = email ? email.split("@")[0] : "bạn";
  const initial = (email?.[0] ?? "?").toUpperCase();

  const [, startTransition] = useTransition();
  const [quotes, setQuotes] = useState<HabitQuote[]>([]);
  const [quote, setQuote] = useState<HabitQuote | null>(null);
  const [quoteManagerOpen, setQuoteManagerOpen] = useState(false);

  function refreshQuotes() {
    startTransition(async () => {
      const next = await getHabitQuotes();
      setQuotes(next);
      setQuote(next.length > 0 ? next[Math.floor(Math.random() * next.length)] : null);
    });
  }

  useEffect(() => {
    if (!email) return;
    refreshQuotes();
  }, [email]);

  useEffect(() => {
    if (title) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [title]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-8">
      {title ? (
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      ) : now ? (
        <div>
          <p className="text-xs font-medium capitalize text-slate-500">{format(now, "EEEE", { locale: vi })}</p>
          <p className="flex items-baseline gap-2 text-base font-semibold text-slate-800">
            {format(now, "dd/MM/yyyy")}
            <span className="font-mono text-sm font-medium text-slate-500">{format(now, "HH:mm:ss")}</span>
          </p>
        </div>
      ) : (
        <div className="h-10" />
      )}

      {email && (
        <div className="flex min-w-0 items-center gap-4">
          {!title && (
            <div className="min-w-0 text-right">
              <p className="text-xs font-medium text-slate-500">{now ? getGreeting(now) : " "}</p>
              <p className="truncate text-base font-semibold text-slate-800">{displayName}</p>
            </div>
          )}

          {quote && (
            <p className="hidden min-w-0 max-w-[200px] truncate text-sm font-semibold italic tracking-tight text-primary sm:block sm:max-w-xs md:max-w-sm md:text-base">
              “{quote.text}”
            </p>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Tài khoản"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                >
                  {initial}
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setQuoteManagerOpen(true)}>Quản lý Quote</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                render={
                  <form action={signOut} className="w-full">
                    <button type="submit" className="flex w-full items-center gap-1.5">
                      <LogOut />
                      Đăng xuất
                    </button>
                  </form>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <QuoteManagerDialog
            quotes={quotes}
            open={quoteManagerOpen}
            onOpenChange={setQuoteManagerOpen}
            onChange={refreshQuotes}
          />
        </div>
      )}
    </header>
  );
}
