import { Suspense } from "react";
import { ResourcesContent } from "@/app/(dashboard)/resources/ResourcesContent";

export default function ResourcesPage() {
  return (
    <Suspense>
      <ResourcesContent />
    </Suspense>
  );
}
