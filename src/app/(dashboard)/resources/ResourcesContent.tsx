import { connection } from "next/server";
import { getResources } from "@/app/actions/resources";
import { ResourcesBoard } from "@/components/resources/ResourcesBoard";
import { TopBar } from "@/components/layout/TopBar";

export async function ResourcesContent() {
  await connection();
  const { folders, links } = await getResources();

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Tài nguyên" />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <ResourcesBoard folders={folders} links={links} />
      </div>
    </div>
  );
}
