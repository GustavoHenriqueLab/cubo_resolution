import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { StartupDrawerProvider } from "@/components/startup-drawer-context";
import { StartupDrawer } from "@/components/startup-drawer";
import { PipelineDrawerProvider } from "@/components/pipeline-drawer-context";
import { PipelineDrawer } from "@/components/pipeline-drawer";
import { ParceriaDrawerProvider } from "@/components/parceria-drawer-context";
import { ParceriaDrawer } from "@/components/parceria-drawer";
import { UserProvider } from "@/components/user-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <StartupDrawerProvider>
        <PipelineDrawerProvider>
          <ParceriaDrawerProvider>
            <Sidebar />
            <main className="min-h-screen overflow-x-hidden bg-slate-50 transition-all duration-300 dark:bg-gray-900 lg:ml-64">
              <div className="fixed right-4 top-4 z-30 lg:right-6 lg:top-5">
                <UserMenu />
              </div>
              {children}
            </main>
            <StartupDrawer />
            <PipelineDrawer />
            <ParceriaDrawer />
          </ParceriaDrawerProvider>
        </PipelineDrawerProvider>
      </StartupDrawerProvider>
    </UserProvider>
  );
}
