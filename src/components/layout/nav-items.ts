import { CalendarDays, CheckSquare2, Flame, LayoutDashboard, Link2, Settings, StickyNote } from "lucide-react";

interface NavLeaf {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  children: NavLeaf[];
}

export const NAV_GROUPS: (NavGroup | NavLeaf)[] = [
  {
    label: "Công việc",
    icon: LayoutDashboard,
    children: [
      { href: "/", label: "Todo List", shortLabel: "Todo List", icon: CheckSquare2 },
      { href: "/habits", label: "Dựng thói quen", shortLabel: "Thói quen", icon: Flame },
    ],
  },
  { href: "/analytics", label: "Lịch & Sự kiện", shortLabel: "Lịch", icon: CalendarDays },
  { href: "/resources", label: "Tài nguyên", shortLabel: "Tài nguyên", icon: Link2 },
  { href: "/notes", label: "Ghi chú", shortLabel: "Ghi chú", icon: StickyNote },
  { href: "/settings", label: "Cấu hình", shortLabel: "Cấu hình", icon: Settings },
];

function isGroup(entry: NavGroup | NavLeaf): entry is NavGroup {
  return "children" in entry;
}

/** NAV_GROUPS without the entries the user hid; a group whose children are all hidden disappears. "/settings" is never hidden. */
export function visibleNavGroups(hidden: string[]): (NavGroup | NavLeaf)[] {
  const isShown = (href: string) => href === "/settings" || !hidden.includes(href);
  return NAV_GROUPS.flatMap<NavGroup | NavLeaf>((entry) => {
    if (!isGroup(entry)) return isShown(entry.href) ? [entry] : [];
    const children = entry.children.filter((c) => isShown(c.href));
    return children.length > 0 ? [{ ...entry, children }] : [];
  });
}

/** Flat list of every leaf entry, in display order — used by the mobile bottom nav, which has no room for a submenu. */
export const NAV_ITEMS: NavLeaf[] = NAV_GROUPS.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
