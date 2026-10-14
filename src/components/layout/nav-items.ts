import { CalendarDays, LayoutDashboard, Link2 } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", shortLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/analytics", label: "Lịch & Sự kiện", shortLabel: "Lịch", icon: CalendarDays },
  { href: "/resources", label: "Tài nguyên", shortLabel: "Tài nguyên", icon: Link2 },
] as const;
