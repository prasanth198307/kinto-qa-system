import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";
import { tNavLabel } from "@/lib/i18n-nav";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface NavSubSection {
  id: string;
  label: string;
  items: NavItem[];
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
  subSections?: NavSubSection[];
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
  logoUrl?: string | null;
  tenantName?: string | null;
}

export function VerticalNavSidebar({
  sections = [],
  activeItem,
  onItemClick,
  onLogout,
  title = "Dashboard",
  isMobileOpen = false,
  onMobileClose,
  logoUrl,
  tenantName,
}: VerticalNavSidebarProps) {
  const [, navigate] = useLocation();
  const { locale } = useI18n();
  const tn = (label?: string) => (label ? tNavLabel(label, locale) : label);
  const safeSections = sections || [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when mobile menu is open (Android + iOS)
  useEffect(() => {
    if (isMobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobileOpen]);

  // Helper: does a section (or any of its subSections) contain the active item?
  const sectionHasActive = (section: NavSection) =>
    section.items.some(i => i.id === activeItem) ||
    (section.subSections ?? []).some(sub => sub.items.some(i => i.id === activeItem));

  // Initialize collapsed state - default all collapsed, but always expand the active section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const STORAGE_VERSION = 'v2';
    let state: Record<string, boolean> = {};
    try {
      const version = localStorage.getItem('sidebarVersion');
      const saved = localStorage.getItem('sidebarCollapsedSections');
      if (version === STORAGE_VERSION && saved) {
        state = JSON.parse(saved);
      } else {
        localStorage.setItem('sidebarVersion', STORAGE_VERSION);
        safeSections.forEach(section => {
          if (section.label) state[section.id] = true;
          // Sub-sections start collapsed
          (section.subSections ?? []).forEach(sub => { state[sub.id] = true; });
        });
      }
    } catch (e) {
      safeSections.forEach(section => {
        if (section.label) state[section.id] = true;
        (section.subSections ?? []).forEach(sub => { state[sub.id] = true; });
      });
    }
    // Always expand the section (and sub-section) containing the current active item on mount
    safeSections.forEach(section => {
      if (sectionHasActive(section)) {
        state[section.id] = false;
        (section.subSections ?? []).forEach(sub => {
          if (sub.items.some(i => i.id === activeItem)) state[sub.id] = false;
        });
      }
    });
    return state;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsedSections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  // Auto-expand section (and sub-section) containing active item
  useEffect(() => {
    safeSections.forEach(section => {
      if (sectionHasActive(section)) {
        setCollapsedSections(prev => {
          const next = { ...prev };
          let changed = false;
          if (next[section.id]) { next[section.id] = false; changed = true; }
          (section.subSections ?? []).forEach(sub => {
            if (sub.items.some(i => i.id === activeItem) && next[sub.id]) {
              next[sub.id] = false; changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    });
  }, [activeItem, safeSections]);

  // Scroll active item into view after section expansion animation completes
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      const activeEl = scrollContainerRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [activeItem]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      // item.onClick handles its own navigation (e.g. setLocation('/hr/employees'))
      // Do NOT call onItemClick here — it would trigger the wrapper's onNavigate
      // which may call setLocation('/') and override the intended navigation.
      item.onClick();
    } else {
      navigate(`/?tab=${item.id}`);
      onItemClick(item.id);
    }

    // Scroll only the main content area to top — NOT the window or sidebar
    requestAnimationFrame(() => {
      const mainContent = document.querySelector<HTMLElement>('.flex-1.pt-16');
      if (mainContent) mainContent.scrollTop = 0;
    });

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
        className={`w-full justify-start text-left min-h-9 h-auto py-1.5 touch-manipulation ${
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"
        }`}
        onClick={() => handleItemClick(item)}
        data-testid={`nav-${item.id}`}
        data-active={isActive ? "true" : undefined}
      >
        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="flex-1 text-sm leading-tight break-words">{tn(item.label)}</span>
      </Button>
    );
  };

  return (
    <>
      {/* Mobile Sidebar Overlay — touch-action:none prevents background scroll-through */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[55]"
          onClick={onMobileClose}
          style={{ touchAction: 'none' }}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-[60]
          flex flex-col sidebar-full-height panel-slide
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        style={{ transition: 'transform 300ms ease-in-out' }}
        data-testid="vertical-nav-sidebar"
      >
        {/* Sidebar logo header — same height as GlobalHeader */}
        <div
          className="flex-shrink-0 flex items-center px-3 border-b border-border"
          style={{ height: 'calc(env(safe-area-inset-top, 0px) + 4rem)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenantName ?? "Company Logo"}
              className="h-10 w-auto object-contain max-w-[160px]"
              data-testid="img-tenant-logo-sidebar"
            />
          ) : (
            <img
              src="/swacherp-logo.png"
              alt="SwachERP"
              className="h-8 w-auto object-contain"
            />
          )}
        </div>

        {/* Nav content */}
        <div className="flex-1 min-h-0 px-3 pb-4 overflow-y-auto overflow-x-hidden scrollbar-visible"
          ref={scrollContainerRef}
          tabIndex={0}
          style={{
            scrollbarWidth: 'thin' as any,
            scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            outline: 'none',
          }}
          onKeyDown={(e) => {
            const container = e.currentTarget;
            if (e.key === 'ArrowDown') { e.preventDefault(); container.scrollBy({ top: 60, behavior: 'smooth' }); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); container.scrollBy({ top: -60, behavior: 'smooth' }); }
          }}
        >
          <div className="space-y-1 pt-2">
            {safeSections.map((section, index) => {
              const isCollapsed = collapsedSections[section.id] ?? false;
              const hasActiveItem = sectionHasActive(section);

              return (
                <div key={section.id}>
                  {section.label ? (
                    <Collapsible open={!isCollapsed} onOpenChange={() => toggleSection(section.id)}>
                      <div className="flex items-center justify-between mb-1 px-1">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`flex-1 justify-start h-8 px-2 touch-manipulation hover-elevate ${
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
                              {tn(section.label)}
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
                                className="h-6 w-6 hover-elevate flex-shrink-0 touch-manipulation"
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
                                    {tn(action.label)}
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
                          {/* Nested sub-sections (e.g. Gold ERP groups) */}
                          {(section.subSections ?? []).map((sub) => {
                            const subCollapsed = collapsedSections[sub.id] ?? true;
                            const subHasActive = sub.items.some(i => i.id === activeItem);
                            return (
                              <Collapsible
                                key={sub.id}
                                open={!subCollapsed}
                                onOpenChange={() => toggleSection(sub.id)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`w-full justify-start h-7 px-2 touch-manipulation hover-elevate ${
                                      subHasActive && subCollapsed ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                                    }`}
                                    data-testid={`toggle-subsection-${sub.id}`}
                                  >
                                    {subCollapsed ? (
                                      <ChevronRight className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                    )}
                                    <span className="text-xs font-medium">{tn(sub.label)}</span>
                                    {subHasActive && subCollapsed && (
                                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="space-y-0.5 pl-3">
                                    {sub.items.map((item) => renderNavItem(item))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
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
      </div>

      {/* Spacer for desktop layout */}
      <div className="hidden lg:block w-72 flex-shrink-0" />
    </>
  );
}
