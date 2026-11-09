import { connection } from "next/server";
import { getNotes } from "@/app/actions/notes";
import { getJournal, getJournalEntries } from "@/app/actions/journal";
import { NotesBoard } from "@/components/notes/NotesBoard";
import { NotesTabs } from "@/components/notes/NotesTabs";
import { JournalView } from "@/components/journal/JournalView";
import { TopBar } from "@/components/layout/TopBar";
import {
  getCurrentUserEmail,
  getCurrentUserId,
} from "@/lib/supabase/require-user";

export async function NotesContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await connection();
  const { tab } = await searchParams;
  const active = tab === "daily" ? "daily" : "notes";

  const [email, userId] = await Promise.all([
    getCurrentUserEmail(),
    getCurrentUserId(),
  ]);

  let body: React.ReactNode;
  if (active === "daily") {
    const journal = await getJournal();
    const entries = await getJournalEntries(journal.id);
    body = <JournalView journal={journal} entries={entries} />;
  } else {
    const notes = await getNotes();
    body = <NotesBoard notes={notes} userId={userId} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Ghi chú" email={email} />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <NotesTabs active={active} />
        {body}
      </div>
    </div>
  );
}
