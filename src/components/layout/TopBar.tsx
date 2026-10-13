"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Bell } from "lucide-react";

interface TopBarProps {
  /** Omit to render a plain page title instead of the personalized greeting. */
  email?: string | null;
  title?: string;
  overdueCount?: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function TopBar({ email, title, overdueCount }: TopBarProps) {
  const [now, setNow] = useState(() => new Date());
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
      ) : (
        <div>
          <p className="text-xs font-medium capitalize text-slate-500">{format(now, "EEEE", { locale: vi })}</p>
          <p className="flex items-baseline gap-2 text-base font-semibold text-slate-800">
            {format(now, "dd/MM/yyyy")}
            <span className="font-mono text-sm font-medium text-slate-500">{format(now, "HH:mm:ss")}</span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!title && (
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="text-xs font-medium text-slate-500">{getGreeting()}</p>
              <p className="truncate text-base font-semibold text-slate-800">{displayName}</p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {initial}
            </span>
          </div>
        )}

        {overdueCount !== undefined && (
          <Link
            href="/#overdue-tasks"
            aria-label={
              overdueCount > 0 ? `${overdueCount} việc trễ hạn cần xử lý` : "Không có việc trễ hạn"
            }
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors duration-200 hover:bg-slate-200"
          >
            <Bell className="size-5" />
            {overdueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                {overdueCount > 9 ? "9+" : overdueCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
