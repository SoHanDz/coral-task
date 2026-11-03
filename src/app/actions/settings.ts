"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/require-user";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import {
  DEFAULT_SETTINGS,
  RADIUS_OPTIONS,
  SIDEBAR_STYLES,
  isValidHexColor,
  type SiteSettings,
} from "@/lib/settings/theme";

interface SettingsRow {
  primary_color: string;
  radius: string;
  mascot_enabled: boolean;
  week_start: number;
  sidebar_style: string;
  nav_hidden: string[];
}

const SETTINGS_COLUMNS =
  "primary_color, radius, mascot_enabled, week_start, sidebar_style, nav_hidden";

/** Only real, hideable entries survive; "/settings" must stay reachable. */
function sanitizeNavHidden(hrefs: string[] | null): string[] {
  const hideable = new Set(NAV_ITEMS.map((i) => i.href).filter((h) => h !== "/settings"));
  return [...new Set((hrefs ?? []).filter((h) => hideable.has(h)))];
}

function fromRow(row: SettingsRow | null): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    primaryColor: isValidHexColor(row.primary_color) ? row.primary_color : DEFAULT_SETTINGS.primaryColor,
    radius: RADIUS_OPTIONS.find((o) => o.key === row.radius)?.key ?? DEFAULT_SETTINGS.radius,
    mascotEnabled: row.mascot_enabled,
    weekStart: row.week_start === 0 ? 0 : 1,
    sidebarStyle: SIDEBAR_STYLES.find((s) => s.key === row.sidebar_style)?.key ?? DEFAULT_SETTINGS.sidebarStyle,
    navHidden: sanitizeNavHidden(row.nav_hidden),
  };
}

// cache() dedupes the read within one server render (ThemeStyle + the settings page).
const loadSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const { supabase, userId } = await requireUser();
    const { data } = await supabase
      .from("user_settings")
      .select(SETTINGS_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    return fromRow(data as SettingsRow | null);
  } catch {
    // Unauthenticated or a failed read just falls back to the default theme.
    return DEFAULT_SETTINGS;
  }
});

/** Never throws; safe to call from server components and from the client. */
export async function getSettings(): Promise<SiteSettings> {
  return loadSettings();
}

export async function updateSettings(next: SiteSettings): Promise<void> {
  if (!isValidHexColor(next.primaryColor)) throw new Error("Mã màu không hợp lệ.");
  if (!RADIUS_OPTIONS.some((o) => o.key === next.radius)) throw new Error("Độ bo góc không hợp lệ.");
  if (next.weekStart !== 0 && next.weekStart !== 1) throw new Error("Ngày bắt đầu tuần không hợp lệ.");
  if (!SIDEBAR_STYLES.some((s) => s.key === next.sidebarStyle)) throw new Error("Kiểu thanh bên không hợp lệ.");

  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("user_settings").upsert({
    user_id: userId,
    primary_color: next.primaryColor.toLowerCase(),
    radius: next.radius,
    mascot_enabled: Boolean(next.mascotEnabled),
    week_start: next.weekStart,
    sidebar_style: next.sidebarStyle,
    nav_hidden: sanitizeNavHidden(next.navHidden),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
