import { foregroundFor, isValidHexColor, radiusValue, type SiteSettings } from "@/lib/settings/theme";

/** Client-only live preview: re-themes the whole page without a reload. */
export function applyAppearance(settings: SiteSettings) {
  const root = document.documentElement;
  if (isValidHexColor(settings.primaryColor)) {
    root.style.setProperty("--brand", settings.primaryColor);
    root.style.setProperty("--brand-foreground", foregroundFor(settings.primaryColor));
  }
  root.style.setProperty("--radius", radiusValue(settings.radius));
  root.dataset.sidebar = settings.sidebarStyle;
}
