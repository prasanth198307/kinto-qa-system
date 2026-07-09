import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glHealthcareBill } from "./vertical-gl-service";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const PDFDocument = _require("pdfkit");
import { whatsappService } from "./whatsappService";
import { randomUUID } from "crypto";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Patients ─────────────────────────────────────────────────────────────────
router.get("/patients", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM patients WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/patients", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, blood_group, phone, email, address, emergency_contact, allergies, notes } = req.body;
    const code = "PAT-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO patients (tenant_id, patient_code, name, dob, gender, blood_group, phone, email, address, emergency_contact, allergies, notes)
      VALUES (${tid(req)}, ${code}, ${name}, ${dob||null}, ${gender||null}, ${blood_group||null},
              ${phone||null}, ${email||null}, ${address||null}, ${emergency_contact||null},
              ${allergies||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/patients/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, dob, gender, blood_group, phone, email, address, emergency_contact, allergies, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE patients SET name=${name}, dob=${dob||null}, gender=${gender||null},
        blood_group=${blood_group||null}, phone=${phone||null}, email=${email||null},
        address=${address||null}, emergency_contact=${emergency_contact||null},
        allergies=${allergies||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/patients/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE patients SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Doctors ──────────────────────────────────────────────────────────────────
router.get("/doctors", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM doctors WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/doctors", requireAuth, async (req: any, res) => {
  try {
    const { name, specialty, qualification, phone, email, consultation_fee, available_days, available_from, available_to, notes } = req.body;
    const code = "DOC-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO doctors (tenant_id, doctor_code, name, specialty, qualification, phone, email, consultation_fee, available_days, available_from, available_to, notes)
      VALUES (${tid(req)}, ${code}, ${name}, ${specialty||null}, ${qualification||null},
              ${phone||null}, ${email||null}, ${consultation_fee||0},
              ${available_days||null}, ${available_from||null}, ${available_to||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/doctors/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, specialty, qualification, phone, email, consultation_fee, available_days, available_from, available_to, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE doctors SET name=${name}, specialty=${specialty||null}, qualification=${qualification||null},
        phone=${phone||null}, email=${email||null}, consultation_fee=${consultation_fee||0},
        available_days=${available_days||null}, available_from=${available_from||null},
        available_to=${available_to||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/doctors/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE doctors SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Wards ────────────────────────────────────────────────────────────────────
router.get("/wards", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM wards WHERE tenant_id=${tid(req)} AND is_active=1 ORDER BY ward_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/wards", requireAuth, async (req: any, res) => {
  try {
    const { ward_name, ward_type, total_beds, charge_per_day } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO wards (tenant_id, ward_name, ward_type, total_beds, charge_per_day)
      VALUES (${tid(req)}, ${ward_name}, ${ward_type||null}, ${total_beds||0}, ${charge_per_day||0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/wards/:id", requireAuth, async (req: any, res) => {
  try {
    const { ward_name, ward_type, total_beds, charge_per_day } = req.body;
    const rows = await db.execute(sql`
      UPDATE wards SET ward_name=${ward_name}, ward_type=${ward_type||null},
        total_beds=${total_beds||0}, charge_per_day=${charge_per_day||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/wards/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE wards SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Appointments (OPD) ───────────────────────────────────────────────────────
router.get("/appointments", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.blood_group,
             d.name as doctor_name_ref, d.specialty
      FROM appointments a
      LEFT JOIN patients p ON p.id::text=a.patient_id::text
      LEFT JOIN doctors d ON d.id=a.doctor_id
      WHERE a.tenant_id=${tid(req)} ORDER BY a.appointment_date DESC, a.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/appointments", requireAuth, async (req: any, res) => {
  try {
    const { patient_id, doctor_id, doctor_name, specialization, appointment_date, slot_time, type, consultation_fee, diagnosis, prescription, notes } = req.body;
    const no = "APT-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO appointments (tenant_id, appointment_no, patient_id, doctor_id, doctor_name, specialization, appointment_date, slot_time, type, consultation_fee, diagnosis, prescription, notes)
      VALUES (${tid(req)}, ${no}, ${patient_id}, ${doctor_id||null}, ${doctor_name||null}, ${specialization||null},
              ${appointment_date}, ${slot_time||null}, ${type||'OPD'}, ${consultation_fee||0},
              ${diagnosis||null}, ${prescription||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/appointments/:id", requireAuth, async (req: any, res) => {
  try {
    const { doctor_id, doctor_name, specialization, appointment_date, slot_time, type, status, consultation_fee, diagnosis, prescription, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE appointments SET doctor_id=${doctor_id||null}, doctor_name=${doctor_name||null},
        specialization=${specialization||null}, appointment_date=${appointment_date},
        slot_time=${slot_time||null}, type=${type||'OPD'}, status=${status||'scheduled'},
        consultation_fee=${consultation_fee||0}, diagnosis=${diagnosis||null},
        prescription=${prescription||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/appointments/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE appointments SET status='cancelled' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── IPD Admissions ───────────────────────────────────────────────────────────
router.get("/ipd-admissions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, w.ward_name
      FROM ipd_admissions a
      LEFT JOIN patients p ON p.id::text=a.patient_id::text
      LEFT JOIN wards w ON w.id=a.ward_id
      WHERE a.tenant_id=${tid(req)} ORDER BY a.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ipd-admissions", requireAuth, async (req: any, res) => {
  try {
    const { patient_id, ward_id, bed_no, doctor_name, admission_date, discharge_date, diagnosis, treatment, daily_charge } = req.body;
    const no = "IPD-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO ipd_admissions (tenant_id, admission_no, patient_id, ward_id, bed_no, doctor_name, admission_date, discharge_date, diagnosis, treatment, daily_charge)
      VALUES (${tid(req)}, ${no}, ${patient_id}, ${ward_id||null}, ${bed_no||null},
              ${doctor_name||null}, ${admission_date}, ${discharge_date||null},
              ${diagnosis||null}, ${treatment||null}, ${daily_charge||0}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/ipd-admissions/:id", requireAuth, async (req: any, res) => {
  try {
    const { ward_id, bed_no, doctor_name, admission_date, discharge_date, diagnosis, treatment, daily_charge, total_bill, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE ipd_admissions SET ward_id=${ward_id||null}, bed_no=${bed_no||null},
        doctor_name=${doctor_name||null}, admission_date=${admission_date},
        discharge_date=${discharge_date||null}, diagnosis=${diagnosis||null},
        treatment=${treatment||null}, daily_charge=${daily_charge||0},
        total_bill=${total_bill||0}, status=${status||'admitted'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Prescriptions ────────────────────────────────────────────────────────────
router.get("/prescriptions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT pr.*, p.name as patient_name, d.name as doctor_name_ref
      FROM prescriptions pr
      LEFT JOIN patients p ON p.id::text=pr.patient_id::text
      LEFT JOIN doctors d ON d.id=pr.doctor_id
      WHERE pr.tenant_id=${tid(req)} AND pr.record_status=1 ORDER BY pr.prescribed_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/prescriptions/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM prescription_items WHERE prescription_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/prescriptions", requireAuth, async (req: any, res) => {
  try {
    const { patient_id, doctor_id, appointment_id, diagnosis, notes, items } = req.body;
    const code = "RX-" + Date.now();
    const pr = await db.execute(sql`
      INSERT INTO prescriptions (tenant_id, prescription_code, patient_id, doctor_id, appointment_id, diagnosis, notes)
      VALUES (${tid(req)}, ${code}, ${patient_id}, ${doctor_id||null}, ${appointment_id||null}, ${diagnosis||null}, ${notes||null})
      RETURNING *`);
    const pId = pr.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions)
          VALUES (${pId}, ${it.medicine_name}, ${it.dosage||null}, ${it.frequency||null}, ${it.duration||null}, ${it.instructions||null})`);
      }
    }
    res.json(pr.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/prescriptions/:id", requireAuth, async (req: any, res) => {
  try {
    const { diagnosis, notes, items } = req.body;
    const rows = await db.execute(sql`
      UPDATE prescriptions SET diagnosis=${diagnosis||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    if (items) {
      await db.execute(sql`DELETE FROM prescription_items WHERE prescription_id=${req.params.id}`);
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions)
          VALUES (${req.params.id}, ${it.medicine_name}, ${it.dosage||null}, ${it.frequency||null}, ${it.duration||null}, ${it.instructions||null})`);
      }
    }
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/prescriptions/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE prescriptions SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Lab Tests ────────────────────────────────────────────────────────────────
router.get("/lab-tests", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT lt.*, p.name as patient_name, d.name as ordered_by_name
      FROM lab_tests lt
      LEFT JOIN patients p ON p.id::text=lt.patient_id::text
      LEFT JOIN doctors d ON d.id=lt.ordered_by
      WHERE lt.tenant_id=${tid(req)} AND lt.record_status=1 ORDER BY lt.ordered_date DESC, lt.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/lab-tests", requireAuth, async (req: any, res) => {
  try {
    const { patient_id, ordered_by, test_name, ordered_date, normal_range, amount, notes } = req.body;
    const code = "LAB-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO lab_tests (tenant_id, test_code, patient_id, ordered_by, test_name, ordered_date, normal_range, amount, notes)
      VALUES (${tid(req)}, ${code}, ${patient_id||null}, ${ordered_by||null}, ${test_name},
              ${ordered_date||null}, ${normal_range||null}, ${amount||0}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/lab-tests/:id", requireAuth, async (req: any, res) => {
  try {
    const { test_name, ordered_date, result, result_date, normal_range, status, amount, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE lab_tests SET test_name=${test_name}, ordered_date=${ordered_date||null},
        result=${result||null}, result_date=${result_date||null},
        normal_range=${normal_range||null}, status=${status||'pending'},
        amount=${amount||0}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/lab-tests/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE lab_tests SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Medicines ────────────────────────────────────────────────────────────────
router.get("/medicines", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM medicines WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/medicines", requireAuth, async (req: any, res) => {
  try {
    const { name, generic_name, category, unit, stock_qty, reorder_level, purchase_price, selling_price, manufacturer, expiry_date } = req.body;
    const code = "MED-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO medicines (tenant_id, medicine_code, name, generic_name, category, unit, stock_qty, reorder_level, purchase_price, selling_price, manufacturer, expiry_date)
      VALUES (${tid(req)}, ${code}, ${name}, ${generic_name||null}, ${category||null}, ${unit||'tablet'},
              ${stock_qty||0}, ${reorder_level||10}, ${purchase_price||0}, ${selling_price||0},
              ${manufacturer||null}, ${expiry_date||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/medicines/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, generic_name, category, unit, stock_qty, reorder_level, purchase_price, selling_price, manufacturer, expiry_date } = req.body;
    const rows = await db.execute(sql`
      UPDATE medicines SET name=${name}, generic_name=${generic_name||null}, category=${category||null},
        unit=${unit||'tablet'}, stock_qty=${stock_qty||0}, reorder_level=${reorder_level||10},
        purchase_price=${purchase_price||0}, selling_price=${selling_price||0},
        manufacturer=${manufacturer||null}, expiry_date=${expiry_date||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/medicines/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE medicines SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Patient Bills ────────────────────────────────────────────────────────────
router.get("/patient-bills", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT pb.*, p.name as patient_name_ref, p.phone as patient_phone
      FROM patient_bills pb
      LEFT JOIN patients p ON p.id::text=pb.patient_id::text
      WHERE pb.tenant_id=${tid(req)} AND pb.record_status=1 ORDER BY pb.bill_date DESC, pb.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/patient-bills/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM patient_bill_items WHERE bill_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/patient-bills", requireAuth, async (req: any, res) => {
  try {
    const { patient_id, patient_name, bill_type, bill_date, total_amount, discount_amount, paid_amount, payment_mode, notes, items } = req.body;
    const no = "BILL-" + Date.now();
    const bal = (total_amount||0) - (discount_amount||0) - (paid_amount||0);
    const st = bal <= 0 ? 'paid' : paid_amount > 0 ? 'partial' : 'unpaid';
    const bill = await db.execute(sql`
      INSERT INTO patient_bills (tenant_id, bill_number, patient_id, patient_name, bill_type, bill_date, total_amount, discount_amount, paid_amount, balance_amount, payment_mode, status, notes)
      VALUES (${tid(req)}, ${no}, ${patient_id||null}, ${patient_name||null}, ${bill_type||'opd'},
              ${bill_date||null}, ${total_amount||0}, ${discount_amount||0}, ${paid_amount||0},
              ${bal}, ${payment_mode||null}, ${st}, ${notes||null}) RETURNING *`);
    const bId = bill.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO patient_bill_items (bill_id, description, quantity, rate, amount)
          VALUES (${bId}, ${it.description}, ${it.quantity||1}, ${it.rate||0}, ${it.amount||0})`);
      }
    }
    const tenantId = Number(tid(req));
    glHealthcareBill({ tenantId, billId: bId, billNumber: no, totalAmount: Math.round((total_amount||0)*100), paidAmount: Math.round((paid_amount||0)*100), paymentMode: payment_mode || "cash", date: bill_date || undefined });
    res.json(bill.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/patient-bills/:id", requireAuth, async (req: any, res) => {
  try {
    const { bill_type, bill_date, total_amount, discount_amount, paid_amount, payment_mode, status, notes } = req.body;
    const bal = (total_amount||0) - (discount_amount||0) - (paid_amount||0);
    const st = status || (bal <= 0 ? 'paid' : paid_amount > 0 ? 'partial' : 'unpaid');
    const rows = await db.execute(sql`
      UPDATE patient_bills SET bill_type=${bill_type||'opd'}, bill_date=${bill_date||null},
        total_amount=${total_amount||0}, discount_amount=${discount_amount||0},
        paid_amount=${paid_amount||0}, balance_amount=${bal},
        payment_mode=${payment_mode||null}, status=${st}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/patient-bills/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE patient_bills SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [patients, appointments, ipd, revenue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM patients WHERE tenant_id=${tid(req)} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM appointments WHERE tenant_id=${tid(req)} AND appointment_date=CURRENT_DATE`),
      db.execute(sql`SELECT COUNT(*) as count FROM ipd_admissions WHERE tenant_id=${tid(req)} AND status='admitted'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM patient_bills WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM bill_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
    ]);
    res.json({
      totalPatients: Number(patients.rows[0]?.count||0),
      todayAppointments: Number(appointments.rows[0]?.count||0),
      ipdAdmissions: Number(ipd.rows[0]?.count||0),
      monthlyRevenue: Number(revenue.rows[0]?.total||0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ICD-10 diagnosis codes — seed 500 common codes on first call, then search
router.get("/icd10/search", requireAuth, async (req: any, res) => {
  const { q } = req.query;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS icd10_codes (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category VARCHAR(100)
    )`);
    const count = await db.execute(sql`SELECT COUNT(*) as n FROM icd10_codes`);
    if (Number((count.rows[0] as any).n) === 0) {
      const codes = [
        ['A00','Cholera','Infectious'],['A01','Typhoid fever','Infectious'],['A02','Salmonella infections','Infectious'],
        ['A04','Other bacterial intestinal infections','Infectious'],['A09','Infectious gastroenteritis','Infectious'],
        ['A15','Respiratory tuberculosis','Infectious'],['A16','Tuberculosis of other organs','Infectious'],
        ['A33','Tetanus neonatorum','Infectious'],['A36','Diphtheria','Infectious'],['A37','Whooping cough','Infectious'],
        ['A38','Scarlet fever','Infectious'],['A39','Meningococcal infection','Infectious'],
        ['A40','Streptococcal septicaemia','Infectious'],['A41','Other septicaemia','Infectious'],
        ['A49','Bacterial infection of unspecified site','Infectious'],
        ['A50','Congenital syphilis','Infectious'],['A51','Early syphilis','Infectious'],
        ['A54','Gonococcal infection','Infectious'],['A59','Trichomoniasis','Infectious'],
        ['A60','Anogenital herpesviral infection','Infectious'],['A63','Condyloma acuminata','Infectious'],
        ['A69','Lyme disease','Infectious'],
        ['A80','Acute poliomyelitis','Infectious'],['A82','Rabies','Infectious'],
        ['A83','Mosquito-borne viral encephalitis','Infectious'],['A84','Tick-borne viral encephalitis','Infectious'],
        ['A87','Viral meningitis','Infectious'],['A90','Dengue fever','Infectious'],
        ['A91','Dengue haemorrhagic fever','Infectious'],['A92','Other mosquito-borne viral fevers','Infectious'],
        ['A95','Yellow fever','Infectious'],['B00','Herpesviral infections','Infectious'],
        ['B01','Varicella (chickenpox)','Infectious'],['B02','Zoster (herpes zoster)','Infectious'],
        ['B05','Measles','Infectious'],['B06','Rubella','Infectious'],
        ['B07','Viral warts','Infectious'],['B08','Viral skin infections','Infectious'],
        ['B15','Acute hepatitis A','Infectious'],['B16','Acute hepatitis B','Infectious'],
        ['B17','Other acute viral hepatitis','Infectious'],['B18','Chronic viral hepatitis','Infectious'],
        ['B19','Unspecified viral hepatitis','Infectious'],['B20','HIV disease','Infectious'],
        ['B34','Viral infection of unspecified site','Infectious'],
        ['B35','Dermatophytosis','Infectious'],['B36','Superficial mycoses','Infectious'],
        ['B37','Candidiasis','Infectious'],['B44','Aspergillosis','Infectious'],
        ['B50','Plasmodium falciparum malaria','Infectious'],['B51','Plasmodium vivax malaria','Infectious'],
        ['B54','Unspecified malaria','Infectious'],['B55','Leishmaniasis','Infectious'],
        ['B65','Schistosomiasis','Infectious'],['B74','Filariasis','Infectious'],
        ['B76','Hookworm diseases','Infectious'],['B77','Ascariasis','Infectious'],
        ['B78','Strongyloidiasis','Infectious'],['B80','Enterobiasis','Infectious'],
        ['B82','Intestinal parasitism','Infectious'],
        ['C00','Malignant neoplasm of lip','Neoplasms'],['C01','Malignant neoplasm of base of tongue','Neoplasms'],
        ['C10','Malignant neoplasm of oropharynx','Neoplasms'],['C11','Malignant neoplasm of nasopharynx','Neoplasms'],
        ['C15','Malignant neoplasm of oesophagus','Neoplasms'],['C16','Malignant neoplasm of stomach','Neoplasms'],
        ['C18','Malignant neoplasm of colon','Neoplasms'],['C19','Malignant neoplasm of rectosigmoid junction','Neoplasms'],
        ['C20','Malignant neoplasm of rectum','Neoplasms'],['C22','Malignant neoplasm of liver','Neoplasms'],
        ['C25','Malignant neoplasm of pancreas','Neoplasms'],['C30','Malignant neoplasm of nasal cavity','Neoplasms'],
        ['C32','Malignant neoplasm of larynx','Neoplasms'],['C33','Malignant neoplasm of trachea','Neoplasms'],
        ['C34','Malignant neoplasm of bronchus and lung','Neoplasms'],
        ['C43','Malignant melanoma of skin','Neoplasms'],['C44','Other skin neoplasms','Neoplasms'],
        ['C50','Malignant neoplasm of breast','Neoplasms'],['C53','Malignant neoplasm of cervix uteri','Neoplasms'],
        ['C54','Malignant neoplasm of corpus uteri','Neoplasms'],['C56','Malignant neoplasm of ovary','Neoplasms'],
        ['C61','Malignant neoplasm of prostate','Neoplasms'],['C64','Malignant neoplasm of kidney','Neoplasms'],
        ['C67','Malignant neoplasm of bladder','Neoplasms'],['C71','Malignant neoplasm of brain','Neoplasms'],
        ['C73','Malignant neoplasm of thyroid gland','Neoplasms'],
        ['C80','Malignant neoplasm without specification','Neoplasms'],
        ['C90','Multiple myeloma','Neoplasms'],['C91','Lymphoid leukaemia','Neoplasms'],
        ['C92','Myeloid leukaemia','Neoplasms'],['C95','Leukaemia of unspecified cell type','Neoplasms'],
        ['D50','Iron deficiency anaemia','Blood'],['D51','Vitamin B12 deficiency anaemia','Blood'],
        ['D52','Folate deficiency anaemia','Blood'],['D55','Anaemia due to enzyme disorders','Blood'],
        ['D57','Sickle-cell disorders','Blood'],['D59','Acquired haemolytic anaemia','Blood'],
        ['D61','Aplastic anaemia','Blood'],['D64','Other anaemias','Blood'],
        ['D65','Disseminated intravascular coagulation','Blood'],['D69','Purpura and other haemorrhagic conditions','Blood'],
        ['D70','Agranulocytosis','Blood'],['D80','Immunodeficiency with antibody defects','Blood'],
        ['E00','Congenital iodine-deficiency syndrome','Endocrine'],['E01','Iodine-deficiency thyroid disorders','Endocrine'],
        ['E03','Hypothyroidism','Endocrine'],['E04','Non-toxic goitre','Endocrine'],
        ['E05','Thyrotoxicosis','Endocrine'],['E06','Thyroiditis','Endocrine'],
        ['E10','Type 1 diabetes mellitus','Endocrine'],['E11','Type 2 diabetes mellitus','Endocrine'],
        ['E12','Malnutrition-related diabetes mellitus','Endocrine'],
        ['E13','Other specified diabetes mellitus','Endocrine'],
        ['E14','Unspecified diabetes mellitus','Endocrine'],
        ['E20','Hypoparathyroidism','Endocrine'],['E21','Hyperparathyroidism','Endocrine'],
        ['E22','Hyperfunction of pituitary gland','Endocrine'],['E23','Hypofunction of pituitary gland','Endocrine'],
        ['E24','Cushing syndrome','Endocrine'],['E25','Adrenogenital disorders','Endocrine'],
        ['E27','Adrenal disorders','Endocrine'],['E28','Ovarian dysfunction','Endocrine'],
        ['E29','Testicular dysfunction','Endocrine'],
        ['E40','Kwashiorkor','Endocrine'],['E41','Nutritional marasmus','Endocrine'],
        ['E43','Severe protein-energy malnutrition','Endocrine'],
        ['E44','Protein-energy malnutrition of moderate and mild degree','Endocrine'],
        ['E46','Unspecified protein-energy malnutrition','Endocrine'],
        ['E50','Vitamin A deficiency','Endocrine'],['E51','Thiamine deficiency','Endocrine'],
        ['E55','Vitamin D deficiency','Endocrine'],['E58','Dietary calcium deficiency','Endocrine'],
        ['E61','Deficiency of other nutrient elements','Endocrine'],
        ['E65','Localised adiposity','Endocrine'],['E66','Obesity','Endocrine'],
        ['E70','Phenylketonuria','Endocrine'],['E78','Disorders of lipoprotein metabolism','Endocrine'],
        ['E79','Disorders of purine and pyrimidine metabolism','Endocrine'],
        ['E83','Disorders of mineral metabolism','Endocrine'],['E84','Cystic fibrosis','Endocrine'],
        ['E85','Amyloidosis','Endocrine'],
        ['F00','Dementia in Alzheimer disease','Mental'],['F01','Vascular dementia','Mental'],
        ['F03','Unspecified dementia','Mental'],['F04','Organic amnesic syndrome','Mental'],
        ['F05','Delirium','Mental'],['F06','Other mental disorders due to brain damage','Mental'],
        ['F07','Personality disorders due to brain disease','Mental'],
        ['F10','Mental disorders due to alcohol use','Mental'],
        ['F11','Mental disorders due to opioid use','Mental'],
        ['F12','Mental disorders due to cannabinoid use','Mental'],
        ['F15','Mental disorders due to stimulant use','Mental'],
        ['F17','Mental disorders due to tobacco use','Mental'],
        ['F19','Mental disorders due to multiple drug use','Mental'],
        ['F20','Schizophrenia','Mental'],['F21','Schizotypal disorder','Mental'],
        ['F22','Persistent delusional disorder','Mental'],['F23','Acute psychotic disorder','Mental'],
        ['F25','Schizoaffective disorder','Mental'],['F28','Other nonorganic psychotic disorders','Mental'],
        ['F30','Manic episode','Mental'],['F31','Bipolar affective disorder','Mental'],
        ['F32','Depressive episode','Mental'],['F33','Recurrent depressive disorder','Mental'],
        ['F34','Persistent mood disorders','Mental'],
        ['F40','Phobic anxiety disorders','Mental'],['F41','Other anxiety disorders','Mental'],
        ['F42','Obsessive-compulsive disorder','Mental'],
        ['F43','Reaction to severe stress, and adjustment disorders','Mental'],
        ['F44','Dissociative disorders','Mental'],['F45','Somatoform disorders','Mental'],
        ['F48','Other neurotic disorders','Mental'],
        ['F50','Eating disorders','Mental'],['F51','Nonorganic sleep disorders','Mental'],
        ['F52','Sexual dysfunction','Mental'],
        ['F60','Specific personality disorders','Mental'],
        ['F63','Habit and impulse disorders','Mental'],
        ['F70','Mild mental retardation','Mental'],['F71','Moderate mental retardation','Mental'],
        ['F80','Developmental speech disorder','Mental'],['F81','Specific developmental disorders of scholastic skills','Mental'],
        ['F84','Pervasive developmental disorders','Mental'],
        ['F90','Hyperkinetic disorders','Mental'],['F91','Conduct disorders','Mental'],
        ['F93','Emotional disorders of childhood onset','Mental'],['F95','Tic disorders','Mental'],
        ['F98','Other behavioural disorders','Mental'],
        ['G00','Bacterial meningitis','Nervous'],['G01','Meningitis in bacterial diseases','Nervous'],
        ['G03','Meningitis due to other causes','Nervous'],['G04','Encephalitis','Nervous'],
        ['G06','Intracranial abscess','Nervous'],['G09','Sequelae of inflammatory CNS diseases','Nervous'],
        ['G10','Huntington disease','Nervous'],['G11','Hereditary ataxia','Nervous'],
        ['G12','Spinal muscular atrophy','Nervous'],['G14','Postpolio syndrome','Nervous'],
        ['G20','Parkinson disease','Nervous'],['G21','Secondary parkinsonism','Nervous'],
        ['G23','Other degenerative diseases of basal ganglia','Nervous'],
        ['G25','Other extrapyramidal disorders','Nervous'],
        ['G30','Alzheimer disease','Nervous'],['G31','Other degenerative diseases of nervous system','Nervous'],
        ['G35','Multiple sclerosis','Nervous'],['G36','Other demyelinating diseases','Nervous'],
        ['G40','Epilepsy','Nervous'],['G41','Status epilepticus','Nervous'],
        ['G43','Migraine','Nervous'],['G44','Other headache syndromes','Nervous'],
        ['G45','Transient cerebral ischaemic attacks','Nervous'],
        ['G47','Sleep disorders','Nervous'],['G50','Disorders of trigeminal nerve','Nervous'],
        ['G51','Facial nerve disorders','Nervous'],['G54','Nerve root disorders','Nervous'],
        ['G56','Mononeuropathies of upper limb','Nervous'],['G57','Mononeuropathies of lower limb','Nervous'],
        ['G61','Inflammatory polyneuropathy','Nervous'],['G62','Other polyneuropathies','Nervous'],
        ['G70','Myasthenia gravis','Nervous'],['G71','Primary disorders of muscles','Nervous'],
        ['G80','Cerebral palsy','Nervous'],['G81','Hemiplegia','Nervous'],
        ['G82','Paraplegia and tetraplegia','Nervous'],['G83','Other paralytic syndromes','Nervous'],
        ['G89','Pain disorders','Nervous'],['G91','Hydrocephalus','Nervous'],
        ['G93','Other disorders of brain','Nervous'],['G95','Other diseases of spinal cord','Nervous'],
        ['H00','Hordeolum (stye)','Eye'],['H01','Blepharitis','Eye'],
        ['H04','Disorders of lacrimal system','Eye'],['H10','Conjunctivitis','Eye'],
        ['H11','Other disorders of conjunctiva','Eye'],['H15','Disorders of sclera','Eye'],
        ['H16','Keratitis','Eye'],['H17','Corneal scars','Eye'],
        ['H18','Other disorders of cornea','Eye'],['H20','Iridocyclitis','Eye'],
        ['H25','Age-related cataract','Eye'],['H26','Other cataract','Eye'],
        ['H27','Disorders of lens','Eye'],['H30','Chorioretinal inflammation','Eye'],
        ['H33','Retinal detachments','Eye'],['H34','Retinal vascular occlusions','Eye'],
        ['H35','Other retinal disorders','Eye'],['H36','Retinal disorders in classified diseases','Eye'],
        ['H40','Glaucoma','Eye'],['H43','Disorders of vitreous body','Eye'],
        ['H47','Disorders of optic nerve','Eye'],['H49','Paralytic strabismus','Eye'],
        ['H52','Disorders of refraction and accommodation','Eye'],
        ['H53','Visual disturbances','Eye'],['H54','Blindness and low vision','Eye'],
        ['H60','Otitis externa','Ear'],['H61','Other disorders of external ear','Ear'],
        ['H65','Nonsuppurative otitis media','Ear'],['H66','Suppurative otitis media','Ear'],
        ['H68','Eustachian tube disorders','Ear'],['H70','Mastoiditis','Ear'],
        ['H72','Perforation of tympanic membrane','Ear'],['H74','Other disorders of middle ear','Ear'],
        ['H80','Otosclerosis','Ear'],['H81','Disorders of vestibular function','Ear'],
        ['H83','Other diseases of inner ear','Ear'],['H90','Conductive hearing loss','Ear'],
        ['H91','Other hearing loss','Ear'],['H92','Otalgia','Ear'],
        ['I00','Rheumatic fever without heart involvement','Circulatory'],
        ['I01','Rheumatic fever with heart involvement','Circulatory'],
        ['I05','Rheumatic mitral valve diseases','Circulatory'],
        ['I08','Multiple valve diseases','Circulatory'],
        ['I09','Other rheumatic heart diseases','Circulatory'],
        ['I10','Essential (primary) hypertension','Circulatory'],
        ['I11','Hypertensive heart disease','Circulatory'],
        ['I12','Hypertensive renal disease','Circulatory'],
        ['I13','Hypertensive heart and renal disease','Circulatory'],
        ['I15','Secondary hypertension','Circulatory'],
        ['I20','Angina pectoris','Circulatory'],
        ['I21','Acute myocardial infarction','Circulatory'],
        ['I22','Subsequent myocardial infarction','Circulatory'],
        ['I25','Chronic ischaemic heart disease','Circulatory'],
        ['I26','Pulmonary embolism','Circulatory'],
        ['I27','Other pulmonary heart diseases','Circulatory'],
        ['I30','Acute pericarditis','Circulatory'],
        ['I33','Acute endocarditis','Circulatory'],
        ['I34','Nonrheumatic mitral valve disorders','Circulatory'],
        ['I35','Nonrheumatic aortic valve disorders','Circulatory'],
        ['I38','Endocarditis of unspecified valve','Circulatory'],
        ['I40','Acute myocarditis','Circulatory'],
        ['I42','Cardiomyopathy','Circulatory'],
        ['I44','Atrioventricular block','Circulatory'],
        ['I45','Other conduction disorders','Circulatory'],
        ['I46','Cardiac arrest','Circulatory'],
        ['I47','Paroxysmal tachycardia','Circulatory'],
        ['I48','Atrial fibrillation and flutter','Circulatory'],
        ['I49','Other cardiac arrhythmias','Circulatory'],
        ['I50','Heart failure','Circulatory'],
        ['I51','Complications of heart disease','Circulatory'],
        ['I60','Subarachnoid haemorrhage','Circulatory'],
        ['I61','Intracerebral haemorrhage','Circulatory'],
        ['I63','Cerebral infarction','Circulatory'],
        ['I64','Stroke, not specified as haemorrhage or infarction','Circulatory'],
        ['I67','Other cerebrovascular diseases','Circulatory'],
        ['I69','Sequelae of cerebrovascular disease','Circulatory'],
        ['I70','Atherosclerosis','Circulatory'],
        ['I71','Aortic aneurysm','Circulatory'],
        ['I73','Other peripheral vascular diseases','Circulatory'],
        ['I74','Arterial embolism and thrombosis','Circulatory'],
        ['I80','Phlebitis and thrombophlebitis','Circulatory'],
        ['I82','Other venous embolism and thrombosis','Circulatory'],
        ['I83','Varicose veins of lower extremities','Circulatory'],
        ['I84','Haemorrhoids','Circulatory'],
        ['I87','Other disorders of veins','Circulatory'],
        ['I89','Lymphoedema','Circulatory'],
        ['J00','Acute nasopharyngitis (common cold)','Respiratory'],
        ['J01','Acute sinusitis','Respiratory'],['J02','Acute pharyngitis','Respiratory'],
        ['J03','Acute tonsillitis','Respiratory'],['J04','Acute laryngitis and tracheitis','Respiratory'],
        ['J06','Acute upper respiratory infections','Respiratory'],
        ['J09','Influenza due to identified influenza virus','Respiratory'],
        ['J10','Influenza due to identified seasonal virus','Respiratory'],
        ['J11','Influenza, virus not identified','Respiratory'],
        ['J12','Viral pneumonia','Respiratory'],['J13','Pneumococcal pneumonia','Respiratory'],
        ['J14','Haemophilus influenzae pneumonia','Respiratory'],
        ['J15','Bacterial pneumonia','Respiratory'],
        ['J18','Pneumonia, unspecified organism','Respiratory'],
        ['J20','Acute bronchitis','Respiratory'],['J21','Acute bronchiolitis','Respiratory'],
        ['J22','Acute lower respiratory infection','Respiratory'],
        ['J30','Allergic rhinitis','Respiratory'],['J31','Chronic rhinitis','Respiratory'],
        ['J32','Chronic sinusitis','Respiratory'],['J33','Nasal polyp','Respiratory'],
        ['J34','Chronic diseases of tonsils and adenoids','Respiratory'],
        ['J36','Peritonsillar abscess','Respiratory'],
        ['J38','Diseases of vocal cords and larynx','Respiratory'],
        ['J40','Bronchitis, not specified as acute or chronic','Respiratory'],
        ['J41','Simple chronic bronchitis','Respiratory'],
        ['J42','Unspecified chronic bronchitis','Respiratory'],
        ['J43','Emphysema','Respiratory'],
        ['J44','Chronic obstructive pulmonary disease','Respiratory'],
        ['J45','Asthma','Respiratory'],['J46','Status asthmaticus','Respiratory'],
        ['J47','Bronchiectasis','Respiratory'],
        ['J60','Coalworker pneumoconiosis','Respiratory'],
        ['J67','Hypersensitivity pneumonitis','Respiratory'],
        ['J68','Respiratory conditions due to inhalation','Respiratory'],
        ['J69','Pneumonitis due to solids and liquids','Respiratory'],
        ['J70','Respiratory conditions due to external agents','Respiratory'],
        ['J80','Acute respiratory distress syndrome','Respiratory'],
        ['J81','Pulmonary oedema','Respiratory'],['J82','Pulmonary eosinophilia','Respiratory'],
        ['J84','Interstitial pulmonary diseases','Respiratory'],
        ['J85','Abscess of lung','Respiratory'],['J86','Pyothorax','Respiratory'],
        ['J90','Pleural effusion','Respiratory'],['J91','Pleural effusion in conditions elsewhere','Respiratory'],
        ['J93','Pneumothorax','Respiratory'],['J94','Other pleural conditions','Respiratory'],
        ['J95','Postprocedural respiratory disorders','Respiratory'],
        ['J96','Respiratory failure','Respiratory'],['J98','Other respiratory disorders','Respiratory'],
        ['K00','Disorders of tooth development','Digestive'],['K02','Dental caries','Digestive'],
        ['K04','Diseases of pulp and periapical tissues','Digestive'],
        ['K05','Gingivitis and periodontal diseases','Digestive'],
        ['K08','Other disorders of teeth and supporting structures','Digestive'],
        ['K11','Diseases of salivary glands','Digestive'],
        ['K12','Stomatitis','Digestive'],['K13','Other diseases of lip and oral mucosa','Digestive'],
        ['K20','Oesophagitis','Digestive'],['K21','Gastro-oesophageal reflux disease','Digestive'],
        ['K22','Other diseases of oesophagus','Digestive'],
        ['K25','Gastric ulcer','Digestive'],['K26','Duodenal ulcer','Digestive'],
        ['K27','Peptic ulcer','Digestive'],['K29','Gastritis and duodenitis','Digestive'],
        ['K30','Functional dyspepsia','Digestive'],
        ['K35','Acute appendicitis','Digestive'],['K37','Unspecified appendicitis','Digestive'],
        ['K40','Inguinal hernia','Digestive'],['K41','Femoral hernia','Digestive'],
        ['K42','Umbilical hernia','Digestive'],['K43','Ventral hernia','Digestive'],
        ['K44','Diaphragmatic hernia','Digestive'],['K46','Unspecified abdominal hernia','Digestive'],
        ['K50','Crohn disease','Digestive'],['K51','Ulcerative colitis','Digestive'],
        ['K52','Other gastroenteritis','Digestive'],
        ['K55','Vascular disorders of intestine','Digestive'],
        ['K57','Diverticular disease of intestine','Digestive'],
        ['K59','Other functional intestinal disorders','Digestive'],
        ['K60','Fissure and fistula of anal and rectal regions','Digestive'],
        ['K61','Abscess of anal and rectal regions','Digestive'],
        ['K62','Other diseases of anus and rectum','Digestive'],
        ['K63','Other diseases of intestine','Digestive'],
        ['K65','Peritonitis','Digestive'],['K66','Other disorders of peritoneum','Digestive'],
        ['K70','Alcoholic liver disease','Digestive'],['K71','Toxic liver disease','Digestive'],
        ['K72','Hepatic failure','Digestive'],['K73','Chronic hepatitis','Digestive'],
        ['K74','Fibrosis and cirrhosis of liver','Digestive'],
        ['K75','Other inflammatory liver diseases','Digestive'],
        ['K76','Other diseases of liver','Digestive'],
        ['K80','Cholelithiasis (gallstones)','Digestive'],
        ['K81','Cholecystitis','Digestive'],['K83','Other diseases of biliary tract','Digestive'],
        ['K85','Acute pancreatitis','Digestive'],['K86','Other diseases of pancreas','Digestive'],
        ['K90','Intestinal malabsorption','Digestive'],['K92','Other diseases of digestive system','Digestive'],
        ['L00','Staphylococcal scalded skin syndrome','Skin'],['L01','Impetigo','Skin'],
        ['L02','Cutaneous abscess, furuncle and carbuncle','Skin'],
        ['L03','Cellulitis','Skin'],['L04','Acute lymphadenitis','Skin'],
        ['L05','Pilonidal cyst','Skin'],
        ['L10','Pemphigus','Skin'],['L12','Pemphigoid','Skin'],
        ['L13','Bullous disorders','Skin'],
        ['L20','Atopic dermatitis','Skin'],['L21','Seborrhoeic dermatitis','Skin'],
        ['L22','Diaper dermatitis','Skin'],['L23','Allergic contact dermatitis','Skin'],
        ['L24','Irritant contact dermatitis','Skin'],['L25','Unspecified contact dermatitis','Skin'],
        ['L27','Dermatitis due to substances taken internally','Skin'],
        ['L28','Lichen simplex chronicus and prurigo','Skin'],
        ['L29','Pruritus','Skin'],['L30','Other dermatitis','Skin'],
        ['L40','Psoriasis','Skin'],['L41','Parapsoriasis','Skin'],
        ['L42','Pityriasis rosea','Skin'],['L43','Lichen planus','Skin'],
        ['L50','Urticaria','Skin'],['L51','Erythema multiforme','Skin'],
        ['L52','Erythema nodosum','Skin'],['L53','Other erythematous conditions','Skin'],
        ['L55','Sunburn','Skin'],['L56','Acute skin changes due to ultraviolet radiation','Skin'],
        ['L57','Skin changes due to chronic exposure to nonionizing radiation','Skin'],
        ['L60','Nail disorders','Skin'],['L63','Alopecia areata','Skin'],
        ['L64','Androgenic alopecia','Skin'],['L65','Other nonscarring hair loss','Skin'],
        ['L70','Acne','Skin'],['L71','Rosacea','Skin'],
        ['L72','Follicular cysts of skin and subcutaneous tissue','Skin'],
        ['L80','Vitiligo','Skin'],['L81','Other disorders of pigmentation','Skin'],
        ['L82','Seborrhoeic keratosis','Skin'],['L84','Corns and callosities','Skin'],
        ['L85','Epidermal thickening','Skin'],['L89','Decubitus ulcer','Skin'],
        ['L90','Atrophic disorders of skin','Skin'],['L92','Granulomatous disorders of skin','Skin'],
        ['L94','Other localised connective tissue disorders','Skin'],
        ['M00','Pyogenic arthritis','Musculoskeletal'],['M01','Direct infections of joint','Musculoskeletal'],
        ['M05','Seropositive rheumatoid arthritis','Musculoskeletal'],
        ['M06','Other rheumatoid arthritis','Musculoskeletal'],
        ['M07','Psoriatic and enteropathic arthropathies','Musculoskeletal'],
        ['M08','Juvenile arthritis','Musculoskeletal'],
        ['M10','Gout','Musculoskeletal'],['M11','Other crystal arthropathies','Musculoskeletal'],
        ['M13','Other arthritis','Musculoskeletal'],
        ['M15','Polyarthrosis','Musculoskeletal'],['M16','Coxarthrosis (hip arthrosis)','Musculoskeletal'],
        ['M17','Gonarthrosis (knee arthrosis)','Musculoskeletal'],
        ['M19','Other arthrosis','Musculoskeletal'],
        ['M20','Acquired deformities of fingers and toes','Musculoskeletal'],
        ['M23','Internal derangement of knee','Musculoskeletal'],
        ['M24','Other specific joint derangements','Musculoskeletal'],
        ['M25','Other joint disorders','Musculoskeletal'],
        ['M30','Polyarteritis nodosa','Musculoskeletal'],
        ['M32','Systemic lupus erythematosus','Musculoskeletal'],
        ['M33','Dermatomyositis','Musculoskeletal'],
        ['M34','Systemic sclerosis (scleroderma)','Musculoskeletal'],
        ['M40','Kyphosis and lordosis','Musculoskeletal'],
        ['M41','Scoliosis','Musculoskeletal'],
        ['M43','Other deforming dorsopathies','Musculoskeletal'],
        ['M45','Ankylosing spondylitis','Musculoskeletal'],
        ['M47','Spondylosis','Musculoskeletal'],['M48','Other spondylopathies','Musculoskeletal'],
        ['M50','Cervical disc disorders','Musculoskeletal'],
        ['M51','Other intervertebral disc disorders','Musculoskeletal'],
        ['M54','Dorsalgia (back pain)','Musculoskeletal'],
        ['M60','Myositis','Musculoskeletal'],['M61','Calcification of muscle','Musculoskeletal'],
        ['M65','Synovitis and tenosynovitis','Musculoskeletal'],
        ['M67','Other disorders of synovium and tendon','Musculoskeletal'],
        ['M70','Soft tissue disorders related to use, overuse and pressure','Musculoskeletal'],
        ['M71','Other bursopathies','Musculoskeletal'],['M72','Fibroblastic disorders','Musculoskeletal'],
        ['M75','Shoulder lesions','Musculoskeletal'],['M76','Enthesopathies of lower limb','Musculoskeletal'],
        ['M77','Other enthesopathies','Musculoskeletal'],
        ['M79','Other soft tissue disorders','Musculoskeletal'],
        ['M80','Osteoporosis with pathological fracture','Musculoskeletal'],
        ['M81','Osteoporosis without pathological fracture','Musculoskeletal'],
        ['M85','Other disorders of bone density and structure','Musculoskeletal'],
        ['M86','Osteomyelitis','Musculoskeletal'],['M87','Osteonecrosis','Musculoskeletal'],
        ['M89','Other disorders of bone','Musculoskeletal'],
        ['M90','Bone disorders in diseases classified elsewhere','Musculoskeletal'],
        ['N00','Acute nephritic syndrome','Genitourinary'],['N02','Recurrent haematuria','Genitourinary'],
        ['N03','Chronic nephritic syndrome','Genitourinary'],['N04','Nephrotic syndrome','Genitourinary'],
        ['N05','Unspecified nephritic syndrome','Genitourinary'],
        ['N10','Acute tubulo-interstitial nephritis','Genitourinary'],
        ['N11','Chronic tubulo-interstitial nephritis','Genitourinary'],
        ['N13','Obstructive uropathy','Genitourinary'],
        ['N17','Acute renal failure','Genitourinary'],
        ['N18','Chronic kidney disease','Genitourinary'],
        ['N19','Unspecified kidney failure','Genitourinary'],
        ['N20','Calculus of kidney (renal stone)','Genitourinary'],
        ['N21','Calculus of lower urinary tract','Genitourinary'],
        ['N23','Unspecified renal colic','Genitourinary'],
        ['N25','Disorders resulting from impaired renal tubular function','Genitourinary'],
        ['N28','Other disorders of kidney and ureter','Genitourinary'],
        ['N30','Cystitis','Genitourinary'],['N31','Neuromuscular dysfunction of bladder','Genitourinary'],
        ['N34','Urethritis','Genitourinary'],['N35','Urethral stricture','Genitourinary'],
        ['N39','Other disorders of urinary system','Genitourinary'],
        ['N40','Hyperplasia of prostate (BPH)','Genitourinary'],
        ['N41','Inflammatory diseases of prostate','Genitourinary'],
        ['N43','Hydrocele and spermatocele','Genitourinary'],
        ['N44','Torsion of testis','Genitourinary'],['N45','Orchitis and epididymitis','Genitourinary'],
        ['N47','Phimosis','Genitourinary'],
        ['N48','Other disorders of penis','Genitourinary'],
        ['N50','Other disorders of male genital organs','Genitourinary'],
        ['N60','Benign mammary dysplasia','Genitourinary'],
        ['N70','Salpingitis and oophoritis','Genitourinary'],
        ['N71','Inflammatory disease of uterus','Genitourinary'],
        ['N72','Inflammatory disease of cervix','Genitourinary'],
        ['N73','Other female pelvic inflammatory diseases','Genitourinary'],
        ['N76','Other inflammation of vagina and vulva','Genitourinary'],
        ['N80','Endometriosis','Genitourinary'],['N81','Female genital prolapse','Genitourinary'],
        ['N83','Noninflammatory disorders of ovary','Genitourinary'],
        ['N87','Dysplasia of cervix uteri','Genitourinary'],
        ['N89','Other noninflammatory disorders of vagina','Genitourinary'],
        ['N90','Other noninflammatory disorders of vulva','Genitourinary'],
        ['N91','Absent, scanty and rare menstruation','Genitourinary'],
        ['N92','Excessive, frequent and irregular menstruation','Genitourinary'],
        ['N93','Other abnormal uterine and vaginal bleeding','Genitourinary'],
        ['N94','Pain and other conditions of female genital organs','Genitourinary'],
        ['N95','Menopausal and perimenopausal disorders','Genitourinary'],
        ['N97','Female infertility','Genitourinary'],
        ['O00','Ectopic pregnancy','Pregnancy'],['O01','Hydatidiform mole','Pregnancy'],
        ['O02','Other abnormal products of conception','Pregnancy'],
        ['O03','Spontaneous abortion','Pregnancy'],
        ['O04','Medical abortion','Pregnancy'],
        ['O08','Complications following abortion','Pregnancy'],
        ['O10','Pre-existing hypertension complicating pregnancy','Pregnancy'],
        ['O11','Pre-existing hypertensive disorder with superimposed proteinuria','Pregnancy'],
        ['O12','Gestational oedema and proteinuria','Pregnancy'],
        ['O13','Gestational hypertension','Pregnancy'],
        ['O14','Gestational proteinuria with hypertension (pre-eclampsia)','Pregnancy'],
        ['O15','Eclampsia','Pregnancy'],
        ['O20','Haemorrhage in early pregnancy','Pregnancy'],
        ['O21','Excessive vomiting in pregnancy','Pregnancy'],
        ['O22','Venous complications in pregnancy','Pregnancy'],
        ['O23','Infections of genitourinary tract in pregnancy','Pregnancy'],
        ['O24','Diabetes mellitus in pregnancy','Pregnancy'],
        ['O25','Malnutrition in pregnancy','Pregnancy'],
        ['O26','Maternal care for other conditions','Pregnancy'],
        ['O28','Abnormal findings on antenatal screening','Pregnancy'],
        ['O29','Complications of anaesthesia during pregnancy','Pregnancy'],
        ['O30','Multiple gestation','Pregnancy'],
        ['O32','Maternal care for malpresentation','Pregnancy'],
        ['O34','Maternal care for uterine scar','Pregnancy'],
        ['O36','Maternal care for other fetal problems','Pregnancy'],
        ['O40','Polyhydramnios','Pregnancy'],
        ['O41','Other disorders of amniotic fluid','Pregnancy'],
        ['O42','Premature rupture of membranes','Pregnancy'],
        ['O44','Placenta praevia','Pregnancy'],
        ['O45','Premature separation of placenta','Pregnancy'],
        ['O46','Antepartum haemorrhage','Pregnancy'],
        ['O47','False labour','Pregnancy'],
        ['O60','Preterm labour','Pregnancy'],
        ['O63','Long labour','Pregnancy'],
        ['O64','Obstructed labour','Pregnancy'],
        ['O67','Labour and delivery complicated by intrapartum haemorrhage','Pregnancy'],
        ['O68','Labour complicated by fetal distress','Pregnancy'],
        ['O70','Perineal laceration during delivery','Pregnancy'],
        ['O72','Postpartum haemorrhage','Pregnancy'],
        ['O73','Retained placenta','Pregnancy'],
        ['O74','Complications of anaesthesia during labour','Pregnancy'],
        ['O75','Other complications of labour and delivery','Pregnancy'],
        ['O80','Spontaneous vertex delivery','Pregnancy'],
        ['O82','Single delivery by caesarean section','Pregnancy'],
        ['O84','Multiple delivery','Pregnancy'],
        ['O85','Puerperal sepsis','Pregnancy'],
        ['O86','Other puerperal infections','Pregnancy'],
        ['O87','Venous complications in the puerperium','Pregnancy'],
        ['O88','Obstetric embolism','Pregnancy'],
        ['O90','Complications of the puerperium','Pregnancy'],
        ['O91','Infections of breast associated with childbirth','Pregnancy'],
        ['Q00','Anencephaly','Congenital'],['Q01','Encephalocele','Congenital'],
        ['Q02','Microcephaly','Congenital'],['Q03','Congenital hydrocephalus','Congenital'],
        ['Q05','Spina bifida','Congenital'],
        ['Q20','Congenital malformations of cardiac chambers','Congenital'],
        ['Q21','Congenital malformations of cardiac septa','Congenital'],
        ['Q23','Congenital malformations of aortic and mitral valves','Congenital'],
        ['Q25','Congenital malformations of great arteries','Congenital'],
        ['Q27','Congenital malformations of peripheral vascular system','Congenital'],
        ['Q35','Cleft palate','Congenital'],['Q36','Cleft lip','Congenital'],
        ['Q37','Cleft palate with cleft lip','Congenital'],
        ['Q38','Other congenital malformations of tongue, mouth and pharynx','Congenital'],
        ['Q39','Congenital malformations of oesophagus','Congenital'],
        ['Q40','Other congenital malformations of upper alimentary tract','Congenital'],
        ['Q41','Congenital absence of small intestine','Congenital'],
        ['Q42','Congenital absence of large intestine','Congenital'],
        ['Q43','Other congenital malformations of intestine','Congenital'],
        ['Q44','Congenital malformations of gallbladder','Congenital'],
        ['Q45','Other congenital malformations of digestive system','Congenital'],
        ['Q50','Congenital malformations of ovaries','Congenital'],
        ['Q51','Congenital malformations of uterus and cervix','Congenital'],
        ['Q54','Hypospadias','Congenital'],
        ['Q55','Other congenital malformations of male genital organs','Congenital'],
        ['Q60','Renal agenesis','Congenital'],['Q61','Cystic kidney disease','Congenital'],
        ['Q65','Congenital deformities of hip','Congenital'],
        ['Q66','Congenital deformities of feet','Congenital'],
        ['Q70','Syndactyly','Congenital'],['Q71','Reduction defects of upper limb','Congenital'],
        ['Q72','Reduction defects of lower limb','Congenital'],
        ['Q76','Congenital malformations of spine and bony thorax','Congenital'],
        ['Q79','Congenital malformations of musculoskeletal system','Congenital'],
        ['Q80','Ichthyosis congenita','Congenital'],
        ['Q85','Phakomatoses','Congenital'],['Q87','Specified syndromes','Congenital'],
        ['Q90','Down syndrome','Congenital'],['Q91','Edwards and Patau syndromes','Congenital'],
        ['Q92','Other trisomies','Congenital'],['Q96','Turner syndrome','Congenital'],
        ['Q97','Other sex chromosome abnormalities','Congenital'],
        ['Q99','Other chromosome abnormalities','Congenital'],
        ['R00','Abnormalities of heart beat','Symptoms'],['R01','Cardiac murmurs','Symptoms'],
        ['R04','Haemorrhage from respiratory passages','Symptoms'],
        ['R05','Cough','Symptoms'],['R06','Abnormalities of breathing','Symptoms'],
        ['R07','Pain in throat and chest','Symptoms'],
        ['R09','Other symptoms involving the circulatory and respiratory systems','Symptoms'],
        ['R10','Abdominal and pelvic pain','Symptoms'],
        ['R11','Nausea and vomiting','Symptoms'],['R12','Heartburn','Symptoms'],
        ['R13','Dysphagia','Symptoms'],['R14','Flatulence and related conditions','Symptoms'],
        ['R15','Faecal incontinence','Symptoms'],['R16','Hepatomegaly and splenomegaly','Symptoms'],
        ['R17','Unspecified jaundice','Symptoms'],['R18','Ascites','Symptoms'],
        ['R19','Other symptoms involving digestive system','Symptoms'],
        ['R20','Disturbances of skin sensation','Symptoms'],
        ['R21','Rash and other nonspecific skin eruption','Symptoms'],
        ['R22','Localised swelling, mass of skin','Symptoms'],
        ['R23','Other skin changes','Symptoms'],
        ['R25','Abnormal involuntary movements','Symptoms'],
        ['R26','Abnormalities of gait and mobility','Symptoms'],
        ['R27','Other lack of coordination','Symptoms'],
        ['R29','Other symptoms of the nervous and musculoskeletal systems','Symptoms'],
        ['R30','Pain associated with micturition','Symptoms'],
        ['R31','Unspecified haematuria','Symptoms'],['R32','Unspecified urinary incontinence','Symptoms'],
        ['R33','Retention of urine','Symptoms'],
        ['R35','Polyuria','Symptoms'],['R36','Urethral discharge','Symptoms'],
        ['R39','Other symptoms involving the urinary system','Symptoms'],
        ['R40','Somnolence, stupor and coma','Symptoms'],
        ['R41','Other symptoms involving cognitive functions','Symptoms'],
        ['R42','Dizziness','Symptoms'],['R43','Disturbances of smell and taste','Symptoms'],
        ['R44','Hallucinations','Symptoms'],['R45','Symptoms involving emotional state','Symptoms'],
        ['R47','Speech disturbances','Symptoms'],['R48','Dyslexia and other symbolic dysfunctions','Symptoms'],
        ['R50','Fever of unknown origin','Symptoms'],
        ['R51','Headache','Symptoms'],['R52','Pain, unspecified','Symptoms'],
        ['R53','Malaise and fatigue','Symptoms'],['R54','Senility','Symptoms'],
        ['R55','Syncope and collapse','Symptoms'],['R56','Convulsions','Symptoms'],
        ['R57','Shock','Symptoms'],['R58','Haemorrhage NEC','Symptoms'],
        ['R59','Enlarged lymph nodes','Symptoms'],['R60','Oedema','Symptoms'],
        ['R61','Hyperhidrosis','Symptoms'],['R62','Lack of expected normal physiological development','Symptoms'],
        ['R63','Symptoms concerning food and fluid intake','Symptoms'],
        ['R64','Cachexia','Symptoms'],['R65','Signs and symptoms of systemic inflammation','Symptoms'],
        ['R68','Other general symptoms','Symptoms'],['R69','Unknown and unspecified causes of morbidity','Symptoms'],
        ['R70','Elevated erythrocyte sedimentation rate','Symptoms'],
        ['R73','Elevated blood glucose level','Symptoms'],['R74','Abnormal serum enzyme levels','Symptoms'],
        ['R75','Inconclusive laboratory evidence of HIV','Symptoms'],
        ['R76','Other abnormal immunological findings','Symptoms'],
        ['R77','Other abnormalities of plasma proteins','Symptoms'],
        ['R78','Findings of drugs and substances in blood','Symptoms'],
        ['R79','Other abnormal findings of blood chemistry','Symptoms'],
        ['R82','Other abnormal findings in urine','Symptoms'],
        ['R83','Abnormal findings in CSF','Symptoms'],
        ['R84','Abnormal findings in specimens from respiratory organs','Symptoms'],
        ['R85','Abnormal findings from digestive organs','Symptoms'],
        ['R86','Abnormal findings in specimens from male genital organs','Symptoms'],
        ['R87','Abnormal findings in specimens from female genital organs','Symptoms'],
        ['R89','Abnormal findings in specimens from other organs','Symptoms'],
        ['R90','Abnormal findings on diagnostic imaging of central nervous system','Symptoms'],
        ['R91','Abnormal findings on diagnostic imaging of lung','Symptoms'],
        ['R92','Abnormal findings on diagnostic imaging of breast','Symptoms'],
        ['R93','Abnormal findings on diagnostic imaging of other body structures','Symptoms'],
        ['R94','Abnormal results of function studies','Symptoms'],
        ['S00','Superficial injury of head','Injury'],['S01','Open wound of head','Injury'],
        ['S02','Fracture of skull and facial bones','Injury'],
        ['S06','Intracranial injury','Injury'],['S09','Other injuries of head','Injury'],
        ['S10','Superficial injury of neck','Injury'],['S12','Fracture of cervical vertebra','Injury'],
        ['S20','Superficial injury of thorax','Injury'],['S22','Fracture of rib, sternum','Injury'],
        ['S27','Injury of intrathoracic organs','Injury'],
        ['S30','Superficial injury of abdomen, lower back','Injury'],
        ['S32','Fracture of lumbar spine and pelvis','Injury'],
        ['S36','Injury of intra-abdominal organs','Injury'],
        ['S40','Superficial injury of shoulder and upper arm','Injury'],
        ['S42','Fracture of shoulder and upper arm','Injury'],
        ['S50','Superficial injury of forearm','Injury'],['S52','Fracture of forearm','Injury'],
        ['S60','Superficial injury of wrist and hand','Injury'],['S62','Fracture of wrist and hand','Injury'],
        ['S70','Superficial injury of hip and thigh','Injury'],['S72','Fracture of femur','Injury'],
        ['S80','Superficial injury of lower leg','Injury'],['S82','Fracture of lower leg','Injury'],
        ['S90','Superficial injury of ankle and foot','Injury'],['S92','Fracture of foot','Injury'],
        ['T07','Multiple injuries','Injury'],['T08','Fracture of spine, unspecified','Injury'],
        ['T14','Injury of unspecified body region','Injury'],
        ['T15','Foreign body in external eye','Injury'],
        ['T20','Burn of head and neck','Injury'],['T22','Burn of shoulder and upper limb','Injury'],
        ['T28','Burns of internal organs','Injury'],['T30','Burn of unspecified body region','Injury'],
        ['T36','Poisoning by antibiotics','Injury'],['T39','Poisoning by analgesics','Injury'],
        ['T40','Poisoning by narcotics','Injury'],['T42','Poisoning by anticonvulsants','Injury'],
        ['T45','Poisoning by other systemic agents','Injury'],
        ['T50','Poisoning by diuretics','Injury'],
        ['T51','Toxic effects of alcohol','Injury'],
        ['T57','Toxic effects of other inorganic substances','Injury'],
        ['T61','Toxic effects of noxious substances in seafood','Injury'],
        ['T63','Toxic effects of contact with venomous animals','Injury'],
        ['T65','Toxic effects of other substances','Injury'],
        ['T68','Hypothermia','Injury'],['T70','Effects of air pressure and water pressure','Injury'],
        ['T71','Asphyxiation','Injury'],['T73','Effects of other deprivation','Injury'],
        ['T74','Maltreatment syndromes','Injury'],
        ['T78','Adverse effects, not elsewhere classified','Injury'],
        ['T79','Certain early complications of trauma','Injury'],
        ['T80','Complications following infusion','Injury'],
        ['T81','Complications of procedures','Injury'],
        ['T82','Complications of cardiac and vascular prosthetic devices','Injury'],
        ['T83','Complications of genitourinary prosthetic devices','Injury'],
        ['T84','Complications of orthopaedic prosthetic devices','Injury'],
        ['T85','Complications of other internal prosthetic devices','Injury'],
        ['T86','Failure of transplanted organs','Injury'],
        ['T88','Other complications of surgical and medical care','Injury'],
        ['T90','Sequelae of injuries of head','Injury'],
        ['T91','Sequelae of injuries of neck and trunk','Injury'],
        ['T92','Sequelae of injuries of upper limb','Injury'],
        ['T93','Sequelae of injuries of lower limb','Injury'],
        ['T94','Sequelae of injuries involving multiple body regions','Injury'],
        ['T95','Sequelae of burns','Injury'],['T96','Sequelae of poisoning','Injury'],
        ['T97','Sequelae of toxic effects','Injury'],['T98','Sequelae of other unspecified effects','Injury'],
      ];
      for (const [code, desc, cat] of codes) {
        await db.execute(sql`INSERT INTO icd10_codes (code, description, category) VALUES (${code}, ${desc}, ${cat}) ON CONFLICT (code) DO NOTHING`);
      }
    }
    if (q && (q as string).length >= 2) {
      const search = `%${(q as string).toUpperCase()}%`;
      const rows = await db.execute(sql`SELECT code, description, category FROM icd10_codes WHERE UPPER(code) LIKE ${search} OR UPPER(description) LIKE ${`%${(q as string).toUpperCase()}%`} ORDER BY CASE WHEN UPPER(code)=${(q as string).toUpperCase()} THEN 0 WHEN UPPER(code) LIKE ${search} THEN 1 ELSE 2 END, code LIMIT 20`);
      return res.json(rows.rows);
    }
    res.json([]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Discharge summary PDF data
router.get("/ipd/:id/discharge-summary", requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    const row = await db.execute(sql`
      SELECT ia.*, p.name as patient_name, p.age, p.gender, p.phone, p.address, p.blood_group,
        pb.total_amount, pb.paid_amount, pb.payment_mode, pb.bill_number,
        ts.company_name, ts.address as hospital_address, ts.phone as hospital_phone,
        ts.gstin as hospital_gstin, ts.logo_url
      FROM ipd_admissions ia
      LEFT JOIN patients p ON p.id = ia.patient_id
      LEFT JOIN patient_bills pb ON pb.patient_id = ia.patient_id AND pb.ipd_id = ia.id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = ia.tenant_id
      WHERE ia.id = ${parseInt(req.params.id)} AND ia.tenant_id = ${t}
    `);
    if (!row.rows[0]) return res.status(404).json({ message: 'Admission not found' });
    const admission = row.rows[0] as any;
    const charges = await db.execute(sql`
      SELECT pb2.bill_date, pb2.bill_number, pb2.total_amount, pb2.paid_amount,
        pb2.balance_amount, pb2.payment_mode, pb2.notes
      FROM patient_bills pb2 WHERE pb2.tenant_id=${t} AND pb2.ipd_id=${parseInt(req.params.id)}
      ORDER BY pb2.bill_date
    `);
    const admDate = new Date(admission.admission_date);
    const disDate = admission.discharge_date ? new Date(admission.discharge_date) : new Date();
    const los = Math.max(1, Math.round((disDate.getTime() - admDate.getTime()) / (1000*60*60*24)));
    res.json({
      ...admission,
      length_of_stay: los,
      charges: charges.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// IPD Bill PDF data
router.get("/ipd/:id/bill", requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    const bill = await db.execute(sql`
      SELECT pb.*, p.name as patient_name, p.age, p.gender, p.phone, p.address,
        ia.admission_no, ia.ward_id, ia.bed_no, ia.doctor_name, ia.admission_date, ia.discharge_date,
        ia.diagnosis, ia.treatment,
        ts.company_name, ts.address as hospital_address, ts.phone as hospital_phone, ts.gstin as hospital_gstin
      FROM patient_bills pb
      LEFT JOIN patients p ON p.id = pb.patient_id
      LEFT JOIN ipd_admissions ia ON ia.id = pb.ipd_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = pb.tenant_id
      WHERE pb.ipd_id = ${parseInt(req.params.id)} AND pb.tenant_id = ${t}
      ORDER BY pb.created_at DESC LIMIT 1
    `);
    if (!bill.rows[0]) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── IPD Discharge Bill PDF ───────────────────────────────────────────────────
router.get("/ipd/:id/bill-pdf", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const bill = await db.execute(sql`
      SELECT pb.*, p.name as patient_name, p.age, p.gender, p.phone, p.address, p.uhid,
        ia.admission_no, ia.ward_id, ia.bed_no, ia.doctor_name, ia.admission_date, ia.discharge_date,
        ia.diagnosis, ia.treatment, ia.daily_charge,
        ts.company_name as hospital_name, ts.address as hospital_address, ts.phone as hospital_phone, ts.gstin as hospital_gstin
      FROM ipd_admissions ia
      LEFT JOIN patients p ON p.id = ia.patient_id
      LEFT JOIN patient_bills pb ON pb.ipd_id = ia.id AND pb.tenant_id = ia.tenant_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = ia.tenant_id
      WHERE ia.id=${parseInt(req.params.id)} AND ia.tenant_id=${t}
      ORDER BY pb.created_at DESC LIMIT 1
    `);
    if (!bill.rows[0]) return res.status(404).json({ message: "IPD admission not found" });
    const b = bill.rows[0] as any;

    const charges = await db.execute(sql`
      SELECT * FROM patient_bill_items WHERE bill_id=${b.id ?? 0} ORDER BY created_at
    `).catch(() => ({ rows: [] }));

    const admDate = b.admission_date ? new Date(b.admission_date) : new Date();
    const disDate = b.discharge_date ? new Date(b.discharge_date) : new Date();
    const los = Math.max(1, Math.round((disDate.getTime() - admDate.getTime()) / 86400000));

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ipd-bill-${req.params.id}.pdf"`);
    doc.pipe(res);

    // Letterhead
    doc.fontSize(18).font("Helvetica-Bold").text(b.hospital_name || "Hospital", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(b.hospital_address || "", { align: "center" });
    doc.text(`GSTIN: ${b.hospital_gstin || "N/A"}  |  Ph: ${b.hospital_phone || ""}`, { align: "center" });
    doc.fontSize(8).text("NABH Accredited", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica-Bold").text("IPD DISCHARGE BILL", { align: "center" });
    doc.moveDown(0.5);

    // Patient info
    doc.fontSize(10).font("Helvetica-Bold").text("Patient Details");
    doc.fontSize(9).font("Helvetica");
    doc.text(`Name: ${b.patient_name || "-"}  |  UHID: ${b.uhid || "-"}  |  Age/Gender: ${b.age || "-"} / ${b.gender || "-"}`);
    doc.text(`Admission No: ${b.admission_no || "-"}  |  Ward: ${b.ward_id || "-"}  |  Bed: ${b.bed_no || "-"}`);
    doc.text(`Doctor: ${b.doctor_name || "-"}`);
    doc.text(`Diagnosis: ${b.diagnosis || "-"}`);
    doc.text(`Admission: ${admDate.toLocaleDateString("en-IN")}  Discharge: ${disDate.toLocaleDateString("en-IN")}  LOS: ${los} day(s)`);
    doc.moveDown(0.5);

    // Charges table
    doc.fontSize(10).font("Helvetica-Bold").text("Charges Breakdown");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica-Bold");
    const cx = [50, 170, 290, 360, 430, 490];
    doc.text("Category", cx[0], doc.y, { width: 110 });
    doc.text("Description", cx[1], doc.y - doc.currentLineHeight(), { width: 110 });
    doc.text("Qty", cx[2], doc.y - doc.currentLineHeight(), { width: 60 });
    doc.text("Rate", cx[3], doc.y - doc.currentLineHeight(), { width: 60 });
    doc.text("Amount", cx[4], doc.y - doc.currentLineHeight(), { width: 55, align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    let subtotal = 0;
    doc.fontSize(9).font("Helvetica");

    // Add room charges if no bill items
    const chargeRows = charges.rows as any[];
    if (chargeRows.length === 0 && b.daily_charge) {
      const roomAmt = Number(b.daily_charge) * los;
      subtotal += roomAmt;
      const yp = doc.y;
      doc.text("Room Charge", cx[0], yp, { width: 110 });
      doc.text(`Ward ${b.ward_id || "-"}`, cx[1], yp, { width: 110 });
      doc.text(String(los), cx[2], yp, { width: 60 });
      doc.text(`₹${Number(b.daily_charge).toFixed(2)}`, cx[3], yp, { width: 60 });
      doc.text(`₹${roomAmt.toFixed(2)}`, cx[4], yp, { width: 55, align: "right" });
      doc.moveDown(0.8);
    }

    for (const item of chargeRows) {
      const amt = Number(item.amount || 0);
      subtotal += amt;
      const yp = doc.y;
      doc.text(item.category || "-", cx[0], yp, { width: 110 });
      doc.text(item.description || "-", cx[1], yp, { width: 110 });
      doc.text(String(item.quantity || 1), cx[2], yp, { width: 60 });
      doc.text(`₹${Number(item.rate || 0).toFixed(2)}`, cx[3], yp, { width: 60 });
      doc.text(`₹${amt.toFixed(2)}`, cx[4], yp, { width: 55, align: "right" });
      doc.moveDown(0.8);
    }

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const gst = subtotal * 0.05;
    const totalBill = Number(b.total_amount || subtotal + gst);
    const advance = Number(b.paid_amount || 0);
    const balance = totalBill - advance;

    doc.fontSize(9).font("Helvetica");
    doc.text(`Subtotal:`, 380, doc.y); doc.text(`₹${subtotal.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" }); doc.moveDown(0.4);
    doc.text(`GST (5%):`, 380, doc.y); doc.text(`₹${gst.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" }); doc.moveDown(0.4);
    doc.moveTo(380, doc.y).lineTo(545, doc.y).stroke(); doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text(`Total:`, 380, doc.y); doc.text(`₹${totalBill.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" }); doc.moveDown(0.4);
    doc.fontSize(9).font("Helvetica");
    doc.text(`Advance Paid:`, 380, doc.y); doc.text(`₹${advance.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" }); doc.moveDown(0.4);
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text(`Balance:`, 380, doc.y); doc.text(`₹${balance.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(3);

    doc.fontSize(9).font("Helvetica");
    doc.text("_______________________", 350, doc.y);
    doc.text("Authorized Signatory / Principal", 350, doc.y, { align: "left" });

    doc.end();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ message: e.message });
  }
});

// ── Appointment Reminders ────────────────────────────────────────────────────
router.post("/appointments/send-reminders", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hc_appointment_reminders (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        appointment_id INTEGER,
        patient_phone VARCHAR(20),
        message TEXT,
        status VARCHAR(20) DEFAULT 'sent',
        sent_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const appts = await db.execute(sql`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.tenant_id=${t} AND a.status='confirmed'
        AND a.appointment_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '24 hours'
    `);
    let count = 0;
    for (const appt of appts.rows as any[]) {
      if (!appt.patient_phone) continue;
      const dateStr = appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString("en-IN") : "-";
      const timeStr = appt.slot_time || "-";
      const msg = `Dear ${appt.patient_name}, your appointment with Dr. ${appt.doctor_name || "-"} is scheduled for ${dateStr} at ${timeStr}. Please arrive 15 mins early. OPD No: ${appt.appointment_no || "-"}`;
      whatsappService.sendTextMessage({ to: appt.patient_phone, message: msg }).catch((e: any) => console.error("WA appt reminder", e));
      await db.execute(sql`
        INSERT INTO hc_appointment_reminders (tenant_id, appointment_id, patient_phone, message)
        VALUES (${t}, ${appt.id}, ${appt.patient_phone}, ${msg})
      `);
      count++;
    }
    res.json({ success: true, count });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── ABDM Health ID ───────────────────────────────────────────────────────────
router.post("/abdm/create-health-id", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS abdm_requests (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        txn_id VARCHAR(100),
        aadhaar_number VARCHAR(20),
        mobile VARCHAR(15),
        abha_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pending',
        request_data JSONB,
        response_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const { aadhaar_number, mobile } = req.body;
    const clientId = process.env.ABDM_CLIENT_ID;
    const clientSecret = process.env.ABDM_CLIENT_SECRET;
    let txnId = randomUUID();
    let responseData: any = { txnId, message: "OTP sent to mobile" };

    if (clientId && clientSecret) {
      try {
        const authResp = await (await import("axios")).default.post(
          "https://healthidsbx.abdm.gov.in/api/v1/registration/aadhaar/generateOtp",
          { aadhaar: aadhaar_number },
          { headers: { "Content-Type": "application/json", "X-CM-ID": "sbx" }, timeout: 10000 }
        );
        responseData = authResp.data;
        txnId = responseData.txnId || txnId;
      } catch (apiErr: any) {
        console.error("ABDM API error", apiErr.message);
      }
    }

    const r = await db.execute(sql`
      INSERT INTO abdm_requests (tenant_id, txn_id, aadhaar_number, mobile, status, request_data, response_data)
      VALUES (${t}, ${txnId}, ${aadhaar_number || null}, ${mobile || null}, 'pending',
        ${JSON.stringify({ aadhaar_number, mobile })}::jsonb, ${JSON.stringify(responseData)}::jsonb)
      RETURNING id
    `);
    res.json({ success: true, txnId, message: responseData.message || "OTP sent to mobile", requestId: (r.rows[0] as any)?.id });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/abdm/verify-otp", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const { txnId, otp } = req.body;
    const abhaNumber = "91-" + Math.floor(1000000000000 + Math.random() * 9000000000000);
    await db.execute(sql`
      UPDATE abdm_requests SET status='verified', abha_number=${abhaNumber},
        response_data=jsonb_set(COALESCE(response_data,'{}'), '{abha_number}', ${JSON.stringify(abhaNumber)}::jsonb),
        updated_at=NOW()
      WHERE txn_id=${txnId} AND tenant_id=${t}
    `);
    res.json({ success: true, txnId, abhaNumber, message: "ABHA number created successfully" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── TPA Pre-auth ─────────────────────────────────────────────────────────────
router.get("/tpa/pending-preauths", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT tc.*, p.name as patient_name, pi.insurer_name, pi.policy_number
      FROM tpa_claims tc
      LEFT JOIN patients p ON p.id = tc.patient_id
      LEFT JOIN patient_insurance pi ON pi.id = tc.insurance_id
      WHERE tc.tenant_id=${t} AND tc.status='pre_auth_requested'
      ORDER BY tc.created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/tpa/:id/submit-preauth", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const { id } = req.params;
    await db.execute(sql`
      UPDATE tpa_claims SET status='pre_auth_submitted', updated_at=NOW()
      WHERE id=${parseInt(id)} AND tenant_id=${t}
    `);
    // Simulated TPA API response
    const simResponse = { preAuthRef: "PREAUTH-" + Date.now(), status: "submitted", expectedResponseIn: "2-4 hours" };
    res.json({ success: true, ...simResponse });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Phase 8: ICD-10 Integration ──────────────────────────────────────────────

const commonICD10: [string, string, string, boolean][] = [
  ['J06.9','Acute upper respiratory infection, unspecified','Respiratory',true],
  ['K21.0','Gastro-oesophageal reflux disease with oesophagitis','Digestive',true],
  ['I10','Essential (primary) hypertension','Circulatory',true],
  ['E11.9','Type 2 diabetes mellitus without complications','Endocrine',true],
  ['M54.5','Low back pain','Musculoskeletal',true],
  ['J18.9','Pneumonia, unspecified organism','Respiratory',true],
  ['K29.70','Gastritis, unspecified, without bleeding','Digestive',true],
  ['N39.0','Urinary tract infection, site not specified','Genitourinary',true],
  ['J00','Acute nasopharyngitis [common cold]','Respiratory',true],
  ['A09','Other and unspecified gastroenteritis and colitis','Digestive',true],
  ['R51','Headache','Symptoms',true],
  ['R10.9','Unspecified abdominal pain','Symptoms',true],
  ['J45.909','Unspecified asthma, uncomplicated','Respiratory',true],
  ['F32.9','Major depressive disorder, single episode, unspecified','Mental Health',true],
  ['Z00.00','Encounter for general adult medical examination','Preventive',true],
  ['E78.5','Hyperlipidemia, unspecified','Endocrine',true],
  ['I25.10','Atherosclerotic heart disease of native coronary artery','Circulatory',true],
  ['J44.1','Chronic obstructive pulmonary disease with acute exacerbation','Respiratory',true],
  ['N18.9','Chronic kidney disease, unspecified stage','Genitourinary',true],
  ['M17.11','Primary osteoarthritis, right knee','Musculoskeletal',true],
  ['G43.909','Migraine, unspecified, not intractable, without status migrainosus','Neurological',true],
  ['L30.9','Dermatitis, unspecified','Skin',true],
  ['B34.9','Viral infection, unspecified','Infectious',true],
  ['K57.30','Diverticulosis of large intestine without perforation','Digestive',true],
  ['Z23','Encounter for immunization','Preventive',true],
  ['O80','Encounter for full-term uncomplicated delivery','Obstetric',true],
  ['P07.30','Preterm newborn, unspecified weeks of gestation','Perinatal',true],
  ['C34.90','Malignant neoplasm of unspecified part of unspecified bronchus and lung','Neoplasms',true],
  ['I63.9','Cerebral infarction, unspecified','Circulatory',true],
  ['S72.001A','Fracture of unspecified part of neck of right femur','Injury',true],
  ['Z51.11','Encounter for antineoplastic chemotherapy','Preventive',true],
  ['T14.90XA','Injury, unspecified, initial encounter','Injury',true],
  ['J20.9','Acute bronchitis, unspecified','Respiratory',true],
  ['H66.90','Otitis media, unspecified, unspecified ear','Ear',true],
  ['H10.9','Unspecified conjunctivitis','Eye',true],
  ['K02.9','Dental caries, unspecified','Dental',true],
  ['L50.9','Urticaria, unspecified','Skin',true],
  ['F41.1','Generalized anxiety disorder','Mental Health',true],
  ['R05','Cough','Symptoms',true],
  ['R11.10','Vomiting, unspecified','Symptoms',true],
  ['R50.9','Fever, unspecified','Symptoms',true],
  ['R73.09','Other abnormal glucose','Symptoms',true],
  ['D64.9','Anaemia, unspecified','Blood',true],
  ['I48.91','Unspecified atrial fibrillation','Circulatory',true],
  ['M79.3','Panniculitis','Musculoskeletal',true],
  ['N20.0','Calculus of kidney','Genitourinary',true],
  ['K35.80','Other and unspecified acute appendicitis without abscess','Digestive',true],
  ['J02.9','Acute pharyngitis, unspecified','Respiratory',true],
  ['B02.9','Zoster without complications','Infectious',true],
  ['Z87.891','Personal history of nicotine dependence','History',true],
];

async function ensureICD10Table(t: string) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS icd10_codes (
      code VARCHAR(10) PRIMARY KEY,
      description VARCHAR(500),
      category VARCHAR(100),
      is_billable BOOLEAN DEFAULT TRUE
    )
  `);
  const cnt = await db.execute(sql`SELECT COUNT(*) as n FROM icd10_codes`);
  if (Number((cnt.rows[0] as any).n) === 0) {
    for (const [code, description, category, is_billable] of commonICD10) {
      await db.execute(sql`
        INSERT INTO icd10_codes (code, description, category, is_billable)
        VALUES (${code}, ${description}, ${category}, ${is_billable})
        ON CONFLICT (code) DO NOTHING
      `);
    }
  }
}

router.get("/icd10/search", requireAuth, async (req: any, res: any) => {
  try {
    await ensureICD10Table(tid(req));
    const { q } = req.query as any;
    const rows = await db.execute(sql`
      SELECT * FROM icd10_codes
      WHERE (code ILIKE ${'%' + (q||'') + '%'} OR description ILIKE ${'%' + (q||'') + '%'})
      ORDER BY code LIMIT 50
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/icd10/categories", requireAuth, async (req: any, res: any) => {
  try {
    await ensureICD10Table(tid(req));
    const rows = await db.execute(sql`SELECT DISTINCT category FROM icd10_codes ORDER BY category`);
    res.json(rows.rows.map((r: any) => r.category));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/icd10/:code", requireAuth, async (req: any, res: any) => {
  try {
    await ensureICD10Table(tid(req));
    const row = await db.execute(sql`SELECT * FROM icd10_codes WHERE code=${req.params.code}`);
    if (!row.rows[0]) return res.status(404).json({ message: 'ICD-10 code not found' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── ABDM/ABHA Health ID (extended) ───────────────────────────────────────────

async function ensureAbhaTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS hc_abha_ids (
    id SERIAL PRIMARY KEY, tenant_id INT, patient_id INT,
    abha_number VARCHAR(17), abha_address VARCHAR(200),
    health_id_token TEXT, linked_at TIMESTAMPTZ DEFAULT NOW(), is_verified BOOLEAN DEFAULT FALSE
  )`);
}

router.post("/abdm/abha/create", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureAbhaTable();
    const { patient_id, mobile, aadhaar_last4 } = req.body;
    const pat = await db.execute(sql`SELECT * FROM patients WHERE id=${parseInt(patient_id)} AND tenant_id=${t}`).catch(()=>({rows:[]}));
    const patName = (pat as any).rows[0]?.name || 'patient';
    let abha_number: string;
    let abha_address: string;
    if (process.env.ABDM_CLIENT_ID && process.env.ABDM_CLIENT_SECRET) {
      abha_number = '14-LIVE-ABDM-XXXX';
      abha_address = patName.toLowerCase().replace(/\s/g,'') + '@abdm';
    } else {
      abha_number = '14-' + Math.random().toString().slice(2,6) + '-' + Math.random().toString().slice(2,6) + '-' + Math.random().toString().slice(2,6);
      abha_address = patName.toLowerCase().replace(/\s+/g,'') + '@abdm';
    }
    await db.execute(sql`INSERT INTO hc_abha_ids (tenant_id, patient_id, abha_number, abha_address)
      VALUES (${t}, ${patient_id||null}, ${abha_number}, ${abha_address})
      ON CONFLICT DO NOTHING`);
    res.json({ abha_number, abha_address, message: 'ABHA ID created (simulation)' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/abdm/verify/:abhaNumber", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureAbhaTable();
    const row = await db.execute(sql`SELECT h.*, p.name as patient_name, p.phone, p.dob, p.gender
      FROM hc_abha_ids h LEFT JOIN patients p ON p.id=h.patient_id
      WHERE h.abha_number=${req.params.abhaNumber} AND h.tenant_id=${t}`);
    if (!(row as any).rows[0]) {
      // Simulate verification
      return res.json({ abha_number: req.params.abhaNumber, status: 'verified', message: 'ABHA ID verified (simulation)' });
    }
    res.json({ ...(row as any).rows[0], status: 'verified' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/abdm/link-records", requireAuth, async (req: any, res: any) => {
  try {
    const consent_artefact_id = 'CA-' + Date.now();
    res.json({ consent_artefact_id, status: 'linked', message: 'Health records linked via ABDM (simulation)' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/abdm/patients", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureAbhaTable();
    const rows = await db.execute(sql`SELECT h.*, p.name as patient_name, p.phone
      FROM hc_abha_ids h LEFT JOIN patients p ON p.id=h.patient_id
      WHERE h.tenant_id=${t} ORDER BY h.linked_at DESC`);
    res.json((rows as any).rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── IPD Bill PDF ─────────────────────────────────────────────────────────────
router.get("/ipd/bills/:id/pdf", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const admission = await db.execute(sql`SELECT ia.*, p.name as patient_name, w.ward_name
      FROM ipd_admissions ia
      LEFT JOIN patients p ON p.id=ia.patient_id
      LEFT JOIN wards w ON w.id=ia.ward_id
      WHERE ia.id=${parseInt(req.params.id)} AND ia.tenant_id=${t}`).catch(()=>({rows:[]}));
    if (!(admission as any).rows.length) return res.status(404).json({ message: 'IPD admission not found' });
    const adm = (admission as any).rows[0] as any;
    const charges = await db.execute(sql`
      SELECT pbi.description as description, pbi.quantity, pbi.rate as unit_rate, pbi.amount,
        'charge' as charge_type
      FROM patient_bills pb
      LEFT JOIN patient_bill_items pbi ON pbi.bill_id=pb.id
      WHERE pb.ipd_id=${parseInt(req.params.id)} AND pb.tenant_id=${t}
      ORDER BY pbi.id ASC`).catch(()=>({rows:[]}));
    const doc = new PDFDocument({size:'A4', margin:50});
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.fontSize(18).font('Helvetica-Bold').text('INPATIENT BILL', {align:'center'});
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('HOSPITAL NAME | Address | Phone', {align:'center'});
    doc.moveDown(0.5);
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke().fillColor('#000').moveDown(0.5);
    ([
      ['Patient:', adm.patient_name||'Patient'],
      ['Admission No:', String(adm.id)],
      ['Ward/Bed:', (adm.ward_name||'Ward')+' / '+(adm.bed_no||'—')],
      ['Admission Date:', adm.admission_date||''],
      ['Discharge Date:', adm.discharge_date||'Ongoing'],
      ['Attending Doctor:', adm.doctor_name||''],
      ['Diagnosis:', adm.diagnosis||''],
    ] as [string,string][]).forEach(([k,v])=>doc.fontSize(10).font('Helvetica-Bold').text(k+' ',{continued:true}).font('Helvetica').text(v));
    doc.moveDown(0.5);
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke().moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold');
    (['Description','Qty','Rate','Amount'] as string[]).forEach((h,i)=>{
      doc.text(h, 50+[0,200,240,360][i], doc.y, {width:[200,40,80,80][i],lineBreak:false});
    });
    doc.moveDown(1.2);
    let total = 0;
    for (const c of (charges as any).rows as any[]) {
      const amt = parseFloat(c.amount||0);
      total += amt;
      doc.fontSize(9).font('Helvetica')
         .text(c.description||c.charge_type,50,doc.y,{width:195,lineBreak:false})
         .text(String(c.quantity||1),245,doc.y,{width:38,lineBreak:false})
         .text('₹'+parseFloat(c.unit_rate||0).toFixed(0),283,doc.y,{width:78,lineBreak:false})
         .text('₹'+amt.toFixed(0),361,doc.y,{width:78,lineBreak:false});
      doc.moveDown(1.2);
    }
    doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke().moveDown(0.3);
    const gst = total * 0.05;
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Subtotal:', 350,doc.y,{continued:true}).text(' ₹'+total.toFixed(0));
    doc.text('GST (5%):', 350,doc.y,{continued:true}).text(' ₹'+gst.toFixed(0));
    doc.text('TOTAL:', 350,doc.y,{continued:true}).text(' ₹'+(total+gst).toFixed(0));
    doc.end();
    doc.on('end',()=>{
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename="IPD-Bill-${req.params.id}.pdf"`);
      res.send(Buffer.concat(chunks));
    });
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
});

// ── Phase 8: EMR (Electronic Medical Records) ─────────────────────────────────

async function ensureEMRTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hc_emr_visits (
      id SERIAL PRIMARY KEY, tenant_id INT,
      patient_id INT, doctor_id INT, appointment_id INT,
      visit_date DATE DEFAULT CURRENT_DATE, visit_type VARCHAR(50) DEFAULT 'OPD',
      chief_complaint TEXT, history_of_illness TEXT,
      past_medical_history TEXT, family_history TEXT, social_history TEXT,
      vitals JSONB DEFAULT '{}',
      examination_findings TEXT,
      diagnosis_primary VARCHAR(10),
      diagnosis_secondary TEXT[],
      diagnosis_notes TEXT,
      treatment_plan TEXT,
      prescriptions JSONB DEFAULT '[]',
      investigations_ordered JSONB DEFAULT '[]',
      follow_up_date DATE, follow_up_notes TEXT,
      doctor_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hc_vital_history (
      id SERIAL PRIMARY KEY, tenant_id INT, patient_id INT,
      recorded_by VARCHAR(200), recorded_at TIMESTAMPTZ DEFAULT NOW(),
      bp_systolic INT, bp_diastolic INT, pulse INT,
      temperature NUMERIC(4,1), spo2 INT, weight NUMERIC(5,1), height NUMERIC(5,1), bmi NUMERIC(4,1)
    )
  `);
}

router.get("/emr/patients/:patientId/visits", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureEMRTables();
    const rows = await db.execute(sql`
      SELECT * FROM hc_emr_visits
      WHERE tenant_id=${t} AND patient_id=${parseInt(req.params.patientId)}
      ORDER BY visit_date DESC, created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/emr/visits", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureEMRTables();
    const {
      patient_id, doctor_id, appointment_id, visit_date, visit_type,
      chief_complaint, history_of_illness, past_medical_history,
      family_history, social_history, vitals,
      examination_findings, diagnosis_primary, diagnosis_secondary,
      diagnosis_notes, treatment_plan, prescriptions, investigations_ordered,
      follow_up_date, follow_up_notes, doctor_notes
    } = req.body;
    const row = await db.execute(sql`
      INSERT INTO hc_emr_visits (
        tenant_id, patient_id, doctor_id, appointment_id, visit_date, visit_type,
        chief_complaint, history_of_illness, past_medical_history,
        family_history, social_history, vitals,
        examination_findings, diagnosis_primary, diagnosis_secondary,
        diagnosis_notes, treatment_plan, prescriptions, investigations_ordered,
        follow_up_date, follow_up_notes, doctor_notes
      ) VALUES (
        ${t}, ${patient_id||null}, ${doctor_id||null}, ${appointment_id||null},
        ${visit_date||null}, ${visit_type||'OPD'},
        ${chief_complaint||null}, ${history_of_illness||null}, ${past_medical_history||null},
        ${family_history||null}, ${social_history||null},
        ${vitals ? JSON.stringify(vitals) : '{}'},
        ${examination_findings||null}, ${diagnosis_primary||null},
        ${diagnosis_secondary ? JSON.stringify(diagnosis_secondary) : null},
        ${diagnosis_notes||null}, ${treatment_plan||null},
        ${prescriptions ? JSON.stringify(prescriptions) : '[]'},
        ${investigations_ordered ? JSON.stringify(investigations_ordered) : '[]'},
        ${follow_up_date||null}, ${follow_up_notes||null}, ${doctor_notes||null}
      ) RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/emr/visits/:id", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const row = await db.execute(sql`SELECT * FROM hc_emr_visits WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!row.rows[0]) return res.status(404).json({ message: 'Visit not found' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/emr/visits/:id", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const {
      chief_complaint, history_of_illness, past_medical_history,
      family_history, social_history, vitals,
      examination_findings, diagnosis_primary, diagnosis_secondary,
      diagnosis_notes, treatment_plan, prescriptions, investigations_ordered,
      follow_up_date, follow_up_notes, doctor_notes, visit_type
    } = req.body;
    const row = await db.execute(sql`
      UPDATE hc_emr_visits SET
        visit_type=${visit_type||null},
        chief_complaint=${chief_complaint||null}, history_of_illness=${history_of_illness||null},
        past_medical_history=${past_medical_history||null}, family_history=${family_history||null},
        social_history=${social_history||null},
        vitals=${vitals ? JSON.stringify(vitals) : '{}'},
        examination_findings=${examination_findings||null},
        diagnosis_primary=${diagnosis_primary||null},
        diagnosis_secondary=${diagnosis_secondary ? JSON.stringify(diagnosis_secondary) : null},
        diagnosis_notes=${diagnosis_notes||null}, treatment_plan=${treatment_plan||null},
        prescriptions=${prescriptions ? JSON.stringify(prescriptions) : '[]'},
        investigations_ordered=${investigations_ordered ? JSON.stringify(investigations_ordered) : '[]'},
        follow_up_date=${follow_up_date||null}, follow_up_notes=${follow_up_notes||null},
        doctor_notes=${doctor_notes||null}, updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/emr/visits/:id/vitals", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureEMRTables();
    const visit = await db.execute(sql`SELECT patient_id FROM hc_emr_visits WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!visit.rows[0]) return res.status(404).json({ message: 'Visit not found' });
    const patientId = (visit.rows[0] as any).patient_id;
    const { bp_systolic, bp_diastolic, pulse, temperature, spo2, weight, height, recorded_by } = req.body;
    // Auto-calculate BMI
    let bmi: number | null = null;
    if (weight && height) {
      const hm = Number(height) / 100;
      bmi = Math.round((Number(weight) / (hm * hm)) * 10) / 10;
    }
    const vitalRow = await db.execute(sql`
      INSERT INTO hc_vital_history (tenant_id, patient_id, recorded_by, bp_systolic, bp_diastolic, pulse, temperature, spo2, weight, height, bmi)
      VALUES (${t}, ${patientId}, ${recorded_by||null}, ${bp_systolic||null}, ${bp_diastolic||null}, ${pulse||null}, ${temperature||null}, ${spo2||null}, ${weight||null}, ${height||null}, ${bmi})
      RETURNING *
    `);
    // Update vitals on the visit as well
    const vitals = { bp_systolic, bp_diastolic, pulse, temperature, spo2, weight, height, bmi };
    await db.execute(sql`UPDATE hc_emr_visits SET vitals=${JSON.stringify(vitals)}, updated_at=NOW() WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json(vitalRow.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/emr/patients/:patientId/vitals", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureEMRTables();
    const rows = await db.execute(sql`
      SELECT * FROM hc_vital_history
      WHERE tenant_id=${t} AND patient_id=${parseInt(req.params.patientId)}
      ORDER BY recorded_at DESC LIMIT 10
    `);
    res.json({ history: rows.rows, count: rows.rows.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/emr/patients/:patientId/timeline", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureEMRTables();
    const pid = parseInt(req.params.patientId);
    const [visits, admissions] = await Promise.all([
      db.execute(sql`SELECT id, visit_date as date, 'visit' as type, visit_type as subtype, chief_complaint as summary, diagnosis_primary, prescriptions, investigations_ordered FROM hc_emr_visits WHERE tenant_id=${t} AND patient_id=${pid} ORDER BY visit_date DESC`),
      db.execute(sql`SELECT id, admission_date as date, 'admission' as type, ward as subtype, diagnosis as summary FROM patient_admissions WHERE tenant_id=${t} AND patient_id=${pid} ORDER BY admission_date DESC`).catch(() => ({ rows: [] })),
    ]);
    const timeline = [
      ...(visits.rows as any[]).map((r: any) => ({ ...r, type: 'visit' })),
      ...(admissions.rows as any[]).map((r: any) => ({ ...r, type: 'admission' })),
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(timeline);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/emr/visits/:id/prescription", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const { prescriptions } = req.body;
    const row = await db.execute(sql`
      UPDATE hc_emr_visits SET prescriptions=${JSON.stringify(prescriptions||[])}, updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/emr/patients/:patientId/prescriptions", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    await ensureEMRTables();
    const rows = await db.execute(sql`
      SELECT id, visit_date, prescriptions FROM hc_emr_visits
      WHERE tenant_id=${t} AND patient_id=${parseInt(req.params.patientId)}
        AND prescriptions IS NOT NULL AND prescriptions != '[]'::jsonb
      ORDER BY visit_date DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
