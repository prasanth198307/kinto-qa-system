import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

// Auto-update overdue status helper
async function updateOverdueStatus(tenantId: number) {
  await db.execute(sql`
    UPDATE vendor_bills
    SET status = 'overdue', updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND due_date < CURRENT_DATE
      AND status NOT IN ('paid', 'cancelled', 'overdue')
  `);
}

// Generate next bill number
async function generateBillNumber(tenantId: number): Promise<string> {
  const res = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM vendor_bills WHERE tenant_id = ${tenantId}
  `);
  const cnt = Number((res.rows[0] as any).cnt) + 1;
  return `BILL-${tenantId}-${String(cnt).padStart(4, '0')}`;
}

// GET /vendor-bills
router.get("/vendor-bills", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    await updateOverdueStatus(tenantId);

    const { status, vendor_name, from_date, to_date, overdue_only } = req.query;

    let conditions = [`tenant_id = ${tenantId}`];
    if (status) conditions.push(`status = '${status}'`);
    if (vendor_name) conditions.push(`vendor_name ILIKE '%${vendor_name}%'`);
    if (from_date) conditions.push(`bill_date >= '${from_date}'`);
    if (to_date) conditions.push(`bill_date <= '${to_date}'`);
    if (overdue_only === 'true') conditions.push(`status = 'overdue'`);

    const where = conditions.join(' AND ');
    const result = await db.execute(sql.raw(`
      SELECT * FROM vendor_bills WHERE ${where} ORDER BY bill_date DESC
    `));
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /vendor-bills/:id
router.get("/vendor-bills/:id", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const bill = await db.execute(sql`
      SELECT * FROM vendor_bills WHERE id = ${id} AND tenant_id = ${tenantId}
    `);
    if (!bill.rows.length) return res.status(404).json({ message: "Bill not found" });

    const items = await db.execute(sql`
      SELECT * FROM vendor_bill_items WHERE bill_id = ${id} AND tenant_id = ${tenantId}
    `);

    res.json({ ...bill.rows[0], items: items.rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /vendor-bills
router.post("/vendor-bills", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vendor_id, vendor_name, bill_date, due_date, notes, items = [] } = req.body;

    if (!vendor_name || !bill_date || !due_date) {
      return res.status(400).json({ message: "vendor_name, bill_date, due_date are required" });
    }

    const bill_number = await generateBillNumber(tenantId);

    // Calculate totals from items
    let subtotal = 0, tax_amount = 0;
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      const taxRate = Number(item.tax_rate) || 0;
      const lineBase = qty * price;
      const lineTax = lineBase * taxRate / 100;
      subtotal += lineBase;
      tax_amount += lineTax;
    }
    const total_amount = subtotal + tax_amount;

    const billRes = await db.execute(sql`
      INSERT INTO vendor_bills (tenant_id, bill_number, vendor_id, vendor_name, bill_date, due_date,
        subtotal, tax_amount, total_amount, notes, status)
      VALUES (${tenantId}, ${bill_number}, ${vendor_id || null}, ${vendor_name}, ${bill_date}, ${due_date},
        ${subtotal}, ${tax_amount}, ${total_amount}, ${notes || null}, 'draft')
      RETURNING *
    `);
    const bill = billRes.rows[0] as any;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      const taxRate = Number(item.tax_rate) || 0;
      const lineBase = qty * price;
      const lineTax = lineBase * taxRate / 100;
      const lineTotal = lineBase + lineTax;

      await db.execute(sql`
        INSERT INTO vendor_bill_items (bill_id, tenant_id, description, quantity, unit_price,
          tax_rate, tax_amount, line_total, account_code)
        VALUES (${bill.id}, ${tenantId}, ${item.description}, ${qty}, ${price},
          ${taxRate}, ${lineTax}, ${lineTotal}, ${item.account_code || null})
      `);
    }

    res.status(201).json(bill);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /vendor-bills/:id
router.put("/vendor-bills/:id", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { vendor_name, bill_date, due_date, notes, items } = req.body;

    await db.execute(sql`
      UPDATE vendor_bills SET
        vendor_name = COALESCE(${vendor_name}, vendor_name),
        bill_date = COALESCE(${bill_date || null}, bill_date),
        due_date = COALESCE(${due_date || null}, due_date),
        notes = COALESCE(${notes || null}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (items && Array.isArray(items)) {
      await db.execute(sql`DELETE FROM vendor_bill_items WHERE bill_id = ${id}`);
      let subtotal = 0, tax_amount = 0;
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        const taxRate = Number(item.tax_rate) || 0;
        const lineBase = qty * price;
        const lineTax = lineBase * taxRate / 100;
        const lineTotal = lineBase + lineTax;
        subtotal += lineBase;
        tax_amount += lineTax;
        await db.execute(sql`
          INSERT INTO vendor_bill_items (bill_id, tenant_id, description, quantity, unit_price,
            tax_rate, tax_amount, line_total, account_code)
          VALUES (${id}, ${tenantId}, ${item.description}, ${qty}, ${price},
            ${taxRate}, ${lineTax}, ${lineTotal}, ${item.account_code || null})
        `);
      }
      const total_amount = subtotal + tax_amount;
      await db.execute(sql`
        UPDATE vendor_bills SET subtotal = ${subtotal}, tax_amount = ${tax_amount},
          total_amount = ${total_amount}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);
    }

    const updated = await db.execute(sql`SELECT * FROM vendor_bills WHERE id = ${id} AND tenant_id = ${tenantId}`);
    res.json(updated.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /vendor-bills/:id/approve
router.post("/vendor-bills/:id/approve", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await db.execute(sql`
      UPDATE vendor_bills SET status = 'approved', updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
    `);
    const updated = await db.execute(sql`SELECT * FROM vendor_bills WHERE id = ${id}`);
    res.json(updated.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /vendor-bills/:id/pay
router.post("/vendor-bills/:id/pay", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: "amount is required" });

    const billRes = await db.execute(sql`SELECT * FROM vendor_bills WHERE id = ${id} AND tenant_id = ${tenantId}`);
    if (!billRes.rows.length) return res.status(404).json({ message: "Bill not found" });
    const bill = billRes.rows[0] as any;

    const newPaid = Number(bill.paid_amount) + Number(amount);
    const newStatus = newPaid >= Number(bill.total_amount) ? 'paid' : 'partial';

    await db.execute(sql`
      UPDATE vendor_bills SET paid_amount = ${newPaid}, status = ${newStatus}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    const updated = await db.execute(sql`SELECT * FROM vendor_bills WHERE id = ${id}`);
    res.json(updated.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /ap-aging
router.get("/ap-aging", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    await updateOverdueStatus(tenantId);

    const result = await db.execute(sql`
      SELECT
        vendor_name,
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN (total_amount - paid_amount) ELSE 0 END), 0) AS current_amount,
        COALESCE(SUM(CASE WHEN (CURRENT_DATE - due_date) BETWEEN 1 AND 30 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days_1_30,
        COALESCE(SUM(CASE WHEN (CURRENT_DATE - due_date) BETWEEN 31 AND 60 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days_31_60,
        COALESCE(SUM(CASE WHEN (CURRENT_DATE - due_date) BETWEEN 61 AND 90 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days_61_90,
        COALESCE(SUM(CASE WHEN (CURRENT_DATE - due_date) > 90 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days_90_plus,
        COALESCE(SUM(total_amount - paid_amount), 0) AS total_outstanding
      FROM vendor_bills
      WHERE tenant_id = ${tenantId}
        AND status NOT IN ('paid', 'cancelled', 'draft')
      GROUP BY vendor_name
      ORDER BY total_outstanding DESC
    `);

    // Summary totals
    const summary = result.rows.reduce(
      (acc: any, row: any) => ({
        current: Number(acc.current) + Number(row.current_amount),
        days_1_30: Number(acc.days_1_30) + Number(row.days_1_30),
        days_31_60: Number(acc.days_31_60) + Number(row.days_31_60),
        days_61_90: Number(acc.days_61_90) + Number(row.days_61_90),
        days_90_plus: Number(acc.days_90_plus) + Number(row.days_90_plus),
      }),
      { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 }
    );

    res.json({ summary, vendors: result.rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /payment-runs
router.get("/payment-runs", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await db.execute(sql`
      SELECT pr.*,
        json_agg(json_build_object(
          'id', pri.id, 'bill_id', pri.bill_id, 'vendor_name', pri.vendor_name,
          'bill_amount', pri.bill_amount, 'paying_amount', pri.paying_amount
        )) AS items
      FROM vendor_payment_runs pr
      LEFT JOIN vendor_payment_run_items pri ON pri.run_id = pr.id
      WHERE pr.tenant_id = ${tenantId}
      GROUP BY pr.id
      ORDER BY pr.run_date DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /payment-runs
router.post("/payment-runs", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { run_date, payment_mode, bank_account, notes, items = [] } = req.body;

    if (!run_date || !items.length) {
      return res.status(400).json({ message: "run_date and items are required" });
    }

    const cntRes = await db.execute(sql`SELECT COUNT(*) AS cnt FROM vendor_payment_runs WHERE tenant_id = ${tenantId}`);
    const cnt = Number((cntRes.rows[0] as any).cnt) + 1;
    const run_number = `PR-${tenantId}-${String(cnt).padStart(4, '0')}`;

    const total_amount = items.reduce((s: number, i: any) => s + Number(i.paying_amount), 0);

    const runRes = await db.execute(sql`
      INSERT INTO vendor_payment_runs (tenant_id, run_number, run_date, payment_mode, bank_account, total_amount, notes, status)
      VALUES (${tenantId}, ${run_number}, ${run_date}, ${payment_mode || 'bank_transfer'}, ${bank_account || null}, ${total_amount}, ${notes || null}, 'draft')
      RETURNING *
    `);
    const run = runRes.rows[0] as any;

    for (const item of items) {
      const billRes = await db.execute(sql`SELECT * FROM vendor_bills WHERE id = ${item.bill_id} AND tenant_id = ${tenantId}`);
      const bill = billRes.rows[0] as any;
      await db.execute(sql`
        INSERT INTO vendor_payment_run_items (run_id, tenant_id, bill_id, vendor_name, bill_amount, paying_amount)
        VALUES (${run.id}, ${tenantId}, ${item.bill_id}, ${bill?.vendor_name || ''}, ${bill?.total_amount || 0}, ${item.paying_amount})
      `);
    }

    res.status(201).json(run);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /payment-runs/:id/process
router.post("/payment-runs/:id/process", async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const runRes = await db.execute(sql`SELECT * FROM vendor_payment_runs WHERE id = ${id} AND tenant_id = ${tenantId}`);
    if (!runRes.rows.length) return res.status(404).json({ message: "Payment run not found" });

    const itemsRes = await db.execute(sql`SELECT * FROM vendor_payment_run_items WHERE run_id = ${id}`);

    for (const item of itemsRes.rows as any[]) {
      const billRes = await db.execute(sql`SELECT * FROM vendor_bills WHERE id = ${item.bill_id}`);
      if (!billRes.rows.length) continue;
      const bill = billRes.rows[0] as any;
      const newPaid = Number(bill.paid_amount) + Number(item.paying_amount);
      const newStatus = newPaid >= Number(bill.total_amount) ? 'paid' : 'partial';
      await db.execute(sql`
        UPDATE vendor_bills SET paid_amount = ${newPaid}, status = ${newStatus}, updated_at = NOW()
        WHERE id = ${item.bill_id}
      `);
    }

    await db.execute(sql`
      UPDATE vendor_payment_runs SET status = 'processed' WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    res.json({ message: "Payment run processed successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
