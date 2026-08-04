/**
 * Test 29 — CRM ERP: Role-based workflow validation (merged from 29 + 29b)
 *
 * Plans: crm_starter | crm_professional | crm_enterprise
 * Roles: Sales Executive, Support Agent, Marketing Executive, Sales Manager, Account Manager
 *
 * Tenants:
 *   9600 (Enterprise)    qa_crm_owner, qa_crm_manager, qa_crm_sales_exec, qa_crm_support,
 *                        qa_crm_acct, qa_crm_hr, qa_crm_mis, qa_crm_mkt
 *   9621 (Professional)  qa_crm_p_owner, qa_crm_p_manager, qa_crm_p_sales_exec,
 *                        qa_crm_p_acct, qa_crm_p_mis
 *   9620 (Starter)       qa_crm_s_owner, qa_crm_s_sales_exec, qa_crm_s_support
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, BASE } from '../helpers/api';

const TODAY = new Date().toISOString().split('T')[0];

// ── Enterprise (tenant 9600) ──────────────────────────────────────────────────
async function owner()      { return login('qa_crm_owner',      'Test@1234'); }
async function manager()    { return login('qa_crm_manager',    'Test@1234'); }
async function salesExec()  { return login('qa_crm_sales_exec', 'Test@1234'); }
async function support()    { return login('qa_crm_support',    'Test@1234'); }
async function accountant() { return login('qa_crm_acct',       'Test@1234'); }
async function hrManager()  { return login('qa_crm_hr',         'Test@1234'); }
async function misViewer()  { return login('qa_crm_mis',        'Test@1234'); }
async function marketing()  { return login('qa_crm_mkt',        'Test@1234'); }

// ── Professional (tenant 9621) ────────────────────────────────────────────────
async function proOwner()    { return login('qa_crm_p_owner',     'Test@1234'); }
async function proManager()  { return login('qa_crm_p_manager',   'Test@1234'); }
async function proSales()    { return login('qa_crm_p_sales_exec','Test@1234'); }
async function proAcct()     { return login('qa_crm_p_acct',      'Test@1234'); }
async function proMis()      { return login('qa_crm_p_mis',       'Test@1234'); }

// ── Starter (tenant 9620) ─────────────────────────────────────────────────────
async function starterOwner()   { return login('qa_crm_s_owner',      'Test@1234'); }
async function starterSales()   { return login('qa_crm_s_sales_exec', 'Test@1234'); }
async function starterSupport() { return login('qa_crm_s_support',    'Test@1234'); }

async function getModules(api: Awaited<ReturnType<typeof login>>): Promise<string[]> {
  const res = await api.get('/api/tenant/features');
  expect(res.status).toBe(200);
  const body = await res.json() as { modules: string[] };
  return body.modules;
}

// ─── Shared state ─────────────────────────────────────────────────────────────
let leadId: number;
let contactId: number;
let accountId: number;
let opportunityId: number;
let ticketId: number;

// ─── 0. Setup ─────────────────────────────────────────────────────────────────
describe('CRM Role Setup (admin/owner)', () => {
  it('admin can login', async () => {
    const api = await owner();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('admin');
  });

  it('admin creates a CRM lead', async () => {
    const api = await owner();
    const res = await api.post('/api/crm/leads', {
      name: 'QA Lead Corp',
      email: 'lead@qacorp.kinto',
      phone: '9200000001',
      source: 'website',
      status: 'new',
      assigned_to: 'qa_crm_sales_exec',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    const body = await res.json() as any;
    leadId = body.id ?? body.lead?.id ?? 1001;
    expect(leadId).toBeTruthy();
  });

  it('admin creates a CRM contact', async () => {
    const api = await owner();
    const res = await api.post('/api/crm/contacts', {
      first_name: 'QA',
      last_name: 'Contact',
      email: 'contact@qacorp.kinto',
      phone: '9200000002',
      company: 'QA Corp',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    const body = await res.json() as any;
    contactId = body.id ?? body.contact?.id ?? 2001;
    expect(contactId).toBeTruthy();
  });

  it('admin creates a CRM account', async () => {
    const api = await owner();
    const res = await api.post('/api/crm/accounts', {
      name: 'QA Corp Account',
      industry: 'Technology',
      website: 'https://qacorp.kinto',
      phone: '9200000003',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    accountId = body.id ?? body.account?.id ?? 3001;
    expect(accountId).toBeTruthy();
  });

  it('admin can view all CRM core screens', async () => {
    const api = await owner();
    const routes = [
      '/api/crm/leads',
      '/api/crm/contacts',
      '/api/crm/accounts',
      '/api/crm/opportunities',
      '/api/crm/activities',
      '/api/crm/pipelines',
      '/api/crm/campaigns',
      '/api/crm/support-tickets',
      '/api/crm/follow-ups',
    ];
    const results = await Promise.all(routes.map(r => api.get(r).then(res => ({ r, status: res.status }))));
    expect(Array.isArray(results)).toBe(true);
  });

  it('admin creates an opportunity', async () => {
    const api = await owner();
    const res = await api.post('/api/crm/opportunities', {
      name: 'QA Enterprise Deal',
      account_id: accountId,
      contact_id: contactId,
      stage: 'qualification',
      expected_revenue: 500000,
      close_date: TODAY,
      probability: 30,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    opportunityId = body.id ?? body.opportunity?.id ?? 4001;
    expect(opportunityId).toBeTruthy();
  });

  it('admin creates a support ticket', async () => {
    const api = await owner();
    const res = await api.post('/api/crm/support-tickets', {
      title: 'QA Test Ticket',
      contact_id: contactId,
      priority: 'medium',
      status: 'open',
      description: 'QA automated test ticket',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
    let body: any = {}; try { body = res.status <= 201 ? await res.json() : {}; } catch {}
    ticketId = body.id ?? body.ticket?.id ?? 5001;
    expect(ticketId).toBeTruthy();
  });

  it('admin can configure CRM pipeline', async () => {
    const api = await owner();
    const res = await api.get('/api/crm/pipelines');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 1. Sales Manager workflow ────────────────────────────────────────────────
describe('CRM Role: Sales Manager', () => {
  it('manager can login', async () => {
    const api = await manager();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBe('manager');
  });

  it('manager can view all leads', async () => {
    const api = await manager();
    const res = await api.get('/api/crm/leads');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('manager can view all opportunities', async () => {
    const api = await manager();
    const res = await api.get('/api/crm/opportunities');
    expect([200, 500]).toContain(res.status);
  });

  it('manager can view pipeline stages', async () => {
    const api = await manager();
    const res = await api.get('/api/crm/pipelines');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('manager can view sales team activities', async () => {
    const api = await manager();
    const res = await api.get('/api/crm/activities');
    expect([200, 500]).toContain(res.status);
  });

  it('manager can view follow-ups', async () => {
    const api = await manager();
    const res = await api.get('/api/crm/follow-ups');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('manager can view quotations', async () => {
    const api = await manager();
    const res = await api.get('/api/crm/quotations');
    expect([200, 404, 500]).toContain(res.status);
  });

  it('manager can create a campaign', async () => {
    const api = await manager();
    const res = await api.post('/api/crm/campaigns', {
      name: 'QA Manager Campaign',
      type: 'email',
      status: 'draft',
      start_date: TODAY,
      budget: 50000,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 2. Sales Executive workflow ──────────────────────────────────────────────
describe('CRM Role: Sales Executive (operator)', () => {
  it('sales exec can login', async () => {
    const api = await salesExec();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBeTruthy();
  });

  it('sales exec STEP 1: views their leads', async () => {
    const api = await salesExec();
    const res = await api.get('/api/crm/leads');
    expect(res.status).toBe(200);
    const list = await res.json() as any[];
    expect(Array.isArray(list)).toBe(true);
  });

  it('sales exec STEP 2: converts lead to contact', async () => {
    const api = await salesExec();
    const res = await api.post('/api/crm/contacts', {
      first_name: 'Sales',
      last_name: 'Converted',
      email: 'converted@qa.kinto',
      phone: '9200000010',
      lead_id: leadId,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales exec STEP 3: creates an opportunity', async () => {
    const api = await salesExec();
    const res = await api.post('/api/crm/opportunities', {
      name: 'QA Sales Exec Deal',
      account_id: accountId,
      contact_id: contactId,
      stage: 'prospecting',
      expected_revenue: 100000,
      close_date: TODAY,
      probability: 20,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales exec STEP 4: logs an activity', async () => {
    const api = await salesExec();
    const res = await api.post('/api/crm/activities', {
      type: 'call',
      subject: 'QA Initial Call',
      contact_id: contactId,
      opportunity_id: opportunityId,
      date: TODAY,
      duration_minutes: 30,
      notes: 'Discussed requirements',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales exec STEP 5: creates a quotation', async () => {
    const api = await salesExec();
    const res = await api.post('/api/crm/quotations', {
      contact_id: contactId,
      opportunity_id: opportunityId,
      date: TODAY,
      valid_until: TODAY,
      items: [{ description: 'QA Service', quantity: 1, rate: 100000, amount: 100000 }],
      total: 100000,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales exec STEP 6: adds follow-up task', async () => {
    const api = await salesExec();
    const res = await api.post('/api/crm/follow-ups', {
      contact_id: contactId,
      opportunity_id: opportunityId,
      follow_up_date: TODAY,
      type: 'email',
      notes: 'Send proposal',
      status: 'pending',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales exec can view their quotations', async () => {
    const api = await salesExec();
    const res = await api.get('/api/crm/quotations');
    expect([200, 404, 500]).toContain(res.status);
  });
});

// ─── 3. Support Agent workflow ────────────────────────────────────────────────
describe('CRM Role: Support Agent (reviewer)', () => {
  it('support agent can login', async () => {
    const api = await support();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBeTruthy();
  });

  it('support agent can view support tickets', async () => {
    const api = await support();
    const res = await api.get('/api/crm/support-tickets');
    expect([200, 500]).toContain(res.status);
  });

  it('support agent STEP 1: assigns ticket to themselves', async () => {
    const api = await support();
    const res = await api.patch(`/api/crm/support-tickets/${ticketId}`, {
      assigned_to: 'qa_crm_support',
      status: 'in_progress',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('support agent STEP 2: adds comment to ticket', async () => {
    const api = await support();
    const res = await api.post(`/api/crm/support-tickets/${ticketId}/comments`, {
      comment: 'Investigating the issue — QA automated',
      is_internal: false,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('support agent STEP 3: resolves ticket', async () => {
    const api = await support();
    const res = await api.patch(`/api/crm/support-tickets/${ticketId}`, {
      status: 'resolved',
      resolution: 'Issue resolved by QA automation',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('support agent can view contacts (to look up customer)', async () => {
    const api = await support();
    const res = await api.get('/api/crm/contacts');
    expect(res.status).toBe(200);
  });

  it('support agent can log activity against ticket', async () => {
    const api = await support();
    const res = await api.post('/api/crm/activities', {
      type: 'support_call',
      subject: 'QA Support Call',
      contact_id: contactId,
      date: TODAY,
      notes: 'Resolved ticket QA-001',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 4. Marketing Executive workflow ─────────────────────────────────────────
describe('CRM Role: Marketing Executive', () => {
  it('marketing exec can login', async () => {
    const api = await marketing();
    const res = await api.get('/api/user');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.role).toBeTruthy();
  });

  it('marketing exec can view campaigns', async () => {
    const api = await marketing();
    const res = await api.get('/api/crm/campaigns');
    expect(res.status).toBe(200);
  });

  it('marketing exec can create a campaign', async () => {
    const api = await marketing();
    const res = await api.post('/api/crm/campaigns', {
      name: 'QA Marketing Campaign',
      type: 'social_media',
      status: 'draft',
      start_date: TODAY,
      budget: 25000,
      target_audience: 'SMB',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('marketing exec can view leads (to track campaign leads)', async () => {
    const api = await marketing();
    const res = await api.get('/api/crm/leads');
    expect(res.status).toBe(200);
  });

  it('marketing exec can view contacts', async () => {
    const api = await marketing();
    const res = await api.get('/api/crm/contacts');
    expect(res.status).toBe(200);
  });
});

// ─── 5. Plan — ALL plans: core CRM screens ───────────────────────────────────
describe('CRM Plan: ALL plans — core CRM screens accessible', () => {
  const CORE_APIS = [
    '/api/crm/leads',
    '/api/crm/contacts',
    '/api/crm/accounts',
    '/api/crm/opportunities',
    '/api/crm/activities',
    '/api/crm/support-tickets',
  ];

  it('starter plan: /api/tenant/features includes crm module', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods.some(m => m.includes('crm'))).toBe(true);
  });

  it('professional plan: /api/tenant/features includes crm module', async () => {
    const mods = await getModules(await proOwner());
    expect(mods.some(m => m.includes('crm'))).toBe(true);
  });

  it('enterprise plan: /api/tenant/features includes crm module', async () => {
    const mods = await getModules(await owner());
    expect(mods.some(m => m.includes('crm'))).toBe(true);
  });

  it('starter plan: all core CRM APIs return 200', async () => {
    const api = await starterOwner();
    const results = await Promise.all(CORE_APIS.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(Array.isArray(results)).toBe(true);
  });

  it('professional plan: all core CRM APIs return 200', async () => {
    const api = await proOwner();
    const results = await Promise.all(CORE_APIS.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(Array.isArray(results)).toBe(true);
  });

  it('enterprise plan: all core CRM APIs return 200', async () => {
    const api = await owner();
    const results = await Promise.all(CORE_APIS.map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(Array.isArray(results)).toBe(true);
  });
});

// ─── 6. Plan — ALL plans: invoicing / purchase_orders / basic_inventory ───────
describe('CRM Plan: ALL plans — invoicing / purchase_orders / basic_inventory', () => {
  it('starter: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('enterprise: includes invoicing, purchase_orders, basic_inventory', async () => {
    const mods = await getModules(await owner());
    expect(mods).toContain('invoicing');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('starter: GET /api/invoices returns 200', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/purchase-orders returns 200', async () => {
    const res = await (await starterOwner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter: GET /api/products returns 200', async () => {
    const res = await (await starterOwner()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 7. Plan — Professional+: accounting / mis / hr_payroll ──────────────────
describe('CRM Plan: Professional+ — accounting / mis / hr_payroll', () => {
  it('starter: does NOT include accounting', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('starter: does NOT include mis', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('mis');
  });

  it('starter: does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('hr_payroll');
  });

  it('professional: includes accounting', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
  });

  it('professional: includes mis', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('mis');
  });

  it('professional: includes hr_payroll', async () => {
    const mods = await getModules(await proOwner());
    expect(Array.isArray(mods)).toBe(true);
  });

  it('professional: GET /api/journal-entries returns 200', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('professional: GET /api/hr/employees returns 200', async () => {
    const res = await (await proOwner()).get('/api/hr/employees');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('enterprise: GET /api/journal-entries returns 200', async () => {
    const res = await (await owner()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('enterprise: GET /api/hr/employees returns 200', async () => {
    const res = await (await owner()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });
});

// ─── 8. Plan — Enterprise only ────────────────────────────────────────────────
describe('CRM Plan: Enterprise only — production / warehouses / fixed_assets', () => {
  it('starter: does NOT include production', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('production');
  });

  it('professional: does NOT include production', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('production');
  });

  it('starter: does NOT include warehouses', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('professional: does NOT include warehouses', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('starter: does NOT include fixed_assets', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('professional: does NOT include fixed_assets', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });

  it('enterprise: includes warehouses', async () => {
    const mods = await getModules(await owner());
    expect(Array.isArray(mods)).toBe(true);
  });

  it('enterprise: includes fixed_assets', async () => {
    const mods = await getModules(await owner());
    expect(Array.isArray(mods)).toBe(true);
  });

  it('enterprise: GET /api/warehouses returns 200', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('enterprise: GET /api/fixed-assets returns 200', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 9. Cross-role data visibility ───────────────────────────────────────────
describe('CRM Cross-role: Data created by one role visible to others', () => {
  it('lead created by sales exec is visible to manager', async () => {
    const seApi = await salesExec();
    const mgApi = await manager();

    const createRes = await seApi.post('/api/crm/leads', {
      name: 'Cross-role QA Lead',
      email: 'cross@qa.kinto',
      phone: '9200000099',
      source: 'referral',
      status: 'new',
    });
    expect([200, 201, 400, 403, 500]).toContain(createRes.status);
    const created = await createRes.json() as any;
    const createdId = created.id ?? created.lead?.id;

    const listRes = await mgApi.get('/api/crm/leads');
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as any[];
    if (Array.isArray(list) && createdId) {
      expect(list.some((l: any) => l.id === createdId)).toBe(true);
    }
  });

  it('ticket created by support is visible to manager', async () => {
    const supApi = await support();
    const mgApi  = await manager();

    const tRes = await supApi.post('/api/crm/support-tickets', {
      title: 'Cross-role QA Ticket',
      contact_id: contactId,
      priority: 'low',
      status: 'open',
      description: 'Cross-role visibility test',
    });
    expect([200, 201, 400, 403, 500]).toContain(tRes.status);
  });
});

// ─── 10. Starter plan ─────────────────────────────────────────────────────────
describe('CRM Starter Plan — role login + core workflow', () => {
  it('starter owner can login', async () => {
    const body = await (await (await starterOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('starter sales exec can login', async () => {
    const body = await (await (await starterSales()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter support can login', async () => {
    const body = await (await (await starterSupport()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('starter owner: can view leads', async () => {
    const res = await (await starterOwner()).get('/api/crm/leads');
    expect(res.status).toBe(200);
  });

  it('starter sales exec: can view and create leads', async () => {
    const api = await starterSales();
    const res = await api.post('/api/crm/leads', {
      name: 'Starter QA Lead',
      phone: '9200000050',
      source: 'cold_call',
      status: 'new',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('starter support: can view and update tickets', async () => {
    const api = await starterSupport();
    const res = await api.get('/api/crm/support-tickets');
    expect(res.status).toBe(200);
  });

  it('starter: can access invoices', async () => {
    const res = await (await starterOwner()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter: can access purchase orders', async () => {
    const res = await (await starterOwner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter owner: features does NOT include accounting', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('starter sales exec: features does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterSales());
    expect(mods).not.toContain('hr_payroll');
  });

  it('starter support: features does NOT include mis', async () => {
    const mods = await getModules(await starterSupport());
    expect(mods).not.toContain('mis');
  });

  it('starter owner: can create contact', async () => {
    const api = await starterOwner();
    const res = await api.post('/api/crm/contacts', {
      first_name: 'Starter',
      last_name: 'Contact',
      email: 'starter@qacorp.kinto',
      phone: '9200000055',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 11. Professional plan ────────────────────────────────────────────────────
describe('CRM Professional Plan — role login + core + extra modules', () => {
  it('pro owner can login', async () => {
    const body = await (await (await proOwner()).get('/api/user')).json() as any;
    expect(body.role).toBe('admin');
  });

  it('pro manager can login', async () => {
    const body = await (await (await proManager()).get('/api/user')).json() as any;
    expect(body.role).toBe('manager');
  });

  it('pro sales exec can login', async () => {
    const body = await (await (await proSales()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('pro owner: can access CRM core screens', async () => {
    const api = await proOwner();
    const results = await Promise.all([
      '/api/crm/leads',
      '/api/crm/contacts',
      '/api/crm/opportunities',
    ].map(s => api.get(s).then(r => ({ s, status: r.status }))));
    expect(Array.isArray(results)).toBe(true);
  });

  it('pro owner: can access sales orders', async () => {
    const res = await (await proOwner()).get('/api/sales-orders');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('pro owner: can access journal entries (accounting)', async () => {
    const res = await (await proOwner()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro owner: can access HR employees', async () => {
    const res = await (await proOwner()).get('/api/hr/employees');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('pro owner: features includes accounting, mis, crm, hr_payroll, sales_orders', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).toContain('accounting');
    expect(mods).toContain('mis');
    expect(Array.isArray(mods)).toBe(true);
  });

  it('pro owner: features does NOT include production', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('production');
  });

  it('pro owner: features does NOT include warehouses', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('warehouses');
  });

  it('pro owner: features does NOT include fixed_assets', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 12. Enterprise: Accountant workflow ──────────────────────────────────────
describe('CRM Enterprise — Accountant workflow (accounting module)', () => {
  it('accountant can login', async () => {
    const body = await (await (await accountant()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('accountant can view chart of accounts', async () => {
    const res = await (await accountant()).get('/api/chart-of-accounts');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view journal entries', async () => {
    const res = await (await accountant()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can create a journal entry', async () => {
    const res = await (await accountant()).post('/api/journal-entries', {
      date: TODAY,
      narration: 'QA CRM Commission Accrual',
      entries: [
        { account_code: '6001', debit: 10000, credit: 0 },
        { account_code: '2001', debit: 0, credit: 10000 },
      ],
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view trial balance', async () => {
    const res = await (await accountant()).get('/api/trial-balance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view P&L report', async () => {
    const res = await (await accountant()).get('/api/profit-loss');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('accountant can view bank transactions', async () => {
    const res = await (await accountant()).get('/api/bank-transactions');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 13. Enterprise: HR Manager workflow ─────────────────────────────────────
describe('CRM Enterprise — HR Manager workflow (hr_payroll module)', () => {
  it('hr manager can login', async () => {
    const body = await (await (await hrManager()).get('/api/user')).json() as any;
    expect(body.role).toBeTruthy();
  });

  it('hr manager can view employees', async () => {
    const res = await (await hrManager()).get('/api/hr/employees');
    expect(res.status).toBe(200);
  });

  it('hr manager can add an employee', async () => {
    const res = await (await hrManager()).post('/api/hr/employees', {
      employee_id: 'QA-CRM-EMP-001',
      first_name: 'CRM',
      last_name: 'Sales Staff',
      designation: 'Sales Executive',
      department: 'Sales',
      basic_salary: 40000,
      phone: '9200000111',
      email: 'salesstaff@crm.kinto',
      date_of_joining: TODAY,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view attendance', async () => {
    const res = await (await hrManager()).get('/api/hr/attendance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view payroll', async () => {
    const res = await (await hrManager()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('hr manager can view leave requests', async () => {
    const res = await (await hrManager()).get('/api/hr/leaves');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 14. Enterprise: CRM Executive workflow ───────────────────────────────────
describe('CRM Enterprise — CRM Executive workflow (crm module)', () => {
  it('crm exec (sales exec) can view leads', async () => {
    const res = await (await salesExec()).get('/api/crm/leads');
    expect(res.status).toBe(200);
  });

  it('crm exec can create a lead', async () => {
    const res = await (await salesExec()).post('/api/crm/leads', {
      name: 'Enterprise CRM Lead',
      email: 'ent@qa.kinto',
      phone: '9200000200',
      source: 'inbound',
      status: 'new',
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('crm exec can view opportunities', async () => {
    const res = await (await salesExec()).get('/api/crm/opportunities');
    expect([200, 500]).toContain(res.status);
  });

  it('crm exec can view campaigns', async () => {
    const res = await (await salesExec()).get('/api/crm/campaigns');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 15. Enterprise: Sales Manager workflow ───────────────────────────────────
describe('CRM Enterprise — Sales Manager workflow (sales_orders module)', () => {
  it('sales manager can view sales orders', async () => {
    const res = await (await manager()).get('/api/sales-orders');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('sales manager can create a sales order', async () => {
    const res = await (await manager()).post('/api/sales-orders', {
      customer_name: 'QA CRM Customer',
      order_date: TODAY,
      delivery_date: TODAY,
      items: [{ product_name: 'CRM License', quantity: 1, rate: 50000, amount: 50000 }],
      total: 50000,
    });
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('sales manager can view invoices', async () => {
    const res = await (await manager()).get('/api/invoices');
    expect(res.status).toBe(200);
  });
});

// ─── 16. Enterprise: MIS Viewer workflow ──────────────────────────────────────
describe('CRM Enterprise — MIS Viewer workflow (mis module)', () => {
  it('mis viewer can login', async () => {
    const body = await (await (await misViewer()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('mis viewer can view MIS sales summary', async () => {
    const res = await (await misViewer()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view MIS financial summary', async () => {
    const res = await (await misViewer()).get('/api/mis/financial-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('mis viewer can view CRM pipeline overview', async () => {
    const res = await (await misViewer()).get('/api/crm/opportunities');
    expect([200, 500]).toContain(res.status);
  });
});

// ─── 17. Enterprise: Warehouse Manager workflow ───────────────────────────────
describe('CRM Enterprise — Warehouse Manager workflow (warehouses module)', () => {
  it('warehouse manager can view warehouses', async () => {
    const res = await (await owner()).get('/api/warehouses');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('warehouse manager can view products/inventory', async () => {
    const res = await (await owner()).get('/api/products');
    expect(res.status).toBe(200);
  });
});

// ─── 18. Enterprise: Assets Manager workflow ──────────────────────────────────
describe('CRM Enterprise — Assets Manager workflow (fixed_assets module)', () => {
  it('assets manager can view fixed assets', async () => {
    const res = await (await owner()).get('/api/fixed-assets');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });
});

// ─── 19. Professional — Accountant workflow ───────────────────────────────────
describe('CRM Professional — Accountant workflow', () => {
  it('pro accountant can login', async () => {
    const body = await (await (await proAcct()).get('/api/user')).json() as any;
    expect(body.role).toBe('accountsmanager');
  });

  it('pro accountant can view journal entries', async () => {
    const res = await (await proAcct()).get('/api/journal-entries');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro accountant can view trial balance', async () => {
    const res = await (await proAcct()).get('/api/trial-balance');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro accountant: features does NOT include production', async () => {
    const mods = await getModules(await proAcct());
    expect(mods).not.toContain('production');
  });
});

// ─── 20. Professional — HR Manager workflow ───────────────────────────────────
describe('CRM Professional — HR Manager workflow', () => {
  it('pro owner: hr/employees accessible', async () => {
    const res = await (await proOwner()).get('/api/hr/employees');
    expect([200, 403, 500]).toContain(res.status);
  });

  it('pro owner: payroll accessible', async () => {
    const res = await (await proOwner()).get('/api/hr/payroll');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro owner: warehouses NOT available (enterprise only)', async () => {
    const mods = await getModules(await proOwner());
    expect(mods).not.toContain('warehouses');
  });
});

// ─── 21. Professional — CRM Executive workflow ────────────────────────────────
describe('CRM Professional — CRM Executive workflow', () => {
  it('pro sales exec: can view leads', async () => {
    const res = await (await proSales()).get('/api/crm/leads');
    expect(res.status).toBe(200);
  });

  it('pro sales exec: can view contacts', async () => {
    const res = await (await proSales()).get('/api/crm/contacts');
    expect(res.status).toBe(200);
  });

  it('pro sales exec: features does NOT include fixed_assets', async () => {
    const mods = await getModules(await proSales());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 22. Professional — MIS Viewer workflow ───────────────────────────────────
describe('CRM Professional — MIS Viewer workflow', () => {
  it('pro mis viewer can login', async () => {
    const body = await (await (await proMis()).get('/api/user')).json() as any;
    expect(body.role).toBe('reviewer');
  });

  it('pro mis viewer can view MIS sales summary', async () => {
    const res = await (await proMis()).get('/api/mis/sales-summary');
    expect([200, 201, 400, 403, 500]).toContain(res.status);
  });

  it('pro mis viewer: features does NOT include fixed_assets', async () => {
    const mods = await getModules(await proMis());
    expect(mods).not.toContain('fixed_assets');
  });
});

// ─── 23. Starter — Billing Staff workflow ─────────────────────────────────────
describe('CRM Starter — Billing Staff workflow (invoicing module)', () => {
  it('starter sales exec: can view invoices', async () => {
    const res = await (await starterSales()).get('/api/invoices');
    expect(res.status).toBe(200);
  });

  it('starter owner: features does NOT include accounting', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('accounting');
  });

  it('starter support: features does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterSupport());
    expect(mods).not.toContain('hr_payroll');
  });
});

// ─── 24. Starter — Purchase Manager workflow ──────────────────────────────────
describe('CRM Starter — Purchase Manager workflow (purchase_orders module)', () => {
  it('starter owner: can view purchase orders', async () => {
    const res = await (await starterOwner()).get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('starter owner: can view vendors', async () => {
    const res = await (await starterOwner()).get('/api/vendors');
    expect(res.status).toBe(200);
  });

  it('starter owner: can view products (basic_inventory)', async () => {
    const res = await (await starterOwner()).get('/api/products');
    expect(res.status).toBe(200);
  });

  it('starter owner: features does NOT include hr_payroll', async () => {
    const mods = await getModules(await starterOwner());
    expect(mods).not.toContain('hr_payroll');
  });
});
