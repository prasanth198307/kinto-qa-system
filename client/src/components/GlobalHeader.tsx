import { ReactNode } from "react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { TopRightHeader } from "@/components/TopRightHeader";

interface GlobalHeaderProps {
  title?: string;
  actions?: ReactNode;
  notificationCount?: number;
  onLogoutClick: () => void;
  onNotificationClick?: () => void;
  noSidebarOffset?: boolean;
}

export function GlobalHeader({
  title,
  actions,
  notificationCount = 0,
  onLogoutClick,
  onNotificationClick,
  noSidebarOffset = true,
}: GlobalHeaderProps) {
  const headerClassName = `fixed top-0 left-0 right-0 ${!noSidebarOffset ? 'lg:left-72' : ''} h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4 gap-4`;
  
  return (
    <div className={headerClassName}>
      {/* Left: KINTO Logo + SmartOps (horizontal) + Optional Title */}
      <div className="flex items-center gap-4 min-w-0">
        <KintoLogo variant="compact" layout="horizontal" />
        {title && (
          <h1 className="text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right: Actions + Notifications + Logout */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
        <TopRightHeader
          notificationCount={notificationCount}
          onLogoutClick={onLogoutClick}
          onNotificationClick={onNotificationClick}
        />
      </div>
    </div>
  );
}
