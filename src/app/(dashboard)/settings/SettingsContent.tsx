import { connection } from "next/server";
import { getSettings } from "@/app/actions/settings";
import { TopBar } from "@/components/layout/TopBar";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function SettingsContent() {
  await connection();
  const [settings, email] = await Promise.all([getSettings(), getCurrentUserEmail()]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Cấu hình trang web" email={email} />
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <SettingsForm saved={settings} />
      </div>
    </div>
  );
}
