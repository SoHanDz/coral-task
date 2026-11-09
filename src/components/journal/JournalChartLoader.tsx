"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is heavy; load it only when the daily tab renders.
export const JournalChartLoader = dynamic(() => import("./JournalChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
});
