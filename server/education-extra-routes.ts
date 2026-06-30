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

// ─── BIOMETRIC ATTENDANCE ────────────────────────────────────────────────────

router.get("/biometric/devices", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM biometric_devices WHERE tenant_id = ${tenantId} ORDER BY location, device_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/biometric/devices", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { device_name, device_type, ip_address, location } = req.body;
    const r = await db.execute(sql`
      INSERT INTO biometric_devices (tenant_id, device_name, device_type, ip_address, location, status, created_at)
      VALUES (${tenantId}, ${device_name}, ${device_type}, ${ip_address}, ${location}, 'active', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/biometric/sync", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { device_id, records } = req.body;
    let processed = 0;
    let skipped = 0;
    for (const record of records ?? []) {
      const { employee_id, punch_time, punch_type } = record;
      // Insert log record
      const existing = await db.execute(sql`
        SELECT id FROM biometric_attendance_logs
        WHERE tenant_id = ${tenantId} AND employee_id = ${employee_id}
          AND punch_time = ${punch_time} AND device_id = ${device_id}
      `);
      if (existing.rows.length > 0) { skipped++; continue; }
      await db.execute(sql`
        INSERT INTO biometric_attendance_logs
          (tenant_id, device_id, employee_id, punch_time, punch_type, synced_at)
        VALUES (${tenantId}, ${device_id}, ${employee_id}, ${punch_time}, ${punch_type}, NOW())
      `);
      // Update or create attendance record for that date
      const punchDate = new Date(punch_time).toISOString().split("T")[0];
      if (punch_type === "IN") {
        await db.execute(sql`
          INSERT INTO staff_attendance (tenant_id, employee_id, date, check_in, source)
          VALUES (${tenantId}, ${employee_id}, ${punchDate}, ${punch_time}, 'biometric')
          ON CONFLICT (tenant_id, employee_id, date)
          DO UPDATE SET check_in = EXCLUDED.check_in, source = 'biometric'
        `);
      } else if (punch_type === "OUT") {
        await db.execute(sql`
          INSERT INTO staff_attendance (tenant_id, employee_id, date, check_out, source)
          VALUES (${tenantId}, ${employee_id}, ${punchDate}, ${punch_time}, 'biometric')
          ON CONFLICT (tenant_id, employee_id, date)
          DO UPDATE SET check_out = EXCLUDED.check_out, source = 'biometric'
        `);
      }
      processed++;
    }
    res.json({ success: true, processed, skipped, total: (records ?? []).length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/biometric/attendance/:date", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { date } = req.params;
    const r = await db.execute(sql`
      SELECT sa.*, e.name AS employee_name, e.department, e.designation
      FROM staff_attendance sa
      LEFT JOIN employees e ON e.id = sa.employee_id AND e.tenant_id = sa.tenant_id
      WHERE sa.tenant_id = ${tenantId} AND sa.date = ${date} AND sa.source = 'biometric'
      ORDER BY e.name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/biometric/attendance/mobile", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { teacher_id, latitude, longitude, date } = req.body;
    // Simple GPS validation: ensure location is not null (real validation would check geofence)
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "GPS location required" });
    }
    // Simulate geofence check (within 500m of school)
    const SCHOOL_LAT = 17.385;
    const SCHOOL_LNG = 78.4867;
    const dist = Math.sqrt(
      Math.pow((latitude - SCHOOL_LAT) * 111000, 2) +
      Math.pow((longitude - SCHOOL_LNG) * 111000 * Math.cos(SCHOOL_LAT * Math.PI / 180), 2)
    );
    const within_geofence = dist <= 500;
    const r = await db.execute(sql`
      INSERT INTO biometric_attendance_logs
        (tenant_id, employee_id, punch_time, punch_type, latitude, longitude, within_geofence, source, synced_at)
      VALUES (${tenantId}, ${teacher_id}, NOW(), 'IN', ${latitude}, ${longitude}, ${within_geofence}, 'mobile', NOW())
      RETURNING *
    `);
    await db.execute(sql`
      INSERT INTO staff_attendance (tenant_id, employee_id, date, check_in, source, latitude, longitude)
      VALUES (${tenantId}, ${teacher_id}, ${date}, NOW(), 'mobile', ${latitude}, ${longitude})
      ON CONFLICT (tenant_id, employee_id, date)
      DO UPDATE SET check_in = NOW(), source = 'mobile', latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude
    `);
    res.json({ ...r.rows[0], within_geofence, distance_meters: Math.round(dist) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── LMS (LEARNING MANAGEMENT SYSTEM) ───────────────────────────────────────

router.get("/lms/content", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT lc.*, s.name AS subject_name, c.name AS class_name
      FROM lms_content lc
      LEFT JOIN subjects s ON s.id = lc.subject_id AND s.tenant_id = lc.tenant_id
      LEFT JOIN classes c ON c.id = lc.class_id AND c.tenant_id = lc.tenant_id
      WHERE lc.tenant_id = ${tenantId}
      ORDER BY lc.class_id, lc.subject_id, lc.chapter, lc.title
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/lms/content", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { title, subject_id, class_id, content_type, url, chapter } = req.body;
    const r = await db.execute(sql`
      INSERT INTO lms_content (tenant_id, title, subject_id, class_id, content_type, url, chapter, created_at)
      VALUES (${tenantId}, ${title}, ${subject_id}, ${class_id}, ${content_type}, ${url}, ${chapter}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/lms/content/:id", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { title, subject_id, class_id, content_type, url, chapter } = req.body;
    const r = await db.execute(sql`
      UPDATE lms_content
      SET title = COALESCE(${title}, title),
          subject_id = COALESCE(${subject_id}, subject_id),
          class_id = COALESCE(${class_id}, class_id),
          content_type = COALESCE(${content_type}, content_type),
          url = COALESCE(${url}, url),
          chapter = COALESCE(${chapter}, chapter),
          updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/lms/content/:id", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await db.execute(sql`DELETE FROM lms_content WHERE id = ${id} AND tenant_id = ${tenantId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/lms/content/:classId/:subjectId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { classId, subjectId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM lms_content
      WHERE tenant_id = ${tenantId} AND class_id = ${classId} AND subject_id = ${subjectId}
      ORDER BY chapter, title
    `);
    // Group by chapter
    const byChapter: Record<string, any[]> = {};
    for (const row of r.rows as any[]) {
      const ch = row.chapter ?? "Uncategorized";
      if (!byChapter[ch]) byChapter[ch] = [];
      byChapter[ch].push(row);
    }
    res.json({ class_id: classId, subject_id: subjectId, chapters: byChapter });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/lms/progress", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { student_id, content_id, progress_pct, completed } = req.body;
    const r = await db.execute(sql`
      INSERT INTO lms_progress (tenant_id, student_id, content_id, progress_pct, completed, updated_at)
      VALUES (${tenantId}, ${student_id}, ${content_id}, ${progress_pct}, ${completed}, NOW())
      ON CONFLICT (tenant_id, student_id, content_id)
      DO UPDATE SET progress_pct = EXCLUDED.progress_pct, completed = EXCLUDED.completed, updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/lms/progress/:studentId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { studentId } = req.params;
    const r = await db.execute(sql`
      SELECT lp.*, lc.title, lc.subject_id, lc.chapter, s.name AS subject_name
      FROM lms_progress lp
      JOIN lms_content lc ON lc.id = lp.content_id
      LEFT JOIN subjects s ON s.id = lc.subject_id AND s.tenant_id = lc.tenant_id
      WHERE lp.tenant_id = ${tenantId} AND lp.student_id = ${studentId}
      ORDER BY lc.subject_id, lc.chapter
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/lms/quiz", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT lq.*, s.name AS subject_name, c.name AS class_name
      FROM lms_quizzes lq
      LEFT JOIN subjects s ON s.id = lq.subject_id AND s.tenant_id = lq.tenant_id
      LEFT JOIN classes c ON c.id = lq.class_id AND c.tenant_id = lq.tenant_id
      WHERE lq.tenant_id = ${tenantId}
      ORDER BY lq.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/lms/quiz", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { title, subject_id, class_id, questions } = req.body;
    const r = await db.execute(sql`
      INSERT INTO lms_quizzes (tenant_id, title, subject_id, class_id, questions, created_at)
      VALUES (${tenantId}, ${title}, ${subject_id}, ${class_id}, ${JSON.stringify(questions)}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/lms/live-classes", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT llc.*, s.name AS subject_name, c.name AS class_name
      FROM lms_live_classes llc
      LEFT JOIN subjects s ON s.id = llc.subject_id AND s.tenant_id = llc.tenant_id
      LEFT JOIN classes c ON c.id = llc.class_id AND c.tenant_id = llc.tenant_id
      WHERE llc.tenant_id = ${tenantId} AND llc.slot_date = CURRENT_DATE
      ORDER BY llc.slot_time
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/lms/live-classes", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { subject_id, class_id, slot_date, slot_time, meet_link } = req.body;
    const r = await db.execute(sql`
      INSERT INTO lms_live_classes (tenant_id, subject_id, class_id, slot_date, slot_time, meet_link, created_at)
      VALUES (${tenantId}, ${subject_id}, ${class_id}, ${slot_date}, ${slot_time}, ${meet_link}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UDISE+ / STATE COMPLIANCE ───────────────────────────────────────────────

router.get("/udise/export", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        s.id, s.name, s.dob, s.gender, s.caste, s.religion,
        s.aadhaar_number, s.mother_tongue, s.admission_no,
        c.name AS class_name, s.section, s.academic_year,
        s.father_name, s.mother_name, s.address, s.phone,
        s.is_rte, s.is_cwsn, s.has_disability
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
      WHERE s.tenant_id = ${tenantId} AND s.status = 'active'
      ORDER BY c.name, s.section, s.name
    `);
    res.json({ format: "UDISE+", total: r.rows.length, students: r.rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/compliance/rte-students", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT rs.*, s.name AS student_name, s.admission_no, c.name AS class_name
      FROM rte_students rs
      JOIN students s ON s.id = rs.student_id AND s.tenant_id = rs.tenant_id
      LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
      WHERE rs.tenant_id = ${tenantId}
      ORDER BY s.name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/compliance/rte-students", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { student_id, rte_category, govt_reimbursement } = req.body;
    const r = await db.execute(sql`
      INSERT INTO rte_students (tenant_id, student_id, rte_category, govt_reimbursement, created_at)
      VALUES (${tenantId}, ${student_id}, ${rte_category}, ${govt_reimbursement}, NOW())
      ON CONFLICT (tenant_id, student_id) DO UPDATE
        SET rte_category = EXCLUDED.rte_category, govt_reimbursement = EXCLUDED.govt_reimbursement
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/compliance/midday-meal", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { date } = req.query as { date?: string };
    const r = await db.execute(sql`
      SELECT mm.*, c.name AS class_name
      FROM midday_meal_records mm
      LEFT JOIN classes c ON c.id = mm.class_id AND c.tenant_id = mm.tenant_id
      WHERE mm.tenant_id = ${tenantId}
        ${date ? sql`AND mm.date = ${date}` : sql``}
      ORDER BY mm.date DESC, c.name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/compliance/midday-meal", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { date, class_id, count } = req.body;
    const r = await db.execute(sql`
      INSERT INTO midday_meal_records (tenant_id, date, class_id, count, created_at)
      VALUES (${tenantId}, ${date}, ${class_id}, ${count}, NOW())
      ON CONFLICT (tenant_id, date, class_id) DO UPDATE SET count = EXCLUDED.count
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/compliance/scholarship", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT sr.*, s.name AS student_name, s.admission_no
      FROM scholarship_records sr
      JOIN students s ON s.id = sr.student_id AND s.tenant_id = sr.tenant_id
      WHERE sr.tenant_id = ${tenantId}
      ORDER BY sr.year DESC, sr.scheme_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/compliance/scholarship", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { student_id, scheme_name, amount, year } = req.body;
    const r = await db.execute(sql`
      INSERT INTO scholarship_records (tenant_id, student_id, scheme_name, amount, year, created_at)
      VALUES (${tenantId}, ${student_id}, ${scheme_name}, ${amount}, ${year}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── FEE MANAGEMENT ENHANCED ─────────────────────────────────────────────────

router.get("/fees/late-fee-config", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM fee_late_config WHERE tenant_id = ${tenantId} LIMIT 1
    `);
    res.json(r.rows[0] ?? { grace_days: 7, late_fee_per_day: 0, max_late_fee: 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/fees/late-fee-config", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { grace_days, late_fee_per_day, max_late_fee } = req.body;
    const r = await db.execute(sql`
      INSERT INTO fee_late_config (tenant_id, grace_days, late_fee_per_day, max_late_fee, updated_at)
      VALUES (${tenantId}, ${grace_days}, ${late_fee_per_day}, ${max_late_fee}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE
        SET grace_days = EXCLUDED.grace_days,
            late_fee_per_day = EXCLUDED.late_fee_per_day,
            max_late_fee = EXCLUDED.max_late_fee,
            updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/fees/with-late-fee", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        fd.*,
        s.name AS student_name,
        flc.grace_days,
        flc.late_fee_per_day,
        flc.max_late_fee,
        GREATEST(0, CURRENT_DATE - fd.due_date - flc.grace_days) AS days_late,
        LEAST(
          GREATEST(0, CURRENT_DATE - fd.due_date - flc.grace_days) * flc.late_fee_per_day,
          flc.max_late_fee
        ) AS late_fee_amount
      FROM fee_dues fd
      JOIN students s ON s.id = fd.student_id AND s.tenant_id = fd.tenant_id
      LEFT JOIN fee_late_config flc ON flc.tenant_id = fd.tenant_id
      WHERE fd.tenant_id = ${tenantId} AND fd.status = 'pending'
      ORDER BY fd.due_date
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/fees/concessions", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT fc.*, s.name AS student_name
      FROM fee_concessions fc
      LEFT JOIN students s ON s.id = fc.student_id AND s.tenant_id = fc.tenant_id
      WHERE fc.tenant_id = ${tenantId}
      ORDER BY fc.category_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/fees/concessions", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { category_name, discount_pct, student_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO fee_concessions (tenant_id, category_name, discount_pct, student_id, created_at)
      VALUES (${tenantId}, ${category_name}, ${discount_pct}, ${student_id}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/fees/demand-notes", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT fdn.*, s.name AS student_name, s.admission_no
      FROM fee_demand_notes fdn
      JOIN students s ON s.id = fdn.student_id AND s.tenant_id = fdn.tenant_id
      WHERE fdn.tenant_id = ${tenantId}
      ORDER BY fdn.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/fees/demand-notes/generate", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { student_ids, period } = req.body;
    const created: any[] = [];
    for (const student_id of student_ids ?? []) {
      const duesR = await db.execute(sql`
        SELECT SUM(amount) AS total_due FROM fee_dues
        WHERE tenant_id = ${tenantId} AND student_id = ${student_id}
          AND period = ${period} AND status = 'pending'
      `);
      const total_due = (duesR.rows[0] as any)?.total_due ?? 0;
      const r = await db.execute(sql`
        INSERT INTO fee_demand_notes (tenant_id, student_id, period, total_due, created_at)
        VALUES (${tenantId}, ${student_id}, ${period}, ${total_due}, NOW())
        RETURNING *
      `);
      created.push(r.rows[0]);
    }
    res.json({ created: created.length, demand_notes: created });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/fees/cheques", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT fc.*, s.name AS student_name
      FROM fee_cheques fc
      JOIN students s ON s.id = fc.student_id AND s.tenant_id = fc.tenant_id
      WHERE fc.tenant_id = ${tenantId}
      ORDER BY fc.due_date DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/fees/cheques", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { student_id, cheque_no, bank, amount, due_date } = req.body;
    const r = await db.execute(sql`
      INSERT INTO fee_cheques (tenant_id, student_id, cheque_no, bank, amount, due_date, status, created_at)
      VALUES (${tenantId}, ${student_id}, ${cheque_no}, ${bank}, ${amount}, ${due_date}, 'pending', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/fees/cheques/:id/bounce", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { bounce_reason, penalty } = req.body;
    const r = await db.execute(sql`
      UPDATE fee_cheques
      SET status = 'bounced', bounce_reason = ${bounce_reason}, penalty = ${penalty}, bounced_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── TRANSPORT ENHANCED ──────────────────────────────────────────────────────

router.get("/transport/routes", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT tr.*, json_agg(ts ORDER BY ts.stop_order) AS stops
      FROM transport_routes tr
      LEFT JOIN transport_stops ts ON ts.route_id = tr.id AND ts.tenant_id = tr.tenant_id
      WHERE tr.tenant_id = ${tenantId}
      GROUP BY tr.id
      ORDER BY tr.route_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/transport/routes", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { route_name, stops } = req.body;
    const routeR = await db.execute(sql`
      INSERT INTO transport_routes (tenant_id, route_name, created_at)
      VALUES (${tenantId}, ${route_name}, NOW())
      RETURNING *
    `);
    const route = routeR.rows[0] as any;
    for (const stop of stops ?? []) {
      await db.execute(sql`
        INSERT INTO transport_stops (tenant_id, route_id, stop_name, stop_time, stop_order)
        VALUES (${tenantId}, ${route.id}, ${stop.stop_name}, ${stop.stop_time}, ${stop.order})
      `);
    }
    res.json({ ...route, stops: stops ?? [] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/transport/buses", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT b.*, tr.route_name,
             e1.name AS driver_name, e2.name AS conductor_name
      FROM buses b
      LEFT JOIN transport_routes tr ON tr.id = b.route_id AND tr.tenant_id = b.tenant_id
      LEFT JOIN employees e1 ON e1.id = b.driver_id
      LEFT JOIN employees e2 ON e2.id = b.conductor_id
      WHERE b.tenant_id = ${tenantId}
      ORDER BY b.bus_number
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/transport/student-route-map", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { student_id, route_id, stop_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO transport_student_map (tenant_id, student_id, route_id, stop_id, created_at)
      VALUES (${tenantId}, ${student_id}, ${route_id}, ${stop_id}, NOW())
      ON CONFLICT (tenant_id, student_id) DO UPDATE
        SET route_id = EXCLUDED.route_id, stop_id = EXCLUDED.stop_id, updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/transport/student-route-map", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT tsm.*, s.name AS student_name, tr.route_name, ts.stop_name, ts.stop_time
      FROM transport_student_map tsm
      JOIN students s ON s.id = tsm.student_id AND s.tenant_id = tsm.tenant_id
      LEFT JOIN transport_routes tr ON tr.id = tsm.route_id
      LEFT JOIN transport_stops ts ON ts.id = tsm.stop_id
      WHERE tsm.tenant_id = ${tenantId}
      ORDER BY tr.route_name, s.name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/transport/live-tracking", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT tll.*, b.bus_number, tr.route_name
      FROM transport_live_locations tll
      JOIN buses b ON b.id = tll.bus_id AND b.tenant_id = tll.tenant_id
      LEFT JOIN transport_routes tr ON tr.id = b.route_id
      WHERE tll.tenant_id = ${tenantId}
        AND tll.updated_at > NOW() - INTERVAL '30 minutes'
      ORDER BY tll.updated_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/transport/live-tracking", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { bus_id, lat, lng, speed } = req.body;
    const r = await db.execute(sql`
      INSERT INTO transport_live_locations (tenant_id, bus_id, lat, lng, speed, updated_at)
      VALUES (${tenantId}, ${bus_id}, ${lat}, ${lng}, ${speed}, NOW())
      ON CONFLICT (tenant_id, bus_id) DO UPDATE
        SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, speed = EXCLUDED.speed, updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/transport/fees", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT tf.*, tr.route_name
      FROM transport_fees tf
      JOIN transport_routes tr ON tr.id = tf.route_id AND tr.tenant_id = tf.tenant_id
      WHERE tf.tenant_id = ${tenantId}
      ORDER BY tr.route_name, tf.academic_year DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/transport/fees", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { route_id, fee_amount, academic_year } = req.body;
    const r = await db.execute(sql`
      INSERT INTO transport_fees (tenant_id, route_id, fee_amount, academic_year, created_at)
      VALUES (${tenantId}, ${route_id}, ${fee_amount}, ${academic_year}, NOW())
      ON CONFLICT (tenant_id, route_id, academic_year) DO UPDATE
        SET fee_amount = EXCLUDED.fee_amount
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── COMMUNICATION ───────────────────────────────────────────────────────────

router.post("/communications/bulk-whatsapp", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { class_ids, message } = req.body;
    const parentsR = await db.execute(sql`
      SELECT DISTINCT p.phone, p.name AS parent_name, s.name AS student_name
      FROM students s
      JOIN parents p ON p.student_id = s.id AND p.tenant_id = s.tenant_id
      WHERE s.tenant_id = ${tenantId} AND s.class_id = ANY(${class_ids}::int[])
    `);
    // Simulate dispatch — log each message
    let sent = 0;
    for (const parent of parentsR.rows as any[]) {
      await db.execute(sql`
        INSERT INTO communication_logs
          (tenant_id, channel, recipient, message, status, sent_at)
        VALUES (${tenantId}, 'whatsapp', ${parent.phone}, ${message}, 'sent', NOW())
      `);
      sent++;
    }
    res.json({ success: true, sent, total_parents: parentsR.rows.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/communications/history", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM communication_logs
      WHERE tenant_id = ${tenantId}
      ORDER BY sent_at DESC
      LIMIT 200
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/communications/chat", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { sender_type, sender_id, recipient_id, message } = req.body;
    const r = await db.execute(sql`
      INSERT INTO communication_logs
        (tenant_id, channel, sender_type, sender_id, recipient_id, message, status, sent_at)
      VALUES (${tenantId}, 'chat', ${sender_type}, ${sender_id}, ${recipient_id}, ${message}, 'sent', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/communications/chat/:studentId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { studentId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM communication_logs
      WHERE tenant_id = ${tenantId}
        AND channel = 'chat'
        AND (sender_id = ${studentId} OR recipient_id = ${studentId})
      ORDER BY sent_at ASC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DOCUMENTS ENHANCED ──────────────────────────────────────────────────────

router.get("/students/:id/udise-data", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT
        s.id, s.name, s.dob, s.gender, s.caste, s.religion,
        s.aadhaar_number, s.mother_tongue, s.admission_no,
        s.father_name, s.mother_name, s.address, s.phone,
        s.is_rte, s.is_cwsn, s.has_disability, s.disability_type,
        c.name AS class_name, s.section, s.academic_year
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
      WHERE s.tenant_id = ${tenantId} AND s.id = ${id}
    `);
    res.json(r.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/students/:id/scholarship-certificate", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT sr.*, s.name AS student_name, s.admission_no, c.name AS class_name
      FROM scholarship_records sr
      JOIN students s ON s.id = sr.student_id AND s.tenant_id = sr.tenant_id
      LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
      WHERE sr.tenant_id = ${tenantId} AND sr.student_id = ${id}
      ORDER BY sr.year DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/students/:id/caste-certificate", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { caste, certificate_number, issued_by } = req.body;
    const r = await db.execute(sql`
      INSERT INTO student_caste_certificates
        (tenant_id, student_id, caste, certificate_number, issued_by, created_at)
      VALUES (${tenantId}, ${id}, ${caste}, ${certificate_number}, ${issued_by}, NOW())
      ON CONFLICT (tenant_id, student_id) DO UPDATE
        SET caste = EXCLUDED.caste,
            certificate_number = EXCLUDED.certificate_number,
            issued_by = EXCLUDED.issued_by,
            updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/students/:id/caste-certificate", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT scc.*, s.name AS student_name
      FROM student_caste_certificates scc
      JOIN students s ON s.id = scc.student_id AND s.tenant_id = scc.tenant_id
      WHERE scc.tenant_id = ${tenantId} AND scc.student_id = ${id}
    `);
    res.json(r.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── REPORTS ENHANCED ────────────────────────────────────────────────────────

router.get("/reports/late-fee-collection", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to } = req.query as { from?: string; to?: string };
    const r = await db.execute(sql`
      SELECT
        fp.id, fp.student_id, s.name AS student_name,
        fp.late_fee_amount, fp.paid_at, fp.period
      FROM fee_payments fp
      JOIN students s ON s.id = fp.student_id AND s.tenant_id = fp.tenant_id
      WHERE fp.tenant_id = ${tenantId}
        AND fp.late_fee_amount > 0
        ${from ? sql`AND fp.paid_at >= ${from}` : sql``}
        ${to ? sql`AND fp.paid_at <= ${to}` : sql``}
      ORDER BY fp.paid_at DESC
    `);
    const total = (r.rows as any[]).reduce((s, row) => s + Number(row.late_fee_amount), 0);
    res.json({ total_collected: total, records: r.rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/reports/transport-wise-collection", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        tr.route_name,
        COUNT(tsm.student_id) AS student_count,
        SUM(fp.amount) AS collected,
        tf.fee_amount AS fee_per_student
      FROM transport_routes tr
      LEFT JOIN transport_student_map tsm ON tsm.route_id = tr.id AND tsm.tenant_id = tr.tenant_id
      LEFT JOIN transport_fees tf ON tf.route_id = tr.id AND tf.tenant_id = tr.tenant_id
      LEFT JOIN fee_payments fp ON fp.student_id = tsm.student_id
        AND fp.tenant_id = tr.tenant_id AND fp.fee_type = 'transport'
      WHERE tr.tenant_id = ${tenantId}
      GROUP BY tr.id, tr.route_name, tf.fee_amount
      ORDER BY tr.route_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/reports/scholarship-summary", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        scheme_name,
        COUNT(*) AS student_count,
        SUM(amount) AS total_amount,
        year
      FROM scholarship_records
      WHERE tenant_id = ${tenantId}
      GROUP BY scheme_name, year
      ORDER BY year DESC, scheme_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/reports/rte-compliance", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        rs.rte_category,
        COUNT(*) AS student_count,
        SUM(rs.govt_reimbursement) AS total_reimbursement,
        array_agg(s.name) AS student_names
      FROM rte_students rs
      JOIN students s ON s.id = rs.student_id AND s.tenant_id = rs.tenant_id
      WHERE rs.tenant_id = ${tenantId}
      GROUP BY rs.rte_category
      ORDER BY rs.rte_category
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/reports/lms-engagement", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        lc.subject_id,
        s.name AS subject_name,
        COUNT(DISTINCT lp.student_id) AS students_engaged,
        AVG(lp.progress_pct) AS avg_progress,
        COUNT(CASE WHEN lp.completed = true THEN 1 END) AS completions,
        COUNT(lc.id) AS total_content_pieces
      FROM lms_content lc
      LEFT JOIN lms_progress lp ON lp.content_id = lc.id AND lp.tenant_id = lc.tenant_id
      LEFT JOIN subjects s ON s.id = lc.subject_id AND s.tenant_id = lc.tenant_id
      WHERE lc.tenant_id = ${tenantId}
      GROUP BY lc.subject_id, s.name
      ORDER BY avg_progress DESC NULLS LAST
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
