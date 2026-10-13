import { Suspense } from "react";
import { TasksDevClient } from "@/app/dev/tasks/TasksDevClient";

// This demo seeds tasks relative to "today", so with Cache Components it
// must be excluded from the static prerender shell (not computed at build
// time) rather than marked force-dynamic, which Cache Components disallows.
export default function TasksDevPage() {
  return (
    <Suspense>
      <TasksDevClient />
    </Suspense>
  );
}
