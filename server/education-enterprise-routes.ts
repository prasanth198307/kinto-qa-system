import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ── Admission Inquiries ───────────────────────────────────────────────────────

router.get("/inquiries", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM admission_inquiries WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/inquiries", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_name, parent_name, phone, email, class_applying, source, notes } = req.body;
    const r = await db.execute(sql`
      INSERT INTO admission_inquiries (tenant_id, student_name, parent_name, phone, email, class_applying, source, notes, status, created_at)
      VALUES (${tid}, ${student_name}, ${parent_name}, ${phone}, ${email}, ${class_applying}, ${source}, ${notes}, 'new', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/inquiries/:id/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { status } = req.body;
    const r = await db.execute(sql`
      UPDATE admission_inquiries SET status=${status}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admission Applications ────────────────────────────────────────────────────

router.get("/applications", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM admission_applications WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/applications", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { inquiry_id, student_name, parent_name, phone, email, dob, gender, class_applying, previous_school, address, documents } = req.body;
    const r = await db.execute(sql`
      INSERT INTO admission_applications (tenant_id, inquiry_id, student_name, parent_name, phone, email, dob, gender, class_applying, previous_school, address, documents, status, created_at)
      VALUES (${tid}, ${inquiry_id}, ${student_name}, ${parent_name}, ${phone}, ${email}, ${dob}, ${gender}, ${class_applying}, ${previous_school}, ${address}, ${JSON.stringify(documents)}, 'pending', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/applications/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM admission_applications WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Entrance Tests ────────────────────────────────────────────────────────────

router.post("/entrance-tests", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, test_date, class_applying, venue, total_marks, passing_marks } = req.body;
    const r = await db.execute(sql`
      INSERT INTO entrance_tests (tenant_id, name, test_date, class_applying, venue, total_marks, passing_marks, created_at)
      VALUES (${tid}, ${name}, ${test_date}, ${class_applying}, ${venue}, ${total_marks}, ${passing_marks}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/entrance-tests", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM entrance_tests WHERE tenant_id=${tid} ORDER BY test_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/entrance-tests/:id/results", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const results: { application_id: number; marks_obtained: number; status: string }[] = req.body;
    const inserted = [];
    for (const result of results) {
      const r = await db.execute(sql`
        INSERT INTO entrance_test_results (tenant_id, test_id, application_id, marks_obtained, status, created_at)
        VALUES (${tid}, ${req.params.id}, ${result.application_id}, ${result.marks_obtained}, ${result.status}, NOW())
        ON CONFLICT (test_id, application_id) DO UPDATE SET marks_obtained=${result.marks_obtained}, status=${result.status}, updated_at=NOW()
        RETURNING *`);
      inserted.push(r.rows[0]);
    }
    res.json(inserted);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Enroll Application → Student ──────────────────────────────────────────────

router.post("/applications/:id/enroll", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const app = await db.execute(sql`SELECT * FROM admission_applications WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!app.rows[0]) return res.status(404).json({ message: "Application not found" });
    const a: any = app.rows[0];
    const r = await db.execute(sql`
      INSERT INTO students (tenant_id, application_id, student_name, parent_name, phone, email, dob, gender, class_id, address, admission_date, status, created_at)
      VALUES (${tid}, ${a.id}, ${a.student_name}, ${a.parent_name}, ${a.phone}, ${a.email}, ${a.dob}, ${a.gender}, ${a.class_applying}, ${a.address}, NOW(), 'active', NOW())
      RETURNING id`);
    await db.execute(sql`UPDATE admission_applications SET status='enrolled', updated_at=NOW() WHERE id=${req.params.id}`);
    res.json({ success: true, student_id: r.rows[0].id });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Parent Portal ─────────────────────────────────────────────────────────────

router.get("/parent/student/:studentId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const student = await db.execute(sql`
      SELECT s.*, c.name as class_name FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id=${req.params.studentId} AND s.tenant_id=${tid}`);
    if (!student.rows[0]) return res.status(404).json({ message: "Student not found" });

    const attendance = await db.execute(sql`
      SELECT
        COUNT(*) as total_days,
        SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent_days
      FROM student_attendance
      WHERE student_id=${req.params.studentId} AND tenant_id=${tid}`);

    const marks = await db.execute(sql`
      SELECT em.*, sub.name as subject_name FROM exam_marks em
      LEFT JOIN subjects sub ON sub.id = em.subject_id
      WHERE em.student_id=${req.params.studentId} AND em.tenant_id=${tid}
      ORDER BY em.created_at DESC LIMIT 10`);

    res.json({ student: student.rows[0], attendance: attendance.rows[0], recent_marks: marks.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/parent/fees/:studentId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT fp.*, 'paid' as ledger_status FROM fee_payments fp
      WHERE fp.student_id=${req.params.studentId} AND fp.tenant_id=${tid}
      ORDER BY fp.payment_date DESC`);
    const pending = await db.execute(sql`
      SELECT fd.* FROM fee_demands fd
      WHERE fd.student_id=${req.params.studentId} AND fd.tenant_id=${tid} AND fd.paid_amount < fd.amount
      ORDER BY fd.due_date ASC`);
    res.json({ payments: r.rows, pending: pending.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/parent/fee-payment", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_id, amount, payment_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO fee_payments (tenant_id, student_id, amount, payment_id, payment_date, created_at)
      VALUES (${tid}, ${student_id}, ${amount}, ${payment_id}, NOW(), NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Assignments ───────────────────────────────────────────────────────────────

router.get("/assignments", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM assignments WHERE tenant_id=${tid} ORDER BY due_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/assignments", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { title, description, class_id, subject_id, due_date, total_marks } = req.body;
    const r = await db.execute(sql`
      INSERT INTO assignments (tenant_id, title, description, class_id, subject_id, due_date, total_marks, created_at)
      VALUES (${tid}, ${title}, ${description}, ${class_id}, ${subject_id}, ${due_date}, ${total_marks}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/assignments/:classId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM assignments WHERE class_id=${req.params.classId} AND tenant_id=${tid} ORDER BY due_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/assignments/:id/submissions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_id, submission_text } = req.body;
    const r = await db.execute(sql`
      INSERT INTO assignment_submissions (tenant_id, assignment_id, student_id, submission_text, submitted_at, created_at)
      VALUES (${tid}, ${req.params.id}, ${student_id}, ${submission_text}, NOW(), NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/assignments/:id/grade", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { submission_id, marks_obtained, teacher_remarks } = req.body;
    const r = await db.execute(sql`
      UPDATE assignment_submissions
      SET marks_obtained=${marks_obtained}, teacher_remarks=${teacher_remarks}, graded_at=NOW(), updated_at=NOW()
      WHERE id=${submission_id} AND assignment_id=${req.params.id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Online Exams ──────────────────────────────────────────────────────────────

router.get("/online-exams", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM online_exams WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/online-exams", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { title, class_id, subject_id, duration_minutes, total_marks, start_time, end_time } = req.body;
    const r = await db.execute(sql`
      INSERT INTO online_exams (tenant_id, title, class_id, subject_id, duration_minutes, total_marks, start_time, end_time, created_at)
      VALUES (${tid}, ${title}, ${class_id}, ${subject_id}, ${duration_minutes}, ${total_marks}, ${start_time}, ${end_time}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/online-exams/:id/questions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const questions: { question_text: string; question_type: string; options: any; correct_answer: string; marks: number }[] = req.body;
    const inserted = [];
    for (const q of questions) {
      const r = await db.execute(sql`
        INSERT INTO exam_questions (tenant_id, exam_id, question_text, question_type, options, correct_answer, marks, created_at)
        VALUES (${tid}, ${req.params.id}, ${q.question_text}, ${q.question_type}, ${JSON.stringify(q.options)}, ${q.correct_answer}, ${q.marks}, NOW())
        RETURNING *`);
      inserted.push(r.rows[0]);
    }
    res.json(inserted);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/online-exams/:id/start", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const exam = await db.execute(sql`SELECT * FROM online_exams WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!exam.rows[0]) return res.status(404).json({ message: "Exam not found" });
    const questions = await db.execute(sql`
      SELECT id, question_text, question_type, options, marks FROM exam_questions
      WHERE exam_id=${req.params.id} AND tenant_id=${tid}`);
    const shuffled = questions.rows.sort(() => Math.random() - 0.5);
    res.json({ exam: exam.rows[0], questions: shuffled });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/online-exams/:id/submit", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_id, answers } = req.body as { student_id: number; answers: Record<string, string> };
    const questions = await db.execute(sql`
      SELECT id, correct_answer, marks, question_type FROM exam_questions WHERE exam_id=${req.params.id} AND tenant_id=${tid}`);
    let marks_obtained = 0;
    let total_marks = 0;
    for (const q of questions.rows as any[]) {
      total_marks += q.marks;
      if (q.question_type === 'mcq' && answers[q.id] && answers[q.id] === q.correct_answer) {
        marks_obtained += q.marks;
      }
    }
    const percentage = total_marks > 0 ? (marks_obtained / total_marks) * 100 : 0;
    const r = await db.execute(sql`
      INSERT INTO exam_attempts (tenant_id, exam_id, student_id, answers, marks_obtained, total_marks, percentage, submitted_at, created_at)
      VALUES (${tid}, ${req.params.id}, ${student_id}, ${JSON.stringify(answers)}, ${marks_obtained}, ${total_marks}, ${percentage}, NOW(), NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Circulars ─────────────────────────────────────────────────────────────────

router.get("/circulars", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM school_circulars WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/circulars", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { title, content, target_audience, publish_date } = req.body;
    const r = await db.execute(sql`
      INSERT INTO school_circulars (tenant_id, title, content, target_audience, publish_date, created_at)
      VALUES (${tid}, ${title}, ${content}, ${target_audience}, ${publish_date}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Hostel ────────────────────────────────────────────────────────────────────

router.get("/hostel/rooms", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hostel_rooms WHERE tenant_id=${tid} ORDER BY room_number`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hostel/rooms", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { room_number, room_type, capacity, floor, block } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hostel_rooms (tenant_id, room_number, room_type, capacity, floor, block, status, created_at)
      VALUES (${tid}, ${room_number}, ${room_type}, ${capacity}, ${floor}, ${block}, 'available', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hostel/allot", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_id, room_id, monthly_charge } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hostel_allotments (tenant_id, student_id, room_id, monthly_charge, allotment_date, status, created_at)
      VALUES (${tid}, ${student_id}, ${room_id}, ${monthly_charge}, NOW(), 'active', NOW())
      RETURNING *`);
    await db.execute(sql`UPDATE hostel_rooms SET status='occupied', updated_at=NOW() WHERE id=${room_id} AND tenant_id=${tid}`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/hostel/allotments", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ha.*, s.student_name, hr.room_number, hr.room_type, hr.block
      FROM hostel_allotments ha
      LEFT JOIN students s ON s.id = ha.student_id
      LEFT JOIN hostel_rooms hr ON hr.id = ha.room_id
      WHERE ha.tenant_id=${tid} ORDER BY ha.allotment_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Alumni ────────────────────────────────────────────────────────────────────

router.get("/alumni", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM alumni WHERE tenant_id=${tid} ORDER BY passing_year DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/alumni", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_name, passing_year, current_occupation, company, location, phone, email } = req.body;
    const r = await db.execute(sql`
      INSERT INTO alumni (tenant_id, student_name, passing_year, current_occupation, company, location, phone, email, created_at)
      VALUES (${tid}, ${student_name}, ${passing_year}, ${current_occupation}, ${company}, ${location}, ${phone}, ${email}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/alumni/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { student_name, passing_year, current_occupation, company, location, phone, email } = req.body;
    const r = await db.execute(sql`
      UPDATE alumni SET student_name=${student_name}, passing_year=${passing_year}, current_occupation=${current_occupation},
        company=${company}, location=${location}, phone=${phone}, email=${email}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Events ────────────────────────────────────────────────────────────────────

router.get("/events", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM school_events WHERE tenant_id=${tid} ORDER BY event_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/events", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { title, description, event_date, event_type, venue } = req.body;
    const r = await db.execute(sql`
      INSERT INTO school_events (tenant_id, title, description, event_date, event_type, venue, created_at)
      VALUES (${tid}, ${title}, ${description}, ${event_date}, ${event_type}, ${venue}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Substitutions ─────────────────────────────────────────────────────────────

router.get("/substitutions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ts.*, t1.name as absent_teacher_name, t2.name as substitute_teacher_name
      FROM teacher_substitutions ts
      LEFT JOIN teachers t1 ON t1.id = ts.absent_teacher_id
      LEFT JOIN teachers t2 ON t2.id = ts.substitute_teacher_id
      WHERE ts.tenant_id=${tid} ORDER BY ts.substitution_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/substitutions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { absent_teacher_id, substitute_teacher_id, class_id, subject_id, period, substitution_date, reason } = req.body;
    const r = await db.execute(sql`
      INSERT INTO teacher_substitutions (tenant_id, absent_teacher_id, substitute_teacher_id, class_id, subject_id, period, substitution_date, reason, created_at)
      VALUES (${tid}, ${absent_teacher_id}, ${substitute_teacher_id}, ${class_id}, ${subject_id}, ${period}, ${substitution_date}, ${reason}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Certificates ──────────────────────────────────────────────────────────────

router.get("/students/:id/tc", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT s.*, c.name as class_name, s.admission_date, NOW() as tc_date
      FROM students s LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id=${req.params.id} AND s.tenant_id=${tid}`);
    if (!r.rows[0]) return res.status(404).json({ message: "Student not found" });
    const student: any = r.rows[0];
    res.json({ student, class: student.class_name, admission_date: student.admission_date, tc_date: student.tc_date });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/students/:id/bonafide", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT s.*, c.name as class_name FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id=${req.params.id} AND s.tenant_id=${tid}`);
    if (!r.rows[0]) return res.status(404).json({ message: "Student not found" });
    const student: any = r.rows[0];
    const year = new Date().getFullYear();
    res.json({ student, studying_class: student.class_name, academic_year: `${year}-${year + 1}` });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/students/:id/id-card", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT s.*, c.name as class_name FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id=${req.params.id} AND s.tenant_id=${tid}`);
    if (!r.rows[0]) return res.status(404).json({ message: "Student not found" });
    const student: any = r.rows[0];
    const year = new Date().getFullYear();
    res.json({ student, class: student.class_name, photo_url: student.photo_url, valid_year: `${year}-${year + 1}` });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/admission-funnel", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT status, COUNT(*) as count FROM admission_inquiries WHERE tenant_id=${tid} GROUP BY status`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/attendance-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        s.student_name,
        s.id as student_id,
        c.name as class_name,
        COUNT(sa.id) as total_days,
        SUM(CASE WHEN sa.status='present' THEN 1 ELSE 0 END) as present_days,
        ROUND(SUM(CASE WHEN sa.status='present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(sa.id), 0), 2) as attendance_pct
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN student_attendance sa ON sa.student_id = s.id
      WHERE s.tenant_id=${tid}
      GROUP BY s.id, s.student_name, c.name
      ORDER BY attendance_pct ASC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/fee-collection", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from_date, to_date } = req.query;
    const r = await db.execute(sql`
      SELECT
        SUM(amount) as total_collected,
        COUNT(*) as payment_count
      FROM fee_payments
      WHERE tenant_id=${tid}
        AND (${from_date}::date IS NULL OR payment_date >= ${from_date}::date)
        AND (${to_date}::date IS NULL OR payment_date <= ${to_date}::date)`);
    const pending = await db.execute(sql`
      SELECT SUM(amount - paid_amount) as total_pending FROM fee_demands WHERE tenant_id=${tid} AND paid_amount < amount`);
    res.json({ collected: r.rows[0], pending: pending.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/fee-defaulters", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT s.student_name, s.id as student_id, c.name as class_name,
        SUM(fd.amount - fd.paid_amount) as pending_amount
      FROM fee_demands fd
      JOIN students s ON s.id = fd.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE fd.tenant_id=${tid} AND fd.paid_amount < fd.amount
      GROUP BY s.id, s.student_name, c.name
      HAVING SUM(fd.amount - fd.paid_amount) > 0
      ORDER BY pending_amount DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/exam-results", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ea.*, oe.title as exam_title, s.student_name
      FROM exam_attempts ea
      JOIN online_exams oe ON oe.id = ea.exam_id
      JOIN students s ON s.id = ea.student_id
      WHERE ea.tenant_id=${tid} ORDER BY ea.submitted_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/class-performance", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT c.name as class_name, c.id as class_id,
        ROUND(AVG(ea.percentage), 2) as avg_percentage,
        COUNT(DISTINCT ea.student_id) as student_count,
        COUNT(ea.id) as total_attempts
      FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE ea.tenant_id=${tid}
      GROUP BY c.id, c.name ORDER BY avg_percentage DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/teacher-performance", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT t.id as teacher_id, t.name as teacher_name,
        COUNT(DISTINCT a.id) as assignments_created,
        COUNT(DISTINCT oe.id) as exams_created,
        COUNT(DISTINCT ts.id) as substitutions_covered
      FROM teachers t
      LEFT JOIN assignments a ON a.teacher_id = t.id AND a.tenant_id=${tid}
      LEFT JOIN online_exams oe ON oe.teacher_id = t.id AND oe.tenant_id=${tid}
      LEFT JOIN teacher_substitutions ts ON ts.substitute_teacher_id = t.id AND ts.tenant_id=${tid}
      WHERE t.tenant_id=${tid}
      GROUP BY t.id, t.name ORDER BY t.name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
