"use client";

import { useLayoutEffect } from "react";
import type { SidebarStyle } from "@/lib/settings/theme";

/** Applies the saved sidebar style to <html>, which the CSS in globals.css keys off. */
export function SidebarStyleSync({ sidebar }: { sidebar: SidebarStyle }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.sidebar = sidebar;
  }, [sidebar]);

  return null;
}
