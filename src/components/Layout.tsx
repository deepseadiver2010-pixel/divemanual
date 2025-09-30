import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ChatWidget } from "./ChatWidget";
import { TopNav } from "./TopNav";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
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
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
        {user && <ChatWidget />}
      </SidebarProvider>
    </div>
  );
};