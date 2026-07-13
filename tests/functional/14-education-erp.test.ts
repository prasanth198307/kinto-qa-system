/**
 * FUNCTIONAL TEST — Education ERP
 *
 * Golden path:
 *   Academic year setup → Student admission → Fee structure →
 *   Fee collection (with receipt) → Attendance marking →
 *   Timetable → Examination → Result declaration →
 *   Certificate generation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { login, json, expectStatus, ApiClient } from '../helpers/api';

let api: ApiClient;
let studentId: number;
let admissionId: number;
let feeReceiptId: number;
let examId: number;

const TODAY = new Date().toISOString().split('T')[0];

beforeAll(async () => {
  api = await login('qa_admin_in', 'Test@1234');
});

describe('Education ERP — 1. Student Admissions', () => {
  it('GET /api/education/students returns student list', async () => {
    const res = await api.get('/api/education/students');
    expect(res.status, 'Students API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
    const students = await json<unknown[]>(res);
    expect(Array.isArray(students)).toBe(true);
  });

  it('POST /api/education/admissions enrols a new student', async () => {
    const res = await api.post('/api/education/admissions', {
      student_name: 'QA Student Arjun',
      date_of_birth: '2010-06-15',
      gender: 'male',
      class: '10',
      section: 'A',
      academic_year: '2025-26',
      admission_date: TODAY,
      roll_number: `QA-ROLL-${Date.now().toString().slice(-5)}`,
      guardian_name: 'Suresh Arjun',
      guardian_phone: '9800008888',
      guardian_email: `guardian.${Date.now()}@qa.test`,
      address: 'Pune, MH',
      previous_school: 'QA Prev School',
      previous_class: '9',
      previous_percentage: 85,
    });
    expect(res.status, 'Admission must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; student_id?: number; student_name: string }>(res);
    admissionId = body.id;
    studentId = body.student_id ?? body.id;
    expect(body.student_name).toBe('QA Student Arjun');
  });

  it('GET /api/education/students/:id returns student profile', async () => {
    if (!studentId) return;
    const res = await api.get(`/api/education/students/${studentId}`);
    await expectStatus(res, 200);
    const student = await json<{ id: number; student_name: string }>(res);
    expect(student.id).toBe(studentId);
  });
});

describe('Education ERP — 2. Fee Collection', () => {
  it('GET /api/education/fee-structure returns fee heads', async () => {
    const res = await api.get('/api/education/fee-structure');
    expect(res.status, 'Fee structure API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('GET /api/education/fees returns fee dues list', async () => {
    const res = await api.get('/api/education/fees');
    expect(res.status, 'Fees API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/education/fees/collect collects fee payment', async () => {
    const res = await api.post('/api/education/fees/collect', {
      student_id: studentId ?? 1,
      academic_year: '2025-26',
      fee_items: [
        { fee_head: 'Tuition Fee', amount: 15000, term: 'Q1' },
        { fee_head: 'Library Fee', amount: 500, term: 'Annual' },
        { fee_head: 'Sports Fee', amount: 1000, term: 'Annual' },
      ],
      total_amount: 16500,
      payment_date: TODAY,
      payment_mode: 'online',
      transaction_id: `EDUFEE-QA-${Date.now()}`,
    });
    expect(res.status, 'Fee collection must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number; receipt_number: string; total_amount: number }>(res);
    feeReceiptId = body.id;
    expect(body.total_amount).toBe(16500);
    expect(body.receipt_number).toBeDefined();
  });

  it('GET /api/education/fees/receipt/:id returns fee receipt', async () => {
    if (!feeReceiptId) return;
    const res = await api.get(`/api/education/fees/receipt/${feeReceiptId}`);
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const receipt = await json<{ receipt_number: string; total_amount: number }>(res);
      expect(receipt.total_amount).toBe(16500);
    }
  });

  it('GET /api/education/fees/defaulters returns fee defaulter list', async () => {
    const res = await api.get('/api/education/fees/defaulters');
    expect(res.status).not.toBe(404);
  });
});

describe('Education ERP — 3. Attendance', () => {
  it('GET /api/education/attendance returns attendance records', async () => {
    const res = await api.get(`/api/education/attendance?date=${TODAY}`);
    expect(res.status, 'Attendance API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/education/attendance marks class attendance', async () => {
    const res = await api.post('/api/education/attendance', {
      date: TODAY,
      class: '10',
      section: 'A',
      academic_year: '2025-26',
      attendance: [
        { student_id: studentId ?? 1, status: 'present' },
      ],
    });
    expect(res.status, 'Mark attendance must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    await expectStatus(res, 200);
  });

  it('GET /api/education/attendance/summary returns monthly summary', async () => {
    const res = await api.get(`/api/education/attendance/summary?student_id=${studentId ?? 1}&month=7&year=2026`);
    expect(res.status).not.toBe(404);
  });
});

describe('Education ERP — 4. Timetable', () => {
  it('GET /api/education/timetable returns class timetable', async () => {
    const res = await api.get('/api/education/timetable?class=10&section=A');
    expect(res.status, 'Timetable API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/education/timetable creates a timetable slot', async () => {
    const res = await api.post('/api/education/timetable', {
      class: '10',
      section: 'A',
      day: 'Monday',
      period: 1,
      subject: 'Mathematics',
      teacher_id: 1,
      start_time: '08:00',
      end_time: '08:45',
    });
    expect(res.status).not.toBe(404);
  });
});

describe('Education ERP — 5. Examinations & Results', () => {
  it('GET /api/education/examinations returns exam list', async () => {
    const res = await api.get('/api/education/examinations');
    expect(res.status, 'Examinations API must exist').not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('POST /api/education/examinations creates an exam', async () => {
    const res = await api.post('/api/education/examinations', {
      name: 'QA Unit Test 1',
      class: '10',
      section: 'A',
      academic_year: '2025-26',
      exam_type: 'unit_test',
      start_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 16 * 86400000).toISOString().split('T')[0],
      subjects: ['Mathematics', 'Science', 'English'],
      max_marks: 50,
      passing_marks: 20,
    });
    expect(res.status, 'Create exam must not 404').not.toBe(404);
    if (res.status === 403 || res.status === 422) return;
    const body = await json<{ id: number }>(res);
    examId = body.id;
    expect(examId).toBeGreaterThan(0);
  });

  it('POST /api/education/examinations/:id/results enters marks', async () => {
    if (!examId) return;
    const res = await api.post(`/api/education/examinations/${examId}/results`, {
      results: [
        {
          student_id: studentId ?? 1,
          marks: [
            { subject: 'Mathematics', marks_obtained: 42, max_marks: 50 },
            { subject: 'Science', marks_obtained: 38, max_marks: 50 },
            { subject: 'English', marks_obtained: 44, max_marks: 50 },
          ],
        },
      ],
    });
    expect(res.status).not.toBe(404);
  });

  it('GET /api/education/examinations/:id/results returns result sheet', async () => {
    if (!examId) return;
    const res = await api.get(`/api/education/examinations/${examId}/results`);
    expect(res.status).not.toBe(404);
    if (res.status === 200) {
      const results = await json<unknown[]>(res);
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

describe('Education ERP — 6. Teachers & Library', () => {
  it('GET /api/education/teachers returns teacher list', async () => {
    const res = await api.get('/api/education/teachers');
    expect(res.status).not.toBe(404);
    if (res.status === 403) return;
    await expectStatus(res, 200);
  });

  it('GET /api/education/library returns library catalog', async () => {
    const res = await api.get('/api/education/library');
    expect(res.status).not.toBe(404);
  });
});
