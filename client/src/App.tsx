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
import MobileHeader from "@/components/MobileHeader";
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
import InventorySummaryDashboard from "@/components/InventorySummaryDashboard";
import RolePermissionsView from "@/components/RolePermissionsView";
import RoleManagement from "@/components/RoleManagement";
import { CheckCircle, Clock, XCircle, AlertTriangle, ClipboardCheck, Settings, Calendar, Users, FileText, Wrench, Plus, LogOut, Package, Layers, ShoppingCart, ListChecks, History, LayoutDashboard, Archive, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

type Role = 'admin' | 'operator' | 'reviewer' | 'manager';

function OperatorDashboard() {
  const [activeView, setActiveView] = useState<'dashboard' | 'checklist' | 'history'>('dashboard');

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

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader notificationCount={1} title="Operator Dashboard" onMenuClick={() => {
        if (confirm('Do you want to logout?')) {
          window.location.href = '/api/logout';
        }
      }} />
      
      <div className="pt-14 pb-20">
        {activeView === 'dashboard' && (
          <div className="p-4 space-y-6">
            <DashboardStats stats={mockStats} />
            
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
      </div>

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
        </div>
      </div>
    </div>
  );
}

function ReviewerDashboard() {
  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'Ramesh Kumar', status: 'pending' as const },
    { id: '2', machine: 'PET Blowing Machine', date: 'Oct 31, 2025', shift: 'Afternoon', operator: 'Priya Sharma', status: 'pending' as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader notificationCount={2} title="Reviewer Dashboard" onMenuClick={() => {
        if (confirm('Do you want to logout?')) {
          window.location.href = '/api/logout';
        }
      }} />
      
      <div className="pt-14 p-4 space-y-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Pending Reviews</h3>
          <p className="text-3xl font-bold text-primary">{mockRecords.length}</p>
        </Card>

        <div>
          <h3 className="text-base font-semibold mb-3">Submissions to Review</h3>
          <ChecklistHistoryTable records={mockRecords} />
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'Ramesh Kumar', status: 'in_review' as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader notificationCount={1} title="Manager Dashboard" onMenuClick={() => {
        if (confirm('Do you want to logout?')) {
          window.location.href = '/api/logout';
        }
      }} />
      
      <div className="pt-14">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b bg-card sticky top-14 z-40">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
              <TabsTrigger value="overview" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-overview">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-inventory">
                <Archive className="h-4 w-4 mr-1" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-purchase-orders">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Purchase Orders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <div className="p-4 space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2">Awaiting Final Approval</h3>
                <p className="text-3xl font-bold text-primary">{mockRecords.length}</p>
              </Card>

              <div>
                <h3 className="text-base font-semibold mb-3">For Your Approval</h3>
                <ChecklistHistoryTable records={mockRecords} />
              </div>
            </div>

            <InventorySummaryDashboard />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="purchase-orders" className="p-4">
            <PurchaseOrderManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
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

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader notificationCount={0} title="Admin Dashboard" onMenuClick={() => {
        if (confirm('Do you want to logout?')) {
          window.location.href = '/api/logout';
        }
      }} />
      
      <div className="pt-14">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b bg-card sticky top-14 z-40">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
              <TabsTrigger value="overview" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-overview">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-users">
                <Users className="h-4 w-4 mr-1" />
                Users
              </TabsTrigger>
              <TabsTrigger value="role-permissions" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-role-permissions">
                <Shield className="h-4 w-4 mr-1" />
                Role Permissions
              </TabsTrigger>
              <TabsTrigger value="machines" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-machines">
                <Settings className="h-4 w-4 mr-1" />
                Machines
              </TabsTrigger>
              <TabsTrigger value="checklists" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-checklists">
                <FileText className="h-4 w-4 mr-1" />
                Checklists
              </TabsTrigger>
              <TabsTrigger value="spare-parts" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-spare-parts">
                <Package className="h-4 w-4 mr-1" />
                Spare Parts
              </TabsTrigger>
              <TabsTrigger value="machine-types" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-machine-types">
                <Layers className="h-4 w-4 mr-1" />
                Machine Types
              </TabsTrigger>
              <TabsTrigger value="pm-templates" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-pm-templates">
                <ListChecks className="h-4 w-4 mr-1" />
                PM Templates
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-maintenance">
                <Wrench className="h-4 w-4 mr-1" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="pm-history" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-pm-history">
                <History className="h-4 w-4 mr-1" />
                PM History
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-purchase-orders">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Purchase Orders
              </TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-none border-b-2 data-[state=active]:border-primary" data-testid="tab-inventory">
                <Archive className="h-4 w-4 mr-1" />
                Inventory
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="p-4">
              <AdminDashboardOverview onNavigateToTab={setActiveTab} />
            </div>
            <InventorySummaryDashboard />
          </TabsContent>

          <TabsContent value="users" className="p-4">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="role-permissions" className="p-4">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="machines" className="p-4">
            <AdminMachineConfig />
          </TabsContent>

          <TabsContent value="checklists" className="p-4">
            <AdminChecklistBuilder />
          </TabsContent>

          <TabsContent value="spare-parts" className="p-4">
            <AdminSparePartsManagement />
          </TabsContent>

          <TabsContent value="machine-types" className="p-4">
            <AdminMachineTypeConfig />
          </TabsContent>

          <TabsContent value="pm-templates" className="p-4">
            <AdminPMTaskListTemplates />
          </TabsContent>

          <TabsContent value="maintenance" className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Preventive Maintenance</h2>
                <Button onClick={() => setIsPMDialogOpen(true)} data-testid="button-add-maintenance">
                  <Plus className="h-4 w-4 mr-1" />
                  Schedule PM
                </Button>
              </div>
              <MaintenanceSchedule tasks={mockMaintenanceTasks} onComplete={handleCompletePM} />
            </div>
          </TabsContent>

          <TabsContent value="pm-history" className="p-4">
            <PMHistoryView />
          </TabsContent>

          <TabsContent value="purchase-orders" className="p-4">
            <PurchaseOrderManagement />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>
        </Tabs>
        
        <SchedulePMDialog open={isPMDialogOpen} onOpenChange={setIsPMDialogOpen} />
        <PMExecutionDialog 
          open={isExecutionDialogOpen} 
          onOpenChange={setIsExecutionDialogOpen} 
          plan={selectedPlanForExecution} 
        />
      </div>
    </div>
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

  if (!user?.role) {
    return <RoleAssignment />;
  }

  const role = user.role as Role;

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
