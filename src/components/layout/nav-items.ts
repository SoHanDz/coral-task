import { CalendarDays, LayoutDashboard } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", shortLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/analytics", label: "Lịch & Sự kiện", shortLabel: "Lịch", icon: CalendarDays },
] as const;
