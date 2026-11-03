"use client";

import { GhostMascot } from "@/components/mascot/GhostMascot";
import { useSiteSettings } from "@/components/settings/SiteSettingsProvider";

/** Renders the mascot only once settings have loaded and the user hasn't turned it off. */
export function MascotGate() {
  const { settings } = useSiteSettings();
  if (!settings?.mascotEnabled) return null;
  return <GhostMascot />;
}
