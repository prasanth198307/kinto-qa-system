import { useState } from "react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { VerticalNavSidebar, type NavSection } from "@/components/VerticalNavSidebar";

interface DashboardShellProps {
  title: string;
  onLogoutClick: () => void;
  notificationCount?: number;
  navSections: NavSection[];
  activeView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  onLogoutClick,
  notificationCount = 0,
  navSections,
  activeView,
  onNavigate,
  children,
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <GlobalHeader 
        onLogoutClick={onLogoutClick}
        notificationCount={notificationCount}
        noSidebarOffset={false}
        showMobileMenu={true}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex min-h-screen bg-background overflow-x-hidden">
        <VerticalNavSidebar
          sections={navSections}
          activeItem={activeView}
          onItemClick={onNavigate}
          title={title}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        
        <div className="flex-1 pt-16 overflow-x-auto min-w-0">
          {children}
        </div>
      </div>
    </>
  );
}
