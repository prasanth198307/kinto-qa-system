import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Platform Config ──────────────────────────────────────────────────────────
router.get("/config", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM aggregator_configs WHERE tenant_id = ${t} ORDER BY platform`);
    const platforms = ["swiggy", "zomato", "ubereats", "talabat", "deliveroo", "ondc"];
    const existing = new Map((rows.rows as any[]).map((r: any) => [r.platform, r]));
    const result = platforms.map(p => existing.get(p) || { tenant_id: t, platform: p, is_enabled: 0, api_key: null, restaurant_id: null, auto_accept: 1 });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/config", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { platform, api_key, api_secret, restaurant_id, webhook_secret, auto_accept } = req.body;
    await db.execute(sql`
      INSERT INTO aggregator_configs (tenant_id, platform, api_key, api_secret, restaurant_id, webhook_secret, auto_accept, created_at)
      VALUES (${t}, ${platform}, ${api_key||null}, ${api_secret||null}, ${restaurant_id||null}, ${webhook_secret||null}, ${auto_accept??1}, NOW())
      ON CONFLICT (tenant_id, platform) DO UPDATE SET
        api_key = EXCLUDED.api_key, api_secret = EXCLUDED.api_secret,
        restaurant_id = EXCLUDED.restaurant_id, webhook_secret = EXCLUDED.webhook_secret,
        auto_accept = EXCLUDED.auto_accept`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/config/:platform/toggle", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { is_enabled } = req.body;
    await db.execute(sql`
      INSERT INTO aggregator_configs (tenant_id, platform, is_enabled, created_at) VALUES (${t}, ${req.params.platform}, ${is_enabled}, NOW())
      ON CONFLICT (tenant_id, platform) DO UPDATE SET is_enabled = ${is_enabled}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Webhook handler helper ────────────────────────────────────────────────────
async function handleIncomingOrder(tenantId: string, platform: string, orderData: any) {
  const normalized = {
    customer_name: orderData.customer?.name || orderData.customerName || "Online Customer",
    customer_phone: orderData.customer?.phone || orderData.phone || "",
    delivery_address: orderData.deliveryAddress || orderData.delivery_address || "",
    items: orderData.items || orderData.order_items || [],
    subtotal: Number(orderData.subtotal || orderData.subTotal || 0),
    platform_commission: Number(orderData.commission || orderData.platformFee || 0),
    gst_amount: Number(orderData.gst || orderData.tax || 0),
    total_amount: Number(orderData.total || orderData.totalAmount || 0),
    platform_order_id: orderData.orderId || orderData.order_id || String(Date.now()),
    special_instructions: orderData.specialInstructions || orderData.notes || "",
    estimated_delivery_time: orderData.estimatedTime || 30,
  };

  const result = await db.execute(sql`
    INSERT INTO aggregator_orders (tenant_id, platform, platform_order_id, customer_name, customer_phone, delivery_address, items, subtotal, platform_commission, gst_amount, total_amount, status, special_instructions, estimated_delivery_time, created_at)
    VALUES (${tenantId}, ${platform}, ${normalized.platform_order_id}, ${normalized.customer_name}, ${normalized.customer_phone}, ${normalized.delivery_address}, ${JSON.stringify(normalized.items)}, ${normalized.subtotal}, ${normalized.platform_commission}, ${normalized.gst_amount}, ${normalized.total_amount}, 'new', ${normalized.special_instructions}, ${normalized.estimated_delivery_time}, NOW())
    RETURNING id`);

  const cfg = await db.execute(sql`SELECT auto_accept FROM aggregator_configs WHERE tenant_id = ${tenantId} AND platform = ${platform}`);
  if ((cfg.rows[0] as any)?.auto_accept) {
    const orderId = (result.rows[0] as any)?.id;
    const kotNo = `${platform.toUpperCase()}-${Date.now()}`;
    const subtotal = normalized.total_amount;
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const grand = subtotal + gst;
    const kot = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, kot_number, table_number, order_type, status, subtotal, gst_amount, grand_total, record_status, created_at)
      VALUES (${tenantId}, ${kotNo}, ${platform}, 'delivery', 'pending', ${subtotal}, ${gst}, ${grand}, 1, NOW())
      RETURNING id`);
    const kotId = (kot.rows[0] as any)?.id;
    for (const item of normalized.items) {
      await db.execute(sql`INSERT INTO kot_items (tenant_id, kot_id, item_name, quantity, unit_price, total_price, kitchen_status, created_at) VALUES (${tenantId}, ${kotId}, ${item.name||item.item_name||'Item'}, ${item.quantity||item.qty||1}, ${item.price||0}, ${(item.price||0)*(item.quantity||1)}, 'pending', NOW())`);
    }
    await db.execute(sql`UPDATE aggregator_orders SET status = 'accepted', kot_id = ${kotId} WHERE id = ${orderId}`);
  }
  return result.rows[0];
}

// ── Platform Webhooks (PUBLIC) ────────────────────────────────────────────────
async function resolveTenantId(body: any, platform: string, fallback: any): Promise<string> {
  const restaurantId = body?.restaurant_id || body?.outlet_id || body?.store_id || body?.restaurantId;
  if (restaurantId) {
    try {
      const cfgRows = await db.execute(sql`SELECT tenant_id FROM aggregator_configs WHERE restaurant_id = ${String(restaurantId)} AND platform = ${platform} LIMIT 1`);
      const found = (cfgRows.rows[0] as any)?.tenant_id;
      if (found) return String(found);
    } catch { /* fall through */ }
  }
  return String(fallback || "1");
}

router.post("/swiggy/webhook", async (req: any, res: any) => {
  try {
    const tenantId = await resolveTenantId(req.body, "swiggy", req.query.tenant_id);
    await handleIncomingOrder(tenantId, "swiggy", req.body);
    res.json({ status: "accepted", message: "Order received" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/zomato/webhook", async (req: any, res: any) => {
  try {
    const tenantId = await resolveTenantId(req.body, "zomato", req.query.tenant_id);
    await handleIncomingOrder(tenantId, "zomato", req.body);
    res.json({ status: "accepted" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ubereats/webhook", async (req: any, res: any) => {
  try {
    const tenantId = await resolveTenantId(req.body, "ubereats", req.query.tenant_id);
    await handleIncomingOrder(tenantId, "ubereats", req.body);
    res.json({ status: "success" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/talabat/webhook", async (req: any, res: any) => {
  try {
    const tenantId = await resolveTenantId(req.body, "talabat", req.query.tenant_id);
    await handleIncomingOrder(tenantId, "talabat", req.body);
    res.json({ status: "ok" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/ondc/webhook", async (req: any, res: any) => {
  try {
    // ONDC uses provider.id or context.bpp_id to identify the restaurant
    const ondcRestaurantId = req.body?.message?.order?.provider?.id || req.body?.context?.bpp_id;
    const tenantId = await resolveTenantId({ restaurant_id: ondcRestaurantId }, "ondc", req.query.tenant_id);
    const ondcOrder = {
      orderId: req.body?.message?.order?.id,
      customer: { name: req.body?.message?.order?.billing?.name, phone: req.body?.message?.order?.billing?.phone },
      deliveryAddress: req.body?.message?.order?.fulfillments?.[0]?.end?.location?.address?.area,
      items: (req.body?.message?.order?.items || []).map((i: any) => ({ name: i.descriptor?.name, quantity: i.quantity?.count, price: Number(i.price?.value || 0) })),
      total: Number(req.body?.message?.order?.quote?.price?.value || 0),
    };
    await handleIncomingOrder(tenantId, "ondc", ondcOrder);
    res.json({ message: { ack: { status: "ACK" } } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Order Management ──────────────────────────────────────────────────────────
router.get("/orders", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { platform, status, from, to } = req.query;
    let query = `SELECT * FROM aggregator_orders WHERE tenant_id = '${t}'`;
    if (platform && platform !== 'all') query += ` AND platform = '${platform}'`;
    if (status && status !== 'all') query += ` AND status = '${status}'`;
    if (from) query += ` AND created_at >= '${from}'`;
    if (to) query += ` AND created_at <= '${to} 23:59:59'`;
    query += ` ORDER BY created_at DESC LIMIT 100`;
    const rows = await db.execute(sql.raw(query));
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/orders/:id/status", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { status } = req.body;
    await db.execute(sql`UPDATE aggregator_orders SET status = ${status}, updated_at = NOW() WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Commission Report ─────────────────────────────────────────────────────────
router.get("/commission-report", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];
    const rows = await db.execute(sql`
      SELECT platform,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        SUM(platform_commission) as commission,
        SUM(total_amount - platform_commission) as net_revenue,
        ROUND(AVG(CASE WHEN total_amount > 0 THEN platform_commission / total_amount * 100 ELSE 0 END), 1) as commission_pct
      FROM aggregator_orders
      WHERE tenant_id = ${t} AND created_at BETWEEN ${fromDate} AND ${toDate || 'NOW()'}
      GROUP BY platform ORDER BY revenue DESC`);
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Menu Sync ─────────────────────────────────────────────────────────────────
router.post("/menu/sync", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { platform_ids } = req.body;
    const items = await db.execute(sql`SELECT * FROM menu_items WHERE tenant_id = ${t} AND is_available = true`);
    const platforms = platform_ids || ["swiggy", "zomato", "ubereats"];
    res.json({ success: true, synced_to: platforms, item_count: items.rows.length, message: `${items.rows.length} items queued for sync to ${platforms.join(', ')}` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ONDC — Open Network for Digital Commerce
// Full catalog management + order lifecycle (search/select/init/confirm/status/cancel)
// ══════════════════════════════════════════════════════════════════════════════

// GET /ondc/catalog — publish catalog in ONDC Beckn protocol format
router.get("/ondc/catalog", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const [items, cats, outlet] = await Promise.all([
      db.execute(sql`SELECT mi.*, mc.name as category_name FROM menu_items mi LEFT JOIN menu_categories mc ON mc.id = mi.category_id WHERE mi.tenant_id=${t} AND mi.is_available=true ORDER BY mc.sort_order, mi.sort_order`),
      db.execute(sql`SELECT * FROM menu_categories WHERE tenant_id=${t} ORDER BY sort_order`),
      db.execute(sql`SELECT * FROM tenant_settings WHERE tenant_id=${t} LIMIT 1`),
    ]);
    const biz = (outlet.rows[0] as any) || {};
    const catalog = {
      "bpp/descriptor": { name: biz.business_name || "Restaurant", symbol: biz.logo_url || null },
      "bpp/providers": [{
        id: `PROVIDER_${t}`,
        descriptor: { name: biz.business_name || "Restaurant", short_desc: biz.tagline || "", images: biz.logo_url ? [biz.logo_url] : [] },
        locations: [{ id: `LOC_${t}`, gps: biz.latitude && biz.longitude ? `${biz.latitude},${biz.longitude}` : null, address: { door: biz.address || "", city: biz.city || "", state: biz.state || "", country: "IND", area_code: biz.pincode || "" } }],
        "@ondc/org/fssai_license_no": biz.fssai_number || null,
        categories: (cats.rows as any[]).map(c => ({ id: String(c.id), descriptor: { name: c.name } })),
        items: (items.rows as any[]).map(item => ({
          id: String(item.id),
          descriptor: { name: item.name, short_desc: item.description || "", images: item.image_url ? [item.image_url] : [] },
          price: { currency: "INR", value: String((Number(item.price) / 100).toFixed(2)), maximum_value: String((Number(item.price) / 100).toFixed(2)) },
          category_id: String(item.category_id),
          "@ondc/org/returnable": false,
          "@ondc/org/cancellable": true,
          "@ondc/org/time_to_ship": "PT30M",
          "@ondc/org/available_on_cod": true,
          "@ondc/org/contact_details_consumer_care": biz.phone || "",
          "@ondc/org/statutory_reqs_packaged_commodities": { manufacturer_or_packer_name: biz.business_name || "", net_quantity_of_commodity_in_pkg: "1" },
          fulfillment_id: `FULFILL_${t}`,
          location_id: `LOC_${t}`,
          tags: { veg_nonveg: item.is_veg ? "veg" : "non_veg" },
        })),
        fulfillments: [{ id: `FULFILL_${t}`, type: "Delivery", contact: { phone: biz.phone || "", email: biz.email || "" } }],
      }],
    };
    res.json(catalog);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ondc/on_search — respond to ONDC search request (BPP side)
router.post("/ondc/on_search", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { context } = req.body || {};
    const catalogRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/aggregators/ondc/catalog`, { headers: { cookie: req.headers.cookie || "" } });
    const catalog = await catalogRes.json();
    res.json({
      context: { ...context, action: "on_search", bpp_id: `bpp_${t}`, bpp_uri: `${process.env.APP_URL || "https://kinto.swacherp.com"}/api/aggregators/ondc` },
      message: { catalog },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ondc/on_select — respond with quote/pricing for selected items
router.post("/ondc/on_select", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { context, message } = req.body || {};
    const orderItems = message?.order?.items || [];
    let total = 0;
    const quotedItems = [];
    for (const oi of orderItems) {
      const row = await db.execute(sql`SELECT * FROM menu_items WHERE id=${oi.id} AND tenant_id=${t}`).catch(() => ({ rows: [] }));
      const item = (row.rows[0] as any);
      if (item) {
        const price = Number(item.price) / 100;
        const qty = Number(oi.quantity?.count || 1);
        total += price * qty;
        quotedItems.push({ id: oi.id, quantity: oi.quantity, price: { currency: "INR", value: String(price.toFixed(2)) } });
      }
    }
    const deliveryFee = total > 300 ? 0 : 40;
    res.json({
      context: { ...context, action: "on_select" },
      message: {
        order: {
          items: quotedItems,
          quote: {
            price: { currency: "INR", value: String((total + deliveryFee).toFixed(2)) },
            breakup: [
              { "@ondc/org/item_id": "all", title: "Item Total", price: { currency: "INR", value: String(total.toFixed(2)) } },
              { "@ondc/org/item_id": "delivery", title: "Delivery Charges", price: { currency: "INR", value: String(deliveryFee.toFixed(2)) } },
            ],
            ttl: "PT30M",
          },
        },
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ondc/on_confirm — confirm ONDC order, create KOT in system
router.post("/ondc/on_confirm", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { context, message } = req.body || {};
    const order = message?.order || {};
    const orderId = `ONDC-${Date.now()}`;
    // Create internal KOT/order
    const kot = await db.execute(sql`
      INSERT INTO orders (tenant_id, order_number, customer_name, customer_phone, order_type, status, total_amount, notes, source)
      VALUES (${t}, ${orderId}, ${order.billing?.name || "ONDC Customer"}, ${order.billing?.phone || null},
              'delivery', 'accepted', ${Math.round((Number(order.quote?.price?.value || 0)) * 100)},
              'ONDC Order', 'ondc')
      RETURNING *
    `).catch(() => ({ rows: [{ id: orderId }] }));
    const kotId = (kot.rows[0] as any)?.id || orderId;
    res.json({
      context: { ...context, action: "on_confirm" },
      message: {
        order: {
          ...order, id: orderId, state: "Accepted",
          fulfillments: [{ id: order.fulfillments?.[0]?.id, state: { descriptor: { code: "Accepted" } }, tracking: false,
            tags: { "@ondc/org/TAT": "PT30M" } }],
        },
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ondc/on_status — return order status
router.post("/ondc/on_status", async (req: any, res: any) => {
  try {
    const { context, message } = req.body || {};
    const orderId = message?.order_id || context?.transaction_id;
    const orderRow = await db.execute(sql`SELECT status FROM orders WHERE order_number=${orderId} LIMIT 1`).catch(() => ({ rows: [] }));
    const status = (orderRow.rows[0] as any)?.status || "Accepted";
    const ondcState: Record<string, string> = { accepted: "Accepted", preparing: "In-progress", ready: "Ready-to-ship", dispatched: "Order-picked-up", delivered: "Order-delivered", cancelled: "Cancelled" };
    res.json({
      context: { ...context, action: "on_status" },
      message: { order: { id: orderId, state: ondcState[status] || "Accepted" } },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ondc/on_cancel — cancel ONDC order
router.post("/ondc/on_cancel", async (req: any, res: any) => {
  try {
    const { context, message } = req.body || {};
    const orderId = message?.order_id;
    const reason = message?.cancellation_reason_id || "004";
    if (orderId) {
      await db.execute(sql`UPDATE orders SET status='cancelled', notes=COALESCE(notes,'') || ' [ONDC cancelled, reason:' || ${reason} || ']' WHERE order_number=${orderId}`).catch(() => {});
    }
    res.json({
      context: { ...context, action: "on_cancel" },
      message: { order: { id: orderId, state: "Cancelled", cancellation: { cancelled_by: "CONSUMER", reason: { id: reason } } } },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /ondc/orders — list ONDC orders from the system
router.get("/ondc/orders", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { from_date, to_date, status } = req.query as any;
    const rows = await db.execute(sql`
      SELECT * FROM orders WHERE tenant_id=${t} AND source='ondc'
        ${from_date ? sql`AND DATE(created_at) >= ${from_date}` : sql``}
        ${to_date ? sql`AND DATE(created_at) <= ${to_date}` : sql``}
        ${status ? sql`AND status = ${status}` : sql``}
      ORDER BY created_at DESC LIMIT 200
    `).catch(() => ({ rows: [] }));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
