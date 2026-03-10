import { useMemo, useRef } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { type NavSection } from "@/components/VerticalNavSidebar";

interface Permission {
  screenKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const navItemToScreenKey: Record<string, string> = {
  'overview': 'dashboard',
  'sales-dashboard': 'sales_dashboard',
  'vendor-analytics': 'vendor_analytics',
  'reports': 'reports',
  'mis-dashboard': 'mis_dashboard',
  'mis-production': 'mis_production',
  'mis-inventory': 'mis_inventory',
  'mis-sales': 'mis_sales',
  'mis-delivery': 'mis_delivery',
  'checklists': 'checklist_templates',
  'checklist-assignments': 'checklist_assignments',
  'machine-startup-reminders': 'machine_startup_reminders',
  'whatsapp-analytics': 'whatsapp_analytics',
  'products': 'products',
  'product-categories': 'product_categories',
  'product-types': 'product_types',
  'raw-materials': 'raw_materials',
  'finished-goods': 'finished_goods',
  'raw-material-issuance': 'raw_material_issuance',
  'production-entries': 'production_entries',
  'production-reconciliations': 'production_reconciliations',
  'production-reconciliation-report': 'production_reconciliation_report',
  'variance-analytics': 'variance_analytics',
  'sales-orders': 'sales_orders',
  'invoices': 'invoices',
  'vendor-history': 'vendors',
  'pending-payments': 'pending_payments',
  'payment-management': 'payments',
  'customer-advances': 'customer_advances',
  'credit-notes': 'credit_notes',
  'cancelled-invoices': 'cancelled_invoices_report',
  'sales-returns': 'sales_returns',
  'write-off-report': 'payment_writeoff',
  'gatepasses': 'gatepasses',
  'dispatch-tracking': 'dispatch_tracking',
  'dispatch-masters': 'dispatch_masters',
  'cash-register': 'cash_register',
  'cash-register-report': 'cash_register_report',
  'expenses': 'expenses',
  'documents': 'documents',
  'maintenance': 'maintenance_plans',
  'pm-history': 'pm_history',
  'purchase-orders': 'purchase_orders',
  'vendor-debit-notes': 'vendor_debit_notes',
  'users': 'users',
  'role-permissions': 'roles',
  'vendors': 'vendors',
  'vendor-types': 'vendor_types',
  'machines': 'machines',
  'machine-types': 'machine_types',
  'spare-parts': 'spare_parts',
  'pm-templates': 'pm_templates',
  'uom': 'uom',
  'raw-material-types': 'raw_material_types',
  'template-management': 'template_management',
  'notification-settings': 'notification_settings',
  'data-import': 'data_import',
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
  'admin-tools': 'admin_tools',
};

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
  'MIS Reports': { admin: true, manager: true, operator: false, reviewer: false },
  'Accounting & Ledger': { admin: true, manager: true, operator: false, reviewer: false },
};

const navItemToScreen: Record<string, string> = {
  'overview': 'Overview',
  'sales-dashboard': 'Overview',
  'vendor-analytics': 'Overview',
  'reports': 'Overview',
  'mis-dashboard': 'MIS Reports',
  'mis-production': 'MIS Reports',
  'mis-inventory': 'MIS Reports',
  'mis-sales': 'MIS Reports',
  'mis-delivery': 'MIS Reports',
  'checklists': 'Checklist Templates',
  'checklist-assignments': 'Checklist Templates',
  'machine-startup-reminders': 'Checklist Templates',
  'whatsapp-analytics': 'Checklist Templates',
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
  'invoices': 'Purchase Orders',
  'vendor-history': 'Purchase Orders',
  'pending-payments': 'Purchase Orders',
  'payment-management': 'Purchase Orders',
  'customer-advances': 'Purchase Orders',
  'credit-notes': 'Purchase Orders',
  'cancelled-invoices': 'Purchase Orders',
  'sales-returns': 'Purchase Orders',
  'write-off-report': 'Purchase Orders',
  'gatepasses': 'Purchase Orders',
  'dispatch-tracking': 'Purchase Orders',
  'dispatch-masters': 'Purchase Orders',
  'cash-register': 'Purchase Orders',
  'cash-register-report': 'Purchase Orders',
  'expenses': 'Purchase Orders',
  'documents': 'Inventory Management',
  'maintenance': 'Maintenance Plans',
  'pm-history': 'PM History',
  'purchase-orders': 'Purchase Orders',
  'vendor-debit-notes': 'Purchase Orders',
  'users': 'User Management',
  'role-permissions': 'User Management',
  'vendors': 'Inventory Management',
  'vendor-types': 'Inventory Management',
  'machines': 'Machines',
  'machine-types': 'Machine Types',
  'spare-parts-stock': 'Inventory Management',
  'pm-templates': 'PM Templates',
  'uom': 'Inventory Management',
  'raw-material-types': 'Inventory Management',
  'template-management': 'Inventory Management',
  'notification-settings': 'User Management',
  'data-import': 'User Management',
  'chart-of-accounts': 'Accounting & Ledger',
  'journal-entries': 'Accounting & Ledger',
  'bank-transactions': 'Accounting & Ledger',
  'trial-balance': 'Accounting & Ledger',
  'profit-loss': 'Accounting & Ledger',
  'balance-sheet': 'Accounting & Ledger',
  'ledger-view': 'Accounting & Ledger',
  'day-book': 'Accounting & Ledger',
  'aging-report': 'Accounting & Ledger',
  'cash-flow-statement': 'Accounting & Ledger',
  'group-summary': 'Accounting & Ledger',
  'budget-variance': 'Accounting & Ledger',
  'admin-tools': 'User Management',
};

function canAccessNavItemForDefaultRole(itemId: string, role: string): boolean {
  const screenName = navItemToScreen[itemId];
  if (!screenName) return true;
  
  const permissions = screenPermissions[screenName];
  if (!permissions) return true;
  
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') return permissions.admin;
  if (roleLower === 'manager') return permissions.manager;
  if (roleLower === 'operator') return permissions.operator;
  if (roleLower === 'reviewer') return permissions.reviewer;
  
  return false;
}

function canAccessNavItemWithDbPermissions(itemId: string, dbPermissions: Permission[]): boolean {
  const screenKey = navItemToScreenKey[itemId];
  if (!screenKey) return false;

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
      'report_finished_goods', 'report_monthly_sales'
    ];
    return dbPermissions.some(p => reportTabKeys.includes(p.screenKey) && p.canView === true);
  }
  
  const permission = dbPermissions.find(p => p.screenKey === screenKey);
  return permission?.canView === true;
}

function filterNavSectionsForDefaultRole(sections: NavSection[], role: string): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];
  
  const filtered = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessNavItemForDefaultRole(item.id, role))
    }))
    .filter(section => section.items.length > 0);
    
  return filtered.length > 0 ? filtered : sections;
}

function filterNavSectionsWithDbPermissions(sections: NavSection[], dbPermissions: Permission[]): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];
  if (!dbPermissions || dbPermissions.length === 0) return [];
  
  const filtered = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessNavItemWithDbPermissions(item.id, dbPermissions))
    }))
    .filter(section => section.items.length > 0);
    
  return filtered;
}

export function useFilteredNavigation(allNavSections: NavSection[]) {
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const lastValidRef = useRef<NavSection[]>([]);
  
  const navSections = useMemo(() => {
    if (permissionsLoading || !permissions || permissions.length === 0) {
      return lastValidRef.current;
    }
    const filtered = filterNavSectionsWithDbPermissions(allNavSections, permissions);
    if (filtered.length > 0) {
      lastValidRef.current = filtered;
    }
    return filtered.length > 0 ? filtered : lastValidRef.current;
  }, [allNavSections, permissions, permissionsLoading]);

  return { 
    navSections,
    isLoading: permissionsLoading && lastValidRef.current.length === 0
  };
}
