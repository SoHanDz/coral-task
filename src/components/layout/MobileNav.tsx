"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useSiteSettings } from "@/components/settings/SiteSettingsProvider";

const MOBILE_EXCLUDED = ["/settings", "/habits"];

export function MobileNav() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const hidden = settings?.navHidden ?? [];
  // Kept off the bottom bar to leave room: Cấu hình lives in the avatar menu, Thói quen is reached from Todo List.
  const items = NAV_ITEMS.filter((i) => !MOBILE_EXCLUDED.includes(i.href) && !hidden.includes(i.href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Điều hướng chính"
    >
      {items.map(({ href, shortLabel, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-200",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
