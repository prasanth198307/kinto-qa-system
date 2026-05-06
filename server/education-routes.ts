import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);
const ntid = (req: any) => Number(req.tenantId || req.user?.tenantId || 1);

// ── Classes ──────────────────────────────────────────────────────────────────
router.get("/classes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM classes WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/classes", requireAuth, async (req: any, res) => {
  try {
    const { name, grade, section, academic_year, teacher_name, capacity, room_number } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO classes (tenant_id, name, grade, section, academic_year, teacher_name, capacity, room_number)
      VALUES (${tid(req)}, ${name}, ${grade||null}, ${section||null}, ${academic_year||null},
              ${teacher_name||null}, ${capacity||0}, ${room_number||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/classes/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, grade, section, academic_year, teacher_name, capacity, room_number } = req.body;
    const rows = await db.execute(sql`
      UPDATE classes SET name=${name}, grade=${grade||null}, section=${section||null},
        academic_year=${academic_year||null}, teacher_name=${teacher_name||null},
        capacity=${capacity||0}, room_number=${room_number||null}
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

// ── Subjects ─────────────────────────────────────────────────────────────────
router.get("/subjects", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_subjects WHERE tenant_id=${ntid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/subjects", requireAuth, async (req: any, res) => {
  try {
    const { subject_code, name, subject_type, theory_practical, pass_marks, total_marks } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_subjects (tenant_id, subject_code, name, subject_type, theory_practical, pass_marks, total_marks)
      VALUES (${ntid(req)}, ${subject_code||null}, ${name}, ${subject_type||null},
              ${theory_practical||'theory'}, ${pass_marks||35}, ${total_marks||100}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/subjects/:id", requireAuth, async (req: any, res) => {
  try {
    const { subject_code, name, subject_type, theory_practical, pass_marks, total_marks } = req.body;
    const rows = await db.execute(sql`
      UPDATE edu_subjects SET subject_code=${subject_code||null}, name=${name}, subject_type=${subject_type||null},
        theory_practical=${theory_practical||'theory'}, pass_marks=${pass_marks||35}, total_marks=${total_marks||100}
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/subjects/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_subjects SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Staff (Teachers) ──────────────────────────────────────────────────────────
router.get("/teachers", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM teachers WHERE tenant_id=${ntid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/teachers", requireAuth, async (req: any, res) => {
  try {
    const { name, subject, qualification, phone, email, date_of_joining, salary, status, department, designation } = req.body;
    const code = "TCH-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO teachers (tenant_id, teacher_code, name, subject, qualification, phone, email, date_of_joining, salary, status, department, designation)
      VALUES (${ntid(req)}, ${code}, ${name}, ${subject||null}, ${qualification||null},
              ${phone||null}, ${email||null}, ${date_of_joining||null}, ${salary||0}, ${status||'active'},
              ${department||null}, ${designation||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/teachers/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, subject, qualification, phone, email, date_of_joining, salary, status, department, designation } = req.body;
    const rows = await db.execute(sql`
      UPDATE teachers SET name=${name}, subject=${subject||null}, qualification=${qualification||null},
        phone=${phone||null}, email=${email||null}, date_of_joining=${date_of_joining||null},
        salary=${salary||0}, status=${status||'active'}, department=${department||null}, designation=${designation||null}
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/teachers/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE teachers SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Students ──────────────────────────────────────────────────────────────────
router.get("/students", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*, c.name as class_name, c.grade, c.section as class_section, c.academic_year
      FROM students s LEFT JOIN classes c ON c.id::text=s.class_id::text
      WHERE s.tenant_id=${tid(req)} ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/students", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date,
            blood_group, section, roll_number, transport_required, hostel_required, admission_no, academic_year } = req.body;
    const code = "STU-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO students (tenant_id, student_code, name, dob, gender, class_id, parent_name, parent_phone,
                            email, address, enrollment_date, blood_group, section, roll_number,
                            transport_required, hostel_required, admission_no, academic_year)
      VALUES (${tid(req)}, ${code}, ${name}, ${dob||null}, ${gender||null},
              ${class_id||null}, ${parent_name||null}, ${parent_phone||null},
              ${email||null}, ${address||null}, ${enrollment_date||null},
              ${blood_group||null}, ${section||null}, ${roll_number||null},
              ${transport_required?1:0}, ${hostel_required?1:0},
              ${admission_no||null}, ${academic_year||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/students/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, class_id, parent_name, parent_phone, email, address, enrollment_date, status,
            blood_group, section, roll_number, transport_required, hostel_required, admission_no, academic_year } = req.body;
    const rows = await db.execute(sql`
      UPDATE students SET name=${name}, dob=${dob||null}, gender=${gender||null},
        class_id=${class_id||null}, parent_name=${parent_name||null},
        parent_phone=${parent_phone||null}, email=${email||null},
        address=${address||null}, enrollment_date=${enrollment_date||null},
        status=${status||'active'}, blood_group=${blood_group||null},
        section=${section||null}, roll_number=${roll_number||null},
        transport_required=${transport_required?1:0}, hostel_required=${hostel_required?1:0},
        admission_no=${admission_no||null}, academic_year=${academic_year||null}
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

// ── Student Attendance ────────────────────────────────────────────────────────
router.get("/attendance", requireAuth, async (req: any, res) => {
  try {
    const { date, class_id } = req.query;
    const tenantId = ntid(req);
    if (date && class_id) {
      const rows = await db.execute(sql`
        SELECT sa.*, s.name as student_name, s.roll_number, s.section
        FROM student_attendance sa
        JOIN students s ON s.id::text = sa.student_id::text
        WHERE sa.tenant_id = ${tenantId}
          AND sa.attendance_date = ${date}
          AND s.class_id::text = ${String(class_id)}
        ORDER BY s.name`);
      res.json(rows.rows);
    } else if (date) {
      const rows = await db.execute(sql`
        SELECT sa.*, s.name as student_name, s.roll_number, s.section, s.class_id
        FROM student_attendance sa
        JOIN students s ON s.id::text = sa.student_id::text
        WHERE sa.tenant_id = ${tenantId} AND sa.attendance_date = ${date}
        ORDER BY s.name`);
      res.json(rows.rows);
    } else {
      const rows = await db.execute(sql`
        SELECT sa.*, s.name as student_name, s.roll_number, s.section
        FROM student_attendance sa
        JOIN students s ON s.id::text = sa.student_id::text
        WHERE sa.tenant_id = ${tenantId}
        ORDER BY sa.attendance_date DESC LIMIT 200`);
      res.json(rows.rows);
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/attendance", requireAuth, async (req: any, res) => {
  try {
    const { student_id, class_id, attendance_date, status, remarks } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO student_attendance (tenant_id, student_id, class_id, attendance_date, status, remarks)
      VALUES (${ntid(req)}, ${student_id}, ${class_id||null}, ${attendance_date}, ${status||'present'}, ${remarks||null})
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
        VALUES (${ntid(req)}, ${r.student_id}, ${class_id||null}, ${attendance_date}, ${r.status||'present'}, ${r.remarks||null})
        ON CONFLICT (tenant_id, student_id, attendance_date) DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks`);
    }
    res.json({ success: true, count: records.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Staff Attendance ──────────────────────────────────────────────────────────
router.get("/staff-attendance", requireAuth, async (req: any, res) => {
  try {
    const { date } = req.query;
    if (date) {
      const rows = await db.execute(sql`
        SELECT sa.*, t.name as staff_name, t.department, t.designation
        FROM edu_staff_attendance sa
        JOIN teachers t ON t.id = sa.staff_id
        WHERE sa.tenant_id = ${ntid(req)} AND sa.attendance_date = ${date}
        ORDER BY t.name`);
      res.json(rows.rows);
    } else {
      const rows = await db.execute(sql`
        SELECT sa.*, t.name as staff_name, t.department, t.designation
        FROM edu_staff_attendance sa
        JOIN teachers t ON t.id = sa.staff_id
        WHERE sa.tenant_id = ${ntid(req)}
        ORDER BY sa.attendance_date DESC LIMIT 200`);
      res.json(rows.rows);
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/staff-attendance/bulk", requireAuth, async (req: any, res) => {
  try {
    const { attendance_date, records } = req.body;
    for (const r of records) {
      await db.execute(sql`
        INSERT INTO edu_staff_attendance (tenant_id, staff_id, attendance_date, check_in, check_out, status)
        VALUES (${ntid(req)}, ${r.staff_id}, ${attendance_date}, ${r.check_in||null}, ${r.check_out||null}, ${r.status||'present'})
        ON CONFLICT (tenant_id, staff_id, attendance_date) DO UPDATE
          SET check_in=EXCLUDED.check_in, check_out=EXCLUDED.check_out, status=EXCLUDED.status`);
    }
    res.json({ success: true, count: records.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Timetable ────────────────────────────────────────────────────────────────
router.get("/timetable-periods", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM timetable_periods WHERE tenant_id=${ntid(req)} ORDER BY sort_order`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/timetable-periods", requireAuth, async (req: any, res) => {
  try {
    const { period_name, start_time, end_time, sort_order } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO timetable_periods (tenant_id, period_name, start_time, end_time, sort_order)
      VALUES (${ntid(req)}, ${period_name}, ${start_time||null}, ${end_time||null}, ${sort_order||1}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/timetable-periods/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM timetable_periods WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/timetable", requireAuth, async (req: any, res) => {
  try {
    const { class_id } = req.query;
    if (class_id) {
      const rows = await db.execute(sql`
        SELECT tt.*, s.name as subject_name, t.name as teacher_name, c.name as class_name
        FROM edu_timetable tt
        LEFT JOIN edu_subjects s ON s.id = tt.subject_id
        LEFT JOIN teachers t ON t.id = tt.teacher_id
        LEFT JOIN classes c ON c.id::text = tt.class_id::text
        WHERE tt.tenant_id=${ntid(req)} AND tt.class_id=${String(class_id)}
        ORDER BY tt.day_of_week, tt.period_id`);
      res.json(rows.rows);
    } else {
      const rows = await db.execute(sql`
        SELECT tt.*, s.name as subject_name, t.name as teacher_name, c.name as class_name
        FROM edu_timetable tt
        LEFT JOIN edu_subjects s ON s.id = tt.subject_id
        LEFT JOIN teachers t ON t.id = tt.teacher_id
        LEFT JOIN classes c ON c.id::text = tt.class_id::text
        WHERE tt.tenant_id=${ntid(req)}
        ORDER BY tt.class_id, tt.day_of_week, tt.period_id`);
      res.json(rows.rows);
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/timetable", requireAuth, async (req: any, res) => {
  try {
    const { class_id, section, day_of_week, period_id, period_name, subject_id, teacher_id, room_no, academic_year } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_timetable (tenant_id, class_id, section, day_of_week, period_id, period_name, subject_id, teacher_id, room_no, academic_year)
      VALUES (${ntid(req)}, ${class_id}, ${section||null}, ${day_of_week}, ${period_id||null}, ${period_name||null},
              ${subject_id||null}, ${teacher_id||null}, ${room_no||null}, ${academic_year||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/timetable/:id", requireAuth, async (req: any, res) => {
  try {
    const { subject_id, teacher_id, room_no } = req.body;
    const rows = await db.execute(sql`
      UPDATE edu_timetable SET subject_id=${subject_id||null}, teacher_id=${teacher_id||null}, room_no=${room_no||null}
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/timetable/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM edu_timetable WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Transport ────────────────────────────────────────────────────────────────
router.get("/vehicles", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_vehicles WHERE tenant_id=${ntid(req)} AND record_status=1 ORDER BY vehicle_no`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/vehicles", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_no, driver_name, route, capacity } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_vehicles (tenant_id, vehicle_no, driver_name, route, capacity)
      VALUES (${ntid(req)}, ${vehicle_no}, ${driver_name||null}, ${route||null}, ${capacity||0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/vehicles/:id", requireAuth, async (req: any, res) => {
  try {
    const { vehicle_no, driver_name, route, capacity } = req.body;
    const rows = await db.execute(sql`
      UPDATE edu_vehicles SET vehicle_no=${vehicle_no}, driver_name=${driver_name||null}, route=${route||null}, capacity=${capacity||0}
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/vehicles/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_vehicles SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/routes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_routes WHERE tenant_id=${ntid(req)} AND record_status=1 ORDER BY route_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/routes", requireAuth, async (req: any, res) => {
  try {
    const { route_name, pickup_points, distance_km, fee } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_routes (tenant_id, route_name, pickup_points, distance_km, fee)
      VALUES (${ntid(req)}, ${route_name}, ${pickup_points||null}, ${distance_km||0}, ${fee||0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/routes/:id", requireAuth, async (req: any, res) => {
  try {
    const { route_name, pickup_points, distance_km, fee } = req.body;
    const rows = await db.execute(sql`
      UPDATE edu_routes SET route_name=${route_name}, pickup_points=${pickup_points||null}, distance_km=${distance_km||0}, fee=${fee||0}
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/routes/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_routes SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/student-transport", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT st.*, s.name as student_name, s.student_code, r.route_name, v.vehicle_no
      FROM student_transport st
      LEFT JOIN students s ON s.id::text = st.student_id::text
      LEFT JOIN edu_routes r ON r.id = st.route_id
      LEFT JOIN edu_vehicles v ON v.id = st.vehicle_id
      WHERE st.tenant_id=${ntid(req)}
      ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/student-transport", requireAuth, async (req: any, res) => {
  try {
    const { student_id, route_id, pickup_point, vehicle_id } = req.body;
    await db.execute(sql`DELETE FROM student_transport WHERE student_id=${student_id} AND tenant_id=${ntid(req)}`);
    const rows = await db.execute(sql`
      INSERT INTO student_transport (tenant_id, student_id, route_id, pickup_point, vehicle_id)
      VALUES (${ntid(req)}, ${student_id}, ${route_id||null}, ${pickup_point||null}, ${vehicle_id||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/student-transport/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM student_transport WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Announcements ────────────────────────────────────────────────────────────
router.get("/announcements", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_announcements WHERE tenant_id=${ntid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/announcements", requireAuth, async (req: any, res) => {
  try {
    const { title, description, audience, start_date, end_date, priority } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_announcements (tenant_id, title, description, audience, start_date, end_date, priority)
      VALUES (${ntid(req)}, ${title}, ${description||null}, ${audience||'all'}, ${start_date||null}, ${end_date||null}, ${priority||'normal'}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/announcements/:id", requireAuth, async (req: any, res) => {
  try {
    const { title, description, audience, start_date, end_date, priority } = req.body;
    const rows = await db.execute(sql`
      UPDATE edu_announcements SET title=${title}, description=${description||null}, audience=${audience||'all'},
        start_date=${start_date||null}, end_date=${end_date||null}, priority=${priority||'normal'}
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/announcements/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_announcements SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Examinations / Assessments ───────────────────────────────────────────────
router.get("/examinations", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT e.*, c.name as class_name, c.grade, c.section
      FROM examinations e LEFT JOIN classes c ON c.id::text=e.class_id::text
      WHERE e.tenant_id=${ntid(req)} AND e.record_status=1 ORDER BY e.exam_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/examinations", requireAuth, async (req: any, res) => {
  try {
    const { class_id, exam_name, subject, exam_date, max_marks, pass_marks, academic_year } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO examinations (tenant_id, class_id, exam_name, subject, exam_date, max_marks, pass_marks, academic_year)
      VALUES (${ntid(req)}, ${class_id||null}, ${exam_name}, ${subject}, ${exam_date||null},
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
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/examinations/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE examinations SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Exam Marks ────────────────────────────────────────────────────────────────
router.get("/exam-marks/:examinationId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT em.*, s.name as student_name, s.student_code, s.roll_number
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
    const rows = await db.execute(sql`SELECT * FROM library_books WHERE tenant_id=${ntid(req)} AND record_status=1 ORDER BY title`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/library-books", requireAuth, async (req: any, res) => {
  try {
    const { title, author, isbn, category, publisher, total_copies, rack_number } = req.body;
    const code = "BK-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO library_books (tenant_id, book_code, title, author, isbn, category, publisher, total_copies, available_copies, rack_number)
      VALUES (${ntid(req)}, ${code}, ${title}, ${author||null}, ${isbn||null}, ${category||null},
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
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/library-books/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE library_books SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${ntid(req)}`);
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
      WHERE bi.tenant_id=${ntid(req)} ORDER BY bi.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/book-issues", requireAuth, async (req: any, res) => {
  try {
    const { book_id, student_id, student_name, issue_date, due_date } = req.body;
    await db.execute(sql`UPDATE library_books SET available_copies=available_copies-1 WHERE id=${book_id}`);
    const rows = await db.execute(sql`
      INSERT INTO book_issues (tenant_id, book_id, student_id, student_name, issue_date, due_date, status)
      VALUES (${ntid(req)}, ${book_id}, ${student_id||null}, ${student_name||null},
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
      WHERE id=${req.params.id} AND tenant_id=${ntid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Advanced Fee Engine ───────────────────────────────────────────────────────

// Fee Components
router.get("/fee-components", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM fee_components WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fee-components", requireAuth, async (req: any, res) => {
  try {
    const { name, mandatory, recurring } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO fee_components (tenant_id, name, mandatory, recurring)
      VALUES (${tid(req)}, ${name}, ${mandatory?1:0}, ${recurring?1:0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/fee-components/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, mandatory, recurring } = req.body;
    const rows = await db.execute(sql`
      UPDATE fee_components SET name=${name}, mandatory=${mandatory?1:0}, recurring=${recurring?1:0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/fee-components/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE fee_components SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Fee Structures (master)
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

// Fee structure components
router.get("/fee-structure-components/:structureId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT fsc.*, fc.name as component_name, fc.mandatory, fc.recurring
      FROM fee_structure_components fsc
      JOIN fee_components fc ON fc.id = fsc.component_id
      WHERE fsc.structure_id=${req.params.structureId}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fee-structure-components", requireAuth, async (req: any, res) => {
  try {
    const { structure_id, component_id, amount } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO fee_structure_components (structure_id, component_id, amount)
      VALUES (${structure_id}, ${component_id}, ${amount||0})
      ON CONFLICT DO NOTHING RETURNING *`);
    res.json(rows.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/fee-structure-components/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM fee_structure_components WHERE id=${req.params.id}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Student fee assignments
router.get("/student-fee-assignments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT sfa.*, s.name as student_name, s.student_code, fs.fee_type as structure_name
      FROM student_fee_assignments sfa
      JOIN students s ON s.id::text = sfa.student_id::text
      JOIN fee_structures fs ON fs.id = sfa.structure_id
      WHERE sfa.tenant_id=${tid(req)}
      ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/student-fee-assignments", requireAuth, async (req: any, res) => {
  try {
    const { student_id, structure_id, effective_from, installment_plan } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO student_fee_assignments (tenant_id, student_id, structure_id, effective_from, installment_plan)
      VALUES (${tid(req)}, ${student_id}, ${structure_id}, ${effective_from||null}, ${installment_plan||'monthly'})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/student-fee-assignments/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM student_fee_assignments WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Scholarships
router.get("/scholarships", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_scholarships WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/scholarships", requireAuth, async (req: any, res) => {
  try {
    const { name, type, value } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_scholarships (tenant_id, name, type, value)
      VALUES (${tid(req)}, ${name}, ${type||'percentage'}, ${value||0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/scholarships/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, type, value } = req.body;
    const rows = await db.execute(sql`
      UPDATE edu_scholarships SET name=${name}, type=${type||'percentage'}, value=${value||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/scholarships/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_scholarships SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Student scholarships
router.get("/student-scholarships", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT ss.*, s.name as student_name, sch.name as scholarship_name, sch.type
      FROM student_scholarships ss
      JOIN students s ON s.id::text = ss.student_id::text
      JOIN edu_scholarships sch ON sch.id = ss.scholarship_id
      WHERE ss.tenant_id=${tid(req)}
      ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/student-scholarships", requireAuth, async (req: any, res) => {
  try {
    const { student_id, scholarship_id, applicable_component, value } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO student_scholarships (tenant_id, student_id, scholarship_id, applicable_component, value)
      VALUES (${tid(req)}, ${student_id}, ${scholarship_id}, ${applicable_component||null}, ${value||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/student-scholarships/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM student_scholarships WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Discounts
router.get("/discounts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_discounts WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/discounts", requireAuth, async (req: any, res) => {
  try {
    const { name, type } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_discounts (tenant_id, name, type)
      VALUES (${tid(req)}, ${name}, ${type||'fixed'}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/discounts/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_discounts SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Student discounts
router.get("/student-discounts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT sd.*, s.name as student_name, d.name as discount_name
      FROM student_discounts sd
      JOIN students s ON s.id::text = sd.student_id::text
      JOIN edu_discounts d ON d.id = sd.discount_id
      WHERE sd.tenant_id=${tid(req)}
      ORDER BY s.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/student-discounts", requireAuth, async (req: any, res) => {
  try {
    const { student_id, discount_id, applicable_on, value } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO student_discounts (tenant_id, student_id, discount_id, applicable_on, value)
      VALUES (${tid(req)}, ${student_id}, ${discount_id}, ${applicable_on||null}, ${value||0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/student-discounts/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM student_discounts WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Installment plans
router.get("/installment-plans", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM edu_installment_plans WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/installment-plans", requireAuth, async (req: any, res) => {
  try {
    const { name, due_date, percentage } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO edu_installment_plans (tenant_id, name, due_date, percentage)
      VALUES (${tid(req)}, ${name}, ${due_date||null}, ${percentage||100}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/installment-plans/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE edu_installment_plans SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Student Fee Ledger
router.get("/fee-ledger", requireAuth, async (req: any, res) => {
  try {
    const { student_id } = req.query;
    if (student_id) {
      const rows = await db.execute(sql`
        SELECT fl.*, s.name as student_name
        FROM student_fee_ledger fl
        JOIN students s ON s.id::text = fl.student_id::text
        WHERE fl.tenant_id=${tid(req)} AND fl.student_id=${String(student_id)}
        ORDER BY fl.entry_date DESC, fl.created_at DESC`);
      res.json(rows.rows);
    } else {
      const rows = await db.execute(sql`
        SELECT fl.*, s.name as student_name
        FROM student_fee_ledger fl
        JOIN students s ON s.id::text = fl.student_id::text
        WHERE fl.tenant_id=${tid(req)}
        ORDER BY fl.entry_date DESC, fl.created_at DESC LIMIT 200`);
      res.json(rows.rows);
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/fee-ledger", requireAuth, async (req: any, res) => {
  try {
    const { student_id, component_id, component_name, debit, credit, narration, entry_date } = req.body;
    const voucher = "FEE-" + Date.now();
    const prevBal = await db.execute(sql`
      SELECT COALESCE(balance, 0) as balance FROM student_fee_ledger
      WHERE tenant_id=${tid(req)} AND student_id=${student_id}
      ORDER BY created_at DESC LIMIT 1`);
    const prevBalance = Number(prevBal.rows[0]?.balance || 0);
    const balance = prevBalance + Number(debit || 0) - Number(credit || 0);
    const rows = await db.execute(sql`
      INSERT INTO student_fee_ledger (tenant_id, voucher_no, student_id, component_id, component_name, debit, credit, balance, narration, entry_date)
      VALUES (${tid(req)}, ${voucher}, ${student_id}, ${component_id||null}, ${component_name||null},
              ${debit||0}, ${credit||0}, ${balance}, ${narration||null}, ${entry_date||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Fee Payments
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
    const { student_id, fee_structure_id, amount, gross_amount, discount_amount, paid_date, payment_mode, for_month, notes } = req.body;
    const receipt = "RCP-" + Date.now();
    const tenantId = tid(req);
    const netAmount = Number(amount || 0);
    const grossAmt = Number(gross_amount || netAmount);
    const discountAmt = Number(discount_amount || 0);

    const rows = await db.execute(sql`
      INSERT INTO fee_payments (tenant_id, student_id, fee_structure_id, receipt_no, amount, gross_amount, discount_amount, paid_date, payment_mode, for_month, notes)
      VALUES (${tenantId}, ${student_id}, ${fee_structure_id||null}, ${receipt},
              ${netAmount}, ${grossAmt}, ${discountAmt}, ${paid_date}, ${payment_mode||'cash'}, ${for_month||null}, ${notes||null})
      RETURNING *`);

    const payment = rows.rows[0];

    // Auto-post ledger entries
    const prevBal = await db.execute(sql`
      SELECT COALESCE(balance, 0) as balance FROM student_fee_ledger
      WHERE tenant_id=${tenantId} AND student_id=${student_id}
      ORDER BY created_at DESC LIMIT 1`);
    let runningBalance = Number(prevBal.rows[0]?.balance || 0);

    // Entry 1: debit for the gross charge
    if (grossAmt > 0) {
      runningBalance = runningBalance + grossAmt;
      await db.execute(sql`
        INSERT INTO student_fee_ledger (tenant_id, voucher_no, student_id, component_name, debit, credit, balance, narration, entry_date)
        VALUES (${tenantId}, ${"CHG-" + Date.now()}, ${student_id}, ${for_month ? "Fee – " + for_month : "Fee Charge"},
                ${grossAmt}, 0, ${runningBalance}, ${"Fee charged – " + receipt}, ${paid_date})`);
    }

    // Entry 2: credit for scholarship/discount (if any)
    if (discountAmt > 0) {
      runningBalance = runningBalance - discountAmt;
      await db.execute(sql`
        INSERT INTO student_fee_ledger (tenant_id, voucher_no, student_id, component_name, debit, credit, balance, narration, entry_date)
        VALUES (${tenantId}, ${"DISC-" + Date.now()}, ${student_id}, ${"Scholarship / Discount"},
                0, ${discountAmt}, ${runningBalance}, ${"Discount applied – " + receipt}, ${paid_date})`);
    }

    // Entry 3: credit for the net payment received
    if (netAmount > 0) {
      runningBalance = runningBalance - netAmount;
      await db.execute(sql`
        INSERT INTO student_fee_ledger (tenant_id, voucher_no, student_id, component_name, debit, credit, balance, narration, entry_date)
        VALUES (${tenantId}, ${receipt}, ${student_id}, ${"Payment Received"},
                0, ${netAmount}, ${runningBalance}, ${payment_mode?.toUpperCase() + " payment – " + receipt}, ${paid_date})`);
    }

    res.json(payment);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [students, teachers, payments, classes, overdue, pendingFees, announcements, transport] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM students WHERE tenant_id=${tid(req)} AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as count FROM teachers WHERE tenant_id=${ntid(req)} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) as total FROM fee_payments WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM paid_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM classes WHERE tenant_id=${tid(req)} AND is_active=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM book_issues WHERE tenant_id=${ntid(req)} AND status='issued' AND due_date < CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) as total FROM fee_structures WHERE tenant_id=${tid(req)} AND is_active=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM edu_announcements WHERE tenant_id=${ntid(req)} AND record_status=1 AND (end_date IS NULL OR end_date >= CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM student_transport WHERE tenant_id=${ntid(req)}`),
    ]);
    res.json({
      totalStudents: Number(students.rows[0]?.count || 0),
      totalTeachers: Number(teachers.rows[0]?.count || 0),
      monthlyCollection: Number(payments.rows[0]?.total || 0),
      totalClasses: Number(classes.rows[0]?.count || 0),
      overdueBooks: Number(overdue.rows[0]?.count || 0),
      monthlyFeeTarget: Number(pendingFees.rows[0]?.total || 0),
      activeAnnouncements: Number(announcements.rows[0]?.count || 0),
      transportStudents: Number(transport.rows[0]?.count || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
