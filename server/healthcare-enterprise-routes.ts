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

// ── OPD Bills ─────────────────────────────────────────────────────────────────

router.post("/opd/bill", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patient_id, doctor_id, visit_date, items, discount, notes } = req.body;
    const subtotal = (items ?? []).reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
    const totalAmount = subtotal - Number(discount ?? 0);
    const r = await db.execute(sql`
      INSERT INTO opd_bills
        (tenant_id, patient_id, doctor_id, visit_date, items, subtotal, discount, total_amount, notes, status, created_at)
      VALUES
        (${tid}, ${patient_id}, ${doctor_id ?? null}, ${visit_date ?? null},
         ${JSON.stringify(items ?? [])}, ${subtotal}, ${discount ?? 0}, ${totalAmount}, ${notes ?? null}, 'unpaid', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/opd/bills", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT ob.*, p.name AS patient_name, d.name AS doctor_name
      FROM opd_bills ob
      LEFT JOIN patients p ON p.id = ob.patient_id
      LEFT JOIN doctors d ON d.id = ob.doctor_id
      WHERE ob.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR ob.visit_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR ob.visit_date <= ${to ?? null})
      ORDER BY ob.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/opd/bills/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT ob.*, p.name AS patient_name, d.name AS doctor_name
      FROM opd_bills ob
      LEFT JOIN patients p ON p.id = ob.patient_id
      LEFT JOIN doctors d ON d.id = ob.doctor_id
      WHERE ob.id=${id} AND ob.tenant_id=${tid}
    `);
    if (!r.rows.length) return res.status(404).json({ message: "OPD bill not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── IPD Bills ─────────────────────────────────────────────────────────────────

router.get("/ipd/:admissionId/bill", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const bill = await db.execute(sql`
      SELECT ib.*, ia.patient_id, p.name AS patient_name
      FROM ipd_bills ib
      JOIN ipd_admissions ia ON ia.id = ib.admission_id
      LEFT JOIN patients p ON p.id = ia.patient_id
      WHERE ib.admission_id=${admissionId} AND ib.tenant_id=${tid}
    `);
    const items = await db.execute(sql`
      SELECT * FROM ipd_bill_items WHERE admission_id=${admissionId} ORDER BY created_at
    `);
    res.json({ bill: bill.rows[0] ?? null, items: items.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ipd/:admissionId/bill/add-charge", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const { charge_type, description, amount, quantity } = req.body;
    const qty = Number(quantity ?? 1);
    const lineTotal = Number(amount) * qty;

    await db.execute(sql`
      INSERT INTO ipd_bill_items (tenant_id, admission_id, charge_type, description, amount, quantity, total, created_at)
      VALUES (${tid}, ${admissionId}, ${charge_type}, ${description ?? null}, ${amount}, ${qty}, ${lineTotal}, NOW())
    `);

    // Upsert bill totals
    await db.execute(sql`
      INSERT INTO ipd_bills (tenant_id, admission_id, total_amount, status, created_at)
      VALUES (${tid}, ${admissionId}, ${lineTotal}, 'draft', NOW())
      ON CONFLICT (admission_id) DO UPDATE
        SET total_amount = ipd_bills.total_amount + ${lineTotal}, updated_at = NOW()
    `);

    res.json({ success: true, line_total: lineTotal });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ipd/:admissionId/bill/finalize", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const { discount } = req.body;

    const itemsRes = await db.execute(sql`
      SELECT COALESCE(SUM(total), 0) AS grand_total FROM ipd_bill_items WHERE admission_id=${admissionId}
    `);
    const grandTotal = Number((itemsRes.rows[0] as any)?.grand_total ?? 0);
    const finalTotal = grandTotal - Number(discount ?? 0);

    const r = await db.execute(sql`
      UPDATE ipd_bills
      SET status='final', total_amount=${grandTotal}, discount=${discount ?? 0},
          net_amount=${finalTotal}, finalized_at=NOW(), updated_at=NOW()
      WHERE admission_id=${admissionId} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json({ success: true, bill: r.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Beds ──────────────────────────────────────────────────────────────────────

router.get("/beds", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT b.*, w.name AS ward_name
      FROM hospital_beds b
      LEFT JOIN wards w ON w.id = b.ward_id
      WHERE b.tenant_id=${tid}
      ORDER BY w.name, b.bed_number
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/beds", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { bed_number, ward_id, bed_type, status } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hospital_beds (tenant_id, bed_number, ward_id, bed_type, status)
      VALUES (${tid}, ${bed_number}, ${ward_id ?? null}, ${bed_type ?? null}, ${status ?? 'available'})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/beds/:id/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;
    const r = await db.execute(sql`
      UPDATE hospital_beds SET status=${status}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/beds/:id/assign", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { admission_id, patient_id } = req.body;
    const r = await db.execute(sql`
      UPDATE hospital_beds
      SET status='occupied', current_admission_id=${admission_id}, current_patient_id=${patient_id}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json({ success: true, bed: r.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/beds/:id/release", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE hospital_beds
      SET status='available', current_admission_id=NULL, current_patient_id=NULL, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json({ success: true, bed: r.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Nursing ───────────────────────────────────────────────────────────────────

router.post("/nursing/vitals", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admission_id, patient_id, bp, pulse, temperature, spo2, weight, notes, note_type } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nursing_notes
        (tenant_id, admission_id, patient_id, bp, pulse, temperature, spo2, weight, notes, note_type, recorded_at)
      VALUES
        (${tid}, ${admission_id}, ${patient_id ?? null}, ${bp ?? null}, ${pulse ?? null},
         ${temperature ?? null}, ${spo2 ?? null}, ${weight ?? null}, ${notes ?? null},
         ${note_type ?? 'vitals'}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/nursing/vitals/:admissionId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM nursing_notes
      WHERE admission_id=${admissionId} AND tenant_id=${tid} AND note_type='vitals'
      ORDER BY recorded_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/nursing/notes/:admissionId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM nursing_notes
      WHERE admission_id=${admissionId} AND tenant_id=${tid}
      ORDER BY recorded_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Diet Charts ───────────────────────────────────────────────────────────────

router.get("/diet-charts/:admissionId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM diet_charts WHERE admission_id=${admissionId} AND tenant_id=${tid} ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/diet-charts", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admission_id, diet_type, instructions, effective_from, effective_to } = req.body;
    const r = await db.execute(sql`
      INSERT INTO diet_charts (tenant_id, admission_id, diet_type, instructions, effective_from, effective_to, created_at)
      VALUES (${tid}, ${admission_id}, ${diet_type}, ${instructions ?? null}, ${effective_from ?? null}, ${effective_to ?? null}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/diet-charts/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { diet_type, instructions, effective_from, effective_to } = req.body;
    const r = await db.execute(sql`
      UPDATE diet_charts
      SET diet_type=${diet_type}, instructions=${instructions},
          effective_from=${effective_from}, effective_to=${effective_to}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── OT Schedule ───────────────────────────────────────────────────────────────

router.get("/ot/schedule", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT ot.*, p.name AS patient_name, d.name AS surgeon_name
      FROM ot_schedules ot
      LEFT JOIN patients p ON p.id = ot.patient_id
      LEFT JOIN doctors d ON d.id = ot.surgeon_id
      WHERE ot.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR ot.scheduled_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR ot.scheduled_date <= ${to ?? null})
      ORDER BY ot.scheduled_date, ot.scheduled_time
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/ot/schedule", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patient_id, surgeon_id, admission_id, procedure_name, scheduled_date, scheduled_time, ot_room, anaesthesia_type } = req.body;
    const r = await db.execute(sql`
      INSERT INTO ot_schedules
        (tenant_id, patient_id, surgeon_id, admission_id, procedure_name, scheduled_date, scheduled_time, ot_room, anaesthesia_type, status)
      VALUES
        (${tid}, ${patient_id}, ${surgeon_id ?? null}, ${admission_id ?? null}, ${procedure_name},
         ${scheduled_date}, ${scheduled_time ?? null}, ${ot_room ?? null}, ${anaesthesia_type ?? null}, 'scheduled')
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/ot/schedule/:id/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;
    const r = await db.execute(sql`
      UPDATE ot_schedules SET status=${status}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/ot/schedule/:id/start", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE ot_schedules SET status='in_progress', actual_start=NOW(), updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/ot/schedule/:id/complete", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE ot_schedules SET status='completed', actual_end=NOW(), updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Lab ───────────────────────────────────────────────────────────────────────

router.post("/lab/orders/:orderId/results", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { orderId } = req.params;
    const results: Array<{ test_id: number; result_value: string; is_critical: number }> = req.body;
    for (const result of results) {
      await db.execute(sql`
        UPDATE lab_order_items
        SET result_value=${result.result_value}, is_critical=${result.is_critical ?? 0},
            resulted_at=NOW(), status='resulted'
        WHERE lab_order_id=${orderId} AND test_id=${result.test_id}
      `);
    }
    // Mark order as resulted if all items done
    await db.execute(sql`
      UPDATE lab_orders SET status='resulted', resulted_at=NOW()
      WHERE id=${orderId}
        AND NOT EXISTS (SELECT 1 FROM lab_order_items WHERE lab_order_id=${orderId} AND status != 'resulted')
    `);
    res.json({ success: true, updated: results.length });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/lab/orders/:orderId/report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { orderId } = req.params;
    const order = await db.execute(sql`
      SELECT lo.*, p.name AS patient_name, d.name AS doctor_name
      FROM lab_orders lo
      LEFT JOIN patients p ON p.id = lo.patient_id
      LEFT JOIN doctors d ON d.id = lo.doctor_id
      WHERE lo.id=${orderId}
    `);
    const items = await db.execute(sql`
      SELECT * FROM lab_order_items WHERE lab_order_id=${orderId} ORDER BY id
    `);
    res.json({ order: order.rows[0] ?? null, items: items.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Insurance & TPA ───────────────────────────────────────────────────────────

router.get("/insurance/:patientId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patientId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM patient_insurance WHERE patient_id=${patientId} AND tenant_id=${tid} ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/insurance", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patient_id, insurer_name, policy_number, coverage_amount, valid_from, valid_to, tpa_name } = req.body;
    const r = await db.execute(sql`
      INSERT INTO patient_insurance
        (tenant_id, patient_id, insurer_name, policy_number, coverage_amount, valid_from, valid_to, tpa_name)
      VALUES
        (${tid}, ${patient_id}, ${insurer_name}, ${policy_number ?? null}, ${coverage_amount ?? null},
         ${valid_from ?? null}, ${valid_to ?? null}, ${tpa_name ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/tpa/claims", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patient_id, admission_id, insurance_id, claimed_amount, diagnosis, treatment_summary } = req.body;
    const r = await db.execute(sql`
      INSERT INTO tpa_claims
        (tenant_id, patient_id, admission_id, insurance_id, claimed_amount, diagnosis, treatment_summary, status, created_at)
      VALUES
        (${tid}, ${patient_id}, ${admission_id ?? null}, ${insurance_id ?? null}, ${claimed_amount},
         ${diagnosis ?? null}, ${treatment_summary ?? null}, 'submitted', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/tpa/claims", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT tc.*, p.name AS patient_name, pi.insurer_name
      FROM tpa_claims tc
      LEFT JOIN patients p ON p.id = tc.patient_id
      LEFT JOIN patient_insurance pi ON pi.id = tc.insurance_id
      WHERE tc.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR tc.created_at::date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR tc.created_at::date <= ${to ?? null})
      ORDER BY tc.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/tpa/claims/:id/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { status, approved_amount, remarks } = req.body;
    const r = await db.execute(sql`
      UPDATE tpa_claims
      SET status=${status}, approved_amount=${approved_amount ?? null}, remarks=${remarks ?? null}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── EMR ───────────────────────────────────────────────────────────────────────

router.get("/emr/:patientId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patientId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM patient_emr WHERE patient_id=${patientId} AND tenant_id=${tid}
      ORDER BY created_at DESC LIMIT 1
    `);
    res.json(r.rows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/emr", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patient_id, admission_id, chief_complaint, diagnosis, treatment_plan, allergies, medications, notes } = req.body;
    const r = await db.execute(sql`
      INSERT INTO patient_emr
        (tenant_id, patient_id, admission_id, chief_complaint, diagnosis, treatment_plan, allergies, medications, notes, created_at)
      VALUES
        (${tid}, ${patient_id}, ${admission_id ?? null}, ${chief_complaint ?? null}, ${diagnosis ?? null},
         ${treatment_plan ?? null}, ${allergies ?? null}, ${medications ?? null}, ${notes ?? null}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/emr/:patientId/history", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patientId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM patient_emr WHERE patient_id=${patientId} AND tenant_id=${tid} ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Referrals ─────────────────────────────────────────────────────────────────

router.get("/referrals", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT pr.*, p.name AS patient_name, d.name AS referred_by_name
      FROM patient_referrals pr
      LEFT JOIN patients p ON p.id = pr.patient_id
      LEFT JOIN doctors d ON d.id = pr.referred_by_doctor_id
      WHERE pr.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR pr.referral_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR pr.referral_date <= ${to ?? null})
      ORDER BY pr.referral_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/referrals", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { patient_id, referred_by_doctor_id, referred_to, reason, referral_date, commission_pct } = req.body;
    const r = await db.execute(sql`
      INSERT INTO patient_referrals
        (tenant_id, patient_id, referred_by_doctor_id, referred_to, reason, referral_date, commission_pct)
      VALUES
        (${tid}, ${patient_id}, ${referred_by_doctor_id ?? null}, ${referred_to ?? null},
         ${reason ?? null}, ${referral_date ?? null}, ${commission_pct ?? 0})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/referrals/commission-report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.name AS doctor_name, COUNT(pr.id) AS referral_count,
             SUM(ib.net_amount * pr.commission_pct / 100) AS commission_payable
      FROM patient_referrals pr
      LEFT JOIN doctors d ON d.id = pr.referred_by_doctor_id
      LEFT JOIN ipd_admissions ia ON ia.patient_id = pr.patient_id
      LEFT JOIN ipd_bills ib ON ib.admission_id = ia.id AND ib.status = 'final'
      WHERE pr.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR pr.referral_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR pr.referral_date <= ${to ?? null})
      GROUP BY d.id, d.name
      ORDER BY commission_payable DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Blood Bank ────────────────────────────────────────────────────────────────

router.get("/blood-bank", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM blood_bank WHERE tenant_id=${tid} ORDER BY blood_group
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/blood-bank/stock", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { blood_group, units, expiry_date, donor_name } = req.body;
    const r = await db.execute(sql`
      INSERT INTO blood_bank (tenant_id, blood_group, units_available, expiry_date, donor_name, updated_at)
      VALUES (${tid}, ${blood_group}, ${units}, ${expiry_date ?? null}, ${donor_name ?? null}, NOW())
      ON CONFLICT (tenant_id, blood_group) DO UPDATE
        SET units_available = blood_bank.units_available + ${units}, updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/blood-bank/issue", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { blood_group, units, patient_id, admission_id, issued_to } = req.body;
    // Check availability
    const avail = await db.execute(sql`
      SELECT units_available FROM blood_bank WHERE tenant_id=${tid} AND blood_group=${blood_group}
    `);
    if (!avail.rows.length || Number((avail.rows[0] as any).units_available) < units) {
      return res.status(400).json({ message: "Insufficient blood units available" });
    }
    await db.execute(sql`
      UPDATE blood_bank
      SET units_available = units_available - ${units}, updated_at=NOW()
      WHERE tenant_id=${tid} AND blood_group=${blood_group}
    `);
    res.json({ success: true, blood_group, units_issued: units });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/blood-bank/availability/:bloodGroup", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { bloodGroup } = req.params;
    const r = await db.execute(sql`
      SELECT blood_group, units_available FROM blood_bank WHERE tenant_id=${tid} AND blood_group=${bloodGroup}
    `);
    res.json(r.rows[0] ?? { blood_group: bloodGroup, units_available: 0 });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/daily-census", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT ia.admission_date AS date,
             COUNT(DISTINCT ia.id) AS admissions,
             COUNT(DISTINCT CASE WHEN ia.discharge_date IS NOT NULL THEN ia.id END) AS discharges,
             COUNT(DISTINCT CASE WHEN ia.discharge_date IS NULL THEN ia.id END) AS current_inpatients
      FROM ipd_admissions ia
      WHERE ia.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR ia.admission_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR ia.admission_date <= ${to ?? null})
      GROUP BY ia.admission_date
      ORDER BY ia.admission_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/revenue-by-dept", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT ibi.charge_type AS department,
             COUNT(*) AS transaction_count,
             SUM(ibi.total) AS revenue
      FROM ipd_bill_items ibi
      JOIN ipd_bills ib ON ib.admission_id = ibi.admission_id AND ib.tenant_id=${tid}
      WHERE (${from ?? null} IS NULL OR ibi.created_at::date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR ibi.created_at::date <= ${to ?? null})
      GROUP BY ibi.charge_type
      ORDER BY revenue DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/bed-occupancy", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT w.name AS ward,
             COUNT(b.id) AS total_beds,
             COUNT(CASE WHEN b.status='occupied' THEN 1 END) AS occupied,
             COUNT(CASE WHEN b.status='available' THEN 1 END) AS available,
             ROUND(COUNT(CASE WHEN b.status='occupied' THEN 1 END)::numeric / NULLIF(COUNT(b.id),0) * 100, 2) AS occupancy_pct
      FROM hospital_beds b
      LEFT JOIN wards w ON w.id = b.ward_id
      WHERE b.tenant_id=${tid}
      GROUP BY w.id, w.name
      ORDER BY w.name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/doctor-revenue", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.name AS doctor_name, d.specialization,
             COUNT(DISTINCT ia.id) AS admissions,
             SUM(ib.net_amount) AS revenue
      FROM doctors d
      LEFT JOIN ipd_admissions ia ON ia.doctor_id = d.id AND ia.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR ia.admission_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR ia.admission_date <= ${to ?? null})
      LEFT JOIN ipd_bills ib ON ib.admission_id = ia.id AND ib.status='final'
      WHERE d.tenant_id=${tid}
      GROUP BY d.id, d.name, d.specialization
      ORDER BY revenue DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/lab-tat", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT lo.id, lo.created_at AS ordered_at, lo.resulted_at,
             EXTRACT(EPOCH FROM (lo.resulted_at - lo.created_at))/60 AS tat_minutes,
             p.name AS patient_name
      FROM lab_orders lo
      LEFT JOIN patients p ON p.id = lo.patient_id
      WHERE lo.tenant_id=${tid} AND lo.resulted_at IS NOT NULL
        AND (${from ?? null} IS NULL OR lo.created_at::date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR lo.created_at::date <= ${to ?? null})
      ORDER BY tat_minutes DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/tpa-outstanding", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT tc.*, p.name AS patient_name, pi.insurer_name,
             tc.claimed_amount - COALESCE(tc.approved_amount, 0) AS outstanding
      FROM tpa_claims tc
      LEFT JOIN patients p ON p.id = tc.patient_id
      LEFT JOIN patient_insurance pi ON pi.id = tc.insurance_id
      WHERE tc.tenant_id=${tid} AND tc.status NOT IN ('settled', 'rejected')
        AND (${from ?? null} IS NULL OR tc.created_at::date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR tc.created_at::date <= ${to ?? null})
      ORDER BY tc.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/discharge-summary/:admissionId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { admissionId } = req.params;
    const r = await db.execute(sql`
      SELECT ia.*,
             p.name AS patient_name, p.dob, p.gender, p.phone AS patient_phone, p.address AS patient_address,
             d.name AS doctor_name, d.specialization,
             ib.total_amount, ib.discount, ib.net_amount, ib.status AS bill_status,
             emr.chief_complaint, emr.diagnosis, emr.treatment_plan, emr.notes AS emr_notes
      FROM ipd_admissions ia
      JOIN patients p ON p.id = ia.patient_id
      LEFT JOIN doctors d ON d.id = ia.doctor_id
      LEFT JOIN ipd_bills ib ON ib.admission_id = ia.id
      LEFT JOIN patient_emr emr ON emr.admission_id = ia.id
      WHERE ia.id=${admissionId} AND ia.tenant_id=${tid}
    `);
    if (!r.rows.length) return res.status(404).json({ message: "Admission not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
