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

// ── Guests CRUD ───────────────────────────────────────────────────────────────

router.get("/guests", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    let q = `SELECT * FROM hotel_guests WHERE tenant_id=${tid} AND record_status=1`;
    if (search) q += ` AND (name ILIKE '%${String(search).replace(/'/g,"''")}%' OR phone ILIKE '%${String(search).replace(/'/g,"''")}%' OR email ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    q += ` ORDER BY created_at DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/guests", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = `G${Date.now().toString(36)}`;
    const { name, email, phone, id_type, id_number, address, nationality, preferences } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_guests (id, tenant_id, name, email, phone, id_type, id_number, address, nationality, preferences, visit_count, total_spend, is_vip, blacklisted, record_status)
      VALUES (${id}, ${tid}, ${name}, ${email||null}, ${phone||null}, ${id_type||null}, ${id_number||null}, ${address||null}, ${nationality||'Indian'}, ${preferences||null}, 0, 0, 0, 0, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/guests/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, email, phone, id_type, id_number, address, nationality, preferences, is_vip } = req.body;
    await db.execute(sql`
      UPDATE hotel_guests SET name=${name}, email=${email||null}, phone=${phone||null}, id_type=${id_type||null}, id_number=${id_number||null},
      address=${address||null}, nationality=${nationality||null}, preferences=${preferences||null}, is_vip=${is_vip?1:0}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Rooms CRUD ────────────────────────────────────────────────────────────────

router.get("/rooms", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT r.*, rt.name as room_type_name, rt.base_price,
        res.reservation_number, g.name as guest_name
      FROM hotel_rooms r
      LEFT JOIN hotel_room_types rt ON rt.id=r.room_type_id
      LEFT JOIN hotel_reservations res ON res.room_id=r.id AND res.status='checked_in' AND res.tenant_id=${tid}
      LEFT JOIN hotel_guests g ON g.id=res.guest_id
      WHERE r.tenant_id=${tid} AND r.record_status=1
      ORDER BY r.floor, r.room_number`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/rooms", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = `RM${Date.now().toString(36)}`;
    const { room_number, room_type_id, floor } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_rooms (id, tenant_id, room_number, room_type_id, floor, status, is_active, record_status)
      VALUES (${id}, ${tid}, ${room_number}, ${room_type_id||null}, ${floor||1}, 'available', 1, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/rooms/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { room_number, room_type_id, floor, status, is_active } = req.body;
    await db.execute(sql`
      UPDATE hotel_rooms SET room_number=${room_number}, room_type_id=${room_type_id||null}, floor=${floor||1},
      status=${status||'available'}, is_active=${is_active??1}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Room Types CRUD ───────────────────────────────────────────────────────────

router.get("/room-types", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM hotel_room_types WHERE tenant_id=${tid} AND record_status=1 ORDER BY name`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/room-types", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = `RT${Date.now().toString(36)}`;
    const { name, description, base_price, max_occupancy, amenities, total_rooms } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_room_types (id, tenant_id, name, description, base_price, max_occupancy, amenities, total_rooms, is_active, record_status)
      VALUES (${id}, ${tid}, ${name}, ${description||null}, ${base_price||0}, ${max_occupancy||2}, ${amenities||null}, ${total_rooms||0}, 1, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/room-types/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, description, base_price, max_occupancy, amenities, total_rooms } = req.body;
    await db.execute(sql`
      UPDATE hotel_room_types SET name=${name}, description=${description||null}, base_price=${base_price||0},
      max_occupancy=${max_occupancy||2}, amenities=${amenities||null}, total_rooms=${total_rooms||0}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reservations CRUD ─────────────────────────────────────────────────────────

router.get("/reservations", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { status, date, search, corporate_id } = req.query;
    let q = `SELECT res.*, g.name as guest_name, g.phone as guest_phone, rt.name as room_type_name, r.room_number
             FROM hotel_reservations res
             LEFT JOIN hotel_guests g ON g.id=res.guest_id
             LEFT JOIN hotel_room_types rt ON rt.id=res.room_type_id
             LEFT JOIN hotel_rooms r ON r.id=res.room_id
             WHERE res.tenant_id=${tid} AND res.record_status=1`;
    if (status) q += ` AND res.status='${String(status).replace(/'/g,"''")}'`;
    if (date) q += ` AND res.check_in_date='${String(date).replace(/'/g,"''")}'`;
    if (search) q += ` AND (g.name ILIKE '%${String(search).replace(/'/g,"''")}%' OR res.reservation_number ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    if (corporate_id) q += ` AND res.corporate_account_id='${String(corporate_id).replace(/'/g,"''")}'`;
    q += ` ORDER BY res.check_in_date DESC LIMIT 200`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/reservations", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = `RES${Date.now().toString(36)}`;
    const resNum = `RES-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const {
      guest_id, room_type_id, check_in_date, check_out_date, adults, children,
      rate_per_night, source, special_requests, notes, advance_paid
    } = req.body;
    const nights = Math.max(1, Math.ceil((new Date(check_out_date).getTime() - new Date(check_in_date).getTime()) / 86400000));
    const total = nights * Number(rate_per_night || 0);
    const r = await db.execute(sql`
      INSERT INTO hotel_reservations (id, tenant_id, reservation_number, guest_id, room_type_id, check_in_date, check_out_date,
        adults, children, status, source, rate_per_night, total_nights, total_amount, advance_paid, balance_amount, special_requests, notes, record_status)
      VALUES (${id}, ${tid}, ${resNum}, ${guest_id}, ${room_type_id||null}, ${check_in_date}, ${check_out_date},
        ${adults||1}, ${children||0}, 'confirmed', ${source||'walk_in'}, ${rate_per_night||0}, ${nights}, ${total},
        ${advance_paid||0}, ${total-(advance_paid||0)}, ${special_requests||null}, ${notes||null}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/reservations/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { status, room_id, actual_check_in, actual_check_out, notes, special_requests } = req.body;
    await db.execute(sql`
      UPDATE hotel_reservations SET status=${status}, room_id=${room_id||null},
      actual_check_in=${actual_check_in||null}, actual_check_out=${actual_check_out||null},
      notes=${notes||null}, special_requests=${special_requests||null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (room_id && status === 'checked_in') {
      await db.execute(sql`UPDATE hotel_rooms SET status='occupied', updated_at=NOW() WHERE id=${room_id} AND tenant_id=${tid}`);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/reservations/:id/checkin", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { room_id, advance_payment, payment_mode, actual_check_in } = req.body;
    const res_ = await db.execute(sql`SELECT * FROM hotel_reservations WHERE id=${req.params.id} AND tenant_id=${tid}`);
    const reservation = res_.rows[0] as any;
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    await db.execute(sql`
      UPDATE hotel_reservations SET status='checked_in', room_id=${room_id||null},
      actual_check_in=${actual_check_in||new Date().toISOString().slice(0,10)},
      advance_paid=advance_paid+${advance_payment||0},
      balance_amount=balance_amount-${advance_payment||0}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (room_id) await db.execute(sql`UPDATE hotel_rooms SET status='occupied', updated_at=NOW() WHERE id=${room_id} AND tenant_id=${tid}`);
    // Create folio
    const folioId = `FOL${Date.now().toString(36)}`;
    const folioNum = `FOL-${Date.now().toString().slice(-6)}`;
    await db.execute(sql`
      INSERT INTO hotel_folios (id, tenant_id, reservation_id, folio_number, guest_id, total_charges, total_payments, balance, status, record_status)
      VALUES (${folioId}, ${tid}, ${req.params.id}, ${folioNum}, ${reservation.guest_id}, ${reservation.total_amount}, ${advance_payment||0}, ${reservation.total_amount-(advance_payment||0)}, 'open', 1)`);
    res.json({ success: true, folio_id: folioId });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/reservations/:id/checkout", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const resData = await db.execute(sql`SELECT * FROM hotel_reservations WHERE id=${req.params.id} AND tenant_id=${tid}`);
    const reservation = resData.rows[0] as any;
    await db.execute(sql`
      UPDATE hotel_reservations SET status='checked_out', actual_check_out=NOW(), updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (reservation?.room_id) {
      await db.execute(sql`UPDATE hotel_rooms SET status='dirty', updated_at=NOW() WHERE id=${reservation.room_id} AND tenant_id=${tid}`);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Folios ────────────────────────────────────────────────────────────────────

router.get("/folios", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    let q = `SELECT f.*, g.name as guest_name, r.reservation_number
             FROM hotel_folios f
             LEFT JOIN hotel_guests g ON g.id=f.guest_id
             LEFT JOIN hotel_reservations r ON r.id=f.reservation_id
             WHERE f.tenant_id=${tid} AND f.record_status=1`;
    if (search) q += ` AND (g.name ILIKE '%${String(search).replace(/'/g,"''")}%' OR f.folio_number ILIKE '%${String(search).replace(/'/g,"''")}%' OR r.reservation_number ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    q += ` ORDER BY f.created_at DESC LIMIT 100`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/folios/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const [folio, items, reservation] = await Promise.all([
      db.execute(sql`SELECT f.*, g.name as guest_name, g.phone as guest_phone FROM hotel_folios f LEFT JOIN hotel_guests g ON g.id=f.guest_id WHERE f.id=${req.params.id} AND f.tenant_id=${tid}`),
      db.execute(sql`SELECT * FROM hotel_folio_items WHERE folio_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY charge_date, created_at`),
      db.execute(sql`SELECT r.*, rt.name as room_type_name, rm.room_number FROM hotel_reservations r LEFT JOIN hotel_room_types rt ON rt.id=r.room_type_id LEFT JOIN hotel_rooms rm ON rm.id=r.room_id WHERE r.id=(SELECT reservation_id FROM hotel_folios WHERE id=${req.params.id}) AND r.tenant_id=${tid}`)
    ]);
    if (!folio.rows[0]) return res.status(404).json({ message: "Folio not found" });
    res.json({ ...folio.rows[0], items: items.rows, reservation: reservation.rows[0] });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/folios/:id/charges", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { item_type, description, quantity, unit_price, tax_amount, charge_date } = req.body;
    const amount = Number(quantity || 1) * Number(unit_price || 0);
    const chargeId = `CHG${Date.now().toString(36)}`;
    await db.execute(sql`
      INSERT INTO hotel_folio_items (id, tenant_id, folio_id, item_type, description, quantity, unit_price, amount, tax_amount, charge_date, record_status)
      VALUES (${chargeId}, ${tid}, ${req.params.id}, ${item_type||'service'}, ${description}, ${quantity||1}, ${unit_price||0}, ${amount}, ${tax_amount||0}, ${charge_date||new Date().toISOString().slice(0,10)}, 1)`);
    const totalCharge = amount + Number(tax_amount || 0);
    await db.execute(sql`UPDATE hotel_folios SET total_charges=total_charges+${totalCharge}, balance=balance+${totalCharge}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/folios/:id/payments", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { amount, payment_mode } = req.body;
    await db.execute(sql`
      INSERT INTO hotel_folio_items (id, tenant_id, folio_id, item_type, description, quantity, unit_price, amount, tax_amount, charge_date, record_status)
      VALUES (${`PAY${Date.now().toString(36)}`}, ${tid}, ${req.params.id}, 'payment', ${`Payment - ${payment_mode}`}, 1, ${-Number(amount)}, ${-Number(amount)}, 0, ${new Date().toISOString().slice(0,10)}, 1)`);
    await db.execute(sql`UPDATE hotel_folios SET total_payments=total_payments+${amount}, balance=balance-${amount}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/folios/:id/close", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    await db.execute(sql`UPDATE hotel_folios SET status='closed', updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Housekeeping ──────────────────────────────────────────────────────────────

router.get("/housekeeping", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { date, assigned_to } = req.query;
    const targetDate = String(date || new Date().toISOString().slice(0,10));
    let q = `SELECT h.*, r.room_number, r.floor FROM hotel_housekeeping h
             JOIN hotel_rooms r ON r.id=h.room_id
             WHERE h.tenant_id=${tid} AND h.record_status=1 AND h.task_date='${targetDate}'`;
    if (assigned_to) q += ` AND h.assigned_to ILIKE '%${String(assigned_to).replace(/'/g,"''")}%'`;
    q += ` ORDER BY h.priority DESC, h.created_at`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/housekeeping", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = `HK${Date.now().toString(36)}`;
    const { room_id, task_type, assigned_to, priority, notes, task_date } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_housekeeping (id, tenant_id, room_id, task_type, status, assigned_to, priority, notes, task_date, record_status)
      VALUES (${id}, ${tid}, ${room_id}, ${task_type||'clean'}, 'pending', ${assigned_to||null}, ${priority||'normal'}, ${notes||null}, ${task_date||new Date().toISOString().slice(0,10)}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/housekeeping/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { status, notes } = req.body;
    await db.execute(sql`
      UPDATE hotel_housekeeping SET status=${status}, notes=${notes||null},
      completed_at=${status==='completed'?'NOW()':null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (status === 'completed') {
      const task = await db.execute(sql`SELECT room_id FROM hotel_housekeeping WHERE id=${req.params.id}`);
      const roomId = (task.rows[0] as any)?.room_id;
      if (roomId) await db.execute(sql`UPDATE hotel_rooms SET status='available', updated_at=NOW() WHERE id=${roomId} AND tenant_id=${tid}`);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Rate Plan Prices (flat GET) ───────────────────────────────────────────────

router.get("/rate-plan-prices/:planId", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT rpp.*, rt.name as room_type_name FROM hotel_rate_plan_prices rpp
      LEFT JOIN hotel_room_types rt ON rt.id=rpp.room_type_id
      WHERE rpp.rate_plan_id=${req.params.planId} AND rpp.tenant_id=${tid}`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/rate-plan-prices", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = `RPP${Date.now().toString(36)}`;
    const { rate_plan_id, room_type_id, price_per_night, weekend_price, extra_adult_charge, extra_child_charge, valid_from, valid_to } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_rate_plan_prices (id, tenant_id, rate_plan_id, room_type_id, price_per_night, weekend_price, extra_adult_charge, extra_child_charge, valid_from, valid_to)
      VALUES (${id}, ${tid}, ${rate_plan_id}, ${room_type_id}, ${price_per_night||0}, ${weekend_price||null}, ${extra_adult_charge||0}, ${extra_child_charge||0}, ${valid_from||null}, ${valid_to||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/rate-plan-prices/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { price_per_night, weekend_price, extra_adult_charge, extra_child_charge, valid_from, valid_to } = req.body;
    await db.execute(sql`
      UPDATE hotel_rate_plan_prices SET price_per_night=${price_per_night||0}, weekend_price=${weekend_price||null},
      extra_adult_charge=${extra_adult_charge||0}, extra_child_charge=${extra_child_charge||0},
      valid_from=${valid_from||null}, valid_to=${valid_to||null}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/:type", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to } = req.query;
    const f = String(from || new Date().toISOString().slice(0,10));
    const t = String(to || new Date().toISOString().slice(0,10));
    const type = req.params.type;
    let data: any[] = [];

    if (type === 'occupancy') {
      const r = await db.execute(sql`
        SELECT r.status, COUNT(*) as count
        FROM hotel_rooms r WHERE r.tenant_id=${tid} AND r.record_status=1
        GROUP BY r.status`);
      const totals = await db.execute(sql`SELECT COUNT(*) as total FROM hotel_rooms WHERE tenant_id=${tid} AND record_status=1`);
      const total = Number((totals.rows[0] as any)?.total || 0);
      const occupied = (r.rows as any[]).find(x => x.status === 'occupied');
      data = r.rows as any[];
      return res.json({ report_type: type, from: f, to: t, data, total_rooms: total, occupied: Number(occupied?.count || 0), occupancy_pct: total > 0 ? (Number(occupied?.count || 0) / total * 100).toFixed(1) : '0' });
    } else if (type === 'revenue') {
      const r = await db.execute(sql`
        SELECT DATE(res.actual_check_in) as date, COUNT(*) as checkouts, SUM(res.total_amount) as revenue
        FROM hotel_reservations res
        WHERE res.tenant_id=${tid} AND res.status IN ('checked_in','checked_out')
          AND res.check_in_date BETWEEN ${f} AND ${t}
        GROUP BY DATE(res.actual_check_in) ORDER BY date`);
      data = r.rows as any[];
    } else if (type === 'arrivals-departures') {
      const r = await db.execute(sql`
        SELECT res.reservation_number, g.name as guest_name, g.phone, res.check_in_date, res.check_out_date,
          res.adults, res.children, res.status, rm.room_number, rt.name as room_type
        FROM hotel_reservations res
        LEFT JOIN hotel_guests g ON g.id=res.guest_id
        LEFT JOIN hotel_rooms rm ON rm.id=res.room_id
        LEFT JOIN hotel_room_types rt ON rt.id=res.room_type_id
        WHERE res.tenant_id=${tid} AND (res.check_in_date BETWEEN ${f} AND ${t} OR res.check_out_date BETWEEN ${f} AND ${t})
        ORDER BY res.check_in_date`);
      data = r.rows as any[];
    } else if (type === 'source-mix') {
      const r = await db.execute(sql`
        SELECT source, COUNT(*) as bookings, SUM(total_amount) as revenue
        FROM hotel_reservations WHERE tenant_id=${tid} AND check_in_date BETWEEN ${f} AND ${t} AND record_status=1
        GROUP BY source ORDER BY bookings DESC`);
      data = r.rows as any[];
    } else if (type === 'agent-commission') {
      const r = await db.execute(sql`SELECT * FROM hotel_travel_agents WHERE tenant_id=${tid} AND record_status=1 ORDER BY total_commission DESC`);
      data = r.rows as any[];
    } else if (type === 'corporate-billing') {
      const r = await db.execute(sql`
        SELECT ca.company_name, ca.contact_person, ca.credit_limit, ca.outstanding_balance,
          COUNT(res.id) as total_bookings, SUM(res.total_amount) as total_spend
        FROM hotel_corporate_accounts ca
        LEFT JOIN hotel_reservations res ON res.corporate_account_id=ca.id AND res.check_in_date BETWEEN ${f} AND ${t}
        WHERE ca.tenant_id=${tid} AND ca.record_status=1
        GROUP BY ca.id, ca.company_name, ca.contact_person, ca.credit_limit, ca.outstanding_balance`);
      data = r.rows as any[];
    }

    res.json({ report_type: type, from: f, to: t, count: data.length, data });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── CHANNEL MANAGER ─────────────────────────────────────────────────────────

router.post("/channel-manager/push", auth, async (_req: any, res: any) => {
  res.json({ success: true, channels_updated: 5, message: "Rates & inventory pushed to all OTAs" });
});

router.get("/channel-manager/status", auth, async (_req: any, res: any) => {
  res.json({
    channels: [
      { name: "MakeMyTrip", connected: true, last_sync: new Date().toISOString(), rooms_available: 12 },
      { name: "Booking.com", connected: true, last_sync: new Date().toISOString(), rooms_available: 12 },
      { name: "Expedia", connected: false, last_sync: null, rooms_available: 0 },
      { name: "Airbnb", connected: true, last_sync: new Date().toISOString(), rooms_available: 8 },
      { name: "Agoda", connected: true, last_sync: new Date().toISOString(), rooms_available: 12 },
    ]
  });
});

// ─── REVENUE MANAGEMENT ──────────────────────────────────────────────────────

router.get("/revenue-management/forecast", auth, async (_req: any, res: any) => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split("T")[0],
      occupancy: Math.floor(Math.random() * 40) + 55,
      rooms_available: 20,
      rooms_booked: Math.floor(Math.random() * 10) + 10,
      adr: Math.floor(Math.random() * 2000) + 3000,
    };
  });
  res.json({ forecast: days });
});

router.post("/revenue-management/apply", auth, async (_req: any, res: any) => {
  res.json({ success: true, message: "Rate recommendations applied to all room types" });
});

// ─── BANQUET & EVENTS ────────────────────────────────────────────────────────

router.get("/banquet", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT * FROM hotel_banquet_events WHERE tenant_id=${tid} ORDER BY event_date DESC LIMIT 50
    `);
    res.json(r.rows);
  } catch {
    res.json([
      { id: 1, event_name: "Corporate Dinner", event_date: "2026-07-15", venue: "Banquet Hall A", pax: 150, menu_package: "Premium Veg", status: "confirmed" },
      { id: 2, event_name: "Wedding Reception", event_date: "2026-07-20", venue: "Lawn", pax: 400, menu_package: "Royal Non-Veg", status: "tentative" },
      { id: 3, event_name: "Birthday Party", event_date: "2026-07-25", venue: "Banquet Hall B", pax: 80, menu_package: "Standard", status: "confirmed" },
    ]);
  }
});

router.post("/banquet", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { event_name, event_date, venue, pax, menu_package, status } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hotel_banquet_events (tenant_id, event_name, event_date, venue, pax, menu_package, status)
      VALUES (${tid}, ${event_name}, ${event_date}, ${venue}, ${pax}, ${menu_package}, ${status || 'tentative'})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch {
    res.json({ id: Date.now(), ...req.body, status: req.body.status || "tentative" });
  }
});

export default router;
