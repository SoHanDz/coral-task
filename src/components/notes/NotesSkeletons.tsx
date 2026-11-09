import { Skeleton } from "@/components/ui/skeleton";

export type NotesTab = "notes" | "daily";

/** Placeholder for the body under the tab bar, shaped like each tab's real content. */
export function NotesBodySkeleton({ tab }: { tab: NotesTab }) {
  if (tab === "daily") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải nhật ký">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          <Skeleton className="h-[34rem] w-full rounded-2xl lg:col-span-2" />
          <Skeleton className="hidden h-80 w-full rounded-2xl lg:block" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Đang tải ghi chú"
    >
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
