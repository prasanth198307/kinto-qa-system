import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glHealthcareBill } from "./vertical-gl-service";

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

export default router;
