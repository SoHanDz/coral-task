import { Suspense } from "react";
import { NotesContent } from "@/app/(dashboard)/notes/NotesContent";

export default function NotesPage() {
  return (
    <Suspense>
      <NotesContent />
    </Suspense>
  );
}
