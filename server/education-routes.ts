import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Classes ──────────────────────────────────────────────────────────────────
router.get("/classes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM classes WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/classes", requireAuth, async (req: any, res) => {
  try {
    const { name, grade, section, academic_year, teacher_name, teacher_id, room_number, max_students, capacity } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO classes (tenant_id, name, grade, section, academic_year, teacher_name, teacher_id, room_number, max_students, capacity)
      VALUES (${tid(req)}, ${name}, ${grade||null}, ${section||null}, ${academic_year||null},
              ${teacher_name||null}, ${teacher_id||null}, ${room_number||null},
              ${max_students||40}, ${capacity||40}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/classes/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, grade, section, academic_year, teacher_name, teacher_id, room_number, max_students, capacity } = req.body;
    const rows = await db.execute(sql`
      UPDATE classes SET name=${name}, grade=${grade||null}, section=${section||null},
        academic_year=${academic_year||null}, teacher_name=${teacher_name||null},
        teacher_id=${teacher_id||null}, room_number=${room_number||null},
        max_students=${max_students||40}, capacity=${capacity||40}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/classes/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE classes SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Teachers ─────────────────────────────────────────────────────────────────
router.get("/teachers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM teachers WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/teachers", requireAuth, async (req: any, res) => {
  try {
    const { name, subject, qualification, phone, email, date_of_joining, salary, status } = req.body;
    const code = "TCH-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO teachers (tenant_id, teacher_code, name, subject, qualification, phone, email, date_of_joining, salary, status)
      VALUES (${tid(req)}, ${code}, ${name}, ${subject||null}, ${qualification||null},
              ${phone||null}, ${email||null}, ${date_of_joining||null}, ${salary||0}, ${status||'active'})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/teachers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, subject, qualification, phone, email, date_of_joining, salary, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE teachers SET name=${name}, subject=${subject||null}, qualification=${qualification||null},
        phone=${phone||null}, email=${email||null}, date_of_joining=${date_of_joining||null},
        salary=${salary||0}, status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/teachers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE teachers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Students ─────────────────────────────────────────────────────────────────
router.get("/students", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, c.name as class_name, c.grade, c.section, c.academic_year
      FROM students s LEFT JOIN classes c ON c.id::text=s.class_id::text
      WHERE s.tenant_id=${tid(req)} ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/students", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date } = req.body;
    const code = "STU-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO students (tenant_id, student_code, name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date)
      VALUES (${tid(req)}, ${code}, ${name}, ${dob||null}, ${gender||null},
              ${class_id||null}, ${parent_name||null}, ${parent_phone||null},
              ${email||null}, ${address||null}, ${enrollment_date||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/students/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE students SET name=${name}, dob=${dob||null}, gender=${gender||null},
        class_id=${class_id||null}, parent_name=${parent_name||null},
        parent_phone=${parent_phone||null}, email=${email||null},
        address=${address||null}, enrollment_date=${enrollment_date||null},
        status=${status||'active'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/students/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE students SET status='inactive' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Attendance ───────────────────────────────────────────────────────────────
router.get("/attendance", requireAuth, async (req: any, res) => {
  try {
    const { date, class_id } = req.query;
    let q = `SELECT sa.*, s.name as student_name, s.student_code, c.name as class_name
      FROM student_attendance sa
      LEFT JOIN students s ON s.id::text=sa.student_id::text
      LEFT JOIN classes c ON c.id::text=sa.class_id::text
      WHERE sa.tenant_id='${tid(req)}'`;
    if (date) q += ` AND sa.attendance_date='${date}'`;
    if (class_id) q += ` AND sa.class_id='${class_id}'`;
    q += ' ORDER BY sa.attendance_date DESC, s.name';
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/attendance", requireAuth, async (req: any, res) => {
  try {
    const { student_id, class_id, attendance_date, status, remarks } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO student_attendance (tenant_id, student_id, class_id, attendance_date, status, remarks)
      VALUES (${Number(tid(req))}, ${student_id}, ${class_id||null}, ${attendance_date}, ${status||'present'}, ${remarks||null})
      ON CONFLICT (tenant_id, student_id, attendance_date) DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/attendance/bulk", requireAuth, async (req: any, res) => {
  try {
    const { class_id, attendance_date, records } = req.body;
    for (const r of records) {
      await db.execute(sql`
        INSERT INTO student_attendance (tenant_id, student_id, class_id, attendance_date, status, remarks)
        VALUES (${Number(tid(req))}, ${r.student_id}, ${class_id||null}, ${attendance_date}, ${r.status||'present'}, ${r.remarks||null})
        ON CONFLICT (tenant_id, student_id, attendance_date) DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks`);
    }
    res.json({ success: true, count: records.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Examinations ─────────────────────────────────────────────────────────────
router.get("/examinations", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT e.*, c.name as class_name, c.grade, c.section
      FROM examinations e LEFT JOIN classes c ON c.id::text=e.class_id::text
      WHERE e.tenant_id=${tid(req)} AND e.record_status=1 ORDER BY e.exam_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/examinations", requireAuth, async (req: any, res) => {
  try {
    const { class_id, exam_name, subject, exam_date, max_marks, pass_marks, academic_year } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO examinations (tenant_id, class_id, exam_name, subject, exam_date, max_marks, pass_marks, academic_year)
      VALUES (${tid(req)}, ${class_id||null}, ${exam_name}, ${subject}, ${exam_date||null},
              ${max_marks||100}, ${pass_marks||35}, ${academic_year||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/examinations/:id", requireAuth, async (req: any, res) => {
  try {
    const { class_id, exam_name, subject, exam_date, max_marks, pass_marks, academic_year } = req.body;
    const rows = await db.execute(sql`
      UPDATE examinations SET class_id=${class_id||null}, exam_name=${exam_name}, subject=${subject},
        exam_date=${exam_date||null}, max_marks=${max_marks||100}, pass_marks=${pass_marks||35},
        academic_year=${academic_year||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/examinations/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE examinations SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Exam Marks ────────────────────────────────────────────────────────────────
router.get("/exam-marks/:examinationId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT em.*, s.name as student_name, s.student_code
      FROM exam_marks em LEFT JOIN students s ON s.id::text=em.student_id::text
      WHERE em.examination_id=${req.params.examinationId} ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/exam-marks/bulk", requireAuth, async (req: any, res) => {
  try {
    const { examination_id, marks } = req.body;
    for (const m of marks) {
      const grade = m.marks_obtained >= 90 ? 'A+' : m.marks_obtained >= 75 ? 'A' : m.marks_obtained >= 60 ? 'B' : m.marks_obtained >= 45 ? 'C' : m.marks_obtained >= 35 ? 'D' : 'F';
      await db.execute(sql`
        INSERT INTO exam_marks (examination_id, student_id, marks_obtained, grade, remarks)
        VALUES (${examination_id}, ${m.student_id}, ${m.marks_obtained||0}, ${grade}, ${m.remarks||null})
        ON CONFLICT (examination_id, student_id) DO UPDATE SET marks_obtained=EXCLUDED.marks_obtained, grade=EXCLUDED.grade, remarks=EXCLUDED.remarks`);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Library Books ─────────────────────────────────────────────────────────────
router.get("/library-books", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM library_books WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY title`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/library-books", requireAuth, async (req: any, res) => {
  try {
    const { title, author, isbn, category, publisher, total_copies, rack_number } = req.body;
    const code = "BK-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO library_books (tenant_id, book_code, title, author, isbn, category, publisher, total_copies, available_copies, rack_number)
      VALUES (${tid(req)}, ${code}, ${title}, ${author||null}, ${isbn||null}, ${category||null},
              ${publisher||null}, ${total_copies||1}, ${total_copies||1}, ${rack_number||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/library-books/:id", requireAuth, async (req: any, res) => {
  try {
    const { title, author, isbn, category, publisher, total_copies, available_copies, rack_number } = req.body;
    const rows = await db.execute(sql`
      UPDATE library_books SET title=${title}, author=${author||null}, isbn=${isbn||null},
        category=${category||null}, publisher=${publisher||null}, total_copies=${total_copies||1},
        available_copies=${available_copies||0}, rack_number=${rack_number||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/library-books/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE library_books SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Book Issues ───────────────────────────────────────────────────────────────
router.get("/book-issues", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT bi.*, lb.title as book_title, lb.book_code, s.name as student_name_ref, s.student_code as student_code_ref
      FROM book_issues bi
      LEFT JOIN library_books lb ON lb.id=bi.book_id
      LEFT JOIN students s ON s.id::text=bi.student_id::text
      WHERE bi.tenant_id=${tid(req)} ORDER BY bi.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/book-issues", requireAuth, async (req: any, res) => {
  try {
    const { book_id, student_id, student_name, issue_date, due_date } = req.body;
    await db.execute(sql`UPDATE library_books SET available_copies=available_copies-1 WHERE id=${book_id}`);
    const rows = await db.execute(sql`
      INSERT INTO book_issues (tenant_id, book_id, student_id, student_name, issue_date, due_date, status)
      VALUES (${tid(req)}, ${book_id}, ${student_id||null}, ${student_name||null},
              ${issue_date}, ${due_date||null}, 'issued') RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/book-issues/:id/return", requireAuth, async (req: any, res) => {
  try {
    const { return_date, fine_amount } = req.body;
    const issue = await db.execute(sql`SELECT * FROM book_issues WHERE id=${req.params.id}`);
    if (issue.rows[0]) {
      await db.execute(sql`UPDATE library_books SET available_copies=available_copies+1 WHERE id=${issue.rows[0].book_id}`);
    }
    const rows = await db.execute(sql`
      UPDATE book_issues SET return_date=${return_date}, fine_amount=${fine_amount||0}, status='returned'
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Fee Structures ────────────────────────────────────────────────────────────
router.get("/fee-structures", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT f.*, c.name as class_name FROM fee_structures f
      LEFT JOIN classes c ON c.id::text=f.class_id::text
      WHERE f.tenant_id=${tid(req)} AND f.is_active=1 ORDER BY c.name, f.fee_type`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fee-structures", requireAuth, async (req: any, res) => {
  try {
    const { class_id, fee_type, amount, frequency, academic_year, due_day } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO fee_structures (tenant_id, class_id, fee_type, amount, frequency, academic_year, due_day)
      VALUES (${tid(req)}, ${class_id||null}, ${fee_type}, ${amount}, ${frequency||'monthly'},
              ${academic_year||null}, ${due_day||10}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/fee-structures/:id", requireAuth, async (req: any, res) => {
  try {
    const { class_id, fee_type, amount, frequency, academic_year, due_day } = req.body;
    const rows = await db.execute(sql`
      UPDATE fee_structures SET class_id=${class_id||null}, fee_type=${fee_type}, amount=${amount},
        frequency=${frequency||'monthly'}, academic_year=${academic_year||null}, due_day=${due_day||10}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/fee-structures/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE fee_structures SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Fee Payments ──────────────────────────────────────────────────────────────
router.get("/fee-payments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT fp.*, s.name as student_name, s.student_code, c.name as class_name
      FROM fee_payments fp
      LEFT JOIN students s ON s.id::text=fp.student_id::text
      LEFT JOIN classes c ON c.id::text=s.class_id::text
      WHERE fp.tenant_id=${tid(req)} ORDER BY fp.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fee-payments", requireAuth, async (req: any, res) => {
  try {
    const { student_id, fee_structure_id, amount, paid_date, payment_mode, for_month, notes } = req.body;
    const receipt = "RCP-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO fee_payments (tenant_id, student_id, fee_structure_id, receipt_no, amount, paid_date, payment_mode, for_month, notes)
      VALUES (${tid(req)}, ${student_id}, ${fee_structure_id||null}, ${receipt},
              ${amount}, ${paid_date}, ${payment_mode||'cash'}, ${for_month||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [students, teachers, payments, classes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM students WHERE tenant_id=${tid(req)} AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as count FROM teachers WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) as total FROM fee_payments WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM paid_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM classes WHERE tenant_id=${tid(req)} AND is_active=1`),
    ]);
    res.json({
      totalStudents: Number(students.rows[0]?.count||0),
      totalTeachers: Number(teachers.rows[0]?.count||0),
      monthlyCollection: Number(payments.rows[0]?.total||0),
      totalClasses: Number(classes.rows[0]?.count||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
