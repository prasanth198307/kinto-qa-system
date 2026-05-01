import { Router } from "express";

import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => req.tenantId || req.user?.tenantId || 1;

// ── Patients ────────────────────────────────────────────────────────────────
router.get("/patients", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM patients WHERE tenant_id=${String(tid(req))} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/patients", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(tid(req));
    const { name, dob, gender, blood_group, phone, email, address, emergency_contact, allergies, notes } = req.body;
    const code = "PAT-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO patients (tenant_id, patient_code, name, dob, gender, blood_group, phone, email, address, emergency_contact, allergies, notes)
      VALUES (${tenantId}, ${code}, ${name}, ${dob || null}, ${gender || null}, ${blood_group || null},
              ${phone || null}, ${email || null}, ${address || null}, ${emergency_contact || null},
              ${allergies || null}, ${notes || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/patients/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, blood_group, phone, email, address, emergency_contact, allergies, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE patients SET name=${name}, dob=${dob || null}, gender=${gender || null},
        blood_group=${blood_group || null}, phone=${phone || null}, email=${email || null},
        address=${address || null}, emergency_contact=${emergency_contact || null},
        allergies=${allergies || null}, notes=${notes || null}
      WHERE id=${req.params.id} AND tenant_id=${String(tid(req))} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/patients/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE patients SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${String(tid(req))}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Wards ───────────────────────────────────────────────────────────────────
router.get("/wards", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM wards WHERE tenant_id=${String(tid(req))} AND is_active=1 ORDER BY ward_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/wards", requireAuth, async (req: any, res) => {
  try {
    const { ward_name, ward_type, total_beds, charge_per_day } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO wards (tenant_id, ward_name, ward_type, total_beds, charge_per_day)
      VALUES (${String(tid(req))}, ${ward_name}, ${ward_type || null}, ${total_beds || 0}, ${charge_per_day || 0})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/wards/:id", requireAuth, async (req: any, res) => {
  try {
    const { ward_name, ward_type, total_beds, charge_per_day } = req.body;
    const rows = await db.execute(sql`
      UPDATE wards SET ward_name=${ward_name}, ward_type=${ward_type || null},
        total_beds=${total_beds || 0}, charge_per_day=${charge_per_day || 0}
      WHERE id=${req.params.id} AND tenant_id=${String(tid(req))} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/wards/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE wards SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${String(tid(req))}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Appointments (OPD) ──────────────────────────────────────────────────────
router.get("/appointments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone
      FROM appointments a LEFT JOIN patients p ON p.id=a.patient_id
      WHERE a.tenant_id=${String(tid(req))} ORDER BY a.appointment_date DESC, a.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/appointments", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(tid(req));
    const { patient_id, doctor_name, specialization, appointment_date, slot_time, type, consultation_fee, diagnosis, prescription, notes } = req.body;
    const no = "APT-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO appointments (tenant_id, appointment_no, patient_id, doctor_name, specialization, appointment_date, slot_time, type, consultation_fee, diagnosis, prescription, notes)
      VALUES (${tenantId}, ${no}, ${patient_id}, ${doctor_name}, ${specialization || null},
              ${appointment_date}, ${slot_time || null}, ${type || 'OPD'}, ${consultation_fee || 0},
              ${diagnosis || null}, ${prescription || null}, ${notes || null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/appointments/:id", requireAuth, async (req: any, res) => {
  try {
    const { doctor_name, specialization, appointment_date, slot_time, type, status, consultation_fee, diagnosis, prescription, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE appointments SET doctor_name=${doctor_name}, specialization=${specialization || null},
        appointment_date=${appointment_date}, slot_time=${slot_time || null}, type=${type || 'OPD'},
        status=${status || 'scheduled'}, consultation_fee=${consultation_fee || 0},
        diagnosis=${diagnosis || null}, prescription=${prescription || null}, notes=${notes || null}
      WHERE id=${req.params.id} AND tenant_id=${String(tid(req))} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── IPD Admissions ──────────────────────────────────────────────────────────
router.get("/ipd-admissions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, w.ward_name
      FROM ipd_admissions a
      LEFT JOIN patients p ON p.id=a.patient_id
      LEFT JOIN wards w ON w.id=a.ward_id
      WHERE a.tenant_id=${String(tid(req))} ORDER BY a.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ipd-admissions", requireAuth, async (req: any, res) => {
  try {
    const tenantId = String(tid(req));
    const { patient_id, ward_id, bed_no, doctor_name, admission_date, discharge_date, diagnosis, treatment, daily_charge } = req.body;
    const no = "IPD-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO ipd_admissions (tenant_id, admission_no, patient_id, ward_id, bed_no, doctor_name, admission_date, discharge_date, diagnosis, treatment, daily_charge)
      VALUES (${tenantId}, ${no}, ${patient_id}, ${ward_id || null}, ${bed_no || null},
              ${doctor_name || null}, ${admission_date}, ${discharge_date || null},
              ${diagnosis || null}, ${treatment || null}, ${daily_charge || 0})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/ipd-admissions/:id", requireAuth, async (req: any, res) => {
  try {
    const { ward_id, bed_no, doctor_name, admission_date, discharge_date, diagnosis, treatment, daily_charge, total_bill, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE ipd_admissions SET ward_id=${ward_id || null}, bed_no=${bed_no || null},
        doctor_name=${doctor_name || null}, admission_date=${admission_date},
        discharge_date=${discharge_date || null}, diagnosis=${diagnosis || null},
        treatment=${treatment || null}, daily_charge=${daily_charge || 0},
        total_bill=${total_bill || 0}, status=${status || 'admitted'}
      WHERE id=${req.params.id} AND tenant_id=${String(tid(req))} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
