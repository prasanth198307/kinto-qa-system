import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut } from "lucide-react";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface TopRightHeaderProps {
  notificationCount?: number;
  onLogoutClick: () => void;
  onNotificationClick?: () => void;
}

export function TopRightHeader({
  notificationCount = 0,
  onLogoutClick,
  onNotificationClick,
}: TopRightHeaderProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    onLogoutClick();
  };

  const handleLogoutDialogClose = (open: boolean) => {
    setIsLogoutDialogOpen(open);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          onClick={onNotificationClick || (() => console.log('Notifications clicked'))}
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
      
      <Button
        size="icon"
        variant="ghost"
        onClick={handleLogoutClick}
        data-testid="button-logout"
      >
        <LogOut className="h-5 w-5" />
      </Button>

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
    </div>
  );
}
