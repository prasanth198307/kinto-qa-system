import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password";
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
import ProductionReconciliations from "@/pages/production-reconciliations";
import ProductionReconciliationReport from "@/pages/production-reconciliation-report";
import VarianceAnalytics from "@/pages/variance-analytics";
import SalesReturns from "@/pages/sales-returns";
import MachineStartupReminders from "@/pages/machine-startup-reminders";
import NotificationSettings from "@/pages/notification-settings";
import Reports from "@/pages/reports";
import WhatsAppAnalytics from "@/pages/WhatsAppAnalytics";
import TemplateManagement from "@/pages/template-management";
import ProductCategories from "@/pages/product-categories";
import ProductTypes from "@/pages/product-types";
import VendorTypes from "@/pages/vendor-types";
import VendorManagement from "@/components/VendorManagement";
import PendingPayments from "@/pages/pending-payments";
import PaymentManagement from "@/pages/payment-management";
import CreditNotes from "@/pages/credit-notes";
import CancelledInvoices from "@/pages/cancelled-invoices";
import WriteOffReport from "@/pages/write-off-report";
import InventorySummaryDashboard from "@/components/InventorySummaryDashboard";
import TodayProductionStats from "@/components/TodayProductionStats";
import RolePermissionsView from "@/components/RolePermissionsView";
import RoleManagement from "@/components/RoleManagement";
import { ManagerChecklistAssignment } from "@/components/ManagerChecklistAssignment";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";
import { OperatorAssignedChecklists } from "@/components/OperatorAssignedChecklists";
import { VerticalNavSidebar, type NavSection } from "@/components/VerticalNavSidebar";
import { CheckCircle, Clock, XCircle, AlertTriangle, ClipboardCheck, ClipboardList, Settings, Calendar, Users, FileText, FileX, Wrench, Plus, LogOut, Package, Layers, ShoppingCart, ListChecks, History, LayoutDashboard, Archive, Shield, Factory, Box, CheckCircle2, Building2, Receipt, TrendingUp, Bell, FileStack, Truck, Calculator, IndianRupee, CreditCard, Upload, FolderOpen, Wallet } from "lucide-react";
import SalesDashboard from "@/components/SalesDashboard";
import VendorAnalytics from "@/pages/vendor-analytics";
import ReviewerDashboardPage from "@/pages/ReviewerDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import InvoiceDetail from "@/pages/invoice-detail";
import DispatchTracking from "@/pages/dispatch-tracking";
import ChecklistsPage from "@/pages/checklists";
import DataImport from "@/pages/data-import";
import DocumentsPage from "@/pages/documents";
import ExpensesPage from "@/pages/expenses";
import CashRegisterPage from "@/pages/cash-register";
import CashRegisterReport from "@/pages/cash-register-report";
import CashRegisterVoucherPrint from "@/pages/cash-register-voucher-print";
import VendorHistory from "@/pages/vendor-history";
import VendorHistoryDetail from "@/pages/vendor-history-detail";

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
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('overview');

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Use the same navigation as admin dashboard for consistency, filtered by role
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
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
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      {renderContent()}
    </DashboardShell>
  );
}

function ManagerDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('overview');
  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'Ramesh Kumar', status: 'in_review' as const },
  ];

  // Handle tab parameter from URL (for Cancel & Reissue flow and other deep links)
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab');
    
    if (tab) {
      // Map valid tab values to activeView
      const validTabs = ['invoices', 'gatepasses', 'raw-material-issuance'];
      if (validTabs.includes(tab)) {
        setActiveView(tab);
      }
    }
  }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Use the same navigation as admin dashboard for consistency, filtered by role
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);

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
      case 'production-reconciliations':
        return <ProductionReconciliations />;
      case 'production-reconciliation-report':
        return <ProductionReconciliationReport />;
      case 'variance-analytics':
        return <VarianceAnalytics />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'cancelled-invoices':
        return <CancelledInvoices showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
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
  const [location, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('overview');
  const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<any>(null);

  // Handle tab parameter from URL (for Cancel & Reissue flow and other deep links)
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab');
    
    if (tab) {
      // Map valid tab values to activeView
      const validTabs = ['invoices', 'gatepasses', 'raw-material-issuance'];
      if (validTabs.includes(tab)) {
        setActiveView(tab);
      }
    }
  }, [location]);

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
      id: "dashboard",
      label: "Dashboard & Analytics",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "sales-dashboard", label: "Sales Dashboard", icon: TrendingUp },
        { id: "vendor-analytics", label: "Vendor Analytics", icon: Building2, onClick: () => setLocation('/vendor-analytics') },
        { id: "reports", label: "Reports", icon: FileText },
      ],
    },
    {
      id: "quality-section",
      label: "Quality & Checklists",
      items: [
        { id: "checklists", label: "Checklist Builder", icon: FileText },
        { id: "checklist-assignments", label: "Checklist Assignments", icon: ClipboardList },
        { id: "machine-startup-reminders", label: "Machine Startup Reminders", icon: Bell },
        { id: "whatsapp-analytics", label: "WhatsApp Analytics", icon: TrendingUp },
      ],
    },
    {
      id: "production-section",
      label: "Production & Inventory",
      items: [
        { id: "products", label: "Product Master", icon: Package },
        { id: "product-categories", label: "Product Categories", icon: Layers },
        { id: "product-types", label: "Product Types", icon: Archive },
        { id: "raw-materials", label: "Raw Materials", icon: Box },
        { id: "finished-goods", label: "Finished Goods", icon: CheckCircle2 },
        { id: "raw-material-issuance", label: "Raw Material Issuance", icon: Package },
        { id: "production-entries", label: "Production Entries", icon: ListChecks },
        { id: "production-reconciliations", label: "Production Reconciliation", icon: Calculator },
        { id: "production-reconciliation-report", label: "Reconciliation Report", icon: FileStack },
        { id: "variance-analytics", label: "Variance Analytics", icon: TrendingUp },
      ],
      quickActions: [
        { id: "add-product", label: "Add Product", icon: Package, onClick: () => setActiveView("products") },
        { id: "add-raw-material", label: "Add Raw Material", icon: Box, onClick: () => setActiveView("raw-materials") },
        { id: "create-issuance", label: "Create Issuance", icon: Package, onClick: () => setActiveView("raw-material-issuance") },
      ],
    },
    {
      id: "finance-section",
      label: "Finance & Sales",
      items: [
        { id: "invoices", label: "Sales Invoices", icon: Receipt },
        { id: "vendor-history", label: "Vendor History", icon: History, onClick: () => setLocation('/vendor-history') },
        { id: "pending-payments", label: "Pending Payments", icon: IndianRupee, onClick: () => setLocation('/pending-payments') },
        { id: "payment-management", label: "Payment Management", icon: CreditCard, onClick: () => setLocation('/payment-management') },
        { id: "credit-notes", label: "Credit Notes", icon: FileText, onClick: () => setLocation('/credit-notes') },
        { id: "cancelled-invoices", label: "Cancelled Invoices", icon: FileX, onClick: () => setLocation('/cancelled-invoices') },
        { id: "write-off-report", label: "Write-Off Report", icon: XCircle, onClick: () => setLocation('/write-off-report') },
        { id: "sales-returns", label: "Sales Returns", icon: Package, onClick: () => setLocation('/sales-returns') },
      ],
      quickActions: [
        { id: "create-invoice", label: "Create Invoice", icon: Receipt, onClick: () => setActiveView("invoices") },
        { id: "view-pending-payments", label: "View Payments", icon: IndianRupee, onClick: () => setActiveView("pending-payments") },
      ],
    },
    {
      id: "dispatch-section",
      label: "Dispatch & Logistics",
      items: [
        { id: "gatepasses", label: "Gatepasses", icon: FileText },
        { id: "dispatch-tracking", label: "Dispatch Tracking", icon: Truck },
      ],
      quickActions: [
        { id: "create-gatepass", label: "Create Gatepass", icon: FileText, onClick: () => setActiveView("gatepasses") },
      ],
    },
    {
      id: "cash-section",
      label: "Cash & Expenses",
      items: [
        { id: "cash-register", label: "Daily Cash Register", icon: Calculator, onClick: () => setLocation('/cash-register') },
        { id: "cash-register-report", label: "Cash Register Report", icon: FileStack, onClick: () => setLocation('/cash-register-report') },
        { id: "expenses", label: "Expense Vouchers", icon: Wallet, onClick: () => setLocation('/expenses') },
        { id: "documents", label: "Documents", icon: FolderOpen, onClick: () => setLocation('/documents') },
      ],
    },
    {
      id: "maintenance-section",
      label: "Maintenance",
      items: [
        { id: "maintenance", label: "PM Schedule", icon: Wrench },
        { id: "pm-history", label: "PM History", icon: History },
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      ],
      quickActions: [
        { id: "schedule-maintenance", label: "Schedule PM", icon: Wrench, onClick: () => setActiveView("maintenance") },
        { id: "add-purchase-order", label: "Add PO", icon: ShoppingCart, onClick: () => setActiveView("purchase-orders") },
      ],
    },
    {
      id: "master-section",
      label: "Master Data",
      items: [
        { id: "users", label: "Users", icon: Users },
        { id: "role-permissions", label: "Role Permissions", icon: Shield },
        { id: "vendors", label: "Vendor Master", icon: Building2, onClick: () => setLocation('/vendor-management') },
        { id: "vendor-types", label: "Vendor Types", icon: Shield },
        { id: "machines", label: "Machines", icon: Settings },
        { id: "machine-types", label: "Machine Types", icon: Layers },
        { id: "spare-parts", label: "Spare Parts", icon: Package },
        { id: "pm-templates", label: "PM Templates", icon: ListChecks },
        { id: "uom", label: "Unit of Measurement", icon: Layers },
        { id: "raw-material-types", label: "Raw Material Types", icon: Archive },
        { id: "template-management", label: "Invoice Templates", icon: FileStack },
      ],
      quickActions: [
        { id: "add-user", label: "Add User", icon: Users, onClick: () => setActiveView("users") },
        { id: "add-vendor", label: "Add Vendor", icon: Building2, onClick: () => setActiveView("vendors") },
        { id: "add-machine", label: "Add Machine", icon: Settings, onClick: () => setActiveView("machines") },
      ],
    },
    {
      id: "settings-section",
      label: "Settings",
      items: [
        { id: "notification-settings", label: "Notification Settings", icon: Bell },
        { id: "data-import", label: "Data Import", icon: Upload },
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
      case 'checklist-assignments':
        return (
          <div className="p-4">
            <ManagerChecklistAssignment />
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
      case 'product-categories':
        return <ProductCategories />;
      case 'product-types':
        return <ProductTypes />;
      case 'vendor-types':
        return <VendorTypes />;
      case 'raw-material-types':
        return <RawMaterialTypeMaster />;
      case 'raw-material-issuance':
      case 'gatepasses':
      case 'invoices':
        return <ProductionManagement activeTab={activeView} />;
      case 'production-entries':
        return <ProductionEntries />;
      case 'production-reconciliations':
        return <ProductionReconciliations />;
      case 'production-reconciliation-report':
        return <ProductionReconciliationReport />;
      case 'variance-analytics':
        return <VarianceAnalytics />;
      case 'sales-returns':
        return <SalesReturns />;
      case 'pending-payments':
        return <PendingPayments />;
      case 'payment-management':
        return <PaymentManagement />;
      case 'credit-notes':
        return <CreditNotes />;
      case 'cancelled-invoices':
        return <CancelledInvoices showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'data-import':
        return <DataImport />;
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'vendor-analytics':
        // Redirect to standalone route
        setLocation('/vendor-analytics');
        return null;
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

  const role = ((user as any).role as string).toLowerCase() as Role;

  return (
    <>
      {role === 'operator' && <OperatorDashboard />}
      {role === 'reviewer' && <ReviewerDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'admin' && <AdminDashboard />}
    </>
  );
}

// Wrapper component for Vendor Management with full admin navigation
function VendorManagementPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendors');
  
  // Use the same navigation as admin dashboard for consistency
  const navSections = getAdminNavSections(setLocation);
  
  return (
    <DashboardShell
      title="Vendor Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorManagement />
    </DashboardShell>
  );
}

// Wrapper component for Reports with full admin navigation
function ReportsPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('reports');
  
  // Use the same navigation as admin dashboard for consistency, filtered by role
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Reports"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <Reports showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Pending Payments with full admin navigation
function PendingPaymentsPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('pending-payments');
  
  // Use the same navigation as admin dashboard for consistency, filtered by role
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Pending Payments"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <PendingPayments />
    </DashboardShell>
  );
}

// Wrapper component for Payment Management with full admin navigation
function PaymentManagementPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('payment-management');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Payment Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <PaymentManagement />
    </DashboardShell>
  );
}

// Wrapper component for Vendor History with full admin navigation
function VendorHistoryPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Vendor History"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorHistory />
    </DashboardShell>
  );
}

// Wrapper component for Vendor History Detail with full admin navigation
function VendorHistoryDetailPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Vendor History"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorHistoryDetail />
    </DashboardShell>
  );
}

// Permission mapping: maps nav item IDs to screen names from the permissions system
const navItemToScreen: Record<string, string> = {
  // Dashboard & Analytics
  'overview': 'Overview',
  'sales-dashboard': 'Overview',
  'vendor-analytics': 'Overview',
  'reports': 'Overview',
  // Quality & Checklists
  'checklists': 'Checklist Templates',
  'checklist-assignments': 'Checklist Templates',
  'machine-startup-reminders': 'Checklist Templates',
  'whatsapp-analytics': 'Checklist Templates',
  // Production & Inventory
  'products': 'Inventory Management',
  'product-categories': 'Inventory Management',
  'product-types': 'Inventory Management',
  'raw-materials': 'Inventory Management',
  'finished-goods': 'Inventory Management',
  'raw-material-issuance': 'Create Raw Material Transactions',
  'production-entries': 'Create Finished Goods',
  'production-reconciliations': 'Create Finished Goods',
  'production-reconciliation-report': 'Create Finished Goods',
  'variance-analytics': 'Create Finished Goods',
  // Finance & Sales
  'invoices': 'Purchase Orders',
  'vendor-history': 'Purchase Orders',
  'pending-payments': 'Purchase Orders',
  'payment-management': 'Purchase Orders',
  'credit-notes': 'Purchase Orders',
  'cancelled-invoices': 'Purchase Orders',
  'sales-returns': 'Purchase Orders',
  'write-off-report': 'Purchase Orders',
  // Dispatch & Logistics
  'gatepasses': 'Purchase Orders',
  'dispatch-tracking': 'Purchase Orders',
  // Cash & Expenses
  'cash-register': 'Purchase Orders',
  'cash-register-report': 'Purchase Orders',
  'expenses': 'Purchase Orders',
  'documents': 'Inventory Management',
  // Maintenance
  'maintenance': 'Maintenance Plans',
  'pm-history': 'PM History',
  'purchase-orders': 'Purchase Orders',
  // Master Data
  'users': 'User Management',
  'role-permissions': 'User Management',
  'vendors': 'Inventory Management',
  'vendor-types': 'Inventory Management',
  'machines': 'Machines',
  'machine-types': 'Machine Types',
  'spare-parts': 'Spare Parts',
  'pm-templates': 'PM Templates',
  'uom': 'Inventory Management',
  'raw-material-types': 'Inventory Management',
  'template-management': 'Inventory Management',
  // Settings
  'notification-settings': 'User Management',
  'data-import': 'User Management',
};

// Permission matrix: which roles can access which screens
const screenPermissions: Record<string, { admin: boolean; manager: boolean; operator: boolean; reviewer: boolean }> = {
  'Overview': { admin: true, manager: true, operator: true, reviewer: true },
  'User Management': { admin: true, manager: false, operator: false, reviewer: false },
  'Machines': { admin: true, manager: true, operator: false, reviewer: false },
  'Checklist Templates': { admin: true, manager: true, operator: false, reviewer: false },
  'Spare Parts': { admin: true, manager: true, operator: false, reviewer: false },
  'Machine Types': { admin: true, manager: true, operator: false, reviewer: false },
  'PM Templates': { admin: true, manager: true, operator: false, reviewer: false },
  'Maintenance Plans': { admin: true, manager: true, operator: false, reviewer: false },
  'PM History': { admin: true, manager: true, operator: true, reviewer: true },
  'Purchase Orders': { admin: true, manager: true, operator: false, reviewer: false },
  'Inventory Management': { admin: true, manager: true, operator: false, reviewer: false },
  'Create Raw Material Transactions': { admin: true, manager: true, operator: true, reviewer: false },
  'Create Finished Goods': { admin: true, manager: true, operator: true, reviewer: false },
  'Execute Checklists': { admin: true, manager: false, operator: true, reviewer: false },
  'Review Checklists': { admin: true, manager: false, operator: false, reviewer: true },
  'Final Approval': { admin: true, manager: true, operator: false, reviewer: false },
};

// Check if a nav item is accessible for a given role
function canAccessNavItem(itemId: string, role: string): boolean {
  const screenName = navItemToScreen[itemId];
  if (!screenName) return true; // If not mapped, show it (safe default)
  
  const permissions = screenPermissions[screenName];
  if (!permissions) return true; // If no permissions defined, show it
  
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') return permissions.admin;
  if (roleLower === 'manager') return permissions.manager;
  if (roleLower === 'operator') return permissions.operator;
  if (roleLower === 'reviewer') return permissions.reviewer;
  
  // Custom roles (like InventoryManager, Billing Manager) - show all sections
  // Their specific permissions are managed through Role Permissions screen
  return true;
}

// Filter nav sections based on user's role
function filterNavSectionsByRole(sections: NavSection[], role: string): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];
  
  const filtered = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessNavItem(item.id, role))
    }))
    .filter(section => section.items.length > 0); // Hide empty sections
    
  return filtered.length > 0 ? filtered : sections; // Fallback to all sections if filter removes everything
}

// Shared admin navigation sections factory - matches main dashboard navigation
function getAdminNavSections(setLocation: (path: string) => void, userRole?: string): NavSection[] {
  const allSections: NavSection[] = [
    {
      id: "dashboard",
      label: "Dashboard & Analytics",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard, onClick: () => setLocation('/') },
        { id: "sales-dashboard", label: "Sales Dashboard", icon: TrendingUp, onClick: () => setLocation('/') },
        { id: "vendor-analytics", label: "Vendor Analytics", icon: Building2, onClick: () => setLocation('/vendor-analytics') },
        { id: "reports", label: "Reports", icon: FileText, onClick: () => setLocation('/reports') },
      ],
    },
    {
      id: "quality-section",
      label: "Quality & Checklists",
      items: [
        { id: "checklists", label: "Checklist Builder", icon: FileText, onClick: () => setLocation('/checklists') },
        { id: "checklist-assignments", label: "Checklist Assignments", icon: ClipboardList, onClick: () => setLocation('/') },
        { id: "machine-startup-reminders", label: "Machine Startup Reminders", icon: Bell, onClick: () => setLocation('/') },
        { id: "whatsapp-analytics", label: "WhatsApp Analytics", icon: TrendingUp, onClick: () => setLocation('/') },
      ],
    },
    {
      id: "production-section",
      label: "Production & Inventory",
      items: [
        { id: "products", label: "Product Master", icon: Package, onClick: () => setLocation('/') },
        { id: "product-categories", label: "Product Categories", icon: Layers, onClick: () => setLocation('/') },
        { id: "product-types", label: "Product Types", icon: Archive, onClick: () => setLocation('/') },
        { id: "raw-materials", label: "Raw Materials", icon: Box, onClick: () => setLocation('/') },
        { id: "finished-goods", label: "Finished Goods", icon: CheckCircle2, onClick: () => setLocation('/') },
        { id: "raw-material-issuance", label: "Raw Material Issuance", icon: Package, onClick: () => setLocation('/') },
        { id: "production-entries", label: "Production Entries", icon: ListChecks, onClick: () => setLocation('/') },
        { id: "production-reconciliations", label: "Production Reconciliation", icon: Calculator, onClick: () => setLocation('/') },
        { id: "production-reconciliation-report", label: "Reconciliation Report", icon: FileStack, onClick: () => setLocation('/reports/production-reconciliation') },
        { id: "variance-analytics", label: "Variance Analytics", icon: TrendingUp, onClick: () => setLocation('/') },
      ],
    },
    {
      id: "finance-section",
      label: "Finance & Sales",
      items: [
        { id: "invoices", label: "Sales Invoices", icon: Receipt, onClick: () => setLocation('/') },
        { id: "vendor-history", label: "Vendor History", icon: History, onClick: () => setLocation('/vendor-history') },
        { id: "pending-payments", label: "Pending Payments", icon: IndianRupee, onClick: () => setLocation('/pending-payments') },
        { id: "payment-management", label: "Payment Management", icon: CreditCard, onClick: () => setLocation('/payment-management') },
        { id: "credit-notes", label: "Credit Notes", icon: FileText, onClick: () => setLocation('/credit-notes') },
        { id: "cancelled-invoices", label: "Cancelled Invoices", icon: FileX, onClick: () => setLocation('/cancelled-invoices') },
        { id: "write-off-report", label: "Write-Off Report", icon: XCircle, onClick: () => setLocation('/write-off-report') },
        { id: "sales-returns", label: "Sales Returns", icon: Package, onClick: () => setLocation('/sales-returns') },
      ],
    },
    {
      id: "dispatch-section",
      label: "Dispatch & Logistics",
      items: [
        { id: "gatepasses", label: "Gatepasses", icon: FileText, onClick: () => setLocation('/') },
        { id: "dispatch-tracking", label: "Dispatch Tracking", icon: Truck, onClick: () => setLocation('/dispatch-tracking') },
      ],
    },
    {
      id: "cash-section",
      label: "Cash & Expenses",
      items: [
        { id: "cash-register", label: "Daily Cash Register", icon: Calculator, onClick: () => setLocation('/cash-register') },
        { id: "cash-register-report", label: "Cash Register Report", icon: FileStack, onClick: () => setLocation('/cash-register-report') },
        { id: "expenses", label: "Expense Vouchers", icon: Wallet, onClick: () => setLocation('/expenses') },
        { id: "documents", label: "Documents", icon: FolderOpen, onClick: () => setLocation('/documents') },
      ],
    },
    {
      id: "maintenance-section",
      label: "Maintenance",
      items: [
        { id: "maintenance", label: "PM Schedule", icon: Wrench, onClick: () => setLocation('/') },
        { id: "pm-history", label: "PM History", icon: History, onClick: () => setLocation('/') },
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart, onClick: () => setLocation('/') },
      ],
    },
    {
      id: "master-section",
      label: "Master Data",
      items: [
        { id: "users", label: "Users", icon: Users, onClick: () => setLocation('/') },
        { id: "role-permissions", label: "Role Permissions", icon: Shield, onClick: () => setLocation('/') },
        { id: "vendors", label: "Vendor Master", icon: Building2, onClick: () => setLocation('/vendor-management') },
        { id: "vendor-types", label: "Vendor Types", icon: Shield, onClick: () => setLocation('/vendor-types') },
        { id: "machines", label: "Machines", icon: Settings, onClick: () => setLocation('/') },
        { id: "machine-types", label: "Machine Types", icon: Layers, onClick: () => setLocation('/') },
        { id: "spare-parts", label: "Spare Parts", icon: Package, onClick: () => setLocation('/') },
        { id: "pm-templates", label: "PM Templates", icon: ListChecks, onClick: () => setLocation('/') },
        { id: "uom", label: "Unit of Measurement", icon: Layers, onClick: () => setLocation('/') },
        { id: "raw-material-types", label: "Raw Material Types", icon: Archive, onClick: () => setLocation('/') },
        { id: "template-management", label: "Invoice Templates", icon: FileStack, onClick: () => setLocation('/') },
      ],
    },
    {
      id: "settings-section",
      label: "Settings",
      items: [
        { id: "notification-settings", label: "Notification Settings", icon: Bell, onClick: () => setLocation('/') },
        { id: "data-import", label: "Data Import", icon: Upload, onClick: () => setLocation('/') },
      ],
    },
  ];
  
  // If no role provided, return all sections (admin view)
  if (!userRole) return allSections;
  
  // Filter sections based on user's role permissions
  return filterNavSectionsByRole(allSections, userRole);
}

// Wrapper component for Vendor Analytics with full admin navigation
function VendorAnalyticsPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-analytics');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Vendor Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorAnalytics />
    </DashboardShell>
  );
}

// Wrapper component for Documents page
function DocumentsPageWrapper() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('documents');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Documents"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
        setLocation('/');
      }}
    >
      <DocumentsPage />
    </DashboardShell>
  );
}

// Wrapper component for Expenses page
function ExpensesPageWrapper() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('expenses');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Expense Vouchers"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ExpensesPage />
    </DashboardShell>
  );
}

// Wrapper component for Cash Register page
function CashRegisterPageWrapper() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-register');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Cash Register"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CashRegisterPage />
    </DashboardShell>
  );
}

// Wrapper component for Cash Register Report page
function CashRegisterReportWrapper() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-register-report');
  
  const navSections = getAdminNavSections(setLocation, (user as any)?.role);
  
  return (
    <DashboardShell
      title="Cash Register Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={navSections}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CashRegisterReport />
    </DashboardShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <ProtectedRoute path="/checklists" component={ChecklistsPage} />
      <ProtectedRoute path="/reviewer-dashboard" component={ReviewerDashboardPage} />
      <ProtectedRoute path="/vendor-types" component={VendorTypes} />
      <ProtectedRoute path="/vendor-management" component={VendorManagementPage} />
      <ProtectedRoute path="/vendor-history" component={VendorHistoryPage} />
      <ProtectedRoute path="/vendor-history/:vendorId" component={VendorHistoryDetailPage} />
      <ProtectedRoute path="/invoice/:id" component={InvoiceDetail} />
      <ProtectedRoute path="/dispatch-tracking" component={DispatchTracking} />
      <ProtectedRoute path="/sales-returns" component={SalesReturns} />
      <ProtectedRoute path="/credit-notes" component={CreditNotes} />
      <ProtectedRoute path="/cancelled-invoices" component={CancelledInvoices} />
      <ProtectedRoute path="/write-off-report" component={WriteOffReport} />
      <ProtectedRoute path="/pending-payments" component={PendingPaymentsPage} />
      <ProtectedRoute path="/payment-management" component={PaymentManagementPage} />
      <ProtectedRoute path="/vendor-analytics" component={VendorAnalyticsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/production-management" component={ProductionManagement} />
      <ProtectedRoute path="/reports/production-reconciliation" component={ProductionReconciliationReport} />
      <ProtectedRoute path="/documents" component={DocumentsPageWrapper} />
      <ProtectedRoute path="/expenses" component={ExpensesPageWrapper} />
      <ProtectedRoute path="/cash-register" component={CashRegisterPageWrapper} />
      <ProtectedRoute path="/cash-register-report" component={CashRegisterReportWrapper} />
      <ProtectedRoute path="/cash-register/vouchers/print" component={CashRegisterVoucherPrint} />
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
