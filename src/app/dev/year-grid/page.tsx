import { Suspense } from "react";
import { YearGridDevClient } from "@/app/dev/year-grid/YearGridDevClient";

// This demo computes "today" at render time, so with Cache Components it
// must be excluded from the static prerender shell (not computed at build
// time) rather than marked force-dynamic, which Cache Components disallows.
export default function YearGridDevPage() {
  return (
    <Suspense>
      <YearGridDevClient />
    </Suspense>
  );
}
