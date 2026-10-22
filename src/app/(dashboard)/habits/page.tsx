import { Suspense } from "react";
import { HabitsContent } from "@/app/(dashboard)/habits/HabitsContent";

export default function HabitsPage() {
  return (
    <Suspense>
      <HabitsContent />
    </Suspense>
  );
}
