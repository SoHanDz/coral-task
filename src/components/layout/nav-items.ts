import { CalendarDays, CheckSquare2, Flame, LayoutDashboard, Link2 } from "lucide-react";

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
];

function isGroup(entry: NavGroup | NavLeaf): entry is NavGroup {
  return "children" in entry;
}

/** Flat list of every leaf entry, in display order — used by the mobile bottom nav, which has no room for a submenu. */
export const NAV_ITEMS: NavLeaf[] = NAV_GROUPS.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
