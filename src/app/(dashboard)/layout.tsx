import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProfile } from "@/components/layout/SidebarProfile";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <Sidebar profileSlot={<Suspense fallback={null}><SidebarProfile /></Suspense>} />
      <main className="min-w-0 flex-1 overflow-x-hidden pb-20 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
