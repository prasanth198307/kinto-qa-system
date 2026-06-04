import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert, Building2, CreditCard, Package, HardDrive,
  LayoutDashboard, LogOut, Loader2, ChevronRight, AlertTriangle, Video, Store, Settings, Shield, Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/super-admin/overview",        label: "Overview",        icon: LayoutDashboard },
  { path: "/super-admin/tenants",         label: "Tenants",         icon: Building2 },
  { path: "/super-admin/billing",         label: "Billing",         icon: CreditCard },
  { path: "/super-admin/plans",           label: "Plans",           icon: Package },
  { path: "/super-admin/module-catalog",  label: "Module Catalog",  icon: Store },
  { path: "/super-admin/setup-wizard",    label: "Setup Wizard",    icon: Sparkles },
  { path: "/super-admin/demo-requests",   label: "Demo Requests",   icon: Video },
  { path: "/super-admin/backups",         label: "Backups",         icon: HardDrive },
  { path: "/super-admin/security",        label: "Security",        icon: Shield },
  { path: "/super-admin/settings",        label: "Settings",        icon: Settings },
];

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function SuperAdminLayout({ children, title, subtitle, actions }: SuperAdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  const isInIframe = window.self !== window.top;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r bg-muted/30">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">SwachERP Admin</p>
            <p className="text-xs text-muted-foreground leading-tight">Super Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location === path || location.startsWith(path + "/");
            return (
              <button
                key={path}
                onClick={() => setLocation(path)}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover-elevate"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {active && <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t">
          <Button
            variant="destructive"
            className="w-full"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            {logoutMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <LogOut className="h-4 w-4" />}
            <span className="ml-2">Logout</span>
          </Button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Iframe warning banner */}
        {isInIframe && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-300 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200 shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              Session cookies are blocked in the preview pane — authentication won't persist.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => window.open(window.location.href, "_blank")}
            >
              Open in New Tab
            </Button>
          </div>
        )}

        {/* Page header */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b bg-background shrink-0">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
