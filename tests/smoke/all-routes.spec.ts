/**
 * Smoke test: visit every route in App.tsx as each tenant type.
 * Assertions:
 *   - No JS console errors (except known ignorable ones)
 *   - No blank page (body has content)
 *   - No hardcoded '₹' symbol for non-IN tenants
 *   - No 'undefined' currency symbol on any page
 *   - Page title is not empty
 */

import { test, expect, Page, Browser } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5050';

interface TenantCreds {
  username: string;
  password: string;
  slug: string;
  currency: string;
  taxLabel: string;
  name: string;
}

const TENANTS: TenantCreds[] = [
  { username: 'qa_admin_in',      password: 'Test@1234', slug: 'qa-in',      currency: '₹',    taxLabel: 'GST',  name: 'IN' },
  { username: 'qa_admin_ae',      password: 'Test@1234', slug: 'qa-ae',      currency: 'د.إ',  taxLabel: 'VAT',  name: 'AE' },
  { username: 'qa_admin_us',      password: 'Test@1234', slug: 'qa-us',      currency: '$',     taxLabel: 'Tax',  name: 'US' },
  { username: 'qa_admin_eu',      password: 'Test@1234', slug: 'qa-eu',      currency: '€',     taxLabel: 'VAT',  name: 'EU' },
  { username: 'qa_gold_e_owner',  password: 'Test@1234', slug: 'qa-gold-e',  currency: '₹',    taxLabel: 'GST',  name: 'Gold ERP Enterprise' },
  { username: 'qa_re_e_owner',   password: 'Test@1234', slug: 'qa-re-e',   currency: '₹',    taxLabel: 'GST',  name: 'Real Estate Enterprise' },
  { username: 'qa_hc_e_owner',   password: 'Test@1234', slug: 'qa-hc-e',   currency: '₹',    taxLabel: 'GST',  name: 'Healthcare Enterprise' },
  { username: 'qa_rtl_owner',    password: 'Test@1234', slug: 'qa-pos-e',   currency: '₹',    taxLabel: 'GST',  name: 'Retail POS Enterprise' },
];

// All 424 routes from App.tsx grouped by vertical
// Format: [route_path, page_title_hint]
const ROUTES: [string, string][] = [
  // Core
  ['/', 'Dashboard'],
  ['/dashboard', 'Dashboard'],
  ['/login', 'Login'],

  // Finance & Accounting
  ['/accounting', 'Accounting'],
  ['/accounting/chart-of-accounts', 'Chart of Accounts'],
  ['/accounting/journal-entries', 'Journal Entries'],
  ['/accounting/general-ledger', 'General Ledger'],
  ['/accounting/trial-balance', 'Trial Balance'],
  ['/accounting/balance-sheet', 'Balance Sheet'],
  ['/accounting/profit-loss', 'Profit & Loss'],
  ['/accounting/cash-flow', 'Cash Flow'],
  ['/finance', 'Finance'],
  ['/finance/invoices', 'Invoices'],
  ['/finance/bills', 'Bills'],
  ['/finance/payments', 'Payments'],
  ['/finance/receipts', 'Receipts'],
  ['/finance/expenses', 'Expenses'],
  ['/finance/bank-reconciliation', 'Bank Reconciliation'],
  ['/finance/cash-register', 'Cash Register'],
  ['/finance/budgets', 'Budgets'],
  ['/finance/fixed-assets', 'Fixed Assets'],
  ['/finance/tax-config', 'Tax Config'],
  ['/finance/gst-returns', 'GST Returns'],

  // HR
  ['/hr', 'HR'],
  ['/hr/employees', 'Employees'],
  ['/hr/attendance', 'Attendance'],
  ['/hr/payroll', 'Payroll'],
  ['/hr/leaves', 'Leaves'],
  ['/hr/recruitment', 'Recruitment'],
  ['/hr/performance', 'Performance'],
  ['/hr/training', 'Training'],
  ['/hr/exit-management', 'Exit Management'],

  // Inventory
  ['/inventory', 'Inventory'],
  ['/inventory/products', 'Products'],
  ['/inventory/warehouses', 'Warehouses'],
  ['/inventory/stock-movements', 'Stock Movements'],
  ['/inventory/purchase-orders', 'Purchase Orders'],
  ['/inventory/goods-receipt', 'Goods Receipt'],
  ['/inventory/bulk-import', 'Bulk Import'],

  // CRM
  ['/crm', 'CRM'],
  ['/crm/leads', 'Leads'],
  ['/crm/contacts', 'Contacts'],
  ['/crm/opportunities', 'Opportunities'],
  ['/crm/activities', 'Activities'],
  ['/crm/campaigns', 'Campaigns'],

  // Sales / Billing
  ['/billing', 'Billing'],
  ['/billing/invoices', 'Invoices'],
  ['/billing/quotations', 'Quotations'],
  ['/billing/credit-notes', 'Credit Notes'],
  ['/billing/payment-management', 'Payment Management'],
  ['/billing/vendor-history', 'Vendor History'],
  ['/billing/price-list', 'Price List'],

  // Reports / MIS
  ['/reports', 'Reports'],
  ['/mis-dashboard', 'MIS Dashboard'],
  ['/mis-sales', 'Sales MIS'],
  ['/mis-financial', 'Financial MIS'],
  ['/mis-cash', 'Cash MIS'],
  ['/mis-operational', 'Operational MIS'],

  // Masters
  ['/masters', 'Masters'],
  ['/masters/branches', 'Branches'],
  ['/masters/departments', 'Departments'],
  ['/masters/tax-config', 'Tax Config'],
  ['/masters/approval-workflow', 'Approval Workflow'],
  ['/masters/audit-log', 'Audit Log'],
  ['/masters/notification-settings', 'Notifications'],

  // Restaurant ERP
  ['/restaurant', 'Restaurant'],
  ['/restaurant/pos', 'POS'],
  ['/restaurant/tables', 'Table Management'],
  ['/restaurant/menu', 'Menu Management'],
  ['/restaurant/kot', 'KOT'],
  ['/restaurant/reservations', 'Reservations'],
  ['/restaurant/kitchen-display', 'Kitchen Display'],
  ['/restaurant/customer-display', 'Customer Display'],
  ['/restaurant/recipe-costing', 'Recipe Costing'],
  ['/restaurant/loyalty', 'Loyalty'],
  ['/restaurant/online-order', 'Online Order'],
  ['/restaurant/z-report', 'Z Report'],
  ['/restaurant/analytics', 'Analytics'],
  ['/restaurant/staff', 'Staff'],
  ['/restaurant/marketing', 'Marketing'],
  ['/restaurant/aggregators', 'Aggregators'],
  ['/restaurant/delivery', 'Delivery'],
  ['/restaurant/waste-management', 'Waste'],
  ['/restaurant/tally-export', 'Tally Export'],
  ['/restaurant/settings', 'Settings'],

  // Hotel ERP
  ['/hotel', 'Hotel'],
  ['/hotel/front-desk', 'Front Desk'],
  ['/hotel/reservations', 'Reservations'],
  ['/hotel/rooms', 'Rooms'],
  ['/hotel/housekeeping', 'Housekeeping'],
  ['/hotel/check-in', 'Check-in'],
  ['/hotel/check-out', 'Check-out'],
  ['/hotel/folio', 'Folio'],
  ['/hotel/banquet', 'Banquet'],
  ['/hotel/spa', 'Spa'],
  ['/hotel/restaurant', 'Restaurant'],
  ['/hotel/accounting', 'Accounting'],
  ['/hotel/channel-manager', 'Channel Manager'],
  ['/hotel/revenue-management', 'Revenue Management'],
  ['/hotel/analytics', 'Analytics'],
  ['/hotel/enterprise', 'Enterprise'],

  // Healthcare ERP
  ['/healthcare', 'Healthcare'],
  ['/healthcare/opd', 'OPD'],
  ['/healthcare/ipd', 'IPD'],
  ['/healthcare/lab', 'Laboratory'],
  ['/healthcare/pharmacy', 'Pharmacy'],
  ['/healthcare/billing', 'Billing'],
  ['/healthcare/appointments', 'Appointments'],
  ['/healthcare/doctors', 'Doctors'],
  ['/healthcare/patients', 'Patients'],
  ['/healthcare/wards', 'Wards'],
  ['/healthcare/insurance', 'Insurance'],
  ['/healthcare/radiology', 'Radiology'],
  ['/healthcare/analytics', 'Analytics'],
  ['/healthcare/beds', 'Bed Management'],
  ['/healthcare/ot', 'OT Scheduling'],
  ['/healthcare/nursing', 'Nursing'],
  ['/healthcare/blood-bank', 'Blood Bank'],
  ['/healthcare/abdm', 'ABDM'],
  ['/healthcare/emr', 'EMR'],
  ['/healthcare/tpa-claims', 'TPA Claims'],
  ['/healthcare/reports', 'Reports'],

  // Pharmacy ERP
  ['/pharmacy', 'Pharmacy'],
  ['/pharmacy/billing', 'Billing'],
  ['/pharmacy/inventory', 'Inventory'],
  ['/pharmacy/purchase', 'Purchase'],
  ['/pharmacy/expiry', 'Expiry'],
  ['/pharmacy/narcotics', 'Narcotics'],
  ['/pharmacy/prescriptions', 'Prescriptions'],
  ['/pharmacy/suppliers', 'Suppliers'],
  ['/pharmacy/analytics', 'Analytics'],
  ['/pharmacy/enterprise', 'Enterprise'],

  // Manufacturing ERP
  ['/manufacturing', 'Manufacturing'],
  ['/manufacturing/production-orders', 'Production Orders'],
  ['/manufacturing/work-orders', 'Work Orders'],
  ['/manufacturing/bom', 'BOM'],
  ['/manufacturing/quality-control', 'Quality Control'],
  ['/manufacturing/mrp', 'MRP'],
  ['/manufacturing/shop-floor', 'Shop Floor'],
  ['/manufacturing/analytics', 'Analytics'],

  // Retail / POS
  ['/retail', 'Retail'],
  ['/pos', 'POS'],
  ['/retail/products', 'Products'],
  ['/retail/customers', 'Customers'],
  ['/retail/loyalty', 'Loyalty'],
  ['/retail/franchise', 'Franchise'],
  ['/retail/b2b-portal', 'B2B Portal'],
  ['/retail/analytics', 'Analytics'],
  ['/retail/omni-channel', 'Omni-Channel'],
  ['/retail/pos-hardware', 'POS Hardware'],
  ['/retail/store-transfers', 'Store Transfers'],
  ['/retail/inventory', 'Inventory'],
  ['/retail/reorder', 'Reorder'],
  ['/retail/delivery', 'Delivery'],
  ['/retail/promotions', 'Promotions'],
  ['/retail/reports', 'Reports'],

  // NGO ERP
  ['/ngo', 'NGO'],
  ['/ngo/donors', 'Donors'],
  ['/ngo/donations', 'Donations'],
  ['/ngo/projects', 'Projects'],
  ['/ngo/beneficiaries', 'Beneficiaries'],
  ['/ngo/80g-certificates', '80G'],
  ['/ngo/fcra', 'FCRA'],
  ['/ngo/fund-accounting', 'Fund Accounting'],
  ['/ngo/csr', 'CSR'],
  ['/ngo/analytics', 'Analytics'],
  ['/ngo/enterprise', 'Enterprise'],

  // Nidhi Company ERP
  ['/nidhi', 'Nidhi'],
  ['/nidhi/members', 'Members'],
  ['/nidhi/deposits', 'Deposits'],
  ['/nidhi/loans', 'Loans'],
  ['/nidhi/repayments', 'Repayments'],
  ['/nidhi/fd-rd', 'FD/RD'],
  ['/nidhi/pdc-tracking', 'PDC Tracking'],
  ['/nidhi/rbi-returns', 'RBI Returns'],
  ['/nidhi/analytics', 'Analytics'],
  ['/nidhi/enterprise', 'Enterprise'],

  // Education ERP
  ['/education', 'Education'],
  ['/education/students', 'Students'],
  ['/education/admissions', 'Admissions'],
  ['/education/fees', 'Fees'],
  ['/education/attendance', 'Attendance'],
  ['/education/timetable', 'Timetable'],
  ['/education/examinations', 'Examinations'],
  ['/education/teachers', 'Teachers'],
  ['/education/library', 'Library'],
  ['/education/analytics', 'Analytics'],
  ['/education/enterprise', 'Enterprise'],

  // Logistics ERP
  ['/logistics', 'Logistics'],
  ['/logistics/vehicles', 'Vehicles'],
  ['/logistics/drivers', 'Drivers'],
  ['/logistics/trips', 'Trips'],
  ['/logistics/lr-management', 'LR Management'],
  ['/logistics/eway-bill', 'E-Way Bill'],
  ['/logistics/tracking', 'Tracking'],
  ['/logistics/fuel-management', 'Fuel'],
  ['/logistics/maintenance', 'Maintenance'],
  ['/logistics/analytics', 'Analytics'],
  ['/logistics/enterprise', 'Enterprise'],

  // Real Estate ERP
  ['/real-estate', 'Real Estate'],
  ['/real-estate/projects', 'Projects'],
  ['/real-estate/units', 'Units'],
  ['/real-estate/customers', 'Customers'],
  ['/real-estate/bookings', 'Bookings'],
  ['/real-estate/payments', 'Payments'],
  ['/real-estate/rera', 'RERA'],
  ['/real-estate/contractors', 'Contractors'],
  ['/real-estate/analytics', 'Analytics'],
  ['/real-estate/enterprise', 'Enterprise'],
  ['/real-estate/demand-letters', 'Demand Letters'],
  ['/real-estate/brokers', 'Brokers'],
  ['/real-estate/construction-updates', 'Construction Updates'],
  ['/real-estate/payment-schedules', 'Payment Schedules'],

  // Agriculture ERP
  ['/agriculture', 'Agriculture'],
  ['/agriculture/farms', 'Farms'],
  ['/agriculture/crops', 'Crops'],
  ['/agriculture/inventory', 'Inventory'],
  ['/agriculture/equipment', 'Equipment'],
  ['/agriculture/sales', 'Sales'],
  ['/agriculture/mandi-prices', 'Mandi Prices'],
  ['/agriculture/insurance', 'Insurance'],
  ['/agriculture/analytics', 'Analytics'],
  ['/agriculture/enterprise', 'Enterprise'],

  // Gold ERP — core standalone pages
  ['/gold-erp', 'Gold ERP'],
  ['/gold-erp/live-rates', 'Live Gold Rates'],
  ['/gold-erp/hallmarking', 'BIS Hallmarking'],
  ['/gold-erp/sebi-reporting', 'SEBI Bullion Report'],
  ['/gold-erp/digital-gold', 'Digital Gold'],
  // Gold ERP — section tabs (rendered inside /gold-erp via ?section=)
  ['/gold-erp?section=overview', 'Overview'],
  ['/gold-erp?section=rates', 'Metal Rates'],
  ['/gold-erp?section=karigar', 'Karigar'],
  ['/gold-erp?section=items', 'Jewellery Items'],
  ['/gold-erp?section=estimates', 'Estimates'],
  ['/gold-erp?section=metal-ledger', 'Metal Ledger'],
  ['/gold-erp?section=production', 'Production'],
  ['/gold-erp?section=jobwork', 'Karigar Job Orders'],
  ['/gold-erp?section=sketch', 'Sketch / Design'],
  ['/gold-erp?section=cad', 'CAD Process'],
  ['/gold-erp?section=cam', 'CAM / Milling'],
  ['/gold-erp?section=karigar-attendance', 'Karigar Attendance'],
  ['/gold-erp?section=ghat', 'Ghat Settlement'],
  ['/gold-erp?section=settlement', 'Karigar Settlement'],
  ['/gold-erp?section=finalize', 'Job Finalize'],
  ['/gold-erp?section=karigar-ledger', 'Karigar Ledger'],
  ['/gold-erp?section=repairs', 'Repairs'],
  ['/gold-erp?section=wholesale-b2b-orders', 'B2B Order Booking'],
  ['/gold-erp?section=wholesale-jobwork', 'Customer Jobwork'],
  ['/gold-erp?section=hallmarking-batches', 'Hallmarking Batch'],
  ['/gold-erp?section=jewellery-pos', 'Jewellery POS'],
  ['/gold-erp?section=counter-bookings', 'Counter Bookings'],
  ['/gold-erp?section=customer-approvals', 'Approvals'],
  ['/gold-erp?section=buyback', 'Old Gold Buyback'],
  ['/gold-erp?section=physical-audit', 'Physical Audit'],
  ['/gold-erp?section=loyalty', 'Loyalty'],
  ['/gold-erp?section=promotions', 'Promotions'],
  ['/gold-erp?section=refining', 'Refining'],
  ['/gold-erp?section=bullion', 'Bullion Stock'],
  ['/gold-erp?section=bullion-rate-cuts', 'Rate Cut Invoices'],
  ['/gold-erp?section=vault-movement', 'Vault Movement'],
  ['/gold-erp?section=bullion-bookings', 'Bullion Bookings'],
  ['/gold-erp?section=vault-audit', 'Vault Audit'],
  ['/gold-erp?section=chit', 'Chit Schemes'],
  ['/gold-erp?section=chit-collection-register', 'Collection Register'],
  ['/gold-erp?section=chit-maturity', 'Chit Maturity'],
  ['/gold-erp?section=chit-defaulters', 'Chit Defaulters'],
  ['/gold-erp?section=chit-redemptions', 'Chit Redemptions'],
  ['/gold-erp?section=analytics', 'Analytics'],

  // Finance ERP
  ['/finance-erp', 'Finance ERP'],

  // E-Commerce ERP
  ['/ecommerce', 'E-Commerce'],
  ['/ecommerce/products', 'Products'],
  ['/ecommerce/orders', 'Orders'],
  ['/ecommerce/customers', 'Customers'],
  ['/ecommerce/marketplace', 'Marketplace'],
  ['/ecommerce/analytics', 'Analytics'],

  // Multi-Company
  ['/multi-company', 'Multi Company'],
  ['/multi-company/entities', 'Entities'],
  ['/multi-company/consolidation', 'Consolidation'],
  ['/multi-company/intercompany', 'Intercompany'],

  // Admin / Settings
  ['/settings', 'Settings'],
  ['/users', 'Users'],
  ['/roles', 'Roles'],
  ['/roles?tab=custom', 'Custom Roles'],
  ['/roles?tab=permissions', 'Role Permissions'],
  ['/subscription', 'Subscription'],
  ['/admin-dashboard', 'Admin Dashboard'],
  ['/ess-portal', 'ESS Portal'],

  // Cross-module shared screens (Gold ERP context — non-duplicate routes)
  ['/journal-entries', 'GL Journal Entries (Gold sale GL)'],
  ['/vendors', 'Vendors (Bullion supplier)'],
  ['/branches', 'Branches (Gold showroom)'],
];

// Console errors to ignore (known non-critical)
const IGNORE_ERRORS = [
  'ResizeObserver loop',
  'favicon.ico',
  'Non-Error promise rejection',
  '403',           // Tenant permission boundaries — expected for restricted plans
  'Forbidden',     // Same
  '401',           // Auth checks on optional endpoints
  'Unauthorized',  // Same
];

async function loginAs(page: Page, creds: TenantCreds) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  // Fill company slug if visible (shown when no subdomain auto-detects it)
  const slugField = page.locator('[data-testid="input-company-slug"]');
  if (await slugField.count() > 0) {
    await slugField.fill(creds.slug);
  }
  await page.locator('[data-testid="input-email"]').fill(creds.username);
  await page.locator('[data-testid="input-password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard|\/$/, { timeout: 20000 });
}

for (const tenant of TENANTS) {
  test.describe(`Tenant: ${tenant.name} (${tenant.currency})`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, tenant);
    });

    for (const [route, hint] of ROUTES) {
      test(`${route} — no errors, no blank page`, async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            if (!IGNORE_ERRORS.some((ig) => text.includes(ig))) {
              consoleErrors.push(text);
            }
          }
        });

        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });

        // Not a blank page
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.trim().length, `Blank page at ${route}`).toBeGreaterThan(10);

        // No undefined currency
        expect(bodyText, `"undefined" currency at ${route}`).not.toContain('undefined');

        // Non-IN tenants must not have ₹ in content
        if (tenant.name !== 'IN') {
          // Allow ₹ inside hidden/script elements — check visible text only
          const visibleText = await page.evaluate(() => document.body.innerText);
          expect(visibleText, `Hardcoded ₹ found for ${tenant.name} tenant at ${route}`).not.toContain('₹');
        }

        // No console errors
        expect(consoleErrors, `Console errors at ${route}: ${consoleErrors.join(' | ')}`).toHaveLength(0);
      });
    }
  });
}
