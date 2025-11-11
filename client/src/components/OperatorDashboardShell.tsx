import { GlobalHeader } from "@/components/GlobalHeader";

interface OperatorDashboardShellProps {
  title: string;
  onLogoutClick: () => void;
  notificationCount?: number;
  children: React.ReactNode;
  bottomNav: React.ReactNode;
}

export function OperatorDashboardShell({
  title,
  onLogoutClick,
  notificationCount = 0,
  children,
  bottomNav,
}: OperatorDashboardShellProps) {
  return (
    <>
      <GlobalHeader 
        title={title}
        onLogoutClick={onLogoutClick}
        notificationCount={notificationCount}
        noSidebarOffset={true}
      />
      <div className="min-h-screen bg-background px-4">
        <div className="mt-16 pb-20">
          {children}
        </div>
        {bottomNav}
      </div>
    </>
  );
}
