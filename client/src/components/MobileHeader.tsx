import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MobileHeaderProps {
  onMenuClick?: () => void;
  notificationCount?: number;
  title?: string;
}

export default function MobileHeader({ 
  onMenuClick, 
  notificationCount = 0,
  title = "KINTO QA"
}: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-primary to-teal-600 text-white shadow-md z-50">
      <div className="flex items-center justify-between h-full px-4">
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/20"
          onClick={() => {
            console.log('Menu clicked');
            onMenuClick?.();
          }}
          data-testid="button-menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <h1 className="text-lg font-semibold" data-testid="text-app-title">{title}</h1>
        
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => console.log('Notifications clicked')}
            data-testid="button-notifications"
          >
            <Bell className="h-6 w-6" />
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
    </header>
  );
}
