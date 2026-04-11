import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Settings, ClipboardCheck, Wrench, AlertTriangle,
  CheckCircle2, Clock, Plus, ArrowRight, UserCheck,
  CalendarCheck, CreditCard, FileText, BarChart2,
} from "lucide-react";
import type { User, Machine, ChecklistTemplate, SparePartCatalog, MaintenancePlan } from "@shared/schema";

interface AdminDashboardOverviewProps {
  onNavigateToTab: (tab: string) => void;
}

interface PlanFeatures {
  plan: string;
  modules: string[];
  allowedNavItems: string[];
}

export default function AdminDashboardOverview({ onNavigateToTab }: AdminDashboardOverviewProps) {
  const { data: planFeatures } = useQuery<PlanFeatures>({
    queryKey: ['/api/tenant/features'],
  });

  const modules: string[] = planFeatures?.modules ?? [];
  const hasModule = (mod: string) => modules.includes(mod);

  const hasMaintenance = hasModule('maintenance');
  const hasWhatsapp    = hasModule('whatsapp');
  const hasHR          = hasModule('hr_payroll');
  const hasInvoicing   = hasModule('invoicing');
  const hasInventory   = hasModule('basic_inventory');

  // Only fetch what the plan allows
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
    enabled: hasMaintenance,
  });

  const { data: checklists = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates'],
    enabled: hasWhatsapp,
  });

  const { data: spareParts = [] } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
    enabled: hasMaintenance,
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ['/api/maintenance-plans'],
    enabled: hasMaintenance,
  });

  const { data: hrStats } = useQuery<{ total: number; active: number }>({
    queryKey: ['/api/hr/employees/stats'],
    enabled: hasHR,
  });

  const { data: pendingLeaves } = useQuery<{ count: number }>({
    queryKey: ['/api/hr/leave-applications/pending-count'],
    enabled: hasHR,
  });

  const { data: payrollData } = useQuery<{ draftCount: number }>({
    queryKey: ['/api/hr/payroll/draft-count'],
    enabled: hasHR,
  });

  const activeUsers      = users.filter(u => u.role).length;
  const activeMachines   = machines.filter(m => m.status === 'active').length;
  const lowStockParts    = spareParts.filter(p =>
    p.currentStock !== null && p.reorderThreshold !== null && p.currentStock <= p.reorderThreshold
  ).length;
  const activePMPlans    = maintenancePlans.filter(p => p.isActive).length;

  // ── Build stats based on active modules ──────────────────────────────────────
  const stats = [
    {
      title: "Total Users",
      value: users.length,
      subtitle: `${activeUsers} with assigned roles`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      testId: "stat-total-users",
      always: true,
    },
    ...(hasHR ? [
      {
        title: "Total Employees",
        value: hrStats?.total ?? 0,
        subtitle: `${hrStats?.active ?? 0} active`,
        icon: UserCheck,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        testId: "stat-total-employees",
        action: "hr-employees",
        always: false,
      },
      {
        title: "Pending Leaves",
        value: pendingLeaves?.count ?? 0,
        subtitle: "Awaiting approval",
        icon: CalendarCheck,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        testId: "stat-pending-leaves",
        action: "hr-leaves",
        always: false,
      },
      {
        title: "Payroll Drafts",
        value: payrollData?.draftCount ?? 0,
        subtitle: "Pending approval",
        icon: CreditCard,
        color: "text-green-600",
        bgColor: "bg-green-100",
        testId: "stat-payroll-drafts",
        action: "hr-payroll",
        always: false,
      },
    ] : []),
    ...(hasMaintenance ? [
      {
        title: "Active Machines",
        value: activeMachines,
        subtitle: `${machines.length} total machines`,
        icon: Settings,
        color: "text-green-600",
        bgColor: "bg-green-100",
        testId: "stat-active-machines",
        action: "machines",
        always: false,
      },
    ] : []),
    ...(hasWhatsapp ? [
      {
        title: "Checklist Templates",
        value: checklists.length,
        subtitle: "Ready to use",
        icon: ClipboardCheck,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        testId: "stat-checklist-templates",
        always: false,
      },
    ] : []),
    ...(hasMaintenance ? [
      {
        title: "Low Stock Alerts",
        value: lowStockParts,
        subtitle: `${spareParts.length} parts total`,
        icon: AlertTriangle,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        testId: "stat-low-stock-alerts",
        always: false,
      },
    ] : []),
  ].filter(s => s.always || true);

  // ── Quick actions based on active modules ────────────────────────────────────
  const quickActions = [
    {
      title: "Add New User",
      description: "Create user account and assign role",
      icon: Users,
      action: "users",
      color: "text-blue-600",
      always: true,
    },
    ...(hasHR ? [
      {
        title: "Add Employee",
        description: "Register a new employee record",
        icon: UserCheck,
        action: "hr-employees",
        color: "text-indigo-600",
        always: false,
      },
      {
        title: "Process Payroll",
        description: "Run monthly payroll for employees",
        icon: CreditCard,
        action: "hr-payroll",
        color: "text-green-600",
        always: false,
      },
      {
        title: "Review Leaves",
        description: "Approve or reject leave requests",
        icon: CalendarCheck,
        action: "hr-leaves",
        color: "text-amber-600",
        always: false,
      },
      {
        title: "HR Reports",
        description: "View attendance and payroll reports",
        icon: BarChart2,
        action: "hr-reports",
        color: "text-purple-600",
        always: false,
      },
    ] : []),
    ...(hasMaintenance ? [
      {
        title: "Configure Machine",
        description: "Add or update machine settings",
        icon: Settings,
        action: "machines",
        color: "text-green-600",
        always: false,
      },
    ] : []),
    ...(hasWhatsapp ? [
      {
        title: "Build Checklist",
        description: "Create quality inspection checklist",
        icon: ClipboardCheck,
        action: "checklists",
        color: "text-purple-600",
        always: false,
      },
    ] : []),
    ...(hasMaintenance ? [
      {
        title: "Schedule Maintenance",
        description: "Plan preventive maintenance task",
        icon: Wrench,
        action: "maintenance",
        color: "text-orange-600",
        always: false,
      },
    ] : []),
    ...(hasInvoicing ? [
      {
        title: "Create Invoice",
        description: "Generate a new GST invoice",
        icon: FileText,
        action: "invoices",
        color: "text-teal-600",
        always: false,
      },
    ] : []),
  ].filter(a => a.always || true).slice(0, 5);

  // ── Dashboard title based on plan ────────────────────────────────────────────
  const dashboardTitle = hasHR && !hasMaintenance && !hasWhatsapp
    ? "HR & Payroll Dashboard"
    : "Dashboard Overview";
  const dashboardDesc = hasHR && !hasMaintenance && !hasWhatsapp
    ? "Manage your workforce, payroll, and attendance"
    : "Monitor your operations at a glance";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{dashboardTitle}</h2>
        <p className="text-muted-foreground mt-1">{dashboardDesc}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={stat.action ? "cursor-pointer" : ""}
              onClick={() => stat.action && onNavigateToTab(stat.action)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold" data-testid={stat.testId}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => onNavigateToTab(action.action)}
                className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:shadow-sm transition-all cursor-pointer text-left"
                data-testid={`quick-action-${action.action}`}
              >
                <div className={`${action.color} mt-1`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{action.title}</h4>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground mt-1" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* System Status — only for manufacturing plans */}
      {(hasMaintenance || hasWhatsapp) && (
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current operational status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hasMaintenance && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium">Active Machines</p>
                    <p className="text-xs text-muted-foreground" data-testid="status-active-machines">
                      {activeMachines} operational
                    </p>
                  </div>
                </div>
              )}
              {hasMaintenance && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">PM Schedules</p>
                    <p className="text-xs text-muted-foreground" data-testid="status-pm-schedules">
                      {activePMPlans} active plans
                    </p>
                  </div>
                </div>
              )}
              {hasWhatsapp && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Checklists</p>
                    <p className="text-xs text-muted-foreground" data-testid="status-checklists">
                      {checklists.length} templates ready
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low stock alert — only for maintenance plans */}
      {hasMaintenance && lowStockParts > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-orange-900 dark:text-orange-300">
                  <strong>{lowStockParts}</strong> spare parts are running low on stock
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                  Review inventory and generate purchase orders to avoid stockouts
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigateToTab('spare-parts')} data-testid="button-view-spare-parts">
                View Parts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending leaves alert — only for HR plans */}
      {hasHR && (pendingLeaves?.count ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-400">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-amber-900 dark:text-amber-300">
                  <strong>{pendingLeaves?.count}</strong> leave request{(pendingLeaves?.count ?? 0) !== 1 ? 's' : ''} awaiting your approval
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigateToTab('hr-leaves')} data-testid="button-review-leaves">
                Review Leaves
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
