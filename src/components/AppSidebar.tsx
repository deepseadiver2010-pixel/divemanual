import { BookOpen, Search, Brain, CreditCard as Cards, Settings, Shield, BarChart3, Upload, MessageCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  isDocumentViewer?: boolean;
}

const mainItems = [
  { title: "Document Viewer", url: "/", icon: BookOpen },
  { title: "Dive Buddy AI", url: "/dive-buddy", icon: MessageCircle },
  { title: "Search", url: "/search", icon: Search },
  { title: "Flashcards", url: "/flashcards", icon: Cards },
];

const adminItems = [
  { title: "Document Upload", url: "/admin/upload", icon: Upload },
  { title: "User Management", url: "/admin/users", icon: Shield },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AppSidebar({ isDocumentViewer = false }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-[hsl(var(--navy-accent)/0.1)] text-[hsl(var(--navy-accent))] border-r-2 border-[hsl(var(--navy-accent))] font-medium" 
      : "hover:bg-muted/50 hover:text-[hsl(var(--navy-light))]";

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-64"} bg-card border-r border-border shadow-[var(--shadow-depth)]`}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[hsl(var(--navy-primary))] to-[hsl(var(--navy-accent))] rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-sm text-[hsl(var(--navy-primary))]">Navy Dive Manual</h2>
                <p className="text-xs text-muted-foreground">AI Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[hsl(var(--tactical-light))] uppercase tracking-wider text-xs font-bold">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[hsl(var(--tactical-light))] uppercase tracking-wider text-xs font-bold">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Toggle */}
      <div className="absolute top-4 -right-3 z-50">
        <SidebarTrigger className="bg-card border border-border shadow-md hover:bg-muted" />
      </div>
    </Sidebar>
  );
}