import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ─── OUTLETS ────────────────────────────────────────────────────────────────
router.get("/outlets", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_outlets WHERE tenant_id=${tid(req)} ORDER BY id`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/outlets", requireAuth, async (req, res) => {
  try {
    const { name, address, phone, gst_number, fssai_number, is_active } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_outlets (tenant_id, name, address, phone, gst_number, fssai_number, is_active)
      VALUES (${tid(req)}, ${name}, ${address}, ${phone}, ${gst_number}, ${fssai_number}, ${is_active ?? true})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/outlets/:id", requireAuth, async (req, res) => {
  try {
    const { name, address, phone, gst_number, fssai_number, is_active } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_outlets SET name=${name}, address=${address}, phone=${phone},
        gst_number=${gst_number}, fssai_number=${fssai_number}, is_active=${is_active}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/outlets/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_outlets WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── TERMINALS ───────────────────────────────────────────────────────────────
router.get("/terminals", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_terminals WHERE tenant_id=${tid(req)} ORDER BY id`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/terminals", requireAuth, async (req, res) => {
  try {
    const { name, outlet_id, terminal_type, printer_id, is_active } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_terminals (tenant_id, name, outlet_id, terminal_type, printer_id, is_active)
      VALUES (${tid(req)}, ${name}, ${outlet_id}, ${terminal_type}, ${printer_id}, ${is_active ?? true})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/terminals/:id", requireAuth, async (req, res) => {
  try {
    const { name, outlet_id, terminal_type, printer_id, is_active } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_terminals SET name=${name}, outlet_id=${outlet_id}, terminal_type=${terminal_type},
        printer_id=${printer_id}, is_active=${is_active}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/terminals/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_terminals WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── TABLES ───────────────────────────────────────────────────────────────────
router.get("/tables", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_tables WHERE tenant_id=${tid(req)} ORDER BY table_number`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/tables", requireAuth, async (req, res) => {
  try {
    const { table_number, section, capacity, status, outlet_id } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_tables (tenant_id, table_number, section, capacity, status, outlet_id)
      VALUES (${tid(req)}, ${table_number}, ${section}, ${capacity}, ${status ?? 'available'}, ${outlet_id})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/tables/:id", requireAuth, async (req, res) => {
  try {
    const { table_number, section, capacity, status, outlet_id } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_tables SET table_number=${table_number}, section=${section},
        capacity=${capacity}, status=${status}, outlet_id=${outlet_id}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/tables/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_tables WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// TABLE ACTIONS
router.post("/tables/:id/open", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      UPDATE restaurant_tables SET status='occupied', occupied_since=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/tables/:id/close", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      UPDATE restaurant_tables SET status='available', current_kot_id=null, occupied_since=null
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/tables/merge", requireAuth, async (req, res) => {
  try {
    const { table1_id, table2_id } = req.body;
    await db.execute(sql`
      UPDATE restaurant_tables SET status='merged', merged_with=${table1_id}
      WHERE id=${table2_id} AND tenant_id=${tid(req)}`);
    const result = await db.execute(sql`
      SELECT * FROM restaurant_tables WHERE id IN (${table1_id}, ${table2_id}) AND tenant_id=${tid(req)}`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/tables/:id/transfer", requireAuth, async (req, res) => {
  try {
    const { to_table_id } = req.body;
    const src = await db.execute(sql`SELECT * FROM restaurant_tables WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const srcTable = src.rows[0] as any;
    await db.execute(sql`
      UPDATE restaurant_tables SET status='occupied', occupied_since=${srcTable.occupied_since}, current_kot_id=${srcTable.current_kot_id}
      WHERE id=${to_table_id} AND tenant_id=${tid(req)}`);
    await db.execute(sql`
      UPDATE restaurant_tables SET status='available', current_kot_id=null, occupied_since=null
      WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── FLOOR PLAN ───────────────────────────────────────────────────────────────
router.get("/floor-plan", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_floor_plan WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(result.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/floor-plan", requireAuth, async (req, res) => {
  try {
    const { layout_json, outlet_id } = req.body;
    const existing = await db.execute(sql`SELECT id FROM restaurant_floor_plan WHERE tenant_id=${tid(req)} AND outlet_id=${outlet_id} LIMIT 1`);
    let result;
    if (existing.rows.length > 0) {
      result = await db.execute(sql`
        UPDATE restaurant_floor_plan SET layout_json=${JSON.stringify(layout_json)}, updated_at=NOW()
        WHERE tenant_id=${tid(req)} AND outlet_id=${outlet_id} RETURNING *`);
    } else {
      result = await db.execute(sql`
        INSERT INTO restaurant_floor_plan (tenant_id, outlet_id, layout_json)
        VALUES (${tid(req)}, ${outlet_id}, ${JSON.stringify(layout_json)}) RETURNING *`);
    }
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MENU CATEGORIES ─────────────────────────────────────────────────────────
router.get("/menu-categories", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM menu_categories WHERE tenant_id=${tid(req)} ORDER BY sort_order, name`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/menu-categories", requireAuth, async (req, res) => {
  try {
    const { name, description, sort_order, is_active, image_url } = req.body;
    const result = await db.execute(sql`
      INSERT INTO menu_categories (tenant_id, name, description, sort_order, is_active, image_url)
      VALUES (${tid(req)}, ${name}, ${description}, ${sort_order ?? 0}, ${is_active ?? true}, ${image_url})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/menu-categories/:id", requireAuth, async (req, res) => {
  try {
    const { name, description, sort_order, is_active, image_url } = req.body;
    const result = await db.execute(sql`
      UPDATE menu_categories SET name=${name}, description=${description},
        sort_order=${sort_order}, is_active=${is_active}, image_url=${image_url}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/menu-categories/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM menu_categories WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MENU ITEMS ───────────────────────────────────────────────────────────────
router.get("/menu-items", requireAuth, async (req, res) => {
  try {
    const { category_id } = req.query;
    let result;
    if (category_id) {
      result = await db.execute(sql`
        SELECT mi.*, mc.name as category_name FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.tenant_id=${tid(req)} AND mi.category_id=${category_id} ORDER BY mi.name`);
    } else {
      result = await db.execute(sql`
        SELECT mi.*, mc.name as category_name FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.tenant_id=${tid(req)} ORDER BY mc.sort_order, mi.name`);
    }
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/menu-items/search", requireAuth, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const result = await db.execute(sql`
      SELECT mi.*, mc.name as category_name FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.tenant_id=${tid(req)} AND mi.name ILIKE ${q}
      ORDER BY mi.name LIMIT 50`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/menu-items", requireAuth, async (req, res) => {
  try {
    const { name, category_id, price, gst_pct, description, is_available, is_veg, image_url, short_code } = req.body;
    const result = await db.execute(sql`
      INSERT INTO menu_items (tenant_id, name, category_id, price, gst_pct, description, is_available, is_veg, image_url, short_code)
      VALUES (${tid(req)}, ${name}, ${category_id}, ${price}, ${gst_pct ?? 5}, ${description}, ${is_available ?? true}, ${is_veg ?? true}, ${image_url}, ${short_code})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/menu-items/:id", requireAuth, async (req, res) => {
  try {
    const { name, category_id, price, gst_pct, description, is_available, is_veg, image_url, short_code } = req.body;
    const result = await db.execute(sql`
      UPDATE menu_items SET name=${name}, category_id=${category_id}, price=${price},
        gst_pct=${gst_pct}, description=${description}, is_available=${is_available},
        is_veg=${is_veg}, image_url=${image_url}, short_code=${short_code}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/menu-items/:id/toggle", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      UPDATE menu_items SET is_available = NOT is_available
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/menu-items/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM menu_items WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MODIFIERS ────────────────────────────────────────────────────────────────
router.get("/modifiers", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_modifiers WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/modifiers", requireAuth, async (req, res) => {
  try {
    const { name, is_required, min_select, max_select } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_modifiers (tenant_id, name, is_required, min_select, max_select)
      VALUES (${tid(req)}, ${name}, ${is_required ?? false}, ${min_select ?? 0}, ${max_select ?? 1})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/modifiers/:id", requireAuth, async (req, res) => {
  try {
    const { name, is_required, min_select, max_select } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_modifiers SET name=${name}, is_required=${is_required},
        min_select=${min_select}, max_select=${max_select}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/modifiers/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_modifiers WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/modifiers/:id/options", requireAuth, async (req, res) => {
  try {
    const { name, extra_price } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_modifier_options (tenant_id, modifier_id, name, extra_price)
      VALUES (${tid(req)}, ${req.params.id}, ${name}, ${extra_price ?? 0})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/modifiers/:id/options/:optionId", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_modifier_options WHERE id=${req.params.optionId} AND modifier_id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── COMBOS ───────────────────────────────────────────────────────────────────
router.get("/combos", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_combos WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/combos", requireAuth, async (req, res) => {
  try {
    const { name, description, price, items, is_active } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_combos (tenant_id, name, description, price, items, is_active)
      VALUES (${tid(req)}, ${name}, ${description}, ${price}, ${JSON.stringify(items || [])}, ${is_active ?? true})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/combos/:id", requireAuth, async (req, res) => {
  try {
    const { name, description, price, items, is_active } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_combos SET name=${name}, description=${description}, price=${price},
        items=${JSON.stringify(items || [])}, is_active=${is_active}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/combos/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_combos WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── KOT ORDERS (legacy routes kept) ─────────────────────────────────────────
router.get("/kot-orders", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT ko.*, rt.table_number FROM kot_orders ko
      LEFT JOIN restaurant_tables rt ON ko.table_id = rt.id
      WHERE ko.tenant_id=${tid(req)} ORDER BY ko.created_at DESC LIMIT 100`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/kot-orders/:id/items", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT ki.*, mi.name as item_name FROM kot_items ki
      LEFT JOIN menu_items mi ON ki.menu_item_id = mi.id
      WHERE ki.kot_id=${req.params.id}`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot-orders", requireAuth, async (req, res) => {
  try {
    const { table_id, table_number, order_type, covers, items, cashier_name, terminal_id, outlet_id } = req.body;
    const subtotal = (items || []).reduce((s: number, i: any) => s + (i.quantity * i.rate), 0);
    const gst = parseFloat((subtotal * 0.05).toFixed(2));
    const grand_total = subtotal + gst;
    const kotResult = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, table_id, table_number, order_type, covers, status, subtotal, gst_amount, grand_total, cashier_name, terminal_id, outlet_id)
      VALUES (${tid(req)}, ${table_id}, ${table_number}, ${order_type ?? 'dine_in'}, ${covers ?? 1}, 'open', ${subtotal}, ${gst}, ${grand_total}, ${cashier_name}, ${terminal_id}, ${outlet_id})
      RETURNING *`);
    const kot = kotResult.rows[0] as any;
    for (const item of (items || [])) {
      await db.execute(sql`
        INSERT INTO kot_items (kot_id, menu_item_id, quantity, rate, amount, special_instructions, course, kitchen_status)
        VALUES (${kot.id}, ${item.menu_item_id}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate}, ${item.special_instructions}, ${item.course ?? 'main'}, 'pending')`);
    }
    if (table_id) {
      await db.execute(sql`UPDATE restaurant_tables SET status='occupied', current_kot_id=${kot.id}, occupied_since=NOW() WHERE id=${table_id} AND tenant_id=${tid(req)}`);
    }
    res.json(kot);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/kot-orders/:id", requireAuth, async (req, res) => {
  try {
    const { status, covers, cashier_name } = req.body;
    const result = await db.execute(sql`
      UPDATE kot_orders SET status=${status}, covers=${covers}, cashier_name=${cashier_name}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── KITCHEN DISPLAYS ─────────────────────────────────────────────────────────
router.get("/kitchen-displays", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM kitchen_displays WHERE tenant_id=${tid(req)} ORDER BY id`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kitchen-displays", requireAuth, async (req, res) => {
  try {
    const { name, display_type, outlet_id, categories, is_active } = req.body;
    const result = await db.execute(sql`
      INSERT INTO kitchen_displays (tenant_id, name, display_type, outlet_id, categories, is_active)
      VALUES (${tid(req)}, ${name}, ${display_type}, ${outlet_id}, ${JSON.stringify(categories || [])}, ${is_active ?? true})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/kitchen-displays/:id", requireAuth, async (req, res) => {
  try {
    const { name, display_type, outlet_id, categories, is_active } = req.body;
    const result = await db.execute(sql`
      UPDATE kitchen_displays SET name=${name}, display_type=${display_type}, outlet_id=${outlet_id},
        categories=${JSON.stringify(categories || [])}, is_active=${is_active}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/kitchen-displays/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM kitchen_displays WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── DELIVERY ORDERS ─────────────────────────────────────────────────────────
router.get("/delivery-orders", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM delivery_orders WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/delivery-orders", requireAuth, async (req, res) => {
  try {
    const { customer_name, phone, address, items, delivery_charge, status } = req.body;
    const result = await db.execute(sql`
      INSERT INTO delivery_orders (tenant_id, customer_name, phone, address, items, delivery_charge, status)
      VALUES (${tid(req)}, ${customer_name}, ${phone}, ${address}, ${JSON.stringify(items || [])}, ${delivery_charge ?? 0}, ${status ?? 'pending'})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/delivery-orders/:id", requireAuth, async (req, res) => {
  try {
    const { status, delivery_person, delivered_at } = req.body;
    const result = await db.execute(sql`
      UPDATE delivery_orders SET status=${status}, delivery_person=${delivery_person}, delivered_at=${delivered_at}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/delivery-orders/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM delivery_orders WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_sessions WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const { table_id, covers, cashier_name } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_sessions (tenant_id, table_id, covers, cashier_name, status)
      VALUES (${tid(req)}, ${table_id}, ${covers}, ${cashier_name}, 'open')
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/:id/close", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      UPDATE restaurant_sessions SET status='closed', closed_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── RECIPES ─────────────────────────────────────────────────────────────────
router.get("/recipes", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT r.*, mi.name as item_name FROM restaurant_recipes r
      LEFT JOIN menu_items mi ON r.menu_item_id = mi.id
      WHERE r.tenant_id=${tid(req)} ORDER BY mi.name`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/recipes", requireAuth, async (req, res) => {
  try {
    const { menu_item_id, ingredients, instructions, prep_time_mins, yield_qty } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_recipes (tenant_id, menu_item_id, ingredients, instructions, prep_time_mins, yield_qty)
      VALUES (${tid(req)}, ${menu_item_id}, ${JSON.stringify(ingredients || [])}, ${instructions}, ${prep_time_mins}, ${yield_qty ?? 1})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/recipes/:id", requireAuth, async (req, res) => {
  try {
    const { ingredients, instructions, prep_time_mins, yield_qty } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_recipes SET ingredients=${JSON.stringify(ingredients || [])}, instructions=${instructions},
        prep_time_mins=${prep_time_mins}, yield_qty=${yield_qty}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/recipes/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_recipes WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── KOT CORE (new routes) ───────────────────────────────────────────────────
router.get("/kot/orders/active", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT ko.*, rt.table_number FROM kot_orders ko
      LEFT JOIN restaurant_tables rt ON ko.table_id = rt.id
      WHERE ko.tenant_id=${tid(req)} AND ko.status IN ('pending','open','cooking')
      ORDER BY ko.created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/kot/orders/kitchen", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT ki.*, mi.name as item_name, ko.table_number, ko.order_type FROM kot_items ki
      JOIN kot_orders ko ON ki.kot_id = ko.id
      LEFT JOIN menu_items mi ON ki.menu_item_id = mi.id
      WHERE ko.tenant_id=${tid(req)} AND ki.kitchen_status IN ('pending','cooking') AND ki.is_void != 1
      ORDER BY ki.id ASC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/kot/orders", requireAuth, async (req, res) => {
  try {
    const { status, outlet_id, date } = req.query;
    let filters = sql`WHERE ko.tenant_id=${tid(req)}`;
    if (status) filters = sql`${filters} AND ko.status=${status}`;
    if (outlet_id) filters = sql`${filters} AND ko.outlet_id=${outlet_id}`;
    if (date) filters = sql`${filters} AND DATE(ko.created_at)=${date}`;
    const result = await db.execute(sql`
      SELECT ko.*, rt.table_number FROM kot_orders ko
      LEFT JOIN restaurant_tables rt ON ko.table_id = rt.id
      ${filters} ORDER BY ko.created_at DESC LIMIT 200`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot/orders", requireAuth, async (req, res) => {
  try {
    const { table_id, table_number, order_type, covers, items, cashier_name, terminal_id, outlet_id, service_charge } = req.body;
    const subtotal = (items || []).reduce((s: number, i: any) => s + (i.quantity * i.rate), 0);
    const gst = parseFloat((subtotal * 0.05).toFixed(2));
    const sc = service_charge ?? 0;
    const grand_total = parseFloat((subtotal + gst + sc).toFixed(2));
    const kotResult = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, table_id, table_number, order_type, covers, status, subtotal, gst_amount, service_charge, grand_total, cashier_name, terminal_id, outlet_id)
      VALUES (${tid(req)}, ${table_id}, ${table_number}, ${order_type ?? 'dine_in'}, ${covers ?? 1}, 'open', ${subtotal}, ${gst}, ${sc}, ${grand_total}, ${cashier_name}, ${terminal_id}, ${outlet_id})
      RETURNING *`);
    const kot = kotResult.rows[0] as any;
    for (const item of (items || [])) {
      await db.execute(sql`
        INSERT INTO kot_items (kot_id, menu_item_id, quantity, rate, amount, special_instructions, course, kitchen_status)
        VALUES (${kot.id}, ${item.menu_item_id}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate}, ${item.special_instructions ?? null}, ${item.course ?? 'main'}, 'pending')`);
    }
    if (table_id) {
      await db.execute(sql`UPDATE restaurant_tables SET status='occupied', current_kot_id=${kot.id}, occupied_since=NOW() WHERE id=${table_id} AND tenant_id=${tid(req)}`);
    }
    res.json(kot);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/kot/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderResult = await db.execute(sql`SELECT * FROM kot_orders WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const itemsResult = await db.execute(sql`
      SELECT ki.*, mi.name as item_name, mi.category_id FROM kot_items ki
      LEFT JOIN menu_items mi ON ki.menu_item_id = mi.id
      WHERE ki.kot_id=${req.params.id} AND ki.is_void != 1`);
    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/kot/orders/:id", requireAuth, async (req, res) => {
  try {
    const { status, covers, cashier_name, service_charge } = req.body;
    const result = await db.execute(sql`
      UPDATE kot_orders SET status=${status}, covers=${covers}, cashier_name=${cashier_name}, service_charge=${service_charge}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot/orders/:id/items", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    const inserted = [];
    for (const item of (items || [])) {
      const r = await db.execute(sql`
        INSERT INTO kot_items (kot_id, menu_item_id, quantity, rate, amount, special_instructions, course, kitchen_status)
        VALUES (${req.params.id}, ${item.menu_item_id}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate}, ${item.special_instructions ?? null}, ${item.course ?? 'main'}, 'pending')
        RETURNING *`);
      inserted.push(r.rows[0]);
    }
    // Recalculate totals
    const totals = await db.execute(sql`SELECT SUM(amount) as subtotal FROM kot_items WHERE kot_id=${req.params.id} AND is_void != 1`);
    const subtotal = parseFloat((totals.rows[0] as any).subtotal || 0);
    const gst = parseFloat((subtotal * 0.05).toFixed(2));
    await db.execute(sql`UPDATE kot_orders SET subtotal=${subtotal}, gst_amount=${gst}, grand_total=${subtotal + gst} WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json(inserted);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/kot/orders/:id/items/:itemId", requireAuth, async (req, res) => {
  try {
    const { void_reason } = req.body || {};
    await db.execute(sql`UPDATE kot_items SET is_void=1, void_reason=${void_reason ?? null} WHERE id=${req.params.itemId} AND kot_id=${req.params.id}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/kot/orders/:id/items/:itemId/status", requireAuth, async (req, res) => {
  try {
    const { kitchen_status } = req.body;
    let extra = sql``;
    if (kitchen_status === 'cooking') extra = sql`, fired_at=NOW()`;
    else if (kitchen_status === 'ready') extra = sql`, ready_at=NOW()`;
    else if (kitchen_status === 'served') extra = sql`, served_at=NOW()`;
    const result = await db.execute(sql`
      UPDATE kot_items SET kitchen_status=${kitchen_status}${extra}
      WHERE id=${req.params.itemId} AND kot_id=${req.params.id} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot/orders/:id/bill", requireAuth, async (req, res) => {
  try {
    const orderResult = await db.execute(sql`SELECT * FROM kot_orders WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const itemsResult = await db.execute(sql`
      SELECT ki.*, mi.name as item_name FROM kot_items ki
      LEFT JOIN menu_items mi ON ki.menu_item_id = mi.id
      WHERE ki.kot_id=${req.params.id} AND ki.is_void != 1`);
    const order = orderResult.rows[0] as any;
    res.json({
      kot_id: order.id,
      table_number: order.table_number,
      items: itemsResult.rows,
      subtotal: order.subtotal,
      gst: order.gst_amount,
      service_charge: order.service_charge ?? 0,
      grand_total: order.grand_total,
      cashier_name: order.cashier_name,
      created_at: order.created_at
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot/orders/:id/payment", requireAuth, async (req, res) => {
  try {
    const { payment_mode, amount } = req.body;
    const result = await db.execute(sql`
      UPDATE kot_orders SET status='paid', payment_mode=${payment_mode}, amount_paid=${amount}, paid_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    const order = result.rows[0] as any;
    if (order?.table_id) {
      await db.execute(sql`UPDATE restaurant_tables SET status='available', current_kot_id=null, occupied_since=null WHERE id=${order.table_id} AND tenant_id=${tid(req)}`);
    }
    res.json(order);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/kot/orders/:id/complimentary", requireAuth, async (req, res) => {
  try {
    const { reason, approved_by } = req.body;
    const result = await db.execute(sql`
      UPDATE kot_orders SET is_complimentary=1, nc_reason=${reason}, approved_by=${approved_by}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SHIFTS ───────────────────────────────────────────────────────────────────
router.get("/shifts", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_shifts WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/shifts/active", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_shifts WHERE tenant_id=${tid(req)} AND status='open' ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/shifts/open", requireAuth, async (req, res) => {
  try {
    const { cashier_name, terminal_id, opening_cash, outlet_id, shift_name } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_shifts (tenant_id, cashier_name, terminal_id, opening_cash, outlet_id, shift_name, status, opened_at)
      VALUES (${tid(req)}, ${cashier_name}, ${terminal_id}, ${opening_cash ?? 0}, ${outlet_id}, ${shift_name}, 'open', NOW())
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/shifts/:id/close", requireAuth, async (req, res) => {
  try {
    const { closing_cash } = req.body;
    const shiftResult = await db.execute(sql`SELECT opening_cash FROM restaurant_shifts WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const opening_cash = parseFloat((shiftResult.rows[0] as any)?.opening_cash || 0);
    const variance = closing_cash - opening_cash;
    const result = await db.execute(sql`
      UPDATE restaurant_shifts SET status='closed', closing_cash=${closing_cash}, variance=${variance}, closed_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/shifts/:id/summary", requireAuth, async (req, res) => {
  try {
    const shiftResult = await db.execute(sql`SELECT * FROM restaurant_shifts WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const salesResult = await db.execute(sql`
      SELECT COUNT(*) as order_count, SUM(grand_total) as total_sales, SUM(gst_amount) as total_gst
      FROM kot_orders WHERE tenant_id=${tid(req)} AND shift_id=${req.params.id} AND status='paid'`);
    res.json({ shift: shiftResult.rows[0], sales: salesResult.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────
router.get("/reservations", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_reservations WHERE tenant_id=${tid(req)} ORDER BY reservation_date, reservation_time`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reservations/today", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_reservations WHERE tenant_id=${tid(req)} AND reservation_date=CURRENT_DATE ORDER BY reservation_time`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations", requireAuth, async (req, res) => {
  try {
    const { customer_name, phone, covers, reservation_date, reservation_time, notes, outlet_id } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_reservations (tenant_id, customer_name, phone, covers, reservation_date, reservation_time, notes, outlet_id, status)
      VALUES (${tid(req)}, ${customer_name}, ${phone}, ${covers}, ${reservation_date}, ${reservation_time}, ${notes}, ${outlet_id}, 'confirmed')
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/reservations/:id", requireAuth, async (req, res) => {
  try {
    const { customer_name, phone, covers, reservation_date, reservation_time, notes, status } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_reservations SET customer_name=${customer_name}, phone=${phone}, covers=${covers},
        reservation_date=${reservation_date}, reservation_time=${reservation_time}, notes=${notes}, status=${status}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/reservations/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM restaurant_reservations WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/seat", requireAuth, async (req, res) => {
  try {
    const { table_id, table_number } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_reservations SET status='seated', table_id=${table_id}, table_number=${table_number}, seated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── CUSTOMERS & LOYALTY ─────────────────────────────────────────────────────
router.get("/customers", requireAuth, async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : null;
    let result;
    if (search) {
      result = await db.execute(sql`
        SELECT * FROM restaurant_customers WHERE tenant_id=${tid(req)}
        AND (name ILIKE ${search} OR phone ILIKE ${search} OR email ILIKE ${search})
        ORDER BY name LIMIT 50`);
    } else {
      result = await db.execute(sql`SELECT * FROM restaurant_customers WHERE tenant_id=${tid(req)} ORDER BY name LIMIT 100`);
    }
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/customers/lookup/:phone", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM restaurant_customers WHERE tenant_id=${tid(req)} AND phone=${req.params.phone} LIMIT 1`);
    res.json(result.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/customers/:id/history", requireAuth, async (req, res) => {
  try {
    const orders = await db.execute(sql`
      SELECT * FROM kot_orders WHERE tenant_id=${tid(req)} AND customer_id=${req.params.id} ORDER BY created_at DESC LIMIT 50`);
    const loyalty = await db.execute(sql`
      SELECT * FROM loyalty_transactions WHERE tenant_id=${tid(req)} AND customer_id=${req.params.id} ORDER BY created_at DESC LIMIT 50`);
    res.json({ orders: orders.rows, loyalty: loyalty.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/customers", requireAuth, async (req, res) => {
  try {
    const { name, phone, email, dob, anniversary, address } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_customers (tenant_id, name, phone, email, dob, anniversary, address, loyalty_points)
      VALUES (${tid(req)}, ${name}, ${phone}, ${email}, ${dob}, ${anniversary}, ${address}, 0)
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/customers/:id", requireAuth, async (req, res) => {
  try {
    const { name, phone, email, dob, anniversary, address } = req.body;
    const result = await db.execute(sql`
      UPDATE restaurant_customers SET name=${name}, phone=${phone}, email=${email},
        dob=${dob}, anniversary=${anniversary}, address=${address}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loyalty/config", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM loyalty_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    res.json(result.rows[0] || { points_per_100: 1, redemption_value: 1 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/loyalty/config", requireAuth, async (req, res) => {
  try {
    const { points_per_100, redemption_value, min_redemption, expiry_days } = req.body;
    const existing = await db.execute(sql`SELECT id FROM loyalty_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    let result;
    if (existing.rows.length > 0) {
      result = await db.execute(sql`
        UPDATE loyalty_config SET points_per_100=${points_per_100}, redemption_value=${redemption_value},
          min_redemption=${min_redemption}, expiry_days=${expiry_days}
        WHERE tenant_id=${tid(req)} RETURNING *`);
    } else {
      result = await db.execute(sql`
        INSERT INTO loyalty_config (tenant_id, points_per_100, redemption_value, min_redemption, expiry_days)
        VALUES (${tid(req)}, ${points_per_100}, ${redemption_value}, ${min_redemption}, ${expiry_days})
        RETURNING *`);
    }
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty/earn", requireAuth, async (req, res) => {
  try {
    const { customer_id, kot_id, bill_amount } = req.body;
    const configResult = await db.execute(sql`SELECT points_per_100 FROM loyalty_config WHERE tenant_id=${tid(req)} LIMIT 1`);
    const ppH = parseFloat((configResult.rows[0] as any)?.points_per_100 || 1);
    const points = Math.floor(bill_amount / 100) * ppH;
    await db.execute(sql`
      INSERT INTO loyalty_transactions (tenant_id, customer_id, kot_id, type, points, bill_amount)
      VALUES (${tid(req)}, ${customer_id}, ${kot_id}, 'earn', ${points}, ${bill_amount})`);
    const updated = await db.execute(sql`
      UPDATE restaurant_customers SET loyalty_points = loyalty_points + ${points}
      WHERE id=${customer_id} AND tenant_id=${tid(req)} RETURNING loyalty_points`);
    res.json({ points_earned: points, total_points: (updated.rows[0] as any)?.loyalty_points });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loyalty/redeem", requireAuth, async (req, res) => {
  try {
    const { customer_id, points, kot_id } = req.body;
    const customerResult = await db.execute(sql`SELECT loyalty_points FROM restaurant_customers WHERE id=${customer_id} AND tenant_id=${tid(req)}`);
    const available = parseFloat((customerResult.rows[0] as any)?.loyalty_points || 0);
    if (available < points) return res.status(400).json({ error: "Insufficient loyalty points" });
    await db.execute(sql`
      INSERT INTO loyalty_transactions (tenant_id, customer_id, kot_id, type, points)
      VALUES (${tid(req)}, ${customer_id}, ${kot_id}, 'redeem', ${-points})`);
    const updated = await db.execute(sql`
      UPDATE restaurant_customers SET loyalty_points = loyalty_points - ${points}
      WHERE id=${customer_id} AND tenant_id=${tid(req)} RETURNING loyalty_points`);
    res.json({ points_redeemed: points, remaining_points: (updated.rows[0] as any)?.loyalty_points });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── STOCK & WASTAGE ─────────────────────────────────────────────────────────
router.post("/stock/deduct", requireAuth, async (req, res) => {
  try {
    const { kot_id, items } = req.body;
    for (const item of (items || [])) {
      await db.execute(sql`
        INSERT INTO restaurant_stock_deductions (tenant_id, kot_id, ingredient_id, quantity, deducted_at)
        VALUES (${tid(req)}, ${kot_id}, ${item.ingredient_id}, ${item.quantity}, NOW())`);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/wastage", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM food_wastage WHERE tenant_id=${tid(req)} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/wastage", requireAuth, async (req, res) => {
  try {
    const { item_name, quantity, unit, reason, cost, recorded_by } = req.body;
    const result = await db.execute(sql`
      INSERT INTO food_wastage (tenant_id, item_name, quantity, unit, reason, cost, recorded_by)
      VALUES (${tid(req)}, ${item_name}, ${quantity}, ${unit}, ${reason}, ${cost ?? 0}, ${recorded_by})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/wastage/summary", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT reason, COUNT(*) as count, SUM(quantity) as total_qty, SUM(cost) as total_cost
      FROM food_wastage WHERE tenant_id=${tid(req)}
      GROUP BY reason ORDER BY total_cost DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── PRINTERS ─────────────────────────────────────────────────────────────────
router.get("/printers", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM printer_config WHERE tenant_id=${tid(req)} ORDER BY id`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/printers", requireAuth, async (req, res) => {
  try {
    const { name, printer_type, ip_address, port, is_default, outlet_id } = req.body;
    const result = await db.execute(sql`
      INSERT INTO printer_config (tenant_id, name, printer_type, ip_address, port, is_default, outlet_id)
      VALUES (${tid(req)}, ${name}, ${printer_type}, ${ip_address}, ${port ?? 9100}, ${is_default ?? false}, ${outlet_id})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/printers/:id", requireAuth, async (req, res) => {
  try {
    const { name, printer_type, ip_address, port, is_default, outlet_id } = req.body;
    const result = await db.execute(sql`
      UPDATE printer_config SET name=${name}, printer_type=${printer_type}, ip_address=${ip_address},
        port=${port}, is_default=${is_default}, outlet_id=${outlet_id}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/printers/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM printer_config WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/printers/:id/test", requireAuth, async (req, res) => {
  res.json({ success: true, message: "Test print sent" });
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
router.get("/reports/daily-summary", requireAuth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await db.execute(sql`
      SELECT
        COUNT(*) as order_count,
        SUM(subtotal) as subtotal,
        SUM(gst_amount) as gst,
        SUM(service_charge) as service_charge,
        SUM(grand_total) as grand_total,
        COUNT(CASE WHEN is_complimentary=1 THEN 1 END) as complimentary_count
      FROM kot_orders
      WHERE tenant_id=${tid(req)} AND DATE(created_at)=${date} AND status='paid'`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/hourly-sales", requireAuth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as orders, SUM(grand_total) as total
      FROM kot_orders
      WHERE tenant_id=${tid(req)} AND DATE(created_at)=${date} AND status='paid'
      GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY hour`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/item-wise", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT mi.name, mi.id as menu_item_id, SUM(ki.quantity) as qty, SUM(ki.amount) as total
      FROM kot_items ki
      JOIN kot_orders ko ON ki.kot_id = ko.id
      JOIN menu_items mi ON ki.menu_item_id = mi.id
      WHERE ko.tenant_id=${tid(req)} AND ko.status='paid' AND ki.is_void != 1
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
      GROUP BY mi.id, mi.name ORDER BY total DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/category-wise", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT mc.name as category, SUM(ki.quantity) as qty, SUM(ki.amount) as total
      FROM kot_items ki
      JOIN kot_orders ko ON ki.kot_id = ko.id
      JOIN menu_items mi ON ki.menu_item_id = mi.id
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE ko.tenant_id=${tid(req)} AND ko.status='paid' AND ki.is_void != 1
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
      GROUP BY mc.id, mc.name ORDER BY total DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/cashier-shift", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT cashier_name, COUNT(*) as orders, SUM(grand_total) as total
      FROM kot_orders
      WHERE tenant_id=${tid(req)} AND status='paid'
        AND DATE(created_at) BETWEEN ${from} AND ${to}
      GROUP BY cashier_name ORDER BY total DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/void-discount", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT ki.*, mi.name as item_name, ko.table_number, ko.cashier_name, ko.created_at as order_date
      FROM kot_items ki
      JOIN kot_orders ko ON ki.kot_id = ko.id
      JOIN menu_items mi ON ki.menu_item_id = mi.id
      WHERE ko.tenant_id=${tid(req)} AND ki.is_void = 1
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
      ORDER BY ko.created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/complimentary", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT * FROM kot_orders
      WHERE tenant_id=${tid(req)} AND is_complimentary=1
        AND DATE(created_at) BETWEEN ${from} AND ${to}
      ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/gst-summary", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT gst_pct, SUM(ko.subtotal) as taxable_amount, SUM(ko.gst_amount) as gst_amount
      FROM kot_orders ko
      WHERE ko.tenant_id=${tid(req)} AND ko.status='paid'
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
      GROUP BY gst_pct`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/payment-modes", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT payment_mode, COUNT(*) as orders, SUM(grand_total) as total
      FROM kot_orders
      WHERE tenant_id=${tid(req)} AND status='paid'
        AND DATE(created_at) BETWEEN ${from} AND ${to}
      GROUP BY payment_mode ORDER BY total DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/wastage-summary", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT reason, COUNT(*) as count, SUM(quantity) as total_qty, SUM(cost) as total_cost
      FROM food_wastage
      WHERE tenant_id=${tid(req)} AND DATE(created_at) BETWEEN ${from} AND ${to}
      GROUP BY reason ORDER BY total_cost DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/loyalty-summary", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await db.execute(sql`
      SELECT type, COUNT(*) as transactions, SUM(ABS(points)) as total_points
      FROM loyalty_transactions
      WHERE tenant_id=${tid(req)} AND DATE(created_at) BETWEEN ${from} AND ${to}
      GROUP BY type`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [tables, todaySales, activeKots, reservations, openShifts] = await Promise.all([
      db.execute(sql`SELECT status, COUNT(*) as count FROM restaurant_tables WHERE tenant_id=${tid(req)} GROUP BY status`),
      db.execute(sql`SELECT COUNT(*) as orders, COALESCE(SUM(grand_total),0) as revenue FROM kot_orders WHERE tenant_id=${tid(req)} AND status='paid' AND DATE(created_at)=${today}`),
      db.execute(sql`SELECT COUNT(*) as count FROM kot_orders WHERE tenant_id=${tid(req)} AND status IN ('pending','open','cooking')`),
      db.execute(sql`SELECT COUNT(*) as count FROM restaurant_reservations WHERE tenant_id=${tid(req)} AND reservation_date=CURRENT_DATE AND status='confirmed'`),
      db.execute(sql`SELECT COUNT(*) as count FROM restaurant_shifts WHERE tenant_id=${tid(req)} AND status='open'`)
    ]);
    res.json({
      tables: tables.rows,
      today_sales: todaySales.rows[0],
      active_kots: (activeKots.rows[0] as any)?.count,
      today_reservations: (reservations.rows[0] as any)?.count,
      open_shifts: (openShifts.rows[0] as any)?.count
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ─── QR ORDERING (PUBLIC) ─────────────────────────────────────────────────────
router.post("/qr-session/create", requireAuth, async (req: any, res) => {
  try {
    const { table_id } = req.body;
    const table = await db.execute(sql`SELECT * FROM restaurant_tables WHERE id=${table_id} AND tenant_id=${tid(req)}`);
    if (!table.rows[0]) return res.status(404).json({ error: 'Table not found' });
    const token = require('crypto').randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await db.execute(sql`
      INSERT INTO qr_order_sessions (tenant_id, table_id, table_number, session_token, expires_at)
      VALUES (${tid(req)}, ${table_id}, ${(table.rows[0] as any).table_number}, ${token}, ${expires.toISOString()})
      ON CONFLICT (session_token) DO NOTHING`);
    res.json({ session_token: token, table_number: (table.rows[0] as any).table_number, expires_at: expires });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUBLIC: no auth required — for customer QR scan
router.get("/qr/menu/:token", async (req: any, res) => {
  try {
    const session = await db.execute(sql`SELECT * FROM qr_order_sessions WHERE session_token=${req.params.token} AND status='active' AND expires_at > NOW()`);
    if (!session.rows[0]) return res.status(404).json({ error: 'Invalid or expired QR session' });
    const s = session.rows[0] as any;
    const [categories, items] = await Promise.all([
      db.execute(sql`SELECT * FROM restaurant_menu_categories WHERE tenant_id=${s.tenant_id} AND is_active=1 ORDER BY sort_order`),
      db.execute(sql`SELECT mi.*, mc.name as category_name FROM restaurant_menu_items mi LEFT JOIN restaurant_menu_categories mc ON mc.id=mi.category_id WHERE mi.tenant_id=${s.tenant_id} AND mi.is_available=true ORDER BY mc.sort_order, mi.display_order`)
    ]);
    res.json({ table_number: s.table_number, categories: categories.rows, items: items.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/qr/order/:token", async (req: any, res) => {
  try {
    const session = await db.execute(sql`SELECT * FROM qr_order_sessions WHERE session_token=${req.params.token} AND status='active' AND expires_at > NOW()`);
    if (!session.rows[0]) return res.status(404).json({ error: 'Invalid or expired QR session' });
    const s = session.rows[0] as any;
    const { items, customer_name, customer_phone } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No items provided' });
    // Update session with customer info
    if (customer_name) await db.execute(sql`UPDATE qr_order_sessions SET customer_name=${customer_name}, customer_phone=${customer_phone||null} WHERE id=${s.id}`);
    // Create KOT
    const kotNo = 'QR-' + Date.now();
    const subtotal = items.reduce((sum: number, i: any) => sum + (Number(i.rate||0) * Number(i.quantity||1)), 0);
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const grand_total = subtotal + gst;
    const kot = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, kot_number, table_id, table_number, order_type, status, subtotal, gst_amount, grand_total, cashier_name, outlet_id)
      VALUES (${s.tenant_id}, ${kotNo}, ${s.table_id}, ${s.table_number}, 'qr_order', 'pending', ${subtotal}, ${gst}, ${grand_total}, 'QR Self-Order', null)
      RETURNING *`);
    const kotId = (kot.rows[0] as any).id;
    for (const item of items) {
      await db.execute(sql`INSERT INTO kot_items (kot_id, menu_item_id, quantity, rate, amount, special_instructions, course) VALUES (${kotId}, ${item.menu_item_id}, ${item.quantity||1}, ${item.rate||0}, ${(item.rate||0)*(item.quantity||1)}, ${item.special_instructions||null}, ${item.course||'main'})`);
    }
    await db.execute(sql`UPDATE restaurant_tables SET status='occupied', current_kot_id=${kotId}, occupied_since=NOW() WHERE id=${s.table_id}`);
    res.json({ kot_id: kotId, kot_number: kotNo, subtotal, gst, grand_total });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MISSING REPORTS ─────────────────────────────────────────────────────────
router.get("/reports/food-cost", requireAuth, async (req: any, res) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0,10);
    const to = req.query.to || new Date().toISOString().slice(0,10);
    const result = await db.execute(sql`
      SELECT mi.name as item_name, mc.name as category,
        COALESCE(SUM(ki.quantity),0) as qty_sold,
        COALESCE(SUM(ki.amount),0) as revenue,
        COALESCE(AVG(mi.cost_price),0) as avg_cost_price,
        COALESCE(SUM(ki.quantity * mi.cost_price),0) as total_food_cost,
        CASE WHEN SUM(ki.amount)>0 THEN ROUND((1 - SUM(ki.quantity*mi.cost_price)/SUM(ki.amount))*100,1) ELSE 0 END as margin_pct
      FROM kot_items ki
      JOIN kot_orders ko ON ko.id=ki.kot_id
      JOIN restaurant_menu_items mi ON mi.id=ki.menu_item_id
      LEFT JOIN restaurant_menu_categories mc ON mc.id=mi.category_id
      WHERE ko.tenant_id=${tid(req)} AND ko.status='paid'
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
        AND ki.is_void=0
      GROUP BY mi.id, mi.name, mi.cost_price, mc.name
      ORDER BY total_food_cost DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/table-analytics", requireAuth, async (req: any, res) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0,10);
    const to = req.query.to || new Date().toISOString().slice(0,10);
    const result = await db.execute(sql`
      SELECT ko.table_number,
        COUNT(ko.id) as total_orders,
        COALESCE(SUM(ko.covers),0) as total_covers,
        COALESCE(SUM(ko.grand_total),0) as total_revenue,
        COALESCE(AVG(ko.grand_total),0) as avg_bill,
        COALESCE(AVG(EXTRACT(EPOCH FROM (ko.updated_at - ko.created_at))/60),0) as avg_turnaround_mins
      FROM kot_orders ko
      WHERE ko.tenant_id=${tid(req)} AND ko.status='paid'
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
        AND ko.table_number IS NOT NULL
      GROUP BY ko.table_number
      ORDER BY total_revenue DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/outlet-comparison", requireAuth, async (req: any, res) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0,10);
    const to = req.query.to || new Date().toISOString().slice(0,10);
    const result = await db.execute(sql`
      SELECT COALESCE(ro.outlet_name, 'Main Outlet') as outlet_name,
        COUNT(ko.id) as total_orders,
        COALESCE(SUM(ko.covers),0) as total_covers,
        COALESCE(SUM(ko.grand_total),0) as total_revenue,
        COALESCE(AVG(ko.grand_total),0) as avg_bill,
        COALESCE(SUM(ko.gst_amount),0) as total_gst
      FROM kot_orders ko
      LEFT JOIN restaurant_outlets ro ON ro.id=ko.outlet_id
      WHERE ko.tenant_id=${tid(req)} AND ko.status='paid'
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
      GROUP BY ko.outlet_id, ro.outlet_name
      ORDER BY total_revenue DESC`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── ITEM VARIATIONS ──────────────────────────────────────────────────────────
router.get("/menu-items/:id/variations", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT * FROM menu_item_variations
      WHERE menu_item_id = ${req.params.id} AND tenant_id = ${t}
      ORDER BY sort_order`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.post("/menu-items/:id/variations", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { variation_name, price_modifier, sku, is_available = true, sort_order = 0 } = req.body;
    await db.execute(sql`
      INSERT INTO menu_item_variations (tenant_id, menu_item_id, variation_name, price_modifier, sku, is_available, sort_order, created_at)
      VALUES (${t}, ${req.params.id}, ${variation_name}, ${price_modifier || 0}, ${sku || null}, ${is_available}, ${sort_order}, NOW())`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/menu-item-variations/:id", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { variation_name, price_modifier, sku, is_available, sort_order } = req.body;
    await db.execute(sql`
      UPDATE menu_item_variations SET
        variation_name = COALESCE(${variation_name}, variation_name),
        price_modifier = COALESCE(${price_modifier}, price_modifier),
        sku = COALESCE(${sku}, sku),
        is_available = COALESCE(${is_available}, is_available),
        sort_order = COALESCE(${sort_order}, sort_order)
      WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/menu-item-variations/:id", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    await db.execute(sql`DELETE FROM menu_item_variations WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── MULTI-OUTLET MENU SYNC ────────────────────────────────────────────────────
router.post("/menu/sync-to-outlets", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { item_ids, outlet_ids } = req.body;
    if (!Array.isArray(item_ids) || !Array.isArray(outlet_ids)) {
      return res.status(400).json({ error: "item_ids and outlet_ids must be arrays" });
    }
    // Record sync entries
    for (const item_id of item_ids) {
      for (const outlet_id of outlet_ids) {
        await db.execute(sql`
          INSERT INTO menu_outlet_sync (tenant_id, menu_item_id, outlet_id, synced_at)
          VALUES (${t}, ${item_id}, ${outlet_id}, NOW())
          ON CONFLICT (tenant_id, menu_item_id, outlet_id) DO UPDATE SET synced_at = NOW()`);
      }
    }
    res.json({ success: true, synced: item_ids.length * outlet_ids.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CENTRAL KITCHEN ───────────────────────────────────────────────────────────
router.get("/central-kitchen/dispatches", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT * FROM central_kitchen_dispatches
      WHERE tenant_id = ${t}
      ORDER BY created_at DESC LIMIT 100`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.post("/central-kitchen/dispatches", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { dispatch_number, from_outlet_id, to_outlet_id, items, notes, dispatch_date } = req.body;
    const num = dispatch_number || `CK-${Date.now()}`;
    const result = await db.execute(sql`
      INSERT INTO central_kitchen_dispatches (tenant_id, dispatch_number, from_outlet_id, to_outlet_id, items_json, notes, dispatch_date, status, created_at)
      VALUES (${t}, ${num}, ${from_outlet_id || null}, ${to_outlet_id || null}, ${JSON.stringify(items || [])}, ${notes || null}, ${dispatch_date || new Date().toISOString().split('T')[0]}, 'dispatched', NOW())
      RETURNING id`);
    res.json({ success: true, id: result.rows[0]?.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/central-kitchen/dispatches/:id/receive", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { received_by, received_notes, received_items } = req.body;
    await db.execute(sql`
      UPDATE central_kitchen_dispatches SET
        status = 'received',
        received_at = NOW(),
        received_by = ${received_by || null},
        received_notes = ${received_notes || null},
        received_items_json = ${JSON.stringify(received_items || [])}
      WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CUSTOMER FEEDBACK (PUBLIC) ────────────────────────────────────────────────
router.post("/feedback", async (req: any, res: any) => {
  try {
    const { tenant_id = 1, table_number, food_rating, service_rating, ambience_rating, overall_rating, comment, customer_name, customer_phone, kot_order_id } = req.body;
    await db.execute(sql`
      INSERT INTO restaurant_feedback (tenant_id, table_number, food_rating, service_rating, ambience_rating, overall_rating, comment, customer_name, customer_phone, kot_order_id, created_at)
      VALUES (${tenant_id}, ${table_number || null}, ${food_rating || null}, ${service_rating || null}, ${ambience_rating || null}, ${overall_rating || null}, ${comment || null}, ${customer_name || null}, ${customer_phone || null}, ${kot_order_id || null}, NOW())`);
    res.json({ success: true, message: "Thank you for your feedback!" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/feedback", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT * FROM restaurant_feedback WHERE tenant_id = ${t}
      ORDER BY created_at DESC LIMIT 200`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/feedback/summary", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) as total_reviews,
        ROUND(AVG(food_rating),1) as avg_food,
        ROUND(AVG(service_rating),1) as avg_service,
        ROUND(AVG(ambience_rating),1) as avg_ambience,
        ROUND(AVG(overall_rating),1) as avg_overall,
        COUNT(CASE WHEN overall_rating >= 4 THEN 1 END) as positive_count,
        COUNT(CASE WHEN overall_rating <= 2 THEN 1 END) as negative_count
      FROM restaurant_feedback WHERE tenant_id = ${t}`);
    res.json(rows.rows[0] || {});
  } catch { res.json({}); }
});

// ── WHATSAPP ORDERS ───────────────────────────────────────────────────────────
router.post("/whatsapp/receive", async (req: any, res: any) => {
  // Webhook — store raw payload, no auth required
  try {
    const { from, message, tenant_id = 1 } = req.body;
    await db.execute(sql`
      INSERT INTO whatsapp_order_messages (tenant_id, from_number, raw_message, status, received_at)
      VALUES (${tenant_id}, ${from || 'unknown'}, ${JSON.stringify(req.body)}, 'received', NOW())`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/whatsapp/orders", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT * FROM whatsapp_order_messages WHERE tenant_id = ${t}
      ORDER BY received_at DESC LIMIT 100`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.post("/whatsapp/orders/:id/confirm", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { items, customer_name, delivery_address, total_amount } = req.body;
    await db.execute(sql`
      UPDATE whatsapp_order_messages SET
        status = 'confirmed',
        confirmed_at = NOW(),
        order_details = ${JSON.stringify({ items, customer_name, delivery_address, total_amount })}
      WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CREDIT BILLING ────────────────────────────────────────────────────────────
router.post("/kot/orders/:id/credit-bill", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { customer_id, customer_name, credit_account, due_date, notes } = req.body;
    // Get order total
    const order = await db.execute(sql`SELECT * FROM kot_orders WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    if (!order.rows.length) return res.status(404).json({ error: "Order not found" });
    await db.execute(sql`
      UPDATE kot_orders SET
        payment_status = 'credit',
        payment_mode = 'credit',
        credit_customer_id = ${customer_id || null},
        credit_customer_name = ${customer_name || null},
        credit_account = ${credit_account || null},
        credit_due_date = ${due_date || null},
        credit_notes = ${notes || null},
        paid_at = NOW()
      WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    // Close the table
    const o = order.rows[0] as any;
    if (o.table_id) {
      await db.execute(sql`UPDATE restaurant_tables SET status = 'available', current_kot_id = NULL WHERE id = ${o.table_id} AND tenant_id = ${t}`);
    }
    res.json({ success: true, message: "Credit bill recorded" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── STOCK LOW-STOCK ALERTS ────────────────────────────────────────────────────
router.get("/stock/low-stock", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    // Aggregate deductions vs a simple reorder_level table (or recipes)
    const rows = await db.execute(sql`
      SELECT
        ingredient_name,
        SUM(quantity) as total_deducted,
        unit,
        MIN(created_at) as first_used,
        MAX(created_at) as last_used
      FROM restaurant_stock_deductions
      WHERE tenant_id = ${t}
      GROUP BY ingredient_name, unit
      ORDER BY total_deducted DESC`);
    // Return with mock reorder level of 5 units — real impl would join ingredient_reorder_levels table
    const withAlert = (rows.rows || []).map((r: any) => ({
      ...r,
      reorder_level: 5,
      is_low: Number(r.total_deducted) > 3, // simplistic: if used a lot recently flag it
      alert: Number(r.total_deducted) > 3 ? "Low Stock" : "OK"
    }));
    res.json(withAlert);
  } catch { res.json([]); }
});

// ── EOD EMAIL ─────────────────────────────────────────────────────────────────
router.post("/reports/send-eod-email", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { email, date } = req.body;
    const reportDate = date || new Date().toISOString().split('T')[0];
    // Compile daily summary
    const summary = await db.execute(sql`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN grand_total ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN gst_amount ELSE 0 END) as total_gst,
        AVG(CASE WHEN payment_status = 'paid' THEN grand_total END) as avg_bill,
        COUNT(CASE WHEN is_complimentary = true THEN 1 END) as complimentary_count
      FROM kot_orders
      WHERE tenant_id = ${t} AND DATE(created_at) = ${reportDate}`);
    // In production this would send an email via nodemailer/sendgrid
    // For now return the summary data
    const s = summary.rows[0] as any;
    res.json({
      success: true,
      message: `EOD summary for ${reportDate} ${email ? 'would be sent to ' + email : '(no email configured)'}`,
      summary: s
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SSE KITCHEN LIVE ORDERS ────────────────────────────────────────────────
router.get("/kitchen/live-orders", requireAuth, async (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const t = tid(req);
  const send = async () => {
    try {
      const orders = await db.execute(sql`
        SELECT ko.id, ko.kot_number, ko.table_number, ko.order_type,
          ko.status, ko.covers, ko.created_at, ko.outlet_id,
          json_agg(json_build_object(
            'id', ki.id,
            'item_name', ki.item_name,
            'quantity', ki.quantity,
            'kitchen_status', COALESCE(ki.kitchen_status,'pending'),
            'kitchen_station', COALESCE(ki.kitchen_station,'main'),
            'course', COALESCE(ki.course,'main'),
            'is_void', COALESCE(ki.is_void,0),
            'modifiers', COALESCE(ki.modifiers,'[]'::jsonb),
            'special_instructions', ki.special_instructions,
            'fired_at', ki.fired_at,
            'ready_at', ki.ready_at
          ) ORDER BY ki.created_at) as items
        FROM kot_orders ko
        LEFT JOIN kot_items ki ON ki.kot_id = ko.id
        WHERE ko.tenant_id = ${t}
          AND ko.status IN ('pending','in_progress','ready')
          AND ko.record_status = 1
        GROUP BY ko.id
        ORDER BY ko.created_at ASC
        LIMIT 50
      `);
      res.write(`data: ${JSON.stringify(orders.rows)}\n\n`);
    } catch(e) {
      res.write(`data: []\n\n`);
    }
  };

  await send();
  const interval = setInterval(send, 3000);
  req.on('close', () => { clearInterval(interval); res.end(); });
});

// ── GIFT CARDS ─────────────────────────────────────────────────────────────
router.get("/gift-cards", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM gift_cards WHERE tenant_id = ${t} ORDER BY created_at DESC LIMIT 100`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.post("/gift-cards/issue", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { amount, purchaser_name, purchaser_phone, expires_at } = req.body;
    const card_number = 'GC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
    await db.execute(sql`
      INSERT INTO gift_cards (tenant_id, card_number, original_amount, current_balance, purchaser_name, purchaser_phone, expires_at, status, issued_at)
      VALUES (${t}, ${card_number}, ${amount}, ${amount}, ${purchaser_name||null}, ${purchaser_phone||null}, ${expires_at||null}, 'active', NOW())`);
    await db.execute(sql`
      INSERT INTO gift_card_transactions (tenant_id, card_number, transaction_type, amount, balance_after, created_at)
      VALUES (${t}, ${card_number}, 'issue', ${amount}, ${amount}, NOW())`);
    res.json({ success: true, card_number });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/gift-cards/:number/balance", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM gift_cards WHERE tenant_id = ${t} AND card_number = ${req.params.number}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Card not found" });
    const card = rows.rows[0] as any;
    if (card.status !== 'active') return res.status(400).json({ error: "Card is " + card.status });
    if (card.expires_at && new Date(card.expires_at) < new Date()) return res.status(400).json({ error: "Card expired" });
    res.json(card);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/gift-cards/:number/redeem", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { amount, kot_order_id } = req.body;
    const rows = await db.execute(sql`SELECT * FROM gift_cards WHERE tenant_id = ${t} AND card_number = ${req.params.number} AND status = 'active'`);
    if (!rows.rows.length) return res.status(404).json({ error: "Card not found or inactive" });
    const card = rows.rows[0] as any;
    const redeemAmt = Math.min(Number(amount), Number(card.current_balance));
    const newBalance = Number(card.current_balance) - redeemAmt;
    await db.execute(sql`UPDATE gift_cards SET current_balance = ${newBalance}, status = ${newBalance <= 0 ? 'exhausted' : 'active'} WHERE tenant_id = ${t} AND card_number = ${req.params.number}`);
    await db.execute(sql`INSERT INTO gift_card_transactions (tenant_id, card_number, transaction_type, amount, kot_order_id, balance_after, created_at) VALUES (${t}, ${req.params.number}, 'redeem', ${redeemAmt}, ${kot_order_id||null}, ${newBalance}, NOW())`);
    res.json({ success: true, redeemed: redeemAmt, remaining_balance: newBalance });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/gift-cards/:number/transactions", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM gift_card_transactions WHERE tenant_id = ${t} AND card_number = ${req.params.number} ORDER BY created_at DESC`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

// ── FRANCHISE ──────────────────────────────────────────────────────────────
router.get("/franchise/summary", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const cfg = await db.execute(sql`SELECT royalty_pct FROM franchise_config WHERE tenant_id = ${t} LIMIT 1`);
    const royaltyPct = Number((cfg.rows[0] as any)?.royalty_pct || 5);
    const outlets = await db.execute(sql`
      SELECT o.id, o.outlet_name, o.outlet_code,
        COALESCE(SUM(CASE WHEN ko.payment_status='paid' AND DATE_TRUNC('month', ko.created_at) = DATE_TRUNC('month', NOW()) THEN ko.grand_total ELSE 0 END), 0) as revenue_mtd,
        COUNT(CASE WHEN ko.payment_status='paid' AND DATE_TRUNC('month', ko.created_at) = DATE_TRUNC('month', NOW()) THEN 1 END) as orders_mtd
      FROM restaurant_outlets o
      LEFT JOIN kot_orders ko ON ko.outlet_id = o.id AND ko.tenant_id = ${t}
      WHERE o.tenant_id = ${t}
      GROUP BY o.id, o.outlet_name, o.outlet_code
      ORDER BY revenue_mtd DESC`);
    const rows = (outlets.rows || []).map((r: any) => ({
      ...r,
      royalty_pct: royaltyPct,
      royalty_due: Number(r.revenue_mtd) * royaltyPct / 100
    }));
    res.json({ outlets: rows, royalty_pct: royaltyPct, total_revenue: rows.reduce((s: number, r: any) => s + Number(r.revenue_mtd), 0), total_royalty: rows.reduce((s: number, r: any) => s + r.royalty_due, 0) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/franchise/royalty-config", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM franchise_config WHERE tenant_id = ${t} LIMIT 1`);
    res.json(rows.rows[0] || { royalty_pct: 5 });
  } catch { res.json({ royalty_pct: 5 }); }
});

router.put("/franchise/royalty-config", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { royalty_pct } = req.body;
    await db.execute(sql`INSERT INTO franchise_config (tenant_id, royalty_pct, updated_at) VALUES (${t}, ${royalty_pct}, NOW()) ON CONFLICT DO NOTHING`);
    await db.execute(sql`UPDATE franchise_config SET royalty_pct = ${royalty_pct}, updated_at = NOW() WHERE tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── OUTLET CURRENCY & CLOUD KITCHEN SETTINGS ──────────────────────────────
router.put("/outlets/:id/currency", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { currency, currency_symbol, tax_type, tax_rate, tax_number, country, language } = req.body;
    await db.execute(sql`
      UPDATE restaurant_outlets SET
        currency = COALESCE(${currency}, currency),
        currency_symbol = COALESCE(${currency_symbol}, currency_symbol),
        tax_type = COALESCE(${tax_type}, tax_type),
        tax_rate = COALESCE(${tax_rate}, tax_rate),
        tax_number = COALESCE(${tax_number}, tax_number),
        country = COALESCE(${country}, country),
        language = COALESCE(${language}, language)
      WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/outlets/:id/cloud-kitchen-mode", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { is_cloud_kitchen } = req.body;
    await db.execute(sql`UPDATE restaurant_outlets SET is_cloud_kitchen = ${is_cloud_kitchen} WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── MENU TRANSLATIONS ──────────────────────────────────────────────────────
router.get("/menu-items/:id/translations", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM menu_item_translations WHERE tenant_id = ${t} AND menu_item_id = ${req.params.id}`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.put("/menu-items/:id/translate", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { language_code, translated_name, translated_description } = req.body;
    await db.execute(sql`
      INSERT INTO menu_item_translations (tenant_id, menu_item_id, language_code, translated_name, translated_description, created_at)
      VALUES (${t}, ${req.params.id}, ${language_code}, ${translated_name}, ${translated_description||null}, NOW())
      ON CONFLICT (tenant_id, menu_item_id, language_code)
      DO UPDATE SET translated_name = ${translated_name}, translated_description = ${translated_description||null}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── WHATSAPP ORDERS (whatsapp_orders table) ────────────────────────────────
router.post("/whatsapp/webhook", async (req: any, res: any) => {
  try {
    const { phone, message, tenant_id = 1 } = req.body;
    await db.execute(sql`INSERT INTO whatsapp_orders (tenant_id, phone, raw_message, status, created_at) VALUES (${tenant_id}, ${phone||'unknown'}, ${message||''}, 'pending', NOW())`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/whatsapp/pending-orders", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM whatsapp_orders WHERE tenant_id = ${t} ORDER BY created_at DESC LIMIT 50`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.post("/whatsapp/pending-orders/:id/confirm", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { items, table_number, order_type } = req.body;
    const kotNo = `WA-${Date.now()}`;
    const subtotal = (items || []).reduce((s: number, i: any) => s + (Number(i.price) * Number(i.quantity)), 0);
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = subtotal + gst;
    const kot = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, kot_number, table_number, order_type, status, subtotal, gst_amount, grand_total, record_status, created_at)
      VALUES (${t}, ${kotNo}, ${table_number||'WhatsApp'}, ${order_type||'delivery'}, 'pending', ${subtotal}, ${gst}, ${grandTotal}, 1, NOW())
      RETURNING *`);
    const kotId = (kot.rows[0] as any).id;
    for (const item of (items || [])) {
      await db.execute(sql`
        INSERT INTO kot_items (tenant_id, kot_id, item_name, quantity, unit_price, total_price, kitchen_status, created_at)
        VALUES (${t}, ${kotId}, ${item.name}, ${item.quantity}, ${item.price}, ${item.price * item.quantity}, 'pending', NOW())`);
    }
    await db.execute(sql`UPDATE whatsapp_orders SET status = 'confirmed', kot_id = ${kotId} WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true, kot_id: kotId, kot_number: kotNo });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── STAFF SCHEDULES ───────────────────────────────────────────────────────────
router.get("/staff/schedules", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 3*86400000).toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 4*86400000).toISOString().split('T')[0];
    const rows = await db.execute(sql`SELECT * FROM staff_schedules WHERE tenant_id = ${t} AND schedule_date BETWEEN ${fromDate} AND ${toDate} ORDER BY schedule_date, shift_start`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});
router.post("/staff/schedules", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { staff_name, staff_role, outlet_id, schedule_date, shift_start, shift_end } = req.body;
    await db.execute(sql`INSERT INTO staff_schedules (tenant_id, staff_name, staff_role, outlet_id, schedule_date, shift_start, shift_end, status) VALUES (${t}, ${staff_name}, ${staff_role||null}, ${outlet_id||null}, ${schedule_date}, ${shift_start}, ${shift_end}, 'scheduled')`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/staff/schedules/:id/clock-in", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    await db.execute(sql`UPDATE staff_schedules SET actual_start = NOW(), status = 'clocked_in' WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/staff/schedules/:id/clock-out", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    await db.execute(sql`UPDATE staff_schedules SET actual_end = NOW(), status = 'clocked_out' WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.get("/staff/attendance", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.execute(sql`SELECT *, EXTRACT(EPOCH FROM (COALESCE(actual_end, NOW()) - COALESCE(actual_start, NOW())))/3600 as hours_worked FROM staff_schedules WHERE tenant_id = ${t} AND schedule_date = ${today} ORDER BY shift_start`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});
router.delete("/staff/schedules/:id", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    await db.execute(sql`DELETE FROM staff_schedules WHERE id = ${req.params.id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── OFFLINE SYNC ──────────────────────────────────────────────────────────────
router.post("/offline-sync", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { kots, device_id } = req.body;
    const results = [];
    for (const kot of (kots || [])) {
      const kotNo = kot.kot_number || `OFFLINE-${Date.now()}`;
      const result = await db.execute(sql`
        INSERT INTO kot_orders (tenant_id, kot_number, table_number, table_id, order_type, status, covers, subtotal, gst_amount, grand_total, cashier_name, outlet_id, record_status, created_at)
        VALUES (${t}, ${kotNo}, ${kot.table_number||null}, ${kot.table_id||null}, ${kot.order_type||'dine_in'}, 'pending', ${kot.covers||1}, ${kot.subtotal||0}, ${kot.gst_amount||0}, ${kot.grand_total||0}, ${kot.cashier_name||'Offline'}, ${kot.outlet_id||null}, 1, ${kot.created_at||'NOW()'})
        RETURNING id, kot_number`);
      const kotId = (result.rows[0] as any)?.id;
      for (const item of (kot.items || [])) {
        await db.execute(sql`INSERT INTO kot_items (tenant_id, kot_id, item_name, quantity, unit_price, total_price, kitchen_status, created_at) VALUES (${t}, ${kotId}, ${item.item_name}, ${item.quantity}, ${item.rate||item.unit_price||0}, ${item.amount||item.total_price||0}, 'pending', NOW())`);
      }
      results.push({ offline_id: kot.offline_id, server_id: kotId, kot_number: kotNo });
    }
    res.json({ success: true, synced: results.length, results });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
