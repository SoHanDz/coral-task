export const DEFAULT_PRIMARY_COLOR = "#0f766e";

/**
 * Tailwind CSS default palette, shade 600 (shade 700 for teal, the app's default).
 * Chosen because every one keeps white text at a readable contrast on buttons.
 */
export const PRIMARY_COLOR_PRESETS: { name: string; value: string }[] = [
  { name: "Đỏ", value: "#dc2626" },
  { name: "Hồng đào", value: "#e11d48" },
  { name: "Hồng", value: "#db2777" },
  { name: "Tím hồng", value: "#c026d3" },
  { name: "Tím", value: "#9333ea" },
  { name: "Tím chàm", value: "#7c3aed" },
  { name: "Chàm", value: "#4f46e5" },
  { name: "Xanh dương", value: "#2563eb" },
  { name: "Xanh da trời", value: "#0284c7" },
  { name: "Xanh lơ", value: "#0891b2" },
  { name: "Xanh ngọc", value: "#0f766e" },
  { name: "Xanh bạc hà", value: "#059669" },
  { name: "Xanh lá", value: "#16a34a" },
  { name: "Xanh chanh", value: "#65a30d" },
  { name: "Hổ phách", value: "#d97706" },
  { name: "Cam", value: "#ea580c" },
  { name: "Xám đá", value: "#475569" },
];

export type RadiusKey = "sharp" | "default" | "round";
export const RADIUS_OPTIONS: { key: RadiusKey; label: string; value: string }[] = [
  { key: "sharp", label: "Vuông", value: "0.25rem" },
  { key: "default", label: "Vừa", value: "0.625rem" },
  { key: "round", label: "Tròn", value: "1rem" },
];

/** 0 = Sunday, 1 = Monday — matches `Date#getDay` and react-day-picker's `weekStartsOn`. */
export type WeekStart = 0 | 1;

export type SidebarStyle = "dark" | "brand" | "light";
export const SIDEBAR_STYLES: { key: SidebarStyle; label: string }[] = [
  { key: "dark", label: "Tối" },
  { key: "brand", label: "Màu chủ đạo" },
  { key: "light", label: "Sáng" },
];

export interface SiteSettings {
  primaryColor: string;
  radius: RadiusKey;
  mascotEnabled: boolean;
  weekStart: WeekStart;
  sidebarStyle: SidebarStyle;
  /** Hrefs of navigation entries the user hid. "/settings" can never be hidden. */
  navHidden: string[];
}

export const DEFAULT_SETTINGS: SiteSettings = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  radius: "default",
  mascotEnabled: true,
  weekStart: 1,
  sidebarStyle: "dark",
  navHidden: [],
};

export function radiusValue(key: RadiusKey): string {
  return (RADIUS_OPTIONS.find((o) => o.key === key) ?? RADIUS_OPTIONS[1]).value;
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Readable text color (white or near-black) for a given background hex. */
export function foregroundFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#0f172a" : "#ffffff";
}
