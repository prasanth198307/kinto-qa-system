import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glRestaurantPayment } from "./vertical-gl-service";

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
    const result = await db.execute(sql`
      SELECT m.*, COALESCE(json_agg(json_build_object('id',o.id,'option_name',o.option_name,'price_adjustment',o.price_adjustment,'is_default',o.is_default)) FILTER (WHERE o.id IS NOT NULL), '[]') AS options
      FROM menu_modifiers m
      LEFT JOIN menu_modifier_options o ON o.modifier_id = m.id AND (o.record_status IS NULL OR o.record_status != 'deleted')
      WHERE m.tenant_id=${tid(req)} AND (m.record_status IS NULL OR m.record_status != 'deleted')
      GROUP BY m.id ORDER BY m.name`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/modifiers", requireAuth, async (req, res) => {
  try {
    const { name, modifier_type, is_required, min_selection, max_selection, options } = req.body;
    const result = await db.execute(sql`
      INSERT INTO menu_modifiers (tenant_id, name, modifier_type, is_required, min_selection, max_selection)
      VALUES (${tid(req)}, ${name}, ${modifier_type ?? 'single'}, ${is_required ?? false}, ${min_selection ?? 0}, ${max_selection ?? 1})
      RETURNING *`);
    const mod = result.rows[0] as any;
    for (const opt of (options || [])) {
      await db.execute(sql`INSERT INTO menu_modifier_options (tenant_id, modifier_id, option_name, price_adjustment) VALUES (${tid(req)}, ${mod.id}, ${opt.option_name ?? opt.name}, ${opt.price_adjustment ?? opt.price ?? 0})`);
    }
    res.json(mod);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/modifiers/:id", requireAuth, async (req, res) => {
  try {
    const { name, modifier_type, is_required, min_selection, max_selection } = req.body;
    const result = await db.execute(sql`
      UPDATE menu_modifiers SET name=${name}, modifier_type=${modifier_type}, is_required=${is_required},
        min_selection=${min_selection}, max_selection=${max_selection}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/modifiers/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM menu_modifier_options WHERE modifier_id=${req.params.id}`);
    await db.execute(sql`DELETE FROM menu_modifiers WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/modifiers/:id/options", requireAuth, async (req, res) => {
  try {
    const { option_name, price_adjustment } = req.body;
    const result = await db.execute(sql`
      INSERT INTO menu_modifier_options (tenant_id, modifier_id, option_name, price_adjustment)
      VALUES (${tid(req)}, ${req.params.id}, ${option_name}, ${price_adjustment ?? 0})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/modifiers/:id/options/:optionId", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM menu_modifier_options WHERE id=${req.params.optionId} AND modifier_id=${req.params.id}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── COMBOS ───────────────────────────────────────────────────────────────────
router.get("/combos", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM menu_combos WHERE tenant_id=${tid(req)} AND (record_status IS NULL OR record_status != 'deleted') ORDER BY combo_name`);
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/combos", requireAuth, async (req, res) => {
  try {
    const { combo_name, description, combo_price, is_available } = req.body;
    const result = await db.execute(sql`
      INSERT INTO menu_combos (tenant_id, combo_name, description, combo_price, is_available)
      VALUES (${tid(req)}, ${combo_name}, ${description}, ${combo_price}, ${is_available ?? true})
      RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/combos/:id", requireAuth, async (req, res) => {
  try {
    const { combo_name, description, combo_price, is_available } = req.body;
    const result = await db.execute(sql`
      UPDATE menu_combos SET combo_name=${combo_name}, description=${description},
        combo_price=${combo_price}, is_available=${is_available}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/combos/:id", requireAuth, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM menu_combos WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
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
      LEFT JOIN menu_items mi ON r.menu_item_id::text = mi.id
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
    // GL auto-post: Dr Cash/Bank, Cr Food Sales
    glRestaurantPayment({ tenantId: tid(req), orderId: req.params.id, amount: Math.round((amount || 0) * 100), paymentMode: payment_mode || "cash" });
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

// ─── PRINTER CONFIG (station filter for POS print routing) ───────────────────
router.get("/printer-config", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { station } = req.query;
  try {
    const rows = station
      ? await db.execute(sql`SELECT * FROM printer_config WHERE tenant_id=${t} AND (stations IS NULL OR stations ? ${station}) AND is_active = true LIMIT 1`)
      : await db.execute(sql`SELECT * FROM printer_config WHERE tenant_id=${t} AND is_default = true LIMIT 1`);
    res.json((rows.rows as any[])[0] ?? null);
  } catch { res.json(null); }
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
      db.execute(sql`SELECT * FROM menu_categories WHERE tenant_id=${s.tenant_id} AND (is_active IS NULL OR is_active=true) ORDER BY sort_order`),
      db.execute(sql`SELECT mi.*, mc.name as category_name FROM menu_items mi LEFT JOIN menu_categories mc ON mc.id=mi.category_id WHERE mi.tenant_id=${s.tenant_id} AND (mi.is_available IS NULL OR mi.is_available=true) ORDER BY mc.sort_order, mi.display_order`)
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
    const { outlet_id, table_number, food_rating, service_rating, ambience_rating, overall_rating, comment, customer_name, customer_phone, kot_order_id } = req.body;
    let tenant_id = req.body.tenant_id || 1;
    if (outlet_id) {
      try {
        const outletRows = await db.execute(sql`SELECT tenant_id FROM restaurant_outlets WHERE id = ${outlet_id} LIMIT 1`);
        const found = (outletRows.rows[0] as any)?.tenant_id;
        if (found) tenant_id = found;
      } catch { /* fall through */ }
    }
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
    const { from, message } = req.body;
    const outlet_id = req.body.outlet_id;
    let tenant_id = req.body.tenant_id || 1;
    if (outlet_id) {
      try {
        const outletRows = await db.execute(sql`SELECT tenant_id FROM restaurant_outlets WHERE id = ${outlet_id} LIMIT 1`);
        const found = (outletRows.rows[0] as any)?.tenant_id;
        if (found) tenant_id = found;
      } catch { /* fall through */ }
    }
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
    const { phone, message } = req.body;
    const outlet_id = req.body.outlet_id;
    let tenant_id = req.body.tenant_id || 1;
    if (outlet_id) {
      try {
        const outletRows = await db.execute(sql`SELECT tenant_id FROM restaurant_outlets WHERE id = ${outlet_id} LIMIT 1`);
        const found = (outletRows.rows[0] as any)?.tenant_id;
        if (found) tenant_id = found;
      } catch { /* fall through */ }
    }
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

// ── Recipe Costing ──────────────────────────────────────────────────────────
router.get("/recipes/food-cost-report", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { from = new Date().toISOString().slice(0,10), to = new Date().toISOString().slice(0,10) } = req.query;
    const rows = await db.execute(sql`
      SELECT mi.name, mi.price AS selling_price,
      COALESCE((SELECT SUM(ri2.quantity * ri2.cost_per_unit) FROM restaurant_recipe_ingredients ri2 JOIN restaurant_recipes r2 ON r2.id = ri2.recipe_id WHERE r2.menu_item_id::text = mi.id AND r2.tenant_id = ${t}), 0) as food_cost,
      COUNT(ki.id) as qty_sold,
      COUNT(ki.id) * mi.price as total_revenue,
      COUNT(ki.id) * COALESCE((SELECT SUM(ri2.quantity * ri2.cost_per_unit) FROM restaurant_recipe_ingredients ri2 JOIN restaurant_recipes r2 ON r2.id = ri2.recipe_id WHERE r2.menu_item_id::text = mi.id AND r2.tenant_id = ${t}), 0) as total_food_cost
      FROM menu_items mi
      LEFT JOIN kot_items ki ON ki.item_name = mi.name AND ki.tenant_id = ${t}
      LEFT JOIN kot_orders ko ON ko.id = ki.kot_id AND ko.status = 'paid' AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
      WHERE mi.tenant_id = ${t}
      GROUP BY mi.id, mi.name, mi.selling_price
      ORDER BY total_food_cost DESC`);
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/recipes", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT r.*, mi.name as menu_item_name, mi.selling_price,
      COALESCE((SELECT SUM(ri.quantity * ri.cost_per_unit) FROM restaurant_recipe_ingredients ri WHERE ri.recipe_id = r.id), 0) as food_cost
      FROM restaurant_recipes r
      JOIN menu_items mi ON mi.id = r.menu_item_id::text AND mi.tenant_id = ${t}
      WHERE r.tenant_id = ${t}
      ORDER BY r.id DESC`);
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/recipes/:id/ingredients", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`
      SELECT ri.*, rm.material_name as raw_material_name_db, rm.base_unit as rm_unit
      FROM restaurant_recipe_ingredients ri
      LEFT JOIN raw_materials rm ON rm.id = ri.raw_material_id::text AND rm.tenant_id = ${t}
      WHERE ri.recipe_id = ${req.params.id} AND ri.tenant_id = ${t}
      ORDER BY ri.id`);
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/recipes", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { menu_item_id, yield_qty, yield_unit, prep_time_minutes, notes } = req.body;
    const result = await db.execute(sql`
      INSERT INTO restaurant_recipes (tenant_id, menu_item_id, yield_qty, yield_unit, prep_time_minutes, notes, created_at)
      VALUES (${t}, ${menu_item_id}, ${yield_qty||1}, ${yield_unit||'portion'}, ${prep_time_minutes||null}, ${notes||null}, NOW())
      ON CONFLICT (tenant_id, menu_item_id) DO UPDATE SET yield_qty=${yield_qty||1}, yield_unit=${yield_unit||'portion'}, prep_time_minutes=${prep_time_minutes||null}, notes=${notes||null}
      RETURNING id`);
    res.json({ success: true, id: result.rows[0]?.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/recipes/:id/ingredients", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { raw_material_id, raw_material_name, quantity, unit, cost_per_unit } = req.body;
    await db.execute(sql`
      INSERT INTO restaurant_recipe_ingredients (tenant_id, recipe_id, raw_material_id, raw_material_name, quantity, unit, cost_per_unit)
      VALUES (${t}, ${req.params.id}, ${raw_material_id||null}, ${raw_material_name}, ${quantity}, ${unit}, ${cost_per_unit})`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/recipes/:recipeId/ingredients/:ingId", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    await db.execute(sql`DELETE FROM restaurant_recipe_ingredients WHERE id=${req.params.ingId} AND recipe_id=${req.params.recipeId} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Tally XML Export ─────────────────────────────────────────────────────────
router.get("/reports/tally-xml", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { from, to, sales_ledger = 'Food Sales A/c', cash_ledger = 'Cash-in-Hand', bank_ledger = 'HDFC Current A/c', cgst_ledger = 'Output CGST A/c', sgst_ledger = 'Output SGST A/c' } = req.query;
    const rows = await db.execute(sql`
      SELECT DATE(ko.created_at) as sale_date,
      SUM(CASE WHEN ko.payment_mode='cash' THEN ko.total_amount ELSE 0 END) as cash_sales,
      SUM(CASE WHEN ko.payment_mode IN ('card','upi','online') THEN ko.total_amount ELSE 0 END) as bank_sales,
      SUM(ko.total_amount) as gross_sales,
      SUM(COALESCE(ko.gst_amount, 0)) as gst_amount
      FROM kot_orders ko
      WHERE ko.tenant_id=${t} AND ko.status='paid' AND DATE(ko.created_at) BETWEEN ${from||new Date().toISOString().slice(0,10)} AND ${to||new Date().toISOString().slice(0,10)}
      GROUP BY DATE(ko.created_at) ORDER BY sale_date`);

    const vouchers = (rows.rows || []).map((r: any) => {
      const taxable = Number(r.gross_sales) - Number(r.gst_amount);
      const cgst = Number(r.gst_amount) / 2;
      const sgst = Number(r.gst_amount) / 2;
      const debitLedger = Number(r.cash_sales) > 0 ? cash_ledger : bank_ledger;
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Sales" ACTION="Create">
<DATE>${String(r.sale_date).replace(/-/g,'')}</DATE>
<NARRATION>Daily Sales - ${r.sale_date}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${debitLedger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${r.gross_sales}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${sales_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>${taxable.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${cgst_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>${cgst.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${sgst_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>${sgst.toFixed(2)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n<BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${vouchers}</REQUESTDATA></IMPORTDATA></BODY>\n</ENVELOPE>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="tally-export-${from}-${to}.xml"`);
    res.send(xml);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Marketing Campaigns ─────────────────────────────────────────────────────
router.get("/campaigns", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM restaurant_campaigns WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 50`);
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/campaigns", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { name, segment, channel, message, scheduled_at } = req.body;
    let customerCount = 0;
    try {
      if (segment === 'all') {
        const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t}`);
        customerCount = Number((r.rows[0] as any)?.cnt || 0);
      } else if (segment === 'churned') {
        const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND last_visit_date < NOW() - INTERVAL '30 days'`);
        customerCount = Number((r.rows[0] as any)?.cnt || 0);
      } else if (segment === 'vip') {
        const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND total_spend > 5000`);
        customerCount = Number((r.rows[0] as any)?.cnt || 0);
      } else if (segment === 'birthday') {
        const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(DAY FROM dob) = EXTRACT(DAY FROM NOW())`);
        customerCount = Number((r.rows[0] as any)?.cnt || 0);
      }
    } catch {}
    await db.execute(sql`INSERT INTO restaurant_campaigns (tenant_id, name, segment, channel, message, scheduled_at, status, customer_count, created_at) VALUES (${t}, ${name}, ${segment}, ${channel}, ${message}, ${scheduled_at||null}, 'scheduled', ${customerCount}, NOW())`);
    res.json({ success: true, customer_count: customerCount });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/campaigns/segments/count", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const all = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t}`);
    const churned = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND last_visit_date < NOW() - INTERVAL '30 days'`);
    const vip = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND total_spend > 5000`);
    const birthday = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(DAY FROM dob) = EXTRACT(DAY FROM NOW())`);
    const newCustomers = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_customers WHERE tenant_id=${t} AND created_at >= NOW() - INTERVAL '7 days'`);
    res.json({
      all: Number((all.rows[0] as any)?.cnt||0),
      churned: Number((churned.rows[0] as any)?.cnt||0),
      vip: Number((vip.rows[0] as any)?.cnt||0),
      birthday: Number((birthday.rows[0] as any)?.cnt||0),
      new_customers: Number((newCustomers.rows[0] as any)?.cnt||0)
    });
  } catch { res.json({ all: 0, churned: 0, vip: 0, birthday: 0, new_customers: 0 }); }
});

// ── HR Integration ────────────────────────────────────────────────────────────
// List HR employees for this tenant (to link as restaurant staff)
router.get("/staff/hr-employees", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT e.id, (e.first_name || ' ' || e.last_name) AS name, e.emp_code AS employee_code,
        e.department_id AS department, e.designation_id AS designation,
        rsp.role as restaurant_role, rsp.outlet_id, rsp.id as profile_id
      FROM hr_employees e
      LEFT JOIN restaurant_staff_profiles rsp ON rsp.employee_id = e.id AND rsp.tenant_id = ${t}
      WHERE e.tenant_id = ${t} AND e.status = 'active'
      ORDER BY e.first_name`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Link an HR employee as restaurant staff
router.post("/staff/link-employee", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { employee_id, role, outlet_id, tip_share_pct = 0 } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO restaurant_staff_profiles (tenant_id, employee_id, role, outlet_id, tip_share_pct, is_active)
      VALUES (${t}, ${employee_id}, ${role}, ${outlet_id||null}, ${tip_share_pct}, 1)
      ON CONFLICT (tenant_id, employee_id) DO UPDATE SET role=${role}, outlet_id=${outlet_id||null}, tip_share_pct=${tip_share_pct}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Unlink employee from restaurant
router.delete("/staff/link-employee/:employeeId", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  await db.execute(sql`DELETE FROM restaurant_staff_profiles WHERE employee_id=${req.params.employeeId} AND tenant_id=${t}`);
  res.json({ success: true });
});

// Get restaurant staff with HR data merged
router.get("/staff/profiles", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT rsp.*, (e.first_name || ' ' || e.last_name) AS name, e.emp_code AS employee_code,
        e.phone, e.department_id AS department, e.designation_id AS designation,
        e.join_date AS date_of_joining, e.basic_salary,
        ro.outlet_name
      FROM restaurant_staff_profiles rsp
      LEFT JOIN hr_employees e ON e.id = rsp.employee_id
      LEFT JOIN restaurant_outlets ro ON ro.id::text = rsp.outlet_id::text
      WHERE rsp.tenant_id = ${t} ORDER BY e.first_name`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Staff attendance summary (from hr_attendance)
router.get("/staff/attendance-summary", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { month = new Date().toISOString().slice(0,7) } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT (e.first_name || ' ' || e.last_name) AS name, e.emp_code AS employee_code, rsp.role,
        COUNT(ha.id) as days_present, COALESCE(SUM(ha.working_hours),0) as hours_worked,
        COALESCE(SUM(ss.tips_collected),0) as tips_earned
      FROM restaurant_staff_profiles rsp
      JOIN hr_employees e ON e.id = rsp.employee_id
      LEFT JOIN hr_attendance ha ON ha.employee_id = e.id AND ha.tenant_id = ${t} AND TO_CHAR(ha.date,'YYYY-MM') = ${month}
      LEFT JOIN staff_schedules ss ON ss.employee_id = e.id AND ss.tenant_id = ${t} AND TO_CHAR(ss.start_time,'YYYY-MM') = ${month}
      WHERE rsp.tenant_id = ${t}
      GROUP BY e.id, e.first_name, e.last_name, e.emp_code, rsp.role
      ORDER BY e.first_name`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Vendor Master Integration ─────────────────────────────────────────────────
router.get("/inventory/vendors", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT id, vendor_name AS name, contact_person, mobile_number AS phone, email, gst_number, address
      FROM vendors WHERE tenant_id = ${t} AND is_active != '0' AND is_active != 'false'
      ORDER BY vendor_name`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Link a purchase to a vendor
router.put("/inventory/purchases/:id/link-vendor", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { vendor_id } = req.body;
  try {
    await db.execute(sql`UPDATE raw_material_purchases SET vendor_id=${vendor_id} WHERE id=${req.params.id} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Vendor purchase history for restaurant
router.get("/inventory/vendor-purchases", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT rmt.id, rmt.created_at, rmt.quantity, rmt.reference, rmt.remarks,
             rm.material_name as item_name, rm.uom_id as unit
      FROM raw_material_transactions rmt
      JOIN raw_materials rm ON rm.id = rmt.material_id AND rm.tenant_id = ${t}
      WHERE rmt.tenant_id = ${t} AND rmt.transaction_type = 'purchase'
      ORDER BY rmt.created_at DESC LIMIT 100`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Create purchase order from restaurant (links to shared PO module)
router.post("/inventory/purchase-request", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { vendor_id, items, delivery_date, notes } = req.body;
  try {
    const poResult = await db.execute(sql`
      INSERT INTO purchase_orders (tenant_id, vendor_id, order_date, expected_delivery, status, notes, created_at)
      VALUES (${t}, ${vendor_id}, NOW(), ${delivery_date||null}, 'pending', ${notes||'Restaurant ingredient request'}, NOW())
      RETURNING id`);
    const poId = poResult.rows?.[0]?.id;
    for (const item of (items || [])) {
      await db.execute(sql`INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit, unit_price, total_price)
        VALUES (${poId}, ${item.product_id||null}, ${item.name}, ${item.qty}, ${item.unit||'kg'}, ${item.price||0}, ${(item.qty||0)*(item.price||0)})`);
    }
    res.json({ success: true, po_id: poId });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Raw Material / Inventory Integration ──────────────────────────────────────
// Get shared raw materials catalog
router.get("/inventory/raw-materials-catalog", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    let rows: any;
    try {
      rows = await db.execute(sql`SELECT id, name, unit, description FROM raw_materials WHERE tenant_id=${t} AND is_active != 0 ORDER BY name LIMIT 500`);
    } catch {
      rows = { rows: [] };
    }
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Get restaurant stock levels
router.get("/inventory/stock", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { outlet_id } = req.query;
  try {
    let query = outlet_id
      ? sql`SELECT * FROM restaurant_raw_material_stock WHERE tenant_id=${t} AND outlet_id=${outlet_id} ORDER BY raw_material_name`
      : sql`SELECT * FROM restaurant_raw_material_stock WHERE tenant_id=${t} ORDER BY raw_material_name`;
    const rows = await db.execute(query);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Deduct stock when KOT is placed (called from POS)
router.post("/inventory/deduct", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { items, outlet_id } = req.body;
  try {
    const lowStock: any[] = [];
    for (const item of (items || [])) {
      const updated = await db.execute(sql`
        UPDATE restaurant_raw_material_stock
        SET current_stock = GREATEST(0, current_stock - ${item.qty}), last_updated = NOW()
        WHERE tenant_id = ${t} AND raw_material_name = ${item.name} AND (outlet_id = ${outlet_id||null} OR outlet_id IS NULL)
        RETURNING current_stock, min_stock, raw_material_name`);
      if (updated.rows?.[0]) {
        const row = updated.rows[0];
        if (Number(row.current_stock) <= Number(row.min_stock)) {
          lowStock.push({ name: row.raw_material_name, stock: row.current_stock, min: row.min_stock });
        }
      }
    }
    res.json({ success: true, low_stock_alerts: lowStock });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Receive stock (after purchase)
router.post("/inventory/receive", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { raw_material_name, quantity, unit, outlet_id, raw_material_id } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO restaurant_raw_material_stock (tenant_id, raw_material_id, raw_material_name, unit, current_stock, outlet_id, last_updated)
      VALUES (${t}, ${raw_material_id||null}, ${raw_material_name}, ${unit||'kg'}, ${quantity}, ${outlet_id||null}, NOW())
      ON CONFLICT (tenant_id, raw_material_name, outlet_id) DO UPDATE
        SET current_stock = restaurant_raw_material_stock.current_stock + ${quantity}, last_updated = NOW()`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Low stock report
router.get("/inventory/low-stock", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT * FROM restaurant_raw_material_stock
      WHERE tenant_id=${t} AND current_stock <= min_stock
      ORDER BY (min_stock - current_stock) DESC`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

// ── Steward KOT Attribution ───────────────────────────────────────────────────
router.get("/staff/waiter-performance", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { from = new Date().toISOString().slice(0,10), to = new Date().toISOString().slice(0,10) } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT ko.waiter_name, ko.waiter_employee_id,
        COUNT(ko.id) as orders_served, COALESCE(SUM(ko.total_amount),0) as revenue_generated,
        COALESCE(AVG(ko.total_amount),0) as avg_bill_value,
        COALESCE(SUM(ss.tips_collected),0) as tips_earned,
        COUNT(DISTINCT ko.table_id) as tables_served
      FROM kot_orders ko
      LEFT JOIN staff_schedules ss ON ss.employee_id = ko.waiter_employee_id AND ss.tenant_id = ${t}
        AND DATE(ss.start_time) BETWEEN ${from} AND ${to}
      WHERE ko.tenant_id = ${t} AND ko.status = 'paid'
        AND DATE(ko.created_at) BETWEEN ${from} AND ${to}
        AND ko.waiter_name IS NOT NULL
      GROUP BY ko.waiter_name, ko.waiter_employee_id
      ORDER BY revenue_generated DESC`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Assign waiter to KOT
router.put("/kot/:id/assign-waiter", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { waiter_employee_id, waiter_name } = req.body;
  try {
    await db.execute(sql`UPDATE kot_orders SET waiter_employee_id=${waiter_employee_id||null}, waiter_name=${waiter_name} WHERE id=${req.params.id} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Z-Report → Finance Journal Entry ─────────────────────────────────────────
router.post("/shifts/:id/post-journal", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const shiftRows = await db.execute(sql`SELECT * FROM staff_schedules WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const shift = shiftRows.rows?.[0];
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const salesRows = await db.execute(sql`
      SELECT COALESCE(SUM(subtotal),0) as subtotal, COALESCE(SUM(gst_amount),0) as gst, COALESCE(SUM(total_amount),0) as total,
      COALESCE(SUM(CASE WHEN payment_mode='cash' THEN total_amount ELSE 0 END),0) as cash_collected,
      COALESCE(SUM(CASE WHEN payment_mode IN ('card','upi','online') THEN total_amount ELSE 0 END),0) as bank_collected
      FROM kot_orders
      WHERE tenant_id=${t} AND status='paid'
      AND created_at >= ${shift.start_time} AND (${shift.end_time} IS NULL OR created_at <= ${shift.end_time})`);
    const sales = salesRows.rows?.[0] || {};

    const existingRows = await db.execute(sql`SELECT id FROM journal_entries WHERE tenant_id=${t} AND narration LIKE ${'%Shift-' + req.params.id + '%'} LIMIT 1`);
    if (existingRows.rows?.[0]) return res.status(400).json({ error: "Journal entry already posted for this shift" });

    const today = new Date().toISOString().slice(0,10);
    const narration = `Restaurant Daily Sales — Shift-${req.params.id} — ${today}`;
    const jeResult = await db.execute(sql`
      INSERT INTO journal_entries (tenant_id, entry_date, narration, reference_no, status, created_at)
      VALUES (${t}, ${today}, ${narration}, ${'ZRPT-' + req.params.id}, 'posted', NOW())
      RETURNING id`);
    const jeId = jeResult.rows?.[0]?.id;

    if (Number(sales.cash_collected) > 0) {
      await db.execute(sql`INSERT INTO journal_entry_lines (journal_entry_id, tenant_id, account_name, debit, credit) VALUES (${jeId}, ${t}, 'Cash-in-Hand', ${sales.cash_collected}, 0)`);
    }
    if (Number(sales.bank_collected) > 0) {
      await db.execute(sql`INSERT INTO journal_entry_lines (journal_entry_id, tenant_id, account_name, debit, credit) VALUES (${jeId}, ${t}, 'Bank Account', ${sales.bank_collected}, 0)`);
    }
    if (Number(sales.subtotal) > 0) {
      await db.execute(sql`INSERT INTO journal_entry_lines (journal_entry_id, tenant_id, account_name, debit, credit) VALUES (${jeId}, ${t}, 'Food Sales A/c', 0, ${sales.subtotal})`);
    }
    if (Number(sales.gst) > 0) {
      await db.execute(sql`INSERT INTO journal_entry_lines (journal_entry_id, tenant_id, account_name, debit, credit) VALUES (${jeId}, ${t}, 'Output GST Payable', 0, ${sales.gst})`);
    }

    await db.execute(sql`UPDATE staff_schedules SET journal_entry_id=${jeId} WHERE id=${req.params.id} AND tenant_id=${t}`);

    res.json({ success: true, journal_entry_id: jeId, sales_summary: sales });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/shifts/:id/journal", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT je.*, json_agg(json_build_object('account',jel.account_name,'debit',jel.debit,'credit',jel.credit)) as lines
      FROM journal_entries je
      LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      WHERE je.tenant_id=${t} AND je.narration LIKE ${'%Shift-' + req.params.id + '%'}
      GROUP BY je.id LIMIT 1`);
    res.json(rows.rows?.[0] || null);
  } catch { res.json(null); }
});

// ── Cash Settlement → Shared Expenses ────────────────────────────────────────
router.post("/shifts/:id/post-cash-settlement", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { opening_cash, closing_cash, actual_cash } = req.body;
  try {
    const shiftRows = await db.execute(sql`SELECT * FROM staff_schedules WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const shift = shiftRows.rows?.[0];
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const variance = Number(actual_cash) - Number(closing_cash);
    const today = new Date().toISOString().slice(0,10);

    if (Math.abs(variance) > 0) {
      const description = variance < 0
        ? `Cash shortage — Shift ${req.params.id} — Expected: ₹${closing_cash}, Actual: ₹${actual_cash}`
        : `Cash excess — Shift ${req.params.id} — Expected: ₹${closing_cash}, Actual: ₹${actual_cash}`;
      const expResult = await db.execute(sql`
        INSERT INTO expenses (tenant_id, expense_date, category, description, amount, payment_mode, status, created_at)
        VALUES (${t}, ${today}, 'Cash Variance', ${description}, ${Math.abs(variance)}, 'cash', 'approved', NOW())
        RETURNING id`);
      await db.execute(sql`UPDATE staff_schedules SET expense_id=${expResult.rows?.[0]?.id}, opening_cash=${opening_cash}, closing_cash=${closing_cash}, actual_cash=${actual_cash}, cash_variance=${variance} WHERE id=${req.params.id} AND tenant_id=${t}`);
    } else {
      await db.execute(sql`UPDATE staff_schedules SET opening_cash=${opening_cash}, closing_cash=${closing_cash}, actual_cash=${actual_cash}, cash_variance=0 WHERE id=${req.params.id} AND tenant_id=${t}`);
    }

    res.json({ success: true, variance, message: variance === 0 ? 'Cash balanced' : `Variance of ₹${Math.abs(variance)} logged to expenses` });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Shift → HR Attendance ─────────────────────────────────────────────────────
router.post("/shifts/:id/close", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { closing_notes, tips_collected } = req.body;
  try {
    const shiftRows = await db.execute(sql`SELECT * FROM staff_schedules WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const shift = shiftRows.rows?.[0];
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const endTime = new Date();
    const startTime = new Date(shift.start_time);
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / 3600000;

    await db.execute(sql`UPDATE staff_schedules SET status='closed', end_time=${endTime.toISOString()}, tips_collected=${tips_collected||0}, notes=${closing_notes||null} WHERE id=${req.params.id} AND tenant_id=${t}`);

    if (shift.employee_id) {
      await db.execute(sql`
        INSERT INTO hr_attendance (tenant_id, employee_id, attendance_date, check_in, check_out, status, hours_worked, remarks)
        VALUES (${t}, ${shift.employee_id}, ${new Date(startTime).toISOString().slice(0,10)}, ${startTime.toISOString()}, ${endTime.toISOString()}, 'present', ${Math.round(hoursWorked * 100)/100}, ${'Restaurant shift ' + req.params.id})
        ON CONFLICT (tenant_id, employee_id, attendance_date) DO UPDATE SET check_out=${endTime.toISOString()}, hours_worked=${Math.round(hoursWorked * 100)/100}, status='present'`);
    }

    res.json({ success: true, hours_worked: Math.round(hoursWorked * 10)/10 });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Open a new shift and clock in (HR integration)
router.post("/shifts/open", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { employee_id, outlet_id, shift_type = 'morning', opening_cash = 0 } = req.body;
  try {
    let staffName = req.body.staff_name || 'Staff';
    if (employee_id) {
      const empRows = await db.execute(sql`SELECT (first_name || ' ' || last_name) AS name FROM hr_employees WHERE id=${employee_id} AND tenant_id=${t} LIMIT 1`);
      staffName = empRows.rows?.[0]?.name || staffName;
    }
    const result = await db.execute(sql`
      INSERT INTO staff_schedules (tenant_id, employee_id, staff_name, outlet_id, shift_type, start_time, status, opening_cash, created_at)
      VALUES (${t}, ${employee_id||null}, ${staffName}, ${outlet_id||null}, ${shift_type}, NOW(), 'open', ${opening_cash}, NOW())
      RETURNING id`);
    if (employee_id) {
      const today = new Date().toISOString().slice(0,10);
      await db.execute(sql`
        INSERT INTO hr_attendance (tenant_id, employee_id, attendance_date, check_in, status, remarks)
        VALUES (${t}, ${employee_id}, ${today}, NOW(), 'present', 'Restaurant shift opened')
        ON CONFLICT (tenant_id, employee_id, attendance_date) DO UPDATE SET check_in=NOW(), status='present'`);
    }
    res.json({ success: true, shift_id: result.rows?.[0]?.id });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── CRM Contact Integration ───────────────────────────────────────────────────
// Sync restaurant customer → shared CRM contact (opt-in, non-destructive)
router.post("/customers/:id/sync-crm", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const custRows = await db.execute(sql`SELECT * FROM restaurant_customers WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const cust = custRows.rows?.[0];
    if (!cust) return res.status(404).json({ error: "Customer not found" });

    const existRows = await db.execute(sql`SELECT id FROM crm_contacts WHERE tenant_id=${t} AND phone=${(cust as any).phone} LIMIT 1`);
    let crmId = (existRows.rows?.[0] as any)?.id;

    if (!crmId) {
      const crmResult = await db.execute(sql`
        INSERT INTO crm_contacts (tenant_id, first_name, last_name, phone, email, source, tags, created_at)
        VALUES (${t}, ${((cust as any).name||'').split(' ')[0]}, ${((cust as any).name||'').split(' ').slice(1).join(' ')||null}, ${(cust as any).phone||null}, ${(cust as any).email||null}, 'restaurant', 'restaurant-customer', NOW())
        RETURNING id`);
      crmId = (crmResult.rows?.[0] as any)?.id;
    } else {
      await db.execute(sql`UPDATE crm_contacts SET first_name=${((cust as any).name||'').split(' ')[0]}, email=${(cust as any).email||null}, updated_at=NOW() WHERE id=${crmId} AND tenant_id=${t}`);
    }

    await db.execute(sql`UPDATE restaurant_customers SET crm_contact_id=${crmId} WHERE id=${req.params.id} AND tenant_id=${t}`);
    res.json({ success: true, crm_contact_id: crmId });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// Bulk sync all restaurant customers to CRM
router.post("/customers/bulk-sync-crm", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const custRows = await db.execute(sql`SELECT * FROM restaurant_customers WHERE tenant_id=${t} AND crm_contact_id IS NULL AND phone IS NOT NULL LIMIT 500`);
    let synced = 0, skipped = 0;
    for (const cust of (custRows.rows || [])) {
      try {
        const existRows = await db.execute(sql`SELECT id FROM crm_contacts WHERE tenant_id=${t} AND phone=${(cust as any).phone} LIMIT 1`);
        let crmId = (existRows.rows?.[0] as any)?.id;
        if (!crmId) {
          const r = await db.execute(sql`INSERT INTO crm_contacts (tenant_id, first_name, last_name, phone, email, source, tags, created_at) VALUES (${t}, ${((cust as any).name||'').split(' ')[0]}, ${((cust as any).name||'').split(' ').slice(1).join(' ')||null}, ${(cust as any).phone}, ${(cust as any).email||null}, 'restaurant', 'restaurant-customer', NOW()) ON CONFLICT DO NOTHING RETURNING id`);
          crmId = (r.rows?.[0] as any)?.id;
        }
        if (crmId) {
          await db.execute(sql`UPDATE restaurant_customers SET crm_contact_id=${crmId} WHERE id=${(cust as any).id} AND tenant_id=${t}`);
          synced++;
        }
      } catch { skipped++; }
    }
    res.json({ success: true, synced, skipped });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// View customer's CRM profile
router.get("/customers/:id/crm-profile", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const custRows = await db.execute(sql`SELECT crm_contact_id FROM restaurant_customers WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const crmId = (custRows.rows?.[0] as any)?.crm_contact_id;
    if (!crmId) return res.json({ linked: false });
    const crmRows = await db.execute(sql`SELECT * FROM crm_contacts WHERE id=${crmId} AND tenant_id=${t} LIMIT 1`);
    res.json({ linked: true, contact: crmRows.rows?.[0], interactions: [] });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── MIS Integration ───────────────────────────────────────────────────────────
router.post("/reports/post-to-mis", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { date = new Date().toISOString().slice(0,10) } = req.body;
  try {
    const salesRows = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount),0) as total_revenue,
        COALESCE(SUM(gst_amount),0) as gst_collected,
        COUNT(*) as order_count,
        COALESCE(AVG(total_amount),0) as avg_order_value
      FROM kot_orders WHERE tenant_id=${t} AND status='paid' AND DATE(created_at)=${date}`);
    const s = (salesRows.rows?.[0] || {}) as any;

    await db.execute(sql`
      INSERT INTO mis_daily_sales (tenant_id, sale_date, revenue, tax_collected, order_count, avg_order_value, source_module, created_at)
      VALUES (${t}, ${date}, ${s.total_revenue||0}, ${s.gst_collected||0}, ${s.order_count||0}, ${s.avg_order_value||0}, 'restaurant', NOW())
      ON CONFLICT (tenant_id, sale_date, source_module) DO UPDATE
        SET revenue=${s.total_revenue||0}, tax_collected=${s.gst_collected||0}, order_count=${s.order_count||0}, avg_order_value=${s.avg_order_value||0}`);

    res.json({ success: true, date, summary: s });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/reports/mis-summary", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { from, to } = req.query;
  const today = new Date().toISOString().slice(0,10);
  try {
    const rows = await db.execute(sql`
      SELECT sale_date, revenue, tax_collected, order_count, avg_order_value
      FROM mis_daily_sales
      WHERE tenant_id=${t} AND source_module='restaurant'
        AND sale_date BETWEEN ${from||today} AND ${to||today}
      ORDER BY sale_date ASC`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

// ── Loyalty → CRM Integration ─────────────────────────────────────────────────
router.post("/customers/loyalty-to-crm-campaign", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { segment = 'vip', campaign_name, message } = req.body;
  try {
    let customers: any[] = [];
    if (segment === 'vip') {
      const r = await db.execute(sql`SELECT * FROM restaurant_customers WHERE tenant_id=${t} AND total_spend > 5000 AND crm_contact_id IS NOT NULL`);
      customers = r.rows || [];
    } else if (segment === 'churned') {
      const r = await db.execute(sql`SELECT * FROM restaurant_customers WHERE tenant_id=${t} AND last_visit_date < NOW() - INTERVAL '30 days' AND crm_contact_id IS NOT NULL`);
      customers = r.rows || [];
    } else if (segment === 'new') {
      const r = await db.execute(sql`SELECT * FROM restaurant_customers WHERE tenant_id=${t} AND created_at >= NOW() - INTERVAL '7 days' AND crm_contact_id IS NOT NULL`);
      customers = r.rows || [];
    }

    if (!customers.length) return res.json({ success: false, message: "No linked CRM customers in this segment. Run bulk sync first." });

    const campResult = await db.execute(sql`
      INSERT INTO crm_campaigns (tenant_id, name, status, sent_count, created_at)
      VALUES (${t}, ${campaign_name||('Restaurant ' + segment + ' campaign')}, 'draft', 0, NOW())
      RETURNING id`);
    const campId = (campResult.rows?.[0] as any)?.id;

    for (const cust of customers) {
      await db.execute(sql`INSERT INTO crm_campaign_contacts (campaign_id, contact_id, tenant_id) VALUES (${campId}, ${(cust as any).crm_contact_id}, ${t}) ON CONFLICT DO NOTHING`);
    }

    res.json({ success: true, campaign_id: campId, contact_count: customers.length });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/customers/:id/sync-loyalty-to-crm", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const custRows = await db.execute(sql`SELECT * FROM restaurant_customers WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const cust = custRows.rows?.[0] as any;
    if (!cust?.crm_contact_id) return res.json({ success: false, message: "Customer not linked to CRM" });
    await db.execute(sql`UPDATE crm_contacts SET notes=${('Loyalty: ' + (cust.loyalty_points||0) + ' pts | Spend: ₹' + (cust.total_spend||0))} WHERE id=${cust.crm_contact_id} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Reservations → CRM Calendar ───────────────────────────────────────────────
router.post("/reservations/:id/sync-crm-calendar", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rsvRows = await db.execute(sql`SELECT * FROM restaurant_reservations WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const rsv = rsvRows.rows?.[0] as any;
    if (!rsv) return res.status(404).json({ error: "Reservation not found" });

    let crmContactId = rsv.crm_contact_id;
    if (!crmContactId && rsv.customer_phone) {
      const existRows = await db.execute(sql`SELECT id FROM crm_contacts WHERE tenant_id=${t} AND phone=${rsv.customer_phone} LIMIT 1`);
      crmContactId = (existRows.rows?.[0] as any)?.id;
      if (!crmContactId) {
        const r = await db.execute(sql`INSERT INTO crm_contacts (tenant_id, first_name, phone, source, created_at) VALUES (${t}, ${rsv.customer_name||'Guest'}, ${rsv.customer_phone}, 'restaurant-reservation', NOW()) RETURNING id`);
        crmContactId = (r.rows?.[0] as any)?.id;
      }
      await db.execute(sql`UPDATE restaurant_reservations SET crm_contact_id=${crmContactId} WHERE id=${req.params.id} AND tenant_id=${t}`);
    }

    const eventTitle = `Table ${rsv.table_id||'?'} Reservation — ${rsv.customer_name||'Guest'} (${rsv.party_size||1} pax)`;
    const eventResult = await db.execute(sql`
      INSERT INTO crm_calendar_events (tenant_id, contact_id, title, event_date, event_time, duration_minutes, event_type, notes, status, created_at)
      VALUES (${t}, ${crmContactId}, ${eventTitle}, ${rsv.reservation_date||rsv.date}, ${rsv.reservation_time||rsv.time||'12:00'}, 90, 'reservation', ${rsv.notes||null}, 'confirmed', NOW())
      ON CONFLICT DO NOTHING RETURNING id`);

    res.json({ success: true, crm_event_id: (eventResult.rows?.[0] as any)?.id, crm_contact_id: crmContactId });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/sync-all-crm", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const today = new Date().toISOString().slice(0,10);
  try {
    const rsvRows = await db.execute(sql`SELECT * FROM restaurant_reservations WHERE tenant_id=${t} AND reservation_date = ${today} AND status = 'confirmed'`);
    let synced = 0;
    for (const rsv of (rsvRows.rows || [])) {
      try {
        const r = rsv as any;
        let crmId = r.crm_contact_id;
        if (!crmId && r.customer_phone) {
          const er = await db.execute(sql`SELECT id FROM crm_contacts WHERE tenant_id=${t} AND phone=${r.customer_phone} LIMIT 1`);
          crmId = (er.rows?.[0] as any)?.id;
          if (!crmId) {
            const cr = await db.execute(sql`INSERT INTO crm_contacts (tenant_id, first_name, phone, source, created_at) VALUES (${t}, ${r.customer_name||'Guest'}, ${r.customer_phone}, 'restaurant', NOW()) RETURNING id`);
            crmId = (cr.rows?.[0] as any)?.id;
          }
        }
        if (crmId) {
          await db.execute(sql`INSERT INTO crm_calendar_events (tenant_id, contact_id, title, event_date, event_time, duration_minutes, event_type, status, created_at)
            VALUES (${t}, ${crmId}, ${'Reservation — ' + (r.customer_name||'Guest')}, ${today}, ${r.reservation_time||'12:00'}, 90, 'reservation', 'confirmed', NOW()) ON CONFLICT DO NOTHING`);
          await db.execute(sql`UPDATE restaurant_reservations SET crm_contact_id=${crmId} WHERE id=${r.id} AND tenant_id=${t}`);
          synced++;
        }
      } catch {}
    }
    res.json({ success: true, synced });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Online Ordering (public storefront) ─────────────────────────────────────
router.get("/storefront/:slug", async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`
      SELECT ro.*, t.name as tenant_name, t.id as tenant_id
      FROM restaurant_outlets ro
      JOIN tenants t ON t.id = ro.tenant_id
      WHERE ro.slug = ${req.params.slug} AND ro.is_active = 1
      LIMIT 1`);
    const outlet = rows.rows?.[0];
    if (!outlet) return res.status(404).json({ error: "Restaurant not found" });
    res.json(outlet);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/storefront/:slug/menu", async (req: any, res: any) => {
  try {
    const outletRows = await db.execute(sql`SELECT tenant_id FROM restaurant_outlets WHERE slug = ${req.params.slug} AND is_active = 1 LIMIT 1`);
    const tenantId = outletRows.rows?.[0]?.tenant_id;
    if (!tenantId) return res.status(404).json({ error: "Not found" });
    const cats = await db.execute(sql`SELECT * FROM restaurant_menu_categories WHERE tenant_id = ${tenantId} AND is_active != 0 ORDER BY sort_order, name`);
    const items = await db.execute(sql`SELECT * FROM restaurant_menu_items WHERE tenant_id = ${tenantId} AND is_active != 0 ORDER BY sort_order, name`);
    res.json({ categories: cats.rows || [], items: items.rows || [] });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/storefront/:slug/order", async (req: any, res: any) => {
  try {
    const outletRows = await db.execute(sql`SELECT id, tenant_id FROM restaurant_outlets WHERE slug = ${req.params.slug} AND is_active = 1 LIMIT 1`);
    const outlet = outletRows.rows?.[0];
    if (!outlet) return res.status(404).json({ error: "Not found" });
    const { items, customer_name, customer_phone, customer_address, delivery_type = 'delivery', notes, payment_mode = 'cod' } = req.body;
    if (!items?.length) return res.status(400).json({ error: "No items" });
    const subtotal = items.reduce((s: number, i: any) => s + (i.price * i.qty), 0);
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + gst;
    const tokenNo = Math.floor(1000 + Math.random() * 9000);
    const result = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, outlet_id, table_id, status, source, customer_name, customer_phone,
        delivery_address, delivery_type, payment_mode, subtotal, gst_amount, total_amount, token_no, notes, created_at)
      VALUES (${outlet.tenant_id}, ${outlet.id}, null, 'open', 'online', ${customer_name||'Guest'}, ${customer_phone||null},
        ${customer_address||null}, ${delivery_type}, ${payment_mode}, ${subtotal}, ${gst}, ${total}, ${tokenNo}, ${notes||null}, NOW())
      RETURNING id`);
    const kotId = result.rows[0]?.id;
    for (const item of items) {
      await db.execute(sql`INSERT INTO kot_items (tenant_id, kot_id, item_name, category_name, quantity, unit_price, total_price, is_void)
        VALUES (${outlet.tenant_id}, ${kotId}, ${item.name}, ${item.category||''}, ${item.qty}, ${item.price}, ${item.price * item.qty}, 0)`);
    }
    res.json({ success: true, order_id: kotId, token_no: tokenNo, total, estimated_time: 30 });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/storefront/:slug/order/:orderId/status", async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`SELECT id, status, token_no, total_amount, created_at FROM kot_orders WHERE id = ${req.params.orderId} LIMIT 1`);
    res.json(rows.rows?.[0] || null);
  } catch { res.json(null); }
});

// ── Payment Terminal Integration ─────────────────────────────────────────────
router.post("/payment-terminal/razorpay/initiate", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { amount, kot_id, description = 'Restaurant Bill' } = req.body;
  try {
    const cfgRows = await db.execute(sql`SELECT config_value FROM tenant_configs WHERE tenant_id=${t} AND config_key='razorpay_key_id' LIMIT 1`);
    const secretRows = await db.execute(sql`SELECT config_value FROM tenant_configs WHERE tenant_id=${t} AND config_key='razorpay_key_secret' LIMIT 1`);
    const keyId = cfgRows.rows?.[0]?.config_value;
    const keySecret = secretRows.rows?.[0]?.config_value;
    if (!keyId || !keySecret) {
      return res.status(400).json({ error: "Razorpay not configured. Go to Settings > Payment Terminals to add credentials." });
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpRes: any = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        description,
        reference_id: `KOT-${kot_id}-${Date.now()}`,
        notify: { sms: false, email: false },
        reminder_enable: false,
        callback_url: '',
        callback_method: 'get',
      })
    }).then((r: any) => r.json());
    if (rzpRes.error) return res.status(400).json({ error: rzpRes.error.description || 'Razorpay error' });
    await db.execute(sql`INSERT INTO payment_terminal_logs (tenant_id, kot_id, terminal_type, amount, reference_id, status, created_at)
      VALUES (${t}, ${kot_id}, 'razorpay', ${amount}, ${rzpRes.id}, 'initiated', NOW())
      ON CONFLICT DO NOTHING`);
    res.json({ success: true, payment_link: rzpRes.short_url, payment_link_id: rzpRes.id, amount });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/payment-terminal/razorpay/status/:paymentLinkId", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const cfgRows = await db.execute(sql`SELECT config_value FROM tenant_configs WHERE tenant_id=${t} AND config_key='razorpay_key_id' LIMIT 1`);
    const secretRows = await db.execute(sql`SELECT config_value FROM tenant_configs WHERE tenant_id=${t} AND config_key='razorpay_key_secret' LIMIT 1`);
    const keyId = cfgRows.rows?.[0]?.config_value;
    const keySecret = secretRows.rows?.[0]?.config_value;
    if (!keyId || !keySecret) return res.json({ status: 'unconfigured' });
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpRes: any = await fetch(`https://api.razorpay.com/v1/payment_links/${req.params.paymentLinkId}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    }).then((r: any) => r.json());
    res.json({ status: rzpRes.status, amount_paid: rzpRes.amount_paid / 100, payment_id: rzpRes.payments?.[0]?.payment_id });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/payment-terminal/pinelabs/initiate", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { amount, kot_id } = req.body;
  try {
    const cfgRows = await db.execute(sql`SELECT config_value FROM tenant_configs WHERE tenant_id=${t} AND config_key='pinelabs_merchant_id' LIMIT 1`);
    const merchantId = cfgRows.rows?.[0]?.config_value;
    if (!merchantId) return res.status(400).json({ error: "Pine Labs not configured. Add your Merchant ID in Settings > Payment Terminals." });
    const txnRef = `KOT${kot_id}${Date.now()}`;
    await db.execute(sql`INSERT INTO payment_terminal_logs (tenant_id, kot_id, terminal_type, amount, reference_id, status, created_at)
      VALUES (${t}, ${kot_id}, 'pinelabs', ${amount}, ${txnRef}, 'initiated', NOW())
      ON CONFLICT DO NOTHING`);
    res.json({ success: true, mode: 'pinelabs', txn_ref: txnRef, amount,
      message: "Amount pushed to Pine Labs terminal. Customer should swipe/tap card.",
      plutus_payload: { MerchantID: merchantId, BatchNumber: 1, SequenceNumber: 1, TransactionType: 4001, Amount: Math.round(amount * 100), InvoiceNumber: txnRef }
    });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/payment-terminal/config", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT config_key, config_value FROM tenant_configs WHERE tenant_id=${t} AND config_key IN ('razorpay_key_id','pinelabs_merchant_id','payment_terminal_mode')`);
    const cfg: Record<string,string> = {};
    (rows.rows || []).forEach((r: any) => { cfg[r.config_key] = r.config_value; });
    res.json(cfg);
  } catch { res.json({}); }
});

router.post("/payment-terminal/config", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { razorpay_key_id, razorpay_key_secret, pinelabs_merchant_id, payment_terminal_mode } = req.body;
  const pairs: [string, any][] = ([
    ['razorpay_key_id', razorpay_key_id],
    ['razorpay_key_secret', razorpay_key_secret],
    ['pinelabs_merchant_id', pinelabs_merchant_id],
    ['payment_terminal_mode', payment_terminal_mode],
  ] as [string, any][]).filter(([_, v]) => v !== undefined && v !== null);
  for (const [key, value] of pairs) {
    await db.execute(sql`INSERT INTO tenant_configs (tenant_id, config_key, config_value) VALUES (${t}, ${key}, ${value}) ON CONFLICT (tenant_id, config_key) DO UPDATE SET config_value = ${value}`);
  }
  res.json({ success: true });
});

router.get("/payment-terminal/logs", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const rows = await db.execute(sql`SELECT * FROM payment_terminal_logs WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 50`);
  res.json(rows.rows || []);
});


// ── Tax Config → Shared Masters (Task 20) ────────────────────────────────────
router.get("/tax/effective-rate", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { country_code = 'IN', amount = 0 } = req.query;
  try {
    let rate = 5;
    const cfgRows = await db.execute(sql`SELECT tax_rate FROM country_tax_config WHERE tenant_id=${t} AND country_code=${country_code} LIMIT 1`);
    if (cfgRows.rows?.[0]) rate = Number(cfgRows.rows[0].tax_rate);
    const taxAmount = Math.round(Number(amount) * rate / 100 * 100) / 100;
    res.json({ country_code, rate, tax_amount: taxAmount, taxable_amount: Number(amount), total: Number(amount) + taxAmount });
  } catch { res.json({ country_code, rate: 5, tax_amount: 0, total: Number(amount) }); }
});

// ── Outlets → Branches (Task 21) ──────────────────────────────────────────────
router.get("/outlets/branches", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT id, branch_name AS name, branch_code AS code FROM branches WHERE tenant_id=${t} AND is_active=true ORDER BY branch_name`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.put("/outlets/:id/link-branch", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { branch_id, cost_center_id } = req.body;
  try {
    await db.execute(sql`UPDATE restaurant_outlets SET branch_id=${branch_id||null}, cost_center_id=${cost_center_id||null} WHERE id=${req.params.id} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Steward Auth → User Management (Task 23) ─────────────────────────────────
router.get("/staff/app-users", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT id, username, email, role FROM users WHERE tenant_id=${t} ORDER BY username`);
    res.json(rows.rows || []);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/staff/assign-steward-role", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { user_id, outlet_id } = req.body;
  try {
    const userRows = await db.execute(sql`SELECT role FROM users WHERE id=${user_id} AND tenant_id=${t} LIMIT 1`);
    const userRole = userRows.rows?.[0]?.role;
    if (userRole) {
      const roleRows = await db.execute(sql`SELECT id FROM roles WHERE name=${userRole} AND tenant_id=${t} LIMIT 1`);
      const roleId = roleRows.rows?.[0]?.id;
      if (roleId) {
        for (const screen of ['restaurant_steward','restaurant_tables','restaurant_orders','restaurant_pos']) {
          await db.execute(sql`INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES (${roleId}, ${screen}, 1, 1, 0, 0) ON CONFLICT (role_id, screen_key) DO NOTHING`);
        }
      }
    }
    await db.execute(sql`INSERT INTO restaurant_staff_assignments (tenant_id, user_id, outlet_id, role, assigned_at) VALUES (${t}, ${user_id}, ${outlet_id||null}, 'steward', NOW()) ON CONFLICT DO NOTHING`);
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── KOT → Shared Invoice for B2B (Task 27) ───────────────────────────────────
router.post("/kot/:id/create-invoice", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const kotRows = await db.execute(sql`SELECT * FROM kot_orders WHERE id=${req.params.id} AND tenant_id=${t} LIMIT 1`);
    const kot = kotRows.rows?.[0];
    if (!kot) return res.status(404).json({ error: "KOT not found" });
    const itemRows = await db.execute(sql`SELECT * FROM kot_items WHERE kot_id=${req.params.id} AND is_void != 1`);
    const invoiceNo = 'REST-' + Date.now();
    const invResult = await db.execute(sql`
      INSERT INTO invoices (tenant_id, invoice_no, invoice_type, customer_name, customer_phone, invoice_date, subtotal, gst_amount, total_amount, payment_mode, status, notes, created_at)
      VALUES (${t}, ${invoiceNo}, 'restaurant', ${kot.customer_name||'Walk-in'}, ${kot.customer_phone||null}, NOW(), ${kot.subtotal||0}, ${kot.gst_amount||0}, ${kot.total_amount||0}, ${kot.payment_mode||'cash'}, 'paid', ${'KOT #' + req.params.id}, NOW())
      RETURNING id`);
    const invoiceId = invResult.rows?.[0]?.id;
    for (const item of (itemRows.rows || [])) {
      await db.execute(sql`INSERT INTO invoice_items (invoice_id, product_name, quantity, unit_price, total_price, tax_rate) VALUES (${invoiceId}, ${item.item_name}, ${item.quantity}, ${item.unit_price}, ${item.total_price}, 5)`).catch(()=>{});
    }
    await db.execute(sql`UPDATE kot_orders SET invoice_id=${invoiceId} WHERE id=${req.params.id} AND tenant_id=${t}`).catch(()=>{});
    res.json({ success: true, invoice_id: invoiceId, invoice_no: invoiceNo });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// ── Inventory → Warehouse (Task 28) ──────────────────────────────────────────
router.get("/inventory/warehouses", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT id, name, location, is_active FROM warehouses WHERE tenant_id=${t} AND is_active != 0 ORDER BY name`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

// ── Approval Workflows (Task 31) ──────────────────────────────────────────────
router.get("/approvals", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { status = 'pending' } = req.query;
  const rows = await db.execute(sql`SELECT * FROM restaurant_approval_requests WHERE tenant_id=${t} AND status=${status} ORDER BY created_at DESC LIMIT 50`);
  res.json(rows.rows || []);
});

router.post("/approvals", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { request_type, reference_id, amount, reason, requested_by } = req.body;
  const result = await db.execute(sql`INSERT INTO restaurant_approval_requests (tenant_id, request_type, reference_id, amount, reason, requested_by, status, created_at) VALUES (${t}, ${request_type}, ${reference_id||null}, ${amount||0}, ${reason||null}, ${requested_by||'Unknown'}, 'pending', NOW()) RETURNING id`);
  res.json({ success: true, id: result.rows?.[0]?.id });
});

router.post("/approvals/:id/approve", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { approved_by } = req.body;
  await db.execute(sql`UPDATE restaurant_approval_requests SET status='approved', approved_by=${approved_by||'Manager'}, approved_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
  res.json({ success: true });
});

router.post("/approvals/:id/reject", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { rejection_reason } = req.body;
  await db.execute(sql`UPDATE restaurant_approval_requests SET status='rejected', rejection_reason=${rejection_reason||''}, approved_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
  res.json({ success: true });
});

router.get("/approvals/pending-count", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT COUNT(*) as cnt FROM restaurant_approval_requests WHERE tenant_id=${t} AND status='pending'`);
    res.json({ count: rows.rows?.[0]?.cnt || 0 });
  } catch { res.json({ count: 0 }); }
});

// ── Multi-currency exchange rates ─────────────────────────────────────────────
router.get("/currencies", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    // Return latest rate per currency from currency_rates (or tenant's configured currencies)
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (currency_code) currency_code, rate_to_inr, rate_date
      FROM currency_rates
      WHERE tenant_id = ${t}
      ORDER BY currency_code, rate_date DESC
    `);
    res.json(Array.isArray(rows.rows) ? rows.rows : []);
  } catch {
    // currency_rates table may not exist — return empty
    res.json([]);
  }
});

// ── POS Promotions ───────────────────────────────────────────────────────────
router.post("/pos/apply-promo", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { promo_code, subtotal } = req.body;
  if (!promo_code) return res.status(400).json({ valid: false, message: "promo_code is required" });
  try {
    const rows = await db.execute(sql`
      SELECT * FROM pos_promotions
      WHERE tenant_id = ${t}
        AND promo_code = ${promo_code}
        AND is_active = true
        AND (end_date IS NULL OR end_date >= NOW())
        AND (start_date IS NULL OR start_date <= NOW())
      LIMIT 1
    `);
    const promo = (rows.rows as any[])[0];
    if (!promo) return res.json({ valid: false, message: "Invalid or expired promo code" });
    const sub = Number(subtotal) || 0;
    if (promo.min_purchase_amount && sub < Number(promo.min_purchase_amount)) {
      return res.json({ valid: false, message: `Minimum purchase of ${promo.min_purchase_amount} required` });
    }
    let discount_amount = 0;
    if (promo.promo_type === "pct") {
      const raw = sub * Number(promo.discount_value) / 100;
      discount_amount = promo.max_discount_amount ? Math.min(raw, Number(promo.max_discount_amount)) : raw;
    } else {
      discount_amount = Number(promo.discount_value);
    }
    discount_amount = Math.round(discount_amount * 100) / 100;
    res.json({ valid: true, promo_name: promo.promo_name || promo_code, discount_amount, promo_code });
  } catch (err: any) {
    console.error("apply-promo error:", err);
    res.status(500).json({ valid: false, message: "Server error" });
  }
});

router.get("/pos/promotions", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM pos_promotions WHERE tenant_id = ${t} ORDER BY created_at DESC`);
    res.json(Array.isArray(rows.rows) ? rows.rows : []);
  } catch { res.json([]); }
});

router.post("/pos/promotions", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { promo_code, promo_name, promo_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date } = req.body;
  if (!promo_code || !promo_type || !discount_value) return res.status(400).json({ message: "promo_code, promo_type, discount_value required" });
  try {
    const r = await db.execute(sql`
      INSERT INTO pos_promotions (tenant_id, promo_code, promo_name, promo_type, discount_value, min_purchase_amount, max_discount_amount, start_date, end_date, is_active, created_at)
      VALUES (${t}, ${promo_code}, ${promo_name || promo_code}, ${promo_type}, ${discount_value}, ${min_purchase_amount || null}, ${max_discount_amount || null}, ${start_date || null}, ${end_date || null}, true, NOW())
      RETURNING *
    `);
    res.json((r.rows as any[])[0]);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.put("/pos/promotions/:id", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { id } = req.params;
  const { is_active, promo_name, discount_value, min_purchase_amount, max_discount_amount, end_date } = req.body;
  try {
    await db.execute(sql`
      UPDATE pos_promotions SET
        is_active = COALESCE(${is_active !== undefined ? is_active : null}, is_active),
        promo_name = COALESCE(${promo_name || null}, promo_name),
        discount_value = COALESCE(${discount_value || null}, discount_value),
        min_purchase_amount = COALESCE(${min_purchase_amount || null}, min_purchase_amount),
        max_discount_amount = COALESCE(${max_discount_amount || null}, max_discount_amount),
        end_date = COALESCE(${end_date || null}, end_date)
      WHERE id = ${id} AND tenant_id = ${t}
    `);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.delete("/pos/promotions/:id", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { id } = req.params;
  try {
    await db.execute(sql`DELETE FROM pos_promotions WHERE id = ${id} AND tenant_id = ${t}`);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Audit Trail (Task 32) ─────────────────────────────────────────────────────
router.get("/audit-log", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { entity_type } = req.query;
  try {
    const rows = entity_type
      ? await db.execute(sql`SELECT * FROM restaurant_audit_log WHERE tenant_id=${t} AND entity_type=${entity_type} ORDER BY created_at DESC LIMIT 200`)
      : await db.execute(sql`SELECT * FROM restaurant_audit_log WHERE tenant_id=${t} ORDER BY created_at DESC LIMIT 200`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

// ── Analytics endpoints ───────────────────────────────────────────────────────
router.get("/analytics/menu-engineering", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { from, to } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT mi.name, mi.price, mi.category_id,
        COUNT(ki.id)::int as order_count,
        COALESCE(SUM(ki.quantity),0)::numeric as total_qty,
        COALESCE(SUM(ki.quantity * mi.price),0)::numeric as revenue,
        COALESCE((SELECT SUM(ri.quantity*ri.cost_per_unit) FROM restaurant_recipe_ingredients ri
          JOIN restaurant_recipes r ON r.id=ri.recipe_id WHERE r.menu_item_id::text=mi.id AND r.tenant_id=${t}),0)::numeric as food_cost
      FROM restaurant_menu_items mi
      LEFT JOIN kot_items ki ON ki.menu_item_id::text=mi.id AND ki.tenant_id=${t}
        AND (${from as string} IS NULL OR ki.created_at::date >= ${from as string || '2000-01-01'}::date)
        AND (${to as string} IS NULL OR ki.created_at::date <= ${to as string || '2099-01-01'}::date)
      WHERE mi.tenant_id=${t}
      GROUP BY mi.id, mi.name, mi.price, mi.category_id
      ORDER BY total_qty DESC`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/analytics/peak-hours", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { from, to } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as order_count,
        COALESCE(SUM(grand_total),0)::numeric as revenue
      FROM kot_orders
      WHERE tenant_id=${t}
        AND (${from as string} IS NULL OR created_at::date >= ${from as string || '2000-01-01'}::date)
        AND (${to as string} IS NULL OR created_at::date <= ${to as string || '2099-01-01'}::date)
      GROUP BY hour ORDER BY hour`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/analytics/server-performance", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { from, to } = req.query;
  try {
    const rows = await db.execute(sql`
      SELECT waiter_name, COUNT(*)::int as orders,
        COALESCE(SUM(grand_total),0)::numeric as revenue,
        COALESCE(AVG(grand_total),0)::numeric as avg_order_value
      FROM kot_orders
      WHERE tenant_id=${t} AND waiter_name IS NOT NULL AND waiter_name <> ''
        AND (${from as string} IS NULL OR created_at::date >= ${from as string || '2000-01-01'}::date)
        AND (${to as string} IS NULL OR created_at::date <= ${to as string || '2099-01-01'}::date)
      GROUP BY waiter_name ORDER BY revenue DESC LIMIT 20`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/analytics/customer-ltv", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT customer_phone, customer_name,
        COUNT(*)::int as visit_count,
        COALESCE(SUM(grand_total),0)::numeric as total_spend,
        COALESCE(AVG(grand_total),0)::numeric as avg_order,
        MAX(created_at) as last_visit
      FROM kot_orders
      WHERE tenant_id=${t} AND customer_phone IS NOT NULL AND customer_phone <> ''
        AND payment_status='paid'
      GROUP BY customer_phone, customer_name ORDER BY total_spend DESC LIMIT 50`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/analytics/predictive-prep", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT mi.name,
        COALESCE(AVG(ki.quantity),0)::numeric as avg_daily_qty,
        COALESCE(MAX(ki.quantity),0)::numeric as peak_qty,
        COUNT(DISTINCT ki.created_at::date)::int as days_sold
      FROM kot_items ki
      JOIN restaurant_menu_items mi ON mi.id::text=ki.menu_item_id::text AND mi.tenant_id=${t}
      WHERE ki.tenant_id=${t} AND ki.created_at >= NOW()-INTERVAL '30 days'
      GROUP BY mi.name ORDER BY avg_daily_qty DESC LIMIT 20`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/analytics/revenue-forecast", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`
      SELECT TO_CHAR(created_at,'YYYY-MM') as month,
        COUNT(*)::int as order_count,
        COALESCE(SUM(grand_total),0)::numeric as revenue
      FROM kot_orders WHERE tenant_id=${t} AND payment_status='paid'
      GROUP BY month ORDER BY month DESC LIMIT 12`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

// ── Franchise endpoints ───────────────────────────────────────────────────────
router.get("/franchise/config", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_franchise_config WHERE tenant_id=${t} LIMIT 1`);
    res.json(rows.rows[0] || null);
  } catch { res.json(null); }
});

router.post("/franchise/config", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  const { brand_name, royalty_pct, setup_fee, support_email, territory_rules, onboarding_doc_url } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO restaurant_franchise_config (tenant_id, brand_name, royalty_pct, setup_fee, support_email, territory_rules, onboarding_doc_url)
      VALUES (${t},${brand_name},${royalty_pct||0},${setup_fee||0},${support_email||null},${territory_rules||null},${onboarding_doc_url||null})
      ON CONFLICT (tenant_id) DO UPDATE SET brand_name=${brand_name}, royalty_pct=${royalty_pct||0}, setup_fee=${setup_fee||0},
        support_email=${support_email||null}, territory_rules=${territory_rules||null}, onboarding_doc_url=${onboarding_doc_url||null}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/franchise/outlets", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_franchise_outlets WHERE franchisor_tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/franchise/invoices", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_franchise_invoices WHERE franchisor_tenant_id=${t} ORDER BY created_at DESC LIMIT 100`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

router.get("/franchise/applications", requireAuth, async (req: any, res: any) => {
  const t = tid(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM restaurant_franchise_applications WHERE franchisor_tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows || []);
  } catch { res.json([]); }
});

export default router;
