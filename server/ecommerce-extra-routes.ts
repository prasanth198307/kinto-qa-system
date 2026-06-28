import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();
function auth(req: any, res: any, next: any) { if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" }); next(); }
function tid(req: any) { return req.session?.tenantId ?? req.user?.tenantId; }

// Channels
router.get('/channels', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM ecom_sync_channels WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

router.post('/channels', auth, async (req: any, res) => {
  const t = tid(req);
  const { channel_name, channel_type, api_key, seller_id } = req.body;
  const r = await db.execute(sql`INSERT INTO ecom_sync_channels (tenant_id,channel_name,channel_type,api_key,seller_id,is_active,created_at)
    VALUES (${t},${channel_name},${channel_type},${api_key||null},${seller_id||null},true,now()) RETURNING *`);
  res.json(r.rows[0]);
});

router.post('/channels/:id/sync', auth, async (req: any, res) => {
  const t = tid(req);
  // Placeholder — real implementation would call channel API
  res.json({ synced_count: 0, message: "Sync scheduled. Configure API key to enable." });
});

// Orders
router.get('/orders', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM ecom_orders WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 50`);
  res.json(r.rows);
});

router.post('/orders/:id/allocate-stock', auth, async (req: any, res) => {
  const t = tid(req);
  await db.execute(sql`UPDATE ecom_orders SET status='processing', updated_at=now() WHERE id=${req.params.id} AND tenant_id=${t}`);
  res.json({ ok: true });
});

// Shipments
router.get('/shipments', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM ecom_shipments WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 50`);
  res.json(r.rows);
});

router.post('/shipments', auth, async (req: any, res) => {
  const t = tid(req);
  const { order_id, courier_name, awb_number, tracking_url } = req.body;
  const r = await db.execute(sql`INSERT INTO ecom_shipments (tenant_id,order_id,courier_name,awb_number,tracking_url,status,created_at)
    VALUES (${t},${order_id},${courier_name},${awb_number},${tracking_url||null},'dispatched',now()) RETURNING *`);
  res.json(r.rows[0]);
});

// Returns
router.get('/returns', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM ecom_returns WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 50`);
  res.json(r.rows);
});

router.post('/returns/process', auth, async (req: any, res) => {
  const t = tid(req);
  const { order_id, reason, refund_amount } = req.body;
  const r = await db.execute(sql`INSERT INTO ecom_returns (tenant_id,order_id,reason,refund_amount,status,created_at)
    VALUES (${t},${order_id},${reason},${refund_amount},'approved',now()) RETURNING *`);
  res.json(r.rows[0]);
});

// Reviews
router.get('/reviews', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM ecom_reviews WHERE tenant_id=${t} ORDER BY review_date DESC LIMIT 50`);
  res.json(r.rows);
});

// Marketing
router.get('/marketing/ad-spend', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM ecom_ad_spend WHERE tenant_id=${t} ORDER BY date DESC LIMIT 50`);
  res.json(r.rows);
});

router.post('/marketing/ad-spend', auth, async (req: any, res) => {
  const t = tid(req);
  const { platform, campaign_name, spend, revenue, date } = req.body;
  const r = await db.execute(sql`INSERT INTO ecom_ad_spend (tenant_id,platform,campaign_name,spend,revenue,date,created_at)
    VALUES (${t},${platform},${campaign_name},${spend},${revenue||0},${date||'today'},now()) RETURNING *`);
  res.json(r.rows[0]);
});

// Reports
router.get('/reports/channel-performance', auth, async (req: any, res) => {
  const t = tid(req);
  const { from, to } = req.query;
  const r = await db.execute(sql`SELECT channel_type, COUNT(*) as orders, SUM(total_amount) as revenue FROM ecom_orders WHERE tenant_id=${t} AND created_at BETWEEN ${from||'2000-01-01'} AND ${to||'2099-12-31'} GROUP BY channel_type ORDER BY revenue DESC`);
  res.json(r.rows);
});

router.get('/reports/return-rate', auth, async (req: any, res) => {
  const t = tid(req);
  const { from, to } = req.query;
  const orders = await db.execute(sql`SELECT COUNT(*) as total FROM ecom_orders WHERE tenant_id=${t} AND created_at BETWEEN ${from||'2000-01-01'} AND ${to||'2099-12-31'}`);
  const returns = await db.execute(sql`SELECT COUNT(*) as total, SUM(refund_amount) as refund FROM ecom_returns WHERE tenant_id=${t} AND created_at BETWEEN ${from||'2000-01-01'} AND ${to||'2099-12-31'}`);
  res.json([{ ...orders.rows[0], ...returns.rows[0] }]);
});

router.get('/reports/product-wise', auth, async (req: any, res) => {
  const t = tid(req);
  const { from, to } = req.query;
  const r = await db.execute(sql`SELECT product_name, SUM(quantity) as qty, SUM(amount) as revenue FROM ecom_order_items oi JOIN ecom_orders o ON o.id=oi.order_id WHERE o.tenant_id=${t} AND o.created_at BETWEEN ${from||'2000-01-01'} AND ${to||'2099-12-31'} GROUP BY product_name ORDER BY revenue DESC LIMIT 20`);
  res.json(r.rows);
});

router.get('/reports/fulfillment-tat', auth, async (req: any, res) => {
  const t = tid(req);
  res.json([]);
});

router.get('/reports/customer-ltv', auth, async (req: any, res) => {
  const t = tid(req);
  res.json([]);
});

export default router;
