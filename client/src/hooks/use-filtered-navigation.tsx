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
  'Finance & Accounts': { admin: true, manager: true, operator: false, reviewer: false },
  'Finance': { admin: true, manager: true, operator: false, reviewer: false },
  'Sales Officers': { admin: true, manager: true, operator: false, reviewer: false },
  'API Hub': { admin: true, manager: true, operator: false, reviewer: false },
  'Extended Suite': { admin: true, manager: true, operator: true, reviewer: false },
  'HR & Payroll': { admin: true, manager: true, operator: false, reviewer: false },
  'Projects & Assets': { admin: true, manager: true, operator: false, reviewer: false },
  'Industry Verticals': { admin: true, manager: true, operator: false, reviewer: false },
  'Point of Sale': { admin: true, manager: true, operator: true, reviewer: false },
  'Gold & Jewellery ERP': { admin: true, manager: true, operator: true, reviewer: false },
  'hotel': { admin: true, manager: true, operator: true, reviewer: false },
  'healthcare': { admin: true, manager: true, operator: true, reviewer: false },
  'pharmacy': { admin: true, manager: true, operator: true, reviewer: false },
  'ngo': { admin: true, manager: true, operator: false, reviewer: false },
  'nidhi': { admin: true, manager: true, operator: true, reviewer: false },
  'crm': { admin: true, manager: true, operator: true, reviewer: false },
  'logistics': { admin: true, manager: true, operator: true, reviewer: false },
  'real-estate': { admin: true, manager: true, operator: false, reviewer: false },
  'agriculture': { admin: true, manager: true, operator: true, reviewer: false },
  'education': { admin: true, manager: true, operator: true, reviewer: false },
  'ecommerce': { admin: true, manager: true, operator: true, reviewer: false },
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
  'manufacturing/job-cards': 'Production',
  'manufacturing/sub-contracting': 'Production',
  'manufacturing/machine-oee': 'Maintenance Plans',
  'manufacturing/barcode-scanner': 'Production',
  'manufacturing/preventive-maintenance': 'Maintenance Plans',
  'manufacturing/bom-versions': 'Production',
  'manufacturing/supply-chain': 'Production',
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
  'chart-of-accounts': 'Finance & Accounts',
  'journal-entries': 'Finance & Accounts',
  'bank-transactions': 'Finance & Accounts',
  'trial-balance': 'Finance & Accounts',
  'profit-loss': 'Finance & Accounts',
  'balance-sheet': 'Finance & Accounts',
  'ledger-view': 'Finance & Accounts',
  'day-book': 'Finance & Accounts',
  'aging-report': 'Finance & Accounts',
  'cash-flow-statement': 'Finance & Accounts',
  'group-summary': 'Finance & Accounts',
  'budget-variance': 'Finance & Accounts',
  'admin-tools': 'User Management',
  'company-settings': 'User Management',
  'language-settings': 'User Management',
  'api-keys': 'API Hub',
  // New Phase features
  'hr-expense-claims': 'HR & Payroll',
  'hr-onboarding': 'HR & Payroll',
  'hr-letters': 'HR & Payroll',
  'hr-support-desk': 'HR & Payroll',
  'hr/epfo-filing': 'HR & Payroll',
  'hr/offer-letters': 'HR & Payroll',
  'hr/biometric': 'HR & Payroll',
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
  'currency-management': 'Finance & Accounts',
  'tax-engine': 'Finance & Accounts',
  // Generic ERP gap features
  'purchase-requisitions': 'Purchase Orders',
  'goods-receipt-notes': 'Purchase Orders',
  'cost-centres': 'Finance & Accounts',
  'gstr-reports': 'Finance & Accounts',
  'finance/recurring-journals': 'Finance & Accounts',
  'finance/consolidation': 'Finance & Accounts',
  'finance/ifrs-reporting': 'Finance & Accounts',
  'finance/zatca-portal': 'Finance & Accounts',
  'finance/gstr-filing-new': 'Finance & Accounts',
  'finance/investor-pack': 'Finance & Accounts',
  'ifrs/consolidation': 'Finance & Accounts',
  'investor/dashboard': 'Finance & Accounts',
  'investor/cap-table': 'Finance & Accounts',
  'price-lists': 'Inventory Management',
  'approval-workflows': 'User Management',
  'audit-log': 'User Management',
  // Finance & Accounts (merged)
  'tds-management': 'Finance & Accounts',
  // Industry Verticals
  'crm-pipeline': 'Industry Verticals',
  // Individual ERP screen nav IDs
  'restaurant/pos': 'restaurant', 'restaurant/kitchen': 'restaurant',
  'restaurant/tables': 'restaurant', 'restaurant/menu': 'restaurant',
  'restaurant/orders': 'restaurant', 'restaurant/delivery': 'restaurant',
  'restaurant/reservations': 'restaurant', 'restaurant/shifts': 'restaurant',
  'restaurant/customers': 'restaurant', 'restaurant/inventory': 'restaurant',
  'restaurant/outlets': 'restaurant', 'restaurant/reports': 'restaurant',
  // Hyphen-format IDs (actual nav item IDs used in App.tsx)
  'restaurant-pos': 'restaurant', 'restaurant-kitchen': 'restaurant',
  'restaurant-tables': 'restaurant', 'restaurant-menu': 'restaurant',
  'restaurant-orders': 'restaurant', 'restaurant-delivery': 'restaurant',
  'restaurant-reservations': 'restaurant', 'restaurant-shifts': 'restaurant',
  'restaurant-customers': 'restaurant', 'restaurant-inventory': 'restaurant',
  'restaurant-outlets': 'restaurant', 'restaurant-reports': 'restaurant',
  'restaurant-erp-section': 'restaurant',
  'restaurant-aggregators': 'restaurant', 'restaurant-analytics': 'restaurant',
  'restaurant-staff': 'restaurant', 'restaurant-steward': 'restaurant',
  'restaurant-franchise': 'restaurant',
  'restaurant-tax-settings': 'restaurant',
  'restaurant-gift-cards': 'restaurant',
  'restaurant-central-kitchen': 'restaurant',
  'restaurant-menu-translations': 'restaurant',
  'restaurant-table-order': 'restaurant',
  'restaurant-cds': 'restaurant',
  'restaurant-campaigns': 'restaurant',
  'restaurant-recipes': 'restaurant',
  'restaurant-payment-terminal': 'restaurant',
  'restaurant/ondc-integration': 'restaurant',
  'restaurant/loyalty-expiry': 'restaurant',
  'restaurant-kiosk': 'restaurant',
  'hotel/front-desk': 'hotel', 'hotel/reservations': 'hotel',
  'hotel/checkin': 'hotel', 'hotel/rooms': 'hotel',
  'hotel/folio': 'hotel', 'hotel/housekeeping': 'hotel',
  'hotel/rates': 'hotel', 'hotel/corporate': 'hotel',
  'hotel/night-audit': 'hotel', 'hotel/reports': 'hotel',
  'hotel/channel-manager': 'hotel', 'hotel/revenue-management': 'hotel',
  'hotel/banquet': 'hotel',
  'healthcare/patients': 'healthcare', 'healthcare/opd': 'healthcare',
  'healthcare/ipd': 'healthcare', 'healthcare/beds': 'healthcare',
  'healthcare/ot': 'healthcare', 'healthcare/lab': 'healthcare',
  'healthcare/nursing': 'healthcare', 'healthcare/insurance': 'healthcare',
  'healthcare/doctors': 'healthcare', 'healthcare/blood-bank': 'healthcare',
  'healthcare/reports': 'healthcare', 'healthcare/abdm': 'healthcare',
  'healthcare/emr': 'healthcare', 'healthcare/tpa-claims': 'healthcare',
  'ngo/donors': 'ngo', 'ngo/donations': 'ngo',
  'ngo/80g': 'ngo', 'ngo/projects': 'ngo',
  'ngo/beneficiaries': 'ngo', 'ngo/grants': 'ngo',
  'ngo/volunteers': 'ngo', 'ngo/fcra': 'ngo',
  'ngo/reports': 'ngo', 'ngo/80g-bulk': 'ngo',
  'ngo/csr': 'ngo', 'ngo/funds': 'ngo', 'ngo/donor-admin': 'ngo',
  // Extended App Suite — plan-gated add-on modules
  'swachsign': 'swachsign', 'swachdesk': 'swachdesk',
  'swachdesk-reports': 'swachdesk', 'swachmeet': 'swachmeet',
  'swachsocial': 'swachsocial', 'swachforms': 'swachforms',
  'swachforms-builder': 'swachforms',
  'pharmacy/billing': 'pharmacy', 'pharmacy/drugs': 'pharmacy',
  'pharmacy/stock': 'pharmacy', 'pharmacy/purchases': 'pharmacy',
  'pharmacy/schedule-h': 'pharmacy', 'pharmacy/schedule-x': 'pharmacy',
  'pharmacy/licenses': 'pharmacy', 'pharmacy/expiry': 'pharmacy',
  'pharmacy/reports': 'pharmacy', 'pharmacy/prescriptions': 'pharmacy',
  'pharmacy/narcotics-register': 'pharmacy', 'pharmacy/e-invoice': 'pharmacy',
  'crm/pipeline': 'crm', 'crm/contacts': 'crm',
  'crm/accounts': 'crm', 'crm/activities': 'crm',
  'crm/email-campaigns': 'crm', 'crm/whatsapp': 'crm',
  'crm/reports': 'crm', 'crm/telephony': 'crm', 'crm/quotations': 'crm',
  'crm/customer-360': 'crm', 'crm/lead-scoring': 'crm', 'crm/drip-campaigns': 'crm',
  'nidhi/members': 'nidhi', 'nidhi/deposits': 'nidhi',
  'nidhi/loans': 'nidhi', 'nidhi/emi': 'nidhi',
  'nidhi/shares': 'nidhi', 'nidhi/gold-rates': 'nidhi',
  'nidhi/interest-rates': 'nidhi', 'nidhi/daily-collection': 'nidhi',
  'nidhi/compliance': 'nidhi', 'nidhi/reports': 'nidhi',
  'nidhi/loan-sanction': 'nidhi', 'nidhi/pdc-tracking': 'nidhi',
  'nidhi/rbi-returns': 'nidhi', 'nidhi/member-passbook': 'nidhi',
  'nidhi/mobile-collection': 'nidhi',
  'ecommerce/dashboard': 'ecommerce', 'ecommerce/orders': 'ecommerce',
  'ecommerce/listings': 'ecommerce', 'ecommerce/shipments': 'ecommerce',
  'ecommerce/returns': 'ecommerce', 'ecommerce/settlements': 'ecommerce',
  'ecommerce/channels': 'ecommerce', 'ecommerce/reports': 'ecommerce',
  'ecommerce/warehouses': 'ecommerce',
  'logistics/fleet': 'logistics', 'logistics/trips': 'logistics',
  'logistics/consignments': 'logistics', 'logistics/drivers': 'logistics',
  'logistics/fuel': 'logistics', 'logistics/epod': 'logistics',
  'logistics/freight': 'logistics', 'logistics/gps': 'logistics',
  'logistics/documents': 'logistics', 'logistics/reports': 'logistics',
  'logistics/eway-bill': 'logistics', 'logistics/route-optimization': 'logistics',
  'logistics/live-gps': 'logistics',
  'real-estate/projects': 'real-estate', 'real-estate/bookings': 'real-estate',
  'real-estate/collections': 'real-estate', 'real-estate/construction': 'real-estate',
  'real-estate/crm': 'real-estate', 'real-estate/brokers': 'real-estate',
  'real-estate/documents': 'real-estate', 'real-estate/customer-portal': 'real-estate',
  'real-estate/society': 'real-estate', 'real-estate/reports': 'real-estate',
  'agriculture/farms': 'agriculture', 'agriculture/crops': 'agriculture',
  'agriculture/inputs': 'agriculture', 'agriculture/harvest': 'agriculture',
  'agriculture/weather': 'agriculture', 'agriculture/market': 'agriculture',
  'agriculture/fpo': 'agriculture', 'agriculture/schemes': 'agriculture',
  'agriculture/reports': 'agriculture', 'agriculture/mandi-prices': 'agriculture',
  'agriculture/pmfby': 'agriculture',
  'education/students': 'education', 'education/admissions': 'education',
  'education/fees': 'education', 'education/attendance': 'education',
  'education/timetable': 'education', 'education/exams': 'education',
  'education/classes': 'education', 'education/homework': 'education',
  'education/hostel': 'education', 'education/library': 'education',
  'education/transport': 'education', 'education/online-exams': 'education',
  'education/parent-portal': 'education', 'education/reports': 'education',
  'education/nep-compliance': 'education', 'education/certificates': 'education',
  'masters/hsn-codes': 'User Management', 'masters/sac-codes': 'User Management',
  'masters/tax-config': 'User Management', 'masters/states-countries': 'User Management',
  'masters/bank-master': 'User Management', 'masters/branches': 'User Management',
  'masters/doc-numbering': 'User Management', 'masters/email-templates': 'User Management',
  'masters/sms-templates': 'User Management', 'masters/approval-matrix': 'User Management',
  'masters/feature-flags': 'User Management', 'masters/print-templates': 'User Management',
  'masters/webhooks': 'User Management',
  'restaurant-enterprise':   'restaurant',
  'hotel-enterprise':        'hotel',
  'healthcare-enterprise':   'healthcare',
  'healthcare-enterprise2':  'healthcare',
  'education-enterprise':    'education',
  'education-enterprise2':   'education',
  'logistics-enterprise':    'logistics',
  'real-estate-enterprise':  'real-estate',
  'retail-enterprise':       'Point of Sale',
  'pharmacy-enterprise':     'pharmacy',
  'ngo-enterprise':          'ngo',
  'crm-enterprise':          'crm',
  'agriculture-enterprise':  'agriculture',
  'ecommerce-enterprise':    'ecommerce',
  'nidhi-enterprise':        'nidhi',
  'masters':                 'User Management',
  // Standalone modules (separate nav sections)
  'pos': 'Point of Sale',
  'retail/franchise': 'Point of Sale', 'retail/b2b-portal': 'Point of Sale',
  'retail/store-transfers': 'Point of Sale', 'retail/loyalty': 'Point of Sale',
  'retail/omni-channel': 'Point of Sale', 'retail/pos-hardware': 'Point of Sale',
  'gold-erp': 'Gold & Jewellery ERP',
  // Gold ERP sub-items (all map to same screen permission)
  'gold-erp-overview': 'Gold & Jewellery ERP',
  'gold-erp-rates': 'Gold & Jewellery ERP',
  'gold-erp-karigar': 'Gold & Jewellery ERP',
  'gold-erp-items': 'Gold & Jewellery ERP',
  'gold-erp-estimates': 'Gold & Jewellery ERP',
  'gold-erp-metal-ledger': 'Gold & Jewellery ERP',
  'gold-erp-analytics': 'Gold & Jewellery ERP',
  'gold-erp/live-rates': 'Gold & Jewellery ERP',
  'gold-erp/hallmarking': 'Gold & Jewellery ERP',
  'gold-erp/sebi-reporting': 'Gold & Jewellery ERP',
  'gold-erp/digital-gold': 'Gold & Jewellery ERP',
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
  'language-settings',
]);

// Sections that require a specific subscribed module to appear.
// Entire section is hidden unless the tenant plan includes the required module.
const SECTION_MODULE_GATES: Record<string, string> = {
  'accounting-section':       'accounting',
  'healthcare-erp-section':   'healthcare',
  'logistics-erp-section':    'logistics_transport',
  'projects-section':         'projects',
  'hr-section':               'hr_payroll',
  'maintenance-section':      'maintenance',
  'crm-section':              'crm',
  'real-estate-erp-section':  'real_estate',
  'agriculture-erp-section':  'agriculture',
  'education-erp-section':    'education',
  'gold-erp-section':         'gold_erp',
  'fixed-assets-section':     'fixed_assets',
};

function filterNavSectionsByPlan(sections: NavSection[], allowedNavItems: string[], planModules: string[] = []): NavSection[] {
  if (!allowedNavItems || allowedNavItems.length === 0) return sections;
  const allowed = new Set(allowedNavItems);
  const moduleSet = new Set(planModules);
  return sections
    .filter(section => {
      const requiredModule = SECTION_MODULE_GATES[section.id ?? ''];
      if (requiredModule && !moduleSet.has(requiredModule)) return false;
      return true;
    })
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
  const { user } = useAuth();
  const { allowedNavItems, modules: planModules, isLoading: planLoading } = usePlanFeatures();
  const { applyModuleLabelsToNav } = useModuleLabels();
  const lastValidRef = useRef<NavSection[]>([]);
  
  const navSections = useMemo(() => {
    if ((user as any)?.isSuperAdmin) {
      const labeled = applyModuleLabelsToNav(allNavSections);
      lastValidRef.current = labeled;
      return labeled;
    }
    // First apply plan-level filtering (hides modules not in subscription)
    const planFiltered = allowedNavItems.length > 0
      ? filterNavSectionsByPlan(allNavSections, allowedNavItems, planModules)
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
  }, [allNavSections, permissions, permissionsLoading, roleName, allowedNavItems, applyModuleLabelsToNav, user]);

  return { 
    navSections,
    isLoading: (permissionsLoading || planLoading) && lastValidRef.current.length === 0
  };
}
