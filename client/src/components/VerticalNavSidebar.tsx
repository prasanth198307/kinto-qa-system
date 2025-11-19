import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Plus } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
  quickActions?: QuickAction[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface VerticalNavSidebarProps {
  sections: NavSection[];
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onLogout?: () => void;
  title?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function VerticalNavSidebar({
  sections,
  activeItem,
  onItemClick,
  onLogout,
  title = "Dashboard",
  isMobileOpen = false,
  onMobileClose,
}: VerticalNavSidebarProps) {

  const handleItemClick = (item: NavItem) => {
    onItemClick(item.id);
    if (item.onClick) {
      item.onClick();
    }
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;

    return (
      <Button
        key={item.id}
        variant={isActive ? "default" : "ghost"}
        className={`w-full justify-start text-left min-h-11 h-auto py-2.5 ${
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"
        }`}
        onClick={() => handleItemClick(item)}
        data-testid={`nav-${item.id}`}
      >
        <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="flex-1 text-sm leading-tight break-words">{item.label}</span>
      </Button>
    );
  };

  const sidebarContent = (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={section.id}>
            {section.label && (
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  {section.label}
                </div>
                {section.quickActions && section.quickActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover-elevate"
                        aria-label={`Add ${section.label?.toLowerCase()} item`}
                        data-testid={`button-quick-action-${section.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {section.quickActions.map((action) => {
                        const ActionIcon = action.icon;
                        return (
                          <DropdownMenuItem
                            key={action.id}
                            onClick={action.onClick}
                            data-testid={`quick-action-${action.id}`}
                          >
                            <ActionIcon className="h-4 w-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => renderNavItem(item))}
            </div>
            {index < sections.length - 1 && (
              <div className="border-t border-border my-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onMobileClose}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-40 pt-20 px-4 pb-4
          transition-transform duration-300 ease-in-out
          flex flex-col
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        data-testid="vertical-nav-sidebar"
      >
        {sidebarContent}
      </div>

      {/* Spacer for desktop layout */}
      <div className="hidden lg:block w-72 flex-shrink-0" />
    </>
  );
}
