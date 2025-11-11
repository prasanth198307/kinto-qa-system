import { ReactNode } from "react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { TopRightHeader } from "@/components/TopRightHeader";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface GlobalHeaderProps {
  title?: string;
  actions?: ReactNode;
  notificationCount?: number;
  onLogoutClick: () => void;
  onNotificationClick?: () => void;
  noSidebarOffset?: boolean;
  onMobileMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export function GlobalHeader({
  title,
  actions,
  notificationCount = 0,
  onLogoutClick,
  onNotificationClick,
  noSidebarOffset = true,
  onMobileMenuClick,
  showMobileMenu = false,
}: GlobalHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4 gap-4">
      {/* Left: Mobile Menu + KINTO Logo + SmartOps (horizontal) + Optional Title */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile Menu Button */}
        {showMobileMenu && onMobileMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuClick}
            className="lg:hidden"
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
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
