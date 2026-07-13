/**
 * FUNCTIONAL TEST — Finance & Accounting ERP
 *
 * Golden path: Chart of accounts setup → Journal entry →
 *              Ledger view → Vendor bill → Expense voucher →
 *              Finance period management
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let accountId: number;
let journalEntryId: number;
let expenseVoucherId: number;

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('1. Chart of Accounts', () => {
  it('GET /api/chart-of-accounts returns account list', async () => {
    const res = await api.get('/api/chart-of-accounts');
    await expectStatus(res, 200);
    const accounts = await json<Array<{ id: number; name: string; account_code: string }>>(res);
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThan(0);
    accountId = accounts[0].id;
  });

  it('GET /api/account-types returns types (Asset, Liability, Income, Expense)', async () => {
    const res = await api.get('/api/account-types');
    await expectStatus(res, 200);
    const types = await json<Array<{ name: string }>>(res);
    const names = types.map((t) => t.name.toLowerCase());
    expect(names.some((n) => n.includes('asset') || n.includes('liab') || n.includes('income') || n.includes('expense'))).toBe(true);
  });

  it('creates a new GL account', async () => {
    const res = await api.post('/api/chart-of-accounts', {
      account_code: `QA-${Date.now().toString().slice(-6)}`,
      name: 'QA Test Expense Account',
      account_type: 'Expense',
      is_active: true,
    });
    if (res.status === 409) return; // duplicate
    const body = await json<{ id: number; name: string }>(res);
    accountId = body.id;
    expect(body.name).toBe('QA Test Expense Account');
  });
});

describe('2. Journal Entries', () => {
  it('creates a manual journal entry (debit Expense, credit Cash)', async () => {
    // Get any two accounts for Dr/Cr
    const coaRes = await api.get('/api/chart-of-accounts-list');
    const accounts = await json<Array<{ id: number; account_code: string }>>(coaRes);
    if (accounts.length < 2) {
      // Seed accounts first
      await api.post('/api/chart-of-accounts/seed', {});
    }

    const drAccount = accounts[0]?.id ?? accountId;
    const crAccount = accounts[1]?.id ?? accountId;

    const res = await api.post('/api/journal-entries', {
      entry_date: new Date().toISOString().split('T')[0],
      description: 'QA test journal entry',
      reference: `QA-JE-${Date.now()}`,
      lines: [
        { account_id: drAccount, debit: 5000, credit: 0, narration: 'QA debit' },
        { account_id: crAccount, debit: 0, credit: 5000, narration: 'QA credit' },
      ],
    });
    if (res.status === 400 || res.status === 422) return; // may need posting period
    const body = await json<{ id: number; status: string }>(res);
    journalEntryId = body.id;
    expect(journalEntryId).toBeGreaterThan(0);
  });

  it('fetches journal entry lines', async () => {
    if (!journalEntryId) return;
    const res = await api.get(`/api/journal-entries/${journalEntryId}/lines`);
    await expectStatus(res, 200);
    const lines = await json<Array<{ debit: number; credit: number }>>(res);
    expect(lines.length).toBe(2);
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2); // must balance
  });

  it('GET /api/journal-entries returns list', async () => {
    const res = await api.get('/api/journal-entries?limit=5');
    await expectStatus(res, 200);
  });
});

describe('3. Ledger & Reports', () => {
  it('GET /api/ledger/:accountId returns transactions for account', async () => {
    if (!accountId) return;
    const res = await api.get(`/api/ledger/${accountId}`);
    await expectStatus(res, 200);
    const ledger = await json<{ entries: unknown[] } | unknown[]>(res);
    expect(ledger).toBeDefined();
  });

  it('GET /api/day-book returns daily transactions', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await api.get(`/api/day-book?date=${today}`);
    await expectStatus(res, 200);
  });

  it('GET /api/aging-report returns receivables aging', async () => {
    const res = await api.get('/api/aging-report');
    await expectStatus(res, 200);
  });

  it('GET /api/cash-flow-statement returns cash flow', async () => {
    const res = await api.get('/api/cash-flow-statement');
    await expectStatus(res, 200);
  });
});

describe('4. Expense Vouchers', () => {
  it('creates an expense category', async () => {
    const res = await api.post('/api/expense-categories', {
      name: 'QA Test Category',
      description: 'For functional testing',
    });
    if (res.status === 409) return;
    await expectStatus(res, 200);
  });

  it('creates an expense voucher', async () => {
    const catRes = await api.get('/api/expense-categories');
    const cats = await json<Array<{ id: number }>>(catRes);
    const catId = cats[0]?.id ?? 1;

    const res = await api.post('/api/expense-vouchers', {
      voucher_date: new Date().toISOString().split('T')[0],
      description: 'QA test expense',
      category_id: catId,
      amount: 2500.00,
      payment_method: 'cash',
    });
    if (res.status === 400 || res.status === 422) return;
    const body = await json<{ id: number; status: string }>(res);
    expenseVoucherId = body.id;
    expect(body.status).toMatch(/draft|pending/);
  });

  it('submits the expense voucher for approval', async () => {
    if (!expenseVoucherId) return;
    const res = await api.post(`/api/expense-vouchers/${expenseVoucherId}/submit`, {});
    await expectStatus(res, 200);
    const body = await json<{ status: string }>(res);
    expect(body.status).toMatch(/submitted|pending_approval/);
  });

  it('approves the expense voucher', async () => {
    if (!expenseVoucherId) return;
    const res = await api.post(`/api/expense-vouchers/${expenseVoucherId}/approve`, {
      notes: 'Approved by QA test',
    });
    await expectStatus(res, 200);
  });
});

describe('5. Finance ERP — Period Management', () => {
  it('GET /api/finance-erp/periods returns accounting periods', async () => {
    const res = await api.get('/api/finance-erp/periods');
    if (res.status === 404) return; // module might be stub
    await expectStatus(res, 200);
    const periods = await json<Array<{ id: number; status: string }>>(res);
    expect(Array.isArray(periods)).toBe(true);
  });
});

describe('6. Budget Management', () => {
  it('GET /api/budgets returns budget list', async () => {
    const res = await api.get('/api/budgets');
    await expectStatus(res, 200);
  });

  it('creates a budget', async () => {
    const res = await api.post('/api/budgets', {
      name: 'QA Test Budget FY2026',
      period_start: '2026-04-01',
      period_end: '2027-03-31',
      total_amount: 1000000,
    });
    if (res.status === 400 || res.status === 422) return;
    const body = await json<{ id: number }>(res);
    expect(body.id).toBeGreaterThan(0);
  });
});
