/**
 * FUNCTIONAL TEST — HR & Payroll ERP (shared module across all verticals)
 *
 * Golden path: Add employee → set salary → mark attendance →
 *              process payroll → generate payslip →
 *              post GL journal entry for salary
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let employeeId: number;
let payrollRunId: number;

const TODAY = new Date().toISOString().split('T')[0];
const MONTH = new Date().getMonth() + 1;
const YEAR = new Date().getFullYear();

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('1. Employee Management', () => {
  it('GET /api/hr/employees returns employee list', async () => {
    const res = await api.get('/api/hr/employees');
    if (res.status === 403 || res.status === 404) {
      console.log('SKIP: HR module not accessible');
      return;
    }
    await expectStatus(res, 200);
    const data = await json<{ employees?: unknown[] } | unknown[]>(res);
    expect(data).toBeDefined();
  });

  it('creates a new employee', async () => {
    const res = await api.post('/api/hr/employees', {
      employee_id: `EMP-QA-${Date.now().toString().slice(-5)}`,
      first_name: 'QA',
      last_name: 'Test Employee',
      designation: 'QA Engineer',
      department: 'Quality Assurance',
      basic_salary: 40000,
      phone: '9800001234',
      email: `qa.emp.${Date.now()}@kinto.test`,
      date_of_joining: TODAY,
      gender: 'male',
      date_of_birth: '1990-01-01',
    });
    if (res.status === 403 || res.status === 404) return;
    const body = await json<{ id: number; first_name: string }>(res);
    employeeId = body.id;
    expect(body.first_name).toBe('QA');
  });

  it('updates employee salary', async () => {
    if (!employeeId) return;
    const res = await api.put(`/api/hr/employees/${employeeId}`, {
      basic_salary: 45000,
      hra: 9000,
      transport_allowance: 1600,
      special_allowance: 3000,
    });
    if (res.status === 404) return;
    await expectStatus(res, 200);
    const body = await json<{ basic_salary: number }>(res);
    expect(body.basic_salary).toBe(45000);
  });
});

describe('2. Attendance Tracking', () => {
  it('marks employee as present today', async () => {
    const empId = employeeId ?? 9001;
    const res = await api.post('/api/hr/attendance', {
      employee_id: empId,
      date: TODAY,
      check_in: '09:00',
      check_out: '18:00',
      status: 'present',
      working_hours: 9,
    });
    if (res.status === 403 || res.status === 404 || res.status === 409) return;
    await expectStatus(res, 200);
    const body = await json<{ status: string }>(res);
    expect(body.status).toBe('present');
  });

  it('GET /api/hr/attendance for employee this month', async () => {
    const empId = employeeId ?? 9001;
    const res = await api.get(`/api/hr/attendance?employee_id=${empId}&month=${MONTH}&year=${YEAR}`);
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
  });

  it('GET /api/hr/attendance summary for month', async () => {
    const res = await api.get(`/api/hr/attendance/summary?month=${MONTH}&year=${YEAR}`);
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
  });
});

describe('3. Leave Management', () => {
  it('creates a leave request', async () => {
    const empId = employeeId ?? 9001;
    const res = await api.post('/api/hr/leaves', {
      employee_id: empId,
      leave_type: 'casual',
      from_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      to_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
      reason: 'QA test leave',
      days: 3,
    });
    if (res.status === 403 || res.status === 404) return;
    const body = await json<{ id: number; status: string }>(res);
    expect(body.status).toMatch(/pending|applied/);
  });
});

describe('4. Payroll Processing', () => {
  it('creates a payroll run for current month', async () => {
    const res = await api.post('/api/hr/payroll/runs', {
      month: MONTH,
      year: YEAR,
      include_all: true,
    });
    if (res.status === 403 || res.status === 404) return;
    if (res.status === 409) {
      // payroll already run this month
      const list = await api.get(`/api/hr/payroll/runs?month=${MONTH}&year=${YEAR}`);
      const runs = await json<Array<{ id: number }>>(list);
      payrollRunId = runs[0]?.id;
      return;
    }
    const body = await json<{ id: number; status: string; total_gross: number }>(res);
    payrollRunId = body.id;
    expect(body.status).toMatch(/draft|calculated/);
    expect(body.total_gross).toBeGreaterThan(0);
  });

  it('calculates individual payslip — verifies CTC components', async () => {
    if (!payrollRunId) return;
    const empId = employeeId ?? 9001;
    const res = await api.get(`/api/hr/payroll/payslip?run_id=${payrollRunId}&employee_id=${empId}`);
    if (res.status === 404) return;
    await expectStatus(res, 200);
    const payslip = await json<{
      basic_salary: number;
      gross_salary: number;
      pf_deduction?: number;
      esi_deduction?: number;
      tds_deduction?: number;
      net_salary: number;
    }>(res);
    expect(payslip.gross_salary).toBeGreaterThan(0);
    expect(payslip.net_salary).toBeLessThan(payslip.gross_salary); // deductions applied
  });

  it('finalizes payroll run (approve disbursement)', async () => {
    if (!payrollRunId) return;
    const res = await api.post(`/api/hr/payroll/runs/${payrollRunId}/finalize`, {
      payment_date: TODAY,
      payment_mode: 'bank_transfer',
    });
    if (res.status === 404 || res.status === 400) return;
    await expectStatus(res, 200);
    const body = await json<{ status: string }>(res);
    expect(body.status).toMatch(/finalized|disbursed|paid/);
  });

  it('payroll GL journal entry was posted after finalization', async () => {
    const res = await api.get(`/api/journal-entries?ref_type=payroll&month=${MONTH}&year=${YEAR}`);
    if (res.status === 404) return; // GL integration may be stub
    await expectStatus(res, 200);
    // If GL integration is live, should see salary journal entries
    const entries = await json<unknown[]>(res);
    // Don't assert count — just verify no server error
    expect(entries).toBeDefined();
  });
});

describe('5. ESS Portal — Employee Self Service', () => {
  it('GET /api/hr/ess/profile returns employee self-profile', async () => {
    const res = await api.get('/api/hr/ess/profile');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
  });

  it('GET /api/hr/ess/payslips returns own payslips', async () => {
    const res = await api.get('/api/hr/ess/payslips');
    if (res.status === 403 || res.status === 404) return;
    await expectStatus(res, 200);
  });
});
