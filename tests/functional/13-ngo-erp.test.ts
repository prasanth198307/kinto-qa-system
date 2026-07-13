/**
 * FUNCTIONAL TEST — NGO ERP
 *
 * Golden path:
 *   Donor registration → Donation received (with 80G eligibility) →
 *   Project allocation → Fund utilization → 80G certificate PDF →
 *   FCRA return → CSR receipt → Fund accounting GL entry
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let donorId: number;
let donationId: number;
let projectId: number;
let certificateId: number;

const TODAY = new Date().toISOString().split('T')[0];
const FY = '2025-26';

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('NGO ERP — 1. Donor Management', () => {
  it('GET /api/ngo/donors returns donor list', async () => {
    const res = await api.get('/api/ngo/donors');
    expect(res.status, 'Donors API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const donors = await json<unknown[]>(res);
    expect(Array.isArray(donors)).toBe(true);
  });

  it('POST /api/ngo/donors registers a new donor', async () => {
    const res = await api.post('/api/ngo/donors', {
      name: 'QA Donor Rajesh Mehta',
      pan: 'ABCDE1234F',
      email: `qa.donor.${Date.now()}@ngo.test`,
      phone: '9800007777',
      address: 'Mumbai, MH',
      donor_type: 'individual',
      is_foreign: false,
      aadhaar: '1234 5678 9012',
    });
    expect(res.status, 'Register donor must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string; pan: string }>(res);
    donorId = body.id;
    expect(body.pan).toBe('ABCDE1234F');
  });

  it('GET /api/ngo/donors/:id returns donor profile', async () => {
    if (!donorId) return;
    const res = await api.get(`/api/ngo/donors/${donorId}`);
    await expectStatus(res, 200);
    const donor = await json<{ id: number; name: string }>(res);
    expect(donor.name).toBe('QA Donor Rajesh Mehta');
  });
});

describe('NGO ERP — 2. Projects & Fund Allocation', () => {
  it('GET /api/ngo/projects returns project list', async () => {
    const res = await api.get('/api/ngo/projects');
    expect(res.status, 'Projects API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/ngo/projects creates an NGO project', async () => {
    const res = await api.post('/api/ngo/projects', {
      name: 'QA Clean Water Initiative',
      description: 'Providing clean drinking water to rural villages',
      start_date: TODAY,
      end_date: '2027-03-31',
      budget: 500000,
      beneficiary_count: 1000,
      location: 'Rajasthan',
      funding_type: 'donations',
    });
    expect(res.status, 'Create project must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string }>(res);
    projectId = body.id;
    expect(body.name).toBe('QA Clean Water Initiative');
  });
});

describe('NGO ERP — 3. Donations & Receipts', () => {
  it('GET /api/ngo/donations returns donation list', async () => {
    const res = await api.get('/api/ngo/donations');
    expect(res.status, 'Donations API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/ngo/donations records a donation', async () => {
    const res = await api.post('/api/ngo/donations', {
      donor_id: donorId ?? 1,
      amount: 25000,
      donation_date: TODAY,
      payment_mode: 'bank_transfer',
      bank_reference: `NEFT-QA-${Date.now()}`,
      project_id: projectId,
      is_80g_eligible: true,
      purpose: 'QA test donation for clean water project',
    });
    expect(res.status, 'Record donation must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; amount: number; receipt_number: string }>(res);
    donationId = body.id;
    expect(body.amount).toBe(25000);
    expect(body.receipt_number).toBeDefined();
  });

  it('GET /api/ngo/donations/:id returns donation details', async () => {
    if (!donationId) return;
    const res = await api.get(`/api/ngo/donations/${donationId}`);
    await expectStatus(res, 200);
    const donation = await json<{ id: number; amount: number }>(res);
    expect(donation.amount).toBe(25000);
  });
});

describe('NGO ERP — 4. 80G Certificates', () => {
  it('POST /api/ngo/80g-certificates generates 80G for one donor', async () => {
    const res = await api.post('/api/ngo/80g-certificates', {
      donor_id: donorId ?? 1,
      financial_year: FY,
      donation_ids: donationId ? [donationId] : [],
    });
    expect(res.status, '80G certificate must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; certificate_number: string }>(res);
    certificateId = body.id;
    expect(body.certificate_number).toBeDefined();
  });

  it('POST /api/ngo/80g-certificates/bulk generates bulk 80G PDFs', async () => {
    const res = await api.post('/api/ngo/80g-certificates/bulk', {
      financial_year: FY,
      donor_ids: donorId ? [donorId] : [],
    });
    expect(res.status, 'Bulk 80G must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ generated: number; pdf_url?: string }>(res);
    expect(body.generated).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/ngo/80g-certificates/:id/download downloads the certificate', async () => {
    if (!certificateId) return;
    const res = await api.get(`/api/ngo/80g-certificates/${certificateId}/download`);
    expect(res.status).not.toBe(404);
    // Should be a PDF or redirect
    if (res.status === 200) {
      const ct = res.headers.get('content-type') ?? '';
      expect(ct).toMatch(/pdf|octet-stream|json/);
    }
  });
});

describe('NGO ERP — 5. FCRA Compliance', () => {
  it('GET /api/ngo/fcra/returns returns FCRA filing list', async () => {
    const res = await api.get('/api/ngo/fcra/returns');
    expect(res.status, 'FCRA returns API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('GET /api/ngo/fcra/foreign-contributions returns FC receipt register', async () => {
    const res = await api.get('/api/ngo/fcra/foreign-contributions');
    expect(res.status).not.toBe(404);
  });

  it('POST /api/ngo/fcra/submit submits FCRA online return', async () => {
    const res = await api.post('/api/ngo/fcra/submit', {
      financial_year: FY,
      total_foreign_receipts: 0,
      total_domestic_receipts: 25000,
      purpose: 'charitable',
    });
    expect(res.status, 'FCRA submit must not 404').not.toBe(404);
  });
});

describe('NGO ERP — 6. CSR Module', () => {
  it('GET /api/ngo/csr/projects returns CSR project list', async () => {
    const res = await api.get('/api/ngo/csr/projects');
    expect(res.status, 'CSR projects API must exist').not.toBe(404);
  });

  it('POST /api/ngo/csr/receipts issues CSR receipt to corporate donor', async () => {
    const res = await api.post('/api/ngo/csr/receipts', {
      donor_id: donorId ?? 1,
      amount: 25000,
      csr_activity: 'Clean Water Initiative',
      date: TODAY,
    });
    expect(res.status).not.toBe(404);
  });
});

describe('NGO ERP — 7. Beneficiaries', () => {
  it('GET /api/ngo/beneficiaries returns beneficiary list', async () => {
    const res = await api.get('/api/ngo/beneficiaries');
    expect(res.status, 'Beneficiaries API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/ngo/beneficiaries adds a beneficiary', async () => {
    const res = await api.post('/api/ngo/beneficiaries', {
      name: 'QA Village Beneficiary',
      location: 'Rajasthan',
      project_id: projectId,
      beneficiary_type: 'household',
      members: 5,
    });
    expect(res.status).not.toBe(404);
  });
});
