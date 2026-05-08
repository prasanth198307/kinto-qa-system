import { useState } from "react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { VerticalNavSidebar, type NavSection } from "@/components/VerticalNavSidebar";
import { useTenantBranding } from "@/hooks/use-tenant-branding";

interface DashboardShellProps {
  title: string;
  onLogoutClick: () => void;
  notificationCount?: number;
  navSections: NavSection[];
  activeView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  onLogoutClick,
  notificationCount = 0,
  navSections,
  activeView,
  onNavigate,
  children,
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logoUrl, tenantName } = useTenantBranding();

  return (
    <>
      <GlobalHeader 
        onLogoutClick={onLogoutClick}
        notificationCount={notificationCount}
        noSidebarOffset={false}
        showMobileMenu={true}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex bg-background overflow-x-hidden" style={{ minHeight: '100dvh' }}>
        <VerticalNavSidebar
          sections={navSections}
          activeItem={activeView}
          onItemClick={onNavigate}
          title={title}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
          logoUrl={logoUrl}
          tenantName={tenantName}
        />
        
        <div
          className="flex-1 overflow-x-auto min-w-0 flex flex-col"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)' }}
        >
          <div className="flex-1">
            {children}
          </div>

          {/* Footer */}
          <footer className="border-t border-border px-6 py-3 flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted-foreground">
            <span>© 2026 MicroGrid. All rights reserved.</span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="hidden sm:inline">Powered by <strong className="text-foreground/70">SwachERP</strong></span>
          </footer>
        </div>
      </div>
    </>
  );
}
