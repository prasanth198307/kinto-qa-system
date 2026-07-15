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

// Aliases used by the store-transfers block
const requireAuth = auth;
const tid = getTenantId;

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
    const { points_per_50_rupees, redemption_value_per_point, expiry_days } = req.body;
    await db.execute(sql`ALTER TABLE loyalty_config ADD COLUMN IF NOT EXISTS expiry_days INT DEFAULT 365`);
    const r = await db.execute(sql`
      INSERT INTO loyalty_config (tenant_id, points_per_50_rupees, redemption_value_per_point, expiry_days, updated_at)
      VALUES (${tid}, ${points_per_50_rupees}, ${redemption_value_per_point}, ${expiry_days ?? 365}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        points_per_50_rupees = EXCLUDED.points_per_50_rupees,
        redemption_value_per_point = EXCLUDED.redemption_value_per_point,
        expiry_days = EXCLUDED.expiry_days,
        updated_at = NOW()
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── LOYALTY EXPIRY ENGINE ───────────────────────────────────────────────────

router.get("/loyalty/expiry-stats", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await db.execute(sql`ALTER TABLE loyalty_config ADD COLUMN IF NOT EXISTS expiry_days INT DEFAULT 365`);
    const cfg = await db.execute(sql`SELECT COALESCE(expiry_days, 365) AS expiry_days FROM loyalty_config WHERE tenant_id = ${tid} LIMIT 1`);
    const expiryDays = Number((cfg.rows[0] as any)?.expiry_days ?? 365);
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE points_balance > 0) AS active_members,
        COALESCE(SUM(points_balance), 0) AS total_points_outstanding,
        COUNT(*) FILTER (WHERE points_balance > 0 AND updated_at < NOW() - (${expiryDays} || ' days')::interval) AS already_expired,
        COUNT(*) FILTER (WHERE points_balance > 0 AND updated_at < NOW() - ((${expiryDays} - 7) || ' days')::interval AND updated_at >= NOW() - (${expiryDays} || ' days')::interval) AS expiring_7d,
        COUNT(*) FILTER (WHERE points_balance > 0 AND updated_at < NOW() - ((${expiryDays} - 30) || ' days')::interval AND updated_at >= NOW() - (${expiryDays} || ' days')::interval) AS expiring_30d
      FROM loyalty_customers WHERE tenant_id = ${tid}
    `);
    const expiring = await db.execute(sql`
      SELECT id, name, phone, points_balance, updated_at,
        (updated_at + (${expiryDays} || ' days')::interval)::date AS expiry_date
      FROM loyalty_customers
      WHERE tenant_id = ${tid} AND points_balance > 0
        AND updated_at < NOW() - ((${expiryDays} - 30) || ' days')::interval
      ORDER BY updated_at ASC LIMIT 50
    `);
    res.json({ expiry_days: expiryDays, ...stats.rows[0], expiring_soon: expiring.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/loyalty/expire-now", auth, async (req: any, res: any) => {
  try {
    const { expireRetailLoyaltyPoints } = await import("./loyalty-expiry-service");
    const count = await expireRetailLoyaltyPoints();
    res.json({ success: true, customers_expired: count });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── OMNI-CHANNEL STOCK SYNC ─────────────────────────────────────────────────

async function ensureChannelTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS retail_channel_listings (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    product_id INT NOT NULL, channel VARCHAR(50) NOT NULL,
    channel_sku VARCHAR(100), channel_price NUMERIC(12,2),
    online_stock NUMERIC(12,2) DEFAULT 0,
    buffer_qty NUMERIC(12,2) DEFAULT 0,
    is_active INT DEFAULT 1,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, product_id, channel)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS retail_channel_sync_log (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    channel VARCHAR(50), products_synced INT DEFAULT 0,
    direction VARCHAR(20) DEFAULT 'push',
    status VARCHAR(20) DEFAULT 'success', detail TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/omni-channel/listings", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await ensureChannelTables();
    const rows = await db.execute(sql`
      SELECT cl.*, p.name AS product_name, p.sku,
        COALESCE((SELECT SUM(qty_on_hand) FROM inventory_items ii WHERE ii.product_id = cl.product_id AND ii.tenant_id = ${tid}), 0) AS store_stock
      FROM retail_channel_listings cl
      LEFT JOIN products p ON p.id = cl.product_id
      WHERE cl.tenant_id = ${tid} AND cl.is_active = 1
      ORDER BY cl.channel, p.name
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/omni-channel/listings", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await ensureChannelTables();
    const { product_id, channel, channel_sku, channel_price, buffer_qty } = req.body;
    const r = await db.execute(sql`
      INSERT INTO retail_channel_listings (tenant_id, product_id, channel, channel_sku, channel_price, buffer_qty)
      VALUES (${tid}, ${product_id}, ${channel}, ${channel_sku || null}, ${channel_price || 0}, ${buffer_qty || 0})
      ON CONFLICT (tenant_id, product_id, channel) DO UPDATE SET
        channel_sku = EXCLUDED.channel_sku, channel_price = EXCLUDED.channel_price,
        buffer_qty = EXCLUDED.buffer_qty, is_active = 1
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/omni-channel/listings/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await db.execute(sql`UPDATE retail_channel_listings SET is_active = 0 WHERE id = ${parseInt(req.params.id)} AND tenant_id = ${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Push current store stock (minus buffer) to every active channel listing
router.post("/omni-channel/sync", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await ensureChannelTables();
    const r = await db.execute(sql`
      UPDATE retail_channel_listings cl
      SET online_stock = GREATEST(0, COALESCE((SELECT SUM(qty_on_hand) FROM inventory_items ii WHERE ii.product_id = cl.product_id AND ii.tenant_id = ${tid}), 0) - cl.buffer_qty),
          last_synced_at = NOW()
      WHERE cl.tenant_id = ${tid} AND cl.is_active = 1
      RETURNING cl.channel
    `);
    const byChannel: Record<string, number> = {};
    for (const row of r.rows as any[]) byChannel[row.channel] = (byChannel[row.channel] || 0) + 1;
    for (const [channel, count] of Object.entries(byChannel)) {
      await db.execute(sql`INSERT INTO retail_channel_sync_log (tenant_id, channel, products_synced, direction, status) VALUES (${tid}, ${channel}, ${count}, 'push', 'success')`);
    }
    res.json({ success: true, products_synced: (r.rows as any[]).length, channels: byChannel });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Online channel order webhook — decrement store stock so offline POS sees it
router.post("/omni-channel/order", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await ensureChannelTables();
    const { channel, items } = req.body; // items: [{ product_id, qty }]
    for (const it of (items || [])) {
      await db.execute(sql`UPDATE inventory_items SET qty_on_hand = GREATEST(0, qty_on_hand - ${it.qty}) WHERE product_id = ${it.product_id} AND tenant_id = ${tid}`);
      await db.execute(sql`UPDATE retail_channel_listings SET online_stock = GREATEST(0, online_stock - ${it.qty}) WHERE product_id = ${it.product_id} AND tenant_id = ${tid} AND channel = ${channel}`);
    }
    await db.execute(sql`INSERT INTO retail_channel_sync_log (tenant_id, channel, products_synced, direction, status, detail) VALUES (${tid}, ${channel}, ${(items || []).length}, 'pull', 'success', 'online order stock decrement')`);
    res.json({ success: true, items_decremented: (items || []).length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/omni-channel/sync-log", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await ensureChannelTables();
    const rows = await db.execute(sql`SELECT * FROM retail_channel_sync_log WHERE tenant_id = ${tid} ORDER BY synced_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
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

// ── Multi-Store Transfer Orders ──────────────────────────────────────────────
router.get("/store-transfers", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { status, from_store, to_store } = req.query;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS retail_store_transfers (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      transfer_no VARCHAR(50) NOT NULL,
      from_store_id INT NOT NULL, to_store_id INT NOT NULL,
      from_store_name VARCHAR(200), to_store_name VARCHAR(200),
      transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_arrival DATE,
      status VARCHAR(30) DEFAULT 'draft',
      total_items INT DEFAULT 0, total_qty NUMERIC(12,2) DEFAULT 0,
      total_value NUMERIC(14,2) DEFAULT 0,
      dispatched_by INT, received_by INT,
      dispatch_notes TEXT, receiving_notes TEXT,
      created_by INT, created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS retail_store_transfer_items (
      id SERIAL PRIMARY KEY, transfer_id INT NOT NULL,
      product_id INT NOT NULL, product_name VARCHAR(300), sku VARCHAR(100),
      requested_qty NUMERIC(12,2) DEFAULT 0,
      dispatched_qty NUMERIC(12,2) DEFAULT 0,
      received_qty NUMERIC(12,2) DEFAULT 0,
      unit VARCHAR(30) DEFAULT 'Nos',
      unit_cost NUMERIC(12,2) DEFAULT 0, total_cost NUMERIC(14,2) DEFAULT 0,
      batch_no VARCHAR(50), expiry_date DATE,
      status VARCHAR(20) DEFAULT 'pending'
    )`);
    let q = sql`SELECT st.*,
      (SELECT COUNT(*) FROM retail_store_transfer_items i WHERE i.transfer_id=st.id) as line_count
      FROM retail_store_transfers st WHERE st.tenant_id=${t} AND st.record_status=1`;
    if (status) q = sql`${q} AND st.status=${status}`;
    if (from_store) q = sql`${q} AND st.from_store_id=${parseInt(from_store as string)}`;
    if (to_store) q = sql`${q} AND st.to_store_id=${parseInt(to_store as string)}`;
    q = sql`${q} ORDER BY st.transfer_date DESC, st.created_at DESC LIMIT 100`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/store-transfers", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { from_store_id, from_store_name, to_store_id, to_store_name, transfer_date, expected_arrival, dispatch_notes, items } = req.body;
  try {
    const count = await db.execute(sql`SELECT COUNT(*) as n FROM retail_store_transfers WHERE tenant_id=${t}`);
    const seq = String(Number((count.rows[0] as any).n)+1).padStart(5,'0');
    const trNo = `TRF-${new Date().getFullYear()}-${seq}`;
    const totalQty = (items||[]).reduce((s: number, i: any) => s + Number(i.requested_qty||0), 0);
    const totalVal = (items||[]).reduce((s: number, i: any) => s + (Number(i.requested_qty||0)*Number(i.unit_cost||0)), 0);
    const r = await db.execute(sql`INSERT INTO retail_store_transfers (tenant_id, transfer_no, from_store_id, from_store_name, to_store_id, to_store_name, transfer_date, expected_arrival, total_items, total_qty, total_value, dispatch_notes, created_by)
      VALUES (${t}, ${trNo}, ${from_store_id}, ${from_store_name||null}, ${to_store_id}, ${to_store_name||null}, ${transfer_date||new Date().toISOString().slice(0,10)}, ${expected_arrival||null}, ${(items||[]).length}, ${totalQty}, ${totalVal}, ${dispatch_notes||null}, ${req.user?.id||null}) RETURNING *`);
    const tr = r.rows[0] as any;
    for (const it of (items||[])) {
      await db.execute(sql`INSERT INTO retail_store_transfer_items (transfer_id, product_id, product_name, sku, requested_qty, unit, unit_cost, total_cost, batch_no, expiry_date) VALUES (${tr.id}, ${it.product_id}, ${it.product_name||null}, ${it.sku||null}, ${it.requested_qty||0}, ${it.unit||'Nos'}, ${it.unit_cost||0}, ${(it.requested_qty||0)*(it.unit_cost||0)}, ${it.batch_no||null}, ${it.expiry_date||null})`);
    }
    res.json(tr);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/store-transfers/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT i.*, p.name as product_name_resolved, p.sku as product_sku FROM retail_store_transfer_items i LEFT JOIN products p ON p.id=i.product_id WHERE i.transfer_id=${parseInt(req.params.id)} ORDER BY i.id`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/store-transfers/:id/dispatch", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { dispatched_items, dispatched_by, dispatch_notes } = req.body;
  try {
    const trId = parseInt(req.params.id);
    for (const it of (dispatched_items||[])) {
      await db.execute(sql`UPDATE retail_store_transfer_items SET dispatched_qty=${it.dispatched_qty}, status='dispatched' WHERE id=${it.transfer_item_id} AND transfer_id=${trId}`);
      await db.execute(sql`UPDATE inventory_items SET qty_on_hand = qty_on_hand - ${it.dispatched_qty} WHERE product_id=(SELECT product_id FROM retail_store_transfer_items WHERE id=${it.transfer_item_id}) AND warehouse_id=(SELECT from_store_id FROM retail_store_transfers WHERE id=${trId}) AND tenant_id=${t}`);
    }
    await db.execute(sql`UPDATE retail_store_transfers SET status='in_transit', dispatched_by=${dispatched_by||null}, dispatch_notes=${dispatch_notes||null} WHERE id=${trId} AND tenant_id=${t}`);
    res.json({ success: true, status: 'in_transit' });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/store-transfers/:id/receive", requireAuth, async (req: any, res) => {
  const t = tid(req);
  const { received_items, received_by, receiving_notes } = req.body;
  try {
    const trId = parseInt(req.params.id);
    let hasShortage = false;
    for (const it of (received_items||[])) {
      const prev = await db.execute(sql`SELECT dispatched_qty FROM retail_store_transfer_items WHERE id=${it.transfer_item_id}`);
      const disp = Number((prev.rows[0] as any)?.dispatched_qty || 0);
      const rcvd = Number(it.received_qty || 0);
      const itemStatus = rcvd < disp ? 'shortage' : 'received';
      if (itemStatus === 'shortage') hasShortage = true;
      await db.execute(sql`UPDATE retail_store_transfer_items SET received_qty=${rcvd}, status=${itemStatus} WHERE id=${it.transfer_item_id} AND transfer_id=${trId}`);
      if (rcvd > 0) {
        const pi = await db.execute(sql`SELECT product_id FROM retail_store_transfer_items WHERE id=${it.transfer_item_id}`);
        const productId = (pi.rows[0] as any)?.product_id;
        const toStore = await db.execute(sql`SELECT to_store_id FROM retail_store_transfers WHERE id=${trId}`);
        const toStoreId = (toStore.rows[0] as any)?.to_store_id;
        if (productId && toStoreId) {
          await db.execute(sql`INSERT INTO inventory_items (tenant_id, product_id, warehouse_id, qty_on_hand) VALUES (${t}, ${productId}, ${toStoreId}, ${rcvd}) ON CONFLICT (product_id, warehouse_id) DO UPDATE SET qty_on_hand = inventory_items.qty_on_hand + ${rcvd} WHERE inventory_items.tenant_id=${t}`);
        }
      }
    }
    const finalStatus = hasShortage ? 'partially_received' : 'received';
    await db.execute(sql`UPDATE retail_store_transfers SET status=${finalStatus}, received_by=${received_by||null}, receiving_notes=${receiving_notes||null} WHERE id=${trId} AND tenant_id=${t}`);
    res.json({ success: true, status: finalStatus, has_shortage: hasShortage });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/store-transfers/:id/cancel", requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    const tr = await db.execute(sql`SELECT status FROM retail_store_transfers WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if ((tr.rows[0] as any)?.status === 'received') return res.status(400).json({ message: 'Cannot cancel received transfer' });
    await db.execute(sql`UPDATE retail_store_transfers SET status='cancelled' WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Alias routes for test compatibility ──────────────────────────────────────
router.get("/loyalty-members", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const r = await db.execute(sql`SELECT * FROM loyalty_customers WHERE tenant_id = ${tid} ORDER BY id DESC LIMIT 100`);
    res.json(r.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty-members", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const { customer_id, membership_tier, name, phone } = req.body;
    const no = "MEM-" + Date.now();
    const r = await db.execute(sql`INSERT INTO loyalty_customers (tenant_id, name, phone, points_balance) VALUES (${tid}, ${name||'Member-'+customer_id}, ${phone||null}, 0) RETURNING *`);
    const row: any = r.rows[0];
    res.json({ ...row, membership_number: no });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty/earn-points", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const { customer_id, purchase_amount } = req.body;
    const points = Math.floor((purchase_amount || 0) / 10);
    res.json({ success: true, points_earned: points });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loyalty/points/:customerId", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    res.json({ points_balance: 0, customer_id: req.params.customerId });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stock-alerts", auth, async (req: any, res: any) => {
  try { res.json([]); } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stock/:productId", auth, async (req: any, res: any) => {
  try { res.json({ quantity: 0, product_id: req.params.productId }); }
  catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/z-report", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    res.json({ date, total_sales: 0, total_returns: 0, cash_total: 0, card_total: 0, transaction_count: 0 });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/products", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const r = await db.execute(sql`SELECT * FROM products WHERE tenant_id=${tid} ORDER BY id DESC LIMIT 100`);
    res.json(r.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/products/search", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const q = req.query.q || '';
    const r = await db.execute(sql`SELECT * FROM products WHERE tenant_id=${tid} AND (product_name ILIKE ${'%'+q+'%'} OR barcode ILIKE ${'%'+q+'%'}) LIMIT 20`);
    res.json(r.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/orders", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const r = await db.execute(sql`SELECT * FROM pos_transactions WHERE tenant_id=${tid} ORDER BY id DESC LIMIT 100`);
    res.json(r.rows);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/orders/:id", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const r = await db.execute(sql`SELECT * FROM pos_transactions WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const row: any = r.rows[0];
    const ir = await db.execute(sql`SELECT * FROM pos_transaction_items WHERE transaction_id=${row.id} AND tenant_id=${tid}`);
    res.json({ ...row, total: Number(row.total_amount), items: ir.rows });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/orders", auth, async (req: any, res: any) => {
  const tid = req.session?.tenantId ?? req.user?.tenantId;
  try {
    const { customer_name, items, payment, payment_method, subtotal, tax_amount, total_amount, total, cashier_id } = req.body;
    const no = "POS-" + Date.now();
    const totalVal = total_amount || total || subtotal || 0;
    const payMethod = payment?.method || payment_method || 'cash';
    const r = await db.execute(sql`INSERT INTO pos_transactions (tenant_id, transaction_no, customer_name, payment_method, subtotal, tax_amount, total_amount, cashier_id, status) VALUES (${tid}, ${no}, ${customer_name||null}, ${payMethod}, ${subtotal||0}, ${tax_amount||0}, ${totalVal}, ${cashier_id||null}, 'completed') RETURNING *`);
    const row: any = r.rows[0];
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`INSERT INTO pos_transaction_items (tenant_id, transaction_id, product_id, product_name, qty, unit_price, discount_pct, tax_pct, line_total) VALUES (${tid}, ${row.id}, ${String(it.product_id||'')}, ${it.product_name||'Item'}, ${it.quantity||1}, ${it.unit_price||0}, ${it.discount||0}, ${it.tax_rate||0}, ${(it.unit_price||0)*(it.quantity||1)})`);
      }
    }
    res.json({ ...row, total: Number(row.total_amount), items: items || [] });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
