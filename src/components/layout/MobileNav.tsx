"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-slate-200/80 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Điều hướng chính"
    >
      {NAV_ITEMS.map(({ href, shortLabel, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-200",
              active ? "text-primary" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Icon className="size-5" />
            {shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
