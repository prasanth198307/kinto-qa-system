import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Tables ───────────────────────────────────────────────────────────────────
router.get("/tables", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_tables WHERE tenant_id=${tid(req)} ORDER BY table_number`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/tables", requireAuth, async (req: any, res) => {
  try {
    const { table_number, section, capacity, status } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO restaurant_tables (tenant_id, table_number, section, capacity, status)
      VALUES (${tid(req)}, ${table_number}, ${section||null}, ${capacity||4}, ${status||'available'})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/tables/:id", requireAuth, async (req: any, res) => {
  try {
    const { table_number, section, capacity, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_tables SET table_number=${table_number}, section=${section||null},
        capacity=${capacity||4}, status=${status||'available'}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/tables/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_tables WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Menu Categories ──────────────────────────────────────────────────────────
router.get("/menu-categories", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_menu_categories WHERE tenant_id=${tid(req)} ORDER BY sort_order, name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/menu-categories", requireAuth, async (req: any, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO restaurant_menu_categories (tenant_id, name, description, sort_order)
      VALUES (${tid(req)}, ${name}, ${description||null}, ${sort_order||0})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/menu-categories/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, description, sort_order, is_active } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_menu_categories SET name=${name}, description=${description||null},
        sort_order=${sort_order||0}, is_active=${is_active ?? true}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/menu-categories/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_menu_categories WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Menu Items ───────────────────────────────────────────────────────────────
router.get("/menu-items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT mi.*, mc.name as category_name
      FROM restaurant_menu_items mi
      LEFT JOIN restaurant_menu_categories mc ON mc.id=mi.category_id
      WHERE mi.tenant_id=${tid(req)} ORDER BY mc.sort_order, mi.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/menu-items", requireAuth, async (req: any, res) => {
  try {
    const { name, category_id, description, price, cost_price, food_type, is_available, prep_time_minutes } = req.body;
    const code = "ITEM-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO restaurant_menu_items (tenant_id, item_code, name, category_id, description, price, cost_price, food_type, is_available, prep_time_minutes)
      VALUES (${tid(req)}, ${code}, ${name}, ${category_id||null}, ${description||null},
              ${price||0}, ${cost_price||0}, ${food_type||'veg'}, ${is_available ?? true}, ${prep_time_minutes||15})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/menu-items/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, category_id, description, price, cost_price, food_type, is_available, prep_time_minutes } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_menu_items SET name=${name}, category_id=${category_id||null},
        description=${description||null}, price=${price||0}, cost_price=${cost_price||0},
        food_type=${food_type||'veg'}, is_available=${is_available ?? true}, prep_time_minutes=${prep_time_minutes||15}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/menu-items/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_menu_items WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── KOT Orders ───────────────────────────────────────────────────────────────
router.get("/kot-orders", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT k.*, t.table_number, s.session_name
      FROM restaurant_kot_orders k
      LEFT JOIN restaurant_tables t ON t.id=k.table_id
      LEFT JOIN restaurant_sessions s ON s.id=k.session_id
      WHERE k.tenant_id=${tid(req)} ORDER BY k.created_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/kot-orders/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT ki.*, mi.name as item_name, mi.food_type
      FROM restaurant_kot_items ki
      LEFT JOIN restaurant_menu_items mi ON mi.id=ki.menu_item_id
      WHERE ki.kot_id=${req.params.id}`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot-orders", requireAuth, async (req: any, res) => {
  try {
    const { table_id, session_id, order_type, waiter_name, notes, items } = req.body;
    const no = "KOT-" + Date.now();
    const kot = await db.execute(sql`
      INSERT INTO restaurant_kot_orders (tenant_id, kot_number, table_id, session_id, order_type, waiter_name, notes)
      VALUES (${tid(req)}, ${no}, ${table_id||null}, ${session_id||null}, ${order_type||'dine_in'}, ${waiter_name||null}, ${notes||null})
      RETURNING *`);
    const kotId = kot.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO restaurant_kot_items (kot_id, menu_item_id, quantity, rate, amount, notes)
          VALUES (${kotId}, ${it.menu_item_id}, ${it.quantity||1}, ${it.rate||0}, ${it.amount||0}, ${it.notes||null})`);
      }
    }
    if (table_id) {
      await db.execute(sql`UPDATE restaurant_tables SET status='occupied' WHERE id=${table_id} AND tenant_id=${tid(req)}`);
    }
    res.json(kot.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/kot-orders/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_kot_orders SET status=${status||'pending'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Kitchen Displays ─────────────────────────────────────────────────────────
router.get("/kitchen-displays", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_kitchen_displays WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kitchen-displays", requireAuth, async (req: any, res) => {
  try {
    const { name, station_type, categories } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO restaurant_kitchen_displays (tenant_id, name, station_type, categories)
      VALUES (${tid(req)}, ${name}, ${station_type||'main'}, ${categories||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/kitchen-displays/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, station_type, categories, is_active } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_kitchen_displays SET name=${name}, station_type=${station_type||'main'},
        categories=${categories||null}, is_active=${is_active ?? true}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/kitchen-displays/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_kitchen_displays WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Delivery Orders ──────────────────────────────────────────────────────────
router.get("/delivery-orders", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_delivery_orders WHERE tenant_id=${tid(req)} ORDER BY created_at DESC LIMIT 100`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/delivery-orders", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, delivery_address, platform, total_amount, delivery_fee, notes } = req.body;
    const no = "DEL-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO restaurant_delivery_orders (tenant_id, order_number, customer_name, customer_phone, delivery_address, platform, total_amount, delivery_fee, notes)
      VALUES (${tid(req)}, ${no}, ${customer_name}, ${customer_phone||null}, ${delivery_address||null},
              ${platform||'direct'}, ${total_amount||0}, ${delivery_fee||0}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/delivery-orders/:id", requireAuth, async (req: any, res) => {
  try {
    const { customer_name, customer_phone, delivery_address, platform, total_amount, delivery_fee, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_delivery_orders SET customer_name=${customer_name}, customer_phone=${customer_phone||null},
        delivery_address=${delivery_address||null}, platform=${platform||'direct'},
        total_amount=${total_amount||0}, delivery_fee=${delivery_fee||0},
        status=${status||'pending'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/delivery-orders/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE restaurant_delivery_orders SET status='cancelled' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Sessions ─────────────────────────────────────────────────────────────────
router.get("/sessions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_sessions WHERE tenant_id=${tid(req)} ORDER BY opened_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/sessions", requireAuth, async (req: any, res) => {
  try {
    const { session_name, opened_by, opening_cash } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO restaurant_sessions (tenant_id, session_name, opened_by, opening_cash, status)
      VALUES (${tid(req)}, ${session_name}, ${opened_by||null}, ${opening_cash||0}, 'open')
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/sessions/:id/close", requireAuth, async (req: any, res) => {
  try {
    const { closing_cash, total_sales } = req.body;
    const rows = await db.execute(sql`
      UPDATE restaurant_sessions SET status='closed', closed_at=NOW(),
        closing_cash=${closing_cash||0}, total_sales=${total_sales||0}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Recipes ──────────────────────────────────────────────────────────────────
router.get("/recipes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT r.*, mi.name as item_name
      FROM restaurant_recipes r
      LEFT JOIN restaurant_menu_items mi ON mi.id=r.menu_item_id
      WHERE r.tenant_id=${tid(req)} ORDER BY mi.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/recipes", requireAuth, async (req: any, res) => {
  try {
    const { menu_item_id, ingredient_name, quantity, unit, cost } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO restaurant_recipes (tenant_id, menu_item_id, ingredient_name, quantity, unit, cost)
      VALUES (${tid(req)}, ${menu_item_id}, ${ingredient_name}, ${quantity||0}, ${unit||null}, ${cost||0})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/recipes/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_recipes WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [tables, kots, delivery, revenue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied FROM restaurant_tables WHERE tenant_id=${tid(req)}`),
      db.execute(sql`SELECT COUNT(*) as count FROM restaurant_kot_orders WHERE tenant_id=${tid(req)} AND status='pending' AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COUNT(*) as count FROM restaurant_delivery_orders WHERE tenant_id=${tid(req)} AND status NOT IN ('delivered','cancelled') AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM restaurant_delivery_orders WHERE tenant_id=${tid(req)} AND DATE(created_at)=CURRENT_DATE AND status='delivered'`),
    ]);
    res.json({
      totalTables: Number(tables.rows[0]?.total || 0),
      occupiedTables: Number(tables.rows[0]?.occupied || 0),
      pendingKots: Number(kots.rows[0]?.count || 0),
      activeDeliveries: Number(delivery.rows[0]?.count || 0),
      todayRevenue: Number(revenue.rows[0]?.total || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
