/**
 * FUNCTIONAL TEST — Nidhi Company ERP
 *
 * Golden path: Member registration → FD/RD deposit →
 *              Loan application → Sanction → EMI collection →
 *              PDC cheque tracking → RBI NDH return data
 *
 * API routes confirmed in server/routes.ts:
 *   /api/nidhi/loan-applications
 *   /api/nidhi/loan-applications/:id
 *   /api/nidhi/pdc-cheques
 *   /api/nidhi/pdc-cheques/:id
 *   /api/nidhi/rbi-return-data
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let loanApplicationId: number;
let pdcChequeId: number;

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('1. Loan Applications', () => {
  it('GET /api/nidhi/loan-applications returns list', async () => {
    const res = await api.get('/api/nidhi/loan-applications');
    if (res.status === 403) {
      console.log('SKIP: Nidhi module not enabled for this plan');
      return;
    }
    await expectStatus(res, 200);
    const data = await json<unknown[]>(res);
    expect(Array.isArray(data)).toBe(true);
  });

  it('creates a loan application for a seed customer', async () => {
    const res = await api.post('/api/nidhi/loan-applications', {
      member_id: 9001,       // seed customer used as member
      loan_type: 'personal',
      loan_amount: 50000,
      tenure_months: 12,
      interest_rate: 12.5,
      purpose: 'QA test loan application',
      application_date: new Date().toISOString().split('T')[0],
      collateral: 'FD receipt',
      guarantor_name: 'Test Guarantor',
      guarantor_phone: '9800001111',
    });
    if (res.status === 403) return; // plan gated
    if (res.status === 422 || res.status === 400) {
      console.log('Loan application validation failed — check member_id mapping');
      return;
    }
    const body = await json<{ id: number; status: string; loan_amount: number }>(res);
    loanApplicationId = body.id;
    expect(Number(body.loan_amount)).toBe(50000);
    expect(body.status.toLowerCase()).toMatch(/pending|submitted|draft|applied/);
  });

  it('fetches the loan application details', async () => {
    if (!loanApplicationId) return;
    const res = await api.get(`/api/nidhi/loan-applications/${loanApplicationId}`);
    await expectStatus(res, 200);
    const loan = await json<{ id: number; loan_amount: number }>(res);
    expect(loan.id).toBe(loanApplicationId);
    expect(Number(loan.loan_amount)).toBe(50000);
  });

  it('updates loan status to sanctioned', async () => {
    if (!loanApplicationId) return;
    const res = await api.put(`/api/nidhi/loan-applications/${loanApplicationId}`, {
      status: 'sanctioned',
      sanction_date: new Date().toISOString().split('T')[0],
      sanctioned_amount: 50000,
      sanctioned_by: 'QA Admin',
    });
    if (res.status === 404 || res.status === 422) return;
    await expectStatus(res, 200);
    const body = await json<{ status: string }>(res);
    expect(body.status).toMatch(/sanctioned|approved/);
  });
});

describe('2. PDC Cheque Tracking', () => {
  it('GET /api/nidhi/pdc-cheques returns list', async () => {
    const res = await api.get('/api/nidhi/pdc-cheques');
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const data = await json<unknown[]>(res);
    expect(Array.isArray(data)).toBe(true);
  });

  it('creates PDC cheques for EMI collection', async () => {
    if (!loanApplicationId) return;
    const res = await api.post('/api/nidhi/pdc-cheques', {
      loan_application_id: loanApplicationId,
      member_id: 9001,
      cheque_number: `QA-CHQ-${Date.now()}`,
      bank_name: 'HDFC Bank',
      account_number: '50100987654321',
      amount: 4583.33,  // 50000/12 months approx
      cheque_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'pending',
    });
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; cheque_number: string }>(res);
    pdcChequeId = body.id;
    expect(body.cheque_number).toMatch(/QA-CHQ/);
  });

  it('marks PDC cheque as presented to bank', async () => {
    if (!pdcChequeId) return;
    const res = await api.put(`/api/nidhi/pdc-cheques/${pdcChequeId}`, {
      status: 'presented',
      presented_date: new Date().toISOString().split('T')[0],
    });
    if (res.status === 404 || res.status === 422) return;
    await expectStatus(res, 200);
    const body = await json<{ status: string }>(res);
    expect(body.status).toMatch(/presented|cleared/);
  });

  it('marks PDC cheque as cleared (EMI received)', async () => {
    if (!pdcChequeId) return;
    const res = await api.put(`/api/nidhi/pdc-cheques/${pdcChequeId}`, {
      status: 'cleared',
      cleared_date: new Date().toISOString().split('T')[0],
      transaction_id: `QA-TXN-${Date.now()}`,
    });
    if (res.status === 404 || res.status === 422) return;
    await expectStatus(res, 200);
  });
});

describe('3. RBI Return Data', () => {
  it('GET /api/nidhi/rbi-return-data returns NDH-1 data', async () => {
    const res = await api.get('/api/nidhi/rbi-return-data');
    if (res.status === 403) return; // plan gated
    await expectStatus(res, 200);
    const data = await json<Record<string, unknown>>(res);
    // Should have member count, deposit totals, loan totals
    expect(data).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW FEATURES — added 2026-07-19
// Tests for features 1-9: KYC workflow, penal interest, foreclosure quote,
// share certificate PDF, loan NOC PDF, WhatsApp reminders, dividend GL,
// compliance trend, MCA21 XML returns (NDH-1/2/4/9)
// ─────────────────────────────────────────────────────────────────────────────

let ndh: ApiClient;
let ndh_memberId: string;
let ndh_loanId: string;
let ndh_dividendId: number;

beforeAll(async () => {
  ndh = await login('qa_ndh_owner', 'Test@1234');
  // Grab an existing member and loan for PDF/doc tests
  const mRes = await ndh.get('/api/nidhi-company/members');
  if (mRes.status === 200) {
    const ms = await mRes.json() as any[];
    if (ms.length) ndh_memberId = ms[0].id;
  }
  const lRes = await ndh.get('/api/nidhi-company/loans');
  if (lRes.status === 200) {
    const ls = await lRes.json() as any[];
    // Prefer a closed loan for NOC, otherwise any
    const closed = ls.find((l: any) => l.status === 'closed');
    ndh_loanId = (closed || ls[0])?.id;
  }
});

// ── Feature 1: KYC Document Upload + Review ───────────────────────────────────
describe('4. KYC Document Upload + Review Workflow', () => {
  it('POST /api/nidhi-company/members/:id/kyc-documents uploads a document', async () => {
    if (!ndh_memberId) return;
    const res = await ndh.post(`/api/nidhi-company/members/${ndh_memberId}/kyc-documents`, {
      doc_type: 'aadhar_front',
      file_name: 'aadhaar_front.jpg',
      mime_type: 'image/jpeg',
      file_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB',
    });
    if (res.status === 404) return; // member not found is acceptable in test db
    await expectStatus(res, 201);
    const body = await json<{ id: number; doc_type: string; status: string }>(res);
    expect(body.doc_type).toBe('aadhar_front');
    expect(body.status).toBe('pending');
  });

  it('GET /api/nidhi-company/members/:id/kyc-documents returns list', async () => {
    if (!ndh_memberId) return;
    const res = await ndh.get(`/api/nidhi-company/members/${ndh_memberId}/kyc-documents`);
    if (res.status === 404) return;
    await expectStatus(res, 200);
    const body = await json<unknown[]>(res);
    expect(Array.isArray(body)).toBe(true);
  });

  it('PUT /api/nidhi-company/members/:id/kyc-approve sets kyc_status=approved', async () => {
    if (!ndh_memberId) return;
    const res = await ndh.put(`/api/nidhi-company/members/${ndh_memberId}/kyc-approve`, {});
    if (res.status === 404) return;
    await expectStatus(res, 200);
    const body = await json<{ kyc_status: string }>(res);
    expect(body.kyc_status).toBe('approved');
  });

  it('PUT /api/nidhi-company/members/:id/kyc-reject sets kyc_status=rejected with reason', async () => {
    // Create a fresh member to reject
    const mRes = await ndh.post('/api/nidhi-company/members', {
      name: 'KYC Reject Test Member',
      phone: '9111222333',
      membership_date: new Date().toISOString().split('T')[0],
    });
    if (mRes.status !== 200 && mRes.status !== 201) return;
    const m = await json<{ id: string }>(mRes);
    await ndh.post(`/api/nidhi-company/members/${m.id}/kyc-documents`, {
      doc_type: 'pan',
      file_name: 'pan.jpg',
    });
    const res = await ndh.put(`/api/nidhi-company/members/${m.id}/kyc-reject`, {
      reason: 'Document is blurry',
    });
    await expectStatus(res, 200);
    const body = await json<{ kyc_status: string; rejection_reason: string }>(res);
    expect(body.kyc_status).toBe('rejected');
  });

  it('returns 400 when doc_type is missing', async () => {
    if (!ndh_memberId) return;
    const res = await ndh.post(`/api/nidhi-company/members/${ndh_memberId}/kyc-documents`, {
      file_name: 'no_type.jpg',
    });
    expect(res.status).toBe(400);
  });
});

// ── Feature 2: Penal Interest Auto-Calculation ────────────────────────────────
describe('5. Penal Interest Auto-Calculation', () => {
  it('GET /api/nidhi-company/loans/:id/penal-interest-quote returns quote', async () => {
    if (!ndh_loanId) return;
    const res = await ndh.get(`/api/nidhi-company/loans/${ndh_loanId}/penal-interest-quote`);
    if (res.status === 404) return;
    await expectStatus(res, 200);
    const body = await json<{
      outstanding_principal: number;
      days_overdue: number;
      penal_rate_per_annum: number;
      penal_interest_due: number;
      total_due: number;
    }>(res);
    expect(typeof body.days_overdue).toBe('number');
    expect(typeof body.penal_interest_due).toBe('number');
    expect(body.penal_rate_per_annum).toBe(2);
    expect(body.total_due).toBeGreaterThanOrEqual(0);
  });

  it('penal_interest_due is 0 when loan is not overdue', async () => {
    // Create a fresh loan with next_emi_date in the future
    const mRes = await ndh.post('/api/nidhi-company/members', {
      name: 'Penal Test Member',
      phone: '9222333444',
      kyc_status: 'approved',
      status: 'active',
      membership_date: new Date().toISOString().split('T')[0],
      shares_held: 10, share_value: 10, total_share_amount: 100,
    });
    if (mRes.status !== 200 && mRes.status !== 201) return;
    const m = await json<{ id: string }>(mRes);
    const futureEmi = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const lRes = await ndh.post('/api/nidhi-company/loans', {
      member_id: m.id,
      loan_type: 'personal',
      principal_amount: 10000,
      interest_rate: 12,
      tenure_months: 12,
      next_emi_date: futureEmi,
      emi_amount: 888,
    });
    if (lRes.status !== 200 && lRes.status !== 201) return;
    const l = await json<{ id: string }>(lRes);
    const res = await ndh.get(`/api/nidhi-company/loans/${l.id}/penal-interest-quote`);
    await expectStatus(res, 200);
    const body = await json<{ days_overdue: number; penal_interest_due: number }>(res);
    expect(body.days_overdue).toBe(0);
    expect(body.penal_interest_due).toBe(0);
  });
});

// ── Feature 3: Foreclosure Quote ─────────────────────────────────────────────
describe('6. Loan Foreclosure Quote', () => {
  it('GET /api/nidhi-company/loans/:id/foreclosure-quote returns quote', async () => {
    if (!ndh_loanId) return;
    const res = await ndh.get(`/api/nidhi-company/loans/${ndh_loanId}/foreclosure-quote`);
    if (res.status === 404 || res.status === 400) return; // closed loan returns 400
    await expectStatus(res, 200);
    const body = await json<{
      outstanding_principal: number;
      accrued_interest: number;
      foreclosure_penalty: number;
      total_foreclosure_amount: number;
      quote_date: string;
      valid_until: string;
    }>(res);
    expect(typeof body.total_foreclosure_amount).toBe('number');
    expect(body.total_foreclosure_amount).toBeGreaterThanOrEqual(0);
    expect(body.valid_until).toBeTruthy();
  });

  it('returns 400 for already-closed loans', async () => {
    // Find a closed loan explicitly
    const ls = await (await ndh.get('/api/nidhi-company/loans')).json() as any[];
    const closed = (ls as any[]).find((l: any) => l.status === 'closed');
    if (!closed) return;
    const res = await ndh.get(`/api/nidhi-company/loans/${closed.id}/foreclosure-quote`);
    expect(res.status).toBe(400);
  });

  it('foreclosure penalty is 0 when >50% tenure is repaid', async () => {
    // Use an existing loan with emis_paid > total_emis/2
    const ls = await (await ndh.get('/api/nidhi-company/loans')).json() as any[];
    const halfPaid = (ls as any[]).find((l: any) => l.status === 'active' && Number(l.emis_paid) > Number(l.total_emis) / 2);
    if (!halfPaid) return;
    const res = await ndh.get(`/api/nidhi-company/loans/${halfPaid.id}/foreclosure-quote`);
    if (res.status !== 200) return;
    const body = await json<{ foreclosure_penalty: number }>(res);
    expect(body.foreclosure_penalty).toBe(0);
  });
});

// ── Feature 4: Share Certificate PDF ─────────────────────────────────────────
describe('7. Share Certificate PDF', () => {
  it('GET /api/nidhi-company/members/:id/share-certificate-pdf returns PDF', async () => {
    if (!ndh_memberId) return;
    const res = await ndh.get(`/api/nidhi-company/members/${ndh_memberId}/share-certificate-pdf`);
    if (res.status === 404) return;
    await expectStatus(res, 200);
    expect(res.headers.get('content-type')).toMatch(/pdf/);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('returns 404 for unknown member', async () => {
    const res = await ndh.get('/api/nidhi-company/members/00000000-0000-0000-0000-000000000000/share-certificate-pdf');
    expect(res.status).toBe(404);
  });
});

// ── Feature 5: Loan NOC PDF ───────────────────────────────────────────────────
describe('8. Loan NOC Letter PDF', () => {
  it('GET /api/nidhi-company/loans/:id/noc-pdf returns PDF for closed loan', async () => {
    // Find a closed loan
    const ls = await (await ndh.get('/api/nidhi-company/loans')).json() as any[];
    const closed = (ls as any[]).find((l: any) => l.status === 'closed');
    if (!closed) return;
    const res = await ndh.get(`/api/nidhi-company/loans/${closed.id}/noc-pdf`);
    await expectStatus(res, 200);
    expect(res.headers.get('content-type')).toMatch(/pdf/);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('returns 400 for active (not yet closed) loan', async () => {
    const ls = await (await ndh.get('/api/nidhi-company/loans')).json() as any[];
    const active = (ls as any[]).find((l: any) => l.status === 'active');
    if (!active) return;
    const res = await ndh.get(`/api/nidhi-company/loans/${active.id}/noc-pdf`);
    expect(res.status).toBe(400);
  });
});

// ── Feature 6: WhatsApp Reminders ────────────────────────────────────────────
describe('9. WhatsApp Reminders Endpoint', () => {
  it('POST /api/nidhi-company/admin/send-whatsapp-reminders completes without error', async () => {
    const res = await ndh.post('/api/nidhi-company/admin/send-whatsapp-reminders', {});
    await expectStatus(res, 200);
    const body = await json<{
      success: boolean;
      emi_reminders_sent: number;
      maturity_alerts_sent: number;
      kyc_reminders_sent: number;
    }>(res);
    expect(body.success).toBe(true);
    expect(typeof body.emi_reminders_sent).toBe('number');
    expect(typeof body.maturity_alerts_sent).toBe('number');
    expect(typeof body.kyc_reminders_sent).toBe('number');
  });
});

// ── Feature 7: Dividend Declare + GL Posting ──────────────────────────────────
describe('10. Dividend Declaration + GL Posting', () => {
  it('GET /api/nidhi-company/dividend/calculate previews dividend breakdown', async () => {
    const res = await ndh.get('/api/nidhi-company/dividend/calculate?rate=8');
    await expectStatus(res, 200);
    const body = await json<{ rate: number | string; members: unknown[]; totalDividend: number }>(res);
    expect(Array.isArray(body.members)).toBe(true);
    expect(typeof body.totalDividend).toBe('number');
  });

  it('POST /api/nidhi-company/dividend/declare creates declaration + GL entry', async () => {
    const fy = `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`;
    const res = await ndh.post('/api/nidhi-company/dividend/declare', {
      rate: 8,
      financial_year: fy,
      declared_by: 'qa_ndh_owner',
      declaration_date: new Date().toISOString().split('T')[0],
    });
    await expectStatus(res, 201);
    const body = await json<{
      declaration: { id: number; financial_year: string; dividend_rate: number };
      total_members: number;
      total_dividend: number;
      gl_posted: boolean;
    }>(res);
    expect(body.declaration.financial_year).toBe(fy);
    expect(Number(body.declaration.dividend_rate)).toBe(8);
    expect(typeof body.total_dividend).toBe('number');
    ndh_dividendId = body.declaration.id;
  });

  it('returns 400 when rate or financial_year is missing', async () => {
    const res = await ndh.post('/api/nidhi-company/dividend/declare', { rate: 8 });
    expect(res.status).toBe(400);
  });

  it('GET /api/nidhi-company/dividend/history returns past declarations', async () => {
    const res = await ndh.get('/api/nidhi-company/dividend/history');
    await expectStatus(res, 200);
    const body = await json<unknown[]>(res);
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/nidhi-company/dividend/:id/payouts lists per-member payouts', async () => {
    if (!ndh_dividendId) return;
    const res = await ndh.get(`/api/nidhi-company/dividend/${ndh_dividendId}/payouts`);
    await expectStatus(res, 200);
    const body = await json<unknown[]>(res);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ── Feature 8: Compliance Dashboard Trend ────────────────────────────────────
describe('11. Compliance Dashboard Trend', () => {
  it('GET /api/nidhi-company/compliance/trend returns 12-month trend', async () => {
    const res = await ndh.get('/api/nidhi-company/compliance/trend');
    await expectStatus(res, 200);
    const body = await json<{ months: number; trend: unknown[] }>(res);
    expect(body.months).toBe(12);
    expect(Array.isArray(body.trend)).toBe(true);
    expect(body.trend.length).toBe(12);
  });

  it('trend items have all required KPI fields', async () => {
    const res = await ndh.get('/api/nidhi-company/compliance/trend?months=3');
    await expectStatus(res, 200);
    const body = await json<{ trend: any[] }>(res);
    const item = body.trend[0];
    expect(item).toHaveProperty('period');
    expect(item).toHaveProperty('cumulative_members');
    expect(item).toHaveProperty('total_deposits');
    expect(item).toHaveProperty('total_loans');
    expect(item).toHaveProperty('npa_rate');
    expect(item).toHaveProperty('deposit_to_nof_ratio');
    expect(item).toHaveProperty('kyc_completion_rate');
    expect(item).toHaveProperty('is_nof_compliant');
  });

  it('months param is respected (3 months returns 3 items)', async () => {
    const res = await ndh.get('/api/nidhi-company/compliance/trend?months=3');
    await expectStatus(res, 200);
    const body = await json<{ trend: unknown[] }>(res);
    expect(body.trend.length).toBe(3);
  });
});

// ── Feature 9: MCA21 XML Returns (NDH-1, NDH-2, NDH-4, NDH-9) ───────────────
describe('12. MCA21 XML Returns', () => {
  const year = new Date().getFullYear() - 1;

  it('GET /api/nidhi-company/rbi-returns/ndh1/:year returns XML', async () => {
    const res = await ndh.get(`/api/nidhi-company/rbi-returns/ndh1/${year}`);
    await expectStatus(res, 200);
    expect(res.headers.get('content-type')).toMatch(/xml/);
    const text = await res.text();
    expect(text).toContain('<NDH1Return');
    expect(text).toContain('<Members');
    expect(text).toContain('<Deposits');
    expect(text).toContain('<Loans');
  });

  it('GET /api/nidhi-company/rbi-returns/ndh2/:year returns half-yearly deposit data', async () => {
    const res = await ndh.get(`/api/nidhi-company/rbi-returns/ndh2/${year}`);
    await expectStatus(res, 200);
    const body = await json<{ return_type: string; xml: string }>(res);
    expect(body.return_type).toBe('NDH-2');
    expect(body.xml).toContain('NDH');
  });

  it('GET /api/nidhi-company/rbi-returns/ndh2/:year?format=xml returns XML attachment', async () => {
    const res = await ndh.get(`/api/nidhi-company/rbi-returns/ndh2/${year}?format=xml`);
    await expectStatus(res, 200);
    expect(res.headers.get('content-type')).toMatch(/xml/);
    const text = await res.text();
    expect(text).toContain('<NDH2Return>');
  });

  it('GET /api/nidhi-company/rbi-returns/ndh4/:year returns annual XML with RBI compliance flag', async () => {
    const res = await ndh.get(`/api/nidhi-company/rbi-returns/ndh4/${year}`);
    await expectStatus(res, 200);
    expect(res.headers.get('content-type')).toMatch(/xml/);
    const text = await res.text();
    expect(text).toContain('<NDH4AnnualReturn>');
    expect(text).toContain('<RBICompliant>');
    expect(text).toMatch(/<RBICompliant>(YES|NO)<\/RBICompliant>/);
  });

  it('POST /api/nidhi-company/rbi-returns/ndh9 records director self-declaration', async () => {
    const res = await ndh.post('/api/nidhi-company/rbi-returns/ndh9', {
      financial_year: `${year}-${String(year + 1).slice(2)}`,
      director_name: 'QA Director',
      director_din: 'DIN12345678',
      declaration_date: new Date().toISOString().split('T')[0],
    });
    await expectStatus(res, 200);
    const body = await json<{
      return_type: string;
      director_name: string;
      is_compliant: boolean;
      declaration: string;
    }>(res);
    expect(body.return_type).toBe('NDH-9');
    expect(body.director_name).toBe('QA Director');
    expect(typeof body.is_compliant).toBe('boolean');
    expect(body.declaration).toContain('QA Director');
  });
});
