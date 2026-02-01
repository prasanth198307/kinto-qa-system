import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  defaultOpen?: boolean;
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
  sections = [],
  activeItem,
  onItemClick,
  onLogout,
  title = "Dashboard",
  isMobileOpen = false,
  onMobileClose,
}: VerticalNavSidebarProps) {
  const [, navigate] = useLocation();
  // Guard against undefined sections
  const safeSections = sections || [];
  
  // Initialize collapsed state - default all collapsed
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const STORAGE_VERSION = 'v2'; // Change this to reset user preferences
    try {
      const version = localStorage.getItem('sidebarVersion');
      const saved = localStorage.getItem('sidebarCollapsedSections');
      if (version === STORAGE_VERSION && saved) {
        return JSON.parse(saved);
      }
      // Reset storage for new version
      localStorage.setItem('sidebarVersion', STORAGE_VERSION);
    } catch (e) {
      // Ignore parse errors
    }
    // Default: all sections collapsed
    const defaultCollapsed: Record<string, boolean> = {};
    safeSections.forEach(section => {
      if (section.label) {
        defaultCollapsed[section.id] = true;
      }
    });
    return defaultCollapsed;
  });

  // Save to localStorage when collapsed state changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsedSections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  // Auto-expand section containing active item
  useEffect(() => {
    const activeSection = safeSections.find(section => 
      section.items.some(item => item.id === activeItem)
    );
    if (activeSection && collapsedSections[activeSection.id]) {
      setCollapsedSections(prev => ({
        ...prev,
        [activeSection.id]: false
      }));
    }
  }, [activeItem, safeSections]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleItemClick = (item: NavItem) => {
    // Navigate to root with the tab parameter
    // This ensures the dashboard correctly picks up the active tab on mount
    // and correctly handles cases where we are on a detail page.
    navigate(`/?tab=${item.id}`);
    
    // Always call onItemClick to ensure the local state is updated immediately
    // if we are already on the dashboard
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
        className={`w-full justify-start text-left min-h-9 h-auto py-1.5 ${
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"
        }`}
        onClick={() => handleItemClick(item)}
        data-testid={`nav-${item.id}`}
      >
        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="flex-1 text-sm leading-tight break-words">{item.label}</span>
      </Button>
    );
  };

  const sidebarContent = (
    <div 
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-visible"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      <div className="space-y-1">
        {safeSections.map((section, index) => {
          const isCollapsed = collapsedSections[section.id] ?? false;
          const hasActiveItem = section.items.some(item => item.id === activeItem);
          
          return (
            <div key={section.id}>
              {section.label ? (
                <Collapsible open={!isCollapsed} onOpenChange={() => toggleSection(section.id)}>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex-1 justify-start h-8 px-2 hover-elevate ${
                          hasActiveItem && isCollapsed ? 'bg-primary/10 text-primary' : ''
                        }`}
                        data-testid={`toggle-section-${section.id}`}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {section.label}
                        </span>
                        {hasActiveItem && isCollapsed && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    {section.quickActions && section.quickActions.length > 0 && !isCollapsed && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover-elevate flex-shrink-0"
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
                  <CollapsibleContent>
                    <div className="space-y-0.5 pl-2">
                      {section.items.map((item) => renderNavItem(item))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="space-y-0.5">
                  {section.items.map((item) => renderNavItem(item))}
                </div>
              )}
              {index < sections.length - 1 && (
                <div className="border-t border-border my-2" />
              )}
            </div>
          );
        })}
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
          fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-40 pt-20 px-3 pb-4
          transition-transform duration-300 ease-in-out
          flex flex-col h-full
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
