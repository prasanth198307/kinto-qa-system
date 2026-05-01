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
    const { name, grade, section, academic_year, teacher_name, capacity } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO classes (tenant_id, name, grade, section, academic_year, teacher_name, capacity)
      VALUES (${tid(req)}, ${name}, ${grade || null}, ${section || null},
              ${academic_year || null}, ${teacher_name || null}, ${capacity || 40})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/classes/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, grade, section, academic_year, teacher_name, capacity } = req.body;
    const rows = await db.execute(sql`
      UPDATE classes SET name=${name}, grade=${grade || null}, section=${section || null},
        academic_year=${academic_year || null}, teacher_name=${teacher_name || null}, capacity=${capacity || 40}
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

// ── Students ─────────────────────────────────────────────────────────────────
router.get("/students", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, c.name as class_name, c.grade, c.section, c.academic_year
      FROM students s LEFT JOIN classes c ON c.id=s.class_id
      WHERE s.tenant_id=${tid(req)} ORDER BY s.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/students", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date } = req.body;
    const code = "STU-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO students (tenant_id, student_code, name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date)
      VALUES (${tid(req)}, ${code}, ${name}, ${dob || null}, ${gender || null},
              ${class_id || null}, ${parent_name || null}, ${parent_phone || null},
              ${email || null}, ${address || null}, ${enrollment_date || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/students/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE students SET name=${name}, dob=${dob || null}, gender=${gender || null},
        class_id=${class_id || null}, parent_name=${parent_name || null},
        parent_phone=${parent_phone || null}, email=${email || null}, address=${address || null},
        enrollment_date=${enrollment_date || null}, status=${status || 'active'}
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

// ── Fee Structures ───────────────────────────────────────────────────────────
router.get("/fee-structures", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT f.*, c.name as class_name FROM fee_structures f
      LEFT JOIN classes c ON c.id=f.class_id
      WHERE f.tenant_id=${tid(req)} AND f.is_active=1 ORDER BY c.name, f.fee_type`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fee-structures", requireAuth, async (req: any, res) => {
  try {
    const { class_id, fee_type, amount, frequency, academic_year, due_day } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO fee_structures (tenant_id, class_id, fee_type, amount, frequency, academic_year, due_day)
      VALUES (${tid(req)}, ${class_id || null}, ${fee_type}, ${amount}, ${frequency || 'monthly'},
              ${academic_year || null}, ${due_day || 10})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/fee-structures/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE fee_structures SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Fee Payments ─────────────────────────────────────────────────────────────
router.get("/fee-payments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT fp.*, s.name as student_name, s.student_code, c.name as class_name
      FROM fee_payments fp
      LEFT JOIN students s ON s.id=fp.student_id
      LEFT JOIN classes c ON c.id=s.class_id
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
      VALUES (${tid(req)}, ${student_id}, ${fee_structure_id || null}, ${receipt},
              ${amount}, ${paid_date}, ${payment_mode || 'cash'}, ${for_month || null}, ${notes || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [students, payments, classes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM students WHERE tenant_id=${tid(req)} AND status='active'`),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) as total FROM fee_payments WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM paid_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM classes WHERE tenant_id=${tid(req)} AND is_active=1`),
    ]);
    res.json({
      totalStudents: Number(students.rows[0]?.count || 0),
      monthlyCollection: Number(payments.rows[0]?.total || 0),
      totalClasses: Number(classes.rows[0]?.count || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
