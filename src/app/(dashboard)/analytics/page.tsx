import { Suspense } from "react";
import { AnalyticsContent } from "@/app/(dashboard)/analytics/AnalyticsContent";

// Reading the authenticated user (cookies) requires excluding this route
// from the static prerender shell - Cache Components needs that boundary
// marked with Suspense rather than a route-level dynamic flag.
export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}
