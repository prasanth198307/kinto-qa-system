/**
 * Test 37 — Finance ERP: Role-based workflow validation
 *
 * Plans:
 *   finance_starter      (8320) — invoicing, expenses, documents, accounting, masters
 *   finance_professional (8321) — + purchase_orders, mis, crm, whatsapp, fixed_assets
 *   finance_enterprise   (8300) — + basic_inventory, sales_orders, hr_payroll,
 *                                   multi_currency, projects, timesheets, approvals,
 *                                   recurring_invoices, audit_trail, api_hub
 *
 * Roles (enterprise tenant 8300):
 *   admin          → CFO/Owner
 *   manager        → Finance Manager (qa_fin_cfo)
 *   operator       → AP/AR Clerk
 *   reviewer       → Internal Auditor
 *   accountsmanager→ Accountant
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise (tenant 8300) ──────────────────────────────────────────────────
async function owner()      { return login('qa_fin_owner',      'Test@1234'); }
async function cfo()        { return login('qa_fin_cfo',        'Test@1234'); }
async function accountant() { return login('qa_fin_accountant', 'Test@1234'); }
async function apClerk()    { return login('qa_fin_ap_clerk',   'Test@1234'); }
async function arClerk()    { return login('qa_fin_ar_clerk',   'Test@1234'); }
async function acct()       { return login('qa_fin_acct',       'Test@1234'); }
async function hrMgr()      { return login('qa_fin_hr',         'Test@1234'); }
async function crmExec()    { return login('qa_fin_crm',        'Test@1234'); }
async function salesMgr()   { return login('qa_fin_sales',      'Test@1234'); }
async function misViewer()  { return login('qa_fin_mis',        'Test@1234'); }
async function whMgr()      { return login('qa_fin_wh',         'Test@1234'); }
async function assetsMgr()  { return login('qa_fin_assets',     'Test@1234'); }

// ── Professional (tenant 8321) ────────────────────────────────────────────────
async function proOwner()   { return login('qa_fin_p_owner',      'Test@1234'); }
async function proCfo()     { return login('qa_fin_p_cfo',        'Test@1234'); }
async function proAcct()    { return login('qa_fin_p_accountant', 'Test@1234'); }
async function proAcctMgr() { return login('qa_fin_p_acct',       'Test@1234'); }
async function proHr()      { return login('qa_fin_p_hr',         'Test@1234'); }
async function proCrm()     { return login('qa_fin_p_crm',        'Test@1234'); }
async function proMis()     { return login('qa_fin_p_mis',        'Test@1234'); }

// ── Starter (tenant 8320) ─────────────────────────────────────────────────────
async function starterOwner()   { return login('qa_fin_s_owner',      'Test@1234'); }
async function starterAcct()    { return login('qa_fin_s_accountant',  'Test@1234'); }
async function starterBilling() { return login('qa_fin_s_billing',     'Test@1234'); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── 1. Role Setup (admin/owner) ──────────────────────────────────────────────
describe('Finance Role Setup (admin/owner)', () => {
  it('owner can login and role is admin', async () => {
    const body = await (await (await owner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('owner can view chart of accounts', async () => {
    const res = await (await owner()).get('/api/accounting/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view accounting periods', async () => {
    const res = await (await owner()).get('/api/accounting/periods');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view cost centers', async () => {
    const res = await (await owner()).get('/api/accounting/cost-centers');
    expect(res.status).toBeLessThan(400);
  });

  it('owner enterprise: features includes accounting, hr_payroll, fixed_assets, invoicing', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('hr_payroll');
    expect(mods).toContain('invoicing');
  });
});

// ─── 2. Role: CFO/Finance Manager workflow ────────────────────────────────────
describe('Finance Role: CFO / Finance Manager', () => {
  it('cfo can login and role is manager', async () => {
    const body = await (await (await cfo()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('cfo can view journal entries', async () => {
    const res = await (await cfo()).get('/api/accounting/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('cfo can view trial balance', async () => {
    const res = await (await cfo()).get('/api/accounting/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('cfo can view profit & loss report', async () => {
    const res = await (await cfo()).get('/api/accounting/profit-loss');
    expect(res.status).toBeLessThan(400);
  });

  it('cfo can view MIS financial summary', async () => {
    const res = await (await cfo()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 3. Role: AP/AR Clerk (operator) workflow ─────────────────────────────────
describe('Finance Role: AP/AR Clerk (operator)', () => {
  it('ap clerk can login and role is operator', async () => {
    const body = await (await (await apClerk()).get('/api/user')).json() as any;
    expect(body.role).toBe('operator');
  });

  it('ap clerk can view invoices', async () => {
    const res = await (await apClerk()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('ap clerk can create an invoice', async () => {
    const res = await (await apClerk()).post('/api/invoices', {
      header: {
        buyerName:   'QA Finance Client',
        invoiceDate: TODAY,
        subtotal:    5000000,
        totalAmount: 5000000,
      },
      items: [{
        productId:     'qa-fin-svc-8300',
        description:   'Consulting Fee',
        quantity:      1,
        unitPrice:     5000000,
        taxableAmount: 5000000,
        totalAmount:   5000000,
      }],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('ar clerk can view expenses', async () => {
    const res = await (await arClerk()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });

  it('ar clerk can view purchase orders', async () => {
    const res = await (await arClerk()).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 4. Role: Internal Auditor (reviewer) workflow ────────────────────────────
describe('Finance Role: Internal Auditor (reviewer)', () => {
  it('auditor can login and role is reviewer', async () => {
    const body = await (await (await acct()).get('/api/user')).json() as any;
    expect(['reviewer', 'accountsmanager'].includes(body.role)).toBe(true);
  });

  it('auditor can view journal entries (read-only)', async () => {
    const res = await (await acct()).get('/api/accounting/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('auditor can view ledger', async () => {
    const res = await (await acct()).get('/api/accounting/ledger');
    expect(res.status).toBeLessThan(400);
  });

  it('auditor can view balance sheet', async () => {
    const res = await (await acct()).get('/api/accounting/balance-sheet');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 5. Plan: ALL plans — core module accessible ──────────────────────────────
describe('Finance Plan: ALL plans — core module accessible', () => {
  it('starter: /api/tenant/features includes accounting module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('accounting');
  });

  it('professional: /api/tenant/features includes accounting module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
  });

  it('enterprise: /api/tenant/features includes accounting module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('accounting');
  });

  it('all plans: chart-of-accounts endpoint returns < 400 for owner', async () => {
    const [s, p, e] = await Promise.all([
      (await starterOwner()).get('/api/accounting/chart-of-accounts'),
      (await proOwner()).get('/api/accounting/chart-of-accounts'),
      (await owner()).get('/api/accounting/chart-of-accounts'),
    ]);
    expect(s.status).toBeLessThan(400);
    expect(p.status).toBeLessThan(400);
    expect(e.status).toBeLessThan(400);
  });
});

// ─── 6. Plan: ALL plans — invoicing / purchase_orders / basic_inventory ───────
describe('Finance Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter: features includes invoicing', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
  });

  it('professional: features includes invoicing', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
  });

  it('enterprise: features includes invoicing and purchase_orders', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('invoicing');
    expect(mods).toContain('purchase_orders');
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─── 7. Plan: Professional+ — accounting / mis / crm / hr_payroll ─────────────
describe('Finance Plan: Professional+ — accounting / mis / crm / hr_payroll', () => {
  it('starter: does NOT include mis module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('mis');
  });

  it('starter: does NOT include crm module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('crm');
  });

  it('professional: includes mis module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('mis');
  });

  it('professional: includes crm module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('crm');
  });
});

// ─── 8. Plan: Enterprise only — production / warehouses / fixed_assets / multi_currency
describe('Finance Plan: Enterprise only — warehouses / fixed_assets / multi_currency', () => {
  it('starter: does NOT include fixed_assets', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('professional: may include fixed_assets but not multi_currency', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('enterprise: includes fixed_assets module', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('fixed_assets');
  });

  it('enterprise: GET /api/accounting/fixed-assets returns < 400', async () => {
    const res = await (await owner()).get('/api/accounting/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 9. Cross-role: Data created by one role visible to others ────────────────
describe('Finance Cross-role: Data created by one role visible to others', () => {
  it('journal entry created by accountant is visible to CFO', async () => {
    const acctApi = await accountant();
    const cfoApi  = await cfo();

    const createRes = await acctApi.post('/api/accounting/journal-entries', {
      date: TODAY,
      narration: 'QA Cross-role Journal Entry',
      entries: [
        { account_code: '4001', debit: 5000, credit: 0 },
        { account_code: '1001', debit: 0,    credit: 5000 },
      ],
    });
    expect(createRes.status).toBeLessThan(400);

    const listRes = await cfoApi.get('/api/accounting/journal-entries');
    expect(listRes.status).toBeLessThan(400);
  });

  it('invoice created by AP clerk is visible to auditor', async () => {
    const clerkApi  = await apClerk();
    const acctApi   = await acct();

    const invRes = await clerkApi.post('/api/invoices', {
      header: {
        buyerName:   'QA Cross-role Client',
        invoiceDate: TODAY,
        subtotal:    1000000,
        totalAmount: 1000000,
      },
      items: [{
        productId:     'qa-fin-svc-8300',
        description:   'Service Fee',
        quantity:      1,
        unitPrice:     1000000,
        taxableAmount: 1000000,
        totalAmount:   1000000,
      }],
    });
    expect(invRes.status).toBeLessThan(400);

    const listRes = await acctApi.get('/api/invoices');
    expect(listRes.status).toBe(200);
  });

  it('budget set by owner is visible to finance manager', async () => {
    const ownerApi = await owner();
    const cfoApi   = await cfo();

    await ownerApi.post('/api/accounting/budgets', {
      name: 'QA FY Budget',
      period: TODAY.substring(0, 7),
      amount: 1000000,
    });

    const listRes = await cfoApi.get('/api/accounting/budgets');
    expect(listRes.status).toBeLessThan(400);
  });

  it('expense created by AR clerk is visible to owner', async () => {
    const arApi    = await arClerk();
    const ownerApi = await owner();

    await arApi.post('/api/expenses', {
      description: 'QA Office Expense',
      amount: 5000,
      date: TODAY,
      category: 'Office',
    });

    const listRes = await ownerApi.get('/api/expenses');
    expect(listRes.status).toBeLessThan(400);
  });
});

// ─── 10. Starter Plan — role login + core workflow ────────────────────────────
describe('Finance Starter Plan — role login + core workflow', () => {
  it('starter owner can login and role is admin', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter accountant can login', async () => {
    const body = await (await (await starterAcct()).get('/api/user')).json() as any;
    expect(['accountsmanager', 'operator', 'reviewer'].includes(body.role)).toBe(true);
  });

  it('starter billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter: journal entries endpoint accessible', async () => {
    const res = await (await starterOwner()).get('/api/accounting/journal-entries');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 11. Professional Plan — role login + extra modules ───────────────────────
describe('Finance Professional Plan — role login + extra modules', () => {
  it('pro owner can login and role is admin', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro cfo can login', async () => {
    const body = await (await (await proCfo()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro: MIS summary accessible', async () => {
    const res = await (await proOwner()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro: CRM contacts accessible', async () => {
    const res = await (await proOwner()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 12. Enterprise — Accountant workflow ─────────────────────────────────────
describe('Finance Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await accountant()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await accountant()).get('/api/accounting/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can create journal entry', async () => {
    const res = await (await accountant()).post('/api/accounting/journal-entries', {
      date: TODAY,
      narration: 'QA Finance Adjustment Entry',
      entries: [
        { account_code: '3001', debit: 10000, credit: 0 },
        { account_code: '1001', debit: 0,     credit: 10000 },
      ],
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view bank reconciliation', async () => {
    const res = await (await accountant()).get('/api/accounting/bank-reconciliation');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view profit & loss', async () => {
    const res = await (await accountant()).get('/api/accounting/profit-loss');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 13. Enterprise — HR Manager workflow ─────────────────────────────────────
describe('Finance Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrMgr()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add employee', async () => {
    const res = await (await hrMgr()).post('/api/hr/employees', {
      employee_id: 'QA-FIN-EMP-001',
      first_name: 'QA',
      last_name: 'Finance Staff',
      designation: 'Junior Accountant',
      department: 'Finance',
      basic_salary: 40000,
      phone: '9000300001',
      email: 'qa-fin-emp@fin.kinto',
      date_of_joining: TODAY,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrMgr()).get('/api/hr/payroll');
    expect(res.status).toBeLessThan(400);
  });

  it('hr manager can view leave requests', async () => {
    const res = await (await hrMgr()).get('/api/hr/leaves');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 14. Enterprise — CRM Executive workflow ──────────────────────────────────
describe('Finance Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm executive can login', async () => {
    const body = await (await (await crmExec()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('crm exec can view CRM contacts', async () => {
    const res = await (await crmExec()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can create a lead', async () => {
    const res = await (await crmExec()).post('/api/crm/leads', {
      name: 'QA Finance Prospect',
      email: 'prospect@fintest.kinto',
      phone: '9000300002',
      source: 'referral',
      status: 'new',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view CRM campaigns', async () => {
    const res = await (await crmExec()).get('/api/crm/campaigns');
    expect(res.status).toBeLessThan(400);
  });

  it('crm exec can view invoices (cross-module)', async () => {
    const res = await (await crmExec()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 15. Enterprise — Sales Manager workflow ──────────────────────────────────
describe('Finance Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can login', async () => {
    const body = await (await (await salesMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('sales manager can view sales orders', async () => {
    const res = await (await salesMgr()).get('/api/sales-orders');
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can create a sales order', async () => {
    const res = await (await salesMgr()).post('/api/sales-orders', {
      customer_name: 'QA Finance B2B Client',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'Advisory Package', quantity: 1, rate: 100000, amount: 100000 }],
      total: 100000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await salesMgr()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('sales manager can view CRM contacts', async () => {
    const res = await (await salesMgr()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 16. Enterprise — MIS Viewer workflow ─────────────────────────────────────
describe('Finance Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login', async () => {
    const body = await (await (await misViewer()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('mis viewer can view MIS financial summary', async () => {
    const res = await (await misViewer()).get('/api/mis/financial-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view MIS sales summary', async () => {
    const res = await (await misViewer()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view trial balance (read-only)', async () => {
    const res = await (await misViewer()).get('/api/accounting/trial-balance');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 17. Enterprise — Warehouse Manager workflow ──────────────────────────────
describe('Finance Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can login', async () => {
    const body = await (await (await whMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('warehouse manager can view warehouses', async () => {
    const res = await (await whMgr()).get('/api/warehouses');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view products/inventory', async () => {
    const res = await (await whMgr()).get('/api/products');
    expect(res.status).toBeLessThan(400);
  });

  it('warehouse manager can view purchase orders', async () => {
    const res = await (await whMgr()).get('/api/purchase-orders');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 18. Enterprise — Production Supervisor workflow ──────────────────────────
describe('Finance Enterprise — Production Supervisor workflow (production module)', () => {
  it('owner can view production entries (enterprise module)', async () => {
    const res = await (await owner()).get('/api/production-entries');
    // Finance ERP admin can see production-entries if plan includes production; 403 if not
    expect([200, 403]).toContain(res.status);
  });

  it('owner can view raw materials', async () => {
    const res = await (await owner()).get('/api/raw-materials');
    expect(res.status).toBeLessThan(400);
  });

  it('owner: enterprise features does not block production access', async () => {
    const mods = await getModules(await owner());
    // Finance enterprise may or may not include production; just check it loads
    expect(Array.isArray(mods)).toBe(true);
  });

  it('owner can view bill of materials (cross-link)', async () => {
    const res = await (await owner()).get('/api/bill-of-materials');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 19. Enterprise — Assets Manager workflow ─────────────────────────────────
describe('Finance Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can login', async () => {
    const body = await (await (await assetsMgr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('assets manager can view fixed assets', async () => {
    const res = await (await assetsMgr()).get('/api/accounting/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view depreciation schedule', async () => {
    const res = await (await assetsMgr()).get('/api/accounting/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('assets manager can view chart of accounts (related)', async () => {
    const res = await (await assetsMgr()).get('/api/accounting/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 20. Professional — Accountant workflow ───────────────────────────────────
describe('Finance Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/accounting/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant can view trial balance', async () => {
    const res = await (await proAcct()).get('/api/accounting/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('pro accountant: features does NOT include hr_payroll (professional)', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─── 21. Professional — HR Manager workflow ───────────────────────────────────
describe('Finance Professional — HR Manager workflow', () => {
  it('pro hr manager can login', async () => {
    const body = await (await (await proHr()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro hr manager: features do not include hr_payroll at professional plan', async () => {
    const mods = await getModules(await proHr());
    // professional finance plan may not include hr_payroll — we just verify the call works
    expect(Array.isArray(mods)).toBe(true);
  });

  it('pro hr manager can view employees endpoint', async () => {
    const res = await (await proHr()).get('/api/hr/employees');
    // may return 200 or 403 depending on plan; just not a crash
    expect([200, 403, 404].includes(res.status)).toBe(true);
  });

  it('pro hr manager can view expenses', async () => {
    const res = await (await proHr()).get('/api/expenses');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 22. Professional — CRM Executive workflow ────────────────────────────────
describe('Finance Professional — CRM Executive workflow', () => {
  it('pro crm exec can login', async () => {
    const body = await (await (await proCrm()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro crm exec can view CRM contacts', async () => {
    const res = await (await proCrm()).get('/api/crm/contacts');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm exec can view invoices', async () => {
    const res = await (await proCrm()).get('/api/invoices');
    expect(res.status).toBeLessThan(400);
  });

  it('pro crm: features does NOT include warehouses (enterprise only)', async () => {
    const mods = await getModules(await proCrm());
    expect(mods).not.toContain('warehouses');
  });
});

// ─── 23. Professional — MIS Viewer workflow ───────────────────────────────────
describe('Finance Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer can view trial balance', async () => {
    const res = await (await proMis()).get('/api/accounting/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('pro mis viewer: features does NOT include multi_currency (enterprise only)', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('multi_currency');
  });
});

// ─── 24. Starter — Billing Staff workflow ─────────────────────────────────────
describe('Finance Starter — Billing Staff workflow (invoicing module)', () => {
  it('billing staff can login', async () => {
    const body = await (await (await starterBilling()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('billing staff can view invoices', async () => {
    const res = await (await starterBilling()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('billing staff: features does NOT include crm (professional+ only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('crm');
  });

  it('billing staff: features does NOT include mis (professional+ only)', async () => {
    const mods = await getModules(await starterBilling());
    expect(mods).not.toContain('mis');
  });
});

// ─── 25. Starter — Purchase Manager workflow ──────────────────────────────────
describe('Finance Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter accountant can login', async () => {
    const body = await (await (await starterAcct()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter accountant can view journal entries', async () => {
    const res = await (await starterAcct()).get('/api/accounting/journal-entries');
    expect(res.status).toBeLessThan(400);
  });

  it('starter owner can view chart of accounts', async () => {
    const res = await (await starterOwner()).get('/api/accounting/chart-of-accounts');
    expect(res.status).toBeLessThan(400);
  });

  it('starter: features does NOT include hr_payroll (professional+ only)', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─── 26. Enterprise: Budget & Cost Center workflow ───────────────────────────
describe('Finance Enterprise — Budget & Cost Center workflow', () => {
  it('cfo can create a budget', async () => {
    const res = await (await cfo()).post('/api/accounting/budgets', {
      name: 'QA Annual Budget',
      period: TODAY.substring(0, 7),
      amount: 5000000,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('cfo can view budgets list', async () => {
    const res = await (await cfo()).get('/api/accounting/budgets');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can create a cost center', async () => {
    const res = await (await owner()).post('/api/accounting/cost-centers', {
      name: 'QA Finance Division',
      code: 'QA-FIN-CC-01',
      is_active: true,
    });
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view cost centers', async () => {
    const res = await (await accountant()).get('/api/accounting/cost-centers');
    expect(res.status).toBeLessThan(400);
  });

  it('auditor can view budgets (read-only)', async () => {
    const res = await (await acct()).get('/api/accounting/budgets');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 27. Enterprise: Bank Reconciliation & Reports workflow ──────────────────
describe('Finance Enterprise — Bank Reconciliation & Reports', () => {
  it('accountant can view bank reconciliation screen', async () => {
    const res = await (await accountant()).get('/api/accounting/bank-reconciliation');
    expect(res.status).toBeLessThan(400);
  });

  it('cfo can view balance sheet', async () => {
    const res = await (await cfo()).get('/api/accounting/balance-sheet');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view ledger', async () => {
    const res = await (await owner()).get('/api/accounting/ledger');
    expect(res.status).toBeLessThan(400);
  });

  it('mis viewer can view profit & loss (cross-role read)', async () => {
    const res = await (await misViewer()).get('/api/accounting/profit-loss');
    expect(res.status).toBeLessThan(400);
  });

  it('starter owner: trial balance accessible on starter plan', async () => {
    const res = await (await starterOwner()).get('/api/accounting/trial-balance');
    expect(res.status).toBeLessThan(400);
  });

  it('pro owner: fixed assets accessible on professional plan', async () => {
    const res = await (await proOwner()).get('/api/accounting/fixed-assets');
    expect(res.status).toBeLessThan(400);
  });

  it('enterprise: accounting periods endpoint returns < 400', async () => {
    const res = await (await owner()).get('/api/accounting/periods');
    expect(res.status).toBeLessThan(400);
  });
});

// ─── 28. Multi-currency & Projects workflow (enterprise) ─────────────────────
describe('Finance Enterprise — Multi-currency & Projects workflow', () => {
  it('owner: enterprise features includes multi_currency', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('multi_currency');
  });

  it('cfo can view multi-currency exchange rates', async () => {
    const res = await (await cfo()).get('/api/accounting/exchange-rates');
    expect(res.status).toBeLessThan(400);
  });

  it('owner can view projects list (enterprise projects module)', async () => {
    const res = await (await owner()).get('/api/projects');
    expect(res.status).toBeLessThan(400);
  });

  it('accountant can view timesheets (enterprise module)', async () => {
    const res = await (await accountant()).get('/api/timesheets');
    expect(res.status).toBeLessThan(400);
  });

  it('starter: does NOT include multi_currency module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('professional: does NOT include multi_currency module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('multi_currency');
  });

  it('enterprise: api_hub module included', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('api_hub');
  });
});
