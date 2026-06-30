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

// ─── DRUG MASTER ENTERPRISE ──────────────────────────────────────────────────

router.get("/drugs/search", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const q = `%${req.query.q ?? ""}%`;
    const r = await db.execute(sql`
      SELECT id, name, generic_name, brand_name, hsn_code, gst_rate, schedule_type
      FROM pharmacy_drugs
      WHERE tenant_id = ${tid}
        AND (name ILIKE ${q} OR generic_name ILIKE ${q} OR brand_name ILIKE ${q})
      ORDER BY name LIMIT 50
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/drugs/:id/interactions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT di.*, d1.name AS drug1_name, d2.name AS drug2_name
      FROM drug_interactions di
      JOIN pharmacy_drugs d1 ON d1.id = di.drug1_id
      JOIN pharmacy_drugs d2 ON d2.id = di.drug2_id
      WHERE (di.drug1_id = ${id} OR di.drug2_id = ${id})
        AND (d1.tenant_id = ${tid} OR d2.tenant_id = ${tid})
      ORDER BY di.severity DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/drugs/:id/check-interaction", auth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { drug_ids } = req.body;
    const allIds = [id, ...drug_ids];
    const results: any[] = [];
    for (let i = 0; i < allIds.length; i++) {
      for (let j = i + 1; j < allIds.length; j++) {
        const r = await db.execute(sql`
          SELECT di.*, d1.name AS drug1_name, d2.name AS drug2_name
          FROM drug_interactions di
          JOIN pharmacy_drugs d1 ON d1.id = di.drug1_id
          JOIN pharmacy_drugs d2 ON d2.id = di.drug2_id
          WHERE (di.drug1_id = ${allIds[i]} AND di.drug2_id = ${allIds[j]})
             OR (di.drug1_id = ${allIds[j]} AND di.drug2_id = ${allIds[i]})
        `);
        results.push(...r.rows);
      }
    }
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/drugs/:id/alternatives", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const drug = await db.execute(sql`SELECT generic_name FROM pharmacy_drugs WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!drug.rows[0]) return res.status(404).json({ message: "Drug not found" });
    const genericName = (drug.rows[0] as any).generic_name;
    const r = await db.execute(sql`
      SELECT id, name, brand_name, generic_name, selling_price, current_stock
      FROM pharmacy_drugs
      WHERE tenant_id = ${tid} AND generic_name = ${genericName} AND id != ${id}
      ORDER BY selling_price ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── COMPLIANCE REGISTERS ────────────────────────────────────────────────────

router.get("/registers/schedule-h", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT r.*, r.product_name AS drug_name, 'H' AS schedule_type
      FROM pharmacy_compliance_registers r
      WHERE r.tenant_id = ${tid} AND r.register_type = 'H'
      ORDER BY r.sale_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/registers/schedule-h1", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT r.*, r.product_name AS drug_name, 'H1' AS schedule_type
      FROM pharmacy_compliance_registers r
      WHERE r.tenant_id = ${tid} AND r.register_type = 'H1'
      ORDER BY r.sale_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/registers/schedule-x", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT r.*, r.product_name AS drug_name, 'X' AS schedule_type
      FROM pharmacy_compliance_registers r
      WHERE r.tenant_id = ${tid} AND r.register_type = 'X'
      ORDER BY r.sale_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/registers/:type/export", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { type } = req.params;
    const scheduleType = type.toUpperCase();
    const r = await db.execute(sql`
      SELECT r.sale_date, r.patient_name, r.product_name AS drug_name, r.prescription_no,
        r.quantity as qty_sold, r.batch_no
      FROM pharmacy_compliance_registers r
      WHERE r.tenant_id = ${tid} AND r.register_type = ${scheduleType}
      ORDER BY r.sale_date ASC
    `);
    // Return data for Excel generation at the client layer
    res.json({ register_type: scheduleType, rows: r.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── PRESCRIPTION MANAGEMENT ─────────────────────────────────────────────────

router.post("/prescriptions/upload", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { sale_id, doctor_name, patient_name, prescription_date, image_url } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pharmacy_prescriptions (tenant_id, sale_id, doctor_name, patient_name, prescription_date, image_url, created_at)
      VALUES (${tid}, ${sale_id}, ${doctor_name}, ${patient_name}, ${prescription_date}, ${image_url}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/prescriptions", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.*
      FROM pharmacy_prescriptions p
      WHERE p.tenant_id = ${tid}
      ORDER BY p.id DESC LIMIT 100
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/prescriptions/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`SELECT * FROM pharmacy_prescriptions WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!r.rows[0]) return res.status(404).json({ message: "Prescription not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── FIFO BILLING ────────────────────────────────────────────────────────────

router.get("/billing/batch-suggestion/:productId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { productId } = req.params;
    const r = await db.execute(sql`
      SELECT b.id, b.batch_no, b.expiry_date, b.qty_remaining, b.purchase_price, b.selling_price
      FROM product_batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.product_id = ${productId} AND p.tenant_id = ${tid} AND b.qty_remaining > 0
      ORDER BY b.expiry_date ASC NULLS LAST, b.id ASC
      LIMIT 1
    `);
    res.json(r.rows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/billing/partial-pack", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { product_id, batch_id, quantity, total_pack_qty } = req.body;
    const check = await db.execute(sql`
      SELECT b.qty_remaining FROM product_batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.id = ${batch_id} AND b.product_id = ${product_id} AND p.tenant_id = ${tid}
    `);
    if (!check.rows[0]) return res.status(404).json({ message: "Batch not found" });
    const available = (check.rows[0] as any).qty_remaining;
    const deduct = quantity / total_pack_qty;
    if (available < deduct) return res.status(400).json({ message: "Insufficient stock in batch" });
    const r = await db.execute(sql`
      UPDATE product_batches SET qty_remaining = qty_remaining - ${deduct}
      WHERE id = ${batch_id}
      RETURNING *
    `);
    res.json({ batch: r.rows[0], deducted: deduct });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── CREDIT BILLING ──────────────────────────────────────────────────────────

router.get("/credit-customers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM pharmacy_credit_customers WHERE tenant_id = ${tid} ORDER BY name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/credit-customers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, credit_limit, payment_terms_days } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pharmacy_credit_customers (tenant_id, name, phone, credit_limit, payment_terms_days, outstanding_balance, created_at)
      VALUES (${tid}, ${name}, ${phone}, ${credit_limit}, ${payment_terms_days}, 0, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/credit-customers/:id/outstanding", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const customer = await db.execute(sql`SELECT * FROM pharmacy_credit_customers WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!customer.rows[0]) return res.status(404).json({ message: "Customer not found" });
    const bills = await db.execute(sql`
      SELECT b.id, b.bill_no, b.bill_date, b.total_amount, b.amount_paid,
        (b.total_amount - b.amount_paid) AS outstanding,
        (CURRENT_DATE - b.bill_date::date) AS age_days
      FROM pharmacy_credit_bills b
      WHERE b.credit_customer_id = ${id} AND b.tenant_id = ${tid} AND b.status != 'settled'
      ORDER BY b.bill_date ASC
    `);
    res.json({ customer: customer.rows[0], bills: bills.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/credit-customers/:id/settle", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { amount, payment_mode, reference } = req.body;
    await db.execute(sql`
      UPDATE pharmacy_credit_customers SET outstanding_balance = outstanding_balance - ${amount}
      WHERE id = ${id} AND tenant_id = ${tid}
    `);
    const r = await db.execute(sql`
      INSERT INTO pharmacy_credit_payments (tenant_id, credit_customer_id, amount, payment_mode, reference, paid_at)
      VALUES (${tid}, ${id}, ${amount}, ${payment_mode}, ${reference}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── SUPPLIER CREDIT NOTES ───────────────────────────────────────────────────

router.get("/supplier-credit-notes", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT cn.*, v.name AS vendor_name FROM pharmacy_supplier_credit_notes cn
      LEFT JOIN vendors v ON v.id = cn.vendor_id
      WHERE cn.tenant_id = ${tid}
      ORDER BY cn.id DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/supplier-credit-notes", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { vendor_id, items, reason } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pharmacy_supplier_credit_notes (tenant_id, vendor_id, items, reason, status, created_at)
      VALUES (${tid}, ${vendor_id}, ${JSON.stringify(items)}, ${reason}, 'open', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/supplier-credit-notes/:id/close", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE pharmacy_supplier_credit_notes SET status = 'settled', settled_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── STOCKTAKE ───────────────────────────────────────────────────────────────

router.post("/stocktake/start", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      INSERT INTO pharmacy_stocktake (tenant_id, status, started_at)
      VALUES (${tid}, 'in_progress', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/stocktake/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const session = await db.execute(sql`SELECT * FROM pharmacy_stocktake WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!session.rows[0]) return res.status(404).json({ message: "Stocktake not found" });
    const counts = await db.execute(sql`
      SELECT sc.*, p.name AS product_name, b.batch_no, b.expiry_date,
        b.qty_remaining AS expected_qty
      FROM pharmacy_stocktake_counts sc
      JOIN pharmacy_drugs p ON p.id = sc.product_id
      LEFT JOIN product_batches b ON b.id = sc.batch_id
      WHERE sc.stocktake_id = ${id}
    `);
    res.json({ session: session.rows[0], counts: counts.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/stocktake/:id/count", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { product_id, batch_id, counted_qty } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pharmacy_stocktake_counts (stocktake_id, tenant_id, product_id, batch_id, counted_qty, counted_at)
      VALUES (${id}, ${tid}, ${product_id}, ${batch_id}, ${counted_qty}, NOW())
      ON CONFLICT (stocktake_id, product_id, batch_id) DO UPDATE SET counted_qty = EXCLUDED.counted_qty, counted_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/stocktake/:id/finalize", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const variances = await db.execute(sql`
      SELECT sc.product_id, sc.batch_id, b.qty_remaining AS expected_qty,
        sc.counted_qty, (sc.counted_qty - b.qty_remaining) AS variance
      FROM pharmacy_stocktake_counts sc
      LEFT JOIN product_batches b ON b.id = sc.batch_id
      WHERE sc.stocktake_id = ${id} AND sc.tenant_id = ${tid}
    `);
    for (const row of variances.rows as any[]) {
      if (row.batch_id && row.variance !== 0) {
        await db.execute(sql`
          UPDATE product_batches SET qty_remaining = ${row.counted_qty}
          WHERE id = ${row.batch_id}
        `);
      }
    }
    await db.execute(sql`
      UPDATE pharmacy_stocktake SET status = 'finalized', finalized_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
    `);
    res.json({ finalized: true, variances: variances.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── MULTI-BRANCH ────────────────────────────────────────────────────────────

router.get("/branches", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM pharmacy_branches WHERE tenant_id = ${tid} ORDER BY id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/branches/:id/stock", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT bs.*, d.name AS drug_name, d.generic_name, d.schedule_type
      FROM pharmacy_branch_stock bs
      JOIN pharmacy_drugs d ON d.id = bs.drug_id
      WHERE bs.branch_id = ${id} AND bs.tenant_id = ${tid}
      ORDER BY d.name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/inter-branch-transfer", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from_branch, to_branch, items } = req.body;
    const transfer = await db.execute(sql`
      INSERT INTO pharmacy_branch_transfers (tenant_id, from_branch_id, to_branch_id, items, status, created_at)
      VALUES (${tid}, ${from_branch}, ${to_branch}, ${JSON.stringify(items)}, 'in_transit', NOW())
      RETURNING *
    `);
    res.json(transfer.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/inter-branch-transfers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT t.*, fb.name AS from_branch_name, tb.name AS to_branch_name
      FROM pharmacy_branch_transfers t
      JOIN pharmacy_branches fb ON fb.id = t.from_branch_id
      JOIN pharmacy_branches tb ON tb.id = t.to_branch_id
      WHERE t.tenant_id = ${tid}
      ORDER BY t.id DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

router.get("/reports/gst", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.hsn_code, d.gst_rate,
        SUM(si.qty) AS qty,
        SUM(si.taxable_amount) AS taxable_value,
        SUM(si.cgst_amount) AS cgst,
        SUM(si.sgst_amount) AS sgst,
        SUM(si.igst_amount) AS igst,
        SUM(si.gst_amount) AS total_gst,
        SUM(si.amount) AS total_amount
      FROM pharmacy_sale_items si
      JOIN pharmacy_drugs d ON d.id = si.drug_id
      JOIN pharmacy_sales s ON s.id = si.sale_id
      WHERE s.tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(s.sale_date) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(s.sale_date) <= ${to}::date)
      GROUP BY d.hsn_code, d.gst_rate
      ORDER BY d.hsn_code
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/expiry", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const days = parseInt(req.query.days ?? "90");
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.generic_name, b.batch_no, b.expiry_date, b.qty_remaining,
        (b.expiry_date - CURRENT_DATE) AS days_to_expiry
      FROM product_batches b
      JOIN pharmacy_drugs d ON d.id = b.product_id
      WHERE d.tenant_id = ${tid}
        AND b.expiry_date IS NOT NULL
        AND b.expiry_date <= CURRENT_DATE + (${days} || ' days')::interval
        AND b.qty_remaining > 0
      ORDER BY b.expiry_date ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/margin", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.generic_name,
        COALESCE(d.selling_price, 0) AS sale_price,
        COALESCE(d.purchase_price, 0) AS cost,
        CASE WHEN COALESCE(d.selling_price, 0) > 0
          THEN ROUND(((d.selling_price - COALESCE(d.purchase_price, 0)) / d.selling_price) * 100, 2)
          ELSE 0
        END AS margin_pct
      FROM pharmacy_drugs d
      WHERE d.tenant_id = ${tid}
      ORDER BY margin_pct DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/doctor-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT p.doctor_name,
        COUNT(DISTINCT s.id) AS prescription_count,
        SUM(s.total_amount) AS total_sales,
        SUM(si.qty) AS total_units
      FROM pharmacy_prescriptions p
      JOIN pharmacy_sales s ON s.prescription_id = p.id
      JOIN pharmacy_sale_items si ON si.sale_id = s.id
      WHERE s.tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(s.sale_date) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(s.sale_date) <= ${to}::date)
      GROUP BY p.doctor_name
      ORDER BY total_sales DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/purchase-vs-sales", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.generic_name,
        COALESCE(SUM(pi.qty * pi.rate), 0) AS purchase_value,
        COALESCE(SUM(si.qty * si.rate), 0) AS sale_value
      FROM pharmacy_drugs d
      LEFT JOIN pharmacy_purchase_items pi ON pi.drug_id = d.id
        AND (${from}::date IS NULL OR DATE(pi.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(pi.created_at) <= ${to}::date)
      LEFT JOIN pharmacy_sale_items si ON si.drug_id = d.id
        AND (${from}::date IS NULL OR DATE(si.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(si.created_at) <= ${to}::date)
      WHERE d.tenant_id = ${tid}
      GROUP BY d.id, d.name, d.generic_name
      ORDER BY sale_value DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/dead-stock", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT d.id, d.name, d.generic_name, COALESCE(d.current_stock, 0) AS current_stock,
        MAX(si.created_at) AS last_sale_date
      FROM pharmacy_drugs d
      LEFT JOIN pharmacy_sale_items si ON si.drug_id = d.id
      WHERE d.tenant_id = ${tid}
      GROUP BY d.id, d.name, d.generic_name, d.current_stock
      HAVING MAX(si.created_at) IS NULL OR MAX(si.created_at) < CURRENT_DATE - INTERVAL '90 days'
      ORDER BY d.name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
