"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/components/layout/nav-items";

interface SidebarProps {
  profileSlot: ReactNode;
}

function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar({ profileSlot }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(
      NAV_GROUPS.filter(
        (entry) => "children" in entry && entry.children.some((child) => isActiveHref(pathname, child.href))
      ).map((entry) => entry.label)
    )
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-mono text-sm font-semibold tracking-wide text-sidebar-foreground">CoralTask</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_GROUPS.map((entry) => {
          if (!("children" in entry)) {
            const active = isActiveHref(pathname, entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("size-4", active && "text-sidebar-primary")} />
                {entry.label}
              </Link>
            );
          }

          const GroupIcon = entry.icon;
          const open = openGroups.has(entry.label);

          return (
            <div key={entry.label} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <GroupIcon className="size-4" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
              </button>
              {open && (
                <div className="flex flex-col gap-1 pl-6">
                  {entry.children.map((child) => {
                    const active = isActiveHref(pathname, child.href);
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch={true}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        <ChildIcon className={cn("size-4", active && "text-sidebar-primary")} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {profileSlot}
    </aside>
  );
}
