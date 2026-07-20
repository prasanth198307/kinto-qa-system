import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { glHotelCheckout, glHotelFolio } from "./vertical-gl-service";
import { whatsappService } from "./whatsappService";
import { syncVerticalCustomerToCRM } from "./cross-module-sync";

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
    const { room_number, room_type_id, floor, status } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO hotel_rooms (tenant_id, room_number, room_type_id, floor, status)
      VALUES (${tid(req)}, ${room_number}, ${room_type_id||null}, ${floor||null}, ${status||'available'})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/rooms/:id", requireAuth, async (req: any, res) => {
  try {
    const { room_number, room_type_id, floor, status } = req.body;
    const rows = await db.execute(sql`
      UPDATE hotel_rooms SET room_number=${room_number}, room_type_id=${room_type_id||null},
        floor=${floor||null}, status=${status||'available'}
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
    const guest = rows.rows[0] as any;
    syncVerticalCustomerToCRM(tid(req), 'hotel', { id: guest.id, name, phone: phone ?? null, email: email ?? null, address: address ?? null }).catch(() => {});
    res.json(guest);
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
    const { guest_id, guest_name, guest_phone, guest_email, room_id, room_type, check_in_date, check_out_date, adults, children, rate_per_night, total_amount, total_nights, advance_paid, payment_mode, source, notes, special_requests } = req.body;
    const no = "RES-" + Date.now();
    // Create guest record if guest_name provided without guest_id
    let guestId = guest_id || null;
    if (!guestId && guest_name) {
      try {
        const g = await db.execute(sql`INSERT INTO hotel_guests (tenant_id, name, phone, email) VALUES (${tid(req)}, ${guest_name}, ${guest_phone||null}, ${guest_email||null}) RETURNING id`);
        guestId = (g.rows[0] as any).id;
      } catch {}
    }
    const nights = total_nights || 1;
    const totalAmt = total_amount || (rate_per_night || 0) * nights;
    const rows = await db.execute(sql`
      INSERT INTO hotel_reservations (tenant_id, reservation_number, guest_id, room_id, check_in_date, check_out_date,
        adults, children, rate_per_night, total_nights, total_amount, advance_paid, source, notes)
      VALUES (${tid(req)}, ${no}, ${guestId}, ${room_id||null}, ${check_in_date}, ${check_out_date},
        ${adults||1}, ${children||0}, ${rate_per_night||0}, ${nights}, ${totalAmt}, ${advance_paid||0},
        ${source||'direct'}, ${notes||special_requests||null})
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
    const rsv = rows.rows[0] as any;
    if (rsv?.room_id) {
      await db.execute(sql`UPDATE hotel_rooms SET status='occupied' WHERE id=${rsv.room_id}`);
    }
    // WhatsApp welcome notification
    if (rsv) {
      try {
        const [guestInfo, roomInfo, hotelInfo] = await Promise.all([
          db.execute(sql`SELECT name, phone FROM hotel_guests WHERE id=${rsv.guest_id} AND tenant_id=${tid(req)}`),
          db.execute(sql`SELECT room_number FROM hotel_rooms WHERE id=${rsv.room_id}`),
          db.execute(sql`SELECT company_name FROM tenant_settings WHERE tenant_id=${tid(req)}`),
        ]);
        const guest = guestInfo.rows[0] as any;
        const room = roomInfo.rows[0] as any;
        const hotel = hotelInfo.rows[0] as any;
        if (guest?.phone) {
          const checkoutDate = rsv.check_out_date ? new Date(rsv.check_out_date).toLocaleDateString("en-IN") : "-";
          import("./notif-service").then(({ notifSendTemplate }) =>
            notifSendTemplate({
              tenantId: Number(tid(req)), phone: guest.phone, template: "hotel_checkin",
              vars: { name: guest.name, org: hotel?.company_name || "our hotel", room: room?.room_number || "-", checkout_date: checkoutDate },
              entityType: "hotel_reservation", entityId: Number(rsv.id),
            })
          ).catch((e: any) => console.error("notif checkin", e));
        }
      } catch (we: any) { console.error("WA checkin prep", we); }
    }
    res.json(rsv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/checkout", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      UPDATE hotel_reservations SET status='checked_out', actual_check_out=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    const reservation = rows.rows[0] as any;
    if (reservation?.room_id) {
      await db.execute(sql`UPDATE hotel_rooms SET status='available' WHERE id=${reservation.room_id}`);
    }
    // GL auto-post: Dr Cash/Receivable, Cr Room Revenue
    if (reservation) {
      glHotelCheckout({ tenantId: Number(tid(req)), reservationId: req.params.id, totalAmount: Math.round((reservation.total_amount || 0) * 100), paidAmount: Math.round((reservation.paid_amount || reservation.total_amount || 0) * 100), paymentMode: reservation.payment_mode || "cash" });
      // WhatsApp checkout notification
      try {
        const [guestInfo, hotelInfo] = await Promise.all([
          db.execute(sql`SELECT name, phone FROM hotel_guests WHERE id=${reservation.guest_id} AND tenant_id=${tid(req)}`),
          db.execute(sql`SELECT company_name FROM tenant_settings WHERE tenant_id=${tid(req)}`),
        ]);
        const guest = guestInfo.rows[0] as any;
        const hotel = hotelInfo.rows[0] as any;
        if (guest?.phone) {
          const total = Number(reservation.total_amount || 0).toFixed(2);
          const msg = `Thank you for staying at ${hotel?.company_name || "our hotel"}, ${guest.name}! Total: ₹${total}. We hope to see you again!`;
          whatsappService.sendTextMessage({ to: guest.phone, message: msg }).catch((e: any) => console.error("WA checkout", e));
        }
      } catch (we: any) { console.error("WA checkout prep", we); }
    }
    res.json(reservation);
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
    const fId = (folio.rows[0] as any).id as number;
    if (items?.length) {
      for (const it of items) {
        await db.execute(sql`
          INSERT INTO hotel_folio_items (folio_id, description, quantity, rate, amount, category)
          VALUES (${fId}, ${it.description}, ${it.quantity||1}, ${it.rate||0}, ${it.amount||0}, ${it.category||'room'})`);
      }
    }
    // GL auto-post: Dr Cash/Receivable, Cr Room Revenue
    glHotelFolio({ tenantId: Number(tid(req)), folioId: fId, totalAmount: Math.round((total_amount||0)*100), paidAmount: Math.round((paid_amount||0)*100), paymentMode: payment_mode || "cash" });
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
      WHERE h.tenant_id=${tid(req)} ORDER BY h.task_date DESC, h.created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/housekeeping", requireAuth, async (req: any, res) => {
  try {
    const { room_id, task_type, assigned_to, scheduled_date, notes } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO hotel_housekeeping (tenant_id, room_id, task_type, assigned_to, task_date, notes)
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
        assigned_to=${assigned_to||null}, task_date=${scheduled_date||null},
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

// ── Folio: add charge (minibar, laundry, F&B room charge, other) ─────────────
router.post("/folios/:id/add-charge", requireAuth, async (req: any, res) => {
  try {
    const { description, quantity, rate, amount, category } = req.body;
    await db.execute(sql`
      INSERT INTO hotel_folio_items (folio_id, description, quantity, rate, amount, category)
      VALUES (${req.params.id}, ${description}, ${quantity||1}, ${rate||0}, ${amount||0}, ${category||'other'})`);
    await db.execute(sql`
      UPDATE hotel_folios SET total_amount = total_amount + ${amount||0},
        balance_amount = balance_amount + ${amount||0}, updated_at = NOW()
      WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Folio PDF ─────────────────────────────────────────────────────────────────
router.get("/folios/:id/pdf", requireAuth, async (req: any, res) => {
  try {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const folio = (await db.execute(sql`SELECT f.*, g.name as guest_name, r.room_number FROM hotel_folios f LEFT JOIN hotel_guests g ON f.guest_id=g.id LEFT JOIN hotel_rooms r ON f.room_id=r.id WHERE f.id=${req.params.id} AND f.tenant_id=${tid(req)}`)).rows[0] as any;
    const items = (await db.execute(sql`SELECT * FROM hotel_folio_items WHERE folio_id=${req.params.id} ORDER BY created_at`)).rows as any[];
    if (!folio) return res.status(404).json({ error: "Folio not found" });
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const { height } = page.getSize();
    let y = height - 50;
    page.drawText("HOTEL FOLIO", { x: 50, y, font: bold, size: 20, color: rgb(0.1, 0.2, 0.6) });
    y -= 30;
    page.drawText(`Folio #: ${folio.folio_number}`, { x: 50, y, font, size: 11 });
    y -= 18;
    page.drawText(`Guest: ${folio.guest_name || "—"}   Room: ${folio.room_number || "—"}`, { x: 50, y, font, size: 11 });
    y -= 18;
    page.drawText(`Date: ${new Date(folio.created_at).toLocaleDateString("en-IN")}`, { x: 50, y, font, size: 11 });
    y -= 30;
    ["Description", "Qty", "Rate", "Amount"].forEach((h, i) => {
      page.drawText(h, { x: 50 + [0,250,310,390][i], y, font: bold, size: 11 });
    });
    y -= 5;
    page.drawLine({ start: { x: 50, y }, end: { x: 540, y }, thickness: 1, color: rgb(0.5,0.5,0.5) });
    y -= 20;
    for (const it of items) {
      page.drawText(String(it.description||"").slice(0,35), { x: 50, y, font, size: 10 });
      page.drawText(String(it.quantity||1), { x: 300, y, font, size: 10 });
      page.drawText(`₹${Number(it.rate||0).toFixed(2)}`, { x: 360, y, font, size: 10 });
      page.drawText(`₹${Number(it.amount||0).toFixed(2)}`, { x: 440, y, font, size: 10 });
      y -= 18;
      if (y < 80) break;
    }
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: 540, y }, thickness: 1, color: rgb(0.5,0.5,0.5) });
    y -= 20;
    page.drawText(`Total: ₹${Number(folio.total_amount||0).toFixed(2)}`, { x: 400, y, font: bold, size: 13 });
    y -= 18;
    page.drawText(`Paid: ₹${Number(folio.paid_amount||0).toFixed(2)}`, { x: 400, y, font, size: 11 });
    y -= 18;
    page.drawText(`Balance: ₹${Number(folio.balance_amount||0).toFixed(2)}`, { x: 400, y, font: bold, size: 12, color: rgb(0.7,0.1,0.1) });
    const pdfBytes = await doc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="folio-${folio.folio_number}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Rate Plans ─────────────────────────────────────────────────────────────────
router.get("/rate-plans", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_rate_plans (id SERIAL PRIMARY KEY, tenant_id TEXT, name TEXT, room_type_id INT, meal_plan TEXT, base_rate NUMERIC DEFAULT 0, weekend_rate NUMERIC DEFAULT 0, valid_from DATE, valid_to DATE, created_at TIMESTAMPTZ DEFAULT NOW())`);
    const rows = await db.execute(sql`SELECT rp.*, rt.name as room_type_name FROM hotel_rate_plans rp LEFT JOIN hotel_room_types rt ON rp.room_type_id=rt.id WHERE rp.tenant_id=${tid(req)} ORDER BY rp.name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/rate-plans", requireAuth, async (req: any, res) => {
  try {
    const { name, room_type_id, meal_plan, base_rate, weekend_rate, valid_from, valid_to } = req.body;
    const r = await db.execute(sql`INSERT INTO hotel_rate_plans (tenant_id,name,room_type_id,meal_plan,base_rate,weekend_rate,valid_from,valid_to) VALUES (${tid(req)},${name},${room_type_id||null},${meal_plan||"EP"},${base_rate||0},${weekend_rate||0},${valid_from||null},${valid_to||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/rate-plans/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, room_type_id, meal_plan, base_rate, weekend_rate, valid_from, valid_to } = req.body;
    const r = await db.execute(sql`UPDATE hotel_rate_plans SET name=${name},room_type_id=${room_type_id||null},meal_plan=${meal_plan||"EP"},base_rate=${base_rate||0},weekend_rate=${weekend_rate||0},valid_from=${valid_from||null},valid_to=${valid_to||null} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.delete("/rate-plans/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_rate_plans WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Corporate Accounts ─────────────────────────────────────────────────────────
router.get("/corporate", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_corporate_accounts (id SERIAL PRIMARY KEY, tenant_id TEXT, company_name TEXT, contact_name TEXT, contact_email TEXT, contact_phone TEXT, negotiated_rate NUMERIC DEFAULT 0, credit_limit NUMERIC DEFAULT 0, credit_days INT DEFAULT 30, gst_no TEXT, billing_address TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW())`);
    const rows = await db.execute(sql`SELECT * FROM hotel_corporate_accounts WHERE tenant_id=${tid(req)} ORDER BY company_name`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/corporate", requireAuth, async (req: any, res) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, negotiated_rate, credit_limit, credit_days, gst_no, billing_address } = req.body;
    const r = await db.execute(sql`INSERT INTO hotel_corporate_accounts (tenant_id,company_name,contact_name,contact_email,contact_phone,negotiated_rate,credit_limit,credit_days,gst_no,billing_address) VALUES (${tid(req)},${company_name},${contact_name||""},${contact_email||""},${contact_phone||""},${negotiated_rate||0},${credit_limit||0},${credit_days||30},${gst_no||""},${billing_address||""}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.put("/corporate/:id", requireAuth, async (req: any, res) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, negotiated_rate, credit_limit, credit_days, gst_no, billing_address, status } = req.body;
    const r = await db.execute(sql`UPDATE hotel_corporate_accounts SET company_name=${company_name},contact_name=${contact_name||""},contact_email=${contact_email||""},contact_phone=${contact_phone||""},negotiated_rate=${negotiated_rate||0},credit_limit=${credit_limit||0},credit_days=${credit_days||30},gst_no=${gst_no||""},billing_address=${billing_address||""},status=${status||"active"} WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.delete("/corporate/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM hotel_corporate_accounts WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Night Audit ────────────────────────────────────────────────────────────────
router.get("/night-audit/history", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS hotel_night_audit (id SERIAL PRIMARY KEY, tenant_id TEXT, audit_date DATE, rooms_occupied INT DEFAULT 0, rooms_available INT DEFAULT 0, occupancy_pct NUMERIC DEFAULT 0, revenue NUMERIC DEFAULT 0, no_shows INT DEFAULT 0, arrivals INT DEFAULT 0, departures INT DEFAULT 0, run_by TEXT, run_at TIMESTAMPTZ DEFAULT NOW())`);
    const rows = await db.execute(sql`SELECT * FROM hotel_night_audit WHERE tenant_id=${tid(req)} ORDER BY audit_date DESC LIMIT 30`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.post("/night-audit/run", requireAuth, async (req: any, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rooms, checkedIn, arrivals, departures, revenue] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available FROM hotel_rooms WHERE tenant_id=${tid(req)}`),
      db.execute(sql`SELECT COUNT(*) as count FROM hotel_reservations WHERE tenant_id=${tid(req)} AND status='checked_in'`),
      db.execute(sql`SELECT COUNT(*) as count FROM hotel_reservations WHERE tenant_id=${tid(req)} AND check_in_date=${today}`),
      db.execute(sql`SELECT COUNT(*) as count FROM hotel_reservations WHERE tenant_id=${tid(req)} AND check_out_date=${today}`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as total FROM hotel_folios WHERE tenant_id=${tid(req)} AND DATE(created_at)=${today}`),
    ]);
    const totalRooms = Number(rooms.rows[0]?.total || 1);
    const occupied = Number(checkedIn.rows[0]?.count || 0);
    const pct = Math.round((occupied / totalRooms) * 100);
    const r = await db.execute(sql`
      INSERT INTO hotel_night_audit (tenant_id,audit_date,rooms_occupied,rooms_available,occupancy_pct,revenue,arrivals,departures,run_by)
      VALUES (${tid(req)},${today},${occupied},${Number(rooms.rows[0]?.available||0)},${pct},${Number(revenue.rows[0]?.total||0)},${Number(arrivals.rows[0]?.count||0)},${Number(departures.rows[0]?.count||0)},${req.user?.username||"system"})
      ON CONFLICT DO NOTHING RETURNING *`);
    res.json(r.rows[0] || { audit_date: today, rooms_occupied: occupied, occupancy_pct: pct, revenue: Number(revenue.rows[0]?.total||0) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Hotel Reports ──────────────────────────────────────────────────────────────
router.get("/reports/:tab", requireAuth, async (req: any, res) => {
  const { from, to } = req.query as any;
  const f = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const t = to || new Date().toISOString().slice(0, 10);
  try {
    switch (req.params.tab) {
      case "occupancy":
        return res.json(await db.execute(sql`SELECT DATE(check_in_date) as date, COUNT(*) as arrivals, COUNT(CASE WHEN status='checked_out' THEN 1 END) as departures, COUNT(CASE WHEN status='checked_in' THEN 1 END) as in_house FROM hotel_reservations WHERE tenant_id=${tid(req)} AND check_in_date BETWEEN ${f} AND ${t} GROUP BY 1 ORDER BY 1`).then(r => r.rows));
      case "revenue":
        return res.json(await db.execute(sql`SELECT DATE(created_at) as date, COUNT(*) as folios, SUM(total_amount) as gross, SUM(paid_amount) as collected, SUM(balance_amount) as outstanding FROM hotel_folios WHERE tenant_id=${tid(req)} AND DATE(created_at) BETWEEN ${f} AND ${t} GROUP BY 1 ORDER BY 1`).then(r => r.rows));
      case "room_type":
        return res.json(await db.execute(sql`SELECT rt.name as room_type, COUNT(res.id) as reservations, SUM(res.total_amount) as revenue FROM hotel_reservations res LEFT JOIN hotel_rooms r ON res.room_id=r.id LEFT JOIN hotel_room_types rt ON r.room_type_id=rt.id WHERE res.tenant_id=${tid(req)} AND res.check_in_date BETWEEN ${f} AND ${t} GROUP BY 1 ORDER BY 3 DESC`).then(r => r.rows));
      case "source":
        return res.json(await db.execute(sql`SELECT source, COUNT(*) as reservations, SUM(total_amount) as revenue FROM hotel_reservations WHERE tenant_id=${tid(req)} AND check_in_date BETWEEN ${f} AND ${t} GROUP BY 1 ORDER BY 3 DESC`).then(r => r.rows));
      case "housekeeping":
        return res.json(await db.execute(sql`SELECT status, COUNT(*) as rooms FROM hotel_rooms WHERE tenant_id=${tid(req)} GROUP BY 1`).then(r => r.rows));
      default:
        return res.json([]);
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Room charge from Restaurant POS ───────────────────────────────────────────
router.post("/room-charge", requireAuth, async (req: any, res) => {
  try {
    const { room_number, amount, description, kot_id } = req.body;
    const room = (await db.execute(sql`SELECT r.*, res.id as reservation_id FROM hotel_rooms r LEFT JOIN hotel_reservations res ON r.id=res.room_id AND res.status='checked_in' WHERE r.tenant_id=${tid(req)} AND r.room_number=${room_number}`)).rows[0] as any;
    if (!room) return res.status(404).json({ error: "Room not found or not occupied" });
    const folio = (await db.execute(sql`SELECT id FROM hotel_folios WHERE tenant_id=${tid(req)} AND reservation_id=${room.reservation_id} AND status='open' LIMIT 1`)).rows[0] as any;
    if (!folio) return res.status(404).json({ error: "No open folio found for this room" });
    await db.execute(sql`INSERT INTO hotel_folio_items (folio_id, description, quantity, rate, amount, category) VALUES (${folio.id}, ${description||"F&B Room Charge"}, 1, ${amount||0}, ${amount||0}, 'fnb')`);
    await db.execute(sql`UPDATE hotel_folios SET total_amount=total_amount+${amount||0}, balance_amount=balance_amount+${amount||0} WHERE id=${folio.id}`);
    res.json({ success: true, folio_id: folio.id });
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
