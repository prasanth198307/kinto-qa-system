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

export default router;
