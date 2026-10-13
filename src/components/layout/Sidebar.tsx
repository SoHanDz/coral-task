"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";

interface SidebarProps {
  profileSlot: ReactNode;
}

export function Sidebar({ profileSlot }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-mono text-sm font-semibold tracking-wide text-sidebar-foreground">
          CoralTask
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("size-4", active && "text-sidebar-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {profileSlot}
    </aside>
  );
}
