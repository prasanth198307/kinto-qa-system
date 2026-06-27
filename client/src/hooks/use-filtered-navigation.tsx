import { useMemo, useRef } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { type NavSection } from "@/components/VerticalNavSidebar";
import { useModuleLabels } from "@/hooks/use-module-labels";
import { navItemToScreenKey } from "@shared/nav-screen-map";

interface Permission {
  screenKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

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
  'Sales Officers': { admin: true, manager: true, operator: false, reviewer: false },
  'API Hub': { admin: true, manager: true, operator: false, reviewer: false },
  'HR & Payroll': { admin: true, manager: true, operator: false, reviewer: false },
  'Projects & Assets': { admin: true, manager: true, operator: false, reviewer: false },
  'Industry Verticals': { admin: true, manager: true, operator: false, reviewer: false },
  'Point of Sale': { admin: true, manager: true, operator: true, reviewer: false },
  'Gold & Jewellery ERP': { admin: true, manager: true, operator: true, reviewer: false },
};

const navItemToScreen: Record<string, string> = {
  'overview': 'Overview',
  'sales-dashboard': 'Overview',
  'vendor-analytics': 'Overview',
  'reports': 'Overview',
  'mis-dashboard': 'MIS Reports',
  'mis-production': 'Production',
  'mis-inventory': 'MIS Reports',
  'mis-sales': 'MIS Reports',
  'mis-delivery': 'MIS Reports',
  'mis-cash': 'MIS Reports',
  'mis-financial': 'MIS Reports',
  'mis-manufacturing': 'Production',
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
  'customer-outstanding-report': 'Purchase Orders',
  'gatepasses': 'Purchase Orders',
  'dispatch-tracking': 'Purchase Orders',
  'dispatch-masters': 'Purchase Orders',
  'cash-register': 'Purchase Orders',
  'cash-register-report': 'Purchase Orders',
  'expenses': 'Purchase Orders',
  'expense-categories': 'Purchase Orders',
  'monthly-expenses': 'Purchase Orders',
  'documents': 'Inventory Management',
  'maintenance': 'Maintenance Plans',
  'pm-history': 'PM History',
  'purchase-orders': 'Purchase Orders',
  'vendor-debit-notes': 'Purchase Orders',
  'users': 'User Management',
  'role-permissions': 'User Management',
  'sales-orders': 'Purchase Orders',
  'sales-officers': 'Production',
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
  'company-settings': 'User Management',
  'api-keys': 'API Hub',
  // New Phase features
  'hr-expense-claims': 'HR & Payroll',
  'hr-onboarding': 'HR & Payroll',
  'hr-letters': 'HR & Payroll',
  'hr-support-desk': 'HR & Payroll',
  'crm-surveys': 'CRM & Leads',
  'timesheets': 'HR & Payroll',
  'hr-appraisals': 'HR & Payroll',
  'recurring-invoices': 'Purchase Orders',
  'warehouses': 'Inventory Management',
  'inventory-bulk-import': 'Inventory Management',
  'inventory-grn-scan': 'Inventory Management',
  'inventory-stock-adjustments': 'Inventory Management',
  'projects': 'Projects & Assets',
  'fixed-assets': 'Projects & Assets',
  'currency-management': 'Accounting & Ledger',
  // Generic ERP gap features
  'purchase-requisitions': 'Purchase Orders',
  'goods-receipt-notes': 'Purchase Orders',
  'cost-centres': 'Accounting & Ledger',
  'gstr-reports': 'Accounting & Ledger',
  'price-lists': 'Inventory Management',
  'approval-workflows': 'User Management',
  'audit-log': 'User Management',
  // Industry Verticals
  'healthcare': 'Industry Verticals',
  'hotel': 'Industry Verticals',
  'restaurant': 'Industry Verticals',
  'crm-pipeline': 'Industry Verticals',
  'ecommerce': 'Industry Verticals',
  'ngo': 'Industry Verticals',
  'pharmacy': 'Industry Verticals',
  'education': 'Industry Verticals',
  'logistics': 'Industry Verticals',
  'real-estate': 'Industry Verticals',
  'agriculture': 'Industry Verticals',
  // Standalone modules (separate nav sections)
  'pos': 'Point of Sale',
  'gold-erp': 'Gold & Jewellery ERP',
  // Gold ERP sub-items (all map to same screen permission)
  'gold-erp-overview': 'Gold & Jewellery ERP',
  'gold-erp-rates': 'Gold & Jewellery ERP',
  'gold-erp-karigar': 'Gold & Jewellery ERP',
  'gold-erp-items': 'Gold & Jewellery ERP',
  'gold-erp-estimates': 'Gold & Jewellery ERP',
  'gold-erp-metal-ledger': 'Gold & Jewellery ERP',
  'gold-erp-analytics': 'Gold & Jewellery ERP',
  'gold-erp-production': 'Gold & Jewellery ERP',
  'gold-erp-jobwork': 'Gold & Jewellery ERP',
  'gold-erp-sketch': 'Gold & Jewellery ERP',
  'gold-erp-cad': 'Gold & Jewellery ERP',
  'gold-erp-ghat': 'Gold & Jewellery ERP',
  'gold-erp-settlement': 'Gold & Jewellery ERP',
  'gold-erp-finalize': 'Gold & Jewellery ERP',
  'gold-erp-karigar-ledger': 'Gold & Jewellery ERP',
  'gold-erp-repairs': 'Gold & Jewellery ERP',
  'gold-erp-wholesale-jobwork': 'Gold & Jewellery ERP',
  'gold-erp-hallmarking-batches': 'Gold & Jewellery ERP',
  'gold-erp-counter-bookings': 'Gold & Jewellery ERP',
  'gold-erp-customer-approvals': 'Gold & Jewellery ERP',
  'gold-erp-buyback': 'Gold & Jewellery ERP',
  'gold-erp-physical-audit': 'Gold & Jewellery ERP',
  'gold-erp-loyalty': 'Gold & Jewellery ERP',
  'gold-erp-promotions': 'Gold & Jewellery ERP',
  'gold-erp-refining': 'Gold & Jewellery ERP',
  'gold-erp-pos-old-gold': 'Gold & Jewellery ERP',
  'gold-erp-hallmarking': 'Gold & Jewellery ERP',
  'gold-erp-bullion': 'Gold & Jewellery ERP',
  'gold-erp-bullion-bookings': 'Gold & Jewellery ERP',
  'gold-erp-vault-audit': 'Gold & Jewellery ERP',
  'gold-erp-chit': 'Gold & Jewellery ERP',
  'gold-erp-chit-maturity': 'Gold & Jewellery ERP',
  'gold-erp-chit-defaulters': 'Gold & Jewellery ERP',
  'gold-erp-chit-redemptions': 'Gold & Jewellery ERP',
  'gold-erp-ecatalog': 'Gold & Jewellery ERP',
  'gold-erp-oms-orders': 'Gold & Jewellery ERP',
  'gold-erp-oms-notify': 'Gold & Jewellery ERP',
  'gold-erp-ecommerce': 'Gold & Jewellery ERP',
  'gold-erp-rfid': 'Gold & Jewellery ERP',
  'gold-erp-metal-finance': 'Gold & Jewellery ERP',
  'gold-erp-integrations-config': 'Gold & Jewellery ERP',
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
      'report_finished_goods', 'report_monthly_sales', 'report_monthly_production'
    ];
    return dbPermissions.some(p => reportTabKeys.includes(p.screenKey) && p.canView === true);
  }
  
  const permission = dbPermissions.find(p => p.screenKey === screenKey);
  return permission?.canView === true;
}

function filterNavSectionsForDefaultRole(sections: NavSection[], role: string): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];
  
  const filtered = sections
    .map(section => {
      const filteredItems = section.items.filter(item => canAccessNavItemForDefaultRole(item.id, role));
      const filteredSubs = (section.subSections ?? [])
        .map(sub => ({ ...sub, items: sub.items.filter(item => canAccessNavItemForDefaultRole(item.id, role)) }))
        .filter(sub => sub.items.length > 0);
      return { ...section, items: filteredItems, subSections: filteredSubs };
    })
    .filter(section => section.items.length > 0 || (section.subSections ?? []).length > 0);
    
  return filtered.length > 0 ? filtered : sections;
}

function filterNavSectionsWithDbPermissions(sections: NavSection[], dbPermissions: Permission[]): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];
  if (!dbPermissions || dbPermissions.length === 0) return [];
  
  const filtered = sections
    .map(section => {
      const filteredItems = section.items.filter(item => canAccessNavItemWithDbPermissions(item.id, dbPermissions));
      const filteredSubs = (section.subSections ?? [])
        .map(sub => ({ ...sub, items: sub.items.filter(item => canAccessNavItemWithDbPermissions(item.id, dbPermissions)) }))
        .filter(sub => sub.items.length > 0);
      return { ...section, items: filteredItems, subSections: filteredSubs };
    })
    .filter(section => section.items.length > 0 || (section.subSections ?? []).length > 0);
    
  return filtered;
}

// System roles always get full nav — no DB permission rows needed
const SYSTEM_ROLES_FULL_ACCESS = ['admin', 'manager', 'accountsmanager'];

// These nav items are available on every plan — user/role management and
// core company settings must never be hidden, regardless of which modules a
// tenant has subscribed to. Keep this list minimal: only items that make
// sense for ANY plan (including HR-only, accounting-only, etc.).
const CORE_ADMIN_NAV = new Set([
  'overview',
  'users',
  'role-permissions',
  'company-settings',
  'notification-settings',
]);

function filterNavSectionsByPlan(sections: NavSection[], allowedNavItems: string[]): NavSection[] {
  if (!allowedNavItems || allowedNavItems.length === 0) return sections;
  const allowed = new Set(allowedNavItems);
  return sections
    .map(section => {
      const filteredItems = section.items.filter(item => allowed.has(item.id) || CORE_ADMIN_NAV.has(item.id));
      const filteredSubs = (section.subSections ?? [])
        .map(sub => ({ ...sub, items: sub.items.filter(item => allowed.has(item.id) || CORE_ADMIN_NAV.has(item.id)) }))
        .filter(sub => sub.items.length > 0);
      return { ...section, items: filteredItems, subSections: filteredSubs };
    })
    .filter(section => section.items.length > 0 || (section.subSections ?? []).length > 0);
}

export function useFilteredNavigation(allNavSections: NavSection[]) {
  const { permissions, role: roleName, roles: allRoles, isLoading: permissionsLoading } = usePermissions();
  const { allowedNavItems, isLoading: planLoading } = usePlanFeatures();
  const { applyModuleLabelsToNav } = useModuleLabels();
  const lastValidRef = useRef<NavSection[]>([]);
  
  const navSections = useMemo(() => {
    // First apply plan-level filtering (hides modules not in subscription)
    const planFiltered = allowedNavItems.length > 0
      ? filterNavSectionsByPlan(allNavSections, allowedNavItems)
      : allNavSections;

    // System roles bypass role/permission filtering — only plan gating applies
    // Check ALL assigned roles: if ANY is a system role, grant full nav access
    const rolesToCheck = allRoles.length > 0 ? allRoles : (roleName ? [roleName] : []);
    if (rolesToCheck.some(r => SYSTEM_ROLES_FULL_ACCESS.includes(r.toLowerCase()))) {
      const labeled = applyModuleLabelsToNav(planFiltered);
      lastValidRef.current = labeled;
      return labeled;
    }

    if (permissionsLoading || !permissions || permissions.length === 0) {
      return lastValidRef.current;
    }
    const filtered = filterNavSectionsWithDbPermissions(planFiltered, permissions);
    const labeled = applyModuleLabelsToNav(filtered);
    if (labeled.length > 0) {
      lastValidRef.current = labeled;
    }
    return labeled.length > 0 ? labeled : lastValidRef.current;
  }, [allNavSections, permissions, permissionsLoading, roleName, allowedNavItems, applyModuleLabelsToNav]);

  return { 
    navSections,
    isLoading: (permissionsLoading || planLoading) && lastValidRef.current.length === 0
  };
}
