import { Suspense } from "react";
import { OverviewContent } from "@/app/(dashboard)/OverviewContent";

// Reading the authenticated user (cookies) requires excluding this route
// from the static prerender shell - Cache Components needs that boundary
// marked with Suspense rather than a route-level dynamic flag.
export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  );
}
