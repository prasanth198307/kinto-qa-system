import { ReactNode } from "react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { TopRightHeader } from "@/components/TopRightHeader";

interface GlobalHeaderProps {
  title?: string;
  actions?: ReactNode;
  notificationCount?: number;
  onLogoutClick: () => void;
  onNotificationClick?: () => void;
}

export function GlobalHeader({
  title,
  actions,
  notificationCount = 0,
  onLogoutClick,
  onNotificationClick,
}: GlobalHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 lg:left-72 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4 gap-4">
      {/* Left: Logo (mobile only) + Title */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="lg:hidden">
          <KintoLogo variant="compact" layout="vertical" />
        </div>
        {title && (
          <h1 className="text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Center/Right: Actions + User Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
        <div className="flex items-center gap-2">
          <TopRightHeader
            notificationCount={notificationCount}
            onLogoutClick={onLogoutClick}
            onNotificationClick={onNotificationClick}
          />
        </div>
      </div>
    </div>
  );
}
