"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <div className="flex min-w-0 items-center gap-3">
          {!title && (
            <div className="min-w-0 text-right">
              <p className="text-xs font-medium text-slate-500">{now ? getGreeting(now) : " "}</p>
              <p className="truncate text-base font-semibold text-slate-800">{displayName}</p>
            </div>
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
        </div>
      )}
    </header>
  );
}
