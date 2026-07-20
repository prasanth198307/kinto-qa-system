import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};

// ─── Fixed Assets ─────────────────────────────────────────────────────────────
router.get("/fixed-assets", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { status, category } = req.query;
    let q = `SELECT * FROM fixed_assets WHERE tenant_id=${tid} AND record_status=1`;
    if (status)   q += ` AND status='${status}'`;
    if (category) q += ` AND category='${category}'`;
    q += ` ORDER BY asset_name`;
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.get("/fixed-assets/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const asset = await db.execute(sql`SELECT * FROM fixed_assets WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!asset.rows.length) return res.status(404).json({ message: "Not found" });
    const schedule = await db.execute(sql`SELECT * FROM asset_depreciation_schedule WHERE asset_id=${req.params.id} AND tenant_id=${tid} ORDER BY period_year, period_month`);
    res.json({ asset: asset.rows[0], schedule: schedule.rows });
  } catch (e: any) {
    if (e.code === '42P01') return res.status(404).json({ message: "Not found" });
    res.status(500).json({ message: e.message });
  }
});

router.post("/fixed-assets", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { name, assetCode, category, purchaseDate, purchaseCost, usefulLifeMonths, salvageValue, depreciationMethod, location, vendorName, invoiceRef } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const r = await db.execute(sql`INSERT INTO fixed_assets
      (tenant_id, name, asset_code, category, purchase_date, purchase_cost, useful_life_months,
       salvage_value, depreciation_method, current_value, location, vendor_name, invoice_ref)
      VALUES (${tid}, ${name}, ${assetCode||null}, ${category||null}, ${purchaseDate||null},
              ${purchaseCost||0}, ${usefulLifeMonths||null}, ${salvageValue||0},
              ${depreciationMethod||'straight_line'}, ${purchaseCost||0}, ${location||null},
              ${vendorName||null}, ${invoiceRef||null})
      RETURNING *`);

    const assetId = (r.rows[0] as any).id;
    if (purchaseCost && usefulLifeMonths && purchaseDate) {
      const cost = Number(purchaseCost);
      const salvage = Number(salvageValue || 0);
      const months = Number(usefulLifeMonths);
      const monthlyDep = Math.round(((cost - salvage) / months) * 100) / 100;
      let current = cost;
      const startDate = new Date(purchaseDate);

      for (let m = 0; m < months && current > salvage; m++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + m);
        const dep = Math.min(monthlyDep, current - salvage);
        await db.execute(sql`INSERT INTO asset_depreciation_schedule
          (tenant_id, asset_id, period_year, period_month, opening_value, depreciation, closing_value)
          VALUES (${tid}, ${assetId}, ${d.getFullYear()}, ${d.getMonth()+1}, ${current}, ${dep}, ${Math.round((current-dep)*100)/100})`);
        current = Math.round((current - dep) * 100) / 100;
      }
    }

    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/fixed-assets/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { name, assetCode, category, location, status, vendorName, invoiceRef } = req.body;
    const r = await db.execute(sql`UPDATE fixed_assets SET
      name=${name}, asset_code=${assetCode||null}, category=${category||null},
      location=${location||null}, status=${status||'active'}, vendor_name=${vendorName||null}, invoice_ref=${invoiceRef||null}
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/fixed-assets/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE fixed_assets SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/asset-depreciation/:id/post", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE asset_depreciation_schedule SET posted=true WHERE id=${req.params.id} AND tenant_id=${tid}`);
    const row = await db.execute(sql`SELECT * FROM asset_depreciation_schedule WHERE id=${req.params.id}`);
    if (row.rows.length) {
      const s = row.rows[0] as any;
      await db.execute(sql`UPDATE fixed_assets SET current_value=${s.closing_value} WHERE id=${s.asset_id} AND tenant_id=${tid}`);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Currencies ───────────────────────────────────────────────────────────────
router.get("/currencies", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM currencies WHERE tenant_id=${tid} AND record_status=1 ORDER BY is_base DESC, code`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/currencies", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { code, name, symbol, isBase } = req.body;
    if (isBase) await db.execute(sql`UPDATE currencies SET is_base=false WHERE tenant_id=${tid}`);
    const r = await db.execute(sql`INSERT INTO currencies (tenant_id, code, name, symbol, is_base)
      VALUES (${tid}, ${code}, ${name}, ${symbol||null}, ${isBase||false}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/currencies/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { code, name, symbol, isBase } = req.body;
    if (isBase) await db.execute(sql`UPDATE currencies SET is_base=false WHERE tenant_id=${tid}`);
    const r = await db.execute(sql`UPDATE currencies SET code=${code}, name=${name}, symbol=${symbol||null}, is_base=${isBase||false}
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/currencies/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE currencies SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/currencies/:id/rates", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM exchange_rates WHERE currency_id=${req.params.id} AND tenant_id=${tid} ORDER BY rate DESC LIMIT 30`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/currencies/:id/rates", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { rate, rateValue } = req.body;
    const r = await db.execute(sql`INSERT INTO exchange_rates (tenant_id, currency_id, rate, rate_value)
      VALUES (${tid}, ${req.params.id}, ${rate}, ${rateValue})
      ON CONFLICT (tenant_id, currency_id, rate) DO UPDATE SET rate_value=${rateValue} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Recurring Invoice Schedules ──────────────────────────────────────────────
router.get("/recurring-invoices", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM recurring_invoice_schedules WHERE tenant_id=${tid} AND record_status=1 ORDER BY next_due`);
    res.json(rows.rows);
  } catch (e: any) {
    if (e.code === '42P01') return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/recurring-invoices", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { customerName, customerGstin, billingAddress, frequency, nextDue, endDate, amount, description, hsnSac, isService, tdsRate } = req.body;
    if (!customerName || !nextDue || !amount) return res.status(400).json({ message: "Customer, next due date and amount required" });
    const r = await db.execute(sql`INSERT INTO recurring_invoice_schedules
      (tenant_id, customer_name, customer_gstin, billing_address, frequency, next_due, end_date, amount, description, hsn_sac, is_service, tds_rate)
      VALUES (${tid}, ${customerName}, ${customerGstin||null}, ${billingAddress||null}, ${frequency||'monthly'}, ${nextDue}, ${endDate||null}, ${amount}, ${description||null}, ${hsnSac||null}, ${isService||true}, ${tdsRate||0})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/recurring-invoices/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const { customerName, customerGstin, billingAddress, frequency, nextDue, endDate, amount, description, hsnSac, isService, tdsRate, isActive } = req.body;
    const r = await db.execute(sql`UPDATE recurring_invoice_schedules SET
      customer_name=${customerName}, customer_gstin=${customerGstin||null}, billing_address=${billingAddress||null},
      frequency=${frequency||'monthly'}, next_due=${nextDue}, end_date=${endDate||null}, amount=${amount},
      description=${description||null}, hsn_sac=${hsnSac||null}, is_service=${isService||true},
      tds_rate=${tdsRate||0}, is_active=${isActive !== false}
      WHERE id=${req.params.id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/recurring-invoices/:id", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    await db.execute(sql`UPDATE recurring_invoice_schedules SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/recurring-invoices/:id/generate", requireAuth, async (req: any, res) => {
  try {
    const tid = req.session?.tenantId;
    const sched = await db.execute(sql`SELECT * FROM recurring_invoice_schedules WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!sched.rows.length) return res.status(404).json({ message: "Not found" });
    const s = sched.rows[0] as any;

    const nextDue = new Date(s.next_due);
    const newNext = new Date(nextDue);
    if (s.frequency === 'monthly')    newNext.setMonth(newNext.getMonth() + 1);
    else if (s.frequency === 'quarterly') newNext.setMonth(newNext.getMonth() + 3);
    else if (s.frequency === 'annual') newNext.setFullYear(newNext.getFullYear() + 1);
    else if (s.frequency === 'weekly') newNext.setDate(newNext.getDate() + 7);

    const last = await db.execute(sql`SELECT invoice_number FROM invoices WHERE tenant_id=${tid} AND record_status=1 ORDER BY id DESC LIMIT 1`);
    const lastNum = last.rows.length ? parseInt(((last.rows[0] as any).invoice_number || '').replace(/\D/g,'')) || 0 : 0;
    const invNo = `INV-${String(lastNum + 1).padStart(4, '0')}`;

    const taxRate = 18;
    const taxableAmount = Number(s.amount);
    const taxAmount = Math.round(taxableAmount * taxRate / 100 * 100) / 100;
    const totalAmount = taxableAmount + taxAmount;

    const inv = await db.execute(sql`INSERT INTO invoices
      (tenant_id, invoice_number, invoice_date, customer_name, customer_gstin, billing_address,
       taxable_amount, tax_amount, total_amount, status, invoice_type, is_service_invoice, sac_code, tds_rate)
      VALUES (${tid}, ${invNo}, ${nextDue.toISOString().split('T')[0]}, ${s.customer_name}, ${s.customer_gstin}, ${s.billing_address},
              ${taxableAmount}, ${taxAmount}, ${totalAmount}, 'draft', 'tax_invoice', ${s.is_service}, ${s.hsn_sac}, ${s.tds_rate})
      RETURNING id, invoice_number`);

    await db.execute(sql`UPDATE recurring_invoice_schedules SET next_due=${newNext.toISOString().split('T')[0]}, last_generated=${nextDue.toISOString().split('T')[0]}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);

    res.json({ invoice: inv.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
