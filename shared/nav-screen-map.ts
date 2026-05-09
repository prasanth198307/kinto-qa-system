/**
 * NAV → SCREEN KEY MAP — Single Source of Truth for screen discovery
 * ==================================================================
 * Maps every navigation item ID to its permission screen key.
 *
 * HOW TO ADD A NEW SCREEN (complete workflow — only TWO steps):
 *
 * Step 1 (required):
 *   Add one line here:  'your-nav-item-id': 'your_screen_key'
 *   On next server restart the auto-patch grants this screen to every
 *   admin role across every tenant automatically — no SQL needed.
 *
 * Step 2 (optional but recommended):
 *   Add an entry to shared/screen-registry.ts with a label, module, and
 *   allowedActions so it shows up nicely in the Role Management dialog.
 *   If you skip this step, the screen still works — admins just won't be
 *   able to configure it for non-admin roles until you add the registry entry.
 *
 * RULES:
 * - Multiple nav items can share one screen key (e.g. sub-pages of a module)
 * - Keys must be snake_case (stored in role_permissions.screen_key)
 * - Nav item IDs use kebab-case (match the `id` field in App.tsx nav sections)
 */
export const navItemToScreenKey: Record<string, string> = {
  // ── Core ──────────────────────────────────────────────────────────────────
  'overview':                           'dashboard',
  'sales-dashboard':                    'sales_dashboard',
  'vendor-analytics':                   'vendor_analytics',
  'reports':                            'reports',
  'admin-tools':                        'admin_tools',
  'company-settings':                   'admin_tools',
  'users':                              'users',
  'role-permissions':                   'roles',
  'notification-settings':              'notification_settings',
  'audit-log':                          'audit_trail',
  'hpcl-migration':                     'hpcl_migration',

  // ── MIS ───────────────────────────────────────────────────────────────────
  'mis-dashboard':                      'mis_dashboard',
  'mis-production':                     'mis_production',
  'mis-inventory':                      'mis_inventory',
  'mis-sales':                          'mis_sales',
  'mis-delivery':                       'mis_delivery',
  'mis-cash':                           'mis_cash',
  'mis-financial':                      'mis_financial',

  // ── WhatsApp & Checklists ─────────────────────────────────────────────────
  'checklists':                         'checklist_templates',
  'checklist-assignments':              'checklist_assignments',
  'machine-startup-reminders':          'machine_startup_reminders',
  'whatsapp-analytics':                 'whatsapp_analytics',

  // ── Inventory & Products ──────────────────────────────────────────────────
  'products':                           'products',
  'product-categories':                 'product_categories',
  'product-types':                      'product_types',
  'raw-materials':                      'raw_materials',
  'raw-material-types':                 'raw_material_types',
  'finished-goods':                     'finished_goods',
  'inventory':                          'inventory',
  'uom':                                'uom',
  'price-lists':                        'price_lists',
  'template-management':                'template_management',
  'data-import':                        'data_import',
  'vyapaar-import':                     'vyapaar_import',
  'warehouses':                         'warehouses',
  'stock-transfers':                    'stock_transfers',
  'serial-lot-register':                'serial_lot_register',

  // ── Production ────────────────────────────────────────────────────────────
  'raw-material-issuance':              'raw_material_issuance',
  'create-issuance':                    'raw_material_issuance',
  'production-entries':                 'production_entries',
  'production-reconciliations':         'production_reconciliations',
  'production-reconciliation':          'production_reconciliation',
  'production-reconciliation-report':   'production_reconciliation_report',
  'variance-analytics':                 'variance_analytics',
  'production-management':              'production_management',
  'purchase-returns':                   'purchase_returns',
  'scrap-management':                   'scrap_inventory',

  // ── Sales & Invoicing ─────────────────────────────────────────────────────
  'sales-orders':                       'sales_orders',
  'sales-officers':                     'sales_officers',
  'invoices':                           'invoices',
  'add-purchase-order':                 'purchase_orders',
  'pending-payments':                   'pending_payments',
  'payment-management':                 'payments',
  'customer-advances':                  'customer_advances',
  'credit-notes':                       'credit_notes',
  'cancelled-invoices':                 'cancelled_invoices_report',
  'sales-returns':                      'sales_returns',
  'write-off-report':                   'write_off_report',
  'customer-outstanding-report':        'pending_payments',
  'invoice-templates':                  'invoice_templates',
  'recurring-invoices':                 'recurring_invoices',
  'gst-reports':                        'gst_reports',
  'gstr-reports':                       'gst_reports',
  'bulk-payment-report':                'bulk_payment_report',
  'payment-writeoff':                   'payment_writeoff',

  // ── Gatepasses & Dispatch ─────────────────────────────────────────────────
  'gatepasses':                         'gatepasses',
  'create-gatepass':                    'gatepasses',
  'dispatch-tracking':                  'dispatch_tracking',
  'dispatch-masters':                   'dispatch_masters',

  // ── Purchase & Vendors ────────────────────────────────────────────────────
  'purchase-orders':                    'purchase_orders',
  'vendors':                            'vendors',
  'vendor-types':                       'vendor_types',
  'vendor-history':                     'vendor_history',
  'vendor-debit-notes':                 'vendor_debit_notes',
  'purchase-requisitions':              'purchase_requisitions',
  'goods-receipt-notes':                'goods_receipt_notes',
  'approval-workflows':                 'approval_workflows',

  // ── Expenses & Cash ───────────────────────────────────────────────────────
  'cash-register':                      'cash_register',
  'cash-register-report':               'cash_register_report',
  'expenses':                           'expenses',
  'expense-categories':                 'expense_categories',
  'monthly-expenses':                   'monthly_expenses',

  // ── Documents ─────────────────────────────────────────────────────────────
  'documents':                          'documents',
  'document-categories':                'document_categories',

  // ── Maintenance ───────────────────────────────────────────────────────────
  'maintenance':                        'maintenance',
  'maintenance-plans':                  'maintenance_plans',
  'schedule-maintenance':               'schedule_maintenance',
  'machine-startup':                    'machine_startup',
  'pm-history':                         'pm_history',
  'pm-templates':                       'pm_templates',
  'pm-execution':                       'pm_execution',
  'machines':                           'machines',
  'machine-types':                      'machine_types',
  'spare-parts':                        'spare_parts',
  'spare-parts-stock':                  'spare_parts_stock',

  // ── Accounting ────────────────────────────────────────────────────────────
  'chart-of-accounts':                  'chart_of_accounts',
  'account-subtypes':                   'account_subtypes',
  'journal-entries':                    'journal_entries',
  'journal-entry-new':                  'manual_journal_entry',
  'bank-transactions':                  'bank_transactions',
  'banks':                              'banks',
  'trial-balance':                      'trial_balance',
  'profit-loss':                        'profit_loss',
  'balance-sheet':                      'balance_sheet',
  'ledger-view':                        'ledger_view',
  'day-book':                           'day_book',
  'aging-report':                       'aging_report',
  'cash-flow-statement':                'cash_flow_statement',
  'group-summary':                      'group_summary',
  'budget-variance':                    'budget_variance',
  'tds-management':                     'tds_management',
  'cost-centres':                       'cost_centres',
  'debit-notes':                        'debit_notes',
  'currency-management':                'currency_management',
  'fixed-assets':                       'fixed_assets',

  // ── HR & Payroll ──────────────────────────────────────────────────────────
  'hr-employees':                       'hr_employees',
  'hr-attendance':                      'hr_attendance',
  'hr-leaves':                          'hr_leaves',
  'hr-payroll':                         'hr_payroll',
  'hr-exit-management':                 'hr_exit_management',
  'hr-loans':                           'hr_loans',
  'hr-tds':                             'hr_tds',
  'hr-recruitment':                     'hr_recruitment',
  'hr-reports':                         'hr_reports',
  'hr-ess-admin':                       'hr_ess_admin',
  'hr-masters':                         'hr_masters',
  'hr-appraisals':                      'hr_appraisals',
  'hr-expense-claims':                  'hr_expense_claims',
  'hr-onboarding':                      'hr_masters',
  'hr-letters':                         'hr_masters',
  'hr-support-desk':                    'hr_masters',
  'timesheets':                         'timesheets',

  // ── CRM ───────────────────────────────────────────────────────────────────
  'crm-leads':                          'crm_leads',
  'crm-surveys':                        'crm_leads',

  // ── API Hub ───────────────────────────────────────────────────────────────
  'api-keys':                           'api_keys',

  // ── Projects ──────────────────────────────────────────────────────────────
  'projects':                           'projects',

  // ── Industry Verticals ────────────────────────────────────────────────────
  'healthcare':                         'healthcare',
  'education':                          'education',
  'logistics':                          'logistics_transport',
  'real-estate':                        'real_estate',
  'pos':                                'pos',
  'agriculture':                        'agriculture',

  // ── Gold ERP ──────────────────────────────────────────────────────────────
  'gold-erp':                           'gold_erp',
  'gold-erp-overview':                  'gold_erp_overview',
  'gold-erp-rates':                     'gold_erp_rates',
  'gold-erp-karigar':                   'gold_erp_karigar',
  'gold-erp-karigars':                  'gold_erp_karigars',
  'gold-erp-items':                     'gold_erp_items',
  'gold-erp-estimates':                 'gold_erp_estimates',
  'gold-erp-metal-ledger':              'gold_erp_metal_ledger',
  'gold-erp-analytics':                 'gold_erp_analytics',
  'gold-erp-production':                'gold_erp_production',
  'gold-erp-jobwork':                   'gold_erp_jobwork',
  'gold-erp-sketch':                    'gold_erp_sketch',
  'gold-erp-cad':                       'gold_erp_cad',
  'gold-erp-cam':                       'gold_erp_cam',
  'gold-erp-karigar-attendance':        'gold_erp_karigar_attendance',
  'gold-erp-ghat':                      'gold_erp_ghat',
  'gold-erp-settlement':                'gold_erp_settlement',
  'gold-erp-finalize':                  'gold_erp_finalize',
  'gold-erp-karigar-ledger':            'gold_erp_karigar_ledger',
  'gold-erp-repairs':                   'gold_erp_repairs',
  'gold-erp-wholesale-b2b-orders':      'gold_erp_wholesale_b2b_orders',
  'gold-erp-wholesale-jobwork':         'gold_erp_wholesale_jobwork',
  'gold-erp-hallmarking-batches':       'gold_erp_hallmarking_batches',
  'gold-erp-jewellery-pos':             'gold_erp_jewellery_pos',
  'gold-erp-counter-bookings':          'gold_erp_counter_bookings',
  'gold-erp-customer-approvals':        'gold_erp_customer_approvals',
  'gold-erp-buyback':                   'gold_erp_buyback',
  'gold-erp-physical-audit':            'gold_erp_physical_audit',
  'gold-erp-loyalty':                   'gold_erp_loyalty',
  'gold-erp-promotions':                'gold_erp_promotions',
  'gold-erp-refining':                  'gold_erp_refining',
  'gold-erp-pos-old-gold':              'gold_erp_pos_old_gold',
  'gold-erp-hallmarking':               'gold_erp_hallmarking',
  'gold-erp-bullion':                   'gold_erp_bullion',
  'gold-erp-bullion-rate-cuts':         'gold_erp_bullion_rate_cuts',
  'gold-erp-vault-movement':            'gold_erp_vault_movement',
  'gold-erp-bullion-bookings':          'gold_erp_bullion_bookings',
  'gold-erp-vault-audit':               'gold_erp_vault_audit',
  'gold-erp-chit':                      'gold_erp_chit',
  'gold-erp-chit-collection-register':  'gold_erp_chit_collection_register',
  'gold-erp-chit-maturity':             'gold_erp_chit_maturity',
  'gold-erp-chit-defaulters':           'gold_erp_chit_defaulters',
  'gold-erp-chit-redemptions':          'gold_erp_chit_redemptions',
  'gold-erp-ecatalog':                  'gold_erp_ecatalog',
  'gold-erp-oms-orders':                'gold_erp_oms_orders',
  'gold-erp-oms-notify':                'gold_erp_oms_notify',
  'gold-erp-ecommerce':                 'gold_erp_ecommerce',
  'gold-erp-rfid':                      'gold_erp_rfid',
  'gold-erp-metal-finance':             'gold_erp_metal_finance',
  'gold-erp-integrations-config':       'gold_erp_integrations_config',
};

/**
 * All unique screen keys derived from the nav map.
 * The server auto-patch reads this — no manual list needed.
 */
export const ALL_NAV_SCREEN_KEYS: string[] = [
  ...new Set(Object.values(navItemToScreenKey)),
];
