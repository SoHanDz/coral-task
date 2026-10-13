import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewLoading() {
  return (
    <div className="min-h-screen bg-slate-100/70">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </div>

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-8 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
              <Skeleton className="mb-6 h-6 w-48" />
              <Skeleton className="mb-6 h-14 w-full rounded-xl" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
              <Skeleton className="mb-4 h-8 w-32" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
              <Skeleton className="mb-4 h-6 w-32" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
