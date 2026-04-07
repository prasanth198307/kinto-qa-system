import { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface MobileHeaderProps {
  onLogoutClick?: () => void;
  notificationCount?: number;
  title?: string;
}

export default function MobileHeader({ 
  onLogoutClick, 
  notificationCount = 0,
  title = "KINTO QA"
}: MobileHeaderProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    onLogoutClick?.();
  };

  const handleLogoutDialogClose = (open: boolean) => {
    setIsLogoutDialogOpen(open);
  };

  return (
    <header
      className="fixed left-0 right-0 bg-card border-b border-border shadow-sm z-[100]"
      style={{
        top: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <Button
          size="icon"
          variant="ghost"
          className="text-foreground touch-manipulation"
          onClick={handleLogoutClick}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold text-foreground" data-testid="text-app-title">{title}</h1>
        
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="text-foreground touch-manipulation"
            onClick={() => console.log('Notifications clicked')}
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          {notificationCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
              data-testid="badge-notification-count"
            >
              {notificationCount}
            </Badge>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={isLogoutDialogOpen}
        onOpenChange={handleLogoutDialogClose}
        onConfirm={confirmLogout}
        title="Logout?"
        description="Are you sure you want to logout? You will need to log in again to access the system."
        isPending={false}
        confirmText="Logout"
        confirmVariant="default"
      />
    </header>
  );
}
