import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import Landing from "@/components/Landing";
import RoleSelector from "@/components/RoleSelector";
import { TopRightHeader } from "@/components/TopRightHeader";
import { DashboardShell } from "@/components/DashboardShell";
import { OperatorDashboardShell } from "@/components/OperatorDashboardShell";
import DashboardStats from "@/components/DashboardStats";
import ChecklistForm from "@/components/ChecklistForm";
import MachineCard from "@/components/MachineCard";
import ChecklistHistoryTable from "@/components/ChecklistHistoryTable";
import MaintenanceSchedule from "@/components/MaintenanceSchedule";
import AdminDashboardOverview from "@/components/AdminDashboardOverview";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminMachineConfig from "@/components/AdminMachineConfig";
import AdminChecklistBuilder from "@/components/AdminChecklistBuilder";
import AdminSparePartsManagement from "@/components/AdminSparePartsManagement";
import AdminMachineTypeConfig from "@/components/AdminMachineTypeConfig";
import AdminPMTaskListTemplates from "@/components/AdminPMTaskListTemplates";
import SchedulePMDialog from "@/components/SchedulePMDialog";
import PurchaseOrderManagement from "@/components/PurchaseOrderManagement";
import PMHistoryView from "@/components/PMHistoryView";
import PMExecutionDialog from "@/components/PMExecutionDialog";
import InventoryManagement from "@/pages/inventory-management";
import RawMaterialTypeMaster from "@/pages/raw-material-type-master";
import ProductionManagement from "@/pages/production-management";
import ProductionEntries from "@/pages/production-entries";
import MachineStartupReminders from "@/pages/machine-startup-reminders";
import NotificationSettings from "@/pages/notification-settings";
import Reports from "@/pages/reports";
import WhatsAppAnalytics from "@/pages/WhatsAppAnalytics";
import TemplateManagement from "@/pages/template-management";
import InventorySummaryDashboard from "@/components/InventorySummaryDashboard";
import TodayProductionStats from "@/components/TodayProductionStats";
import RolePermissionsView from "@/components/RolePermissionsView";
import RoleManagement from "@/components/RoleManagement";
import { ManagerChecklistAssignment } from "@/components/ManagerChecklistAssignment";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";
import { OperatorAssignedChecklists } from "@/components/OperatorAssignedChecklists";
import { VerticalNavSidebar, type NavSection } from "@/components/VerticalNavSidebar";
import { CheckCircle, Clock, XCircle, AlertTriangle, ClipboardCheck, Settings, Calendar, Users, FileText, Wrench, Plus, LogOut, Package, Layers, ShoppingCart, ListChecks, History, LayoutDashboard, Archive, Shield, Factory, Box, CheckCircle2, Building2, Receipt, TrendingUp, Bell, FileStack, Truck } from "lucide-react";
import SalesDashboard from "@/components/SalesDashboard";
import ReviewerDashboardPage from "@/pages/ReviewerDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import InvoiceDetail from "@/pages/invoice-detail";
import DispatchTracking from "@/pages/dispatch-tracking";
import ChecklistsPage from "@/pages/checklists";

type Role = 'admin' | 'operator' | 'reviewer' | 'manager';

function OperatorDashboard() {
  const { logoutMutation } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'checklist' | 'history' | 'production'>('dashboard');

  const mockStats = [
    { label: 'Pending', value: 3, icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { label: 'Completed Today', value: 5, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'In Review', value: 2, icon: XCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Alerts', value: 1, icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];

  const mockTasks = [
    { id: '1', name: 'Clean the Machine', verificationCriteria: 'Wipe down surfaces and remove any spills', result: null, remarks: '' },
    { id: '2', name: 'Check for Leaks', verificationCriteria: 'Inspect hoses and fittings for leaks', result: null, remarks: '' },
    { id: '3', name: 'Inspect Safety Features', verificationCriteria: 'Test emergency stop buttons', result: null, remarks: '' },
    { id: '4', name: 'Functionality Check', verificationCriteria: 'Run a sample batch', result: null, remarks: '' }
  ];

  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'You', status: 'approved' as const },
    { id: '2', machine: 'PET Blowing Machine', date: 'Oct 31, 2025', shift: 'Afternoon', operator: 'You', status: 'in_review' as const },
  ];

  const bottomNav = (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t">
      <div className="flex">
        <button
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeView === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveView('dashboard')}
          data-testid="tab-dashboard"
        >
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-xs">Dashboard</span>
        </button>
        <button
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeView === 'history' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveView('history')}
          data-testid="tab-history"
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">History</span>
        </button>
        <button
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeView === 'production' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveView('production')}
          data-testid="tab-production"
        >
          <Factory className="h-5 w-5" />
          <span className="text-xs">Production</span>
        </button>
      </div>
    </div>
  );

  return (
    <OperatorDashboardShell
      title="Operator Dashboard"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={1}
      bottomNav={bottomNav}
    >
      {activeView === 'dashboard' && (
        <div className="p-4 space-y-6">
          <DashboardStats stats={mockStats} />
          
          <OperatorAssignedChecklists />
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Assigned Machines</h3>
            <div className="space-y-3">
              <MachineCard
                name="RFC Machine"
                type="Rinse-Fill-Cap"
                status="active"
                lastMaintenance="Oct 28, 2025"
                onClick={() => setActiveView('checklist')}
              />
              <MachineCard
                name="PET Blowing Machine"
                type="Bottle Manufacturing"
                status="active"
                lastMaintenance="Oct 30, 2025"
                onClick={() => setActiveView('checklist')}
              />
            </div>
          </div>
        </div>
      )}

      {activeView === 'checklist' && (
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => setActiveView('dashboard')}
            className="mb-4"
            data-testid="button-back"
          >
            ← Back to Dashboard
          </Button>
          <ChecklistForm
            machineName="RFC Machine"
            tasks={mockTasks}
            onSubmit={() => setActiveView('dashboard')}
          />
        </div>
      )}

      {activeView === 'history' && (
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">My Submissions</h3>
          <ChecklistHistoryTable records={mockRecords} />
        </div>
      )}

      {activeView === 'production' && (
        <ProductionManagement />
      )}
    </OperatorDashboardShell>
  );
}

function ReviewerDashboard() {
  const { logoutMutation } = useAuth();
  const [activeView, setActiveView] = useState('submissions');

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navSections: NavSection[] = [
    {
      id: "main",
      items: [
        {
          id: "submissions",
          label: "Review Submissions",
          icon: ClipboardCheck,
        },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'submissions':
        return <ReviewerDashboardPage />;
      default:
        return <ReviewerDashboardPage />;
    }
  };

  return (
    <DashboardShell
      title="Reviewer Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
    </DashboardShell>
  );
}

function ManagerDashboard() {
  const { logoutMutation } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'Ramesh Kumar', status: 'in_review' as const },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navSections: NavSection[] = [
    {
      id: "main",
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          id: "assignments",
          label: "Assignments",
          icon: ClipboardCheck,
        },
        {
          id: "reports",
          label: "Reports",
          icon: FileText,
        },
      ],
    },
    {
      id: "production-section",
      label: "Production",
      items: [
        { id: "products", label: "Product Master", icon: Package },
        { id: "raw-materials", label: "Raw Materials", icon: Box },
        { id: "finished-goods", label: "Finished Goods", icon: CheckCircle2 },
      ],
      quickActions: [
        {
          id: "add-product",
          label: "Add Product",
          icon: Package,
          onClick: () => setActiveView("products"),
        },
        {
          id: "add-raw-material",
          label: "Add Raw Material",
          icon: Box,
          onClick: () => setActiveView("raw-materials"),
        },
        {
          id: "add-finished-good",
          label: "Add Finished Good",
          icon: CheckCircle2,
          onClick: () => setActiveView("finished-goods"),
        },
      ],
    },
    {
      id: "inventory-section",
      label: "Inventory",
      items: [
        { id: "uom", label: "Unit of Measurement", icon: Layers },
        { id: "vendors", label: "Vendor Master", icon: Building2 },
        { id: "raw-material-types", label: "Raw Material Types", icon: Archive },
      ],
      quickActions: [
        {
          id: "add-uom",
          label: "Add UOM",
          icon: Layers,
          onClick: () => setActiveView("uom"),
        },
        {
          id: "add-vendor",
          label: "Add Vendor",
          icon: Building2,
          onClick: () => setActiveView("vendors"),
        },
        {
          id: "add-raw-material-type",
          label: "Add Material Type",
          icon: Archive,
          onClick: () => setActiveView("raw-material-types"),
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      items: [
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
        { id: "raw-material-issuance", label: "Raw Material Issuance", icon: Package },
        { id: "production-entries", label: "Production Entries", icon: ListChecks },
        { id: "gatepasses", label: "Gatepasses", icon: FileText },
        { id: "invoices", label: "Invoices", icon: FileText },
        { id: "dispatch-tracking", label: "Dispatch Tracking", icon: Truck },
      ],
      quickActions: [
        {
          id: "add-purchase-order",
          label: "Add Purchase Order",
          icon: ShoppingCart,
          onClick: () => setActiveView("purchase-orders"),
        },
        {
          id: "create-issuance",
          label: "Create Issuance",
          icon: Package,
          onClick: () => setActiveView("raw-material-issuance"),
        },
        {
          id: "create-gatepass",
          label: "Create Gatepass",
          icon: FileText,
          onClick: () => setActiveView("gatepasses"),
        },
        {
          id: "create-invoice",
          label: "Create Invoice",
          icon: FileText,
          onClick: () => setActiveView("invoices"),
        },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-4">
            <div className="p-4 space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2">Awaiting Final Approval</h3>
                <p className="text-3xl font-bold text-primary">{mockRecords.length}</p>
              </Card>

              <TodayProductionStats />

              <PendingPaymentsDashboard />

              <div>
                <h3 className="text-base font-semibold mb-3">For Your Approval</h3>
                <ChecklistHistoryTable records={mockRecords} />
              </div>
            </div>
            <InventorySummaryDashboard />
          </div>
        );
      case 'assignments':
        return (
          <div className="p-4">
            <ManagerChecklistAssignment />
          </div>
        );
      case 'uom':
      case 'products':
      case 'raw-materials':
      case 'finished-goods':
      case 'vendors':
        return <InventoryManagement activeTab={activeView} />;
      case 'raw-material-types':
        return <RawMaterialTypeMaster />;
      case 'purchase-orders':
        return (
          <div className="p-4">
            <PurchaseOrderManagement />
          </div>
        );
      case 'raw-material-issuance':
      case 'gatepasses':
      case 'invoices':
        return <ProductionManagement activeTab={activeView} />;
      case 'production-entries':
        return <ProductionEntries />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'reports':
        return <Reports showHeader={false} />;
      default:
        return (
          <div className="space-y-4">
            <div className="p-4 space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2">Awaiting Final Approval</h3>
                <p className="text-3xl font-bold text-primary">{mockRecords.length}</p>
              </Card>
              <TodayProductionStats />
            </div>
            <InventorySummaryDashboard />
          </div>
        );
    }
  };

  return (
    <DashboardShell
      title="Manager Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
    </DashboardShell>
  );
}

function AdminDashboard() {
  const { logoutMutation } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<any>(null);

  const { data: maintenancePlans = [] } = useQuery<any[]>({
    queryKey: ['/api/maintenance-plans'],
  });

  const mockMaintenanceTasks = maintenancePlans.length > 0 
    ? maintenancePlans.map((plan: any) => {
        const isActive = plan.isActive === true || plan.isActive === 'true';
        const isOverdue = plan.nextDueDate && new Date(plan.nextDueDate) < new Date();
        const status = !isActive ? 'completed' : (isOverdue ? 'overdue' : 'upcoming');
        return {
          id: plan.id,
          machine: plan.machineId || 'Unassigned',
          taskType: plan.planName,
          scheduledDate: plan.nextDueDate ? new Date(plan.nextDueDate).toLocaleDateString() : 'Not scheduled',
          status: status as 'upcoming' | 'overdue' | 'completed',
          assignedTo: plan.assignedTo || 'Unassigned',
          planData: plan,
        };
      })
    : [];

  const handleCompletePM = (task: any) => {
    if (task.planData) {
      setSelectedPlanForExecution(task.planData);
      setIsExecutionDialogOpen(true);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navSections: NavSection[] = [
    {
      id: "main",
      items: [
        {
          id: "overview",
          label: "Overview Dashboard",
          icon: LayoutDashboard,
        },
        {
          id: "sales-dashboard",
          label: "Sales Dashboard",
          icon: TrendingUp,
        },
        {
          id: "reports",
          label: "Reports",
          icon: FileText,
        },
      ],
    },
    {
      id: "config-section",
      label: "Configuration",
      items: [
        { id: "users", label: "Users", icon: Users },
        { id: "role-permissions", label: "Role Permissions", icon: Shield },
        { id: "machines", label: "Machines", icon: Settings },
        { id: "machine-types", label: "Machine Types", icon: Layers },
        { id: "spare-parts", label: "Spare Parts", icon: Package },
        { id: "pm-templates", label: "PM Templates", icon: ListChecks },
        { id: "template-management", label: "Invoice Templates", icon: FileStack },
        { id: "uom", label: "Unit of Measurement", icon: Layers },
        { id: "vendors", label: "Vendor Master", icon: Building2 },
        { id: "raw-material-types", label: "Raw Material Types", icon: Archive },
        { id: "notification-settings", label: "Notification Settings", icon: Bell },
      ],
      quickActions: [
        {
          id: "add-user",
          label: "Add User",
          icon: Users,
          onClick: () => setActiveView("users"),
        },
        {
          id: "add-machine",
          label: "Add Machine",
          icon: Settings,
          onClick: () => setActiveView("machines"),
        },
        {
          id: "add-spare-part",
          label: "Add Spare Part",
          icon: Package,
          onClick: () => setActiveView("spare-parts"),
        },
        {
          id: "add-vendor",
          label: "Add Vendor",
          icon: Building2,
          onClick: () => setActiveView("vendors"),
        },
      ],
    },
    {
      id: "production-section",
      label: "Production",
      items: [
        { id: "products", label: "Product Master", icon: Package },
        { id: "checklists", label: "Checklist Builder", icon: FileText },
        { id: "raw-materials", label: "Raw Materials", icon: Box },
        { id: "finished-goods", label: "Finished Goods", icon: CheckCircle2 },
      ],
      quickActions: [
        {
          id: "add-product",
          label: "Add Product",
          icon: Package,
          onClick: () => setActiveView("products"),
        },
        {
          id: "add-raw-material",
          label: "Add Raw Material",
          icon: Box,
          onClick: () => setActiveView("raw-materials"),
        },
        {
          id: "add-finished-good",
          label: "Add Finished Good",
          icon: CheckCircle2,
          onClick: () => setActiveView("finished-goods"),
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      items: [
        { id: "maintenance", label: "Maintenance", icon: Wrench },
        { id: "pm-history", label: "PM History", icon: History },
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      ],
      quickActions: [
        {
          id: "schedule-maintenance",
          label: "Schedule Maintenance",
          icon: Wrench,
          onClick: () => setActiveView("maintenance"),
        },
        {
          id: "add-purchase-order",
          label: "Add Purchase Order",
          icon: ShoppingCart,
          onClick: () => setActiveView("purchase-orders"),
        },
      ],
    },
    {
      id: "production-operations",
      label: "Production Operations",
      items: [
        { id: "raw-material-issuance", label: "Raw Material Issuance", icon: Package },
        { id: "production-entries", label: "Production Entries", icon: ListChecks },
        { id: "gatepasses", label: "Gatepasses", icon: FileText },
        { id: "invoices", label: "Sales Invoices", icon: Receipt },
        { id: "dispatch-tracking", label: "Dispatch Tracking", icon: Truck },
        { id: "machine-startup-reminders", label: "Machine Startup Reminders", icon: Bell },
        { id: "whatsapp-analytics", label: "WhatsApp Analytics", icon: TrendingUp },
      ],
      quickActions: [
        {
          id: "create-issuance",
          label: "Create Issuance",
          icon: Package,
          onClick: () => setActiveView("raw-material-issuance"),
        },
        {
          id: "create-gatepass",
          label: "Create Gatepass",
          icon: FileText,
          onClick: () => setActiveView("gatepasses"),
        },
        {
          id: "create-invoice",
          label: "Create Invoice",
          icon: Receipt,
          onClick: () => setActiveView("invoices"),
        },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <PendingPaymentsDashboard />
            <InventorySummaryDashboard />
          </div>
        );
      case 'users':
        return (
          <div className="p-4">
            <AdminUserManagement />
          </div>
        );
      case 'role-permissions':
        return (
          <div className="p-4">
            <RoleManagement />
          </div>
        );
      case 'machines':
        return (
          <div className="p-4">
            <AdminMachineConfig />
          </div>
        );
      case 'checklists':
        return (
          <div className="p-4">
            <AdminChecklistBuilder />
          </div>
        );
      case 'spare-parts':
        return (
          <div className="p-4">
            <AdminSparePartsManagement />
          </div>
        );
      case 'machine-types':
        return (
          <div className="p-4">
            <AdminMachineTypeConfig />
          </div>
        );
      case 'pm-templates':
        return (
          <div className="p-4">
            <AdminPMTaskListTemplates />
          </div>
        );
      case 'template-management':
        return (
          <div className="p-4">
            <TemplateManagement />
          </div>
        );
      case 'maintenance':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Preventive Maintenance</h2>
              <Button onClick={() => setIsPMDialogOpen(true)} data-testid="button-add-maintenance">
                <Plus className="h-4 w-4 mr-1" />
                Schedule PM
              </Button>
            </div>
            <MaintenanceSchedule tasks={mockMaintenanceTasks} onComplete={handleCompletePM} />
          </div>
        );
      case 'pm-history':
        return (
          <div className="p-4">
            <PMHistoryView />
          </div>
        );
      case 'purchase-orders':
        return (
          <div className="p-4">
            <PurchaseOrderManagement />
          </div>
        );
      case 'uom':
      case 'products':
      case 'raw-materials':
      case 'finished-goods':
      case 'vendors':
        return <InventoryManagement activeTab={activeView} />;
      case 'raw-material-types':
        return <RawMaterialTypeMaster />;
      case 'raw-material-issuance':
      case 'gatepasses':
      case 'invoices':
        return <ProductionManagement activeTab={activeView} />;
      case 'production-entries':
        return <ProductionEntries />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'reports':
        return <Reports showHeader={false} />;
      default:
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <InventorySummaryDashboard />
          </div>
        );
    }
  };

  return (
    <DashboardShell
      title="Admin Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
      
      <SchedulePMDialog open={isPMDialogOpen} onOpenChange={setIsPMDialogOpen} />
      <PMExecutionDialog 
        open={isExecutionDialogOpen} 
        onOpenChange={setIsExecutionDialogOpen} 
        plan={selectedPlanForExecution} 
      />
    </DashboardShell>
  );
}

function RoleAssignment() {
  const { toast } = useToast();
  
  const setRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      return await apiRequest('POST', '/api/auth/set-role', { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role assigned",
        description: "Your role has been assigned successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to assign role. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <RoleSelector 
      onRoleSelect={(role) => {
        setRoleMutation.mutate(role);
      }}
    />
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!(user as any)?.role) {
    return <RoleAssignment />;
  }

  const role = (user as any).role as Role;

  return (
    <>
      {role === 'operator' && <OperatorDashboard />}
      {role === 'reviewer' && <ReviewerDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'admin' && <AdminDashboard />}
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/checklists" component={ChecklistsPage} />
      <ProtectedRoute path="/invoice/:id" component={InvoiceDetail} />
      <ProtectedRoute path="/dispatch-tracking" component={DispatchTracking} />
      <ProtectedRoute path="/" component={AuthenticatedApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
