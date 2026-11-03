import { connection } from "next/server";
import { getSettings } from "@/app/actions/settings";
import { SidebarStyleSync } from "@/components/settings/SidebarStyleSync";
import { foregroundFor, radiusValue } from "@/lib/settings/theme";

/** Injects the user's theme; every themed token in globals.css derives from --brand / --radius. */
export async function ThemeStyle() {
  // Auth verification reads the clock; opt into request-time rendering like the other dashboard pieces.
  await connection();
  const s = await getSettings();
  return (
    <>
      <style>{`:root{--brand:${s.primaryColor};--brand-foreground:${foregroundFor(s.primaryColor)};--radius:${radiusValue(s.radius)};}`}</style>
      <SidebarStyleSync sidebar={s.sidebarStyle} />
    </>
  );
}
