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
      
      <div className="flex bg-background overflow-x-hidden" style={{ minHeight: '100dvh' }}>
        <VerticalNavSidebar
          sections={navSections}
          activeItem={activeView}
          onItemClick={onNavigate}
          title={title}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        
        <div
          className="flex-1 overflow-x-auto min-w-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)' }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
