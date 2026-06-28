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

// ─── HARDWARE SIMULATION / CONFIG ───────────────────────────────────────────

router.get("/hardware/config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM pos_hardware_config WHERE tenant_id = ${tid} LIMIT 1`);
    res.json(r.rows[0] ?? {});
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hardware/config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { scale_type, cash_drawer, pole_display, label_printer } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pos_hardware_config (tenant_id, scale_type, cash_drawer, pole_display, label_printer, updated_at)
      VALUES (${tid}, ${scale_type}, ${cash_drawer}, ${pole_display}, ${label_printer}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        scale_type = EXCLUDED.scale_type,
        cash_drawer = EXCLUDED.cash_drawer,
        pole_display = EXCLUDED.pole_display,
        label_printer = EXCLUDED.label_printer,
        updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hardware/scale/read", auth, async (_req: any, res: any) => {
  // Simulated scale read
  res.json({ weight: 1.5, unit: "kg" });
});

router.post("/hardware/cash-drawer/open", auth, async (_req: any, res: any) => {
  res.json({ success: true, message: "Cash drawer opened" });
});

router.post("/hardware/label-print", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { product_id, qty } = req.body;
    const r = await db.execute(sql`SELECT id, name, barcode FROM products WHERE id = ${product_id} AND tenant_id = ${tid} LIMIT 1`);
    if (!r.rows[0]) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product: r.rows[0], qty });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── MULTI-COUNTER ───────────────────────────────────────────────────────────

router.get("/counters", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM pos_counters WHERE tenant_id = ${tid} ORDER BY id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/counters", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { counter_name, counter_code, cashier_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pos_counters (tenant_id, counter_name, counter_code, cashier_id, is_active, created_at)
      VALUES (${tid}, ${counter_name}, ${counter_code}, ${cashier_id}, true, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/counters/:id/activate", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE pos_counters SET is_active = true, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/counters/:id/session", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT s.*, c.counter_name, c.counter_code
      FROM pos_shifts s
      JOIN pos_counters c ON c.id = s.counter_id
      WHERE s.counter_id = ${id} AND s.tenant_id = ${tid} AND s.status = 'open'
      ORDER BY s.id DESC LIMIT 1
    `);
    res.json(r.rows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── CASH MANAGEMENT / SHIFTS ────────────────────────────────────────────────

router.get("/shifts", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT s.*, c.counter_name FROM pos_shifts s
      LEFT JOIN pos_counters c ON c.id = s.counter_id
      WHERE s.tenant_id = ${tid}
      ORDER BY s.id DESC LIMIT 100
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/shifts/open", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { counter_id, cashier_name, opening_cash, denominations } = req.body;
    const r = await db.execute(sql`
      INSERT INTO pos_shifts (tenant_id, counter_id, cashier_name, opening_cash, denominations, status, opened_at)
      VALUES (${tid}, ${counter_id}, ${cashier_name}, ${opening_cash}, ${JSON.stringify(denominations)}, 'open', NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/shifts/:id/close", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { closing_cash, denominations } = req.body;
    const r = await db.execute(sql`
      UPDATE pos_shifts SET closing_cash = ${closing_cash}, closing_denominations = ${JSON.stringify(denominations)},
        status = 'closed', closed_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/shifts/:id/summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const shift = await db.execute(sql`SELECT * FROM pos_shifts WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!shift.rows[0]) return res.status(404).json({ message: "Shift not found" });

    const sales = await db.execute(sql`
      SELECT
        COUNT(*) AS total_bills,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total_amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN total_amount ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'card' THEN total_amount ELSE 0 END), 0) AS card_sales
      FROM pos_bills
      WHERE shift_id = ${id} AND tenant_id = ${tid} AND status != 'void'
    `);
    const voids = await db.execute(sql`SELECT COUNT(*) AS void_count FROM pos_bills WHERE shift_id = ${id} AND tenant_id = ${tid} AND status = 'void'`);
    const refunds = await db.execute(sql`SELECT COALESCE(SUM(amount), 0) AS refund_total FROM pos_refunds WHERE shift_id = ${id} AND tenant_id = ${tid}`);

    res.json({ shift: shift.rows[0], ...sales.rows[0], ...voids.rows[0], ...refunds.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── LOYALTY ─────────────────────────────────────────────────────────────────

router.get("/loyalty/customers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM loyalty_customers WHERE tenant_id = ${tid} ORDER BY id DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/loyalty/customers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, email } = req.body;
    const r = await db.execute(sql`
      INSERT INTO loyalty_customers (tenant_id, name, phone, email, points_balance, created_at)
      VALUES (${tid}, ${name}, ${phone}, ${email}, 0, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/loyalty/customers/:phone/lookup", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { phone } = req.params;
    const r = await db.execute(sql`SELECT * FROM loyalty_customers WHERE phone = ${phone} AND tenant_id = ${tid} LIMIT 1`);
    res.json(r.rows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/loyalty/customers/:id/earn", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { bill_amount } = req.body;
    const points = Math.floor(bill_amount / 50);
    const r = await db.execute(sql`
      UPDATE loyalty_customers SET points_balance = points_balance + ${points}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json({ customer: r.rows[0], points_earned: points });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/loyalty/customers/:id/redeem", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { points_to_redeem } = req.body;
    const check = await db.execute(sql`SELECT points_balance FROM loyalty_customers WHERE id = ${id} AND tenant_id = ${tid}`);
    if (!check.rows[0]) return res.status(404).json({ message: "Customer not found" });
    if ((check.rows[0] as any).points_balance < points_to_redeem) return res.status(400).json({ message: "Insufficient points" });
    const r = await db.execute(sql`
      UPDATE loyalty_customers SET points_balance = points_balance - ${points_to_redeem}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json({ customer: r.rows[0], points_redeemed: points_to_redeem });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/loyalty/config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM loyalty_config WHERE tenant_id = ${tid} LIMIT 1`);
    res.json(r.rows[0] ?? { points_per_50_rupees: 1, redemption_value_per_point: 0.5 });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/loyalty/config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { points_per_50_rupees, redemption_value_per_point } = req.body;
    const r = await db.execute(sql`
      INSERT INTO loyalty_config (tenant_id, points_per_50_rupees, redemption_value_per_point, updated_at)
      VALUES (${tid}, ${points_per_50_rupees}, ${redemption_value_per_point}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        points_per_50_rupees = EXCLUDED.points_per_50_rupees,
        redemption_value_per_point = EXCLUDED.redemption_value_per_point,
        updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── EXPIRY & BATCH ──────────────────────────────────────────────────────────

router.get("/inventory/expiry-alerts", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku, b.batch_no, b.expiry_date, b.qty_remaining,
        (b.expiry_date - CURRENT_DATE) AS days_to_expiry
      FROM product_batches b
      JOIN products p ON p.id = b.product_id
      WHERE p.tenant_id = ${tid}
        AND b.expiry_date IS NOT NULL
        AND b.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        AND b.qty_remaining > 0
      ORDER BY b.expiry_date ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/inventory/batch-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id AS product_id, p.name, b.id AS batch_id, b.batch_no, b.expiry_date,
        b.qty_remaining, b.purchase_price, b.created_at
      FROM product_batches b
      JOIN products p ON p.id = b.product_id
      WHERE p.tenant_id = ${tid} AND b.qty_remaining > 0
      ORDER BY p.id, b.expiry_date ASC NULLS LAST
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/inventory/dead-stock", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku, COALESCE(p.current_stock, 0) AS current_stock,
        MAX(si.created_at) AS last_sale_date
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
        AND si.created_at >= CURRENT_DATE - INTERVAL '90 days'
      WHERE p.tenant_id = ${tid}
      GROUP BY p.id, p.name, p.sku, p.current_stock
      HAVING MAX(si.created_at) IS NULL AND COALESCE(p.current_stock, 0) > 0
      ORDER BY p.name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/inventory/stock-ageing", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku, COALESCE(p.current_stock, 0) AS current_stock,
        MAX(si.created_at) AS last_sale_date,
        CASE WHEN MAX(si.created_at) IS NOT NULL
          THEN (CURRENT_DATE - MAX(si.created_at)::date)
          ELSE NULL
        END AS days_since_last_sale
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      WHERE p.tenant_id = ${tid}
      GROUP BY p.id, p.name, p.sku, p.current_stock
      ORDER BY days_since_last_sale DESC NULLS FIRST
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── AUTO REORDER ────────────────────────────────────────────────────────────

router.get("/reorder/pending", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku, p.current_stock, p.reorder_level, p.reorder_qty
      FROM products p
      WHERE p.tenant_id = ${tid}
        AND p.reorder_level IS NOT NULL
        AND COALESCE(p.current_stock, 0) <= p.reorder_level
      ORDER BY (p.current_stock - p.reorder_level) ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/reorder/create-po", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { product_ids } = req.body;
    const createdPOs: any[] = [];
    for (const pid of product_ids) {
      const prod = await db.execute(sql`SELECT * FROM products WHERE id = ${pid} AND tenant_id = ${tid}`);
      if (!prod.rows[0]) continue;
      const p = prod.rows[0] as any;
      const po = await db.execute(sql`
        INSERT INTO purchase_orders (tenant_id, product_id, qty, status, created_at)
        VALUES (${tid}, ${pid}, ${p.reorder_qty ?? 10}, 'pending', NOW())
        RETURNING *
      `);
      createdPOs.push(po.rows[0]);
    }
    res.json({ created: createdPOs.length, purchase_orders: createdPOs });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reorder/config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM reorder_configs WHERE tenant_id = ${tid} LIMIT 1`);
    res.json(r.rows[0] ?? { default_lead_days: 7, auto_create: false });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/reorder/config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { default_lead_days, auto_create } = req.body;
    const r = await db.execute(sql`
      INSERT INTO reorder_configs (tenant_id, default_lead_days, auto_create, updated_at)
      VALUES (${tid}, ${default_lead_days}, ${auto_create}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        default_lead_days = EXCLUDED.default_lead_days,
        auto_create = EXCLUDED.auto_create,
        updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── HOME DELIVERY ───────────────────────────────────────────────────────────

router.get("/delivery/orders", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT d.*, b.bill_no, b.total_amount, b.customer_name, b.customer_phone
      FROM delivery_orders d
      JOIN pos_bills b ON b.id = d.bill_id
      WHERE d.tenant_id = ${tid}
      ORDER BY d.id DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/delivery/assign", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { bill_id, delivery_boy_name, delivery_boy_phone, expected_time } = req.body;
    const r = await db.execute(sql`
      INSERT INTO delivery_orders (tenant_id, bill_id, delivery_boy_name, delivery_boy_phone, expected_time, status, created_at)
      VALUES (${tid}, ${bill_id}, ${delivery_boy_name}, ${delivery_boy_phone}, ${expected_time}, 'assigned', NOW())
      ON CONFLICT (bill_id) DO UPDATE SET
        delivery_boy_name = EXCLUDED.delivery_boy_name,
        delivery_boy_phone = EXCLUDED.delivery_boy_phone,
        expected_time = EXCLUDED.expected_time,
        status = 'assigned'
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/delivery/orders/:id/delivered", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE delivery_orders SET status = 'delivered', delivered_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/delivery/boys", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT delivery_boy_name, delivery_boy_phone,
        COUNT(*) AS total_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completed
      FROM delivery_orders
      WHERE tenant_id = ${tid}
      GROUP BY delivery_boy_name, delivery_boy_phone
      ORDER BY delivery_boy_name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── DISTRIBUTOR ORDERS ──────────────────────────────────────────────────────

router.get("/distributor-orders", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT d.*, v.name AS vendor_name
      FROM distributor_orders d
      LEFT JOIN vendors v ON v.id = d.vendor_id
      WHERE d.tenant_id = ${tid}
      ORDER BY d.id DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/distributor-orders", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { vendor_id, items } = req.body;
    const order = await db.execute(sql`
      INSERT INTO distributor_orders (tenant_id, vendor_id, items, status, created_at)
      VALUES (${tid}, ${vendor_id}, ${JSON.stringify(items)}, 'draft', NOW())
      RETURNING *
    `);
    res.json(order.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/distributor-orders/:id/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["draft", "sent", "confirmed", "delivered"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const r = await db.execute(sql`
      UPDATE distributor_orders SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

router.get("/reports/hourly-sales", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const date = req.query.date ?? new Date().toISOString().slice(0, 10);
    const r = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM created_at) AS hour,
        COUNT(*) AS bill_count,
        COALESCE(SUM(total_amount), 0) AS total_sales
      FROM pos_bills
      WHERE tenant_id = ${tid} AND DATE(created_at) = ${date} AND status != 'void'
      GROUP BY hour ORDER BY hour
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/item-wise-sales", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku,
        SUM(si.qty) AS total_qty,
        SUM(si.amount) AS total_revenue,
        SUM(si.qty * COALESCE(p.purchase_price, 0)) AS total_cost,
        SUM(si.amount) - SUM(si.qty * COALESCE(p.purchase_price, 0)) AS gross_margin
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN pos_bills b ON b.id = si.bill_id
      WHERE p.tenant_id = ${tid}
        AND DATE(b.created_at) BETWEEN ${from} AND ${to}
        AND b.status != 'void'
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_revenue DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/category-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT p.category,
        SUM(si.qty) AS total_qty,
        SUM(si.amount) AS total_revenue
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN pos_bills b ON b.id = si.bill_id
      WHERE p.tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(b.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(b.created_at) <= ${to}::date)
        AND b.status != 'void'
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/cashier-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT s.cashier_name,
        COUNT(b.id) AS bill_count,
        COALESCE(SUM(b.total_amount), 0) AS total_sales
      FROM pos_bills b
      JOIN pos_shifts s ON s.id = b.shift_id
      WHERE b.tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(b.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(b.created_at) <= ${to}::date)
        AND b.status != 'void'
      GROUP BY s.cashier_name
      ORDER BY total_sales DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/gst-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const b2b = await db.execute(sql`
      SELECT b.customer_gstin, b.customer_name,
        SUM(b.taxable_amount) AS taxable, SUM(b.gst_amount) AS gst, SUM(b.total_amount) AS total
      FROM pos_bills b
      WHERE b.tenant_id = ${tid} AND b.customer_gstin IS NOT NULL
        AND (${from}::date IS NULL OR DATE(b.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(b.created_at) <= ${to}::date)
        AND b.status != 'void'
      GROUP BY b.customer_gstin, b.customer_name
    `);
    const b2c = await db.execute(sql`
      SELECT SUM(b.taxable_amount) AS taxable, SUM(b.gst_amount) AS gst, SUM(b.total_amount) AS total
      FROM pos_bills b
      WHERE b.tenant_id = ${tid} AND (b.customer_gstin IS NULL OR b.customer_gstin = '')
        AND (${from}::date IS NULL OR DATE(b.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(b.created_at) <= ${to}::date)
        AND b.status != 'void'
    `);
    const hsn = await db.execute(sql`
      SELECT p.hsn_code,
        SUM(si.qty) AS qty, SUM(si.amount) AS taxable_value,
        SUM(si.gst_amount) AS gst
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN pos_bills b ON b.id = si.bill_id
      WHERE p.tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(b.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(b.created_at) <= ${to}::date)
        AND b.status != 'void'
      GROUP BY p.hsn_code
    `);
    res.json({ b2b: b2b.rows, b2c: b2c.rows[0], hsn: hsn.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/profit-margin", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku,
        COALESCE(p.selling_price, 0) AS sale_price,
        COALESCE(p.purchase_price, 0) AS cost,
        CASE WHEN COALESCE(p.selling_price, 0) > 0
          THEN ROUND(((p.selling_price - COALESCE(p.purchase_price, 0)) / p.selling_price) * 100, 2)
          ELSE 0
        END AS margin_pct
      FROM products p
      WHERE p.tenant_id = ${tid}
      ORDER BY margin_pct DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/expiry", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const days = parseInt(req.query.days ?? "30");
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku, b.batch_no, b.expiry_date, b.qty_remaining,
        (b.expiry_date - CURRENT_DATE) AS days_to_expiry
      FROM product_batches b
      JOIN products p ON p.id = b.product_id
      WHERE p.tenant_id = ${tid}
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

router.get("/reports/dead-stock", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT p.id, p.name, p.sku, COALESCE(p.current_stock, 0) AS current_stock,
        MAX(si.created_at) AS last_sale_date
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      WHERE p.tenant_id = ${tid}
      GROUP BY p.id, p.name, p.sku, p.current_stock
      HAVING MAX(si.created_at) IS NULL OR MAX(si.created_at) < CURRENT_DATE - INTERVAL '90 days'
      ORDER BY p.name
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
      SELECT p.id, p.name, p.sku,
        COALESCE(SUM(pi.qty * pi.rate), 0) AS purchase_value,
        COALESCE(SUM(si.qty * si.rate), 0) AS sale_value
      FROM products p
      LEFT JOIN purchase_items pi ON pi.product_id = p.id
        AND (${from}::date IS NULL OR DATE(pi.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(pi.created_at) <= ${to}::date)
      LEFT JOIN sale_items si ON si.product_id = p.id
        AND (${from}::date IS NULL OR DATE(si.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(si.created_at) <= ${to}::date)
      WHERE p.tenant_id = ${tid}
      GROUP BY p.id, p.name, p.sku
      ORDER BY sale_value DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/customer-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT b.customer_name, b.customer_phone,
        COUNT(*) AS bill_count,
        COALESCE(SUM(b.total_amount), 0) AS total_purchases
      FROM pos_bills b
      WHERE b.tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(b.created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(b.created_at) <= ${to}::date)
        AND b.status != 'void'
        AND b.customer_name IS NOT NULL
      GROUP BY b.customer_name, b.customer_phone
      ORDER BY total_purchases DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/payment-mode", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT payment_mode,
        COUNT(*) AS bill_count,
        COALESCE(SUM(total_amount), 0) AS total_amount
      FROM pos_bills
      WHERE tenant_id = ${tid}
        AND (${from}::date IS NULL OR DATE(created_at) >= ${from}::date)
        AND (${to}::date IS NULL OR DATE(created_at) <= ${to}::date)
        AND status != 'void'
      GROUP BY payment_mode
      ORDER BY total_amount DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/z-report/:counterId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { counterId } = req.params;
    const date = req.query.date ?? new Date().toISOString().slice(0, 10);
    const counter = await db.execute(sql`SELECT * FROM pos_counters WHERE id = ${counterId} AND tenant_id = ${tid}`);
    const sales = await db.execute(sql`
      SELECT COUNT(*) AS bill_count, COALESCE(SUM(total_amount), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total_amount ELSE 0 END), 0) AS cash,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN total_amount ELSE 0 END), 0) AS upi,
        COALESCE(SUM(CASE WHEN payment_mode = 'card' THEN total_amount ELSE 0 END), 0) AS card
      FROM pos_bills b
      JOIN pos_shifts s ON s.id = b.shift_id
      WHERE b.tenant_id = ${tid} AND s.counter_id = ${counterId}
        AND DATE(b.created_at) = ${date} AND b.status != 'void'
    `);
    const voids = await db.execute(sql`
      SELECT COUNT(*) AS void_count FROM pos_bills b
      JOIN pos_shifts s ON s.id = b.shift_id
      WHERE b.tenant_id = ${tid} AND s.counter_id = ${counterId}
        AND DATE(b.created_at) = ${date} AND b.status = 'void'
    `);
    res.json({ date, counter: counter.rows[0], ...sales.rows[0], ...voids.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── OFFLINE SYNC ────────────────────────────────────────────────────────────

router.post("/offline/sync", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { bills = [], payments = [] } = req.body;
    let billsInserted = 0;
    let paymentsInserted = 0;

    for (const bill of bills) {
      await db.execute(sql`
        INSERT INTO pos_bills (tenant_id, bill_no, customer_name, customer_phone, total_amount,
          payment_mode, status, created_at, synced_from_offline)
        VALUES (${tid}, ${bill.bill_no}, ${bill.customer_name}, ${bill.customer_phone},
          ${bill.total_amount}, ${bill.payment_mode}, ${bill.status ?? 'paid'}, ${bill.created_at}, true)
        ON CONFLICT (tenant_id, bill_no) DO NOTHING
      `);
      billsInserted++;
    }

    for (const payment of payments) {
      await db.execute(sql`
        INSERT INTO pos_payments (tenant_id, bill_id, amount, mode, created_at, synced_from_offline)
        VALUES (${tid}, ${payment.bill_id}, ${payment.amount}, ${payment.mode}, ${payment.created_at}, true)
        ON CONFLICT DO NOTHING
      `);
      paymentsInserted++;
    }

    res.json({ success: true, bills_inserted: billsInserted, payments_inserted: paymentsInserted });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/offline/pending-sync-count", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT COUNT(*) AS count FROM pos_bills WHERE tenant_id = ${tid} AND synced_from_offline = false`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
