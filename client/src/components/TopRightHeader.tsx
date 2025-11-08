import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut } from "lucide-react";

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
  return (
    <div className="fixed top-0 right-0 h-14 bg-card border-b border-l border-border z-[100] flex items-center gap-2 px-4 shadow-sm lg:right-0 lg:left-auto">
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
        onClick={() => {
          if (confirm('Are you sure you want to logout?')) {
            onLogoutClick();
          }
        }}
        data-testid="button-logout"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}
