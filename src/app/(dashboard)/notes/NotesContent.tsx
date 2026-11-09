import { Suspense } from "react";
import { connection } from "next/server";
import { getNotes } from "@/app/actions/notes";
import { getJournal, getJournalEntries } from "@/app/actions/journal";
import { NotesBoard } from "@/components/notes/NotesBoard";
import { NotesTabs } from "@/components/notes/NotesTabs";
import { NotesBodySkeleton } from "@/components/notes/NotesSkeletons";
import { JournalView } from "@/components/journal/JournalView";
import { TopBar } from "@/components/layout/TopBar";
import {
  getCurrentUserEmail,
  getCurrentUserId,
} from "@/lib/supabase/require-user";

async function NotesBody({ tab }: { tab: "notes" | "daily" }) {
  if (tab === "daily") {
    const journal = await getJournal();
    const entries = await getJournalEntries(journal.id);
    return <JournalView journal={journal} entries={entries} />;
  }

  const [notes, userId] = await Promise.all([getNotes(), getCurrentUserId()]);
  return <NotesBoard notes={notes} userId={userId} />;
}

export async function NotesContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await connection();
  const { tab } = await searchParams;
  const active = tab === "daily" ? "daily" : "notes";
  const email = await getCurrentUserEmail();

  // The shell (top bar + tabs) renders at once; only the body waits on data.
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Ghi chú" email={email} />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <NotesTabs active={active}>
          <Suspense key={active} fallback={<NotesBodySkeleton tab={active} />}>
            <NotesBody tab={active} />
          </Suspense>
        </NotesTabs>
      </div>
    </div>
  );
}
