import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Shield, Check, X, AlertTriangle, RefreshCw, Copy, Eye, EyeOff, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { ROLE_MODULE_RELEVANCE } from "@/lib/role-module-relevance";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  recordStatus: number;
}

interface RolePermission {
  id: string;
  roleId: string;
  screenKey: string;
  canView: number;
  canCreate: number;
  canEdit: number;
  canDelete: number;
}

interface ScreenDefinition {
  key: string;
  label: string;
  allowedActions: ('view' | 'create' | 'edit' | 'delete')[];
  module?: string; // undefined = always shown (core admin screens)
}


// Available screens in the system - comprehensive list of all modules/pages
// Keys use snake_case format for database storage (backward compatible with existing role_permissions records)
const AVAILABLE_SCREENS: ScreenDefinition[] = [
  // Dashboards & Overview — always visible (core admin)
  { key: 'dashboard',       label: 'Dashboard',       allowedActions: ['view'] },
  { key: 'sales_dashboard', label: 'Sales Dashboard', allowedActions: ['view'], module: 'invoicing' },
  { key: 'reports',         label: 'Reports (All Tabs)', allowedActions: ['view'] },
  
  // Individual Report Tabs
  { key: 'report_gatepasses',          label: 'Report: Gatepasses',          allowedActions: ['view'], module: 'gatepasses' },
  { key: 'report_invoices',            label: 'Report: Invoices',             allowedActions: ['view'], module: 'invoicing' },
  { key: 'report_issuances',           label: 'Report: Issuances',            allowedActions: ['view'], module: 'production' },
  { key: 'report_purchase_orders',     label: 'Report: Purchase Orders',      allowedActions: ['view'], module: 'purchase_orders' },
  { key: 'report_maintenance',         label: 'Report: Maintenance',          allowedActions: ['view'], module: 'maintenance' },
  { key: 'report_expenses',            label: 'Report: Expenses',             allowedActions: ['view'], module: 'expenses' },
  { key: 'report_cash_register',       label: 'Report: Cash Register',        allowedActions: ['view'], module: 'expenses' },
  { key: 'report_gst',                 label: 'Report: GST Reports',          allowedActions: ['view'], module: 'invoicing' },
  { key: 'report_payments',            label: 'Report: Payments',             allowedActions: ['view'], module: 'invoicing' },
  { key: 'report_finished_goods',      label: 'Report: Finished Goods',       allowedActions: ['view'], module: 'production' },
  { key: 'report_monthly_sales',       label: 'Report: Monthly Sales',        allowedActions: ['view'], module: 'invoicing' },
  { key: 'report_machines',            label: 'Report: Machine Reports',      allowedActions: ['view'], module: 'maintenance' },
  { key: 'report_scrap',               label: 'Report: Scrap Report',         allowedActions: ['view'], module: 'production' },
  { key: 'report_sales_returns',       label: 'Report: Sales Returns',        allowedActions: ['view'], module: 'quality_returns' },
  { key: 'report_repacking',           label: 'Report: Repacking',            allowedActions: ['view'], module: 'production' },
  { key: 'report_vendor_report',       label: 'Report: Vendor Report',        allowedActions: ['view'], module: 'purchase_orders' },
  { key: 'report_monthly_production',  label: 'Report: Monthly Production',   allowedActions: ['view'], module: 'production' },
  
  // Analytics & Reports
  { key: 'production_reconciliation_report', label: 'Production Reconciliation Report', allowedActions: ['view'], module: 'production' },
  { key: 'variance_analytics',         label: 'Variance Analytics',           allowedActions: ['view'], module: 'production' },
  { key: 'whatsapp_analytics',         label: 'WhatsApp Analytics',           allowedActions: ['view'], module: 'whatsapp' },
  { key: 'pm_history',                 label: 'PM History',                   allowedActions: ['view'], module: 'maintenance' },
  { key: 'vendor_analytics',           label: 'Vendor Analytics',             allowedActions: ['view'], module: 'purchase_orders' },
  { key: 'vendor_history',             label: 'Vendor History',               allowedActions: ['view'], module: 'purchase_orders' },
  { key: 'pending_payments',           label: 'Pending Payments',             allowedActions: ['view'], module: 'invoicing' },
  { key: 'write_off_report',           label: 'Write-Off Report',             allowedActions: ['view'], module: 'invoicing' },
  { key: 'reviewer_dashboard',         label: 'Reviewer Dashboard',           allowedActions: ['view'], module: 'whatsapp' },
  { key: 'payments',                   label: 'Payment Management',           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'payment_management',         label: 'Payment Management (Admin Tools)', allowedActions: ['edit', 'delete'], module: 'invoicing' },
  { key: 'bulk_payment_report',        label: 'Bulk Payment Report (Download)', allowedActions: ['view'], module: 'invoicing' },
  { key: 'customer_advances',          label: 'Customer Advances',            allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'cancelled_invoices_report',  label: 'Cancelled Invoices Report',    allowedActions: ['view'], module: 'invoicing' },
  { key: 'cash_register_report',       label: 'Cash Register Report',         allowedActions: ['view'], module: 'expenses' },
  
  // MIS
  { key: 'mis_dashboard',  label: 'MIS Executive Dashboard',     allowedActions: ['view'], module: 'mis' },
  { key: 'mis_production', label: 'MIS Production Analytics',    allowedActions: ['view'], module: 'mis' },
  { key: 'mis_inventory',  label: 'MIS Inventory Intelligence',  allowedActions: ['view'], module: 'mis' },
  { key: 'mis_sales',      label: 'MIS Sales Analysis',          allowedActions: ['view'], module: 'mis' },
  { key: 'mis_delivery',   label: 'MIS Delivery Performance',    allowedActions: ['view'], module: 'mis' },
  { key: 'mis_cash',       label: 'MIS Cash Analytics',          allowedActions: ['view'], module: 'mis' },
  { key: 'mis_financial',  label: 'MIS Financial Analytics',     allowedActions: ['view'], module: 'mis' },
  
  // Master Data - Products & Materials
  { key: 'products',           label: 'Products',            allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'raw_materials',      label: 'Raw Materials',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'finished_goods',     label: 'Finished Goods',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'raw_material_types', label: 'Raw Material Types',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'product_categories', label: 'Product Categories',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'product_types',      label: 'Product Types',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  
  // Master Data - Supporting
  { key: 'uom',          label: 'Units of Measure',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'vendors',      label: 'Vendor Master',        allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'vendor_types', label: 'Vendor Types',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'inventory',    label: 'Inventory Management', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  
  // Quality & Maintenance
  { key: 'machines',               label: 'Machines',                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'machine_types',          label: 'Machine Types',             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'spare_parts',            label: 'Spare Parts (Catalog)',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'spare_parts_stock',      label: 'Spare Parts Stock',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'checklist_templates',    label: 'Checklist Templates',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'checklist_assignments',  label: 'Checklist Assignments',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'checklists',             label: 'Checklists',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'maintenance_plans',      label: 'Maintenance Plans',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'pm_templates',           label: 'PM Task Templates',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'pm_execution',           label: 'PM Execution',              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  
  // Operations & Transactions
  { key: 'purchase_orders',            label: 'Purchase Orders',                        allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'purchase_returns',           label: 'Purchase Returns',                       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'raw_material_issuance',      label: 'Raw Material Issuance',                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_entries',         label: 'Production Entries',                     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_reconciliations', label: 'Production Reconciliation',              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_management',      label: 'Production Management',                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'sales_orders',               label: 'Sales Orders',                           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'sales_orders' },
  { key: 'sales_officers',             label: 'Sales Officers (Master)',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'sales_orders' },
  { key: 'gatepasses',                 label: 'Gatepasses',                             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gatepasses' },
  { key: 'invoices',                   label: 'Sales Invoices',                         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'credit_notes',               label: 'Credit Notes',                           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'quality_returns' },
  { key: 'vendor_debit_notes',         label: 'Vendor Debit Notes',                     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'dispatch_tracking',          label: 'Dispatch Tracking',                      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gatepasses' },
  { key: 'dispatch_masters',           label: 'Dispatch Masters (Vehicles/Drivers/Transporters)', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gatepasses' },
  { key: 'sales_returns',              label: 'Sales Returns',                          allowedActions: ['view', 'create', 'edit', 'delete'], module: 'quality_returns' },
  
  // Document & Expense Management
  { key: 'documents',          label: 'Documents',          allowedActions: ['view', 'create', 'edit', 'delete'], module: 'documents' },
  { key: 'document_categories',label: 'Document Categories', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'documents' },
  { key: 'expenses',           label: 'Expense Vouchers',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'expense_categories', label: 'Expense Categories', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'monthly_expenses',   label: 'Monthly Expenses',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'cash_register',      label: 'Cash Register',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  
  // Accounting & Ledger
  { key: 'chart_of_accounts',   label: 'Chart of Accounts',               allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'journal_entries',     label: 'Journal Entries',                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'manual_journal_entry',label: 'Manual Journal Entry',             allowedActions: ['view', 'create'],                  module: 'accounting' },
  { key: 'trial_balance',       label: 'Trial Balance',                    allowedActions: ['view'],                            module: 'accounting' },
  { key: 'profit_loss',         label: 'Profit & Loss Statement',          allowedActions: ['view'],                            module: 'accounting' },
  { key: 'balance_sheet',       label: 'Balance Sheet',                    allowedActions: ['view'],                            module: 'accounting' },
  { key: 'bank_transactions',   label: 'Bank Statements & Transactions',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'ledger_view',         label: 'Ledger View',                      allowedActions: ['view'],                            module: 'accounting' },
  { key: 'day_book',            label: 'Day Book',                         allowedActions: ['view'],                            module: 'accounting' },
  { key: 'aging_report',        label: 'Outstanding / Aging Report',       allowedActions: ['view'],                            module: 'accounting' },
  { key: 'cash_flow_statement', label: 'Cash Flow Statement',              allowedActions: ['view'],                            module: 'accounting' },
  { key: 'group_summary',       label: 'Group Summary',                    allowedActions: ['view'],                            module: 'accounting' },
  { key: 'budget_variance',     label: 'Budget & Variance',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'tds_management',      label: 'TDS Management',                   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'scrap_inventory',     label: 'Scrap Inventory / Scrap Management', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  
  // System & Configuration — always visible (core admin)
  { key: 'users',                    label: 'User Management',         allowedActions: ['view', 'create', 'edit', 'delete'] },
  { key: 'roles',                    label: 'Role Management',         allowedActions: ['view', 'create', 'edit', 'delete'] },
  { key: 'notification_settings',    label: 'Notification Settings',   allowedActions: ['view', 'edit'] },
  { key: 'api_keys',                 label: 'API Hub (API Management)',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'api_hub' },
  { key: 'invoice_templates',        label: 'Invoice Templates',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'template_management',      label: 'Template Management',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'machine_startup_reminders',label: 'Machine Startup Reminders', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'vyapaar_import',           label: 'Vyapaar Data Import',     allowedActions: ['view', 'create'], module: 'basic_inventory' },
  { key: 'data_import',              label: 'Data Import',             allowedActions: ['view', 'create'], module: 'basic_inventory' },
  { key: 'payment_writeoff',         label: 'Payment Write-Off',       allowedActions: ['view', 'create', 'delete'], module: 'invoicing' },

  // CRM
  { key: 'crm_leads', label: 'CRM: Lead Management', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'crm' },

  // HR & Payroll
  { key: 'hr_employees',      label: 'HR: Employee Master',                              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_attendance',     label: 'HR: Attendance',                                   allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_leaves',         label: 'HR: Leave Management',                             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_payroll',        label: 'HR: Payroll Processing',                           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_exit_management',label: 'HR: Exit Management & F&F',                        allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_loans',          label: 'HR: Loans & Advances',                             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_tds',            label: 'HR: TDS & Compliance',                             allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_recruitment',    label: 'HR: Recruitment',                                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_reports',        label: 'HR: Reports',                                      allowedActions: ['view'],                             module: 'hr_payroll' },
  { key: 'hr_ess_admin',      label: 'HR: ESS Portal Management (Set Passwords / Enable Access)', allowedActions: ['view', 'create', 'edit'], module: 'hr_payroll' },
  { key: 'hr_masters',        label: 'HR: Masters (Dept/Designation/Shift/Leave Types)', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
];

export default function RoleManagement() {
  const { toast } = useToast();
  const { modules } = usePlanFeatures();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  
  // Create role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  // Role name availability check
  type RoleAvailStatus = 'idle' | 'checking' | 'available' | 'taken';
  const [roleNameStatus, setRoleNameStatus] = useState<RoleAvailStatus>('idle');
  const roleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkRoleName = (value: string) => {
    if (roleDebounce.current) clearTimeout(roleDebounce.current);
    if (!value.trim() || value.trim().length < 2) { setRoleNameStatus('idle'); return; }
    setRoleNameStatus('checking');
    roleDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/roles/check-name?name=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setRoleNameStatus(data.available ? 'available' : 'taken');
      } catch { setRoleNameStatus('idle'); }
    }, 500);
  };
  
  // Edit role form
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');
  
  // Permissions state
  const [permissions, setPermissions] = useState<Map<string, RolePermission>>(new Map());
  const [originalPermissions, setOriginalPermissions] = useState<Map<string, RolePermission>>(new Map());
  const [copyFromRoleId, setCopyFromRoleId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);
  const [permSearch, setPermSearch] = useState('');

  // Filter screens to only those relevant to the tenant's plan modules
  const activeScreens = AVAILABLE_SCREENS.filter(
    s => !s.module || modules.includes(s.module)
  );

  // Fetch roles
  const { data: allRoles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  // Filter roles list: hide plan-irrelevant default roles (operator, reviewer, accountsmanager)
  // so HR-only tenants don't see manufacturing/accounting roles they'll never use.
  const roles = allRoles.filter(role => {
    const relevantModules = ROLE_MODULE_RELEVANCE[role.name.toLowerCase()];
    if (!relevantModules) return true; // no restriction = always show
    return relevantModules.some(m => modules.includes(m));
  });

  // Fetch all role permissions
  const { data: allPermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ['/api/role-permissions'],
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await apiRequest('POST', '/api/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({
        title: "Role created",
        description: "New role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role.",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsEditDialogOpen(false);
      setEditingRole(null);
      toast({
        title: "Role updated",
        description: "Role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/roles/${id}`, {});
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeletingRoleId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({
        title: "Role deleted",
        description: "Role has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role.",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const syncPermissionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/tenant/sync-permissions', {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      toast({ title: "Permissions synced", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error.message || "Failed to sync permissions.", variant: "destructive" });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: any[] }) => {
      return await apiRequest('PUT', `/api/roles/${roleId}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      setIsPermissionsDialogOpen(false);
      setPermissionsRole(null);
      setPermSearch('');
      toast({
        title: "Permissions updated",
        description: "Role permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions.",
        variant: "destructive",
      });
    },
  });

  const resetCreateForm = () => {
    setNewRoleName('');
    setNewRoleDescription('');
    setRoleNameStatus('idle');
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required.",
        variant: "destructive",
      });
      return;
    }
    if (roleNameStatus === 'taken') {
      toast({ title: "Role name taken", description: "Please choose a different role name.", variant: "destructive" });
      return;
    }

    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
    });
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!editingRole) return;

    if (!editRoleName.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required.",
        variant: "destructive",
      });
      return;
    }

    updateRoleMutation.mutate({
      id: editingRole.id,
      data: {
        name: editRoleName.trim(),
        description: editRoleDescription.trim(),
      },
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (['admin', 'manager', 'operator', 'reviewer'].includes(role.name)) {
      toast({
        title: "Cannot delete",
        description: "Default system roles cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    setDeletingRoleId(role.id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingRoleId) {
      deleteRoleMutation.mutate(deletingRoleId);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingRoleId(null);
    }
  };

  const handleEditPermissions = (role: Role) => {
    setPermissionsRole(role);
    setCopyFromRoleId('');
    
    const rolePerms = allPermissions.filter(p => p.roleId === role.id);
    const permsMap = new Map<string, RolePermission>();
    rolePerms.forEach(p => {
      permsMap.set(p.screenKey, p);
    });
    
    setPermissions(permsMap);
    setOriginalPermissions(new Map(permsMap));
    setIsPermissionsDialogOpen(true);
  };

  const handleCopyFromRole = async () => {
    if (!copyFromRoleId || !permissionsRole) return;
    setIsCopying(true);
    try {
      const res = await apiRequest('GET', `/api/roles/${copyFromRoleId}/permissions`);
      const sourcePerms: RolePermission[] = await res.json();
      const newPermissions = new Map(permissions);
      for (const p of sourcePerms) {
        newPermissions.set(p.screenKey, {
          ...p,
          id: permissions.get(p.screenKey)?.id || '',
          roleId: permissionsRole.id,
        });
      }
      setPermissions(newPermissions);
      const sourceName = roles.find(r => r.id === copyFromRoleId)?.name ?? 'role';
      toast({ title: "Permissions copied", description: `Permissions copied from ${sourceName}. Click Save to apply.` });
    } catch {
      toast({ title: "Error", description: "Failed to copy permissions.", variant: "destructive" });
    } finally {
      setIsCopying(false);
    }
  };

  const handleEnableAllView = () => {
    const newPermissions = new Map(permissions);
    for (const screen of activeScreens) {
      if (!screen.allowedActions.includes('view')) continue;
      const existing = newPermissions.get(screen.key) || {
        id: '', roleId: permissionsRole?.id || '', screenKey: screen.key,
        canView: 0, canCreate: 0, canEdit: 0, canDelete: 0,
      };
      newPermissions.set(screen.key, { ...existing, canView: 1 });
    }
    setPermissions(newPermissions);
  };

  const handleClearAll = () => {
    const newPermissions = new Map(permissions);
    for (const screen of activeScreens) {
      const existing = newPermissions.get(screen.key);
      if (existing) {
        newPermissions.set(screen.key, { ...existing, canView: 0, canCreate: 0, canEdit: 0, canDelete: 0 });
      }
    }
    setPermissions(newPermissions);
  };

  const handleTogglePermission = (screenKey: string, permType: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    const current = permissions.get(screenKey) || {
      id: '',
      roleId: permissionsRole?.id || '',
      screenKey,
      canView: 0,
      canCreate: 0,
      canEdit: 0,
      canDelete: 0,
    };

    const updated = {
      ...current,
      [permType]: current[permType] === 1 ? 0 : 1,
    };

    const newPermissions = new Map(permissions);
    newPermissions.set(screenKey, updated);
    setPermissions(newPermissions);
  };

  const handleSavePermissions = () => {
    if (!permissionsRole) return;

    const permissionsArray = activeScreens.reduce<{ screenKey: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[]>((acc, screen) => {
      const perm = permissions.get(screen.key) || {
        screenKey: screen.key,
        canView: 0,
        canCreate: 0,
        canEdit: 0,
        canDelete: 0,
      };
      const orig = originalPermissions.get(screen.key) || {
        screenKey: screen.key,
        canView: 0,
        canCreate: 0,
        canEdit: 0,
        canDelete: 0,
      };

      const hasChanged =
        perm.canView !== orig.canView ||
        perm.canCreate !== orig.canCreate ||
        perm.canEdit !== orig.canEdit ||
        perm.canDelete !== orig.canDelete;

      if (hasChanged || originalPermissions.has(screen.key)) {
        acc.push({
          screenKey: screen.key,
          canView: perm.canView === 1,
          canCreate: perm.canCreate === 1,
          canEdit: perm.canEdit === 1,
          canDelete: perm.canDelete === 1,
        });
      }
      return acc;
    }, []);

    updatePermissionsMutation.mutate({
      roleId: permissionsRole.id,
      permissions: permissionsArray,
    });
  };

  const getPermission = (screenKey: string, permType: 'canView' | 'canCreate' | 'canEdit' | 'canDelete'): boolean => {
    const perm = permissions.get(screenKey);
    return perm ? perm[permType] === 1 : false;
  };

  const isDefaultRole = (roleName: string) => {
    return ['admin', 'manager', 'operator', 'reviewer'].includes(roleName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage roles and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncPermissionsMutation.mutate()}
            disabled={syncPermissionsMutation.isPending}
            data-testid="button-sync-permissions"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncPermissionsMutation.isPending ? 'animate-spin' : ''}`} />
            {syncPermissionsMutation.isPending ? 'Syncing...' : 'Sync New Screens'}
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-role"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {rolesLoading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading roles...</p>
        </Card>
      ) : roles.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No roles found. Create your first role to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role, index) => (
            <Card key={role.id} className="p-6" data-testid={`card-role-${index}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold" data-testid={`text-role-name-${index}`}>
                      {role.name}
                    </h3>
                    {isDefaultRole(role.name) && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {role.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPermissions(role)}
                  data-testid={`button-edit-permissions-${index}`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Permissions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditRole(role)}
                  data-testid={`button-edit-role-${index}`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {!isDefaultRole(role.name) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRole(role)}
                    data-testid={`button-delete-role-${index}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-role">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <div className="relative">
                <Input
                  id="role-name"
                  placeholder="e.g., supervisor, quality_inspector"
                  value={newRoleName}
                  onChange={(e) => { setNewRoleName(e.target.value); checkRoleName(e.target.value); }}
                  className={`pr-9 ${roleNameStatus === 'available' ? 'border-emerald-500 focus-visible:ring-emerald-500' : roleNameStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  data-testid="input-role-name"
                />
                <div className="absolute right-3 top-2.5">
                  {roleNameStatus === 'checking'  && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {roleNameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {roleNameStatus === 'taken'     && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              {roleNameStatus === 'available' && <p className="text-xs text-emerald-600 font-medium">Role name is available</p>}
              {roleNameStatus === 'taken'     && <p className="text-xs text-destructive">Role name already exists — choose another</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                placeholder="Describe the role and its responsibilities"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                data-testid="input-role-description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-role">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                placeholder="Role name"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                disabled={editingRole ? isDefaultRole(editingRole.name) : false}
                data-testid="input-edit-role-name"
              />
              {editingRole && isDefaultRole(editingRole.name) && (
                <p className="text-xs text-muted-foreground">
                  Default role names cannot be changed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                placeholder="Role description"
                value={editRoleDescription}
                onChange={(e) => setEditRoleDescription(e.target.value)}
                data-testid="input-edit-role-description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateRoleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-edit-permissions">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions: {permissionsRole?.name}
            </DialogTitle>
            {permissionsRole && isDefaultRole(permissionsRole.name) && (
              <p className="text-sm text-amber-600 font-medium">
                Warning: Modifying permissions for the "{permissionsRole.name}" default role. Ensure critical access (users, roles) is not removed.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Configure which screens and features this role can access
            </p>
          </DialogHeader>
          {permissionsRole && isDefaultRole(permissionsRole.name) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="warning-default-role">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Warning: You are editing a default system role (<strong>{permissionsRole.name}</strong>). Ensure critical access (users, roles) is not removed — losing admin access may lock all users out.
              </span>
            </div>
          )}

          {/* Quick-action toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Quick actions:</span>
            <div className="flex items-center gap-2">
              <Select value={copyFromRoleId} onValueChange={setCopyFromRoleId}>
                <SelectTrigger className="h-8 w-[160px]" data-testid="select-copy-from-role">
                  <SelectValue placeholder="Copy from role…" />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter(r => r.id !== permissionsRole?.id)
                    .map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyFromRole}
                disabled={!copyFromRoleId || isCopying}
                data-testid="button-apply-copy-from-role"
              >
                <Copy className="w-3 h-3 mr-1" />
                {isCopying ? "Copying…" : "Apply"}
              </Button>
            </div>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnableAllView}
              data-testid="button-enable-all-view"
            >
              <Eye className="w-3 h-3 mr-1" />
              Enable all view
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAll}
              data-testid="button-clear-all-permissions"
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Clear all
            </Button>
          </div>

          <div className="pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search screens…"
                value={permSearch}
                onChange={e => setPermSearch(e.target.value)}
                className="pl-8 pr-8"
                data-testid="input-perm-search"
              />
              {permSearch && (
                <button
                  onClick={() => setPermSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="pb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Screen</th>
                    <th className="text-center py-2 px-2">View</th>
                    <th className="text-center py-2 px-2">Create</th>
                    <th className="text-center py-2 px-2">Edit</th>
                    <th className="text-center py-2 px-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {activeScreens
                    .filter(s => !permSearch.trim() || s.label.toLowerCase().includes(permSearch.trim().toLowerCase()))
                    .map((screen, index) => (
                    <tr key={screen.key} className="border-b hover-elevate" data-testid={`row-permission-${index}`}>
                      <td className="py-3 px-2 font-medium">{screen.label}</td>
                      <td className="text-center py-3 px-2">
                        {screen.allowedActions.includes('view') ? (
                          <Checkbox
                            checked={getPermission(screen.key, 'canView')}
                            onCheckedChange={() => handleTogglePermission(screen.key, 'canView')}
                            data-testid={`checkbox-view-${index}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {screen.allowedActions.includes('create') ? (
                          <Checkbox
                            checked={getPermission(screen.key, 'canCreate')}
                            onCheckedChange={() => handleTogglePermission(screen.key, 'canCreate')}
                            data-testid={`checkbox-create-${index}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {screen.allowedActions.includes('edit') ? (
                          <Checkbox
                            checked={getPermission(screen.key, 'canEdit')}
                            onCheckedChange={() => handleTogglePermission(screen.key, 'canEdit')}
                            data-testid={`checkbox-edit-${index}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {screen.allowedActions.includes('delete') ? (
                          <Checkbox
                            checked={getPermission(screen.key, 'canDelete')}
                            onCheckedChange={() => handleTogglePermission(screen.key, 'canDelete')}
                            data-testid={`checkbox-delete-${index}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsPermissionsDialogOpen(false); setPermSearch(''); }}
              data-testid="button-cancel-permissions"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
              data-testid="button-save-permissions"
            >
              {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        onConfirm={confirmDelete}
        title="Delete Role?"
        description="This action cannot be undone. This will permanently delete the role from the system."
        isPending={deleteRoleMutation.isPending}
      />
    </div>
  );
}
