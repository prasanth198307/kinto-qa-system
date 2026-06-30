import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Channels ──────────────────────────────────────────────────────────────────
router.get("/channels", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ec_channels WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/channels", requireAuth, async (req: any, res) => {
  try {
    const { name, platform, api_key, api_secret, seller_id, marketplace_id, is_active } = req.body;
    const rows = await db.execute(sql`INSERT INTO ec_channels (tenant_id, name, platform, api_key, api_secret, seller_id, marketplace_id, is_active) VALUES (${tid(req)}, ${name}, ${platform||'manual'}, ${api_key||null}, ${api_secret||null}, ${seller_id||null}, ${marketplace_id||null}, ${is_active ?? true}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/channels/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, platform, api_key, api_secret, seller_id, marketplace_id, is_active } = req.body;
    const rows = await db.execute(sql`UPDATE ec_channels SET name=${name}, platform=${platform||'manual'}, api_key=${api_key||null}, api_secret=${api_secret||null}, seller_id=${seller_id||null}, marketplace_id=${marketplace_id||null}, is_active=${is_active ?? true} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/channels/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ec_channels WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", requireAuth, async (req: any, res) => {
  try {
    const { channel_id, status } = req.query;
    let q = sql`SELECT o.*, c.name as channel_name, c.platform FROM ec_orders o LEFT JOIN ec_channels c ON c.id=o.channel_id WHERE o.tenant_id=${tid(req)}`;
    if (channel_id) q = sql`${q} AND o.channel_id=${channel_id}`;
    if (status) q = sql`${q} AND o.status=${status}`;
    const rows = await db.execute(sql`${q} ORDER BY o.order_date DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/orders/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM ec_order_items WHERE order_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/orders", requireAuth, async (req: any, res) => {
  try {
    const { channel_id, channel_order_id, customer_name, customer_phone, customer_email, shipping_address, order_date, total_amount, shipping_amount, commission_amount, payment_method, items } = req.body;
    const no = "ECO-" + Date.now();
    const order = await db.execute(sql`INSERT INTO ec_orders (tenant_id, order_number, channel_id, channel_order_id, customer_name, customer_phone, customer_email, shipping_address, order_date, total_amount, shipping_amount, commission_amount, payment_method) VALUES (${tid(req)}, ${no}, ${channel_id||null}, ${channel_order_id||null}, ${customer_name}, ${customer_phone||null}, ${customer_email||null}, ${shipping_address||null}, ${order_date||null}, ${total_amount||0}, ${shipping_amount||0}, ${commission_amount||0}, ${payment_method||'prepaid'}) RETURNING *`);
    const oid = order.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`INSERT INTO ec_order_items (order_id, listing_id, sku, product_name, quantity, mrp, selling_price, discount, amount) VALUES (${oid}, ${it.listing_id||null}, ${it.sku||null}, ${it.product_name}, ${it.quantity||1}, ${it.mrp||0}, ${it.selling_price||0}, ${it.discount||0}, ${it.amount||0})`);
      }
    }
    res.json(order.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/orders/:id/status", requireAuth, async (req: any, res) => {
  try {
    const { status, tracking_number, courier } = req.body;
    const rows = await db.execute(sql`UPDATE ec_orders SET status=${status}, tracking_number=${tracking_number||null}, courier=${courier||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Listings ──────────────────────────────────────────────────────────────────
router.get("/listings", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT l.*, c.name as channel_name FROM ec_listings l LEFT JOIN ec_channels c ON c.id=l.channel_id WHERE l.tenant_id=${tid(req)} ORDER BY l.product_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/listings", requireAuth, async (req: any, res) => {
  try {
    const { channel_id, sku, product_name, category, mrp, selling_price, stock_qty, listing_url, is_active } = req.body;
    const rows = await db.execute(sql`INSERT INTO ec_listings (tenant_id, channel_id, sku, product_name, category, mrp, selling_price, stock_qty, listing_url, is_active) VALUES (${tid(req)}, ${channel_id||null}, ${sku||null}, ${product_name}, ${category||null}, ${mrp||0}, ${selling_price||0}, ${stock_qty||0}, ${listing_url||null}, ${is_active ?? true}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/listings/:id", requireAuth, async (req: any, res) => {
  try {
    const { sku, product_name, category, mrp, selling_price, stock_qty, listing_url, is_active } = req.body;
    const rows = await db.execute(sql`UPDATE ec_listings SET sku=${sku||null}, product_name=${product_name}, category=${category||null}, mrp=${mrp||0}, selling_price=${selling_price||0}, stock_qty=${stock_qty||0}, listing_url=${listing_url||null}, is_active=${is_active ?? true} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/listings/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM ec_listings WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Returns / RTO ─────────────────────────────────────────────────────────────
router.get("/returns", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT r.*, o.order_number, o.customer_name, c.name as channel_name FROM ec_returns r LEFT JOIN ec_orders o ON o.id=r.order_id LEFT JOIN ec_channels c ON c.id=o.channel_id WHERE r.tenant_id=${tid(req)} ORDER BY r.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/returns", requireAuth, async (req: any, res) => {
  try {
    const { order_id, return_type, reason, amount, status } = req.body;
    const no = "RET-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ec_returns (tenant_id, return_number, order_id, return_type, reason, amount, status) VALUES (${tid(req)}, ${no}, ${order_id}, ${return_type||'return'}, ${reason||null}, ${amount||0}, ${status||'pending'}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/returns/:id", requireAuth, async (req: any, res) => {
  try {
    const { return_type, reason, amount, status } = req.body;
    const rows = await db.execute(sql`UPDATE ec_returns SET return_type=${return_type||'return'}, reason=${reason||null}, amount=${amount||0}, status=${status||'pending'} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Settlements ───────────────────────────────────────────────────────────────
router.get("/settlements", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, c.name as channel_name FROM ec_settlements s LEFT JOIN ec_channels c ON c.id=s.channel_id WHERE s.tenant_id=${tid(req)} ORDER BY s.settlement_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/settlements", requireAuth, async (req: any, res) => {
  try {
    const { channel_id, settlement_date, period_from, period_to, gross_amount, commission, tds, other_deductions, net_amount, utr_number } = req.body;
    const no = "SET-" + Date.now();
    const rows = await db.execute(sql`INSERT INTO ec_settlements (tenant_id, settlement_number, channel_id, settlement_date, period_from, period_to, gross_amount, commission, tds, other_deductions, net_amount, utr_number) VALUES (${tid(req)}, ${no}, ${channel_id}, ${settlement_date}, ${period_from||null}, ${period_to||null}, ${gross_amount||0}, ${commission||0}, ${tds||0}, ${other_deductions||0}, ${net_amount||0}, ${utr_number||null}) RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Inventory Sync ────────────────────────────────────────────────────────────
router.get("/inventory-sync", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT s.*, c.name as channel_name FROM ec_inventory_sync s LEFT JOIN ec_channels c ON c.id=s.channel_id WHERE s.tenant_id=${tid(req)} ORDER BY s.synced_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/inventory-sync", requireAuth, async (req: any, res) => {
  try {
    const { channel_id, listing_id, sku, qty_before, qty_after, sync_type, notes } = req.body;
    const rows = await db.execute(sql`INSERT INTO ec_inventory_sync (tenant_id, channel_id, listing_id, sku, qty_before, qty_after, sync_type, notes) VALUES (${tid(req)}, ${channel_id||null}, ${listing_id||null}, ${sku||null}, ${qty_before||0}, ${qty_after||0}, ${sync_type||'manual'}, ${notes||null}) RETURNING *`);
    if (listing_id) {
      await db.execute(sql`UPDATE ec_listings SET stock_qty=${qty_after||0} WHERE id=${listing_id} AND tenant_id=${tid(req)}`);
    }
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [orders, revenue, returns, channels] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM ec_orders WHERE tenant_id=${tid(req)} AND DATE(order_date)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM ec_orders WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM order_date)=EXTRACT(MONTH FROM CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as count FROM ec_returns WHERE tenant_id=${tid(req)} AND status='pending'`),
      db.execute(sql`SELECT COUNT(*) as count FROM ec_channels WHERE tenant_id=${tid(req)} AND is_active=true`),
    ]);
    const byChannel = await db.execute(sql`SELECT c.name as channel_name, c.platform, COUNT(o.id) as orders, COALESCE(SUM(o.total_amount),0) as revenue FROM ec_orders o LEFT JOIN ec_channels c ON c.id=o.channel_id WHERE o.tenant_id=${tid(req)} AND EXTRACT(MONTH FROM o.order_date)=EXTRACT(MONTH FROM CURRENT_DATE) GROUP BY c.id, c.name, c.platform ORDER BY revenue DESC`);
    res.json({
      todayOrders: Number(orders.rows[0]?.count || 0),
      monthlyRevenue: Number(revenue.rows[0]?.total || 0),
      pendingReturns: Number(returns.rows[0]?.count || 0),
      activeChannels: Number(channels.rows[0]?.count || 0),
      byChannel: byChannel.rows,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
