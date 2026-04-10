import { useState, useEffect, useCallback } from "react";
import { Switch, Route, useLocation, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useFilteredNavigation } from "@/hooks/use-filtered-navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import LandingPage from "@/pages/landing";
import DemoPage from "@/pages/demo";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password";
import CompanySelectPage from "@/pages/company-select";
import RegisterCompanyPage from "@/pages/register-company";
import SuperAdminTenants from "@/pages/super-admin-tenants";
import SuperAdminPlans from "@/pages/super-admin-plans";
import SuperAdminOverview from "@/pages/super-admin-overview";
import SuperAdminBilling from "@/pages/super-admin-billing";
import SuperAdminDemoRequests from "@/pages/super-admin-demo-requests";
import SuperAdminBackups from "@/pages/super-admin-backups";
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
import SparePartsStockView from "@/components/SparePartsStockView";
import AdminMachineTypeConfig from "@/components/AdminMachineTypeConfig";
import AdminPMTaskListTemplates from "@/components/AdminPMTaskListTemplates";
import AdminHPCLMigration from "@/components/AdminHPCLMigration";
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
import FinishedGoodsReport from "@/pages/finished-goods-report";
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
import { CheckCircle, Clock, XCircle, AlertTriangle, ClipboardCheck, ClipboardList, Settings, Calendar, Users, FileText, FileX, Wrench, Plus, LogOut, Package, Layers, ShoppingCart, ListChecks, History, LayoutDashboard, Archive, Shield, Factory, Box, CheckCircle2, Building2, Receipt, TrendingUp, Bell, FileStack, Truck, Calculator, IndianRupee, CreditCard, Upload, FolderOpen, Wallet, Car, BookOpen, Scale, BarChart3, Landmark, Tag, Trash2, PackageX, Loader2, Play, UserX, Briefcase, Target, Lock } from "lucide-react";
import CRMLeadsPage from "@/pages/crm-leads";
import SalesDashboard from "@/components/SalesDashboard";
import SalesOrdersPage from "@/pages/sales-orders";
import SalesOrderDetailPage from "@/pages/sales-order-detail";
import SalesOfficersPage from "@/pages/sales-officers";
import VendorAnalytics from "@/pages/vendor-analytics";
import SpareParts from "@/pages/spare-parts";
import ScrapManagement from "@/pages/scrap-management";
import PurchaseReturns from "@/pages/purchase-returns";
import TDSManagement from "@/pages/tds-management";
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
import ExpenseCategoriesPage from "@/pages/expense-categories";
import MonthlyExpensesPage from "@/pages/monthly-expenses";
import CashRegisterPage from "@/pages/cash-register";
import CashRegisterReport from "@/pages/cash-register-report";
import CashRegisterVoucherPrint from "@/pages/cash-register-voucher-print";
import VendorHistory from "@/pages/vendor-history";
import VendorHistoryDetail from "@/pages/vendor-history-detail";
import VendorGroupDetail from "@/pages/vendor-group-detail";
import VendorDebitNotes from "@/pages/vendor-debit-notes";
import CustomerAdvances from "@/pages/customer-advances";
import MISDashboard from "@/pages/mis-dashboard";
import MISProduction from "@/pages/mis-production";
import MISInventory from "@/pages/mis-inventory";
import MISSales from "@/pages/mis-sales";
import MISDelivery from "@/pages/mis-delivery";
import MISCash from "@/pages/mis-cash";
import MISFinancial from "@/pages/mis-financial";
import DispatchMasters from "@/pages/dispatch-masters";
import PrintInvoicePage from "@/pages/PrintInvoicePage";
import PrintGatepassPage from "@/pages/PrintGatepassPage";
import PrintCreditNotePage from "@/pages/PrintCreditNotePage";
import PrintDebitNotePage from "@/pages/PrintDebitNotePage";
import PrintInvoiceGatepassPage from "@/pages/PrintInvoiceGatepassPage";
import RawMaterialDetail from "@/pages/raw-material-detail";
import RawMaterialTypeDetail from "@/pages/raw-material-type-detail";
import ProductDetail from "@/pages/product-detail";
import FinishedGoodDetail from "@/pages/finished-good-detail";
import ChartOfAccountsPage from "@/pages/chart-of-accounts";
import AccountSubtypesPage from "@/pages/account-subtypes";
import JournalEntriesPage from "@/pages/journal-entries";
import JournalEntryDetailPage from "@/pages/journal-entry-detail";
import ManualJournalEntryPage from "@/pages/manual-journal-entry";
import TrialBalancePage from "@/pages/trial-balance";
import ProfitLossPage from "@/pages/profit-loss";
import BalanceSheetPage from "@/pages/balance-sheet";
import BankTransactionsPage from "@/pages/bank-transactions";
import LedgerViewPage from "@/pages/ledger-view";
import DayBookPage from "@/pages/day-book";
import AgingReportPage from "@/pages/aging-report";
import CashFlowStatementPage from "@/pages/cash-flow-statement";
import GroupSummaryPage from "@/pages/group-summary";
import BudgetVariancePage from "@/pages/budget-variance";
import AdminToolsPage from "@/pages/admin-tools";
import TenantSettings from "@/pages/tenant-settings";
import HRMastersPage from "@/pages/hr-masters";
import HREmployeesPage from "@/pages/hr-employees";
import HRAttendancePage from "@/pages/hr-attendance";
import HRLeavesPage from "@/pages/hr-leaves";
import HRPayrollPage from "@/pages/hr-payroll";
import HRReportsPage from "@/pages/hr-reports";
import HRExitManagementPage from "@/pages/hr-exit-management";
import HRLoansPage from "@/pages/hr-loans";
import HRTdsDeclarationsPage from "@/pages/hr-tds-declarations";
import HRRecruitmentPage from "@/pages/hr-recruitment";
import HRPayslipPage from "@/pages/hr-payslip";
import PricingPage from "@/pages/pricing";
import EssLogin from "@/pages/ess-login";
import EssPortal from "@/pages/ess-portal";
import { parseISO } from "date-fns";

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
    <div
      className="fixed bottom-0 left-0 right-0 bg-card border-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="mobile-bottom-nav"
    >
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

const DASHBOARD_VALID_TABS = [
  'overview', 'invoices', 'gatepasses', 'raw-material-issuance', 'products', 'inventory',
  'production', 'finished-goods', 'raw-materials', 'checklists', 'users', 'machines',
  'maintenance', 'reports', 'sales-dashboard', 'vendor-analytics', 'sales-orders',
  'checklist-assignments', 'machine-startup-reminders', 'whatsapp-analytics',
  'product-categories', 'product-types', 'production-entries', 'production-reconciliations',
  'variance-analytics', 'purchase-orders', 'pm-history', 'role-permissions',
  'machine-types', 'pm-templates', 'uom', 'raw-material-types', 'template-management',
  'notification-settings', 'data-import', 'spare-parts-stock', 'roles', 'templates',
  'sales-returns', 'pending-payments', 'payment-management', 'credit-notes',
  'cancelled-invoices', 'write-off-report', 'dispatch-tracking', 'vendor-types',
  'spare-parts', 'tds-management', 'purchase-returns', 'scrap-management',
  'hr-employees', 'hr-attendance', 'hr-leaves', 'hr-payroll', 'hr-reports',
  'hr-departments', 'hr-settings', 'hr-recruitment', 'hr-exit', 'hr-tds',
  'crm-leads', 'accounting', 'chart-of-accounts', 'ledger-entries', 'expense-management',
  'cash-register', 'document-management',
];

function ReviewerDashboard() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <ReviewerDashboardPage />;
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      default:
        return <ReviewerDashboardPage />;
    }
  };

  return (
    <DashboardShell
      title="Reviewer Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
    </DashboardShell>
  );
}

function ManagerDashboard() {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'Ramesh Kumar', status: 'in_review' as const },
  ];

  // Derive activeView directly from URL — synchronous, no useEffect timing issues
  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  // setActiveView updates URL so activeView derives correctly on next render
  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

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
      case 'spare-parts-stock':
        return (
          <div className="p-4">
            <SparePartsStockView />
          </div>
        );
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
      case 'finished-goods-report':
        return <FinishedGoodsReport />;
      case 'variance-analytics':
        return <VarianceAnalytics />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'cancelled-invoices':
        return <CancelledInvoices showHeader={false} />;
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'sales-returns':
        return <SalesReturns />;
      case 'pending-payments':
        return <PendingPayments />;
      case 'payment-management':
        return <PaymentManagement />;
      case 'credit-notes':
        return <CreditNotes />;
      case 'product-categories':
        return <ProductCategories />;
      case 'product-types':
        return <ProductTypes />;
      case 'vendor-types':
        return <VendorTypes />;
      case 'spare-parts':
        return (
          <div className="p-4">
            <AdminSparePartsManagement />
          </div>
        );
      case 'machines':
        return (
          <div className="p-4">
            <AdminMachineConfig />
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
      case 'pm-history':
        return (
          <div className="p-4">
            <PMHistoryView />
          </div>
        );
      case 'maintenance':
        return (
          <div className="p-4">
            <MaintenanceSchedule tasks={[]} onComplete={() => {}} />
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
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'data-import':
        return <DataImport />;
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
      case 'template-management':
        return (
          <div className="p-4">
            <TemplateManagement />
          </div>
        );
      case 'vendor-analytics':
        setLocation('/vendor-analytics');
        return null;
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
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
    </DashboardShell>
  );
}

// Dashboard for custom roles - uses AdminDashboard layout with database-based permission filtering
function CustomRoleDashboard({ roleName }: { roleName: string }) {
  const { logoutMutation } = useAuth();
  const { permissions, role: userRoleName, isLoading: permissionsLoading, error: permissionsError } = usePermissions();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<any>(null);

  // Derive activeView directly from URL — synchronous, no useEffect timing issues
  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  // setActiveView updates URL so activeView derives correctly on next render
  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const { data: maintenancePlans = [] } = useQuery<any[]>({
    queryKey: ['/api/maintenance-plans'],
  });

  const mockMaintenanceTasks = maintenancePlans.length > 0 
    ? maintenancePlans.map((plan: any) => {
        const isActive = plan.isActive === true || plan.isActive === 'true';
        const isOverdue = plan.nextDueDate && parseISO(plan.nextDueDate) < new Date();
        const status = !isActive ? 'completed' : (isOverdue ? 'overdue' : 'upcoming');
        return {
          id: plan.id,
          machine: plan.machineId || 'Unassigned',
          taskType: plan.planName,
          scheduledDate: plan.nextDueDate ? parseISO(plan.nextDueDate).toLocaleDateString() : 'Not scheduled',
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

  // Get all navigation sections, then filter by database permissions for custom roles
  const allNavSections = getAdminNavSections(setLocation);
  const navSections = filterNavSectionsWithDbPermissions(allNavSections, permissions, userRoleName);

  // Show loading state while permissions are being fetched
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state if permissions fetch failed
  if (permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to load permissions</h2>
          <p className="text-muted-foreground">Failed to load your screen permissions. Please refresh the page or contact your administrator.</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </Card>
      </div>
    );
  }

  // If no permissions granted, show access message
  if (navSections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome, {roleName}</h2>
          <p className="text-muted-foreground">No screens have been assigned to your role yet. Please contact your administrator to grant access to specific screens.</p>
        </Card>
      </div>
    );
  }

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
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'vendor-analytics':
        setLocation('/vendor-analytics');
        return null;
      case 'reports':
        return <Reports showHeader={false} />;
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
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
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
      case 'spare-parts-stock':
        return (
          <div className="p-4">
            <SparePartsStockView />
          </div>
        );
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
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'data-import':
        return <DataImport />;
      case 'roles':
        return (
          <div className="p-4">
            <RoleManagement />
          </div>
        );
      case 'templates':
        return (
          <div className="p-4">
            <TemplateManagement />
          </div>
        );
      default:
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <PendingPaymentsDashboard />
            <InventorySummaryDashboard />
          </div>
        );
    }
  };

  return (
    <>
      <DashboardShell
        title={`${roleName} Dashboard`}
        onLogoutClick={handleLogout}
        notificationCount={0}
        navSections={navSections}
        activeView={activeView}
        onNavigate={setActiveView}
      >
        {renderContent()}
      </DashboardShell>
      {isExecutionDialogOpen && selectedPlanForExecution && (
        <PMExecutionDialog
          open={isExecutionDialogOpen}
          onOpenChange={setIsExecutionDialogOpen}
          plan={selectedPlanForExecution}
        />
      )}
    </>
  );
}

function AdminDashboard() {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<any>(null);

  // Derive activeView directly from URL — synchronous, no useEffect timing issues
  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  // setActiveView updates URL so activeView derives correctly on next render
  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const { data: maintenancePlans = [] } = useQuery<any[]>({
    queryKey: ['/api/maintenance-plans'],
  });

  const mockMaintenanceTasks = maintenancePlans.length > 0 
    ? maintenancePlans.map((plan: any) => {
        const isActive = plan.isActive === true || plan.isActive === 'true';
        const isOverdue = plan.nextDueDate && parseISO(plan.nextDueDate) < new Date();
        const status = !isActive ? 'completed' : (isOverdue ? 'overdue' : 'upcoming');
        return {
          id: plan.id,
          machine: plan.machineId || 'Unassigned',
          taskType: plan.planName,
          scheduledDate: plan.nextDueDate ? parseISO(plan.nextDueDate).toLocaleDateString() : 'Not scheduled',
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
      id: "mis-section",
      label: "MIS Reports",
      items: [
        { id: "mis-dashboard", label: "Executive Dashboard", icon: TrendingUp, onClick: () => setLocation('/mis') },
        { id: "mis-production", label: "Production Analytics", icon: Factory, onClick: () => setLocation('/mis/production') },
        { id: "mis-inventory", label: "Inventory Intelligence", icon: Box, onClick: () => setLocation('/mis/inventory') },
        { id: "mis-sales", label: "Sales Analysis", icon: IndianRupee, onClick: () => setLocation('/mis/sales') },
        { id: "mis-delivery", label: "Delivery Performance", icon: Truck, onClick: () => setLocation('/mis/delivery') },
        { id: "mis-cash", label: "Cash Analytics", icon: Wallet, onClick: () => setLocation('/mis/cash') },
        { id: "mis-financial", label: "Financial Analytics", icon: BookOpen, onClick: () => setLocation('/mis/financial') },
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
        { id: "spare-parts-stock", label: "Spare Parts Stock", icon: Wrench },
        { id: "scrap-management", label: "Scrap Management", icon: Trash2, onClick: () => setLocation('/scrap-management') },
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
        { id: "sales-orders", label: "Sales Orders", icon: ClipboardList },
        { id: "invoices", label: "Sales Invoices", icon: Receipt },
        { id: "vendor-history", label: "Vendor History", icon: History, onClick: () => setLocation('/vendor-history') },
        { id: "vendor-debit-notes", label: "Vendor Debit Notes", icon: FileX, onClick: () => setLocation('/vendor-debit-notes') },
        { id: "pending-payments", label: "Pending Payments", icon: IndianRupee, onClick: () => setLocation('/pending-payments') },
        { id: "payment-management", label: "Payment Management", icon: CreditCard, onClick: () => setLocation('/payment-management') },
        { id: "customer-advances", label: "Customer Advances", icon: Wallet, onClick: () => setLocation('/customer-advances') },
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
        { id: "dispatch-masters", label: "Dispatch Masters", icon: Car, onClick: () => setLocation('/dispatch-masters') },
      ],
      quickActions: [
        { id: "create-gatepass", label: "Create Gatepass", icon: FileText, onClick: () => setActiveView("gatepasses") },
      ],
    },
    {
      id: "purchases-section",
      label: "Purchases",
      items: [
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
        { id: "purchase-returns", label: "Purchase Returns", icon: PackageX, onClick: () => setLocation('/purchase-returns') },
      ],
      quickActions: [
        { id: "add-purchase-order", label: "Create PO", icon: ShoppingCart, onClick: () => setActiveView("purchase-orders") },
      ],
    },
    {
      id: "cash-section",
      label: "Cash & Expenses",
      items: [
        { id: "cash-register", label: "Daily Cash Register", icon: Calculator, onClick: () => setLocation('/cash-register') },
        { id: "cash-register-report", label: "Cash Register Report", icon: FileStack, onClick: () => setLocation('/cash-register-report') },
        { id: "expenses", label: "Expense Vouchers", icon: Wallet, onClick: () => setLocation('/expenses') },
        { id: "expense-categories", label: "Expense Categories", icon: Tag, onClick: () => setLocation('/expense-categories') },
        { id: "monthly-expenses", label: "Monthly Expenses", icon: Calendar, onClick: () => setLocation('/monthly-expenses') },
      ],
    },
    {
      id: "documents-section",
      label: "Documents",
      items: [
        { id: "documents", label: "Documents", icon: FolderOpen, onClick: () => setLocation('/documents') },
      ],
    },
    {
      id: "accounting-section",
      label: "Accounting & Ledger",
      items: [
        { id: "chart-of-accounts", label: "Chart of Accounts", icon: BookOpen, onClick: () => setLocation('/chart-of-accounts') },
        { id: "journal-entries", label: "Journal Entries", icon: FileStack, onClick: () => setLocation('/journal-entries') },
        { id: "bank-transactions", label: "Bank Statements", icon: Landmark, onClick: () => setLocation('/bank-transactions') },
        { id: "trial-balance", label: "Trial Balance", icon: Scale, onClick: () => setLocation('/trial-balance') },
        { id: "profit-loss", label: "Profit & Loss", icon: BarChart3, onClick: () => setLocation('/profit-loss') },
        { id: "balance-sheet", label: "Balance Sheet", icon: Scale, onClick: () => setLocation('/balance-sheet') },
        { id: "ledger-view", label: "Ledger View", icon: BookOpen, onClick: () => setLocation('/ledger-view') },
        { id: "day-book", label: "Day Book", icon: FileStack, onClick: () => setLocation('/day-book') },
        { id: "aging-report", label: "Outstanding/Aging", icon: AlertTriangle, onClick: () => setLocation('/aging-report') },
        { id: "cash-flow-statement", label: "Cash Flow Statement", icon: TrendingUp, onClick: () => setLocation('/cash-flow-statement') },
        { id: "group-summary", label: "Group Summary", icon: Layers, onClick: () => setLocation('/group-summary') },
        { id: "budget-variance", label: "Budget & Variance", icon: Scale, onClick: () => setLocation('/budget-variance') },
        { id: "tds-management", label: "TDS Management", icon: Calculator, onClick: () => setLocation('/tds-management') },
      ],
    },
    {
      id: "maintenance-section",
      label: "Maintenance",
      items: [
        { id: "maintenance", label: "PM Schedule", icon: Wrench },
        { id: "pm-history", label: "PM History", icon: History },
      ],
      quickActions: [
        { id: "schedule-maintenance", label: "Schedule PM", icon: Wrench, onClick: () => setActiveView("maintenance") },
      ],
    },
    {
      id: "hr-section",
      label: "HR & Payroll",
      items: [
        { id: "hr-employees", label: "Employees", icon: Users, onClick: () => setLocation('/hr/employees') },
        { id: "hr-attendance", label: "Attendance", icon: Calendar, onClick: () => setLocation('/hr/attendance') },
        { id: "hr-leaves", label: "Leave Management", icon: ClipboardList, onClick: () => setLocation('/hr/leaves') },
        { id: "hr-payroll", label: "Payroll", icon: IndianRupee, onClick: () => setLocation('/hr/payroll') },
        { id: "hr-exit-management", label: "Exit Management", icon: UserX, onClick: () => setLocation('/hr/exit-management') },
        { id: "hr-loans", label: "Loans & Advances", icon: CreditCard, onClick: () => setLocation('/hr/loans') },
        { id: "hr-tds", label: "TDS & Compliance", icon: Shield, onClick: () => setLocation('/hr/tds-declarations') },
        { id: "hr-recruitment", label: "Recruitment", icon: Briefcase, onClick: () => setLocation('/hr/recruitment') },
        { id: "hr-reports", label: "HR Reports", icon: BarChart3, onClick: () => setLocation('/hr/reports') },
        { id: "hr-masters", label: "HR Masters", icon: Settings, onClick: () => setLocation('/hr/masters') },
      ],
    },
    {
      id: "crm-section",
      label: "CRM & Leads",
      items: [
        { id: "crm-leads", label: "Lead Management", icon: Target, onClick: () => setLocation('/crm/leads') },
      ],
    },
    {
      id: "master-section",
      label: "Master Data",
      items: [
        { id: "users", label: "Users", icon: Users },
        { id: "role-permissions", label: "Role Permissions", icon: Shield },
        { id: "sales-officers", label: "Sales Officers", icon: Users, onClick: () => setLocation('/sales-officers') },
        { id: "vendors", label: "Vendor Master", icon: Building2, onClick: () => setLocation('/vendor-management') },
        { id: "vendor-types", label: "Vendor Types", icon: Shield },
        { id: "hpcl-migration", label: "HPCL Migration", icon: Building2, onClick: () => setLocation('/hpcl-migration') },
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
        { id: "admin-tools", label: "Admin Tools", icon: Wrench, onClick: () => setLocation('/admin-tools') },
      ],
    },
  ];

  const { navSections: filteredNav, isLoading: navLoading } = useFilteredNavigation(navSections);
  const resolvedNav = navLoading ? navSections : filteredNav;

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
      case 'spare-parts-stock':
        return (
          <div className="p-4">
            <SparePartsStockView />
          </div>
        );
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
      case 'finished-goods-report':
        return <FinishedGoodsReport />;
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
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
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
      navSections={resolvedNav}
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

function DemoBanner() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  if (!(user as any)?.isDemo) return null;
  return (
    <div
      data-testid="demo-banner"
      className="sticky top-0 z-[9999] w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm font-medium"
      style={{ background: "hsl(38 95% 48%)", color: "#fff" }}
    >
      <span className="flex items-center gap-2">
        <Play className="w-4 h-4 shrink-0" />
        You are exploring a live demo. Data is shared and may be reset daily.
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-amber-900 border-amber-100 bg-white/90"
          onClick={() => setLocation("/register-company")}
          data-testid="demo-banner-start-trial"
        >
          Start Free Trial
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-white"
          onClick={() => logoutMutation.mutate()}
          data-testid="demo-banner-exit"
        >
          Exit Demo
        </Button>
      </div>
    </div>
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

  // Super-admin goes directly to their portal — no role selection needed
  if ((user as any)?.isSuperAdmin) {
    return <SuperAdminOverview />;
  }

  if (!(user as any)?.role) {
    return <RoleAssignment />;
  }

  const role = ((user as any).role as string).toLowerCase() as Role;

  const dashboard =
    role === 'operator' ? <OperatorDashboard /> :
    role === 'reviewer' ? <ReviewerDashboard /> :
    role === 'manager'  ? <ManagerDashboard /> :
    role === 'admin'    ? <AdminDashboard /> :
    <CustomRoleDashboard roleName={(user as any).role} />;

  return (
    <>
      <DemoBanner />
      {dashboard}
    </>
  );
}

// Wrapper component for Vendor Management with filtered navigation
function VendorManagementPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendors');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorManagement />
    </DashboardShell>
  );
}

// Wrapper component for Reports with filtered navigation
function ReportsPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('reports');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Reports"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <Reports showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Pending Payments with filtered navigation
function PendingPaymentsPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('pending-payments');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Pending Payments"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <PendingPayments />
    </DashboardShell>
  );
}

// Wrapper component for Payment Management with filtered navigation
function PaymentManagementPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('payment-management');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Payment Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <PaymentManagement />
    </DashboardShell>
  );
}

// Wrapper component for Vendor History with filtered navigation
function VendorHistoryPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor History"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorHistory />
    </DashboardShell>
  );
}

// Wrapper component for Vendor History Detail with filtered navigation
function VendorHistoryDetailPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor History"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorHistoryDetail />
    </DashboardShell>
  );
}

function VendorGroupDetailPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Vendor Group"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorGroupDetail />
    </DashboardShell>
  );
}

// Permission mapping: maps nav item IDs to database screen_keys
const navItemToScreenKey: Record<string, string> = {
  // Dashboard & Analytics
  'overview': 'dashboard',
  'sales-dashboard': 'sales_dashboard',
  'vendor-analytics': 'vendor_analytics',
  'reports': 'reports',
  // MIS Reports
  'mis-dashboard': 'mis_dashboard',
  'mis-production': 'mis_production',
  'mis-inventory': 'mis_inventory',
  'mis-sales': 'mis_sales',
  'mis-delivery': 'mis_delivery',
  'mis-cash': 'mis_cash',
  'mis-financial': 'mis_financial',
  // Quality & Checklists
  'checklists': 'checklist_templates',
  'checklist-assignments': 'checklist_assignments',
  'machine-startup-reminders': 'machine_startup_reminders',
  'whatsapp-analytics': 'whatsapp_analytics',
  // Production & Inventory
  'products': 'products',
  'product-categories': 'product_categories',
  'product-types': 'product_types',
  'raw-materials': 'raw_materials',
  'finished-goods': 'finished_goods',
  'raw-material-issuance': 'raw_material_issuance',
  'production-entries': 'production_entries',
  'production-reconciliations': 'production_reconciliations',
  'production-reconciliation-report': 'production_reconciliation_report',
  'finished-goods-report': 'finished_goods_report',
  'variance-analytics': 'variance_analytics',
  'spare-parts': 'spare_parts',
  // Finance & Sales
  'sales-orders': 'sales_orders',
  'invoices': 'invoices',
  'vendor-history': 'vendor_history',
  'vendor-debit-notes': 'vendor_debit_notes',
  'pending-payments': 'pending_payments',
  'payment-management': 'payments',
  'customer-advances': 'customer_advances',
  'credit-notes': 'credit_notes',
  'cancelled-invoices': 'cancelled_invoices_report',
  'sales-returns': 'sales_returns',
  'write-off-report': 'payment_writeoff',
  // Dispatch & Logistics
  'gatepasses': 'gatepasses',
  'dispatch-tracking': 'dispatch_tracking',
  'dispatch-masters': 'dispatch_masters',
  // Cash & Expenses
  'cash-register': 'cash_register',
  'cash-register-report': 'cash_register_report',
  'expenses': 'expenses',
  'expense-categories': 'expense_categories',
  'monthly-expenses': 'monthly_expenses',
  'documents': 'documents',
  // Accounting & Ledger
  'chart-of-accounts': 'chart_of_accounts',
  'journal-entries': 'journal_entries',
  'journal-entry-new': 'manual_journal_entry',
  'bank-transactions': 'journal_entries',
  'trial-balance': 'trial_balance',
  'profit-loss': 'profit_loss',
  'balance-sheet': 'balance_sheet',
  'ledger-view': 'ledger_view',
  'day-book': 'day_book',
  'aging-report': 'aging_report',
  'cash-flow-statement': 'cash_flow_statement',
  'group-summary': 'group_summary',
  'budget-variance': 'budget_variance',
  // Maintenance
  'maintenance': 'maintenance_plans',
  'pm-history': 'pm_history',
  'purchase-orders': 'purchase_orders',
  'purchase-returns': 'purchase_returns',
  'scrap-management': 'scrap_inventory',
  'tds-management': 'tds_management',
  // Master Data
  'users': 'users',
  'role-permissions': 'roles',
  'vendors': 'vendors',
  'vendor-types': 'vendor_types',
  'machines': 'machines',
  'machine-types': 'machine_types',
  'pm-templates': 'pm_templates',
  'uom': 'uom',
  'raw-material-types': 'raw_material_types',
  'template-management': 'template_management',
  // CRM Module
  'crm-leads': 'crm_leads',
  // HR Module
  'hr-employees': 'hr_employees',
  'hr-attendance': 'hr_attendance',
  'hr-leaves': 'hr_leaves',
  'hr-payroll': 'hr_payroll',
  'hr-exit-management': 'hr_exit_management',
  'hr-loans': 'hr_loans',
  'hr-tds': 'hr_tds',
  'hr-recruitment': 'hr_recruitment',
  'hr-reports': 'hr_reports',
  'hr-ess-admin': 'hr_ess_admin',
  'hr-masters': 'hr_masters',
  // Settings
  'notification-settings': 'notification_settings',
  'data-import': 'data_import',
  'admin-tools': 'admin_tools',
  'company-settings': 'admin_tools',
};

// Legacy permission mapping for backward compatibility with default roles
const navItemToScreen: Record<string, string> = {
  // Dashboard & Analytics
  'overview': 'Overview',
  'sales-dashboard': 'Overview',
  'vendor-analytics': 'Overview',
  'reports': 'Overview',
  // MIS Reports (admin/manager only)
  'mis-dashboard': 'MIS Reports',
  'mis-production': 'MIS Reports',
  'mis-inventory': 'MIS Reports',
  'mis-sales': 'MIS Reports',
  'mis-delivery': 'MIS Reports',
  'mis-cash': 'MIS Reports',
  'mis-financial': 'MIS Reports',
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
  'finished-goods-report': 'Create Finished Goods',
  'variance-analytics': 'Create Finished Goods',
  'spare-parts-stock': 'Spare Parts Stock',
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
  'expense-categories': 'Purchase Orders',
  'monthly-expenses': 'Purchase Orders',
  'documents': 'Documents',
  // Accounting & Ledger
  'chart-of-accounts': 'Accounting',
  'journal-entries': 'Accounting',
  'journal-entry-new': 'Accounting',
  'bank-transactions': 'Accounting',
  'trial-balance': 'Accounting',
  'profit-loss': 'Accounting',
  'balance-sheet': 'Accounting',
  'ledger-view': 'Accounting',
  'day-book': 'Accounting',
  'aging-report': 'Accounting',
  'cash-flow-statement': 'Accounting',
  'group-summary': 'Accounting',
  'budget-variance': 'Accounting',
  // CRM Module
  'crm-leads': 'CRM & Leads',
  // HR Module
  'hr-employees': 'HR & Payroll',
  'hr-attendance': 'HR & Payroll',
  'hr-leaves': 'HR & Payroll',
  'hr-payroll': 'HR & Payroll',
  'hr-exit-management': 'HR & Payroll',
  'hr-loans': 'HR & Payroll',
  'hr-tds': 'HR & Payroll',
  'hr-recruitment': 'HR & Payroll',
  'hr-reports': 'HR & Payroll',
  'hr-masters': 'HR & Payroll',
  'hr-ess-admin': 'HR & Payroll',
  // Maintenance
  'maintenance': 'Maintenance Plans',
  'pm-history': 'PM History',
  'purchase-orders': 'Purchase Orders',
  'purchase-returns': 'Purchase Orders',
  'tds-management': 'Accounting',
  'scrap-management': 'Create Finished Goods',
  'spare-parts': 'Spare Parts',
  // Master Data
  'users': 'User Management',
  'role-permissions': 'User Management',
  'vendors': 'Inventory Management',
  'vendor-types': 'Inventory Management',
  'machines': 'Machines',
  'machine-types': 'Machine Types',
  'pm-templates': 'PM Templates',
  'uom': 'Inventory Management',
  'raw-material-types': 'Inventory Management',
  'template-management': 'Inventory Management',
  // Settings
  'notification-settings': 'User Management',
  'data-import': 'User Management',
  'admin-tools': 'User Management',
  'company-settings': 'User Management',
};

// Permission matrix: which roles can access which screens
const screenPermissions: Record<string, { admin: boolean; manager: boolean; operator: boolean; reviewer: boolean }> = {
  'Overview': { admin: true, manager: true, operator: true, reviewer: true },
  'MIS Reports': { admin: true, manager: true, operator: false, reviewer: false },
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
  'Accounting': { admin: true, manager: true, operator: false, reviewer: false },
};

// Check if a nav item is accessible for a given role (for default roles)
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
  
  // Custom roles - return false so they use database permissions check
  return false;
}

// Check if a nav item is accessible using database permissions
interface Permission {
  screenKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function canAccessNavItemWithDbPermissions(itemId: string, dbPermissions: Permission[]): boolean {
  const screenKey = navItemToScreenKey[itemId];
  if (!screenKey) return false; // If not mapped, hide it for custom roles
  
  // Special case: Admin Tools - show if user has admin_tools OR data_import permission (backward compatibility)
  if (itemId === 'admin-tools') {
    const hasAdminTools = dbPermissions.find(p => p.screenKey === 'admin_tools')?.canView === true;
    const hasDataImport = dbPermissions.find(p => p.screenKey === 'data_import')?.canView === true;
    const hasUsers = dbPermissions.find(p => p.screenKey === 'users')?.canView === true;
    return hasAdminTools || hasDataImport || hasUsers;
  }
  
  // Special case: For 'reports' nav item, also check if user has any individual report_* permissions
  if (itemId === 'reports') {
    const hasReportsAccess = dbPermissions.find(p => p.screenKey === 'reports')?.canView === true;
    if (hasReportsAccess) return true;
    
    // Check for any individual report tab permissions
    const reportTabKeys = [
      'report_gatepasses', 'report_invoices', 'report_issuances', 
      'report_purchase_orders', 'report_maintenance', 'report_expenses',
      'report_cash_register', 'report_gst', 'report_payments',
      'report_finished_goods', 'report_monthly_sales', 'report_monthly_production'
    ];
    return dbPermissions.some(p => reportTabKeys.includes(p.screenKey) && p.canView === true);
  }
  
  const permission = dbPermissions.find(p => p.screenKey === screenKey);
  return permission?.canView === true;
}

// Filter nav sections - this is now a stub, actual filtering done by filterNavSectionsWithDbPermissions
function filterNavSectionsByRole(sections: NavSection[], role: string): NavSection[] {
  // 100% database driven - return empty so filterNavSectionsWithDbPermissions handles all filtering
  return [];
}

// System roles always have full access — no DB permission rows needed
const SYSTEM_ROLES_FULL_ACCESS = ['admin', 'manager', 'accountsmanager'];

// Filter nav sections using database permissions (for custom roles)
function filterNavSectionsWithDbPermissions(sections: NavSection[], dbPermissions: Permission[], roleName?: string): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];

  // System roles (admin, manager, accountsmanager) see ALL nav items — no DB filter
  const roleNameLower = roleName?.toLowerCase() || '';
  if (roleName && SYSTEM_ROLES_FULL_ACCESS.includes(roleNameLower)) {
    return sections;
  }

  if (!dbPermissions || dbPermissions.length === 0) return [];

  const filtered = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessNavItemWithDbPermissions(item.id, dbPermissions))
    }))
    .filter(section => section.items.length > 0);
    
  return filtered;
}

// Shared admin navigation sections factory - matches main dashboard navigation
function getAdminNavSections(setLocation: (path: string) => void, userRole?: string): NavSection[] {
  const allSections: NavSection[] = [
    {
      id: "dashboard",
      label: "Dashboard & Analytics",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard, onClick: () => setLocation('/') },
        { id: "sales-dashboard", label: "Sales Dashboard", icon: TrendingUp, onClick: () => setLocation('/?tab=sales-dashboard') },
        { id: "vendor-analytics", label: "Vendor Analytics", icon: Building2, onClick: () => setLocation('/vendor-analytics') },
        { id: "reports", label: "Reports", icon: FileText, onClick: () => setLocation('/reports') },
      ],
    },
    {
      id: "mis-section",
      label: "MIS Reports",
      items: [
        { id: "mis-dashboard", label: "Executive Dashboard", icon: TrendingUp, onClick: () => setLocation('/mis') },
        { id: "mis-production", label: "Production Analytics", icon: Factory, onClick: () => setLocation('/mis/production') },
        { id: "mis-inventory", label: "Inventory Intelligence", icon: Box, onClick: () => setLocation('/mis/inventory') },
        { id: "mis-sales", label: "Sales Analysis", icon: IndianRupee, onClick: () => setLocation('/mis/sales') },
        { id: "mis-delivery", label: "Delivery Performance", icon: Truck, onClick: () => setLocation('/mis/delivery') },
        { id: "mis-cash", label: "Cash Analytics", icon: Wallet, onClick: () => setLocation('/mis/cash') },
        { id: "mis-financial", label: "Financial Analytics", icon: BookOpen, onClick: () => setLocation('/mis/financial') },
      ],
    },
    {
      id: "quality-section",
      label: "Quality & Checklists",
      items: [
        { id: "checklists", label: "Checklist Builder", icon: FileText, onClick: () => setLocation('/checklists') },
        { id: "checklist-assignments", label: "Checklist Assignments", icon: ClipboardList, onClick: () => setLocation('/?tab=checklist-assignments') },
        { id: "machine-startup-reminders", label: "Machine Startup Reminders", icon: Bell, onClick: () => setLocation('/?tab=machine-startup-reminders') },
        { id: "whatsapp-analytics", label: "WhatsApp Analytics", icon: TrendingUp, onClick: () => setLocation('/?tab=whatsapp-analytics') },
      ],
    },
    {
      id: "production-section",
      label: "Production & Inventory",
      items: [
        { id: "products", label: "Product Master", icon: Package, onClick: () => setLocation('/?tab=products') },
        { id: "product-categories", label: "Product Categories", icon: Layers, onClick: () => setLocation('/?tab=product-categories') },
        { id: "product-types", label: "Product Types", icon: Archive, onClick: () => setLocation('/?tab=product-types') },
        { id: "raw-materials", label: "Raw Materials", icon: Box, onClick: () => setLocation('/?tab=raw-materials') },
        { id: "finished-goods", label: "Finished Goods", icon: CheckCircle2, onClick: () => setLocation('/?tab=finished-goods') },
        { id: "raw-material-issuance", label: "Raw Material Issuance", icon: Package, onClick: () => setLocation('/?tab=raw-material-issuance') },
        { id: "production-entries", label: "Production Entries", icon: ListChecks, onClick: () => setLocation('/?tab=production-entries') },
        { id: "production-reconciliations", label: "Production Reconciliation", icon: Calculator, onClick: () => setLocation('/?tab=production-reconciliations') },
        { id: "production-reconciliation-report", label: "Reconciliation Report", icon: FileStack, onClick: () => setLocation('/reports/production-reconciliation') },
        { id: "variance-analytics", label: "Variance Analytics", icon: TrendingUp, onClick: () => setLocation('/?tab=variance-analytics') },
        { id: "spare-parts", label: "Spare Parts", icon: Wrench, onClick: () => setLocation('/spare-parts') },
        { id: "scrap-management", label: "Scrap Management", icon: Trash2, onClick: () => setLocation('/scrap-management') },
        { id: "purchase-returns", label: "Purchase Returns", icon: PackageX, onClick: () => setLocation('/purchase-returns') },
      ],
    },
    {
      id: "finance-section",
      label: "Finance & Sales",
      items: [
        { id: "sales-orders", label: "Sales Orders", icon: ClipboardList, onClick: () => setLocation('/sales-orders') },
        { id: "invoices", label: "Sales Invoices", icon: Receipt, onClick: () => setLocation('/?tab=invoices') },
        { id: "vendor-history", label: "Vendor History", icon: History, onClick: () => setLocation('/vendor-history') },
        { id: "vendor-debit-notes", label: "Vendor Debit Notes", icon: FileX, onClick: () => setLocation('/vendor-debit-notes') },
        { id: "pending-payments", label: "Pending Payments", icon: IndianRupee, onClick: () => setLocation('/pending-payments') },
        { id: "payment-management", label: "Payment Management", icon: CreditCard, onClick: () => setLocation('/payment-management') },
        { id: "customer-advances", label: "Customer Advances", icon: Wallet, onClick: () => setLocation('/customer-advances') },
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
        { id: "gatepasses", label: "Gatepasses", icon: FileText, onClick: () => setLocation('/?tab=gatepasses') },
        { id: "dispatch-tracking", label: "Dispatch Tracking", icon: Truck, onClick: () => setLocation('/dispatch-tracking') },
        { id: "dispatch-masters", label: "Dispatch Masters", icon: Car, onClick: () => setLocation('/dispatch-masters') },
      ],
    },
    {
      id: "purchases-section",
      label: "Purchases",
      items: [
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart, onClick: () => setLocation('/?tab=purchase-orders') },
      ],
    },
    {
      id: "cash-section",
      label: "Cash & Expenses",
      items: [
        { id: "cash-register", label: "Daily Cash Register", icon: Calculator, onClick: () => setLocation('/cash-register') },
        { id: "cash-register-report", label: "Cash Register Report", icon: FileStack, onClick: () => setLocation('/cash-register-report') },
        { id: "expenses", label: "Expense Vouchers", icon: Wallet, onClick: () => setLocation('/expenses') },
        { id: "expense-categories", label: "Expense Categories", icon: Tag, onClick: () => setLocation('/expense-categories') },
        { id: "monthly-expenses", label: "Monthly Expenses", icon: Calendar, onClick: () => setLocation('/monthly-expenses') },
      ],
    },
    {
      id: "documents-section",
      label: "Documents",
      items: [
        { id: "documents", label: "Documents", icon: FolderOpen, onClick: () => setLocation('/documents') },
      ],
    },
    {
      id: "accounting-section",
      label: "Accounting & Ledger",
      items: [
        { id: "chart-of-accounts", label: "Chart of Accounts", icon: BookOpen, onClick: () => setLocation('/chart-of-accounts') },
        { id: "journal-entries", label: "Journal Entries", icon: FileStack, onClick: () => setLocation('/journal-entries') },
        { id: "bank-transactions", label: "Bank Statements", icon: Landmark, onClick: () => setLocation('/bank-transactions') },
        { id: "trial-balance", label: "Trial Balance", icon: Scale, onClick: () => setLocation('/trial-balance') },
        { id: "profit-loss", label: "Profit & Loss", icon: BarChart3, onClick: () => setLocation('/profit-loss') },
        { id: "balance-sheet", label: "Balance Sheet", icon: Scale, onClick: () => setLocation('/balance-sheet') },
        { id: "ledger-view", label: "Ledger View", icon: BookOpen, onClick: () => setLocation('/ledger-view') },
        { id: "day-book", label: "Day Book", icon: FileStack, onClick: () => setLocation('/day-book') },
        { id: "aging-report", label: "Outstanding/Aging", icon: AlertTriangle, onClick: () => setLocation('/aging-report') },
        { id: "cash-flow-statement", label: "Cash Flow Statement", icon: TrendingUp, onClick: () => setLocation('/cash-flow-statement') },
        { id: "group-summary", label: "Group Summary", icon: Layers, onClick: () => setLocation('/group-summary') },
        { id: "budget-variance", label: "Budget & Variance", icon: Scale, onClick: () => setLocation('/budget-variance') },
        { id: "tds-management", label: "TDS Management", icon: Calculator, onClick: () => setLocation('/tds-management') },
      ],
    },
    {
      id: "maintenance-section",
      label: "Maintenance",
      items: [
        { id: "maintenance", label: "PM Schedule", icon: Wrench, onClick: () => setLocation('/?tab=maintenance') },
        { id: "pm-history", label: "PM History", icon: History, onClick: () => setLocation('/?tab=pm-history') },
      ],
    },
    {
      id: "crm-section",
      label: "CRM & Leads",
      items: [
        { id: "crm-leads", label: "Lead Management", icon: Target, onClick: () => setLocation('/crm/leads') },
      ],
    },
    {
      id: "hr-section",
      label: "HR & Payroll",
      items: [
        { id: "hr-employees", label: "Employees", icon: Users, onClick: () => setLocation('/hr/employees') },
        { id: "hr-attendance", label: "Attendance", icon: Calendar, onClick: () => setLocation('/hr/attendance') },
        { id: "hr-leaves", label: "Leave Management", icon: ClipboardList, onClick: () => setLocation('/hr/leaves') },
        { id: "hr-payroll", label: "Payroll", icon: IndianRupee, onClick: () => setLocation('/hr/payroll') },
        { id: "hr-exit-management", label: "Exit Management", icon: UserX, onClick: () => setLocation('/hr/exit-management') },
        { id: "hr-loans", label: "Loans & Advances", icon: CreditCard, onClick: () => setLocation('/hr/loans') },
        { id: "hr-tds", label: "TDS & Compliance", icon: Shield, onClick: () => setLocation('/hr/tds-declarations') },
        { id: "hr-recruitment", label: "Recruitment", icon: Briefcase, onClick: () => setLocation('/hr/recruitment') },
        { id: "hr-reports", label: "HR Reports", icon: BarChart3, onClick: () => setLocation('/hr/reports') },
        { id: "hr-masters", label: "HR Masters", icon: Settings, onClick: () => setLocation('/hr/masters') },
      ],
    },
    {
      id: "master-section",
      label: "Master Data",
      items: [
        { id: "users", label: "Users", icon: Users, onClick: () => setLocation('/?tab=users') },
        { id: "role-permissions", label: "Role Permissions", icon: Shield, onClick: () => setLocation('/?tab=role-permissions') },
        { id: "sales-officers", label: "Sales Officers", icon: Users, onClick: () => setLocation('/sales-officers') },
        { id: "vendors", label: "Vendor Master", icon: Building2, onClick: () => setLocation('/vendor-management') },
        { id: "vendor-types", label: "Vendor Types", icon: Shield, onClick: () => setLocation('/vendor-types') },
        { id: "hpcl-migration", label: "HPCL Migration", icon: Building2, onClick: () => setLocation('/hpcl-migration') },
        { id: "machines", label: "Machines", icon: Settings, onClick: () => setLocation('/?tab=machines') },
        { id: "machine-types", label: "Machine Types", icon: Layers, onClick: () => setLocation('/?tab=machine-types') },
        { id: "pm-templates", label: "PM Templates", icon: ListChecks, onClick: () => setLocation('/?tab=pm-templates') },
        { id: "uom", label: "Unit of Measurement", icon: Layers, onClick: () => setLocation('/?tab=uom') },
        { id: "raw-material-types", label: "Raw Material Types", icon: Archive, onClick: () => setLocation('/?tab=raw-material-types') },
        { id: "template-management", label: "Invoice Templates", icon: FileStack, onClick: () => setLocation('/?tab=template-management') },
      ],
    },
    {
      id: "settings-section",
      label: "Settings",
      items: [
        { id: "notification-settings", label: "Notification Settings", icon: Bell, onClick: () => setLocation('/?tab=notification-settings') },
        { id: "data-import", label: "Data Import", icon: Upload, onClick: () => setLocation('/?tab=data-import') },
        { id: "admin-tools", label: "Admin Tools", icon: Wrench, onClick: () => setLocation('/admin-tools') },
        { id: "company-settings", label: "Company Settings", icon: Building2, onClick: () => setLocation('/company-settings') },
      ],
    },
  ];
  
  // If no role provided, return all sections (admin view)
  if (!userRole) return allSections;
  
  // Filter sections based on user's role permissions
  return filterNavSectionsByRole(allSections, userRole);
}

// Wrapper component for Vendor Analytics with filtered navigation
function VendorAnalyticsPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-analytics');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorAnalytics />
    </DashboardShell>
  );
}

// Wrapper component for Vendor Debit Notes page with filtered navigation
function VendorDebitNotesPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-debit-notes');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Debit Notes"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorDebitNotes />
    </DashboardShell>
  );
}

// Wrapper component for Customer Advances page with filtered navigation
function CustomerAdvancesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('customer-advances');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Customer Advances"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CustomerAdvances />
    </DashboardShell>
  );
}

// Wrapper component for Documents page with filtered navigation
function DocumentsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('documents');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Documents"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
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

// Wrapper component for Expense Categories page
function ExpenseCategoriesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('expense-categories');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Expense Categories"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <ExpenseCategoriesPage />
    </DashboardShell>
  );
}

// Wrapper component for Expenses page with filtered navigation
function ExpensesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('expenses');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Expense Vouchers"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ExpensesPage />
    </DashboardShell>
  );
}

function MonthlyExpensesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('monthly-expenses');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Monthly Expenses"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => { setActiveView(viewId); }}
    >
      <MonthlyExpensesPage />
    </DashboardShell>
  );
}

// Wrapper component for Cash Register page with filtered navigation
function CashRegisterPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-register');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Cash Register"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CashRegisterPage />
    </DashboardShell>
  );
}

function ChartOfAccountsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('chart-of-accounts');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Chart of Accounts" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <ChartOfAccountsPage />
    </DashboardShell>
  );
}


function AccountSubtypesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('chart-of-accounts');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Account Types" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <AccountSubtypesPage />
    </DashboardShell>
  );
}

function JournalEntriesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('journal-entries');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Journal Entries" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <JournalEntriesPage />
    </DashboardShell>
  );
}

function JournalEntryDetailPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('journal-entries');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Journal Entry" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <JournalEntryDetailPage />
    </DashboardShell>
  );
}

function ManualJournalEntryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('journal-entries');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="New Journal Entry" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <ManualJournalEntryPage />
    </DashboardShell>
  );
}

function TrialBalancePageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('trial-balance');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Trial Balance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <TrialBalancePage />
    </DashboardShell>
  );
}

function ProfitLossPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('profit-loss');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Profit & Loss" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <ProfitLossPage />
    </DashboardShell>
  );
}

function BalanceSheetPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('balance-sheet');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Balance Sheet" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <BalanceSheetPage />
    </DashboardShell>
  );
}

function BankTransactionsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('bank-transactions');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Bank Statements" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <BankTransactionsPage />
    </DashboardShell>
  );
}

function LedgerViewPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('ledger-view');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Ledger View" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <LedgerViewPage />
    </DashboardShell>
  );
}

function DayBookPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('day-book');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Day Book" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <DayBookPage />
    </DashboardShell>
  );
}

function AgingReportPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('aging-report');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Outstanding / Aging Report" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <AgingReportPage />
    </DashboardShell>
  );
}

function CashFlowStatementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-flow-statement');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Cash Flow Statement" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <CashFlowStatementPage />
    </DashboardShell>
  );
}

function GroupSummaryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('group-summary');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Group Summary" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <GroupSummaryPage />
    </DashboardShell>
  );
}

function BudgetVariancePageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('budget-variance');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Budget & Variance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <BudgetVariancePage />
    </DashboardShell>
  );
}

function AdminToolsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('admin-tools');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Admin Tools" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <AdminToolsPage />
    </DashboardShell>
  );
}

function TenantSettingsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('company-settings');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Company Settings" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); setLocation(`/${viewId}`); }}>
      <TenantSettings />
    </DashboardShell>
  );
}

// Wrapper component for Cash Register Report page with filtered navigation
function CashRegisterReportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-register-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Cash Register Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CashRegisterReport />
    </DashboardShell>
  );
}

// Wrapper component for Credit Notes page with filtered navigation
function CreditNotesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('credit-notes');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Credit Notes"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CreditNotes />
    </DashboardShell>
  );
}

// Wrapper component for Sales Returns page with filtered navigation
function SalesReturnsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-returns');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Sales Returns"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <SalesReturns />
    </DashboardShell>
  );
}

// Wrapper component for Write-Off Report page with filtered navigation
function WriteOffReportPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('write-off-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Write-Off Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <WriteOffReport showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Dispatch Tracking page with filtered navigation
function DispatchTrackingPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('dispatch-tracking');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Dispatch Tracking"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <DispatchTracking showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Cancelled Invoices page with filtered navigation
function CancelledInvoicesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cancelled-invoices');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Cancelled Invoices"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CancelledInvoices showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Checklists page with filtered navigation
function ChecklistsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('checklists');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Checklists"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ChecklistsPage showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Reviewer Dashboard page with filtered navigation
function ReviewerDashboardPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('overview');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Reviewer Dashboard"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ReviewerDashboardPage />
    </DashboardShell>
  );
}

// Wrapper component for Vendor Types page with filtered navigation
function VendorTypesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-types');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Types"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorTypes />
    </DashboardShell>
  );
}

// Wrapper component for HPCL Migration page with filtered navigation
function HPCLMigrationPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hpcl-migration');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="HPCL Vendor Migration"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <AdminHPCLMigration />
    </DashboardShell>
  );
}

// Wrapper component for Dispatch Masters page with filtered navigation
function DispatchMastersPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('dispatch-masters');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Dispatch Master Data"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <DispatchMasters />
    </DashboardShell>
  );
}

// Wrapper component for Invoice Detail page with filtered navigation
function InvoiceDetailPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('invoices');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Invoice Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <InvoiceDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Sales Orders page with filtered navigation
function SalesOrdersPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-orders');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Sales Orders"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <SalesOrdersPage showHeader={false} />
    </DashboardShell>
  );
}

function SalesOfficersPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-officers');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Sales Officers"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <SalesOfficersPage showHeader={false} />
    </DashboardShell>
  );
}

function SalesOrderDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-orders');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Sales Order Detail"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <SalesOrderDetailPage showHeader={false} />
    </DashboardShell>
  );
}

function RawMaterialDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('raw-materials');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Raw Material Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <RawMaterialDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Raw Material Type Detail page with filtered navigation
function RawMaterialTypeDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('raw-material-types');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Material Type Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <RawMaterialTypeDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Product Detail page with filtered navigation
function ProductDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('products');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Product Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ProductDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Finished Good Detail page with filtered navigation
function FinishedGoodDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('finished-goods');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Finished Good Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <FinishedGoodDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Production Management page with filtered navigation
function ProductionManagementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('production-entries');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Production Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ProductionManagement />
    </DashboardShell>
  );
}

// Wrapper component for Production Reconciliation Report page with filtered navigation
function ProductionReconciliationReportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('production-reconciliation-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Production Reconciliation Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ProductionReconciliationReport />
    </DashboardShell>
  );
}

// Wrapper component for Finished Goods Report page with filtered navigation
function FinishedGoodsReportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('finished-goods-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Finished Goods Inventory Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <FinishedGoodsReport />
    </DashboardShell>
  );
}

// MIS Dashboard wrapper
function MISDashboardPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-dashboard');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="MIS Executive Dashboard"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISDashboard />
    </DashboardShell>
  );
}

// MIS Production Analytics wrapper
function MISProductionPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-production');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Production Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISProduction />
    </DashboardShell>
  );
}

// MIS Inventory Intelligence wrapper
function MISInventoryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-inventory');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Inventory Intelligence"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISInventory />
    </DashboardShell>
  );
}

// MIS Sales Analysis wrapper
function MISSalesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-sales');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Sales Analysis"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISSales />
    </DashboardShell>
  );
}

// MIS Financial Analytics wrapper
function MISFinancialPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-financial');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Financial Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISFinancial />
    </DashboardShell>
  );
}

// MIS Cash Analytics wrapper
function MISCashPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-cash');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Cash Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISCash />
    </DashboardShell>
  );
}

// MIS Delivery Performance wrapper
function MISDeliveryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-delivery');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Delivery Performance"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISDelivery />
    </DashboardShell>
  );
}

function SparePartsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('spare-parts');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Spare Parts" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <SpareParts />
    </DashboardShell>
  );
}

function ScrapManagementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('scrap-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Scrap Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <ScrapManagement />
    </DashboardShell>
  );
}

function PurchaseReturnsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('purchase-returns');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Purchase Returns" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <PurchaseReturns />
    </DashboardShell>
  );
}

function TDSManagementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('tds-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="TDS Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <TDSManagement />
    </DashboardShell>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainContent = document.querySelector('.flex-1.pt-16');
    if (mainContent) mainContent.scrollTop = 0;
  }, [location]);
  return null;
}

function SmartRoot() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  if (!user) return <LandingPage />;
  return <AuthenticatedApp />;
}

// ── HR Module Wrappers ────────────────────────────────────────────────────────
function HREmployeesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-employees');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Employees" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HREmployeesPage />
    </DashboardShell>
  );
}

function HRAttendanceWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-attendance');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Attendance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRAttendancePage />
    </DashboardShell>
  );
}

function HRLeavesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-leaves');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Leave Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRLeavesPage />
    </DashboardShell>
  );
}

function HRPayrollWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-payroll');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Payroll" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRPayrollPage />
    </DashboardShell>
  );
}

function HRMastersWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-masters');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="HR Masters" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRMastersPage />
    </DashboardShell>
  );
}

function HRReportsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-reports');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="HR Reports" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRReportsPage />
    </DashboardShell>
  );
}

function HRExitManagementWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-exit-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Exit Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRExitManagementPage />
    </DashboardShell>
  );
}

function HRTdsDeclarationsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-tds');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="TDS & Compliance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRTdsDeclarationsPage />
    </DashboardShell>
  );
}

function CRMLeadsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('crm-leads');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Lead Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <CRMLeadsPage />
    </DashboardShell>
  );
}

function HRRecruitmentWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-recruitment');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Recruitment" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRRecruitmentPage />
    </DashboardShell>
  );
}

function HRLoansWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-loans');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Loans & Advances" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <HRLoansPage />
    </DashboardShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/company" component={CompanySelectPage} />
      <Route path="/company-select" component={CompanySelectPage} />
      <Route path="/register-company" component={RegisterCompanyPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <ProtectedRoute path="/super-admin/overview" component={() => <SuperAdminOverview />} />
      <ProtectedRoute path="/super-admin/tenants" component={() => <SuperAdminTenants />} />
      <ProtectedRoute path="/super-admin/billing" component={() => <SuperAdminBilling />} />
      <ProtectedRoute path="/super-admin/plans" component={() => <SuperAdminPlans />} />
      <ProtectedRoute path="/super-admin/demo-requests" component={() => <SuperAdminDemoRequests />} />
      <ProtectedRoute path="/super-admin/backups" component={() => <SuperAdminBackups />} />
      <Route path="/print/invoice/:id" component={PrintInvoicePage} />
      <Route path="/print/gatepass/:id" component={PrintGatepassPage} />
      <Route path="/print/credit-note/:id" component={PrintCreditNotePage} />
      <Route path="/print/debit-note/:id" component={PrintDebitNotePage} />
      <Route path="/print/invoice-gatepass/:invoiceId/:gatepassId" component={PrintInvoiceGatepassPage} />
      <ProtectedRoute path="/checklists" component={ChecklistsPageWrapper} />
      <ProtectedRoute path="/reviewer-dashboard" component={ReviewerDashboardPageWrapper} />
      <ProtectedRoute path="/vendor-types" component={VendorTypesPageWrapper} />
      <ProtectedRoute path="/hpcl-migration" component={HPCLMigrationPageWrapper} />
      <ProtectedRoute path="/vendor-management" component={VendorManagementPage} />
      <ProtectedRoute path="/vendor-history" component={VendorHistoryPage} />
      <ProtectedRoute path="/vendor-group/:vendorName" component={VendorGroupDetailPage} />
      <ProtectedRoute path="/vendor-history/:vendorId" component={VendorHistoryDetailPage} />
      <ProtectedRoute path="/invoice/:id" component={InvoiceDetailPageWrapper} />
      <ProtectedRoute path="/sales-orders" component={SalesOrdersPageWrapper} />
      <ProtectedRoute path="/sales-orders/:id" component={SalesOrderDetailWrapper} />
      <ProtectedRoute path="/sales-officers" component={SalesOfficersPageWrapper} />
      <ProtectedRoute path="/raw-material/:id" component={RawMaterialDetailWrapper} />
      <ProtectedRoute path="/raw-material-type/:id" component={RawMaterialTypeDetailWrapper} />
      <ProtectedRoute path="/product/:id" component={ProductDetailWrapper} />
      <ProtectedRoute path="/finished-good/:id" component={FinishedGoodDetailWrapper} />
      <ProtectedRoute path="/dispatch-tracking" component={DispatchTrackingPageWrapper} />
      <ProtectedRoute path="/dispatch-masters" component={DispatchMastersPageWrapper} />
      <ProtectedRoute path="/sales-returns" component={SalesReturnsPageWrapper} />
      <ProtectedRoute path="/credit-notes" component={CreditNotesPageWrapper} />
      <ProtectedRoute path="/cancelled-invoices" component={CancelledInvoicesPageWrapper} />
      <ProtectedRoute path="/write-off-report" component={WriteOffReportPageWrapper} />
      <ProtectedRoute path="/pending-payments" component={PendingPaymentsPage} />
      <ProtectedRoute path="/payment-management" component={PaymentManagementPage} />
      <ProtectedRoute path="/vendor-analytics" component={VendorAnalyticsPage} />
      <ProtectedRoute path="/spare-parts" component={SparePartsPageWrapper} />
      <ProtectedRoute path="/scrap-management" component={ScrapManagementPageWrapper} />
      <ProtectedRoute path="/purchase-returns" component={PurchaseReturnsPageWrapper} />
      <ProtectedRoute path="/tds-management" component={TDSManagementPageWrapper} />
      <ProtectedRoute path="/vendor-debit-notes" component={VendorDebitNotesPage} />
      <ProtectedRoute path="/customer-advances" component={CustomerAdvancesPageWrapper} />
      <ProtectedRoute path="/mis" component={MISDashboardPageWrapper} />
      <ProtectedRoute path="/mis/production" component={MISProductionPageWrapper} />
      <ProtectedRoute path="/mis/inventory" component={MISInventoryPageWrapper} />
      <ProtectedRoute path="/mis/sales" component={MISSalesPageWrapper} />
      <ProtectedRoute path="/mis/delivery" component={MISDeliveryPageWrapper} />
      <ProtectedRoute path="/mis/cash" component={MISCashPageWrapper} />
      <ProtectedRoute path="/mis/financial" component={MISFinancialPageWrapper} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/production-management" component={ProductionManagementPageWrapper} />
      <ProtectedRoute path="/reports/production-reconciliation" component={ProductionReconciliationReportWrapper} />
      <ProtectedRoute path="/reports/finished-goods" component={FinishedGoodsReportWrapper} />
      <ProtectedRoute path="/documents" component={DocumentsPageWrapper} />
      <ProtectedRoute path="/expenses" component={ExpensesPageWrapper} />
      <ProtectedRoute path="/expense-categories" component={ExpenseCategoriesPageWrapper} />
      <ProtectedRoute path="/monthly-expenses" component={MonthlyExpensesPageWrapper} />
      <ProtectedRoute path="/cash-register" component={CashRegisterPageWrapper} />
      <ProtectedRoute path="/cash-register-report" component={CashRegisterReportWrapper} />
      <ProtectedRoute path="/cash-register/vouchers/print" component={CashRegisterVoucherPrint} />
      <ProtectedRoute path="/chart-of-accounts" component={ChartOfAccountsPageWrapper} />
      <ProtectedRoute path="/account-types" component={AccountSubtypesPageWrapper} />
      <ProtectedRoute path="/journal-entries" component={JournalEntriesPageWrapper} />
      <ProtectedRoute path="/trial-balance" component={TrialBalancePageWrapper} />
      <ProtectedRoute path="/profit-loss" component={ProfitLossPageWrapper} />
      <ProtectedRoute path="/balance-sheet" component={BalanceSheetPageWrapper} />
      <ProtectedRoute path="/bank-transactions" component={BankTransactionsPageWrapper} />
      <ProtectedRoute path="/ledger-view" component={LedgerViewPageWrapper} />
      <ProtectedRoute path="/day-book" component={DayBookPageWrapper} />
      <ProtectedRoute path="/aging-report" component={AgingReportPageWrapper} />
      <ProtectedRoute path="/cash-flow-statement" component={CashFlowStatementPageWrapper} />
      <ProtectedRoute path="/group-summary" component={GroupSummaryPageWrapper} />
      <ProtectedRoute path="/budget-variance" component={BudgetVariancePageWrapper} />
      <ProtectedRoute path="/admin-tools" component={AdminToolsPageWrapper} />
      <ProtectedRoute path="/company-settings" component={TenantSettingsPageWrapper} />
      <ProtectedRoute path="/hr/employees" component={HREmployeesWrapper} />
      <ProtectedRoute path="/hr/attendance" component={HRAttendanceWrapper} />
      <ProtectedRoute path="/hr/leaves" component={HRLeavesWrapper} />
      <ProtectedRoute path="/hr/payroll" component={HRPayrollWrapper} />
      <ProtectedRoute path="/hr/masters" component={HRMastersWrapper} />
      <ProtectedRoute path="/hr/exit-management" component={HRExitManagementWrapper} />
      <ProtectedRoute path="/hr/loans" component={HRLoansWrapper} />
      <ProtectedRoute path="/hr/tds-declarations" component={HRTdsDeclarationsWrapper} />
      <ProtectedRoute path="/crm/leads" component={CRMLeadsWrapper} />
      <ProtectedRoute path="/hr/recruitment" component={HRRecruitmentWrapper} />
      <ProtectedRoute path="/hr/reports" component={HRReportsWrapper} />
      <Route path="/hr/payslip/:id" component={HRPayslipPage} />
      <Route path="/ess" component={EssLogin} />
      <Route path="/ess/portal" component={EssPortal} />
      <ProtectedRoute path="/pricing" component={() => (
        <div className="flex-1 overflow-auto">
          <PricingPage />
        </div>
      )} />
      <ProtectedRoute path="/journal-entry/new" component={ManualJournalEntryPageWrapper} />
      <ProtectedRoute path="/journal-entry/:id" component={JournalEntryDetailPageWrapper} />
      <Route path="/" component={SmartRoot} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ScrollToTop />
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
