import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Room Types ───────────────────────────────────────────────────────────────
router.get("/room-types", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM hotel_room_types WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/room-types", requireAuth, async (req: any, res) => {
  try {
    const { name, description, base_price, max_occupancy, amenities } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO hotel_room_types (tenant_id, name, description, base_price, max_occupancy, amenities)
      VALUES (${tid(req)}, ${name}, ${description||null}, ${base_price||0}, ${max_occupancy||2}, ${amenities||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/room-types/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, description, base_price, max_occupancy, amenities } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_room_types SET name=${name}, description=${description||null},
        base_price=${base_price||0}, max_occupancy=${max_occupancy||2}, amenities=${amenities||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/room-types/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_room_types WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Rooms ────────────────────────────────────────────────────────────────────
router.get("/rooms", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT r.*, rt.name as room_type_name, rt.base_price
      FROM hotel_rooms r
      LEFT JOIN hotel_room_types rt ON rt.id=r.room_type_id
      WHERE r.tenant_id=${tid(req)} ORDER BY r.room_number`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/rooms", requireAuth, async (req: any, res) => {
  try {
    const { room_number, room_type_id, floor, status, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO hotel_rooms (tenant_id, room_number, room_type_id, floor, status, notes)
      VALUES (${tid(req)}, ${room_number}, ${room_type_id||null}, ${floor||null}, ${status||'available'}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/rooms/:id", requireAuth, async (req: any, res) => {
  try {
    const { room_number, room_type_id, floor, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_rooms SET room_number=${room_number}, room_type_id=${room_type_id||null},
        floor=${floor||null}, status=${status||'available'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/rooms/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_rooms WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Guests ───────────────────────────────────────────────────────────────────
router.get("/guests", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM hotel_guests WHERE tenant_id=${tid(req)} ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/guests", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, id_type, id_number, nationality, notes } = req.body;
    const code = "GST-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO hotel_guests (tenant_id, guest_code, name, phone, email, address, id_type, id_number, nationality, notes)
      VALUES (${tid(req)}, ${code}, ${name}, ${phone||null}, ${email||null}, ${address||null},
              ${id_type||null}, ${id_number||null}, ${nationality||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/guests/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, phone, email, address, id_type, id_number, nationality, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_guests SET name=${name}, phone=${phone||null}, email=${email||null},
        address=${address||null}, id_type=${id_type||null}, id_number=${id_number||null},
        nationality=${nationality||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/guests/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_guests WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Reservations ─────────────────────────────────────────────────────────────
router.get("/reservations", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT rv.*, g.name as guest_name, g.phone as guest_phone,
             r.room_number, rt.name as room_type_name
      FROM hotel_reservations rv
      LEFT JOIN hotel_guests g ON g.id=rv.guest_id
      LEFT JOIN hotel_rooms r ON r.id=rv.room_id
      LEFT JOIN hotel_room_types rt ON rt.id=r.room_type_id
      WHERE rv.tenant_id=${tid(req)} ORDER BY rv.check_in_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations", requireAuth, async (req: any, res) => {
  try {
    const { guest_id, room_id, check_in_date, check_out_date, adults, children, rate_per_night, total_amount, advance_paid, payment_mode, source, notes } = req.body;
    const no = "RES-" + Date.now();
    const rows = await db.execute(sql`
      INSERT INTO hotel_reservations (tenant_id, reservation_no, guest_id, room_id, check_in_date, check_out_date,
        adults, children, rate_per_night, total_amount, advance_paid, payment_mode, source, notes)
      VALUES (${tid(req)}, ${no}, ${guest_id}, ${room_id}, ${check_in_date}, ${check_out_date},
        ${adults||1}, ${children||0}, ${rate_per_night||0}, ${total_amount||0}, ${advance_paid||0},
        ${payment_mode||null}, ${source||'direct'}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/reservations/:id", requireAuth, async (req: any, res) => {
  try {
    const { guest_id, room_id, check_in_date, check_out_date, adults, children, rate_per_night, total_amount, advance_paid, payment_mode, source, status, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_reservations SET guest_id=${guest_id}, room_id=${room_id},
        check_in_date=${check_in_date}, check_out_date=${check_out_date},
        adults=${adults||1}, children=${children||0}, rate_per_night=${rate_per_night||0},
        total_amount=${total_amount||0}, advance_paid=${advance_paid||0},
        payment_mode=${payment_mode||null}, source=${source||'direct'},
        status=${status||'confirmed'}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/checkin", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      UPDATE hotel_reservations SET status='checked_in', actual_check_in=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    if (rows.rows[0]?.room_id) {
      await db.execute(sql`UPDATE hotel_rooms SET status='occupied' WHERE id=${rows.rows[0].room_id}`);
    }
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/checkout", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      UPDATE hotel_reservations SET status='checked_out', actual_check_out=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    if (rows.rows[0]?.room_id) {
      await db.execute(sql`UPDATE hotel_rooms SET status='available' WHERE id=${rows.rows[0].room_id}`);
    }
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/reservations/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE hotel_reservations SET status='cancelled' WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Folios ───────────────────────────────────────────────────────────────────
router.get("/folios", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT f.*, g.name as guest_name, r.room_number
      FROM hotel_folios f
      LEFT JOIN hotel_guests g ON g.id=f.guest_id
      LEFT JOIN hotel_rooms r ON r.id=f.room_id
      WHERE f.tenant_id=${tid(req)} ORDER BY f.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/folios/:id/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM hotel_folio_items WHERE folio_id=${req.params.id} ORDER BY created_at`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/folios", requireAuth, async (req: any, res) => {
  try {
    const { reservation_id, guest_id, room_id, total_amount, paid_amount, payment_mode, notes, items } = req.body;
    const no = "FOL-" + Date.now();
    const bal = (total_amount||0) - (paid_amount||0);
    const st = bal <= 0 ? 'paid' : paid_amount > 0 ? 'partial' : 'open';
    const folio = await db.execute(sql`
      INSERT INTO hotel_folios (tenant_id, folio_number, reservation_id, guest_id, room_id, total_amount, paid_amount, balance_amount, payment_mode, status, notes)
      VALUES (${tid(req)}, ${no}, ${reservation_id||null}, ${guest_id||null}, ${room_id||null},
              ${total_amount||0}, ${paid_amount||0}, ${bal}, ${payment_mode||null}, ${st}, ${notes||null})
      RETURNING *`);
    const fId = folio.rows[0].id;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO hotel_folio_items (folio_id, description, quantity, rate, amount, category)
          VALUES (${fId}, ${it.description}, ${it.quantity||1}, ${it.rate||0}, ${it.amount||0}, ${it.category||'room'})`);
      }
    }
    res.json(folio.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/folios/:id", requireAuth, async (req: any, res) => {
  try {
    const { total_amount, paid_amount, payment_mode, status, notes } = req.body;
    const bal = (total_amount||0) - (paid_amount||0);
    const st = status || (bal <= 0 ? 'paid' : paid_amount > 0 ? 'partial' : 'open');
    const rows = await db.execute(sql`
      UPDATE hotel_folios SET total_amount=${total_amount||0}, paid_amount=${paid_amount||0},
        balance_amount=${bal}, payment_mode=${payment_mode||null}, status=${st}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Housekeeping ─────────────────────────────────────────────────────────────
router.get("/housekeeping", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT h.*, r.room_number
      FROM hotel_housekeeping h
      LEFT JOIN hotel_rooms r ON r.id=h.room_id
      WHERE h.tenant_id=${tid(req)} ORDER BY h.scheduled_date DESC, h.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/housekeeping", requireAuth, async (req: any, res) => {
  try {
    const { room_id, task_type, assigned_to, scheduled_date, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO hotel_housekeeping (tenant_id, room_id, task_type, assigned_to, scheduled_date, notes)
      VALUES (${tid(req)}, ${room_id}, ${task_type||'cleaning'}, ${assigned_to||null}, ${scheduled_date||null}, ${notes||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/housekeeping/:id", requireAuth, async (req: any, res) => {
  try {
    const { room_id, task_type, assigned_to, scheduled_date, status, completed_at, notes } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_housekeeping SET room_id=${room_id}, task_type=${task_type||'cleaning'},
        assigned_to=${assigned_to||null}, scheduled_date=${scheduled_date||null},
        status=${status||'pending'}, completed_at=${completed_at||null}, notes=${notes||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/housekeeping/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_housekeeping WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Channel Rates ─────────────────────────────────────────────────────────────
router.get("/channel-rates", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT cr.*, rt.name as room_type_name
      FROM hotel_channel_rates cr
      LEFT JOIN hotel_room_types rt ON rt.id=cr.room_type_id
      WHERE cr.tenant_id=${tid(req)} ORDER BY cr.channel_name, rt.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/channel-rates", requireAuth, async (req: any, res) => {
  try {
    const { room_type_id, channel_name, rate, valid_from, valid_to } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO hotel_channel_rates (tenant_id, room_type_id, channel_name, rate, valid_from, valid_to)
      VALUES (${tid(req)}, ${room_type_id}, ${channel_name}, ${rate||0}, ${valid_from||null}, ${valid_to||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/channel-rates/:id", requireAuth, async (req: any, res) => {
  try {
    const { room_type_id, channel_name, rate, valid_from, valid_to } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_channel_rates SET room_type_id=${room_type_id}, channel_name=${channel_name},
        rate=${rate||0}, valid_from=${valid_from||null}, valid_to=${valid_to||null}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/channel-rates/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_channel_rates WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [rooms, checkedIn, reservations, revenue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available FROM hotel_rooms WHERE tenant_id=${tid(req)}`),
      db.execute(sql`SELECT COUNT(*) as count FROM hotel_reservations WHERE tenant_id=${tid(req)} AND status='checked_in'`),
      db.execute(sql`SELECT COUNT(*) as count FROM hotel_reservations WHERE tenant_id=${tid(req)} AND status='confirmed'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM hotel_folios WHERE tenant_id=${tid(req)} AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM CURRENT_DATE)`),
    ]);
    res.json({
      totalRooms: Number(rooms.rows[0]?.total || 0),
      availableRooms: Number(rooms.rows[0]?.available || 0),
      checkedIn: Number(checkedIn.rows[0]?.count || 0),
      pendingReservations: Number(reservations.rows[0]?.count || 0),
      monthlyRevenue: Number(revenue.rows[0]?.total || 0),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
