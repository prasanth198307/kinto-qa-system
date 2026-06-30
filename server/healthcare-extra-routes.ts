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

// ─── ABHA / DIGITAL HEALTH ───────────────────────────────────────────────────

router.get("/abha/patient/:patientId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patientId } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM patient_abha_records
      WHERE tenant_id = ${tenantId} AND patient_id = ${patientId}
    `);
    res.json(r.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/abha/create", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, aadhar_number, mobile } = req.body;
    // Simulate ABDM API response
    const abha_id = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const abha_address = `patient${patient_id}@abdm`;
    const qr_code_url = `https://abha.abdm.gov.in/qr/${abha_id.replace(/-/g, "")}`;
    await db.execute(sql`
      INSERT INTO patient_abha_records (tenant_id, patient_id, abha_id, abha_address, qr_code_url, aadhar_last4, mobile, created_at)
      VALUES (${tenantId}, ${patient_id}, ${abha_id}, ${abha_address}, ${qr_code_url},
              ${String(aadhar_number).slice(-4)}, ${mobile}, NOW())
      ON CONFLICT (tenant_id, patient_id) DO UPDATE
        SET abha_id = EXCLUDED.abha_id, abha_address = EXCLUDED.abha_address,
            qr_code_url = EXCLUDED.qr_code_url, updated_at = NOW()
    `);
    res.json({ abha_id, abha_address, qr_code_url });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/abha/link", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, abha_id } = req.body;
    const abha_address = `patient${patient_id}@abdm`;
    const qr_code_url = `https://abha.abdm.gov.in/qr/${abha_id.replace(/-/g, "")}`;
    await db.execute(sql`
      INSERT INTO patient_abha_records (tenant_id, patient_id, abha_id, abha_address, qr_code_url, created_at)
      VALUES (${tenantId}, ${patient_id}, ${abha_id}, ${abha_address}, ${qr_code_url}, NOW())
      ON CONFLICT (tenant_id, patient_id) DO UPDATE
        SET abha_id = EXCLUDED.abha_id, abha_address = EXCLUDED.abha_address, updated_at = NOW()
    `);
    res.json({ success: true, abha_id, abha_address });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/abha/health-records/:patientId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patientId } = req.params;
    const r = await db.execute(sql`
      SELECT ahr.*, par.abha_id, par.abha_address
      FROM patient_abha_records par
      LEFT JOIN abha_health_records ahr
        ON ahr.tenant_id = par.tenant_id AND ahr.patient_id = par.patient_id
      WHERE par.tenant_id = ${tenantId} AND par.patient_id = ${patientId}
      ORDER BY ahr.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/abha/share-record", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, record_type, record_id, consent_token } = req.body;
    await db.execute(sql`
      INSERT INTO abha_share_logs (tenant_id, patient_id, record_type, record_id, consent_token, shared_at)
      VALUES (${tenantId}, ${patient_id}, ${record_type}, ${record_id}, ${consent_token}, NOW())
    `);
    res.json({ success: true, message: "Health record shared via ABDM" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── TELEMEDICINE ─────────────────────────────────────────────────────────────

router.get("/telemedicine/appointments", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ta.*, p.name AS patient_name, d.name AS doctor_name
      FROM telemedicine_appointments ta
      LEFT JOIN patients p ON p.id = ta.patient_id AND p.tenant_id = ta.tenant_id
      LEFT JOIN doctors d ON d.id = ta.doctor_id AND d.tenant_id = ta.tenant_id
      WHERE ta.tenant_id = ${tenantId}
      ORDER BY ta.slot_date DESC, ta.slot_time DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/telemedicine/appointments", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, doctor_id, slot_date, slot_time, consultation_fee } = req.body;
    const join_token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const video_link = `https://meet.kinto.health/room/${join_token}`;
    const sms_link = `https://kinto.health/join/${join_token}`;
    const r = await db.execute(sql`
      INSERT INTO telemedicine_appointments
        (tenant_id, patient_id, doctor_id, slot_date, slot_time, consultation_fee,
         video_link, join_token, sms_link, status, created_at)
      VALUES (${tenantId}, ${patient_id}, ${doctor_id}, ${slot_date}, ${slot_time},
              ${consultation_fee}, ${video_link}, ${join_token}, ${sms_link}, 'scheduled', NOW())
      RETURNING *
    `);
    res.json({ ...r.rows[0], video_link, join_token, sms_link });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/telemedicine/appointments/:id/start", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE telemedicine_appointments
      SET meeting_started_at = NOW(), status = 'in_progress'
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/telemedicine/appointments/:id/complete", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { duration_mins } = req.body;
    const r = await db.execute(sql`
      UPDATE telemedicine_appointments
      SET completed_at = NOW(), duration_mins = ${duration_mins}, status = 'completed'
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/telemedicine/appointments/:id/join", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT video_link, join_token, slot_date, slot_time, status
      FROM telemedicine_appointments
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);
    if (!r.rows[0]) return res.status(404).json({ message: "Appointment not found" });
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/telemedicine/e-prescription", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { appointment_id, drugs, diagnosis } = req.body;
    const r = await db.execute(sql`
      INSERT INTO telemedicine_prescriptions
        (tenant_id, appointment_id, drugs, diagnosis, created_at)
      VALUES (${tenantId}, ${appointment_id}, ${JSON.stringify(drugs)}, ${diagnosis}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/telemedicine/payment-link", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { appointment_id } = req.body;
    const r = await db.execute(sql`
      SELECT consultation_fee, patient_id FROM telemedicine_appointments
      WHERE id = ${appointment_id} AND tenant_id = ${tenantId}
    `);
    if (!r.rows[0]) return res.status(404).json({ message: "Appointment not found" });
    const payment_url = `https://pay.kinto.health/tele/${appointment_id}?token=${Date.now()}`;
    res.json({ payment_url, amount: r.rows[0].consultation_fee });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── NABH ACCREDITATION ──────────────────────────────────────────────────────

router.get("/nabh/checklists", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM nabh_checklists WHERE tenant_id = ${tenantId} ORDER BY standard_code
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/nabh/checklists", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { standard_code, standard_name, checklist_items } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nabh_checklists (tenant_id, standard_code, standard_name, checklist_items, status, created_at)
      VALUES (${tenantId}, ${standard_code}, ${standard_name}, ${JSON.stringify(checklist_items)}, 'pending', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/nabh/checklists/:id/submit", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { responses } = req.body;
    const r = await db.execute(sql`
      UPDATE nabh_checklists
      SET responses = ${JSON.stringify(responses)}, status = 'submitted', submitted_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/nabh/incidents", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM nabh_incidents WHERE tenant_id = ${tenantId} ORDER BY date DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/nabh/incidents", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { incident_type, date, location, description, severity, reported_by } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nabh_incidents
        (tenant_id, incident_type, date, location, description, severity, reported_by, status, created_at)
      VALUES (${tenantId}, ${incident_type}, ${date}, ${location}, ${description},
              ${severity}, ${reported_by}, 'open', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/nabh/incidents/:id/close", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { root_cause, corrective_action } = req.body;
    const r = await db.execute(sql`
      UPDATE nabh_incidents
      SET root_cause = ${root_cause}, corrective_action = ${corrective_action},
          status = 'closed', closed_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/nabh/surveys", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT ns.*, p.name AS patient_name
      FROM nabh_surveys ns
      LEFT JOIN patients p ON p.id = ns.patient_id AND p.tenant_id = ns.tenant_id
      WHERE ns.tenant_id = ${tenantId}
      ORDER BY ns.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/nabh/surveys", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, admission_id, responses } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nabh_surveys (tenant_id, patient_id, admission_id, responses, created_at)
      VALUES (${tenantId}, ${patient_id}, ${admission_id}, ${JSON.stringify(responses)}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/nabh/quality-indicators", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        metric,
        value,
        month,
        created_at
      FROM nabh_quality_indicators
      WHERE tenant_id = ${tenantId}
      ORDER BY month DESC, metric
    `);
    // Pivot to summary object for current month
    const summary: Record<string, any> = {};
    for (const row of r.rows as any[]) {
      summary[row.metric as string] = row.value;
    }
    res.json({ indicators: r.rows, summary });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/nabh/quality-indicators", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { metric, value, month } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nabh_quality_indicators (tenant_id, metric, value, month, created_at)
      VALUES (${tenantId}, ${metric}, ${value}, ${month}, NOW())
      ON CONFLICT (tenant_id, metric, month) DO UPDATE SET value = EXCLUDED.value
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/nabh/policies", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM nabh_policies WHERE tenant_id = ${tenantId} ORDER BY category, policy_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/nabh/policies", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { policy_name, category, effective_date, doc_url } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nabh_policies (tenant_id, policy_name, category, effective_date, doc_url, created_at)
      VALUES (${tenantId}, ${policy_name}, ${category}, ${effective_date}, ${doc_url}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CLINICAL FEATURES ───────────────────────────────────────────────────────

router.post("/clinical/soap-notes", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, appointment_id, subjective, objective, assessment, plan, follow_up } = req.body;
    const r = await db.execute(sql`
      INSERT INTO clinical_soap_notes
        (tenant_id, patient_id, appointment_id, subjective, objective, assessment, plan, follow_up, created_at)
      VALUES (${tenantId}, ${patient_id}, ${appointment_id}, ${subjective}, ${objective},
              ${assessment}, ${plan}, ${follow_up}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clinical/soap-notes/:patientId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patientId } = req.params;
    const r = await db.execute(sql`
      SELECT csn.*, d.name AS doctor_name
      FROM clinical_soap_notes csn
      LEFT JOIN telemedicine_appointments ta ON ta.id = csn.appointment_id
      LEFT JOIN doctors d ON d.id = ta.doctor_id
      WHERE csn.tenant_id = ${tenantId} AND csn.patient_id = ${patientId}
      ORDER BY csn.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clinical/templates", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM clinical_templates WHERE tenant_id = ${tenantId} ORDER BY specialty, template_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/clinical/templates", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { specialty, template_name, template_content } = req.body;
    const r = await db.execute(sql`
      INSERT INTO clinical_templates (tenant_id, specialty, template_name, template_content, created_at)
      VALUES (${tenantId}, ${specialty}, ${template_name}, ${template_content}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/clinical/drug-allergy-check", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, drug_ids } = req.body;
    const r = await db.execute(sql`
      SELECT pa.allergen, pa.reaction, d.name AS drug_name, d.id AS drug_id
      FROM patient_allergies pa
      JOIN drugs d ON d.allergy_group = pa.allergen
      WHERE pa.tenant_id = ${tenantId}
        AND pa.patient_id = ${patient_id}
        AND d.id = ANY(${drug_ids}::int[])
    `);
    res.json({ conflicts: r.rows, has_conflicts: r.rows.length > 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/clinical/drug-interaction", auth, async (req, res) => {
  try {
    const { drug_ids } = req.body;
    const r = await db.execute(sql`
      SELECT di.drug1_id, d1.name AS drug1_name, di.drug2_id, d2.name AS drug2_name,
             di.interaction_type, di.severity, di.description
      FROM drug_interactions di
      JOIN drugs d1 ON d1.id = di.drug1_id
      JOIN drugs d2 ON d2.id = di.drug2_id
      WHERE di.drug1_id = ANY(${drug_ids}::int[])
        AND di.drug2_id = ANY(${drug_ids}::int[])
    `);
    res.json({ interactions: r.rows, has_interactions: r.rows.length > 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clinical/order-sets", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM clinical_order_sets WHERE tenant_id = ${tenantId} ORDER BY condition_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/clinical/order-sets", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { condition_name, orders } = req.body;
    const r = await db.execute(sql`
      INSERT INTO clinical_order_sets (tenant_id, condition_name, orders, created_at)
      VALUES (${tenantId}, ${condition_name}, ${JSON.stringify(orders)}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clinical/discharge-instructions/:admissionId", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { admissionId } = req.params;
    const r = await db.execute(sql`
      SELECT
        a.*,
        p.name AS patient_name, p.age, p.gender,
        d.name AS doctor_name,
        csn.assessment AS diagnosis,
        csn.plan AS treatment_plan,
        csn.follow_up,
        tp.drugs AS prescribed_drugs
      FROM admissions a
      LEFT JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
      LEFT JOIN clinical_soap_notes csn ON csn.patient_id = a.patient_id AND csn.tenant_id = a.tenant_id
      LEFT JOIN telemedicine_prescriptions tp ON tp.appointment_id = csn.appointment_id
      WHERE a.tenant_id = ${tenantId} AND a.id = ${admissionId}
      ORDER BY csn.created_at DESC
      LIMIT 1
    `);
    res.json(r.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── QUEUE MANAGEMENT ────────────────────────────────────────────────────────

router.get("/queue/tokens", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT qt.*, p.name AS patient_name, d.name AS doctor_name
      FROM queue_tokens qt
      LEFT JOIN patients p ON p.id = qt.patient_id AND p.tenant_id = qt.tenant_id
      LEFT JOIN doctors d ON d.id = qt.doctor_id AND d.tenant_id = qt.tenant_id
      WHERE qt.tenant_id = ${tenantId} AND qt.token_date = CURRENT_DATE
      ORDER BY qt.token_number ASC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/queue/tokens/issue", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { patient_id, doctor_id, department } = req.body;
    // Get next token number for today
    const countR = await db.execute(sql`
      SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
      FROM queue_tokens
      WHERE tenant_id = ${tenantId} AND doctor_id = ${doctor_id} AND token_date = CURRENT_DATE
    `);
    const token_number = (countR.rows[0] as any).next_token;
    const r = await db.execute(sql`
      INSERT INTO queue_tokens
        (tenant_id, patient_id, doctor_id, department, token_number, token_date, status, created_at)
      VALUES (${tenantId}, ${patient_id}, ${doctor_id}, ${department}, ${token_number}, CURRENT_DATE, 'waiting', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/queue/tokens/:id/call", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE queue_tokens
      SET status = 'called', called_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/queue/tokens/:id/complete", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE queue_tokens
      SET status = 'completed', completed_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ONLINE APPOINTMENTS (PUBLIC) ────────────────────────────────────────────

router.post("/appointments/online/book", async (req, res) => {
  try {
    const { patient_name, phone, doctor_id, date, slot } = req.body;
    // Check slot availability
    const slotCheck = await db.execute(sql`
      SELECT id FROM online_appointments
      WHERE doctor_id = ${doctor_id} AND appointment_date = ${date} AND slot_time = ${slot}
        AND status != 'cancelled'
    `);
    if (slotCheck.rows.length > 0) {
      return res.status(409).json({ message: "Slot already booked" });
    }
    const r = await db.execute(sql`
      INSERT INTO online_appointments
        (patient_name, phone, doctor_id, appointment_date, slot_time, status, booked_at)
      VALUES (${patient_name}, ${phone}, ${doctor_id}, ${date}, ${slot}, 'confirmed', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/appointments/available-slots", async (req, res) => {
  try {
    const { doctor_id, date } = req.query as { doctor_id: string; date: string };
    const bookedR = await db.execute(sql`
      SELECT slot_time FROM online_appointments
      WHERE doctor_id = ${doctor_id} AND appointment_date = ${date} AND status != 'cancelled'
    `);
    const booked = (bookedR.rows as any[]).map((r) => r.slot_time);
    // Standard slots 9am-5pm, 30min intervals
    const allSlots = [];
    for (let h = 9; h < 17; h++) {
      for (const m of ["00", "30"]) {
        allSlots.push(`${String(h).padStart(2, "0")}:${m}`);
      }
    }
    const available = allSlots.filter((s) => !booked.includes(s));
    res.json({ date, doctor_id, available_slots: available, booked_slots: booked });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/appointments/:id/reminder", auth, async (req, res) => {
  try {
    // Simulate WhatsApp reminder dispatch
    res.json({ success: true, message: "WhatsApp reminder sent" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── BIOMEDICAL EQUIPMENT ────────────────────────────────────────────────────

router.get("/equipment", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT be.*,
        (SELECT service_date FROM equipment_service_logs esl WHERE esl.equipment_id = be.id ORDER BY service_date DESC LIMIT 1) AS last_service_date,
        (SELECT next_due FROM equipment_service_logs esl WHERE esl.equipment_id = be.id ORDER BY service_date DESC LIMIT 1) AS next_service_due
      FROM biomedical_equipment be
      WHERE be.tenant_id = ${tenantId}
      ORDER BY be.dept, be.equipment_name
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/equipment", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { equipment_name, make, model, serial_no, dept, purchase_date } = req.body;
    const r = await db.execute(sql`
      INSERT INTO biomedical_equipment
        (tenant_id, equipment_name, make, model, serial_no, dept, purchase_date, status, created_at)
      VALUES (${tenantId}, ${equipment_name}, ${make}, ${model}, ${serial_no}, ${dept}, ${purchase_date}, 'active', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/equipment/:id/service", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { service_date, service_type, technician, cost, next_due } = req.body;
    const r = await db.execute(sql`
      INSERT INTO equipment_service_logs
        (tenant_id, equipment_id, service_date, service_type, technician, cost, next_due, created_at)
      VALUES (${tenantId}, ${id}, ${service_date}, ${service_type}, ${technician}, ${cost}, ${next_due}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/equipment/:id/service-history", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM equipment_service_logs
      WHERE tenant_id = ${tenantId} AND equipment_id = ${id}
      ORDER BY service_date DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DRUG MANAGEMENT (HOSPITAL) ──────────────────────────────────────────────

router.get("/drug-indent/requests", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT di.*, u.name AS requested_by_name
      FROM drug_indents di
      LEFT JOIN users u ON u.id = di.requested_by
      WHERE di.tenant_id = ${tenantId}
      ORDER BY di.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/drug-indent/request", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { ward, requested_by, drugs } = req.body;
    const r = await db.execute(sql`
      INSERT INTO drug_indents (tenant_id, ward, requested_by, drugs, status, created_at)
      VALUES (${tenantId}, ${ward}, ${requested_by}, ${JSON.stringify(drugs)}, 'pending', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/drug-indent/:id/approve", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { approved_by, approved_items } = req.body;
    const r = await db.execute(sql`
      UPDATE drug_indents
      SET approved_by = ${approved_by}, approved_items = ${JSON.stringify(approved_items)},
          status = 'approved', approved_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/drug-indent/:id/dispense", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    // Fetch approved items and deduct from pharmacy stock
    const indentR = await db.execute(sql`
      SELECT approved_items FROM drug_indents
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'approved'
    `);
    if (!indentR.rows[0]) return res.status(404).json({ message: "Approved indent not found" });
    const items = (indentR.rows[0] as any).approved_items ?? [];
    for (const item of items) {
      await db.execute(sql`
        UPDATE pharmacy_stock
        SET quantity = quantity - ${item.qty}, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND drug_id = ${item.drug_id}
      `);
    }
    await db.execute(sql`
      UPDATE drug_indents SET status = 'dispensed', dispensed_at = NOW() WHERE id = ${id}
    `);
    res.json({ success: true, dispensed_items: items });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/narcotic-register", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const r = await db.execute(sql`
      SELECT nr.*, d.name AS drug_name, p.name AS patient_name,
             doc.name AS prescribed_by_name, u.name AS double_check_by_name
      FROM narcotic_register nr
      LEFT JOIN drugs d ON d.id = nr.drug_id
      LEFT JOIN patients p ON p.id = nr.patient_id AND p.tenant_id = nr.tenant_id
      LEFT JOIN doctors doc ON doc.id = nr.prescribed_by
      LEFT JOIN users u ON u.id = nr.double_check_by
      WHERE nr.tenant_id = ${tenantId}
      ORDER BY nr.created_at DESC
    `);
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/narcotic-register", auth, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { drug_id, patient_id, qty, prescribed_by, double_check_by } = req.body;
    const r = await db.execute(sql`
      INSERT INTO narcotic_register
        (tenant_id, drug_id, patient_id, qty, prescribed_by, double_check_by, created_at)
      VALUES (${tenantId}, ${drug_id}, ${patient_id}, ${qty}, ${prescribed_by}, ${double_check_by}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
