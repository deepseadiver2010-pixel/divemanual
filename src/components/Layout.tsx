import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ChatWidget } from "./ChatWidget";
import { TopNav } from "./TopNav";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { useAuth } from "@/hooks/useAuth";

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const isDocumentViewer = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar isDocumentViewer={isDocumentViewer} />
          <div className="flex-1 flex flex-col">
            <TopNav isDocumentViewer={isDocumentViewer} />
            <main className={isDocumentViewer ? "flex-1" : "flex-1 p-6"}>
              <Outlet />
            </main>
          </div>
        </div>
        {user && <ChatWidget />}
        <PWAInstallPrompt />
      </SidebarProvider>
    </div>
  );
}