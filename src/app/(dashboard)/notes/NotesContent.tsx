import { connection } from "next/server";
import { getNotes } from "@/app/actions/notes";
import { NotesBoard } from "@/components/notes/NotesBoard";
import { TopBar } from "@/components/layout/TopBar";
import {
  getCurrentUserEmail,
  getCurrentUserId,
} from "@/lib/supabase/require-user";

export async function NotesContent() {
  await connection();
  const [notes, email, userId] = await Promise.all([
    getNotes(),
    getCurrentUserEmail(),
    getCurrentUserId(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Ghi chú" email={email} />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <NotesBoard notes={notes} userId={userId} />
      </div>
    </div>
  );
}
