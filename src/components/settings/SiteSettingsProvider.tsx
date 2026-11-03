"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSettings } from "@/app/actions/settings";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings/theme";

interface SiteSettingsContextValue {
  /** null until the first load finishes, so settings-gated UI (e.g. the mascot) doesn't flash. */
  settings: SiteSettings | null;
  setSettings: (settings: SiteSettings) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: null,
  setSettings: () => {},
});

/** Loads behavior settings (mascot, week start) once for the whole dashboard. */
export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSettings().then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ settings, setSettings }), [settings]);
  return <SiteSettingsContext value={value}>{children}</SiteSettingsContext>;
}

export function useSiteSettings(): SiteSettingsContextValue {
  return useContext(SiteSettingsContext);
}

/** Week start with a safe default for places rendered outside the provider. */
export function useWeekStart(): 0 | 1 {
  return useContext(SiteSettingsContext).settings?.weekStart ?? DEFAULT_SETTINGS.weekStart;
}
