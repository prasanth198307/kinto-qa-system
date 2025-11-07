import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, X, LogOut } from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  children?: NavItem[];
}

interface VerticalNavSidebarProps {
  sections: NavSection[];
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onLogout?: () => void;
  title?: string;
}

export function VerticalNavSidebar({
  sections,
  activeItem,
  onItemClick,
  onLogout,
  title = "Dashboard",
}: VerticalNavSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["configuration"])
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleItemClick = (item: NavItem) => {
    if (item.children) {
      toggleSection(item.id);
    } else {
      onItemClick(item.id);
      if (item.onClick) {
        item.onClick();
      }
      setIsMobileOpen(false);
    }
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;
    const isExpanded = expandedSections.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <Button
          variant={isActive ? "default" : "ghost"}
          className={`w-full justify-start text-left min-h-11 ${
            isChild ? "pl-7" : ""
          } ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
          onClick={() => handleItemClick(item)}
          data-testid={`nav-${item.id}`}
        >
          <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          {hasChildren && (
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          )}
        </Button>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={section.id}>
              {section.label && (
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-2">
                  {section.label}
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
    </div>
  );

  return (
    <>
      {/* Mobile Header with Menu Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          data-testid="button-mobile-menu"
        >
          {isMobileOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="w-10" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-40 p-4
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="hidden lg:block mb-6">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        {sidebarContent}
      </div>

      {/* Spacer for desktop layout */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  );
}
