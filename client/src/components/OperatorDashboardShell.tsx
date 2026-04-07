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
      <div className="bg-background px-4" style={{ minHeight: '100dvh', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
        <div>
          {children}
        </div>
        {bottomNav}
      </div>
    </>
  );
}
