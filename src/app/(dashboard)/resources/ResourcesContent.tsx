import { connection } from "next/server";
import { getResources } from "@/app/actions/resources";
import { ResourcesBoard } from "@/components/resources/ResourcesBoard";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function ResourcesContent() {
  await connection();
  const [{ folders, links }, email] = await Promise.all([getResources(), getCurrentUserEmail()]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Tài nguyên" email={email} />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <ResourcesBoard folders={folders} links={links} />
      </div>
    </div>
  );
}
