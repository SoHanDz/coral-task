import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-slate-100/70">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </div>

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex h-full min-h-[160px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex h-full min-h-[160px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex h-full min-h-[160px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex h-full min-h-[160px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
