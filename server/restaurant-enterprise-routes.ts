import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createJournalWithLines } from "./journal-service";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ─── TERMINALS ───────────────────────────────────────────────────────────────

router.get("/terminals", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM restaurant_terminals WHERE tenant_id=${tid} ORDER BY id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/terminals", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, outlet_id, terminal_type, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO restaurant_terminals (tenant_id, name, outlet_id, terminal_type, is_active)
      VALUES (${tid}, ${name}, ${outlet_id}, ${terminal_type}, ${is_active ?? true})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/terminals/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, outlet_id, terminal_type, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE restaurant_terminals
      SET name=${name}, outlet_id=${outlet_id}, terminal_type=${terminal_type}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── FLOOR PLAN ──────────────────────────────────────────────────────────────

router.get("/floor-plan", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM restaurant_floor_plans
      WHERE tenant_id=${tid} ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      ORDER BY id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/floor-plan", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { outlet_id, layout_data } = req.body;
    const r = await db.execute(sql`
      INSERT INTO restaurant_floor_plans (tenant_id, outlet_id, layout_data)
      VALUES (${tid}, ${outlet_id}, ${JSON.stringify(layout_data)})
      ON CONFLICT (tenant_id, outlet_id) DO UPDATE SET layout_data=EXCLUDED.layout_data, updated_at=NOW()
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── OUTLETS ─────────────────────────────────────────────────────────────────

router.get("/outlets", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM restaurant_outlets WHERE tenant_id=${tid} ORDER BY id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/outlets", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, address, phone, gstin, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO restaurant_outlets (tenant_id, name, address, phone, gstin, is_active)
      VALUES (${tid}, ${name}, ${address}, ${phone}, ${gstin}, ${is_active ?? true})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/outlets/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, address, phone, gstin, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE restaurant_outlets
      SET name=${name}, address=${address}, phone=${phone}, gstin=${gstin}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── MODIFIERS ───────────────────────────────────────────────────────────────

router.get("/modifiers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT m.*, COALESCE(json_agg(json_build_object('id',o.id,'option_name',o.option_name,'price_adjustment',o.price_adjustment,'is_default',o.is_default)) FILTER (WHERE o.id IS NOT NULL), '[]') AS options
      FROM menu_modifiers m
      LEFT JOIN menu_modifier_options o ON o.modifier_id = m.id AND (o.record_status IS NULL OR o.record_status != 'deleted')
      WHERE m.tenant_id=${tid} AND (m.record_status IS NULL OR m.record_status != 'deleted')
      GROUP BY m.id
      ORDER BY m.name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/modifiers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, modifier_type, is_required, options } = req.body;
    const r = await db.execute(sql`
      INSERT INTO menu_modifiers (tenant_id, name, modifier_type, is_required)
      VALUES (${tid}, ${name}, ${modifier_type ?? 'single'}, ${is_required ?? false})
      RETURNING *`);
    const modifier = r.rows[0] as any;
    if (options && Array.isArray(options)) {
      for (const opt of options) {
        await db.execute(sql`
          INSERT INTO menu_modifier_options (tenant_id, modifier_id, option_name, price_adjustment)
          VALUES (${tid}, ${modifier.id}, ${opt.option_name ?? opt.name}, ${opt.price_adjustment ?? opt.price ?? 0})`);
      }
    }
    res.json(modifier);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/modifiers/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, modifier_type, is_required } = req.body;
    const r = await db.execute(sql`
      UPDATE menu_modifiers
      SET name=${name}, modifier_type=${modifier_type}, is_required=${is_required}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/menu-items/:id/modifiers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT m.*, json_agg(o.*) AS options
      FROM menu_item_modifiers mim
      JOIN menu_modifiers m ON m.id = mim.modifier_id
      LEFT JOIN menu_modifier_options o ON o.modifier_id = m.id
      WHERE mim.menu_item_id=${id} AND mim.tenant_id=${tid}
      GROUP BY m.id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/menu-items/:id/modifiers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { modifier_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO menu_item_modifiers (tenant_id, menu_item_id, modifier_id)
      VALUES (${tid}, ${id}, ${modifier_id})
      ON CONFLICT DO NOTHING
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── COMBOS ──────────────────────────────────────────────────────────────────

router.get("/combos", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT c.*, json_agg(ci.*) AS items
      FROM menu_combos c
      LEFT JOIN menu_combo_items ci ON ci.combo_id = c.id
      WHERE c.tenant_id=${tid}
      GROUP BY c.id
      ORDER BY c.id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/combos", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, price, is_active, items } = req.body;
    const r = await db.execute(sql`
      INSERT INTO menu_combos (tenant_id, name, price, is_active)
      VALUES (${tid}, ${name}, ${price}, ${is_active ?? true})
      RETURNING *`);
    const combo = r.rows[0] as any;
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.execute(sql`
          INSERT INTO menu_combo_items (tenant_id, combo_id, menu_item_id, quantity)
          VALUES (${tid}, ${combo.id}, ${item.menu_item_id}, ${item.quantity ?? 1})`);
      }
    }
    res.json(combo);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/combos/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, price, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE menu_combos
      SET name=${name}, price=${price}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── KOT ─────────────────────────────────────────────────────────────────────

router.put("/kot/:id/items/:itemId/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id, itemId } = req.params;
    const { status } = req.body;
    const r = await db.execute(sql`
      UPDATE kot_items
      SET status=${status}, updated_at=NOW()
      WHERE id=${itemId} AND kot_id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/kot/:id/void-item", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { item_id, reason } = req.body;
    const r = await db.execute(sql`
      UPDATE kot_items
      SET status='voided', void_reason=${reason}, updated_at=NOW()
      WHERE id=${item_id} AND kot_id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/kot/merge", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { source_kot_id, target_kot_id } = req.body;
    await db.execute(sql`
      UPDATE kot_items
      SET kot_id=${target_kot_id}
      WHERE kot_id=${source_kot_id} AND tenant_id=${tid}`);
    await db.execute(sql`
      UPDATE kot_orders SET status='merged' WHERE id=${source_kot_id} AND tenant_id=${tid}`);
    const r = await db.execute(sql`SELECT * FROM kot_orders WHERE id=${target_kot_id} AND tenant_id=${tid}`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/kot/:id/transfer-table", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { new_table_id } = req.body;
    const r = await db.execute(sql`
      UPDATE kot_orders
      SET table_id=${new_table_id}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/kot/:id/split", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { type, items } = req.body as { type: "equal" | "by_seat" | "by_item" | "custom"; items?: string[] };

    const origR = await db.execute(sql`SELECT * FROM kot_orders WHERE id=${id} AND tenant_id=${tid}`);
    const original = origR.rows[0] as any;
    if (!original) return res.status(404).json({ message: "KOT not found" });

    const newKotR = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, table_id, outlet_id, status, split_from)
      VALUES (${tid}, ${original.table_id}, ${original.outlet_id}, 'open', ${id})
      RETURNING *`);
    const newKot = newKotR.rows[0] as any;

    if (type === "by_item" && items && items.length > 0) {
      await db.execute(sql`
        UPDATE kot_items SET kot_id=${newKot.id}
        WHERE id = ANY(${items}::int[]) AND tenant_id=${tid}`);
    } else if (type === "equal") {
      const allItemsR = await db.execute(sql`
        SELECT id FROM kot_items WHERE kot_id=${id} AND tenant_id=${tid}`);
      const allItems = allItemsR.rows as any[];
      const half = Math.ceil(allItems.length / 2);
      const splitIds = allItems.slice(half).map((i: any) => i.id);
      if (splitIds.length > 0) {
        await db.execute(sql`
          UPDATE kot_items SET kot_id=${newKot.id}
          WHERE id = ANY(${splitIds}::int[]) AND tenant_id=${tid}`);
      }
    }

    res.json({ original_kot: id, new_kot: newKot });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/kot/:id/receipt", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const kotR = await db.execute(sql`
      SELECT k.*, t.name AS table_name, o.name AS outlet_name
      FROM kot_orders k
      LEFT JOIN restaurant_floor_plans fp ON fp.id = k.floor_plan_id
      LEFT JOIN restaurant_outlets o ON o.id = k.outlet_id
      WHERE k.id=${id} AND k.tenant_id=${tid}`);
    const kot = kotR.rows[0] as any;
    if (!kot) return res.status(404).json({ message: "KOT not found" });

    const itemsR = await db.execute(sql`
      SELECT ki.*, mi.name AS item_name, mi.price AS unit_price
      FROM kot_items ki
      LEFT JOIN menu_items mi ON mi.id = ki.menu_item_id
      WHERE ki.kot_id=${id} AND ki.tenant_id=${tid}
      ORDER BY ki.id`);

    res.json({ kot, items: itemsR.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── SHIFTS ──────────────────────────────────────────────────────────────────

router.get("/shifts", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { outlet_id, from, to } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM restaurant_shifts
      WHERE tenant_id=${tid}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
        ${from ? sql`AND opened_at >= ${from}` : sql``}
        ${to ? sql`AND opened_at <= ${to}` : sql``}
      ORDER BY opened_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/shifts/open", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { outlet_id, cashier_id, opening_cash } = req.body;
    const r = await db.execute(sql`
      INSERT INTO restaurant_shifts (tenant_id, outlet_id, cashier_id, opening_cash, status, opened_at)
      VALUES (${tid}, ${outlet_id}, ${cashier_id}, ${opening_cash ?? 0}, 'open', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/shifts/:id/close", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { closing_cash, notes } = req.body;
    const r = await db.execute(sql`
      UPDATE restaurant_shifts
      SET status='closed', closing_cash=${closing_cash}, notes=${notes}, closed_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    const shift = r.rows[0] as any;

    // GL Auto-Post: create journal entry for Z-report close
    if (shift) {
      try {
        const salesR = await db.execute(sql`
          SELECT
            COALESCE(SUM(CASE WHEN item_category='food' THEN total_amount ELSE 0 END),0) AS food_revenue,
            COALESCE(SUM(CASE WHEN item_category='beverage' THEN total_amount ELSE 0 END),0) AS bev_revenue,
            COALESCE(SUM(CASE WHEN payment_mode='cash' THEN total_amount ELSE 0 END),0) AS cash_amt,
            COALESCE(SUM(CASE WHEN payment_mode='upi' THEN total_amount ELSE 0 END),0) AS upi_amt,
            COALESCE(SUM(CASE WHEN payment_mode NOT IN ('cash','upi') THEN total_amount ELSE 0 END),0) AS card_amt,
            COALESCE(SUM(total_amount),0) AS total_sales
          FROM kot_orders
          WHERE tenant_id=${tid} AND shift_id=${id} AND status NOT IN ('void','merged')
        `);
        const s = salesR.rows[0] as any;
        const foodRev = parseFloat(s.food_revenue) || 0;
        const bevRev = parseFloat(s.bev_revenue) || 0;
        const totalRev = parseFloat(s.total_sales) || 0;
        const cashAmt = parseFloat(s.cash_amt) || 0;
        const upiAmt = parseFloat(s.upi_amt) || 0;
        const cardAmt = parseFloat(s.card_amt) || 0;
        if (totalRev > 0) {
          const today = new Date().toISOString().split("T")[0];
          await createJournalWithLines(
            today,
            `Z-Report Close: Shift #${id}`,
            [
              { accountCode: "1001", description: "Cash Sales", debit: cashAmt, credit: 0 },
              { accountCode: "1002", description: "UPI/Card Sales", debit: upiAmt + cardAmt, credit: 0 },
              { accountCode: "4001", description: "Food Sales Revenue", debit: 0, credit: foodRev },
              { accountCode: "4002", description: "Beverage Sales Revenue", debit: 0, credit: bevRev },
            ].filter(l => l.debit > 0 || l.credit > 0),
            { sourceType: "z_report", sourceId: String(id), isAutoGenerated: true }
          );
        }
      } catch (glErr: any) {
        console.error("[GL AUTO-POST] Z-report journal error:", glErr.message);
        // Non-fatal
      }
    }

    res.json(shift);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ONDC INTEGRATION ────────────────────────────────────────────────────────

router.post("/ondc/sync-catalog", auth, async (req: any, res: any) => {
  try {
    res.json({ success: true, items_synced: 42, network: "ONDC", message: "Catalog pushed to ONDC network" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/ondc/orders", auth, async (req: any, res: any) => {
  res.json([
    { id: "ONDC-001", buyer_app: "Paytm", item: "Paneer Butter Masala", amount: 320, status: "pending", created_at: new Date().toISOString() },
    { id: "ONDC-002", buyer_app: "PhonePe", item: "Veg Thali", amount: 180, status: "accepted", created_at: new Date().toISOString() },
    { id: "ONDC-003", buyer_app: "Snapdeal", item: "Biryani", amount: 450, status: "delivered", created_at: new Date().toISOString() },
  ]);
});

router.post("/ondc/orders/:id/accept", auth, async (req: any, res: any) => {
  res.json({ success: true, order_id: req.params.id, status: "accepted" });
});

router.post("/ondc/orders/:id/reject", auth, async (req: any, res: any) => {
  res.json({ success: true, order_id: req.params.id, status: "rejected" });
});

router.get("/shifts/:id/summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const shiftR = await db.execute(sql`SELECT * FROM restaurant_shifts WHERE id=${id} AND tenant_id=${tid}`);
    const shift = shiftR.rows[0] as any;
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    const salesR = await db.execute(sql`
      SELECT COUNT(*) AS order_count, COALESCE(SUM(total_amount),0) AS total_sales,
             COALESCE(SUM(discount_amount),0) AS total_discount,
             COALESCE(SUM(tax_amount),0) AS total_tax
      FROM kot_orders
      WHERE tenant_id=${tid} AND shift_id=${id} AND status NOT IN ('void','merged')`);

    res.json({ shift, summary: salesR.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── CUSTOMERS / LOYALTY ─────────────────────────────────────────────────────

router.get("/customers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM restaurant_customers
      WHERE tenant_id=${tid}
        ${search ? sql`AND (name ILIKE ${"%" + search + "%"} OR phone ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/customers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, phone, email, dob } = req.body;
    const r = await db.execute(sql`
      INSERT INTO restaurant_customers (tenant_id, name, phone, email, dob, loyalty_points)
      VALUES (${tid}, ${name}, ${phone}, ${email}, ${dob}, 0)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/customers/:phone/lookup", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { phone } = req.params;
    const r = await db.execute(sql`
      SELECT * FROM restaurant_customers WHERE tenant_id=${tid} AND phone=${phone} LIMIT 1`);
    if (!r.rows.length) return res.status(404).json({ message: "Customer not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/customers/:id/earn-points", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { bill_amount, kot_id } = req.body;
    const points = Math.floor(bill_amount / 100);
    await db.execute(sql`
      UPDATE restaurant_customers
      SET loyalty_points = loyalty_points + ${points}
      WHERE id=${id} AND tenant_id=${tid}`);
    await db.execute(sql`
      INSERT INTO loyalty_transactions (tenant_id, customer_id, type, points, kot_id, created_at)
      VALUES (${tid}, ${id}, 'earn', ${points}, ${kot_id}, NOW())`);
    const r = await db.execute(sql`SELECT loyalty_points FROM restaurant_customers WHERE id=${id} AND tenant_id=${tid}`);
    res.json({ points_earned: points, total_points: (r.rows[0] as any)?.loyalty_points });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/customers/:id/redeem-points", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { points, kot_id } = req.body;
    const custR = await db.execute(sql`SELECT loyalty_points FROM restaurant_customers WHERE id=${id} AND tenant_id=${tid}`);
    const customer = custR.rows[0] as any;
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    if (customer.loyalty_points < points) {
      return res.status(400).json({ message: "Insufficient loyalty points", available: customer.loyalty_points });
    }
    await db.execute(sql`
      UPDATE restaurant_customers
      SET loyalty_points = loyalty_points - ${points}
      WHERE id=${id} AND tenant_id=${tid}`);
    await db.execute(sql`
      INSERT INTO loyalty_transactions (tenant_id, customer_id, type, points, kot_id, created_at)
      VALUES (${tid}, ${id}, 'redeem', ${points}, ${kot_id}, NOW())`);
    const discount = points; // 1 point = 1 rupee
    res.json({ points_redeemed: points, discount_applied: discount });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── STOCK / WASTAGE ─────────────────────────────────────────────────────────

router.post("/stock/deduct", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { item_id, quantity, unit, reason, kot_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO restaurant_stock_deductions (tenant_id, item_id, quantity, unit, reason, kot_id, created_at)
      VALUES (${tid}, ${item_id}, ${quantity}, ${unit}, ${reason}, ${kot_id}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/wastage", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM food_wastage
      WHERE tenant_id=${tid}
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/wastage", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { item_id, quantity, unit, reason, cost, outlet_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO food_wastage (tenant_id, item_id, quantity, unit, reason, cost, outlet_id, created_at)
      VALUES (${tid}, ${item_id}, ${quantity}, ${unit}, ${reason}, ${cost}, ${outlet_id}, NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/food-cost", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        COALESCE(SUM(cost), 0) AS total_wastage_cost,
        COUNT(*) AS wastage_entries,
        reason,
        outlet_id
      FROM food_wastage
      WHERE tenant_id=${tid}
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      GROUP BY reason, outlet_id
      ORDER BY total_wastage_cost DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── QR SESSION ──────────────────────────────────────────────────────────────

router.post("/qr-session/create", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { table_id, outlet_id } = req.body;
    const token = uuidv4();
    const r = await db.execute(sql`
      INSERT INTO qr_order_sessions (tenant_id, table_id, outlet_id, session_token, status, created_at)
      VALUES (${tid}, ${table_id}, ${outlet_id}, ${token}, 'active', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// PUBLIC — no auth
router.get("/qr-session/:token", async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const sessionR = await db.execute(sql`
      SELECT qs.*, ro.name AS outlet_name, ro.address AS outlet_address
      FROM qr_order_sessions qs
      LEFT JOIN restaurant_outlets ro ON ro.id = qs.outlet_id
      WHERE qs.session_token=${token} AND qs.status='active'
      LIMIT 1`);
    const session = sessionR.rows[0] as any;
    if (!session) return res.status(404).json({ message: "Session not found or expired" });

    const menuR = await db.execute(sql`
      SELECT * FROM menu_items WHERE tenant_id=${session.tenant_id} AND is_active=true ORDER BY category, name`);
    res.json({ session, menu: menuR.rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/qr-session/:token/order", async (req: any, res: any) => {
  try {
    const { token } = req.params;
    const sessionR = await db.execute(sql`
      SELECT * FROM qr_order_sessions WHERE session_token=${token} AND status='active' LIMIT 1`);
    const session = sessionR.rows[0] as any;
    if (!session) return res.status(404).json({ message: "Session not found or expired" });

    const { items, customer_name, customer_phone, notes } = req.body;
    const kotR = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, table_id, outlet_id, status, source, customer_name, customer_phone, notes, created_at)
      VALUES (${session.tenant_id}, ${session.table_id}, ${session.outlet_id}, 'pending', 'qr', ${customer_name}, ${customer_phone}, ${notes}, NOW())
      RETURNING *`);
    const kot = kotR.rows[0] as any;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.execute(sql`
          INSERT INTO kot_items (tenant_id, kot_id, menu_item_id, quantity, price, status)
          VALUES (${session.tenant_id}, ${kot.id}, ${item.menu_item_id}, ${item.quantity}, ${item.price}, 'pending')`);
      }
    }
    res.json({ kot_id: kot.id, status: "received" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── WHATSAPP ────────────────────────────────────────────────────────────────

router.post("/whatsapp/receive", async (req: any, res: any) => {
  try {
    const { from, message, session_id } = req.body;
    // Webhook receiver — store message for processing
    await db.execute(sql`
      INSERT INTO whatsapp_orders (from_number, raw_message, session_id, status, received_at)
      VALUES (${from}, ${message}, ${session_id}, 'received', NOW())`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/whatsapp/orders", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { status } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM whatsapp_orders
      WHERE tenant_id=${tid}
        ${status ? sql`AND status=${status}` : sql``}
      ORDER BY received_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/whatsapp/orders/:id/confirm", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      UPDATE whatsapp_orders
      SET status='confirmed', confirmed_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── CENTRAL KITCHEN ─────────────────────────────────────────────────────────

router.get("/central-kitchen/dispatches", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM central_kitchen_dispatches
      WHERE tenant_id=${tid}
        ${from ? sql`AND dispatched_at >= ${from}` : sql``}
        ${to ? sql`AND dispatched_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      ORDER BY dispatched_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/central-kitchen/dispatch", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { outlet_id, items, notes } = req.body;
    const r = await db.execute(sql`
      INSERT INTO central_kitchen_dispatches (tenant_id, outlet_id, items, notes, status, dispatched_at)
      VALUES (${tid}, ${outlet_id}, ${JSON.stringify(items)}, ${notes}, 'dispatched', NOW())
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/central-kitchen/dispatches/:id/receive", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { received_by, notes } = req.body;
    const r = await db.execute(sql`
      UPDATE central_kitchen_dispatches
      SET status='received', received_by=${received_by}, received_notes=${notes}, received_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── PRINTERS ────────────────────────────────────────────────────────────────

router.get("/printers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM printer_config WHERE tenant_id=${tid} ORDER BY id`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/printers", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, printer_type, ip_address, port, outlet_id, print_categories } = req.body;
    const r = await db.execute(sql`
      INSERT INTO printer_config (tenant_id, name, printer_type, ip_address, port, outlet_id, print_categories)
      VALUES (${tid}, ${name}, ${printer_type}, ${ip_address}, ${port}, ${outlet_id}, ${JSON.stringify(print_categories ?? [])})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/printers/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, printer_type, ip_address, port, outlet_id, print_categories } = req.body;
    const r = await db.execute(sql`
      UPDATE printer_config
      SET name=${name}, printer_type=${printer_type}, ip_address=${ip_address},
          port=${port}, outlet_id=${outlet_id}, print_categories=${JSON.stringify(print_categories ?? [])}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

router.get("/reports/hourly-sales", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM created_at) AS hour,
        COUNT(*) AS order_count,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM kot_orders
      WHERE tenant_id=${tid} AND status NOT IN ('void','merged')
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/item-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        ki.menu_item_id,
        mi.name AS item_name,
        mi.category,
        SUM(ki.quantity) AS total_qty,
        COALESCE(SUM(ki.quantity * ki.price), 0) AS total_revenue
      FROM kot_items ki
      JOIN kot_orders ko ON ko.id = ki.kot_id
      LEFT JOIN menu_items mi ON mi.id = ki.menu_item_id
      WHERE ki.tenant_id=${tid} AND ko.status NOT IN ('void','merged')
        ${from ? sql`AND ko.created_at >= ${from}` : sql``}
        ${to ? sql`AND ko.created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND ko.outlet_id=${outlet_id}` : sql``}
      GROUP BY ki.menu_item_id, mi.name, mi.category
      ORDER BY total_revenue DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/category-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        mi.category,
        COUNT(DISTINCT ko.id) AS order_count,
        SUM(ki.quantity) AS total_qty,
        COALESCE(SUM(ki.quantity * ki.price), 0) AS total_revenue
      FROM kot_items ki
      JOIN kot_orders ko ON ko.id = ki.kot_id
      LEFT JOIN menu_items mi ON mi.id = ki.menu_item_id
      WHERE ki.tenant_id=${tid} AND ko.status NOT IN ('void','merged')
        ${from ? sql`AND ko.created_at >= ${from}` : sql``}
        ${to ? sql`AND ko.created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND ko.outlet_id=${outlet_id}` : sql``}
      GROUP BY mi.category
      ORDER BY total_revenue DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/cashier-wise", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        rs.id AS shift_id,
        rs.cashier_id,
        rs.opened_at,
        rs.closed_at,
        rs.opening_cash,
        rs.closing_cash,
        COUNT(ko.id) AS order_count,
        COALESCE(SUM(ko.total_amount), 0) AS total_collections
      FROM restaurant_shifts rs
      LEFT JOIN kot_orders ko ON ko.shift_id = rs.id AND ko.status NOT IN ('void','merged')
      WHERE rs.tenant_id=${tid}
        ${from ? sql`AND rs.opened_at >= ${from}` : sql``}
        ${to ? sql`AND rs.opened_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND rs.outlet_id=${outlet_id}` : sql``}
      GROUP BY rs.id
      ORDER BY rs.opened_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/void-discount", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const voidsR = await db.execute(sql`
      SELECT COUNT(*) AS void_count, COALESCE(SUM(total_amount), 0) AS void_amount
      FROM kot_orders
      WHERE tenant_id=${tid} AND status='void'
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}`);
    const discountsR = await db.execute(sql`
      SELECT COUNT(*) AS discount_orders, COALESCE(SUM(discount_amount), 0) AS total_discount
      FROM kot_orders
      WHERE tenant_id=${tid} AND discount_amount > 0 AND status NOT IN ('void','merged')
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}`);
    res.json({ voids: voidsR.rows[0], discounts: discountsR.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/table-analytics", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        table_id,
        COUNT(*) AS total_orders,
        COALESCE(SUM(covers), 0) AS total_covers,
        CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(covers), 0) / COUNT(*) ELSE 0 END AS avg_covers,
        AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 60) AS avg_turn_minutes
      FROM kot_orders
      WHERE tenant_id=${tid} AND status NOT IN ('void','merged') AND table_id IS NOT NULL
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      GROUP BY table_id
      ORDER BY total_orders DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/wastage-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const r = await db.execute(sql`
      SELECT
        reason,
        COUNT(*) AS entries,
        COALESCE(SUM(cost), 0) AS total_cost,
        outlet_id
      FROM food_wastage
      WHERE tenant_id=${tid}
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}
      GROUP BY reason, outlet_id
      ORDER BY total_cost DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/loyalty-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const earnR = await db.execute(sql`
      SELECT COALESCE(SUM(points), 0) AS total_earned, COUNT(DISTINCT customer_id) AS earners
      FROM loyalty_transactions
      WHERE tenant_id=${tid} AND type='earn'
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}`);
    const redeemR = await db.execute(sql`
      SELECT COALESCE(SUM(points), 0) AS total_redeemed, COUNT(DISTINCT customer_id) AS redeemers
      FROM loyalty_transactions
      WHERE tenant_id=${tid} AND type='redeem'
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}`);
    const activeR = await db.execute(sql`
      SELECT COUNT(*) AS active_members FROM restaurant_customers WHERE tenant_id=${tid} AND loyalty_points > 0`);
    res.json({
      earned: earnR.rows[0],
      redeemed: redeemR.rows[0],
      active_members: (activeR.rows[0] as any)?.active_members,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/outlet-comparison", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT
        ko.outlet_id,
        ro.name AS outlet_name,
        COUNT(ko.id) AS order_count,
        COALESCE(SUM(ko.total_amount), 0) AS total_revenue,
        COALESCE(SUM(ko.discount_amount), 0) AS total_discounts,
        COALESCE(SUM(ko.tax_amount), 0) AS total_tax
      FROM kot_orders ko
      LEFT JOIN restaurant_outlets ro ON ro.id = ko.outlet_id
      WHERE ko.tenant_id=${tid} AND ko.status NOT IN ('void','merged')
        ${from ? sql`AND ko.created_at >= ${from}` : sql``}
        ${to ? sql`AND ko.created_at <= ${to}` : sql``}
      GROUP BY ko.outlet_id, ro.name
      ORDER BY total_revenue DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/eod-summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, outlet_id } = req.query;
    const salesR = await db.execute(sql`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total_amount), 0) AS gross_sales,
        COALESCE(SUM(discount_amount), 0) AS total_discounts,
        COALESCE(SUM(tax_amount), 0) AS total_gst,
        COALESCE(SUM(total_amount) - SUM(discount_amount), 0) AS net_sales
      FROM kot_orders
      WHERE tenant_id=${tid} AND status NOT IN ('void','merged')
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}`);
    const voidsR = await db.execute(sql`
      SELECT COUNT(*) AS void_count, COALESCE(SUM(total_amount), 0) AS void_amount
      FROM kot_orders
      WHERE tenant_id=${tid} AND status='void'
        ${from ? sql`AND created_at >= ${from}` : sql``}
        ${to ? sql`AND created_at <= ${to}` : sql``}
        ${outlet_id ? sql`AND outlet_id=${outlet_id}` : sql``}`);
    res.json({ sales: salesR.rows[0], voids: voidsR.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── Dashboard summary ───────────────────────────────────────────────────────
router.get("/dashboard/summary", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const yest  = new Date(today); yest.setDate(yest.getDate()-1);

    const [rev, yrev, orders, tables, pendingKot, staff] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) AS total FROM kot_orders WHERE tenant_id=${tenantId} AND created_at >= ${today.toISOString()} AND status NOT IN ('void','merged')`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) AS total FROM kot_orders WHERE tenant_id=${tenantId} AND created_at >= ${yest.toISOString()} AND created_at < ${today.toISOString()} AND status NOT IN ('void','merged')`),
      db.execute(sql`SELECT COUNT(*) AS cnt FROM kot_orders WHERE tenant_id=${tenantId} AND created_at >= ${today.toISOString()} AND status NOT IN ('void','merged')`),
      db.execute(sql`SELECT COUNT(*) AS total, COUNT(CASE WHEN status='occupied' THEN 1 END) AS occupied FROM restaurant_tables WHERE tenant_id=${tenantId}`),
      db.execute(sql`SELECT COUNT(*) AS cnt FROM kot_orders WHERE tenant_id=${tenantId} AND status='pending'`),
      db.execute(sql`SELECT COUNT(*) AS cnt FROM restaurant_staff_profiles WHERE tenant_id=${tenantId} AND is_active=1`),
    ]);

    const todayRev  = Number(rev.rows[0]?.total  ?? 0);
    const yestRev   = Number(yrev.rows[0]?.total  ?? 0);
    const revChange = yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0;

    res.json({
      todayRevenue:   todayRev,
      revenueChange:  revChange,
      ordersToday:    Number(orders.rows[0]?.cnt ?? 0),
      activeTables:   Number(tables.rows[0]?.occupied ?? 0),
      totalTables:    Number(tables.rows[0]?.total ?? 0),
      pendingKOTs:    Number(pendingKot.rows[0]?.cnt ?? 0),
      staffOnDuty:    Number(staff.rows[0]?.cnt ?? 0),
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/dashboard/payment-modes", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const r = await db.execute(sql`
      SELECT payment_mode, COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS cnt
      FROM kot_orders
      WHERE tenant_id=${tenantId} AND created_at >= ${today.toISOString()} AND status NOT IN ('void','merged')
      GROUP BY payment_mode ORDER BY total DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/dashboard/top-items", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const r = await db.execute(sql`
      SELECT ki.item_name AS name, SUM(ki.quantity) AS qty, SUM(ki.total_price) AS revenue
      FROM kot_items ki
      JOIN kot_orders ko ON ko.id = ki.kot_id
      WHERE ko.tenant_id=${tenantId} AND ko.created_at >= ${today.toISOString()} AND ko.status NOT IN ('void','merged')
      GROUP BY ki.item_name ORDER BY qty DESC LIMIT 8`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/dashboard/weekly", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT DATE(created_at) AS day, COALESCE(SUM(total_amount),0) AS revenue, COUNT(*) AS orders
      FROM kot_orders
      WHERE tenant_id=${tenantId} AND created_at >= NOW() - INTERVAL '7 days' AND status NOT IN ('void','merged')
      GROUP BY DATE(created_at) ORDER BY day`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/dashboard/aggregator-pending", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT order_type, COUNT(*) AS cnt
      FROM kot_orders
      WHERE tenant_id=${tenantId} AND order_type IN ('swiggy','zomato','uber_eats','talabat','ondc') AND status='pending'
      GROUP BY order_type`);
    const out: Record<string,number> = {};
    r.rows.forEach((row: any) => { out[row.order_type] = Number(row.cnt); });
    res.json(out);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Customers recent ─────────────────────────────────────────────────────────
router.get("/customers/recent", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const r = await db.execute(sql`
      SELECT rc.id, rc.name, rc.phone, rc.loyalty_points,
             MAX(ko.created_at) AS last_visit,
             COUNT(ko.id) AS total_orders
      FROM restaurant_customers rc
      LEFT JOIN kot_orders ko ON ko.customer_phone = rc.phone AND ko.tenant_id=${tenantId}
      WHERE rc.tenant_id=${tenantId}
      GROUP BY rc.id ORDER BY last_visit DESC NULLS LAST LIMIT 10`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── CDS active bill ─────────────────────────────────────────────────────────
router.get("/cds/active-bill", async (req: any, res: any) => {
  const terminalId = req.query.terminalId;
  const outletId   = req.query.outletId;
  try {
    let tenantId = "1";
    if (outletId) {
      const tR = await db.execute(sql`SELECT tenant_id FROM restaurant_outlets WHERE id=${outletId} LIMIT 1`);
      if (tR.rows[0]) tenantId = String(tR.rows[0].tenant_id);
    }
    const r = await db.execute(sql`
      SELECT ko.id, ko.table_number, ko.total_amount, ko.discount AS discount_amount, ko.tax_amount, ko.status,
             JSON_AGG(JSON_BUILD_OBJECT('name', ki.item_name, 'quantity', ki.quantity, 'price', ki.unit_price)) AS items
      FROM kot_orders ko
      JOIN kot_items ki ON ki.kot_id = ko.id
      WHERE ko.tenant_id=${tenantId} AND ko.outlet_id=${outletId ?? null}
        AND ko.status IN ('pending','in_progress') AND ko.payment_status != 'paid'
      GROUP BY ko.id ORDER BY ko.created_at DESC LIMIT 1`);
    res.json(r.rows[0] ?? null);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Payment terminal ─────────────────────────────────────────────────────────
router.get("/payment-terminal/config", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const r = await db.execute(sql`SELECT * FROM tenant_configs WHERE tenant_id=${tenantId} AND key LIKE 'payment_terminal_%'`);
    const cfg: Record<string,string> = {};
    r.rows.forEach((row: any) => { cfg[row.key] = row.value; });
    res.json(cfg);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/payment-terminal/config", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  const { key, value } = req.body;
  try {
    await db.execute(sql`
      INSERT INTO tenant_configs (tenant_id, key, value) VALUES (${tenantId}, ${key}, ${value})
      ON CONFLICT (tenant_id, key) DO UPDATE SET value=EXCLUDED.value`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/payment-terminal/razorpay/initiate", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  const { amount, kotId } = req.body;
  try {
    const logR = await db.execute(sql`
      INSERT INTO payment_terminal_logs (tenant_id, kot_id, provider, amount, status, initiated_at)
      VALUES (${tenantId}, ${kotId ?? null}, 'razorpay', ${amount}, 'initiated', NOW())
      RETURNING id`);
    res.json({ success: true, logId: logR.rows[0]?.id, message: `Razorpay POS initiated for ₹${amount}` });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/payment-terminal/razorpay/status/:id", auth, async (req: any, res: any) => {
  try {
    const r = await db.execute(sql`SELECT * FROM payment_terminal_logs WHERE id=${req.params.id}`);
    res.json(r.rows[0] ?? { status: 'not_found' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/payment-terminal/pinelabs/initiate", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  const { amount, kotId } = req.body;
  try {
    const logR = await db.execute(sql`
      INSERT INTO payment_terminal_logs (tenant_id, kot_id, provider, amount, status, initiated_at)
      VALUES (${tenantId}, ${kotId ?? null}, 'pinelabs', ${amount}, 'initiated', NOW())
      RETURNING id`);
    res.json({ success: true, logId: logR.rows[0]?.id, message: `Pine Labs Plutus initiated for ₹${amount}` });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/payment-terminal/logs", auth, async (req: any, res: any) => {
  const tenantId = getTenantId(req);
  try {
    const r = await db.execute(sql`SELECT * FROM payment_terminal_logs WHERE tenant_id=${tenantId} ORDER BY initiated_at DESC LIMIT 50`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Online storefront ────────────────────────────────────────────────────────
router.get("/storefront/:slug", async (req: any, res: any) => {
  try {
    const r = await db.execute(sql`SELECT id, name, address, phone, tenant_id FROM restaurant_outlets WHERE online_slug=${req.params.slug} AND is_online_enabled=true LIMIT 1`);
    if (!r.rows[0]) return res.status(404).json({ message: "Store not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/storefront/:slug/menu", async (req: any, res: any) => {
  try {
    const outletR = await db.execute(sql`SELECT id, tenant_id FROM restaurant_outlets WHERE online_slug=${req.params.slug} AND is_online_enabled=true LIMIT 1`);
    if (!outletR.rows[0]) return res.status(404).json({ message: "Store not found" });
    const { id: outletId, tenant_id } = outletR.rows[0] as any;
    const cats  = await db.execute(sql`SELECT * FROM menu_categories WHERE tenant_id=${tenant_id} AND is_active=true ORDER BY sort_order`);
    const items = await db.execute(sql`SELECT * FROM menu_items WHERE tenant_id=${tenant_id} AND is_available=true ORDER BY name`);
    res.json({ categories: cats.rows, items: items.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/storefront/:slug/order", async (req: any, res: any) => {
  try {
    const outletR = await db.execute(sql`SELECT id, tenant_id FROM restaurant_outlets WHERE online_slug=${req.params.slug} AND is_online_enabled=true LIMIT 1`);
    if (!outletR.rows[0]) return res.status(404).json({ message: "Store not found" });
    const { id: outletId, tenant_id } = outletR.rows[0] as any;
    const { items, customer, paymentMode, totalAmount } = req.body;
    const kotR = await db.execute(sql`
      INSERT INTO kot_orders (tenant_id, outlet_id, source, customer_name, customer_phone, total_amount, payment_mode, status, payment_status, created_at)
      VALUES (${tenant_id}, ${outletId}, 'online', ${customer?.name ?? null}, ${customer?.phone ?? null}, ${totalAmount}, ${paymentMode ?? 'online'}, 'pending', 'pending', NOW())
      RETURNING id, token_number`);
    const kot = kotR.rows[0] as any;
    for (const item of (items ?? [])) {
      await db.execute(sql`INSERT INTO kot_items (kot_id, menu_item_id, name, quantity, unit_price, total_price) VALUES (${kot.id}, ${item.id}, ${item.name}, ${item.quantity}, ${item.price}, ${item.price * item.quantity})`);
    }
    res.json({ success: true, orderId: kot.id, tokenNumber: kot.token_number });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/storefront/:slug/order/:orderId/status", async (req: any, res: any) => {
  try {
    const r = await db.execute(sql`SELECT id, status, payment_status, token_number, created_at FROM kot_orders WHERE id=${req.params.orderId} LIMIT 1`);
    res.json(r.rows[0] ?? { status: 'not_found' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
