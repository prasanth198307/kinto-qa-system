/**
 * SCREEN REGISTRY — Single Source of Truth
 * =========================================
 * Every screen/section in SwachERP is registered here exactly once.
 *
 * HOW TO ADD A NEW SCREEN (checklist — follow every step):
 * 1. Add an entry to SCREEN_REGISTRY below with:
 *    - key:            unique snake_case identifier (stored in DB role_permissions.screen_key)
 *    - label:          human-readable name shown in the Role Management dialog
 *    - allowedActions: which CRUD actions are meaningful for this screen
 *    - module:         the plan module this screen belongs to (undefined = core, always shown)
 * 2. That's it. The following update automatically:
 *    - RoleManagement.tsx  — shows it in the permissions dialog (grouped by module)
 *    - seed-tenant.ts      — seeds it for every new tenant's admin role
 *    - seed-demo-tenant.ts — seeds it for the demo tenant's admin role
 * 3. Run the retroactive SQL in server/migrations/retroactive-screen-patch.sql
 *    to grant the key to all EXISTING admin roles in production.
 *
 * MODULE VALUES must match the module IDs used in server/plan-features.ts and
 * client/src/hooks/use-filtered-navigation.tsx so the plan-gating filter works.
 */

export interface ScreenDefinition {
  key: string;
  label: string;
  allowedActions: ('view' | 'create' | 'edit' | 'delete')[];
  module?: string;
}

export const SCREEN_REGISTRY: ScreenDefinition[] = [

  // ── Core / Always Visible ──────────────────────────────────────────────────
  { key: 'dashboard',            label: 'Dashboard',                allowedActions: ['view'] },
  { key: 'reports',              label: 'Reports (All Tabs)',        allowedActions: ['view'] },
  { key: 'overview',             label: 'Overview / Home',           allowedActions: ['view'] },
  { key: 'users',                label: 'User Management',           allowedActions: ['view', 'create', 'edit', 'delete'] },
  { key: 'roles',                label: 'Role Management',           allowedActions: ['view', 'create', 'edit', 'delete'] },
  { key: 'notification_settings',label: 'Notification Settings',     allowedActions: ['view', 'edit'] },
  { key: 'admin_tools',          label: 'Admin Tools',               allowedActions: ['view', 'create', 'edit', 'delete'] },
  { key: 'audit_trail',          label: 'Audit Trail',               allowedActions: ['view'] },
  { key: 'hpcl_migration',       label: 'HPCL Data Migration',       allowedActions: ['view', 'create'] },

  // ── Sales & Invoicing ──────────────────────────────────────────────────────
  { key: 'sales_dashboard',           label: 'Sales Dashboard',                  allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'invoices',                  label: 'Sales Invoices',                   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'payments',                  label: 'Payment Management',               allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'payment_management',        label: 'Payment Management (Admin Tools)', allowedActions: ['edit', 'delete'],                  module: 'invoicing' },
  { key: 'pending_payments',          label: 'Pending Payments',                 allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'customer_advances',         label: 'Customer Advances',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'credit_notes',              label: 'Credit Notes',                     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'cancelled_invoices_report', label: 'Cancelled Invoices Report',        allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'write_off_report',          label: 'Write-Off Report',                 allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'payment_writeoff',          label: 'Payment Write-Off',                allowedActions: ['view', 'create', 'delete'],        module: 'invoicing' },
  { key: 'bulk_payment_report',       label: 'Bulk Payment Report (Download)',   allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'invoice_templates',         label: 'Invoice Templates',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'invoicing' },
  { key: 'gst_reports',               label: 'GST Reports (GSTR-1/3B)',          allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'report_invoices',           label: 'Report: Invoices',                 allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'report_gst',                label: 'Report: GST Reports',              allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'report_payments',           label: 'Report: Payments',                 allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'report_monthly_sales',      label: 'Report: Monthly Sales',            allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'report_cash_register',      label: 'Report: Cash Register',            allowedActions: ['view'],                            module: 'invoicing' },
  { key: 'recurring_invoices',        label: 'Recurring Invoice Schedules',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'recurring_invoices' },

  // ── Purchase & Vendors ─────────────────────────────────────────────────────
  { key: 'purchase_orders',       label: 'Purchase Orders',            allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'vendors',               label: 'Vendor Master',              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'vendor_types',          label: 'Vendor Types',               allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'vendor_debit_notes',    label: 'Vendor Debit Notes',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'vendor_analytics',      label: 'Vendor Analytics',           allowedActions: ['view'],                            module: 'purchase_orders' },
  { key: 'vendor_history',        label: 'Vendor History',             allowedActions: ['view'],                            module: 'purchase_orders' },
  { key: 'purchase_requisitions', label: 'Purchase Requisitions',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'goods_receipt_notes',   label: 'Goods Receipt Notes (GRN)',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'approval_workflows',    label: 'Approval Workflows',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'purchase_orders' },
  { key: 'report_purchase_orders',label: 'Report: Purchase Orders',    allowedActions: ['view'],                            module: 'purchase_orders' },
  { key: 'report_vendor_report',  label: 'Report: Vendor Report',      allowedActions: ['view'],                            module: 'purchase_orders' },

  // ── Inventory & Products ───────────────────────────────────────────────────
  { key: 'products',           label: 'Products',            allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'raw_materials',      label: 'Raw Materials',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'finished_goods',     label: 'Finished Goods',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'raw_material_types', label: 'Raw Material Types',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'product_categories', label: 'Product Categories',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'product_types',      label: 'Product Types',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'uom',                label: 'Units of Measure',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'inventory',          label: 'Inventory Management',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'price_lists',        label: 'Price Lists',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'template_management',label: 'Template Management', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'basic_inventory' },
  { key: 'data_import',        label: 'Data Import',         allowedActions: ['view', 'create'],                  module: 'basic_inventory' },
  { key: 'vyapaar_import',     label: 'Vyapaar Data Import', allowedActions: ['view', 'create'],                  module: 'basic_inventory' },
  { key: 'report_finished_goods', label: 'Report: Finished Goods', allowedActions: ['view'],                     module: 'basic_inventory' },

  // ── Dispatch & Gatepasses ──────────────────────────────────────────────────
  { key: 'gatepasses',       label: 'Gatepasses',                                          allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gatepasses' },
  { key: 'dispatch_tracking',label: 'Dispatch Tracking',                                   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gatepasses' },
  { key: 'dispatch_masters', label: 'Dispatch Masters (Vehicles/Drivers/Transporters)',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gatepasses' },
  { key: 'report_gatepasses',label: 'Report: Gatepasses',                                  allowedActions: ['view'],                            module: 'gatepasses' },

  // ── Sales Orders ───────────────────────────────────────────────────────────
  { key: 'sales_orders',   label: 'Sales Orders',          allowedActions: ['view', 'create', 'edit', 'delete'], module: 'sales_orders' },
  { key: 'sales_officers', label: 'Sales Officers (Master)',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'sales_orders' },

  // ── Production ─────────────────────────────────────────────────────────────
  { key: 'raw_material_issuance',           label: 'Raw Material Issuance',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_entries',              label: 'Production Entries',                   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_reconciliations',      label: 'Production Reconciliation',            allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_reconciliation',       label: 'Production Reconciliation (Detail)',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'production_management',           label: 'Production Management',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'purchase_returns',                label: 'Purchase Returns',                     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'scrap_inventory',                 label: 'Scrap Inventory / Scrap Management',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'production' },
  { key: 'variance_analytics',              label: 'Variance Analytics',                   allowedActions: ['view'],                            module: 'production' },
  { key: 'production_reconciliation_report',label: 'Production Reconciliation Report',     allowedActions: ['view'],                            module: 'production' },
  { key: 'report_issuances',                label: 'Report: Issuances',                    allowedActions: ['view'],                            module: 'production' },
  { key: 'report_finished_goods',           label: 'Report: Finished Goods',               allowedActions: ['view'],                            module: 'production' },
  { key: 'report_monthly_production',       label: 'Report: Monthly Production',           allowedActions: ['view'],                            module: 'production' },
  { key: 'report_scrap',                    label: 'Report: Scrap Report',                 allowedActions: ['view'],                            module: 'production' },
  { key: 'report_repacking',                label: 'Report: Repacking',                    allowedActions: ['view'],                            module: 'production' },

  // ── Quality & Returns ──────────────────────────────────────────────────────
  { key: 'sales_returns',      label: 'Sales Returns', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'quality_returns' },
  { key: 'credit_notes',       label: 'Credit Notes',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'quality_returns' },
  { key: 'report_sales_returns',label: 'Report: Sales Returns', allowedActions: ['view'],                   module: 'quality_returns' },

  // ── Accounting & Finance ───────────────────────────────────────────────────
  { key: 'chart_of_accounts',   label: 'Chart of Accounts',             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'account_subtypes',    label: 'Account Sub-Types',             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'journal_entries',     label: 'Journal Entries',               allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'manual_journal_entry',label: 'Manual Journal Entry',          allowedActions: ['view', 'create'],                  module: 'accounting' },
  { key: 'trial_balance',       label: 'Trial Balance',                 allowedActions: ['view'],                            module: 'accounting' },
  { key: 'profit_loss',         label: 'Profit & Loss Statement',       allowedActions: ['view'],                            module: 'accounting' },
  { key: 'balance_sheet',       label: 'Balance Sheet',                 allowedActions: ['view'],                            module: 'accounting' },
  { key: 'bank_transactions',   label: 'Bank Statements & Transactions',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'banks',               label: 'Bank Accounts',                 allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'ledger_view',         label: 'Ledger View',                   allowedActions: ['view'],                            module: 'accounting' },
  { key: 'day_book',            label: 'Day Book',                      allowedActions: ['view'],                            module: 'accounting' },
  { key: 'aging_report',        label: 'Outstanding / Aging Report',    allowedActions: ['view'],                            module: 'accounting' },
  { key: 'cash_flow_statement', label: 'Cash Flow Statement',           allowedActions: ['view'],                            module: 'accounting' },
  { key: 'group_summary',       label: 'Group Summary',                 allowedActions: ['view'],                            module: 'accounting' },
  { key: 'budget_variance',     label: 'Budget & Variance',             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'tds_management',      label: 'TDS Management',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'cost_centres',        label: 'Cost Centres',                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'debit_notes',         label: 'Debit Notes (Customer)',        allowedActions: ['view', 'create', 'edit', 'delete'], module: 'accounting' },
  { key: 'currency_management', label: 'Multi-Currency Management',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'multi_currency' },
  { key: 'fixed_assets',        label: 'Fixed Assets & Depreciation',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'fixed_assets' },

  // ── Expenses & Cash Register ───────────────────────────────────────────────
  { key: 'expenses',           label: 'Expense Vouchers',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'expense_categories', label: 'Expense Categories', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'monthly_expenses',   label: 'Monthly Expenses',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'cash_register',      label: 'Cash Register',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'expenses' },
  { key: 'cash_register_report',label: 'Cash Register Report',allowedActions: ['view'],                          module: 'expenses' },
  { key: 'report_expenses',    label: 'Report: Expenses',   allowedActions: ['view'],                            module: 'expenses' },

  // ── Documents ──────────────────────────────────────────────────────────────
  { key: 'documents',          label: 'Documents',           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'documents' },
  { key: 'document_categories',label: 'Document Categories', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'documents' },

  // ── Maintenance & Machines ─────────────────────────────────────────────────
  { key: 'machines',               label: 'Machines',                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'machine_types',          label: 'Machine Types',             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'spare_parts',            label: 'Spare Parts (Catalog)',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'spare_parts_stock',      label: 'Spare Parts Stock',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'maintenance_plans',      label: 'Maintenance Plans',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'maintenance',            label: 'Maintenance (Overview)',    allowedActions: ['view'],                            module: 'maintenance' },
  { key: 'pm_templates',           label: 'PM Task Templates',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'pm_execution',           label: 'PM Execution',              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'pm_history',             label: 'PM History',                allowedActions: ['view'],                            module: 'maintenance' },
  { key: 'machine_startup',        label: 'Machine Startup Log',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'schedule_maintenance',   label: 'Schedule Maintenance',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'maintenance' },
  { key: 'report_maintenance',     label: 'Report: Maintenance',       allowedActions: ['view'],                            module: 'maintenance' },
  { key: 'report_machines',        label: 'Report: Machine Reports',   allowedActions: ['view'],                            module: 'maintenance' },

  // ── WhatsApp & Checklists ──────────────────────────────────────────────────
  { key: 'checklist_templates',    label: 'Checklist Templates',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'checklist_assignments',  label: 'Checklist Assignments',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'checklists',             label: 'Checklists',                allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'machine_startup_reminders',label: 'Machine Startup Reminders',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'whatsapp' },
  { key: 'whatsapp_analytics',     label: 'WhatsApp Analytics',        allowedActions: ['view'],                            module: 'whatsapp' },
  { key: 'reviewer_dashboard',     label: 'Reviewer Dashboard',        allowedActions: ['view'],                            module: 'whatsapp' },

  // ── MIS & Analytics ───────────────────────────────────────────────────────
  { key: 'mis_dashboard',  label: 'MIS Executive Dashboard',    allowedActions: ['view'], module: 'mis' },
  { key: 'mis_production', label: 'MIS Production Analytics',   allowedActions: ['view'], module: 'mis' },
  { key: 'mis_inventory',  label: 'MIS Inventory Intelligence', allowedActions: ['view'], module: 'mis' },
  { key: 'mis_sales',      label: 'MIS Sales Analysis',         allowedActions: ['view'], module: 'mis' },
  { key: 'mis_delivery',   label: 'MIS Delivery Performance',   allowedActions: ['view'], module: 'mis' },
  { key: 'mis_cash',       label: 'MIS Cash Analytics',         allowedActions: ['view'], module: 'mis' },
  { key: 'mis_financial',  label: 'MIS Financial Analytics',    allowedActions: ['view'], module: 'mis' },

  // ── HR & Payroll ───────────────────────────────────────────────────────────
  { key: 'hr_employees',      label: 'HR: Employee Master',                              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_attendance',     label: 'HR: Attendance',                                   allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_leaves',         label: 'HR: Leave Management',                             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_payroll',        label: 'HR: Payroll Processing',                           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_exit_management',label: 'HR: Exit Management & F&F',                        allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_loans',          label: 'HR: Loans & Advances',                             allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_tds',            label: 'HR: TDS & Compliance',                             allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_recruitment',    label: 'HR: Recruitment',                                  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_reports',        label: 'HR: Reports',                                      allowedActions: ['view'],                             module: 'hr_payroll' },
  { key: 'hr_ess_admin',      label: 'HR: ESS Portal Management',                        allowedActions: ['view', 'create', 'edit'],           module: 'hr_payroll' },
  { key: 'hr_masters',        label: 'HR: Masters (Dept/Designation/Shift/Leave Types)', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_appraisals',     label: 'HR: Performance Appraisals',                       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_expense_claims', label: 'HR: Expense Claims',                               allowedActions: ['view', 'create', 'edit', 'delete'], module: 'hr_payroll' },
  { key: 'hr_reports',        label: 'HR: Reports',                                      allowedActions: ['view'],                             module: 'hr_payroll' },

  // ── CRM ────────────────────────────────────────────────────────────────────
  { key: 'crm_leads', label: 'CRM: Lead Management', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'crm' },

  // ── API Hub ────────────────────────────────────────────────────────────────
  { key: 'api_keys', label: 'API Hub (API Management)', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'api_hub' },

  // ── Warehouses & Stock Transfers ───────────────────────────────────────────
  { key: 'warehouses',          label: 'Warehouses',          allowedActions: ['view', 'create', 'edit', 'delete'], module: 'warehouses' },
  { key: 'stock_transfers',     label: 'Stock Transfers',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'warehouses' },
  { key: 'serial_lot_register', label: 'Serial / Lot Register',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'warehouses' },

  // ── Project Management ─────────────────────────────────────────────────────
  { key: 'projects',   label: 'Project Management', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'projects' },
  { key: 'timesheets', label: 'Timesheets',          allowedActions: ['view', 'create', 'edit', 'delete'], module: 'projects' },

  // ── Industry Verticals ─────────────────────────────────────────────────────
  { key: 'healthcare',          label: 'Healthcare Module',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'healthcare' },
  { key: 'education',           label: 'Education Module',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'education' },
  { key: 'logistics_transport', label: 'Logistics & Transport',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'logistics_transport' },
  { key: 'real_estate',         label: 'Real Estate Module',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'real_estate' },
  { key: 'pos',                 label: 'Retail / POS Module',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'pos' },
  { key: 'agriculture',         label: 'Agriculture Module',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'agriculture' },

  // ── Gold ERP — Core ────────────────────────────────────────────────────────
  { key: 'gold_erp',             label: 'Gold ERP (Module Access)', allowedActions: ['view'],                            module: 'gold_erp' },
  { key: 'gold_erp_overview',    label: 'Gold ERP: Overview',       allowedActions: ['view'],                            module: 'gold_erp' },
  { key: 'gold_erp_rates',       label: 'Gold ERP: Metal Rates',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_karigar',     label: 'Gold ERP: Karigar Master', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_karigars',    label: 'Gold ERP: Karigars (List)',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_items',       label: 'Gold ERP: Jewellery Items',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_estimates',   label: 'Gold ERP: Estimates',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_metal_ledger',label: 'Gold ERP: Metal Ledger',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_analytics',   label: 'Gold ERP: JW Analytics',   allowedActions: ['view'],                            module: 'gold_erp' },

  // ── Gold ERP — Production ──────────────────────────────────────────────────
  { key: 'gold_erp_production',         label: 'Gold ERP: Production',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_jobwork',            label: 'Gold ERP: Karigar Job Orders', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_sketch',             label: 'Gold ERP: Sketch / Design',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_cad',               label: 'Gold ERP: CAD Process',        allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_cam',               label: 'Gold ERP: CAM / Milling',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_karigar_attendance', label: 'Gold ERP: Karigar Attendance', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_ghat',              label: 'Gold ERP: Ghat Settlement',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_settlement',         label: 'Gold ERP: Karigar Settlement', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_finalize',           label: 'Gold ERP: Job Finalize',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_karigar_ledger',     label: 'Gold ERP: Karigar Ledger',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_repairs',            label: 'Gold ERP: Repairs',            allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },

  // ── Gold ERP — Wholesale & B2B ─────────────────────────────────────────────
  { key: 'gold_erp_wholesale_b2b_orders',label: 'Gold ERP: B2B Order Booking',              allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_wholesale_jobwork',   label: 'Gold ERP: Customer Jobwork',               allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_hallmarking_batches', label: 'Gold ERP: Hallmarking — Batch Submission', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },

  // ── Gold ERP — Retail & Counter ────────────────────────────────────────────
  { key: 'gold_erp_jewellery_pos',      label: 'Gold ERP: Jewellery POS',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_counter_bookings',   label: 'Gold ERP: Counter Bookings',   allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_customer_approvals', label: 'Gold ERP: Customer Approvals', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_buyback',            label: 'Gold ERP: Old Gold Buy-Back',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_physical_audit',     label: 'Gold ERP: Physical Audit',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_loyalty',            label: 'Gold ERP: Loyalty & Rewards',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_promotions',         label: 'Gold ERP: Promotions',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_refining',           label: 'Gold ERP: Refining',           allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_pos_old_gold',       label: 'Gold ERP: Old Gold Purchase',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_hallmarking',        label: 'Gold ERP: Hallmarking — HUID', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },

  // ── Gold ERP — Bullion & Vault ─────────────────────────────────────────────
  { key: 'gold_erp_bullion',           label: 'Gold ERP: Bullion Stock',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_bullion_rate_cuts', label: 'Gold ERP: Rate Cut Invoices', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_vault_movement',    label: 'Gold ERP: Vault Movement',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_bullion_bookings',  label: 'Gold ERP: Bullion Bookings',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_vault_audit',       label: 'Gold ERP: Vault Audit',       allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },

  // ── Gold ERP — Chit Schemes ────────────────────────────────────────────────
  { key: 'gold_erp_chit',                     label: 'Gold ERP: Chit Schemes',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_chit_collection_register', label: 'Gold ERP: Chit Collection Reg.', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_chit_maturity',            label: 'Gold ERP: Chit Maturity',        allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_chit_defaulters',          label: 'Gold ERP: Chit Defaulters',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_chit_redemptions',         label: 'Gold ERP: Chit Redemptions',     allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },

  // ── Gold ERP — Digital, OMS & E-Commerce ──────────────────────────────────
  { key: 'gold_erp_ecatalog',   label: 'Gold ERP: E-Catalog',         allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_oms_orders', label: 'Gold ERP: OMS Orders',        allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_oms_notify', label: 'Gold ERP: OMS Notifications', allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_ecommerce',  label: 'Gold ERP: E-Commerce Store',  allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },

  // ── Gold ERP — RFID, Finance & Integrations ────────────────────────────────
  { key: 'gold_erp_rfid',                label: 'Gold ERP: RFID Management',    allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_metal_finance',       label: 'Gold ERP: Metal Finance',      allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
  { key: 'gold_erp_integrations_config', label: 'Gold ERP: Integrations Config',allowedActions: ['view', 'create', 'edit', 'delete'], module: 'gold_erp' },
];

/**
 * Flat list of every screen key — used by seed functions to INSERT into role_permissions.
 * Automatically derived from SCREEN_REGISTRY so it never drifts.
 */
export const ALL_SCREEN_KEYS: string[] = [
  ...new Set(SCREEN_REGISTRY.map(s => s.key)),
];
