import { Suspense } from "react";
import { NotesContent } from "@/app/(dashboard)/notes/NotesContent";

export default function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  return (
    <Suspense>
      <NotesContent searchParams={searchParams} />
    </Suspense>
  );
}
