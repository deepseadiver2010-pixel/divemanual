import { ReactNode } from 'react';
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

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <TopNav />
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