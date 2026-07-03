import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glPharmacySale } from "./vertical-gl-service";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Drugs Master ──────────────────────────────────────────────────────────────
router.get("/drugs", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_drugs WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/drugs", requireAuth, async (req: any, res) => {
  try {
    const { name, generic_name, manufacturer, category, schedule, form, strength, unit, hsn_code, gst_rate, mrp, purchase_price, reorder_level } = req.body;
    const code = "DRG-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO pharmacy_drugs (tenant_id, drug_code, name, generic_name, manufacturer, category, schedule, form, strength, unit, hsn_code, gst_rate, mrp, purchase_price, reorder_level) VALUES (${tid(req)}, ${code}, ${name}, ${generic_name||null}, ${manufacturer||null}, ${category||null}, ${schedule||'OTC'}, ${form||'tablet'}, ${strength||null}, ${unit||'strip'}, ${hsn_code||null}, ${gst_rate||12}, ${mrp||0}, ${purchase_price||0}, ${reorder_level||10}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/drugs/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, generic_name, manufacturer, category, schedule, form, strength, unit, hsn_code, gst_rate, mrp, purchase_price, reorder_level } = req.body;
    const rows = await db.execute(sql`UPDATE pharmacy_drugs SET name=${name}, generic_name=${generic_name||null}, manufacturer=${manufacturer||null}, category=${category||null}, schedule=${schedule||'OTC'}, form=${form||'tablet'}, strength=${strength||null}, unit=${unit||'strip'}, hsn_code=${hsn_code||null}, gst_rate=${gst_rate||12}, mrp=${mrp||0}, purchase_price=${purchase_price||0}, reorder_level=${reorder_level||10} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/drugs/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE pharmacy_drugs SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stock (batch-wise) ────────────────────────────────────────────────────────
router.get("/stock", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, d.name as drug_name, d.generic_name, d.schedule, d.form, d.strength FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id=s.drug_id WHERE s.tenant_id=${tid(req)} AND s.qty_available > 0 ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stock/expiry-alerts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, d.name as drug_name, d.schedule FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id=s.drug_id WHERE s.tenant_id=${tid(req)} AND s.expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND s.qty_available > 0 ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/stock", requireAuth, async (req: any, res) => {
  try {
    const { drug_id, batch_number, expiry_date, qty_received, purchase_price, mrp, supplier_name } = req.body;
    const rows = await db.execute(sql`INSERT INTO pharmacy_stock (tenant_id, drug_id, batch_number, expiry_date, qty_received, qty_available, purchase_price, mrp, supplier_name) VALUES (${tid(req)}, ${drug_id}, ${batch_number||null}, ${expiry_date||null}, ${qty_received||0}, ${qty_received||0}, ${purchase_price||0}, ${mrp||0}, ${supplier_name||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/stock/:id", requireAuth, async (req: any, res) => {
  try {
    const { batch_number, expiry_date, qty_available, purchase_price, mrp } = req.body;
    const rows = await db.execute(sql`UPDATE pharmacy_stock SET batch_number=${batch_number||null}, expiry_date=${expiry_date||null}, qty_available=${qty_available||0}, purchase_price=${purchase_price||0}, mrp=${mrp||0} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Sales / Billing ───────────────────────────────────────────────────────────
router.get("/sales", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_sales WHERE tenant_id=${tid(req)} ORDER BY sale_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/sales/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT si.*, d.name as drug_name, d.schedule FROM pharmacy_sale_items si LEFT JOIN pharmacy_drugs d ON d.id=si.drug_id WHERE si.sale_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/sales", requireAuth, async (req: any, res) => {
  try {
    const { patient_name, patient_phone, doctor_name, prescription_no, sale_date, total_amount, discount, paid_amount, payment_mode, notes, items } = req.body;
    const no = "PHS-" + Date.now();
    const bal = (total_amount||0) - (discount||0) - (paid_amount||0);
    const sale = await db.execute(sql`INSERT INTO pharmacy_sales (tenant_id, bill_number, patient_name, patient_phone, doctor_name, prescription_no, sale_date, total_amount, discount, paid_amount, balance_amount, payment_mode, notes) VALUES (${tid(req)}, ${no}, ${patient_name||'Cash'}, ${patient_phone||null}, ${doctor_name||null}, ${prescription_no||null}, ${sale_date||null}, ${total_amount||0}, ${discount||0}, ${paid_amount||0}, ${bal}, ${payment_mode||'cash'}, ${notes||null}) RETURNING *`);
    const sId = sale.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`INSERT INTO pharmacy_sale_items (sale_id, drug_id, stock_id, batch_number, quantity, mrp, rate, gst_rate, amount) VALUES (${sId}, ${it.drug_id||null}, ${it.stock_id||null}, ${it.batch_number||null}, ${it.quantity||1}, ${it.mrp||0}, ${it.rate||0}, ${it.gst_rate||0}, ${it.amount||0})`);
        if (it.stock_id) {
          await db.execute(sql`UPDATE pharmacy_stock SET qty_available=qty_available-${it.quantity||1} WHERE id=${it.stock_id} AND tenant_id=${tid(req)}`);
        }
        if (it.drug_id && (it.schedule === 'H' || it.schedule === 'X')) {
          await db.execute(sql`INSERT INTO schedule_h_register (tenant_id, sale_id, drug_id, patient_name, patient_phone, doctor_name, prescription_no, quantity, sale_date) VALUES (${tid(req)}, ${sId}, ${it.drug_id}, ${patient_name||'Cash'}, ${patient_phone||null}, ${doctor_name||null}, ${prescription_no||null}, ${it.quantity||1}, ${sale_date||null})`);
        }
      }
    }
    const saleRow = sale.rows[0] as any;
    // GL auto-post: Dr Cash/Receivable, Cr Drug Sales
    glPharmacySale({ tenantId: tid(req), saleId: saleRow.id, billNumber: no, totalAmount: Math.round((total_amount||0)*100), discount: Math.round((discount||0)*100), paidAmount: Math.round((paid_amount||0)*100), paymentMode: payment_mode || "cash", date: sale_date || undefined });
    res.json(saleRow);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Purchases ─────────────────────────────────────────────────────────────────
router.get("/purchases", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_purchases WHERE tenant_id=${tid(req)} ORDER BY purchase_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/purchases", requireAuth, async (req: any, res) => {
  try {
    const { supplier_name, invoice_number, purchase_date, total_amount, gst_amount, net_amount, payment_mode, notes, items } = req.body;
    const no = "PUR-" + Date.now();
    const pur = await db.execute(sql`INSERT INTO pharmacy_purchases (tenant_id, purchase_number, supplier_name, invoice_number, purchase_date, total_amount, gst_amount, net_amount, payment_mode, notes) VALUES (${tid(req)}, ${no}, ${supplier_name}, ${invoice_number||null}, ${purchase_date||null}, ${total_amount||0}, ${gst_amount||0}, ${net_amount||0}, ${payment_mode||'credit'}, ${notes||null}) RETURNING *`);
    const pId = pur.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`INSERT INTO pharmacy_purchase_items (purchase_id, drug_id, batch_number, expiry_date, quantity, purchase_price, mrp, amount) VALUES (${pId}, ${it.drug_id||null}, ${it.batch_number||null}, ${it.expiry_date||null}, ${it.quantity||1}, ${it.purchase_price||0}, ${it.mrp||0}, ${it.amount||0})`);
        await db.execute(sql`INSERT INTO pharmacy_stock (tenant_id, drug_id, batch_number, expiry_date, qty_received, qty_available, purchase_price, mrp, supplier_name) VALUES (${tid(req)}, ${it.drug_id||null}, ${it.batch_number||null}, ${it.expiry_date||null}, ${it.quantity||0}, ${it.quantity||0}, ${it.purchase_price||0}, ${it.mrp||0}, ${supplier_name}) ON CONFLICT DO NOTHING`);
      }
    }
    res.json(pur.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Schedule H Register ───────────────────────────────────────────────────────
router.get("/schedule-h", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT sh.*, d.name as drug_name, d.schedule FROM schedule_h_register sh LEFT JOIN pharmacy_drugs d ON d.id=sh.drug_id WHERE sh.tenant_id=${tid(req)} ORDER BY sh.sale_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Drug Licenses ─────────────────────────────────────────────────────────────
router.get("/licenses", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM drug_licenses WHERE tenant_id=${tid(req)} ORDER BY expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/licenses", requireAuth, async (req: any, res) => {
  try {
    const { license_type, license_number, issue_date, expiry_date, issuing_authority, notes } = req.body;
    const rows = await db.execute(sql`INSERT INTO drug_licenses (tenant_id, license_type, license_number, issue_date, expiry_date, issuing_authority, notes) VALUES (${tid(req)}, ${license_type}, ${license_number}, ${issue_date||null}, ${expiry_date||null}, ${issuing_authority||null}, ${notes||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/licenses/:id", requireAuth, async (req: any, res) => {
  try {
    const { license_type, license_number, issue_date, expiry_date, issuing_authority, notes } = req.body;
    const rows = await db.execute(sql`UPDATE drug_licenses SET license_type=${license_type}, license_number=${license_number}, issue_date=${issue_date||null}, expiry_date=${expiry_date||null}, issuing_authority=${issuing_authority||null}, notes=${notes||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/licenses/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM drug_licenses WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [drugs, expiring30, expiring60, todaySales, stockValue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM pharmacy_drugs WHERE tenant_id=${tid(req)} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as count FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND qty_available>0 AND expiry_date<=CURRENT_DATE+INTERVAL '30 days'`),
      db.execute(sql`SELECT COUNT(*) as count FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND qty_available>0 AND expiry_date<=CURRENT_DATE+INTERVAL '60 days'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count FROM pharmacy_sales WHERE tenant_id=${tid(req)} AND DATE(sale_date)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(qty_available*purchase_price),0) as value FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND qty_available>0`),
    ]);
    res.json({
      totalDrugs: Number(drugs.rows[0]?.count || 0),
      expiringIn30: Number(expiring30.rows[0]?.count || 0),
      expiringIn60: Number(expiring60.rows[0]?.count || 0),
      todaySalesAmount: Number(todaySales.rows[0]?.total || 0),
      todaySalesCount: Number(todaySales.rows[0]?.count || 0),
      stockValue: Number(stockValue.rows[0]?.value || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
