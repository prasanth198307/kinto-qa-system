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

// ── Rate Plans ──────────────────────────────────────────────────────────────

router.get("/rate-plans", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hotel_rate_plans WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/rate-plans", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, description, meal_plan, min_nights, max_nights, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_rate_plans (tenant_id, name, description, meal_plan, min_nights, max_nights, is_active)
      VALUES (${tid}, ${name}, ${description}, ${meal_plan}, ${min_nights ?? 1}, ${max_nights ?? null}, ${is_active ?? 1})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/rate-plans/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, description, meal_plan, min_nights, max_nights, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_rate_plans
      SET name=${name}, description=${description}, meal_plan=${meal_plan},
          min_nights=${min_nights}, max_nights=${max_nights}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/rate-plans/:id/prices", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT p.* FROM hotel_rate_plan_prices p
      JOIN hotel_rate_plans rp ON rp.id = p.rate_plan_id
      WHERE p.rate_plan_id=${id} AND rp.tenant_id=${tid}
      ORDER BY p.room_type_id, p.effective_from
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/rate-plans/:id/prices", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { room_type_id, price_per_night, effective_from, effective_to, day_of_week } = req.body;
    // Verify plan belongs to tenant
    const plan = await db.execute(sql`SELECT id FROM hotel_rate_plans WHERE id=${id} AND tenant_id=${tid}`);
    if (!plan.rows.length) return res.status(404).json({ message: "Rate plan not found" });
    const r = await db.execute(sql`
      INSERT INTO hotel_rate_plan_prices (rate_plan_id, room_type_id, price_per_night, effective_from, effective_to, day_of_week)
      VALUES (${id}, ${room_type_id}, ${price_per_night}, ${effective_from}, ${effective_to ?? null}, ${day_of_week ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Packages ─────────────────────────────────────────────────────────────────

router.get("/packages", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hotel_packages WHERE tenant_id=${tid} ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/packages", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, description, inclusions, price, nights, room_type_id, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_packages (tenant_id, name, description, inclusions, price, nights, room_type_id, is_active)
      VALUES (${tid}, ${name}, ${description}, ${inclusions ?? null}, ${price}, ${nights ?? 1}, ${room_type_id ?? null}, ${is_active ?? 1})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/packages/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, description, inclusions, price, nights, room_type_id, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_packages
      SET name=${name}, description=${description}, inclusions=${inclusions},
          price=${price}, nights=${nights}, room_type_id=${room_type_id}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Night Audit ───────────────────────────────────────────────────────────────

router.post("/night-audit/run", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const today = new Date().toISOString().split("T")[0];

    // Count occupied reservations today
    const occupiedRes = await db.execute(sql`
      SELECT COUNT(*) AS occupied_count, COALESCE(SUM(rate_per_night), 0) AS room_revenue
      FROM hotel_reservations
      WHERE tenant_id=${tid}
        AND status='checked_in'
        AND check_in_date <= ${today}
        AND check_out_date > ${today}
    `);

    // Total rooms
    const totalRoomsRes = await db.execute(sql`
      SELECT COUNT(*) AS total_rooms FROM hotel_rooms WHERE tenant_id=${tid} AND is_active=1
    `);

    const occupied = Number(occupiedRes.rows[0]?.occupied_count ?? 0);
    const roomRevenue = Number(occupiedRes.rows[0]?.room_revenue ?? 0);
    const totalRooms = Number(totalRoomsRes.rows[0]?.total_rooms ?? 1);

    const occupancyPct = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0;
    const adr = occupied > 0 ? roomRevenue / occupied : 0;
    const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const r = await db.execute(sql`
      INSERT INTO hotel_night_audit
        (tenant_id, audit_date, occupied_rooms, total_rooms, occupancy_pct, room_revenue, adr, revpar)
      VALUES
        (${tid}, ${today}, ${occupied}, ${totalRooms}, ${occupancyPct.toFixed(2)}, ${roomRevenue}, ${adr.toFixed(2)}, ${revpar.toFixed(2)})
      RETURNING *
    `);

    res.json({
      success: true,
      stats: {
        audit_date: today,
        occupied_rooms: occupied,
        total_rooms: totalRooms,
        occupancy_pct: occupancyPct.toFixed(2),
        room_revenue: roomRevenue,
        adr: adr.toFixed(2),
        revpar: revpar.toFixed(2),
      },
      record: r.rows[0],
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/night-audit/history", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT * FROM hotel_night_audit
      WHERE tenant_id=${tid}
        AND (${from ?? null} IS NULL OR audit_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR audit_date <= ${to ?? null})
      ORDER BY audit_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Reservations ──────────────────────────────────────────────────────────────

router.post("/reservations/:id/upgrade-room", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { new_room_id } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_reservations
      SET room_id=${new_room_id}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    if (!r.rows.length) return res.status(404).json({ message: "Reservation not found" });
    res.json({ success: true, reservation: r.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/reservations/:id/add-folio-charge", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { charge_type, description, amount } = req.body;
    // Verify reservation belongs to tenant
    const resv = await db.execute(sql`SELECT id FROM hotel_reservations WHERE id=${id} AND tenant_id=${tid}`);
    if (!resv.rows.length) return res.status(404).json({ message: "Reservation not found" });
    const r = await db.execute(sql`
      INSERT INTO hotel_folio_charges (tenant_id, reservation_id, charge_type, description, amount, charge_date)
      VALUES (${tid}, ${id}, ${charge_type}, ${description}, ${amount}, NOW())
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/reservations/:id/express-checkout", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    await db.execute(sql`
      UPDATE hotel_reservations
      SET status='express_checkout', updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
    `);
    res.json({ success: true, message: "Express checkout initiated" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/reservations/:id/day-use", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { check_out_time, rate } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_reservations
      SET is_day_use=1, check_out_time=${check_out_time}, rate_per_night=${rate}, updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    if (!r.rows.length) return res.status(404).json({ message: "Reservation not found" });
    res.json({ success: true, reservation: r.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── GST Calculation ───────────────────────────────────────────────────────────

router.get("/reservations/:id/gst-calculation", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const r = await db.execute(sql`
      SELECT rate_per_night, check_in_date, check_out_date
      FROM hotel_reservations
      WHERE id=${id} AND tenant_id=${tid}
    `);
    if (!r.rows.length) return res.status(404).json({ message: "Reservation not found" });
    const row = r.rows[0] as any;
    const rate = Number(row.rate_per_night ?? 0);
    const gstRate = rate < 7500 ? 12 : 18;
    const gstAmount = (rate * gstRate) / 100;
    const total = rate + gstAmount;
    res.json({ rate_per_night: rate, gst_rate: gstRate, gst_amount: gstAmount.toFixed(2), total: total.toFixed(2) });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Corporate Accounts ────────────────────────────────────────────────────────

router.get("/corporate-accounts", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hotel_corporate_accounts WHERE tenant_id=${tid} ORDER BY company_name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/corporate-accounts", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { company_name, contact_person, email, phone, address, gstin, credit_limit, discount_pct } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_corporate_accounts
        (tenant_id, company_name, contact_person, email, phone, address, gstin, credit_limit, discount_pct)
      VALUES
        (${tid}, ${company_name}, ${contact_person ?? null}, ${email ?? null}, ${phone ?? null},
         ${address ?? null}, ${gstin ?? null}, ${credit_limit ?? 0}, ${discount_pct ?? 0})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/corporate-accounts/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { company_name, contact_person, email, phone, address, gstin, credit_limit, discount_pct } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_corporate_accounts
      SET company_name=${company_name}, contact_person=${contact_person}, email=${email},
          phone=${phone}, address=${address}, gstin=${gstin},
          credit_limit=${credit_limit}, discount_pct=${discount_pct}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Travel Agents ─────────────────────────────────────────────────────────────

router.get("/travel-agents", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hotel_travel_agents WHERE tenant_id=${tid} ORDER BY agent_name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/travel-agents", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { agent_name, contact_person, email, phone, commission_pct, iata_number } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_travel_agents (tenant_id, agent_name, contact_person, email, phone, commission_pct, iata_number)
      VALUES (${tid}, ${agent_name}, ${contact_person ?? null}, ${email ?? null}, ${phone ?? null},
              ${commission_pct ?? 0}, ${iata_number ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/travel-agents/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { agent_name, contact_person, email, phone, commission_pct, iata_number } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_travel_agents
      SET agent_name=${agent_name}, contact_person=${contact_person}, email=${email},
          phone=${phone}, commission_pct=${commission_pct}, iata_number=${iata_number}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Online Booking (PUBLIC) ───────────────────────────────────────────────────

router.post("/online-booking/check-availability", async (req: any, res: any) => {
  try {
    const { room_type_id, check_in_date, check_out_date } = req.body;
    const r = await db.execute(sql`
      SELECT rt.id, rt.name, rt.description, rt.max_adults, rt.max_children,
             rt.base_price, COUNT(ro.id) AS total_rooms,
             COUNT(ro.id) - COALESCE(booked.cnt, 0) AS available_rooms
      FROM hotel_room_types rt
      JOIN hotel_rooms ro ON ro.room_type_id = rt.id AND ro.is_active = 1
      LEFT JOIN (
        SELECT r.room_id, COUNT(*) AS cnt
        FROM hotel_reservations r
        WHERE r.status NOT IN ('cancelled', 'no_show')
          AND r.check_in_date < ${check_out_date}
          AND r.check_out_date > ${check_in_date}
        GROUP BY r.room_id
      ) booked ON booked.room_id = ro.id
      WHERE (${room_type_id ?? null} IS NULL OR rt.id = ${room_type_id ?? null})
      GROUP BY rt.id, rt.name, rt.description, rt.max_adults, rt.max_children, rt.base_price, booked.cnt
      HAVING COUNT(ro.id) - COALESCE(booked.cnt, 0) > 0
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/online-booking/create", async (req: any, res: any) => {
  try {
    const { guest_name, guest_email, guest_phone, room_type_id, check_in_date, check_out_date, adults, children } = req.body;
    const bookingRef = "OB" + Date.now().toString(36).toUpperCase();
    const r = await db.execute(sql`
      INSERT INTO hotel_online_bookings
        (booking_reference, guest_name, guest_email, guest_phone, room_type_id,
         check_in_date, check_out_date, adults, children, status, created_at)
      VALUES
        (${bookingRef}, ${guest_name}, ${guest_email}, ${guest_phone}, ${room_type_id},
         ${check_in_date}, ${check_out_date}, ${adults ?? 1}, ${children ?? 0}, 'pending', NOW())
      RETURNING *
    `);
    res.json({ success: true, booking_reference: bookingRef, booking: r.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/online-booking/confirm", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { booking_id, payment_id } = req.body;

    // Fetch booking
    const bookingRes = await db.execute(sql`SELECT * FROM hotel_online_bookings WHERE id=${booking_id}`);
    if (!bookingRes.rows.length) return res.status(404).json({ message: "Booking not found" });
    const b = bookingRes.rows[0] as any;

    // Update booking status
    await db.execute(sql`
      UPDATE hotel_online_bookings SET status='confirmed', payment_id=${payment_id} WHERE id=${booking_id}
    `);

    // Convert to reservation
    const resv = await db.execute(sql`
      INSERT INTO hotel_reservations
        (tenant_id, guest_name, guest_email, guest_phone, room_type_id,
         check_in_date, check_out_date, adults, children, status, source, online_booking_id, created_at)
      VALUES
        (${tid}, ${b.guest_name}, ${b.guest_email}, ${b.guest_phone}, ${b.room_type_id},
         ${b.check_in_date}, ${b.check_out_date}, ${b.adults}, ${b.children},
         'confirmed', 'online', ${booking_id}, NOW())
      RETURNING *
    `);

    res.json({ success: true, reservation: resv.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Lost & Found ──────────────────────────────────────────────────────────────

router.get("/lost-found", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hotel_lost_found WHERE tenant_id=${tid} ORDER BY found_date DESC`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/lost-found", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { item_description, found_location, found_date, found_by, guest_name, status } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_lost_found (tenant_id, item_description, found_location, found_date, found_by, guest_name, status)
      VALUES (${tid}, ${item_description}, ${found_location ?? null}, ${found_date ?? null},
              ${found_by ?? null}, ${guest_name ?? null}, ${status ?? 'found'})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/lost-found/:id/status", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { status, claimed_by, claimed_date } = req.body;
    const r = await db.execute(sql`
      UPDATE hotel_lost_found
      SET status=${status}, claimed_by=${claimed_by ?? null}, claimed_date=${claimed_date ?? null}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Form C (Foreign Guests) ───────────────────────────────────────────────────

router.get("/form-c", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT r.*, r.guest_name, r.guest_nationality, r.passport_number, r.visa_number
      FROM hotel_reservations r
      WHERE r.tenant_id=${tid} AND r.form_c_required=1
      ORDER BY r.check_in_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/occupancy", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT na.audit_date, na.occupied_rooms, na.total_rooms, na.occupancy_pct
      FROM hotel_night_audit na
      WHERE na.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR na.audit_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR na.audit_date <= ${to ?? null})
      ORDER BY na.audit_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/revenue", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT na.audit_date, na.room_revenue, na.adr, na.revpar
      FROM hotel_night_audit na
      WHERE na.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR na.audit_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR na.audit_date <= ${to ?? null})
      ORDER BY na.audit_date DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/arrivals-departures", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const today = new Date().toISOString().split("T")[0];
    const arrivals = await db.execute(sql`
      SELECT *, 'arrival' AS type FROM hotel_reservations
      WHERE tenant_id=${tid} AND check_in_date=${today} AND status IN ('confirmed','checked_in')
    `);
    const departures = await db.execute(sql`
      SELECT *, 'departure' AS type FROM hotel_reservations
      WHERE tenant_id=${tid} AND check_out_date=${today} AND status='checked_in'
    `);
    res.json({ arrivals: arrivals.rows, departures: departures.rows, date: today });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/night-audit-report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { date } = req.query;
    const auditDate = date ?? new Date().toISOString().split("T")[0];
    const r = await db.execute(sql`
      SELECT * FROM hotel_night_audit WHERE tenant_id=${tid} AND audit_date=${auditDate}
    `);
    res.json(r.rows[0] ?? null);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/corporate-billing", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT ca.company_name, COUNT(res.id) AS reservation_count,
             SUM(res.total_amount) AS total_billed, SUM(res.paid_amount) AS total_paid,
             SUM(res.total_amount) - SUM(res.paid_amount) AS outstanding
      FROM hotel_corporate_accounts ca
      LEFT JOIN hotel_reservations res ON res.corporate_account_id = ca.id
        AND res.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR res.check_in_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR res.check_in_date <= ${to ?? null})
      WHERE ca.tenant_id=${tid}
      GROUP BY ca.id, ca.company_name
      ORDER BY ca.company_name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/agent-commission", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const r = await db.execute(sql`
      SELECT ta.agent_name, ta.commission_pct, COUNT(res.id) AS bookings,
             SUM(res.total_amount) AS total_revenue,
             SUM(res.total_amount * ta.commission_pct / 100) AS commission_payable
      FROM hotel_travel_agents ta
      LEFT JOIN hotel_reservations res ON res.travel_agent_id = ta.id
        AND res.tenant_id=${tid}
        AND (${from ?? null} IS NULL OR res.check_in_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR res.check_in_date <= ${to ?? null})
      WHERE ta.tenant_id=${tid}
      GROUP BY ta.id, ta.agent_name, ta.commission_pct
      ORDER BY commission_payable DESC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reports/rate-parity", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT rt.name AS room_type,
             rp.name AS rate_plan,
             rpp.price_per_night,
             rpp.effective_from,
             rpp.effective_to
      FROM hotel_rate_plan_prices rpp
      JOIN hotel_rate_plans rp ON rp.id = rpp.rate_plan_id AND rp.tenant_id=${tid}
      JOIN hotel_room_types rt ON rt.id = rpp.room_type_id
      ORDER BY rt.name, rp.name, rpp.effective_from
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});


// ── KPI Dashboard ─────────────────────────────────────────────────────────────
router.get("/kpi", auth, async (req: any, res: any) => {
  const tid = getTenantId(req);
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rooms, checkins, revenue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status='occupied' THEN 1 END)::int as occupied, COUNT(CASE WHEN status='available' THEN 1 END)::int as available FROM hotel_rooms WHERE tenant_id=${tid}`),
      db.execute(sql`SELECT COUNT(*)::int as arrivals_today, COUNT(CASE WHEN check_out_date=${today}::date THEN 1 END)::int as departures_today FROM hotel_reservations WHERE tenant_id=${tid} AND (check_in_date=${today}::date OR check_out_date=${today}::date)`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0)::numeric as revenue_today, COALESCE(AVG(total_amount),0)::numeric as adr FROM hotel_reservations WHERE tenant_id=${tid} AND check_in_date=${today}::date AND status='checked_in'`),
    ]);
    const r = rooms.rows[0] as any;
    const c = checkins.rows[0] as any;
    const v = revenue.rows[0] as any;
    const occupancy = r.total > 0 ? Math.round((r.occupied / r.total) * 100) : 0;
    res.json({ occupancy_pct: occupancy, rooms_available: r.available, rooms_occupied: r.occupied, total_rooms: r.total, arrivals_today: c.arrivals_today, departures_today: c.departures_today, revenue_today: v.revenue_today, adr: v.adr });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Online Bookings (GET list) ────────────────────────────────────────────────
router.get("/online-booking", auth, async (req: any, res: any) => {
  const tid = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hotel_online_bookings WHERE tenant_id=${tid} ORDER BY created_at DESC LIMIT 100`);
    res.json(rows.rows || []);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
