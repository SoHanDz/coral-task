import { Skeleton } from "@/components/ui/skeleton";

export default function ResourcesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-8">
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
