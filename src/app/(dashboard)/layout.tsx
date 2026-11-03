import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProfile } from "@/components/layout/SidebarProfile";
import { MobileNav } from "@/components/layout/MobileNav";
import { MascotGate } from "@/components/mascot/MascotGate";
import { QuotesProvider } from "@/components/mascot/QuotesProvider";
import { SiteSettingsProvider } from "@/components/settings/SiteSettingsProvider";
import { ThemeStyle } from "@/components/settings/ThemeStyle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteSettingsProvider>
      <QuotesProvider>
        <Suspense fallback={null}>
          <ThemeStyle />
        </Suspense>
        <div className="flex min-h-screen flex-col bg-background lg:flex-row">
          <Sidebar profileSlot={<Suspense fallback={null}><SidebarProfile /></Suspense>} />
          <main className="min-w-0 flex-1 overflow-x-hidden pb-20 lg:pb-0">{children}</main>
          <MobileNav />
          {/* Must sit inside QuotesProvider: it reads the quotes from context. */}
          <MascotGate />
        </div>
      </QuotesProvider>
    </SiteSettingsProvider>
  );
}
