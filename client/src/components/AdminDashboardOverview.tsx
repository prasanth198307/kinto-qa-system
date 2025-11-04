import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Settings, 
  ClipboardCheck, 
  Package, 
  Wrench, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight
} from "lucide-react";
import type { User, Machine, ChecklistTemplate, SparePartCatalog, MaintenancePlan } from "@shared/schema";

interface AdminDashboardOverviewProps {
  onNavigateToTab: (tab: string) => void;
}

export default function AdminDashboardOverview({ onNavigateToTab }: AdminDashboardOverviewProps) {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: checklists = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates'],
  });

  const { data: spareParts = [] } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ['/api/maintenance-plans'],
  });

  // Calculate statistics
  const activeUsers = users.filter(u => u.role).length;
  const activeMachines = machines.filter(m => m.status === 'active').length;
  const lowStockParts = spareParts.filter(p => 
    p.currentStock !== null && 
    p.reorderThreshold !== null && 
    p.currentStock <= p.reorderThreshold
  ).length;
  const activePMPlans = maintenancePlans.filter(p => p.isActive).length;

  const stats = [
    {
      title: "Total Users",
      value: users.length,
      subtitle: `${activeUsers} with assigned roles`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      testId: "stat-total-users"
    },
    {
      title: "Active Machines",
      value: activeMachines,
      subtitle: `${machines.length} total machines`,
      icon: Settings,
      color: "text-green-600",
      bgColor: "bg-green-100",
      testId: "stat-active-machines"
    },
    {
      title: "Checklist Templates",
      value: checklists.length,
      subtitle: "Ready to use",
      icon: ClipboardCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      testId: "stat-checklist-templates"
    },
    {
      title: "Low Stock Alerts",
      value: lowStockParts,
      subtitle: `${spareParts.length} parts total`,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      testId: "stat-low-stock-alerts"
    }
  ];

  const quickActions = [
    {
      title: "Add New User",
      description: "Create user account and assign role",
      icon: Users,
      action: "users",
      color: "text-blue-600"
    },
    {
      title: "Configure Machine",
      description: "Add or update machine settings",
      icon: Settings,
      action: "machines",
      color: "text-green-600"
    },
    {
      title: "Build Checklist",
      description: "Create quality inspection checklist",
      icon: ClipboardCheck,
      action: "checklists",
      color: "text-purple-600"
    },
    {
      title: "Schedule Maintenance",
      description: "Plan preventive maintenance task",
      icon: Wrench,
      action: "maintenance",
      color: "text-orange-600"
    }
  ];

  const recentActivity = [
    { 
      type: "user", 
      message: "New user registered", 
      time: "2 hours ago",
      icon: Users,
      color: "text-blue-600"
    },
    { 
      type: "machine", 
      message: "RFC Machine status updated", 
      time: "5 hours ago",
      icon: Settings,
      color: "text-green-600"
    },
    { 
      type: "checklist", 
      message: "Daily inspection checklist completed", 
      time: "1 day ago",
      icon: CheckCircle2,
      color: "text-purple-600"
    },
    { 
      type: "maintenance", 
      message: "PM task scheduled for next week", 
      time: "2 days ago",
      icon: Calendar,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">Monitor your QA system at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid={stat.testId}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.subtitle}</p>
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

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => onNavigateToTab(action.action)}
                  className="w-full flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition-all cursor-pointer text-left"
                  data-testid={`quick-action-${action.action}`}
                >
                  <div className={`${action.color} mt-1`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 mt-1" />
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`${activity.color} mt-1`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-activity">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {lowStockParts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-900">
                  <strong>{lowStockParts}</strong> spare parts are running low on stock
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Review inventory and generate purchase orders to avoid stockouts
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-orange-300" 
                onClick={() => onNavigateToTab('spare-parts')}
                data-testid="button-view-spare-parts"
              >
                View Parts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current operational status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Active Machines</p>
                <p className="text-xs text-gray-500" data-testid="status-active-machines">
                  {activeMachines} operational
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">PM Schedules</p>
                <p className="text-xs text-gray-500" data-testid="status-pm-schedules">
                  {activePMPlans} active plans
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Checklists</p>
                <p className="text-xs text-gray-500" data-testid="status-checklists">
                  {checklists.length} templates ready
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
