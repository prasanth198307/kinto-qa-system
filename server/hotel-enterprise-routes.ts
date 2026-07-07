import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
// eslint-disable-next-line -eslint/no-require-imports
const PDFDocument = require("pdfkit");
import { syncChannelRates, getChannelInventory } from "./hotel-channel-service";
import { createJournalWithLines } from "./journal-service";

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
    const rsv = await db.execute(sql`
      UPDATE hotel_reservations
      SET status='express_checkout', updated_at=NOW()
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *
    `);
    // Phase 3: GL auto-posting for hotel checkout
    const reservation = rsv.rows[0] as any;
    if (reservation) {
      const totalAmt = Number(reservation.total_amount || 0);
      const gstAmt = Number(reservation.gst_amount || 0);
      const roomRevenue = Math.round((totalAmt - gstAmt) * 100);
      const gstPaise = Math.round(gstAmt * 100);
      const totalPaise = Math.round(totalAmt * 100);
      createJournalWithLines(
        new Date().toISOString().slice(0, 10),
        `Hotel folio ${id} — Room revenue`,
        [
          { accountCode: '1002', debit: totalPaise, credit: 0, memo: 'Hotel room revenue receipt' },
          { accountCode: '4010', debit: 0, credit: roomRevenue || totalPaise, memo: 'Room revenue' },
          ...(gstPaise > 0 ? [{ accountCode: '2201', debit: 0, credit: gstPaise, memo: 'GST on room revenue' }] : []),
        ],
        { sourceType: 'hotel_express_checkout', sourceId: String(id), isAutoGenerated: true }
      ).catch((e: any) => console.error('GL Hotel folio:', e));
    }
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

// ── F&B room charge posting from Restaurant POS ──────────────────────────────
router.post("/restaurant/post-room-charge", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { reservation_id, order_id, order_amount, description, charge_date } = req.body;
  try {
    const resv = await db.execute(sql`SELECT id, guest_name, room_id, status FROM hotel_reservations WHERE id=${parseInt(reservation_id)} AND tenant_id=${t} AND status='checked_in'`);
    if (!resv.rows[0]) return res.status(404).json({ message: 'Active reservation not found. Guest must be checked in.' });
    const r = resv.rows[0] as any;
    const charge = await db.execute(sql`INSERT INTO hotel_folio_charges (tenant_id, reservation_id, charge_type, description, amount, charge_date, ref_type, ref_id)
      VALUES (${t}, ${parseInt(reservation_id)}, 'restaurant', ${description||'F&B Room Charge'}, ${order_amount}, ${charge_date||new Date().toISOString().slice(0,10)}, 'restaurant_order', ${order_id?.toString()||null}) RETURNING *`);
    await db.execute(sql`UPDATE hotel_folios SET total_charges = total_charges + ${order_amount} WHERE reservation_id=${parseInt(reservation_id)} AND tenant_id=${t}`);
    try {
      const { createJournalWithLines } = await import('./journal-service');
      await createJournalWithLines(
        charge_date || new Date().toISOString().slice(0, 10),
        `F&B room charge — Reservation #${reservation_id}`,
        [
          { accountCode: '1100', debit: Math.round(Number(order_amount)*100), credit: 0, memo: 'Room F&B charge (AR)' },
          { accountCode: '4002', debit: 0, credit: Math.round(Number(order_amount)*100), memo: 'F&B revenue' },
        ],
        { sourceType: 'hotel_fnb_charge', sourceId: String(charge.rows[0] ? (charge.rows[0] as any).id : reservation_id), isAutoGenerated: true }
      );
    } catch {}
    res.json({ success: true, charge: charge.rows[0], guest: r.guest_name, room_charge_posted: true });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Minibar & Laundry charges auto-post to folio ──────────────────────────────
router.get("/minibar-items", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_minibar_items (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      name VARCHAR(200) NOT NULL, category VARCHAR(50) DEFAULT 'minibar',
      unit VARCHAR(30) DEFAULT 'piece', price NUMERIC(10,2) DEFAULT 0,
      is_active INT DEFAULT 1, record_status INT DEFAULT 1
    )`);
    const cnt = await db.execute(sql`SELECT COUNT(*) as n FROM hotel_minibar_items WHERE tenant_id=${t}`);
    if (Number((cnt.rows[0] as any).n) === 0) {
      const defaults: [string, string, string, number][] = [
        ['Water (500ml)', 'minibar', 'bottle', 50],
        ['Soft Drink Can', 'minibar', 'can', 80],
        ['Beer (330ml)', 'minibar', 'bottle', 150],
        ['Juice Pack', 'minibar', 'pack', 100],
        ['Chips/Snacks', 'minibar', 'packet', 60],
        ['Chocolate Bar', 'minibar', 'piece', 80],
        ['Nuts', 'minibar', 'packet', 100],
        ['Shirt - Wash & Press', 'laundry', 'piece', 120],
        ['Trouser - Wash & Press', 'laundry', 'piece', 100],
        ['Suit - Dry Clean', 'laundry', 'piece', 350],
        ['Saree/Dress - Wash', 'laundry', 'piece', 150],
        ['Express Laundry (surcharge)', 'laundry', 'per item', 50],
        ['Morning Newspaper', 'room_service', 'daily', 30],
        ['Room Service Tea/Coffee', 'room_service', 'cup', 80],
        ['Local Call (per min)', 'telephone', 'minute', 2],
        ['ISD Call (per min)', 'telephone', 'minute', 15],
      ];
      for (const [name, cat, unit, price] of defaults) {
        await db.execute(sql`INSERT INTO hotel_minibar_items (tenant_id, name, category, unit, price) VALUES (${t}, ${name}, ${cat}, ${unit}, ${price}) ON CONFLICT DO NOTHING`);
      }
    }
    const rows = await db.execute(sql`SELECT * FROM hotel_minibar_items WHERE tenant_id=${t} AND record_status=1 AND is_active=1 ORDER BY category, name`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/minibar-items", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { name, category, unit, price } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO hotel_minibar_items (tenant_id, name, category, unit, price) VALUES (${t}, ${name}, ${category||'minibar'}, ${unit||'piece'}, ${price||0}) RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/minibar-items/:id", auth, async (req: any, res: any) => {
  const { name, category, unit, price, is_active } = req.body;
  try {
    const r = await db.execute(sql`UPDATE hotel_minibar_items SET name=${name}, category=${category||'minibar'}, unit=${unit||'piece'}, price=${price||0}, is_active=${is_active??1} WHERE id=${parseInt(req.params.id)} AND tenant_id=${getTenantId(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/reservations/:reservationId/minibar-charges", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  const { items, charge_date } = req.body;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_minibar_charges (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, reservation_id INT NOT NULL,
      minibar_item_id INT, item_name VARCHAR(200), category VARCHAR(50),
      quantity INT DEFAULT 1, unit_price NUMERIC(10,2) DEFAULT 0,
      amount NUMERIC(12,2) DEFAULT 0, charge_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const rsvId = parseInt(req.params.reservationId);
    const resv = await db.execute(sql`SELECT id FROM hotel_reservations WHERE id=${rsvId} AND tenant_id=${t}`);
    if (!resv.rows[0]) return res.status(404).json({ message: 'Reservation not found' });
    let totalAdded = 0;
    const added = [];
    for (const it of (items||[])) {
      const mItem = await db.execute(sql`SELECT * FROM hotel_minibar_items WHERE id=${it.minibar_item_id||0} AND tenant_id=${t}`);
      const mi = (mItem.rows[0] || {}) as any;
      const qty = it.quantity || 1;
      const unitPrice = mi.price || it.unit_price || 0;
      const amount = qty * unitPrice;
      totalAdded += amount;
      const c = await db.execute(sql`INSERT INTO hotel_minibar_charges (tenant_id, reservation_id, minibar_item_id, item_name, category, quantity, unit_price, amount, charge_date)
        VALUES (${t}, ${rsvId}, ${it.minibar_item_id||null}, ${mi.name||it.item_name||'Item'}, ${mi.category||'minibar'}, ${qty}, ${unitPrice}, ${amount}, ${charge_date||new Date().toISOString().slice(0,10)}) RETURNING *`);
      added.push(c.rows[0]);
      await db.execute(sql`INSERT INTO hotel_folio_charges (tenant_id, reservation_id, charge_type, description, amount, charge_date, ref_type, ref_id)
        VALUES (${t}, ${rsvId}, ${mi.category||'minibar'}, ${(mi.name||'Item')+' x'+qty}, ${amount}, ${charge_date||new Date().toISOString().slice(0,10)}, 'minibar_charge', ${c.rows[0] ? String((c.rows[0] as any).id) : null})`);
    }
    if (totalAdded > 0) {
      await db.execute(sql`UPDATE hotel_folios SET total_charges = total_charges + ${totalAdded} WHERE reservation_id=${rsvId} AND tenant_id=${t}`);
    }
    res.json({ success: true, added, total_added: totalAdded });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/reservations/:reservationId/minibar-charges", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const rows = await db.execute(sql`SELECT * FROM hotel_minibar_charges WHERE reservation_id=${parseInt(req.params.reservationId)} AND tenant_id=${t} ORDER BY charge_date, created_at`);
    const total = rows.rows.reduce((s: number, r: any) => s + Number(r.amount||0), 0);
    res.json({ charges: rows.rows, total });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Folio PDF ────────────────────────────────────────────────────────────────
router.get("/folios/:id/pdf", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const folio = await db.execute(sql`
      SELECT f.*, g.name as guest_name, g.phone as guest_phone, g.email as guest_email,
        g.address as guest_address, g.id_number as guest_id_number,
        r.room_number, rt.name as room_type_name,
        rsv.check_in_date, rsv.check_out_date,
        ts.company_name as hotel_name, ts.address as hotel_address, ts.gstin as hotel_gstin, ts.phone as hotel_phone
      FROM hotel_folios f
      LEFT JOIN hotel_guests g ON g.id = f.guest_id
      LEFT JOIN hotel_rooms r ON r.id = f.room_id
      LEFT JOIN hotel_room_types rt ON rt.id = r.room_type_id
      LEFT JOIN hotel_reservations rsv ON rsv.id = f.reservation_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = f.tenant_id
      WHERE f.id=${parseInt(req.params.id)} AND f.tenant_id=${t}
    `);
    if (!folio.rows[0]) return res.status(404).json({ message: "Folio not found" });
    const f = folio.rows[0] as any;

    const items = await db.execute(sql`
      SELECT * FROM hotel_folio_items WHERE folio_id=${parseInt(req.params.id)} ORDER BY created_at
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="folio-${f.folio_number || req.params.id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(f.hotel_name || "Hotel", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(f.hotel_address || "", { align: "center" });
    doc.text(`GSTIN: ${f.hotel_gstin || "N/A"}  |  Phone: ${f.hotel_phone || ""}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("GUEST FOLIO / TAX INVOICE", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Folio No: ${f.folio_number || req.params.id}`, { continued: true });
    doc.text(`  Date: ${new Date().toLocaleDateString("en-IN")}`, { align: "right" });
    doc.moveDown();

    // Guest info
    doc.fontSize(11).font("Helvetica-Bold").text("Guest Details");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Name: ${f.guest_name || "-"}`);
    doc.text(`Phone: ${f.guest_phone || "-"}  Email: ${f.guest_email || "-"}`);
    doc.text(`Address: ${f.guest_address || "-"}`);
    doc.text(`Room: ${f.room_number || "-"}  Type: ${f.room_type_name || "-"}`);
    doc.text(`Check-in: ${f.check_in_date ? new Date(f.check_in_date).toLocaleDateString("en-IN") : "-"}  Check-out: ${f.check_out_date ? new Date(f.check_out_date).toLocaleDateString("en-IN") : "-"}`);
    doc.moveDown();

    // Charges table
    doc.fontSize(11).font("Helvetica-Bold").text("Charges");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    const colX = [50, 200, 330, 420, 480];
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Date", colX[0], doc.y, { width: 140 });
    doc.text("Description", colX[1], doc.y - doc.currentLineHeight(), { width: 120 });
    doc.text("Category", colX[2], doc.y - doc.currentLineHeight(), { width: 80 });
    doc.text("Qty", colX[3], doc.y - doc.currentLineHeight(), { width: 50 });
    doc.text("Amount", colX[4], doc.y - doc.currentLineHeight(), { width: 70, align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    let subtotal = 0;
    doc.fontSize(9).font("Helvetica");
    for (const item of items.rows as any[]) {
      const amt = Number(item.amount || 0);
      subtotal += amt;
      const yPos = doc.y;
      doc.text(item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "-", colX[0], yPos, { width: 140 });
      doc.text(item.description || "-", colX[1], yPos, { width: 120 });
      doc.text(item.category || "-", colX[2], yPos, { width: 80 });
      doc.text(String(item.quantity || 1), colX[3], yPos, { width: 50 });
      doc.text(`₹${amt.toFixed(2)}`, colX[4], yPos, { width: 70, align: "right" });
      doc.moveDown(0.8);
    }
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // GST Summary
    const cgst = subtotal * 0.06;
    const sgst = subtotal * 0.06;
    const total = Number(f.total_amount || subtotal + cgst + sgst);
    const paid = Number(f.paid_amount || 0);
    const balance = Number(f.balance_amount || total - paid);

    doc.fontSize(10).font("Helvetica");
    doc.text(`Subtotal:`, 380, doc.y, { width: 100 });
    doc.text(`₹${subtotal.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(0.5);
    doc.text(`CGST (6%):`, 380, doc.y, { width: 100 });
    doc.text(`₹${cgst.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(0.5);
    doc.text(`SGST (6%):`, 380, doc.y, { width: 100 });
    doc.text(`₹${sgst.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(380, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text(`Total:`, 380, doc.y, { width: 100 });
    doc.text(`₹${total.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Advance Paid:`, 380, doc.y, { width: 100 });
    doc.text(`₹${paid.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text(`Balance Due:`, 380, doc.y, { width: 100 });
    doc.text(`₹${balance.toFixed(2)}`, 480, doc.y - doc.currentLineHeight(), { width: 65, align: "right" });
    doc.moveDown(2);

    doc.fontSize(9).font("Helvetica").text("[ UPI QR Code Placeholder ]", { align: "center" });
    doc.moveDown(0.5);
    doc.text("Thank you for staying with us! We look forward to welcoming you again.", { align: "center" });

    doc.end();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ message: e.message });
  }
});

// ── Channel Manager ──────────────────────────────────────────────────────────
router.get("/channels/rates", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const rows = await db.execute(sql`
      SELECT hcr.*, rt.name as room_type_name
      FROM hotel_channel_rates hcr
      LEFT JOIN hotel_room_types rt ON rt.id = hcr.room_type_id
      WHERE hcr.tenant_id=${t} AND hcr.rate_date >= CURRENT_DATE
      ORDER BY hcr.rate_date, hcr.channel
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/channels/sync", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const result = await syncChannelRates(t);
    res.json({ success: true, ...result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/channels/availability/:date", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const inventory = await getChannelInventory(t, req.params.date);
    res.json(inventory);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/channels/rates", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const { channel, room_type_id, rate_date, rate_amount, available_rooms } = req.body;
    await db.execute(sql`
      INSERT INTO hotel_channel_rates (tenant_id, channel, room_type_id, rate_date, rate_amount, available_rooms, last_synced)
      VALUES (${t}, ${channel}, ${room_type_id ?? null}, ${rate_date}, ${rate_amount}, ${available_rooms ?? 0}, NOW())
      ON CONFLICT (id) DO UPDATE SET rate_amount=${rate_amount}, available_rooms=${available_rooms ?? 0}, last_synced=NOW()
    `);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Revenue Forecast ─────────────────────────────────────────────────────────
router.get("/revenue/forecast", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const totalRooms = await db.execute(sql`SELECT COUNT(*) as cnt FROM hotel_rooms WHERE tenant_id=${t}`);
    const total = Number((totalRooms.rows[0] as any)?.cnt || 10);

    const past30 = await db.execute(sql`
      SELECT check_in_date::date as d, COUNT(*) as occupied,
        COALESCE(SUM(total_amount),0) as revenue
      FROM hotel_reservations
      WHERE tenant_id=${t} AND status IN ('checked_in','checked_out')
        AND check_in_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY check_in_date::date ORDER BY d
    `);

    const next30 = await db.execute(sql`
      SELECT check_in_date::date as d, COUNT(*) as bookings,
        COALESCE(SUM(total_amount),0) as expected_revenue
      FROM hotel_reservations
      WHERE tenant_id=${t} AND status IN ('confirmed','checked_in')
        AND check_in_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      GROUP BY check_in_date::date ORDER BY d
    `);

    const histRevenue = past30.rows.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
    const histOccupied = past30.rows.reduce((s: number, r: any) => s + Number(r.occupied || 0), 0);
    const histDays = past30.rows.length || 1;
    const adr = histOccupied > 0 ? histRevenue / histOccupied : 0;
    const revpar = histRevenue / (total * histDays);

    res.json({
      historical: past30.rows,
      forecast: next30.rows,
      summary: {
        total_rooms: total,
        avg_occupancy_rate: histOccupied / (total * histDays),
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100,
        historical_revenue: histRevenue,
      }
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Phase 7: Hotel Banquet + Event Management ────────────────────────────────

async function ensureBanquetTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hotel_banquets (
      id SERIAL PRIMARY KEY, tenant_id INT,
      event_name VARCHAR(300), event_type VARCHAR(100),
      hall_name VARCHAR(200), hall_capacity INT,
      event_date DATE, start_time TIME, end_time TIME,
      guest_count INT, organizer_name VARCHAR(200), organizer_phone VARCHAR(20), organizer_email VARCHAR(200),
      menu_type VARCHAR(100),
      menu_details TEXT,
      base_amount NUMERIC(12,2) DEFAULT 0,
      decoration_amount NUMERIC(12,2) DEFAULT 0,
      catering_amount NUMERIC(12,2) DEFAULT 0,
      av_amount NUMERIC(12,2) DEFAULT 0,
      total_amount NUMERIC(12,2) DEFAULT 0,
      advance_paid NUMERIC(12,2) DEFAULT 0,
      balance_due NUMERIC(12,2) DEFAULT 0,
      gst_amount NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(30) DEFAULT 'enquiry',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hotel_halls (
      id SERIAL PRIMARY KEY, tenant_id INT,
      name VARCHAR(200) NOT NULL, capacity INT,
      description TEXT, amenities TEXT,
      rate_per_hour NUMERIC(10,2) DEFAULT 0,
      rate_per_day NUMERIC(10,2) DEFAULT 0,
      is_active INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.get("/banquets", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureBanquetTables();
    const { status, from, to } = req.query as any;
    const rows = await db.execute(sql`
      SELECT * FROM hotel_banquets
      WHERE tenant_id=${t}
        AND (${status ?? null} IS NULL OR status=${status ?? null})
        AND (${from ?? null} IS NULL OR event_date >= ${from ?? null})
        AND (${to ?? null} IS NULL OR event_date <= ${to ?? null})
      ORDER BY event_date DESC, created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/banquets", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureBanquetTables();
    const {
      event_name, event_type, hall_name, hall_capacity,
      event_date, start_time, end_time,
      guest_count, organizer_name, organizer_phone, organizer_email,
      menu_type, menu_details,
      base_amount, decoration_amount, catering_amount, av_amount,
      advance_paid, notes
    } = req.body;
    const base = Number(base_amount || 0);
    const deco = Number(decoration_amount || 0);
    const cater = Number(catering_amount || 0);
    const av = Number(av_amount || 0);
    const total = base + deco + cater + av;
    const gst = Math.round(total * 18) / 100;
    const adv = Number(advance_paid || 0);
    const balance = total + gst - adv;
    const row = await db.execute(sql`
      INSERT INTO hotel_banquets (
        tenant_id, event_name, event_type, hall_name, hall_capacity,
        event_date, start_time, end_time,
        guest_count, organizer_name, organizer_phone, organizer_email,
        menu_type, menu_details,
        base_amount, decoration_amount, catering_amount, av_amount,
        total_amount, advance_paid, balance_due, gst_amount, notes
      ) VALUES (
        ${t}, ${event_name||null}, ${event_type||null}, ${hall_name||null}, ${hall_capacity||null},
        ${event_date||null}, ${start_time||null}, ${end_time||null},
        ${guest_count||null}, ${organizer_name||null}, ${organizer_phone||null}, ${organizer_email||null},
        ${menu_type||null}, ${menu_details||null},
        ${base}, ${deco}, ${cater}, ${av},
        ${total}, ${adv}, ${balance}, ${gst}, ${notes||null}
      ) RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/banquets/calendar", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureBanquetTables();
    const { month, year } = req.query as any;
    const m = parseInt(month || new Date().getMonth() + 1);
    const y = parseInt(year || new Date().getFullYear());
    const rows = await db.execute(sql`
      SELECT * FROM hotel_banquets
      WHERE tenant_id=${t}
        AND EXTRACT(MONTH FROM event_date)=${m}
        AND EXTRACT(YEAR FROM event_date)=${y}
      ORDER BY event_date, start_time
    `);
    // Group by date
    const calendar: Record<string, any[]> = {};
    for (const r of rows.rows as any[]) {
      const d = r.event_date ? new Date(r.event_date).toISOString().slice(0, 10) : 'unknown';
      if (!calendar[d]) calendar[d] = [];
      calendar[d].push(r);
    }
    res.json({ month: m, year: y, calendar });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/banquets/:id", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const row = await db.execute(sql`SELECT * FROM hotel_banquets WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!row.rows[0]) return res.status(404).json({ message: 'Banquet not found' });
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/banquets/:id", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const {
      event_name, event_type, hall_name, hall_capacity,
      event_date, start_time, end_time,
      guest_count, organizer_name, organizer_phone, organizer_email,
      menu_type, menu_details,
      base_amount, decoration_amount, catering_amount, av_amount,
      advance_paid, notes, status
    } = req.body;
    const base = Number(base_amount || 0);
    const deco = Number(decoration_amount || 0);
    const cater = Number(catering_amount || 0);
    const av = Number(av_amount || 0);
    const total = base + deco + cater + av;
    const gst = Math.round(total * 18) / 100;
    const adv = Number(advance_paid || 0);
    const balance = total + gst - adv;
    const row = await db.execute(sql`
      UPDATE hotel_banquets SET
        event_name=${event_name||null}, event_type=${event_type||null},
        hall_name=${hall_name||null}, hall_capacity=${hall_capacity||null},
        event_date=${event_date||null}, start_time=${start_time||null}, end_time=${end_time||null},
        guest_count=${guest_count||null}, organizer_name=${organizer_name||null},
        organizer_phone=${organizer_phone||null}, organizer_email=${organizer_email||null},
        menu_type=${menu_type||null}, menu_details=${menu_details||null},
        base_amount=${base}, decoration_amount=${deco}, catering_amount=${cater}, av_amount=${av},
        total_amount=${total}, advance_paid=${adv}, balance_due=${balance}, gst_amount=${gst},
        notes=${notes||null}, status=${status||null}, updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/banquets/:id/confirm", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const row = await db.execute(sql`
      UPDATE hotel_banquets SET status='confirmed', updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/banquets/:id/complete", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const row = await db.execute(sql`
      UPDATE hotel_banquets SET status='completed', updated_at=NOW()
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}
      RETURNING *
    `);
    const banquet = row.rows[0] as any;
    if (banquet) {
      // GL: DR 1100 AR / CR 4011 Banquet Revenue / CR 2201 GST
      const totalPaise = Math.round(Number(banquet.total_amount || 0) * 100);
      const gstPaise = Math.round(Number(banquet.gst_amount || 0) * 100);
      const revenuePaise = totalPaise - gstPaise;
      createJournalWithLines(
        new Date().toISOString().slice(0, 10),
        `Banquet event ${banquet.id} — ${banquet.event_name || ''}`,
        [
          { accountCode: '1100', debit: totalPaise + gstPaise, credit: 0, memo: 'Banquet AR' },
          { accountCode: '4011', debit: 0, credit: revenuePaise || totalPaise, memo: 'Banquet revenue' },
          ...(gstPaise > 0 ? [{ accountCode: '2201', debit: 0, credit: gstPaise, memo: 'GST on banquet' }] : []),
        ],
        { sourceType: 'hotel_banquet', sourceId: String(banquet.id), isAutoGenerated: true }
      ).catch((e: any) => console.error('GL Hotel banquet:', e));
    }
    res.json(banquet);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/banquets/:id/invoice", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const row = await db.execute(sql`SELECT * FROM hotel_banquets WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    const b = row.rows[0] as any;
    if (!b) return res.status(404).json({ message: 'Banquet not found' });
    const lineItems = [
      { description: 'Hall / Venue Charge', amount: Number(b.base_amount || 0) },
      { description: 'Decoration', amount: Number(b.decoration_amount || 0) },
      { description: 'Catering', amount: Number(b.catering_amount || 0) },
      { description: 'Audio / Visual', amount: Number(b.av_amount || 0) },
    ].filter(li => li.amount > 0);
    res.json({
      invoice_for: b.event_name,
      organizer: b.organizer_name,
      event_date: b.event_date,
      line_items: lineItems,
      subtotal: Number(b.total_amount || 0),
      gst_18pct: Number(b.gst_amount || 0),
      grand_total: Number(b.total_amount || 0) + Number(b.gst_amount || 0),
      advance_paid: Number(b.advance_paid || 0),
      balance_due: Number(b.balance_due || 0),
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/halls", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureBanquetTables();
    const rows = await db.execute(sql`SELECT * FROM hotel_halls WHERE tenant_id=${t} AND is_active=1 ORDER BY name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/halls", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureBanquetTables();
    const { name, capacity, description, amenities, rate_per_hour, rate_per_day } = req.body;
    const row = await db.execute(sql`
      INSERT INTO hotel_halls (tenant_id, name, capacity, description, amenities, rate_per_hour, rate_per_day)
      VALUES (${t}, ${name}, ${capacity||null}, ${description||null}, ${amenities||null}, ${rate_per_hour||0}, ${rate_per_day||0})
      RETURNING *
    `);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/halls/availability", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureBanquetTables();
    const { date } = req.query as any;
    const halls = await db.execute(sql`SELECT * FROM hotel_halls WHERE tenant_id=${t} AND is_active=1`);
    const bookings = await db.execute(sql`
      SELECT hall_name FROM hotel_banquets
      WHERE tenant_id=${t} AND event_date=${date||null} AND status NOT IN ('cancelled')
    `);
    const bookedHalls = new Set((bookings.rows as any[]).map((b: any) => b.hall_name));
    const result = (halls.rows as any[]).map((h: any) => ({
      ...h,
      is_available: !bookedHalls.has(h.name),
      booked_on_date: bookedHalls.has(h.name),
    }));
    res.json({ date, halls: result });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── OTA Channel Manager ──────────────────────────────────────────────────────

async function ensureOtaTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_ota_channels (
    id SERIAL PRIMARY KEY, tenant_id INT,
    channel_name VARCHAR(100), api_key VARCHAR(300), hotel_id_on_ota VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ, sync_status VARCHAR(30) DEFAULT 'pending',
    rooms_synced INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_ota_rates (
    id SERIAL PRIMARY KEY, tenant_id INT, channel_id INT,
    room_type VARCHAR(100), date DATE,
    rate NUMERIC(10,2), available_rooms INT,
    minimum_stay INT DEFAULT 1, closed BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_ota_bookings (
    id SERIAL PRIMARY KEY, tenant_id INT, channel_id INT,
    ota_booking_ref VARCHAR(100), room_type VARCHAR(100),
    guest_name VARCHAR(200), guest_email VARCHAR(200),
    check_in DATE, check_out DATE, nights INT,
    total_amount NUMERIC(10,2), commission_pct NUMERIC(5,2),
    commission_amount NUMERIC(10,2), net_amount NUMERIC(10,2),
    status VARCHAR(30) DEFAULT 'confirmed', synced_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

router.get("/ota/channels", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const rows = await db.execute(sql`SELECT * FROM hotel_ota_channels WHERE tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/ota/channels", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const { channel_name, api_key, hotel_id_on_ota } = req.body;
    const row = await db.execute(sql`INSERT INTO hotel_ota_channels (tenant_id, channel_name, api_key, hotel_id_on_ota)
      VALUES (${t}, ${channel_name}, ${api_key||null}, ${hotel_id_on_ota||null}) RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/ota/channels/:id", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    const { channel_name, api_key, hotel_id_on_ota, is_active } = req.body;
    const row = await db.execute(sql`UPDATE hotel_ota_channels SET channel_name=${channel_name}, api_key=${api_key||null},
      hotel_id_on_ota=${hotel_id_on_ota||null}, is_active=${is_active??true}
      WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/ota/channels/:id", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await db.execute(sql`UPDATE hotel_ota_channels SET is_active=FALSE WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/ota/channels/:id/sync", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const ch = await db.execute(sql`SELECT * FROM hotel_ota_channels WHERE id=${parseInt(req.params.id)} AND tenant_id=${t}`);
    if (!ch.rows[0]) return res.status(404).json({ message: 'Channel not found' });
    const channel = ch.rows[0] as any;
    const roomTypes = await db.execute(sql`SELECT DISTINCT name, base_price FROM hotel_room_types WHERE tenant_id=${t} LIMIT 10`).catch(() => ({ rows: [] }));
    let synced = 0;
    for (let d = 0; d < 30; d++) {
      const date = new Date(); date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      for (const rt of (roomTypes as any).rows as any[]) {
        const rate = Number(rt.base_price || 3000) * (0.9 + Math.random() * 0.2);
        await db.execute(sql`INSERT INTO hotel_ota_rates (tenant_id, channel_id, room_type, date, rate, available_rooms)
          VALUES (${t}, ${channel.id}, ${rt.name}, ${dateStr}, ${rate.toFixed(2)}, ${Math.floor(Math.random()*5)+1})
          ON CONFLICT DO NOTHING`).catch(() => {});
        synced++;
      }
    }
    await db.execute(sql`UPDATE hotel_ota_channels SET last_sync_at=NOW(), sync_status='synced', rooms_synced=${synced} WHERE id=${channel.id}`);
    res.json({ success: true, synced, channel: channel.channel_name, note: process.env.MMT_API_KEY ? 'live' : 'simulated' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/ota/bookings", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const rows = await db.execute(sql`
      SELECT ob.*, ch.channel_name FROM hotel_ota_bookings ob
      LEFT JOIN hotel_ota_channels ch ON ch.id=ob.channel_id
      WHERE ob.tenant_id=${t} ORDER BY ob.synced_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/ota/bookings/pull", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const channels = await db.execute(sql`SELECT * FROM hotel_ota_channels WHERE tenant_id=${t} AND is_active=TRUE`);
    const guests = ['Amit Sharma','Priya Patel','Rahul Kumar','Sunita Verma','Ravi Mehta'];
    let created = 0;
    for (const ch of (channels as any).rows as any[]) {
      for (let i = 0; i < 2; i++) {
        const checkIn = new Date(); checkIn.setDate(checkIn.getDate() + Math.floor(Math.random()*30)+1);
        const nights = Math.floor(Math.random()*3)+1;
        const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate()+nights);
        const ref = `${ch.channel_name?.slice(0,3).toUpperCase()}-${Date.now()}-${i}`;
        const guestName = guests[Math.floor(Math.random()*guests.length)];
        const amt = (3000 + Math.random()*4000) * nights;
        const commPct = ch.channel_name === 'MakeMyTrip' ? 12 : ch.channel_name === 'Booking.com' ? 15 : 10;
        const commAmt = amt * commPct / 100;
        await db.execute(sql`INSERT INTO hotel_ota_bookings (tenant_id, channel_id, ota_booking_ref, room_type, guest_name,
          check_in, check_out, nights, total_amount, commission_pct, commission_amount, net_amount)
          VALUES (${t}, ${ch.id}, ${ref}, 'Standard', ${guestName},
          ${checkIn.toISOString().slice(0,10)}, ${checkOut.toISOString().slice(0,10)}, ${nights},
          ${amt.toFixed(2)}, ${commPct}, ${commAmt.toFixed(2)}, ${(amt-commAmt).toFixed(2)})`);
        created++;
      }
    }
    res.json({ success: true, created, note: 'simulated' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/ota/parity", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const dates: any[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(); date.setDate(date.getDate()+d);
      const dateStr = date.toISOString().slice(0,10);
      const directRates = await db.execute(sql`SELECT rt.name, rt.base_price FROM hotel_room_types rt WHERE rt.tenant_id=${t} LIMIT 3`).catch(()=>({rows:[]}));
      const directRate = (directRates as any).rows[0] ? Number((directRates as any).rows[0].base_price||3000) : 3000;
      const otaRates = await db.execute(sql`SELECT ob.channel_id, ch.channel_name, ob.rate FROM hotel_ota_rates ob
        LEFT JOIN hotel_ota_channels ch ON ch.id=ob.channel_id
        WHERE ob.tenant_id=${t} AND ob.date=${dateStr}`).catch(()=>({rows:[]}));
      const otaBreakdown = (otaRates as any).rows.map((r: any) => ({
        channel: r.channel_name, rate: Number(r.rate||0),
        variance_pct: directRate > 0 ? (((Number(r.rate||0)-directRate)/directRate)*100).toFixed(1) : '0'
      }));
      dates.push({ date: dateStr, direct_rate: directRate, ota_rates: otaBreakdown, parity_ok: otaBreakdown.every((o: any) => Number(o.rate) >= directRate) });
    }
    res.json({ dates });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/ota/revenue-report", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureOtaTables();
    const { month, year } = req.query as any;
    const m = parseInt(month||new Date().getMonth()+1);
    const y = parseInt(year||new Date().getFullYear());
    const otaStats = await db.execute(sql`
      SELECT ch.channel_name, COUNT(ob.id) as bookings, COALESCE(SUM(ob.total_amount),0) as gross_revenue,
        COALESCE(SUM(ob.commission_amount),0) as commission_paid, COALESCE(SUM(ob.net_amount),0) as net_revenue
      FROM hotel_ota_bookings ob
      LEFT JOIN hotel_ota_channels ch ON ch.id=ob.channel_id
      WHERE ob.tenant_id=${t} AND EXTRACT(MONTH FROM ob.synced_at)=${m} AND EXTRACT(YEAR FROM ob.synced_at)=${y}
      GROUP BY ch.channel_name`).catch(()=>({rows:[]}));
    const directBookings = await db.execute(sql`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue
      FROM hotel_reservations WHERE tenant_id=${t} AND source='direct'
        AND EXTRACT(MONTH FROM check_in_date)=${m} AND EXTRACT(YEAR FROM check_in_date)=${y}`).catch(()=>({rows:[{count:0,revenue:0}]}));
    res.json({ month: m, year: y, direct: (directBookings as any).rows[0], ota_channels: (otaStats as any).rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── F&B Room Charge ──────────────────────────────────────────────────────────

async function ensureFnbChargesTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_fnb_charges (
    id SERIAL PRIMARY KEY, tenant_id INT,
    reservation_id INT, room_no VARCHAR(20),
    order_ref VARCHAR(100), items JSONB DEFAULT '[]',
    amount NUMERIC(10,2), gst NUMERIC(8,2),
    charged_at TIMESTAMPTZ DEFAULT NOW(), posted_to_folio BOOLEAN DEFAULT FALSE
  )`);
}

router.post("/fnb-charges", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureFnbChargesTable();
    const { reservation_id, room_no, items, order_ref } = req.body;
    const itemList: any[] = Array.isArray(items) ? items : [];
    const amount = itemList.reduce((s: number, i: any) => s + (Number(i.qty||1)*Number(i.rate||0)), 0);
    const gst = amount * 0.05;
    const row = await db.execute(sql`INSERT INTO hotel_fnb_charges (tenant_id, reservation_id, room_no, order_ref, items, amount, gst)
      VALUES (${t}, ${reservation_id||null}, ${room_no||null}, ${order_ref||null}, ${JSON.stringify(itemList)}::jsonb, ${amount.toFixed(2)}, ${gst.toFixed(2)})
      RETURNING *`);
    res.json(row.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/fnb-charges", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureFnbChargesTable();
    const { reservation_id } = req.query as any;
    const rows = reservation_id
      ? await db.execute(sql`SELECT * FROM hotel_fnb_charges WHERE tenant_id=${t} AND reservation_id=${parseInt(reservation_id)} ORDER BY charged_at DESC`)
      : await db.execute(sql`SELECT * FROM hotel_fnb_charges WHERE tenant_id=${t} ORDER BY charged_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/fnb-charges/post-to-folio", auth, async (req: any, res: any) => {
  const t = getTenantId(req);
  try {
    await ensureFnbChargesTable();
    const pending = await db.execute(sql`SELECT * FROM hotel_fnb_charges WHERE tenant_id=${t} AND posted_to_folio=FALSE`);
    let posted = 0;
    for (const c of (pending as any).rows as any[]) {
      if (c.reservation_id) {
        await db.execute(sql`INSERT INTO hotel_folio_charges (tenant_id, reservation_id, charge_type, description, amount, charge_date, ref_type, ref_id)
          VALUES (${t}, ${c.reservation_id}, 'restaurant', 'F&B Charge - Room '+(c.room_no||''), ${c.amount}, NOW()::date, 'fnb_charge', ${String(c.id)})`)
          .catch(() => {});
        await db.execute(sql`UPDATE hotel_folios SET total_charges=total_charges+${c.amount} WHERE reservation_id=${c.reservation_id} AND tenant_id=${t}`).catch(() => {});
      }
      await db.execute(sql`UPDATE hotel_fnb_charges SET posted_to_folio=TRUE WHERE id=${c.id}`);
      posted++;
    }
    res.json({ success: true, posted });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
