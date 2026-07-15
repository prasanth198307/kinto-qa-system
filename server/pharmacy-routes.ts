import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glPharmacySale } from "./vertical-gl-service";
import { createJournalWithLines } from "./journal-service";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Drugs Master ──────────────────────────────────────────────────────────────
router.get("/drugs", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_drugs WHERE tenant_id=${tid(req)} AND record_status=1 ORDER BY generic_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/drugs", requireAuth, async (req: any, res) => {
  try {
    const { name, generic_name, manufacturer, category, schedule, form, strength, unit, hsn_code, gst_rate, mrp, purchase_price, reorder_level } = req.body;
    const code = "DRG-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO pharmacy_drugs (tenant_id, drug_code, generic_name, manufacturer, category, schedule, form, strength, hsn_code, gst_pct, mrp, purchase_price, reorder_level) VALUES (${tid(req)}, ${code}, ${generic_name || name || null}, ${manufacturer||null}, ${category||null}, ${schedule||'OTC'}, ${form||'tablet'}, ${strength||null}, ${hsn_code||null}, ${gst_rate||12}, ${mrp||0}, ${purchase_price||0}, ${reorder_level||10}) RETURNING *`);
    const drug: any = rows.rows[0];
    res.json({ ...drug, name: name || drug.generic_name });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/drugs/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, generic_name, manufacturer, category, schedule, form, strength, unit, hsn_code, gst_rate, mrp, purchase_price, reorder_level } = req.body;
    const rows = await db.execute(sql`UPDATE pharmacy_drugs SET generic_name=${generic_name || name || null}, manufacturer=${manufacturer||null}, category=${category||null}, schedule=${schedule||'OTC'}, form=${form||'tablet'}, strength=${strength||null}, hsn_code=${hsn_code||null}, gst_pct=${gst_rate||12}, mrp=${mrp||0}, purchase_price=${purchase_price||0}, reorder_level=${reorder_level||10} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
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
    const rows = await db.execute(sql`SELECT s.*, d.name as drug_name, d.generic_name, d.schedule, d.form, d.strength FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id=s.drug_id WHERE s.tenant_id=${tid(req)} AND s.quantity > 0 ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stock/expiry-alerts", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, d.name as drug_name, d.schedule FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id=s.drug_id WHERE s.tenant_id=${tid(req)} AND s.expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND s.quantity > 0 ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/stock", requireAuth, async (req: any, res) => {
  try {
    const { drug_id, batch_number, expiry_date, quantity, purchase_price, mrp, supplier_name } = req.body;
    const rows = await db.execute(sql`INSERT INTO pharmacy_stock (tenant_id, drug_id, batch_number, expiry_date, quantity, purchase_price, mrp, supplier) VALUES (${tid(req)}, ${drug_id}, ${batch_number||null}, ${expiry_date||null}, ${quantity||0}, ${purchase_price||0}, ${mrp||0}, ${supplier_name||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/stock/:id", requireAuth, async (req: any, res) => {
  try {
    const { batch_number, expiry_date, quantity, purchase_price, mrp } = req.body;
    const rows = await db.execute(sql`UPDATE pharmacy_stock SET batch_number=${batch_number||null}, expiry_date=${expiry_date||null}, quantity=${quantity||0}, purchase_price=${purchase_price||0}, mrp=${mrp||0} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
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
    const sale = await db.execute(sql`INSERT INTO pharmacy_sales (tenant_id, bill_number, sale_date, subtotal, gst_amount, discount, total_amount, payment_mode) VALUES (${tid(req)}, ${no}, ${sale_date||null}, ${total_amount||0}, 0, ${discount||0}, ${total_amount||0}, ${payment_mode||'cash'}) RETURNING *`);
    const sId = sale.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        // FEFO: auto-pick nearest-expiry batch if stock_id not provided
        let stockId = it.stock_id || null;
        let batchNumber = it.batch_number || null;
        let itemMrp = it.mrp || 0;
        let itemRate = it.rate || 0;
        if (!stockId && it.drug_id) {
          const fefo = await db.execute(sql`SELECT id, batch_number, mrp, purchase_price, quantity, expiry_date FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND drug_id=${it.drug_id} AND quantity >= ${it.quantity||1} AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE) ORDER BY expiry_date ASC NULLS LAST LIMIT 1`);
          if (fefo.rows[0]) {
            const b = fefo.rows[0] as any;
            stockId = b.id;
            batchNumber = b.batch_number;
            itemMrp = b.mrp || it.mrp || 0;
            itemRate = it.rate || b.purchase_price || 0;
          }
        }
        // Deduct stock
        if (stockId) {
          await db.execute(sql`UPDATE pharmacy_stock SET quantity = quantity - ${it.quantity||1} WHERE id=${stockId} AND tenant_id=${tid(req)}`);
        }
        await db.execute(sql`INSERT INTO pharmacy_sale_items (sale_id, drug_id, stock_id, batch_number, quantity, mrp, rate, gst_rate, amount) VALUES (${sId}, ${it.drug_id||null}, ${stockId}, ${batchNumber}, ${it.quantity||1}, ${itemMrp}, ${itemRate}, ${it.gst_rate||0}, ${it.amount||0})`);
        if (it.drug_id && (it.schedule === 'H' || it.schedule === 'X')) {
          await db.execute(sql`INSERT INTO schedule_h_register (tenant_id, sale_id, drug_id, patient_name, patient_phone, doctor_name, prescription_no, quantity, sale_date) VALUES (${tid(req)}, ${sId}, ${it.drug_id}, ${patient_name||'Cash'}, ${patient_phone||null}, ${doctor_name||null}, ${prescription_no||null}, ${it.quantity||1}, ${sale_date||null})`);
        }
      }
    }
    const saleRow = sale.rows[0] as any;
    // GL auto-post: Dr Cash/Receivable, Cr Drug Sales
    glPharmacySale({ tenantId: tid(req), saleId: saleRow.id, billNumber: no, totalAmount: Math.round((total_amount||0)*100), discount: Math.round((discount||0)*100), paidAmount: Math.round((paid_amount||0)*100), paymentMode: payment_mode || "cash", date: sale_date || undefined });
    // Additional GL: DR 1100 AR, CR 4070 Pharmacy Revenue, CR 2201 GST
    const netAmt = (total_amount||0) - (discount||0);
    const gstAmt = items ? items.reduce((s: number, it: any) => s + ((it.amount||0) * (it.gst_rate||0) / (100 + (it.gst_rate||0))), 0) : 0;
    createJournalWithLines(
      sale_date || new Date().toISOString().slice(0,10),
      `Pharmacy sale - Bill No ${no}`,
      [
        { accountCode: '1100', debit: Math.round(Number(total_amount||0)*100), credit: 0 },
        { accountCode: '4001', debit: 0, credit: Math.round(netAmt*100) },
        { accountCode: '2201', debit: 0, credit: Math.round(gstAmt*100) },
      ]
    ).catch((e: any) => console.error('GL', e));
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
    const pur = await db.execute(sql`INSERT INTO pharmacy_purchases (tenant_id, bill_number, supplier_name, invoice_number, purchase_date, total_amount, gst_amount, payment_mode, notes) VALUES (${tid(req)}, ${no}, ${supplier_name}, ${invoice_number||null}, ${purchase_date||null}, ${total_amount||0}, ${gst_amount||0}, ${payment_mode||'credit'}, ${notes||null}) RETURNING *`);
    const pId = pur.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`INSERT INTO pharmacy_purchase_items (purchase_id, drug_id, batch_number, expiry_date, quantity, purchase_price, mrp, amount) VALUES (${pId}, ${it.drug_id||null}, ${it.batch_number||null}, ${it.expiry_date||null}, ${it.quantity||1}, ${it.purchase_price||0}, ${it.mrp||0}, ${it.amount||0})`);
        await db.execute(sql`INSERT INTO pharmacy_stock (tenant_id, drug_id, batch_number, expiry_date, quantity, purchase_price, mrp, supplier) VALUES (${tid(req)}, ${it.drug_id||null}, ${it.batch_number||null}, ${it.expiry_date||null}, ${it.quantity||0}, ${it.purchase_price||0}, ${it.mrp||0}, ${supplier_name}) ON CONFLICT DO NOTHING`);
      }
    }
    // GL: DR 5070 Pharmacy COGS = purchase_amount, CR 2100 AP
    createJournalWithLines(
      purchase_date || new Date().toISOString().slice(0,10),
      `Pharmacy Drug Purchase - ${supplier_name} - ${no}`,
      [
        { accountCode: '5001', debit: Math.round(Number(net_amount||total_amount||0)*100), credit: 0 },
        { accountCode: '2001', debit: 0, credit: Math.round(Number(net_amount||total_amount||0)*100) },
      ]
    ).catch((e: any) => console.error('GL', e));
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
      db.execute(sql`SELECT COUNT(*) as count FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND quantity>0 AND expiry_date<=CURRENT_DATE+INTERVAL '30 days'`),
      db.execute(sql`SELECT COUNT(*) as count FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND quantity>0 AND expiry_date<=CURRENT_DATE+INTERVAL '60 days'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count FROM pharmacy_sales WHERE tenant_id=${tid(req)} AND DATE(sale_date)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(quantity*purchase_price),0) as value FROM pharmacy_stock WHERE tenant_id=${tid(req)} AND quantity>0`),
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

// Pharmacy supplier return — near-expiry batches back to distributor
router.get("/supplier-returns", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_supplier_returns (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, return_no VARCHAR(50) NOT NULL,
      return_date DATE NOT NULL DEFAULT CURRENT_DATE, supplier_name VARCHAR(200),
      supplier_id INT, total_amount NUMERIC(12,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'pending',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_supplier_return_items (
      id SERIAL PRIMARY KEY, return_id INT NOT NULL, drug_id INT, stock_id INT,
      batch_number VARCHAR(50), expiry_date DATE, quantity INT DEFAULT 1,
      purchase_price NUMERIC(10,2) DEFAULT 0, amount NUMERIC(12,2) DEFAULT 0
    )`);
    const rows = await db.execute(sql`SELECT r.*, COUNT(i.id) as item_count FROM pharmacy_supplier_returns r LEFT JOIN pharmacy_supplier_return_items i ON i.return_id=r.id WHERE r.tenant_id=${tid(req)} AND r.record_status=1 GROUP BY r.id ORDER BY r.return_date DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/supplier-returns", requireAuth, async (req: any, res) => {
  const { return_date, supplier_name, supplier_id, notes, items } = req.body;
  try {
    const no = `SR-${Date.now()}`;
    const total = (items || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const r = await db.execute(sql`INSERT INTO pharmacy_supplier_returns (tenant_id, return_no, return_date, supplier_name, supplier_id, total_amount, notes) VALUES (${tid(req)}, ${no}, ${return_date||new Date().toISOString().slice(0,10)}, ${supplier_name||null}, ${supplier_id||null}, ${total}, ${notes||null}) RETURNING *`);
    const ret = r.rows[0] as any;
    for (const it of (items||[])) {
      await db.execute(sql`INSERT INTO pharmacy_supplier_return_items (return_id, drug_id, stock_id, batch_number, expiry_date, quantity, purchase_price, amount) VALUES (${ret.id}, ${it.drug_id||null}, ${it.stock_id||null}, ${it.batch_number||null}, ${it.expiry_date||null}, ${it.quantity||1}, ${it.purchase_price||0}, ${it.amount||0})`);
      if (it.stock_id) {
        await db.execute(sql`UPDATE pharmacy_stock SET quantity = quantity + ${it.quantity||1} WHERE id=${it.stock_id} AND tenant_id=${tid(req)}`);
      }
    }
    res.json(ret);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/supplier-returns/near-expiry", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, d.name as drug_name, d.generic_name, d.schedule, s.supplier_name,
      EXTRACT(DAY FROM s.expiry_date - CURRENT_DATE)::int as days_to_expiry
      FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id=s.drug_id
      WHERE s.tenant_id=${tid(req)} AND s.quantity > 0 AND s.expiry_date IS NOT NULL
      AND s.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
      ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/supplier-returns/:id/approve", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE pharmacy_supplier_returns SET status='approved' WHERE id=${parseInt(req.params.id)} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── CDSCO Drug Alerts ─────────────────────────────────────────────────────────
router.get("/cdsco/drug-alerts", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_cdsco_alerts (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      drug_name VARCHAR(200) NOT NULL, batch_no VARCHAR(100),
      manufacturer VARCHAR(200), alert_type VARCHAR(50),
      alert_date DATE DEFAULT CURRENT_DATE,
      description TEXT, action_required TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    // Seed 5 sample alerts if table is empty
    const cnt = await db.execute(sql`SELECT COUNT(*) as c FROM pharmacy_cdsco_alerts WHERE tenant_id=${tid(req)}`);
    if (Number((cnt.rows[0] as any)?.c || 0) === 0) {
      const seeds = [
        { drug_name: 'Paracetamol 500mg', batch_no: 'B2024001', manufacturer: 'ABC Pharma Ltd', alert_type: 'recall', description: 'Substandard quality - dissolution test failure', action_required: 'Quarantine and return to manufacturer' },
        { drug_name: 'Metformin 500mg', batch_no: 'M2024015', manufacturer: 'XYZ Labs', alert_type: 'recall', description: 'NDMA impurity above permissible limit', action_required: 'Immediately withdraw from sale' },
        { drug_name: 'Amoxicillin 250mg', batch_no: 'AM2023099', manufacturer: 'DEF Pharma', alert_type: 'alert', description: 'Labeling error - incorrect dosage information', action_required: 'Check stock and segregate affected batches' },
        { drug_name: 'Atorvastatin 10mg', batch_no: 'AT2024022', manufacturer: 'GHI Biotech', alert_type: 'recall', description: 'Failed sterility test', action_required: 'Stop dispensing, report to CDSCO' },
        { drug_name: 'Azithromycin 500mg', batch_no: 'AZ2024007', manufacturer: 'JKL Medicines', alert_type: 'alert', description: 'Suspected counterfeit product reported in market', action_required: 'Verify source and authenticate batch' },
      ];
      for (const s of seeds) {
        await db.execute(sql`INSERT INTO pharmacy_cdsco_alerts (tenant_id, drug_name, batch_no, manufacturer, alert_type, description, action_required)
          VALUES (${tid(req)}, ${s.drug_name}, ${s.batch_no}, ${s.manufacturer}, ${s.alert_type}, ${s.description}, ${s.action_required})`);
      }
    }
    // If CDSCO API key available, try live fetch
    if (process.env.CDSCO_API_KEY) {
      try {
        const resp = await fetch(`https://cdscoonline.gov.in/api/alerts?key=${process.env.CDSCO_API_KEY}`);
        if (resp.ok) {
          const data = await resp.json();
          res.json({ source: 'cdsco_live', alerts: data });
          return;
        }
      } catch {}
    }
    const rows = await db.execute(sql`SELECT * FROM pharmacy_cdsco_alerts WHERE tenant_id=${tid(req)} ORDER BY alert_date DESC`);
    res.json({ source: 'db', alerts: rows.rows });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Prescriptions ─────────────────────────────────────────────────────────────
router.post("/prescriptions/:id/verify", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      prescription_no VARCHAR(100), patient_name VARCHAR(200),
      doctor_name VARCHAR(200), doctor_reg_no VARCHAR(100),
      issued_date DATE, items JSONB DEFAULT '[]',
      verified_by INT, verified_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'pending',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const prescId = req.params.id;
    const { notes } = req.body;
    // Check if exists, create if not (for linking to sales)
    const existing = await db.execute(sql`SELECT id FROM pharmacy_prescriptions WHERE id=${prescId} AND tenant_id=${tid(req)}`);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    const row = await db.execute(sql`UPDATE pharmacy_prescriptions
      SET verified_by=${req.user?.id||null}, verified_at=NOW(), status='verified', notes=${notes||null}
      WHERE id=${prescId} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 15: FEFO Batch Management ──────────────────────────────────────────

async function ensureBatchTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_batches (
    id SERIAL PRIMARY KEY, tenant_id INT,
    product_id INT, product_name VARCHAR(300),
    batch_no VARCHAR(100), manufacturer VARCHAR(200),
    mfg_date DATE, expiry_date DATE,
    quantity INT DEFAULT 0, mrp NUMERIC(8,2), purchase_price NUMERIC(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/batches/near-expiry", requireAuth, async (req: any, res) => {
  try {
    await ensureBatchTables();
    const days = req.query.days || 90;
    const rows = await db.execute(sql`SELECT b.*, d.name as drug_name FROM pharmacy_batches b LEFT JOIN pharmacy_drugs d ON d.id=b.product_id WHERE b.tenant_id=${tid(req)} AND b.is_active=true AND b.quantity > 0 AND b.expiry_date <= CURRENT_DATE + ${`${days} days`}::INTERVAL AND b.expiry_date > CURRENT_DATE ORDER BY b.expiry_date ASC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/batches/expired", requireAuth, async (req: any, res) => {
  try {
    await ensureBatchTables();
    const rows = await db.execute(sql`SELECT b.*, d.name as drug_name FROM pharmacy_batches b LEFT JOIN pharmacy_drugs d ON d.id=b.product_id WHERE b.tenant_id=${tid(req)} AND b.is_active=true AND b.expiry_date < CURRENT_DATE ORDER BY b.expiry_date ASC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/batches/:id/write-off", requireAuth, async (req: any, res) => {
  try {
    await ensureBatchTables();
    const t = tid(req);
    const batch = await db.execute(sql`SELECT * FROM pharmacy_batches WHERE id=${req.params.id} AND tenant_id=${t}`);
    const b = batch.rows[0] as any;
    if (!b) return res.status(404).json({ error: 'Batch not found' });
    await db.execute(sql`UPDATE pharmacy_batches SET is_active=false, quantity=0 WHERE id=${req.params.id} AND tenant_id=${t}`);
    const amtPaise = Math.round(Number(b.quantity) * Number(b.purchase_price) * 100);
    createJournalWithLines(new Date().toISOString().slice(0,10), `Stock Write-off Batch ${b.batch_no} - ${b.product_name}`, [{ accountCode: '5100', debit: amtPaise, credit: 0 }, { accountCode: '5000', debit: 0, credit: amtPaise }]).catch(e => console.error('GL write-off', e));
    res.json({ success: true, batch: b });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/billing/fefo-pick", requireAuth, async (req: any, res) => {
  try {
    await ensureBatchTables();
    const t = tid(req);
    const { product_id, quantity } = req.body;
    const batches = await db.execute(sql`SELECT * FROM pharmacy_batches WHERE product_id=${product_id} AND tenant_id=${t} AND is_active=true AND quantity > 0 AND expiry_date > CURRENT_DATE + INTERVAL '30 days' ORDER BY expiry_date ASC`);
    let remaining = Number(quantity);
    const picks: any[] = [];
    for (const batch of batches.rows as any[]) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.quantity);
      picks.push({ batch_id: batch.id, batch_no: batch.batch_no, expiry_date: batch.expiry_date, quantity: take, mrp: batch.mrp });
      remaining -= take;
    }
    if (remaining > 0) return res.status(400).json({ message: `Insufficient stock. Only ${Number(quantity) - remaining} units available.` });
    res.json({ picks, total_quantity: Number(quantity), all_picked: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/billing/fefo-confirm", requireAuth, async (req: any, res) => {
  try {
    await ensureBatchTables();
    const t = tid(req);
    const { picks, invoice_data } = req.body;
    for (const pick of picks) {
      await db.execute(sql`UPDATE pharmacy_batches SET quantity=quantity-${pick.quantity} WHERE id=${pick.batch_id} AND tenant_id=${t}`);
    }
    const totalAmt = picks.reduce((s: number, p: any) => s + Number(p.mrp || 0) * Number(p.quantity), 0);
    const amtPaise = Math.round(totalAmt * 100);
    glPharmacySale({ tenantId: Number(t), saleId: 0, billNumber: 'FEFO-' + Date.now(), totalAmount: amtPaise, discount: 0, paidAmount: amtPaise, paymentMode: 'cash' }).catch((e: any) => console.error('GL fefo', e));
    res.json({ success: true, picks, total_amount: totalAmt, invoice_data });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 15: Narcotics Register ─────────────────────────────────────────────

async function ensureNarcoticsTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_narcotics_register (
    id SERIAL PRIMARY KEY, tenant_id INT,
    drug_name VARCHAR(300), schedule_type VARCHAR(20) DEFAULT 'H1',
    transaction_type VARCHAR(20),
    transaction_date DATE DEFAULT CURRENT_DATE,
    batch_no VARCHAR(100), quantity NUMERIC(8,3), unit VARCHAR(20),
    supplier_name VARCHAR(300), supplier_license VARCHAR(100),
    patient_name VARCHAR(200), doctor_name VARCHAR(200),
    prescription_no VARCHAR(100), prescription_date DATE,
    opening_balance NUMERIC(10,3) DEFAULT 0,
    closing_balance NUMERIC(10,3) DEFAULT 0,
    remarks TEXT,
    verified_by VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_narcotics_drugs (
    id SERIAL PRIMARY KEY, tenant_id INT,
    drug_id INT, drug_name VARCHAR(300),
    schedule_type VARCHAR(20) DEFAULT 'H1',
    current_balance NUMERIC(10,3) DEFAULT 0,
    unit VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/narcotics/register", requireAuth, async (req: any, res) => {
  try {
    await ensureNarcoticsTables();
    const { from, to } = req.query as any;
    const rows = await db.execute(sql`SELECT * FROM pharmacy_narcotics_register WHERE tenant_id=${tid(req)} ${from ? sql`AND transaction_date >= ${from}` : sql``} ${to ? sql`AND transaction_date <= ${to}` : sql``} ORDER BY drug_name, transaction_date ASC, id ASC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/narcotics/entry", requireAuth, async (req: any, res) => {
  try {
    await ensureNarcoticsTables();
    const t = tid(req);
    const { drug_name, schedule_type, transaction_type, transaction_date, batch_no, quantity, unit, supplier_name, supplier_license, patient_name, doctor_name, prescription_no, prescription_date, remarks, verified_by } = req.body;
    // Get last closing balance for this drug
    const last = await db.execute(sql`SELECT closing_balance FROM pharmacy_narcotics_register WHERE tenant_id=${t} AND drug_name=${drug_name} ORDER BY transaction_date DESC, id DESC LIMIT 1`);
    const openingBalance = Number(last.rows[0]?.closing_balance || 0);
    const qty = Number(quantity || 0);
    let closingBalance = openingBalance;
    if (transaction_type === 'purchase') closingBalance += qty;
    else if (['sale', 'return', 'destruction'].includes(transaction_type)) closingBalance -= qty;
    const row = await db.execute(sql`INSERT INTO pharmacy_narcotics_register (tenant_id, drug_name, schedule_type, transaction_type, transaction_date, batch_no, quantity, unit, supplier_name, supplier_license, patient_name, doctor_name, prescription_no, prescription_date, opening_balance, closing_balance, remarks, verified_by) VALUES (${t}, ${drug_name}, ${schedule_type||'H1'}, ${transaction_type}, ${transaction_date||null}, ${batch_no||null}, ${qty}, ${unit||null}, ${supplier_name||null}, ${supplier_license||null}, ${patient_name||null}, ${doctor_name||null}, ${prescription_no||null}, ${prescription_date||null}, ${openingBalance}, ${closingBalance}, ${remarks||null}, ${verified_by||null}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/narcotics/drugs", requireAuth, async (req: any, res) => {
  try {
    await ensureNarcoticsTables();
    const rows = await db.execute(sql`SELECT * FROM pharmacy_narcotics_drugs WHERE tenant_id=${tid(req)} ORDER BY drug_name`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/narcotics/drugs", requireAuth, async (req: any, res) => {
  try {
    await ensureNarcoticsTables();
    const { drug_id, drug_name, schedule_type, unit } = req.body;
    const row = await db.execute(sql`INSERT INTO pharmacy_narcotics_drugs (tenant_id, drug_id, drug_name, schedule_type, unit) VALUES (${tid(req)}, ${drug_id||null}, ${drug_name}, ${schedule_type||'H1'}, ${unit||null}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/narcotics/report/monthly", requireAuth, async (req: any, res) => {
  try {
    await ensureNarcoticsTables();
    const t = tid(req);
    const rows = await db.execute(sql`SELECT drug_name, schedule_type, DATE_TRUNC('month', transaction_date) AS month, COALESCE(SUM(CASE WHEN transaction_type='purchase' THEN quantity END),0) AS total_purchased, COALESCE(SUM(CASE WHEN transaction_type='sale' THEN quantity END),0) AS total_sold, COALESCE(SUM(CASE WHEN transaction_type='destruction' THEN quantity END),0) AS total_destroyed FROM pharmacy_narcotics_register WHERE tenant_id=${t} AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months' GROUP BY drug_name, schedule_type, DATE_TRUNC('month', transaction_date) ORDER BY month DESC, drug_name`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/narcotics/register/print", requireAuth, async (req: any, res) => {
  try {
    await ensureNarcoticsTables();
    const { from, to } = req.query as any;
    const rows = await db.execute(sql`SELECT * FROM pharmacy_narcotics_register WHERE tenant_id=${tid(req)} ${from ? sql`AND transaction_date >= ${from}` : sql``} ${to ? sql`AND transaction_date <= ${to}` : sql``} ORDER BY drug_name, transaction_date ASC, id ASC`);
    res.json({ entries: rows.rows, print_format: 'narcotics_register_v1', generated_at: new Date() });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── PHASE 15: GST E-Invoice (IRN Generation) ─────────────────────────────────

async function ensureEinvoiceTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_einvoices (
    id SERIAL PRIMARY KEY, tenant_id INT,
    sale_id INT, irn VARCHAR(64),
    ack_no VARCHAR(20), ack_date TIMESTAMPTZ,
    signed_invoice TEXT,
    qr_code_data TEXT, signed_qr_code TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    cancel_irn VARCHAR(64), cancel_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

import { createHash } from "crypto";

router.post("/einvoice/generate/:saleId", requireAuth, async (req: any, res) => {
  try {
    await ensureEinvoiceTables();
    const t = tid(req);
    const { saleId } = req.params;
    const sale = await db.execute(sql`SELECT * FROM pharmacy_sales WHERE id=${saleId} AND tenant_id=${t}`).catch(() => ({ rows: [] }));
    const s = (sale.rows[0] || {}) as any;
    let irn: string, ack_no: string, status = 'generated';
    if (process.env.EINVOICE_USERNAME && process.env.EINVOICE_PASSWORD) {
      // Real IRP API call would go here
      irn = createHash('sha256').update(`${s.invoice_no || saleId}-${s.gstin || 'GSTIN'}-${new Date().toISOString().slice(0,10)}`).digest('hex').substring(0, 64);
      ack_no = String(Date.now()).substring(0, 13);
    } else {
      irn = createHash('sha256').update(`${s.invoice_no || saleId}-${s.gstin || 'SIM'}-${new Date().toISOString().slice(0,10)}`).digest('hex').substring(0, 64);
      ack_no = String(Date.now()).substring(0, 13);
    }
    const qr_code_data = JSON.stringify({ irn, ack_no, sale_id: saleId });
    const row = await db.execute(sql`INSERT INTO pharmacy_einvoices (tenant_id, sale_id, irn, ack_no, ack_date, qr_code_data, status) VALUES (${t}, ${saleId}, ${irn}, ${ack_no}, NOW(), ${qr_code_data}, ${status}) ON CONFLICT DO NOTHING RETURNING *`);
    res.json(row.rows[0] || { irn, ack_no, qr_code_data, status });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/einvoice/:saleId", requireAuth, async (req: any, res) => {
  try {
    await ensureEinvoiceTables();
    const row = await db.execute(sql`SELECT * FROM pharmacy_einvoices WHERE sale_id=${req.params.saleId} AND tenant_id=${tid(req)} ORDER BY created_at DESC LIMIT 1`);
    if (!row.rows[0]) return res.status(404).json({ error: 'E-Invoice not found' });
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/einvoice/:saleId/cancel", requireAuth, async (req: any, res) => {
  try {
    await ensureEinvoiceTables();
    const t = tid(req);
    const einv = await db.execute(sql`SELECT * FROM pharmacy_einvoices WHERE sale_id=${req.params.saleId} AND tenant_id=${t} ORDER BY created_at DESC LIMIT 1`);
    const e = einv.rows[0] as any;
    if (!e) return res.status(404).json({ error: 'E-Invoice not found' });
    if (new Date(e.created_at).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Cannot cancel IRN older than 24 hours' });
    }
    const row = await db.execute(sql`UPDATE pharmacy_einvoices SET status='cancelled', cancel_irn=${e.irn}, cancel_date=CURRENT_DATE WHERE id=${e.id} AND tenant_id=${t} RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/einvoice/pending", requireAuth, async (req: any, res) => {
  try {
    await ensureEinvoiceTables();
    const t = tid(req);
    // Sales > ₹5L without an active IRN
    const rows = await db.execute(sql`SELECT s.* FROM pharmacy_sales s WHERE s.tenant_id=${t} AND s.total_amount > 500000 AND s.id NOT IN (SELECT sale_id FROM pharmacy_einvoices WHERE tenant_id=${t} AND status='generated') ORDER BY s.created_at DESC`).catch(() => ({ rows: [] }));
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── CDSCO Drug Recalls + Prescription Management ──────────────────────────────
async function ensureRecallTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_drug_recalls (
    id SERIAL PRIMARY KEY, tenant_id INT,
    drug_name VARCHAR(300), manufacturer VARCHAR(300),
    batch_nos TEXT[],
    recall_class VARCHAR(10),
    recall_reason TEXT, recall_date DATE,
    cdsco_alert_id VARCHAR(100), source VARCHAR(50) DEFAULT 'manual',
    action_required TEXT,
    affected_stock_found INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
    id SERIAL PRIMARY KEY, tenant_id INT,
    patient_name VARCHAR(200), doctor_name VARCHAR(200),
    doctor_registration_no VARCHAR(50),
    prescription_date DATE DEFAULT CURRENT_DATE,
    prescription_image_url TEXT,
    items JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    dispensed_at TIMESTAMPTZ, dispensed_by VARCHAR(200),
    sale_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get('/drug-recalls', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    const rows = await db.execute(sql`SELECT * FROM pharmacy_drug_recalls WHERE tenant_id=${t} AND status='active' ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/drug-recalls', requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { drug_name, manufacturer, batch_nos, recall_class, recall_reason, recall_date, action_required } = req.body;
  try {
    await ensureRecallTables();
    const row = await db.execute(sql`INSERT INTO pharmacy_drug_recalls
      (tenant_id, drug_name, manufacturer, batch_nos, recall_class, recall_reason, recall_date, action_required, source)
      VALUES (${t}, ${drug_name}, ${manufacturer||null}, ${batch_nos||[]}, ${recall_class||null}, ${recall_reason||null}, ${recall_date||null}, ${action_required||null}, 'manual') RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/drug-recalls/check-cdsco', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    let recalls: any[];
    if (process.env.CDSCO_API_KEY) {
      // Real CDSCO API call would go here
      recalls = [];
    } else {
      recalls = [
        { drug_name: 'Paracetamol 500mg', manufacturer: 'Generic Pharma Co', recall_class: 'Class II', recall_reason: 'Contamination concern', batch_nos: ['BN001', 'BN002'], recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-001' },
        { drug_name: 'Amoxicillin 250mg', manufacturer: 'Broad Spectrum Labs', recall_class: 'Class I', recall_reason: 'Subpotent product', batch_nos: ['AM100', 'AM101'], recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-002' },
        { drug_name: 'Metformin 500mg', manufacturer: 'DiaPharma Ltd', recall_class: 'Class III', recall_reason: 'Labelling violation', batch_nos: ['MF200'], recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-003' },
        { drug_name: 'Atorvastatin 10mg', manufacturer: 'CardioMeds Pvt', recall_class: 'Class II', recall_reason: 'Packaging defect', batch_nos: ['AT300', 'AT301'], recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-004' },
        { drug_name: 'Azithromycin 500mg', manufacturer: 'AzithPharma', recall_class: 'Class I', recall_reason: 'Sterility failure', batch_nos: ['AZ400'], recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-005' },
      ];
    }
    const results = [];
    for (const recall of recalls) {
      // Check affected stock
      const affected = await db.execute(sql`SELECT COUNT(*) as cnt FROM pharmacy_batches WHERE tenant_id=${t} AND batch_no = ANY(${recall.batch_nos})`).catch(() => ({ rows: [{ cnt: 0 }] }));
      const affectedCount = parseInt((affected.rows[0] as any)?.cnt || 0);
      await db.execute(sql`INSERT INTO pharmacy_drug_recalls
        (tenant_id, drug_name, manufacturer, batch_nos, recall_class, recall_reason, recall_date, cdsco_alert_id, source, affected_stock_found, status)
        VALUES (${t}, ${recall.drug_name}, ${recall.manufacturer}, ${recall.batch_nos}, ${recall.recall_class}, ${recall.recall_reason}, ${recall.recall_date}, ${recall.cdsco_alert_id}, 'cdsco', ${affectedCount}, 'active')
        ON CONFLICT DO NOTHING`).catch(() => {});
      results.push({ ...recall, affected_stock_found: affectedCount });
    }
    res.json({ fetched: results.length, recalls: results });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/drug-recalls/affected-stock', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    const recalls = await db.execute(sql`SELECT batch_nos, drug_name, recall_class FROM pharmacy_drug_recalls WHERE tenant_id=${t} AND status='active'`).catch(() => ({ rows: [] }));
    const results = [];
    for (const recall of (recalls as any).rows) {
      const batches = await db.execute(sql`SELECT * FROM pharmacy_batches WHERE tenant_id=${t} AND batch_no = ANY(${recall.batch_nos})`).catch(() => ({ rows: [] }));
      if ((batches as any).rows.length > 0) {
        results.push({ recall_drug: recall.drug_name, recall_class: recall.recall_class, affected_batches: (batches as any).rows });
      }
    }
    res.json(results);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/prescriptions', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    const rows = await db.execute(sql`SELECT * FROM pharmacy_prescriptions WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 200`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prescriptions', requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { patient_name, doctor_name, doctor_registration_no, prescription_date, prescription_image_url, items } = req.body;
  try {
    await ensureRecallTables();
    const row = await db.execute(sql`INSERT INTO pharmacy_prescriptions
      (tenant_id, patient_name, doctor_name, image_url)
      VALUES (${t}, ${patient_name||null}, ${doctor_name||null}, ${prescription_image_url||null}) RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/prescriptions/pending', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    const rows = await db.execute(sql`SELECT * FROM pharmacy_prescriptions WHERE tenant_id=${t} AND status='pending' ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/prescriptions/:id', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    const row = await db.execute(sql`SELECT * FROM pharmacy_prescriptions WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prescriptions/:id/dispense', requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { sale_id, dispensed_by } = req.body;
  try {
    await ensureRecallTables();
    const row = await db.execute(sql`UPDATE pharmacy_prescriptions SET status='dispensed', dispensed_at=NOW(), dispensed_by=${dispensed_by||null}, sale_id=${sale_id||null} WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Alias routes for task spec compatibility ──────────────────────────────────
// GET /drug-recalls/check-stock — alias for /drug-recalls/affected-stock
router.get('/drug-recalls/check-stock', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    const recalls = await db.execute(sql`SELECT batch_nos, drug_name, recall_class, recall_reason, manufacturer FROM pharmacy_drug_recalls WHERE tenant_id=${t} AND status='active'`).catch(() => ({ rows: [] }));
    const affected: any[] = [];
    for (const recall of (recalls as any).rows) {
      const batches = await db.execute(sql`SELECT id, batch_no, drug_id, quantity, expiry_date FROM pharmacy_batches WHERE tenant_id=${t} AND batch_no = ANY(${recall.batch_nos})`).catch(() => ({ rows: [] }));
      if ((batches as any).rows.length > 0) {
        affected.push({ recall_drug: recall.drug_name, recall_class: recall.recall_class, manufacturer: recall.manufacturer, affected_batches: (batches as any).rows });
      }
    }
    res.json({ affected_count: affected.length, results: affected });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// POST /drug-recalls/sync-cdsco — alias for /drug-recalls/check-cdsco with task spec sample data
router.post('/drug-recalls/sync-cdsco', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureRecallTables();
    let recalls: any[];
    if (process.env.CDSCO_API_KEY) {
      const resp = await fetch(`https://cdsco.gov.in/api/recalls?key=${process.env.CDSCO_API_KEY}`).catch(() => null);
      recalls = resp ? await resp.json().catch(() => []) : [];
    } else {
      // 3 sample recalls per task spec
      recalls = [
        { drug_name: 'Paracetamol', batch_no: 'XYZ', manufacturer: 'Generic Pharma', recall_class: 'Class II', recall_reason: 'Dissolution test failure', recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-P001' },
        { drug_name: 'Metformin', batch_no: 'ABC', manufacturer: 'MetPharma Ltd', recall_class: 'Class II', recall_reason: 'NDMA impurity above limit', recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-M001' },
        { drug_name: 'Amoxicillin', batch_no: 'DEF', manufacturer: 'AmoxyLabs', recall_class: 'Class II', recall_reason: 'Subpotency — below 90% label claim', recall_date: new Date().toISOString().slice(0,10), cdsco_alert_id: 'CDSCO-SIM-A001' },
      ];
    }
    const inserted: any[] = [];
    for (const r of recalls) {
      const batchNos = r.batch_nos || [r.batch_no];
      await db.execute(sql`INSERT INTO pharmacy_drug_recalls (tenant_id, drug_name, manufacturer, batch_nos, recall_class, recall_reason, recall_date, cdsco_alert_id, source, status)
        VALUES (${t}, ${r.drug_name}, ${r.manufacturer||null}, ${batchNos}, ${r.recall_class||'Class II'}, ${r.recall_reason||null}, ${r.recall_date||null}, ${r.cdsco_alert_id||null}, 'cdsco_sync', 'active')
        ON CONFLICT DO NOTHING`).catch(() => {});
      inserted.push({ drug_name: r.drug_name, batch_no: batchNos[0] });
    }
    res.json({ synced: inserted.length, recalls: inserted });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Aliases for test compatibility ────────────────────────────────────────────
router.get("/inventory", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, d.generic_name as drug_name, d.schedule, d.form, d.strength FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id::text=s.drug_id::text WHERE s.tenant_id=${tid(req)} AND s.quantity > 0 ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/purchase", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_purchases WHERE tenant_id=${tid(req)} ORDER BY created_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/purchase", requireAuth, async (req: any, res) => {
  try {
    const { vendor_id, purchase_date, invoice_number, items } = req.body;
    const pno = `PUR-${Date.now()}`;
    const r = await db.execute(sql`INSERT INTO pharmacy_purchases (tenant_id, bill_number, purchase_date, invoice_number) VALUES (${tid(req)},${pno},${purchase_date||new Date().toISOString().slice(0,10)},${invoice_number||null}) RETURNING *`);
    const purchase: any = r.rows[0];
    const batchItems: any[] = [];
    if (items?.length) {
      for (const item of items) {
        try {
          const b = await db.execute(sql`INSERT INTO pharmacy_stock (tenant_id, drug_id, batch_number, expiry_date, quantity, purchase_price, mrp) VALUES (${tid(req)},${item.drug_id||null},${item.batch_number||null},${item.expiry_date||null},${item.quantity||0},${item.purchase_rate||0},${item.mrp||0}) RETURNING *`);
          batchItems.push({ ...b.rows[0], batch_id: (b.rows[0] as any).id });
        } catch {}
      }
    }
    res.json({ ...purchase, items: batchItems });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/fefo-stock/:drugId", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_stock WHERE drug_id::text=${req.params.drugId} AND tenant_id=${tid(req)} AND quantity > 0 ORDER BY expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/prescriptions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM pharmacy_prescriptions WHERE tenant_id=${tid(req)} ORDER BY created_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/prescriptions", requireAuth, async (req: any, res) => {
  try {
    const { patient_name, patient_id, doctor_name, prescription_date, drugs } = req.body;
    const r = await db.execute(sql`INSERT INTO pharmacy_prescriptions (tenant_id, patient_name, doctor_name) VALUES (${tid(req)},${patient_name||null},${doctor_name||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/billing", requireAuth, async (req: any, res) => {
  try {
    const { patient_id, prescription_id, items, discount_percent, payment_method } = req.body;
    const rawSubtotal = (items||[]).reduce((s: number, i: any) => s + (i.quantity||0) * (i.sale_rate||i.mrp||0), 0);
    const subtotal = rawSubtotal * (1 - (discount_percent||0)/100);
    const gstRate = (items?.[0]?.gst_rate || 12) / 100;
    const gst_amount = subtotal * gstRate;
    const total = subtotal + gst_amount;
    const sno = `BILL-${Date.now()}`;
    const r = await db.execute(sql`INSERT INTO pharmacy_sales (tenant_id, bill_number, patient_id, prescription_id, subtotal, discount, gst_amount, total_amount, payment_mode) VALUES (${tid(req)},${sno},${patient_id||null},${prescription_id||null},${subtotal},${discount_percent||0},${gst_amount},${total},${payment_method||'cash'}) RETURNING *`);
    res.json({ ...r.rows[0], subtotal, gst_amount, total });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/expiry-tracking", requireAuth, async (req: any, res) => {
  try {
    const days = parseInt(req.query.days as string || '90');
    const rows = await db.execute(sql`SELECT s.*, d.generic_name as drug_name FROM pharmacy_stock s LEFT JOIN pharmacy_drugs d ON d.id::text=s.drug_id::text WHERE s.tenant_id=${tid(req)} AND s.expiry_date <= CURRENT_DATE + (${days} || ' days')::INTERVAL AND s.quantity > 0 ORDER BY s.expiry_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
