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
  return (
    <>
      <GlobalHeader 
        onLogoutClick={onLogoutClick}
        notificationCount={notificationCount}
        noSidebarOffset={false}
      />
      
      <div className="flex min-h-screen bg-background">
        <VerticalNavSidebar
          sections={navSections}
          activeItem={activeView}
          onItemClick={onNavigate}
          title={title}
        />
        
        <div className="flex-1 pt-16">
          {children}
        </div>
      </div>
    </>
  );
}
