import { ReactNode } from "react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { TopRightHeader } from "@/components/TopRightHeader";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useTenantBranding } from "@/hooks/use-tenant-branding";

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
  const { logoUrl, tenantName } = useTenantBranding();

  return (
    <div
      className="fixed left-0 right-0 bg-card border-b border-border z-50 flex items-center justify-between px-4 gap-4"
      style={{
        top: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(env(safe-area-inset-top, 0px) + 4rem)',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
      data-testid="global-header"
    >
      {/* Left: Mobile Menu + Logo + Optional Title */}
      <div className="flex items-center gap-4 min-w-0">
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
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={tenantName}
            className="h-8 object-contain max-w-[140px]"
            data-testid="img-tenant-logo"
          />
        ) : (
          <KintoLogo variant="compact" layout="horizontal" />
        )}
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
