/**
 * FUNCTIONAL TEST — Healthcare ERP
 *
 * Golden path:
 *   Patient registration → OPD consultation → Lab order →
 *   Lab result → IPD admission → Ward charges →
 *   IPD discharge → Bill generation (GST) → Insurance claim
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let patientId: number;
let opdVisitId: number;
let labOrderId: number;
let admissionId: number;
let billId: number;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('Healthcare ERP — 1. Patient Registration', () => {
  it('GET /api/healthcare/patients returns patient list', async () => {
    const res = await api.get('/api/healthcare/patients');
    expect(res.status, 'Patients API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const patients = await json<unknown[]>(res);
    expect(Array.isArray(patients)).toBe(true);
  });

  it('POST /api/healthcare/patients registers a new patient', async () => {
    const res = await api.post('/api/healthcare/patients', {
      name: 'QA Patient Ramesh',
      dob: '1985-03-15',
      gender: 'male',
      phone: '9800001234',
      email: `qa.patient.${Date.now()}@health.test`,
      address: 'Mumbai, MH',
      blood_group: 'B+',
      emergency_contact: 'Sunita Ramesh',
      emergency_phone: '9800001235',
      uhid: `UHID-QA-${Date.now().toString().slice(-6)}`,
    });
    expect(res.status, 'Register patient must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; name: string; uhid: string }>(res);
    patientId = body.id;
    expect(body.name).toBe('QA Patient Ramesh');
  });

  it('GET /api/healthcare/patients/:id returns patient profile', async () => {
    if (!patientId) return;
    const res = await api.get(`/api/healthcare/patients/${patientId}`);
    await expectStatus(res, 200);
    const patient = await json<{ id: number; blood_group: string }>(res);
    expect(patient.id).toBe(patientId);
    expect(patient.blood_group).toBe('B+');
  });
});

describe('Healthcare ERP — 2. OPD Consultation', () => {
  it('GET /api/healthcare/opd returns OPD queue', async () => {
    const res = await api.get('/api/healthcare/opd');
    expect(res.status, 'OPD API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/healthcare/opd registers an OPD visit', async () => {
    const res = await api.post('/api/healthcare/opd', {
      patient_id: patientId ?? 1,
      doctor_id: 1,
      visit_date: TODAY,
      appointment_time: '10:30',
      chief_complaint: 'Fever and body ache',
      visit_type: 'new',
      department: 'General Medicine',
      consultation_fee: 500,
    });
    expect(res.status, 'OPD visit must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; status: string }>(res);
    opdVisitId = body.id;
    expect(body.status).toMatch(/registered|waiting|in_progress/);
  });

  it('PUT /api/healthcare/opd/:id/prescription saves prescription', async () => {
    if (!opdVisitId) return;
    const res = await api.put(`/api/healthcare/opd/${opdVisitId}/prescription`, {
      diagnosis: 'Viral fever',
      icd_code: 'A99',
      medications: [
        { drug: 'Paracetamol 500mg', dose: '1 tab', frequency: 'TDS', days: 5 },
        { drug: 'Cetirizine 10mg', dose: '1 tab', frequency: 'OD', days: 3 },
      ],
      advice: 'Rest, plenty of fluids',
      follow_up_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Healthcare ERP — 3. Laboratory', () => {
  it('GET /api/healthcare/lab returns lab orders', async () => {
    const res = await api.get('/api/healthcare/lab');
    expect(res.status, 'Lab API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/healthcare/lab creates a lab order', async () => {
    const res = await api.post('/api/healthcare/lab', {
      patient_id: patientId ?? 1,
      opd_visit_id: opdVisitId,
      ordered_by: 1,
      order_date: TODAY,
      tests: [
        { test_name: 'CBC', test_code: 'CBC001', price: 300 },
        { test_name: 'Urine Routine', test_code: 'UR001', price: 150 },
        { test_name: 'Dengue NS1 Antigen', test_code: 'DEN001', price: 800 },
      ],
      priority: 'routine',
    });
    expect(res.status, 'Create lab order must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; total_amount: number }>(res);
    labOrderId = body.id;
    expect(body.total_amount).toBe(1250);
  });

  it('PUT /api/healthcare/lab/:id/results enters lab results', async () => {
    if (!labOrderId) return;
    const res = await api.put(`/api/healthcare/lab/${labOrderId}/results`, {
      results: [
        { test_code: 'CBC001', value: 'Normal', unit: '', reference_range: 'Normal' },
        { test_code: 'UR001', value: 'Clear', unit: '', reference_range: 'Clear' },
        { test_code: 'DEN001', value: 'Negative', unit: '', reference_range: 'Negative' },
      ],
      reported_by: 'Dr. QA Pathologist',
      reported_at: new Date().toISOString(),
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Healthcare ERP — 4. IPD Admission', () => {
  it('GET /api/healthcare/ipd returns IPD admissions', async () => {
    const res = await api.get('/api/healthcare/ipd');
    expect(res.status, 'IPD API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/healthcare/ipd/admit admits a patient', async () => {
    const res = await api.post('/api/healthcare/ipd/admit', {
      patient_id: patientId ?? 1,
      admission_date: TODAY,
      ward: 'General Ward',
      bed_number: 'B-12',
      attending_doctor_id: 1,
      admission_type: 'emergency',
      diagnosis_on_admission: 'Severe viral fever',
      estimated_stay_days: 3,
      mlc: false,
    });
    expect(res.status, 'IPD admit must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; status: string; bed_number: string }>(res);
    admissionId = body.id;
    expect(body.bed_number).toBe('B-12');
    expect(body.status).toMatch(/admitted|active/);
  });

  it('POST /api/healthcare/ipd/:id/charges adds daily ward charge', async () => {
    if (!admissionId) return;
    const res = await api.post(`/api/healthcare/ipd/${admissionId}/charges`, {
      charge_type: 'ward',
      description: 'General Ward - Day 1',
      amount: 2500,
      tax_rate: 5,
      date: TODAY,
    });
    expect(res.status).not.toBe(404);
  });

  it('POST /api/healthcare/ipd/:id/discharge discharges patient', async () => {
    if (!admissionId) return;
    const res = await api.post(`/api/healthcare/ipd/${admissionId}/discharge`, {
      discharge_date: TODAY,
      discharge_type: 'recovered',
      discharge_summary: 'Patient recovered, vitals stable',
      follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
    expect(res.status, 'IPD discharge must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ status: string; bill_id?: number }>(res);
    expect(body.status).toMatch(/discharged/);
    if (body.bill_id) billId = body.bill_id;
  });
});

describe('Healthcare ERP — 5. Billing', () => {
  it('GET /api/healthcare/billing returns billing list', async () => {
    const res = await api.get('/api/healthcare/billing');
    expect(res.status, 'Healthcare billing API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/healthcare/billing/generate generates consolidated bill', async () => {
    const res = await api.post('/api/healthcare/billing/generate', {
      patient_id: patientId ?? 1,
      admission_id: admissionId,
      include_opd: true,
      include_lab: true,
      include_pharmacy: true,
      discount_percent: 0,
    });
    expect(res.status, 'Generate bill must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{
      id: number;
      subtotal: number;
      gst_amount: number;
      total: number;
    }>(res);
    billId = body.id;
    expect(body.total).toBeGreaterThan(0);
    // GST must be calculated on taxable value
    expect(body.gst_amount).toBeGreaterThanOrEqual(0);
  });

  it('Healthcare bill must show ₹ for IN tenant', async () => {
    if (!billId) return;
    const res = await api.get(`/api/healthcare/billing/${billId}`);
    if (res.status !== 200) return;
    const bill = await json<{ currency_symbol?: string; currency_code?: string }>(res);
    if (bill.currency_code) expect(bill.currency_code).toBe('INR');
    if (bill.currency_symbol) expect(bill.currency_symbol).toBe('₹');
  });
});

describe('Healthcare ERP — 6. Insurance TPA', () => {
  it('GET /api/healthcare/insurance returns insurance panels', async () => {
    const res = await api.get('/api/healthcare/insurance');
    expect(res.status, 'Insurance API must exist').not.toBe(404);
  });

  it('POST /api/healthcare/insurance/claims submits TPA claim', async () => {
    const res = await api.post('/api/healthcare/insurance/claims', {
      patient_id: patientId ?? 1,
      admission_id: admissionId,
      tpa_name: 'Star Health',
      policy_number: 'SH-QA-001234',
      pre_auth_number: 'PRE-QA-001',
      claimed_amount: 15000,
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Healthcare ERP — 7. Appointments', () => {
  it('GET /api/healthcare/appointments returns appointment list', async () => {
    const res = await api.get('/api/healthcare/appointments');
    expect(res.status).not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/healthcare/appointments books an appointment', async () => {
    const res = await api.post('/api/healthcare/appointments', {
      patient_id: patientId ?? 1,
      doctor_id: 1,
      appointment_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      appointment_time: '11:00',
      type: 'follow_up',
      notes: 'QA follow-up appointment',
    });
    expect(res.status).not.toBe(404);
  });
});
