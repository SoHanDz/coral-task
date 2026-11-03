import { Suspense } from "react";
import { SettingsContent } from "@/app/(dashboard)/settings/SettingsContent";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
