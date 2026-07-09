import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { createHmac } from "crypto";

const router = Router();

const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

let tablesReady = false;
async function ensureTablesOnce() {
  if (tablesReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_rooms (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      room_no VARCHAR(50) NOT NULL,
      title VARCHAR(300),
      description TEXT,
      room_type VARCHAR(30) DEFAULT 'meeting',
      host_user_id INT,
      host_name VARCHAR(200),
      status VARCHAR(20) DEFAULT 'scheduled',
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      duration_mins INT,
      max_participants INT DEFAULT 10,
      recording_url TEXT,
      meeting_url TEXT,
      room_code VARCHAR(100) UNIQUE,
      password VARCHAR(50),
      daily_room_name VARCHAR(200),
      participants JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_participants (
      id SERIAL PRIMARY KEY,
      room_id INT NOT NULL,
      tenant_id INT NOT NULL,
      user_id INT,
      name VARCHAR(200),
      email VARCHAR(200),
      joined_at TIMESTAMPTZ,
      left_at TIMESTAMPTZ,
      duration_mins INT,
      role VARCHAR(20) DEFAULT 'participant'
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_signals (
      id SERIAL PRIMARY KEY,
      room_id INT NOT NULL,
      from_peer VARCHAR(100),
      to_peer VARCHAR(100),
      signal_type VARCHAR(30),
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_recordings (
      id SERIAL PRIMARY KEY,
      room_id INT,
      tenant_id INT,
      daily_recording_id VARCHAR(200) UNIQUE,
      duration_secs INT,
      file_size_bytes INT,
      download_url TEXT,
      expires_at TIMESTAMPTZ,
      status VARCHAR(30) DEFAULT 'processing',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS swachmeet_recordings (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      room_id TEXT,
      meeting_id INT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      stopped_at TIMESTAMPTZ,
      duration_seconds INT,
      recording_url TEXT,
      status TEXT DEFAULT 'recording'
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_webinar_registrations (
      id SERIAL PRIMARY KEY,
      room_id INT,
      tenant_id INT,
      name VARCHAR(200),
      email VARCHAR(200),
      phone VARCHAR(20),
      company VARCHAR(200),
      questions TEXT,
      status VARCHAR(20) DEFAULT 'registered',
      registered_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tablesReady = true;
}

async function nextRoomNo(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const res = await db.execute(sql`SELECT COUNT(*) as cnt FROM meet_rooms WHERE tenant_id = ${tenantId} AND room_no LIKE ${'MTG-' + year + '-%'}`);
  const cnt = parseInt((res.rows[0] as any).cnt) + 1;
  return `MTG-${year}-${String(cnt).padStart(5, "0")}`;
}

async function createDailyRoom(title: string, roomCode: string, roomType: string, maxParticipants: number): Promise<{ name: string; url: string } | null> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return null;
  try {
    const isWebinar = roomType === "webinar";
    const roomConfig: any = {
      name: `swachmeet-${roomCode}`,
      privacy: "public",
      properties: {
        max_participants: maxParticipants,
        enable_screenshare: true,
        enable_recording: "cloud",
        enable_chat: true,
        enable_knocking: isWebinar,
        start_video_off: isWebinar,
        start_audio_off: isWebinar,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
    };
    const resp = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(roomConfig),
    });
    const data: any = await resp.json();
    return data.error ? null : { name: data.name, url: data.url };
  } catch {
    return null;
  }
}

// GET /api/meet/rooms
router.get("/rooms", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`
    SELECT r.*,
      (SELECT COUNT(*) FROM meet_participants p WHERE p.room_id = r.id) as participant_count,
      (SELECT COUNT(*) FROM meet_webinar_registrations wr WHERE wr.room_id = r.id) as registration_count
    FROM meet_rooms r WHERE r.tenant_id = ${tid(req)} ORDER BY r.created_at DESC
  `);
  res.json(rows.rows);
});

// POST /api/meet/rooms
router.post("/rooms", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { title, description, room_type, scheduled_at, max_participants, password } = req.body;
  const roomNo = await nextRoomNo(tenantId);
  const roomCode = crypto.randomBytes(6).toString("hex");
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  const maxPart = max_participants || 10;

  const daily = await createDailyRoom(title || roomNo, roomCode, room_type || "meeting", maxPart);
  const dailyRoomName = daily?.name || null;
  const meetingUrl = daily?.url || `${baseUrl}/meet/${roomCode}`;

  const result = await db.execute(sql`
    INSERT INTO meet_rooms (tenant_id, room_no, title, description, room_type, host_user_id, host_name, scheduled_at, max_participants, room_code, password, daily_room_name, meeting_url)
    VALUES (${tenantId}, ${roomNo}, ${title || roomNo}, ${description || null}, ${room_type || "meeting"}, ${req.user?.id || null}, ${req.user?.name || null}, ${scheduled_at || null}, ${maxPart}, ${roomCode}, ${password || null}, ${dailyRoomName}, ${meetingUrl})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// GET /api/meet/rooms/:id
router.get("/rooms/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  if (!rows.rows.length) return res.status(404).json({ message: "Not found" });
  res.json(rows.rows[0]);
});

// PUT /api/meet/rooms/:id
router.put("/rooms/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { title, scheduled_at, description } = req.body;
  await db.execute(sql`
    UPDATE meet_rooms SET title = COALESCE(${title || null}, title), scheduled_at = COALESCE(${scheduled_at || null}, scheduled_at), description = COALESCE(${description || null}, description)
    WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}
  `);
  const upd = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id}`);
  res.json(upd.rows[0]);
});

// DELETE /api/meet/rooms/:id
router.delete("/rooms/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  await db.execute(sql`UPDATE meet_rooms SET status = 'cancelled' WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Cancelled" });
});

// POST /api/meet/rooms/:id/start
router.post("/rooms/:id/start", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  await db.execute(sql`UPDATE meet_rooms SET status = 'live', started_at = NOW() WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  const upd = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id}`);
  res.json(upd.rows[0]);
});

// POST /api/meet/rooms/:id/end
router.post("/rooms/:id/end", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Not found" });
  const room = roomRes.rows[0] as any;
  const startedAt = room.started_at ? new Date(room.started_at) : new Date();
  const durationMins = Math.round((Date.now() - startedAt.getTime()) / 60000);
  await db.execute(sql`UPDATE meet_rooms SET status = 'ended', ended_at = NOW(), duration_mins = ${durationMins} WHERE id = ${req.params.id}`);
  res.json({ message: "Ended", duration_mins: durationMins });
});

// POST /api/meet/rooms/:id/invite
router.post("/rooms/:id/invite", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Not found" });
  const room = roomRes.rows[0] as any;
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) return res.status(400).json({ message: "emails array required" });
  const dateStr = room.scheduled_at ? new Date(room.scheduled_at).toLocaleString() : "TBD";
  for (const email of emails) {
    console.log(`[SwachMeet] Invite to ${email}: "${room.title}" on ${dateStr}. Join: ${room.meeting_url}`);
  }
  res.json({ message: `Invited ${emails.length} participants` });
});

// GET /api/meet/rooms/:id/participants
router.get("/rooms/:id/participants", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_participants WHERE room_id = ${req.params.id} ORDER BY joined_at`);
  res.json(rows.rows);
});

// POST /api/meet/rooms/:id/join
router.post("/rooms/:id/join", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { name, email, role } = req.body;
  const result = await db.execute(sql`
    INSERT INTO meet_participants (room_id, tenant_id, user_id, name, email, joined_at, role)
    VALUES (${req.params.id}, ${tenantId}, ${req.user?.id || null}, ${name || req.user?.name || "Guest"}, ${email || req.user?.email || null}, NOW(), ${role || "participant"})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// POST /api/meet/rooms/:id/leave
router.post("/rooms/:id/leave", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { participant_id } = req.body;
  const partRes = await db.execute(sql`SELECT * FROM meet_participants WHERE id = ${participant_id}`);
  if (!partRes.rows.length) return res.status(404).json({ message: "Participant not found" });
  const part = partRes.rows[0] as any;
  const joinedAt = part.joined_at ? new Date(part.joined_at) : new Date();
  const durationMins = Math.round((Date.now() - joinedAt.getTime()) / 60000);
  await db.execute(sql`UPDATE meet_participants SET left_at = NOW(), duration_mins = ${durationMins} WHERE id = ${participant_id}`);
  res.json({ message: "Left", duration_mins: durationMins });
});

// GET /api/meet/rooms/:id/host-token
router.get("/rooms/:id/host-token", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Not found" });
  const room = roomRes.rows[0] as any;

  if (!process.env.DAILY_API_KEY || !room.daily_room_name) {
    // Fallback: return meeting_url without token
    return res.json({ token: null, meeting_url: room.meeting_url, simulated: true });
  }

  try {
    const tokenResp = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          room_name: room.daily_room_name,
          is_owner: true,
          enable_recording: "cloud",
          user_name: (req.user as any)?.username || "Host",
          user_id: (req.user as any)?.id?.toString(),
        },
      }),
    });
    const tokenData = await tokenResp.json() as any;
    const hostUrl = `${room.meeting_url}?t=${tokenData.token}&showLeaveButton=true&showFullscreenButton=true`;
    return res.json({ token: tokenData.token, meeting_url: hostUrl });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/meet/rooms/:id/recordings
router.get("/rooms/:id/recordings", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`
    SELECT * FROM meet_recordings WHERE room_id = ${req.params.id} AND tenant_id = ${tid(req)} ORDER BY created_at DESC
  `);
  res.json(rows.rows);
});

// POST /api/meet/rooms/:id/recordings/fetch
router.post("/rooms/:id/recordings/fetch", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tenantId}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Not found" });
  const room = roomRes.rows[0] as any;

  if (!process.env.DAILY_API_KEY || !room.daily_room_name) {
    return res.json({ fetched: 0, simulated: true, message: "DAILY_API_KEY not configured" });
  }

  try {
    const resp = await fetch(`https://api.daily.co/v1/recordings?room_name=${room.daily_room_name}`, {
      headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
    });
    const data = await resp.json() as any;
    const recordings = data.data || [];
    let fetched = 0;

    for (const rec of recordings) {
      const expiresAt = rec.expires ? new Date(rec.expires * 1000).toISOString() : null;
      await db.execute(sql`
        INSERT INTO meet_recordings (room_id, tenant_id, daily_recording_id, duration_secs, file_size_bytes, download_url, expires_at, status)
        VALUES (${room.id}, ${tenantId}, ${rec.id}, ${rec.duration || null}, ${rec.size || null}, ${rec.download_link || null}, ${expiresAt}, 'ready')
        ON CONFLICT (daily_recording_id) DO UPDATE SET
          download_url = EXCLUDED.download_url,
          expires_at = EXCLUDED.expires_at,
          status = EXCLUDED.status
      `);
      fetched++;
    }
    res.json({ fetched });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/meet/recordings/:id/download
router.get("/recordings/:id/download", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const recRes = await db.execute(sql`SELECT * FROM meet_recordings WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  if (!recRes.rows.length) return res.status(404).json({ message: "Not found" });
  const rec = recRes.rows[0] as any;

  if (rec.download_url) {
    return res.json({ download_url: rec.download_url, status: rec.status, expires_at: rec.expires_at });
  }

  if (!process.env.DAILY_API_KEY || !rec.daily_recording_id) {
    return res.status(400).json({ message: "Download URL not available" });
  }

  try {
    const resp = await fetch(`https://api.daily.co/v1/recordings/${rec.daily_recording_id}/access-link`, {
      headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
    });
    const data = await resp.json() as any;
    await db.execute(sql`UPDATE meet_recordings SET download_url = ${data.download_link || null} WHERE id = ${req.params.id}`);
    res.json({ download_url: data.download_link });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/meet/rooms/:id/registrations
router.get("/rooms/:id/registrations", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`
    SELECT * FROM meet_webinar_registrations WHERE room_id = ${req.params.id} AND tenant_id = ${tid(req)} ORDER BY registered_at DESC
  `);
  res.json(rows.rows);
});

// POST /api/meet/rooms/:id/registrations/:regId/mark-attended
router.post("/rooms/:id/registrations/:regId/mark-attended", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  await db.execute(sql`
    UPDATE meet_webinar_registrations SET status = 'attended'
    WHERE id = ${req.params.regId} AND room_id = ${req.params.id} AND tenant_id = ${tid(req)}
  `);
  res.json({ message: "Marked as attended" });
});

// GET /api/meet/stats
router.get("/stats", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const statsRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as meetings_this_month,
      AVG(duration_mins) FILTER (WHERE status = 'ended') as avg_duration,
      SUM(duration_mins) FILTER (WHERE status = 'ended') as total_duration_mins,
      (SELECT COUNT(*) FROM meet_participants p JOIN meet_rooms r ON r.id = p.room_id WHERE r.tenant_id = ${tenantId} AND p.joined_at >= date_trunc('month', NOW())) as total_participants
    FROM meet_rooms WHERE tenant_id = ${tenantId}
  `);
  const recRes = await db.execute(sql`
    SELECT COUNT(*) as recordings_count, SUM(file_size_bytes) as total_storage
    FROM meet_recordings WHERE tenant_id = ${tenantId}
  `);
  const regRes = await db.execute(sql`
    SELECT COUNT(*) as registrations_this_month
    FROM meet_webinar_registrations WHERE tenant_id = ${tenantId} AND registered_at >= date_trunc('month', NOW())
  `);
  const stats = statsRes.rows[0] as any;
  const recStats = recRes.rows[0] as any;
  const regStats = regRes.rows[0] as any;
  res.json({
    ...stats,
    recordings_count: parseInt(recStats?.recordings_count || "0"),
    total_storage_bytes: parseInt(recStats?.total_storage || "0"),
    webinar_registrations_this_month: parseInt(regStats?.registrations_this_month || "0"),
  });
});

// Signaling
router.post("/rooms/:id/signals", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { from_peer, to_peer, signal_type, payload } = req.body;
  const result = await db.execute(sql`
    INSERT INTO meet_signals (room_id, from_peer, to_peer, signal_type, payload)
    VALUES (${req.params.id}, ${from_peer || null}, ${to_peer || null}, ${signal_type || null}, ${JSON.stringify(payload || {})})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.get("/rooms/:id/signals", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { peer, since_id } = req.query as any;
  let rows;
  if (since_id) {
    rows = await db.execute(sql`SELECT * FROM meet_signals WHERE room_id = ${req.params.id} AND id > ${since_id} AND (to_peer IS NULL OR to_peer = ${peer || ""}) ORDER BY id`);
  } else {
    rows = await db.execute(sql`SELECT * FROM meet_signals WHERE room_id = ${req.params.id} AND (to_peer IS NULL OR to_peer = ${peer || ""}) ORDER BY id DESC LIMIT 50`);
  }
  res.json(rows.rows);
});

// ---- PUBLIC ENDPOINTS ----

// GET /api/public/meet/:roomCode
router.get("/public/meet/:roomCode", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomCode } = req.params;
  const rows = await db.execute(sql`SELECT id, title, host_name, scheduled_at, status, meeting_url, room_type, max_participants, description FROM meet_rooms WHERE room_code = ${roomCode}`);
  if (!rows.rows.length) return res.status(404).json({ message: "Meeting not found" });
  res.json(rows.rows[0]);
});

// POST /api/public/meet/:roomCode/join
router.post("/public/meet/:roomCode/join", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomCode } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE room_code = ${roomCode}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Not found" });
  const room = roomRes.rows[0] as any;
  const result = await db.execute(sql`
    INSERT INTO meet_participants (room_id, tenant_id, name, joined_at, role)
    VALUES (${room.id}, ${room.tenant_id}, ${name}, NOW(), 'participant')
    RETURNING *
  `);
  res.status(201).json({ participant: result.rows[0], room: { id: room.id, title: room.title, meeting_url: room.meeting_url } });
});

// POST /api/public/meet/:roomCode/register  (webinar registration)
router.post("/public/meet/:roomCode/register", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomCode } = req.params;
  const { name, email, phone, company, questions } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and email required" });
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE room_code = ${roomCode}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Meeting not found" });
  const room = roomRes.rows[0] as any;
  const result = await db.execute(sql`
    INSERT INTO meet_webinar_registrations (room_id, tenant_id, name, email, phone, company, questions)
    VALUES (${room.id}, ${room.tenant_id}, ${name}, ${email}, ${phone || null}, ${company || null}, ${questions || null})
    RETURNING *
  `);
  res.status(201).json({ registration: result.rows[0], message: "Registration successful!" });
});

// ---- JITSI TOKEN ----
// POST /api/swachmeet/rooms/:roomId/token
router.post("/rooms/:roomId/token", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomId } = req.params;
  const user = req.body?.user || { name: "SwachERP User", email: "user@swacherp.com" };
  const appId = process.env.JITSI_APP_ID;
  const appSecret = process.env.JITSI_APP_SECRET;

  if (appId && appSecret) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: appId,
      sub: "meet.jit.si",
      aud: "jitsi",
      exp: now + 3600,
      room: roomId,
      context: { user: { name: user.name, email: user.email } },
    };
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", appSecret).update(`${header}.${body}`).digest("base64url");
    const token = `${header}.${body}.${sig}`;
    return res.json({
      token,
      roomId,
      jitsiDomain: "meet.jit.si",
      joinUrl: `https://meet.jit.si/${roomId}?jwt=${token}`,
    });
  }

  return res.json({
    roomId,
    jitsiDomain: "meet.jit.si",
    joinUrl: `https://meet.jit.si/SwachERP-${roomId}`,
  });
});

// ---- RECORDING CONTROL ----
// POST /api/swachmeet/rooms/:roomId/recording/start
router.post("/rooms/:roomId/recording/start", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { roomId } = req.params;
  const tenantId = tid(req);

  const result = await db.execute(sql`
    INSERT INTO swachmeet_recordings (tenant_id, room_id, status, started_at)
    VALUES (${tenantId}, ${roomId}, 'recording', NOW())
    RETURNING *
  `);
  res.json({ recording: result.rows[0], status: "recording" });
});

// POST /api/swachmeet/rooms/:roomId/recording/stop
router.post("/rooms/:roomId/recording/stop", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { roomId } = req.params;
  const tenantId = tid(req);

  const active = await db.execute(sql`
    SELECT * FROM swachmeet_recordings WHERE room_id = ${roomId} AND tenant_id = ${tenantId} AND status = 'recording' ORDER BY started_at DESC LIMIT 1
  `);

  if (!active.rows.length) return res.json({ status: "stopped", message: "No active recording found" });

  const rec = active.rows[0] as any;
  const durationSeconds = Math.round((Date.now() - new Date(rec.started_at).getTime()) / 1000);

  const result = await db.execute(sql`
    UPDATE swachmeet_recordings SET status = 'stopped', stopped_at = NOW(), duration_seconds = ${durationSeconds}
    WHERE id = ${rec.id}
    RETURNING *
  `);
  res.json({ recording: result.rows[0], status: "stopped", duration_seconds: durationSeconds });
});

// ---- ANALYTICS ----
// GET /api/swachmeet/analytics?days=30
router.get("/analytics", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const days = parseInt((req.query.days as string) || "30") || 30;

  const meetingsRes = await db.execute(sql`
    SELECT
      COUNT(*) as total_meetings,
      COALESCE(SUM((SELECT COUNT(*) FROM meet_participants p WHERE p.room_id = r.id)), 0) as total_participants,
      COALESCE(AVG(r.duration_mins), 0) as avg_duration_minutes
    FROM meet_rooms r
    WHERE r.tenant_id = ${tenantId}
      AND r.created_at >= NOW() - (${days} || ' days')::INTERVAL
  `);

  const byDayRes = await db.execute(sql`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM meet_rooms
    WHERE tenant_id = ${tenantId}
      AND created_at >= NOW() - (${days} || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  const stats = meetingsRes.rows[0] as any;
  res.json({
    total_meetings: parseInt(stats.total_meetings || "0"),
    total_participants: parseInt(stats.total_participants || "0"),
    avg_duration_minutes: Math.round(parseFloat(stats.avg_duration_minutes || "0")),
    meetings_by_day: byDayRes.rows,
  });
});

// Public router mounted at /api/public/meet
import { Router as MeetPublicRouter } from "express";
const meetPublicRouter = MeetPublicRouter();

meetPublicRouter.get("/:roomCode", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomCode } = req.params;
  const rows = await db.execute(sql`SELECT id, title, host_name, scheduled_at, status, meeting_url, room_type, max_participants, description FROM meet_rooms WHERE room_code = ${roomCode}`);
  if (!rows.rows.length) return res.status(404).json({ message: "Meeting not found" });
  res.json(rows.rows[0]);
});

meetPublicRouter.post("/:roomCode/join", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomCode } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE room_code = ${roomCode}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Not found" });
  const room = roomRes.rows[0] as any;
  const result = await db.execute(sql`
    INSERT INTO meet_participants (room_id, tenant_id, name, joined_at, role)
    VALUES (${room.id}, ${room.tenant_id}, ${name}, NOW(), 'participant')
    RETURNING *
  `);
  res.status(201).json({ participant: result.rows[0], room: { id: room.id, title: room.title, meeting_url: room.meeting_url } });
});

meetPublicRouter.post("/:roomCode/register", async (req: any, res) => {
  await ensureTablesOnce();
  const { roomCode } = req.params;
  const { name, email, phone, company, questions } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and email required" });
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE room_code = ${roomCode}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Meeting not found" });
  const room = roomRes.rows[0] as any;
  const result = await db.execute(sql`
    INSERT INTO meet_webinar_registrations (room_id, tenant_id, name, email, phone, company, questions)
    VALUES (${room.id}, ${room.tenant_id}, ${name}, ${email}, ${phone || null}, ${company || null}, ${questions || null})
    RETURNING *
  `);
  res.status(201).json({ registration: result.rows[0], message: "Registration successful!" });
});

// ============================================================
// EXTENDED TABLES (Teams-level features)
// ============================================================
async function ensureExtendedTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_channels (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      channel_type VARCHAR(30) DEFAULT 'public',
      created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_channel_messages (
      id SERIAL PRIMARY KEY,
      channel_id INT NOT NULL,
      tenant_id INT NOT NULL,
      user_id INT,
      sender_name VARCHAR(200),
      message TEXT NOT NULL,
      attachments JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_agendas (
      id SERIAL PRIMARY KEY,
      room_id INT NOT NULL,
      tenant_id INT NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      duration_mins INT DEFAULT 5,
      presenter VARCHAR(200),
      sort_order INT DEFAULT 0,
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_polls (
      id SERIAL PRIMARY KEY,
      room_id INT NOT NULL,
      tenant_id INT NOT NULL,
      question TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]',
      is_anonymous BOOLEAN DEFAULT TRUE,
      is_open BOOLEAN DEFAULT TRUE,
      created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_poll_votes (
      id SERIAL PRIMARY KEY,
      poll_id INT NOT NULL,
      tenant_id INT NOT NULL,
      voter_name VARCHAR(200),
      option_index INT NOT NULL,
      voted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_notes (
      id SERIAL PRIMARY KEY,
      room_id INT NOT NULL,
      tenant_id INT NOT NULL,
      note_type VARCHAR(30) DEFAULT 'note',
      content TEXT NOT NULL,
      author_name VARCHAR(200),
      is_action_item BOOLEAN DEFAULT FALSE,
      assigned_to VARCHAR(200),
      due_date DATE,
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_summaries (
      id SERIAL PRIMARY KEY,
      room_id INT NOT NULL,
      tenant_id INT NOT NULL,
      summary TEXT,
      key_points JSONB DEFAULT '[]',
      action_items JSONB DEFAULT '[]',
      decisions JSONB DEFAULT '[]',
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      is_ai BOOLEAN DEFAULT FALSE
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_templates (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      room_type VARCHAR(30) DEFAULT 'meeting',
      max_participants INT DEFAULT 10,
      agenda_template JSONB DEFAULT '[]',
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
let extTablesReady = false;
async function ensureExtOnce() {
  if (extTablesReady) return;
  await ensureExtendedTables();
  extTablesReady = true;
}

// ---- CHANNELS ----
router.get("/channels", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const rows = await db.execute(sql`
    SELECT c.*,
      (SELECT COUNT(*) FROM meet_channel_messages m WHERE m.channel_id = c.id) AS message_count,
      (SELECT MAX(m.created_at) FROM meet_channel_messages m WHERE m.channel_id = c.id) AS last_active
    FROM meet_channels c WHERE c.tenant_id = ${tid(req)} ORDER BY c.created_at DESC
  `);
  res.json(rows.rows);
});

router.post("/channels", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { name, description, channel_type } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  const result = await db.execute(sql`
    INSERT INTO meet_channels (tenant_id, name, description, channel_type, created_by)
    VALUES (${tid(req)}, ${name}, ${description || null}, ${channel_type || "public"}, ${req.user?.id || null})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.delete("/channels/:id", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  await db.execute(sql`DELETE FROM meet_channels WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Deleted" });
});

router.get("/channels/:id/messages", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const limit = parseInt((req.query.limit as string) || "50");
  const rows = await db.execute(sql`
    SELECT * FROM meet_channel_messages WHERE channel_id = ${req.params.id} AND tenant_id = ${tid(req)}
    ORDER BY created_at DESC LIMIT ${limit}
  `);
  res.json((rows.rows as any[]).reverse());
});

router.post("/channels/:id/messages", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: "Message required" });
  const result = await db.execute(sql`
    INSERT INTO meet_channel_messages (channel_id, tenant_id, user_id, sender_name, message)
    VALUES (${req.params.id}, ${tid(req)}, ${req.user?.id || null}, ${(req.user as any)?.name || (req.user as any)?.username || "User"}, ${message.trim()})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// ---- AGENDA ----
router.get("/rooms/:id/agenda", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_agendas WHERE room_id = ${req.params.id} AND tenant_id = ${tid(req)} ORDER BY sort_order, id`);
  res.json(rows.rows);
});

router.post("/rooms/:id/agenda", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { title, description, duration_mins, presenter, sort_order } = req.body;
  const result = await db.execute(sql`
    INSERT INTO meet_agendas (room_id, tenant_id, title, description, duration_mins, presenter, sort_order)
    VALUES (${req.params.id}, ${tid(req)}, ${title}, ${description || null}, ${duration_mins || 5}, ${presenter || null}, ${sort_order || 0})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.put("/rooms/:id/agenda/:agendaId", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { title, description, duration_mins, presenter, done, sort_order } = req.body;
  await db.execute(sql`
    UPDATE meet_agendas SET title = COALESCE(${title || null}, title), description = COALESCE(${description || null}, description),
      duration_mins = COALESCE(${duration_mins || null}, duration_mins), presenter = COALESCE(${presenter || null}, presenter),
      done = COALESCE(${done ?? null}, done), sort_order = COALESCE(${sort_order ?? null}, sort_order)
    WHERE id = ${req.params.agendaId} AND room_id = ${req.params.id} AND tenant_id = ${tid(req)}
  `);
  res.json({ message: "Updated" });
});

router.delete("/rooms/:id/agenda/:agendaId", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  await db.execute(sql`DELETE FROM meet_agendas WHERE id = ${req.params.agendaId} AND room_id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Deleted" });
});

// ---- POLLS ----
router.get("/rooms/:id/polls", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_polls WHERE room_id = ${req.params.id} AND tenant_id = ${tid(req)} ORDER BY created_at`);
  res.json(rows.rows);
});

router.post("/rooms/:id/polls", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { question, options, is_anonymous } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) return res.status(400).json({ message: "Question and at least 2 options required" });
  const result = await db.execute(sql`
    INSERT INTO meet_polls (room_id, tenant_id, question, options, is_anonymous, created_by)
    VALUES (${req.params.id}, ${tid(req)}, ${question}, ${JSON.stringify(options)}, ${is_anonymous ?? true}, ${req.user?.id || null})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.post("/rooms/:id/polls/:pollId/vote", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { option_index, voter_name } = req.body;
  await db.execute(sql`
    INSERT INTO meet_poll_votes (poll_id, tenant_id, voter_name, option_index)
    VALUES (${req.params.pollId}, ${tid(req)}, ${voter_name || (req.user as any)?.name || "Anonymous"}, ${option_index})
  `);
  const votes = await db.execute(sql`SELECT option_index, COUNT(*) as count FROM meet_poll_votes WHERE poll_id = ${req.params.pollId} GROUP BY option_index ORDER BY option_index`);
  res.json({ message: "Voted", results: votes.rows });
});

router.get("/rooms/:id/polls/:pollId/results", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const poll = await db.execute(sql`SELECT * FROM meet_polls WHERE id = ${req.params.pollId}`);
  const votes = await db.execute(sql`SELECT option_index, COUNT(*) as count FROM meet_poll_votes WHERE poll_id = ${req.params.pollId} GROUP BY option_index ORDER BY option_index`);
  const total = (votes.rows as any[]).reduce((s, r) => s + parseInt(r.count), 0);
  res.json({ poll: poll.rows[0], votes: votes.rows, total_votes: total });
});

router.put("/rooms/:id/polls/:pollId/close", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  await db.execute(sql`UPDATE meet_polls SET is_open = FALSE WHERE id = ${req.params.pollId} AND room_id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Poll closed" });
});

// ---- NOTES ----
router.get("/rooms/:id/notes", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_notes WHERE room_id = ${req.params.id} AND tenant_id = ${tid(req)} ORDER BY created_at`);
  res.json(rows.rows);
});

router.post("/rooms/:id/notes", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { content, note_type, is_action_item, assigned_to, due_date } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: "Content required" });
  const result = await db.execute(sql`
    INSERT INTO meet_notes (room_id, tenant_id, content, note_type, is_action_item, assigned_to, due_date, author_name)
    VALUES (${req.params.id}, ${tid(req)}, ${content.trim()}, ${note_type || "note"}, ${is_action_item ?? false}, ${assigned_to || null}, ${due_date || null}, ${(req.user as any)?.name || (req.user as any)?.username || "User"})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.put("/rooms/:id/notes/:noteId", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { done, content } = req.body;
  await db.execute(sql`
    UPDATE meet_notes SET done = COALESCE(${done ?? null}, done), content = COALESCE(${content || null}, content)
    WHERE id = ${req.params.noteId} AND room_id = ${req.params.id} AND tenant_id = ${tid(req)}
  `);
  res.json({ message: "Updated" });
});

router.delete("/rooms/:id/notes/:noteId", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  await db.execute(sql`DELETE FROM meet_notes WHERE id = ${req.params.noteId} AND room_id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Deleted" });
});

// ---- SUMMARY ----
router.get("/rooms/:id/summary", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_summaries WHERE room_id = ${req.params.id} AND tenant_id = ${tid(req)} ORDER BY generated_at DESC LIMIT 1`);
  if (!rows.rows.length) return res.json(null);
  res.json(rows.rows[0]);
});

router.post("/rooms/:id/summary/generate", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const tenantId = tid(req);
  const roomRes = await db.execute(sql`SELECT * FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tenantId}`);
  if (!roomRes.rows.length) return res.status(404).json({ message: "Room not found" });
  const room = roomRes.rows[0] as any;
  const notesRes = await db.execute(sql`SELECT * FROM meet_notes WHERE room_id = ${req.params.id} AND tenant_id = ${tenantId} ORDER BY created_at`);
  const agendaRes = await db.execute(sql`SELECT * FROM meet_agendas WHERE room_id = ${req.params.id} AND tenant_id = ${tenantId} ORDER BY sort_order`);
  const notes = notesRes.rows as any[];
  const agenda = agendaRes.rows as any[];

  const actionItems = notes.filter((n: any) => n.is_action_item).map((n: any) => n.content);
  const decisions = notes.filter((n: any) => n.note_type === "decision").map((n: any) => n.content);
  const keyPoints = notes.filter((n: any) => !n.is_action_item && n.note_type !== "decision").map((n: any) => n.content);

  const coveredAgenda = agenda.filter((a: any) => a.done);
  let summary = `Meeting "${room.title}" (${room.room_no}) ran for ${room.duration_mins || 0} minutes.`;
  if (coveredAgenda.length) summary += ` Covered ${coveredAgenda.length} of ${agenda.length} agenda items.`;
  if (actionItems.length) summary += ` ${actionItems.length} action item(s) captured.`;
  if (decisions.length) summary += ` ${decisions.length} decision(s) recorded.`;

  const result = await db.execute(sql`
    INSERT INTO meet_summaries (room_id, tenant_id, summary, key_points, action_items, decisions, is_ai)
    VALUES (${req.params.id}, ${tenantId}, ${summary}, ${JSON.stringify(keyPoints)}, ${JSON.stringify(actionItems)}, ${JSON.stringify(decisions)}, FALSE)
    RETURNING *
  `);
  res.json(result.rows[0]);
});

// ---- TEMPLATES ----
router.get("/templates", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const rows = await db.execute(sql`SELECT * FROM meet_templates WHERE tenant_id = ${tid(req)} OR is_default = TRUE ORDER BY is_default DESC, name`);
  res.json(rows.rows);
});

router.post("/templates", requireAuth, async (req: any, res) => {
  await ensureExtOnce();
  const { name, description, room_type, max_participants, agenda_template } = req.body;
  const result = await db.execute(sql`
    INSERT INTO meet_templates (tenant_id, name, description, room_type, max_participants, agenda_template)
    VALUES (${tid(req)}, ${name}, ${description || null}, ${room_type || "meeting"}, ${max_participants || 10}, ${JSON.stringify(agenda_template || [])})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// ---- RECURRING ----
router.get("/rooms/:id/recurring", requireAuth, async (req: any, res) => {
  const roomRes = await db.execute(sql`SELECT recurrence, recurrence_until FROM meet_rooms WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json(roomRes.rows[0] || {});
});

router.put("/rooms/:id/recurring", requireAuth, async (req: any, res) => {
  const { recurrence, recurrence_until } = req.body;
  try {
    await db.execute(sql`ALTER TABLE meet_rooms ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE meet_rooms ADD COLUMN IF NOT EXISTS recurrence_until DATE`);
  } catch {}
  await db.execute(sql`
    UPDATE meet_rooms SET recurrence = ${recurrence || null}, recurrence_until = ${recurrence_until || null}
    WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}
  `);
  res.json({ message: "Updated" });
});

// ---- CALENDAR FEED ----
router.get("/calendar.ics", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`
    SELECT * FROM meet_rooms WHERE tenant_id = ${tid(req)} AND scheduled_at IS NOT NULL
    AND status IN ('scheduled','live') ORDER BY scheduled_at
  `);
  const rooms = rows.rows as any[];
  const esc = (s: string) => (s || "").replace(/[,;\\]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  let cal = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SwachMeet//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const r of rooms) {
    const start = new Date(r.scheduled_at);
    const end = new Date(start.getTime() + (r.duration_mins || 60) * 60000);
    cal.push("BEGIN:VEVENT", `UID:swachmeet-${r.id}@swacherp`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(r.title)}`, `DESCRIPTION:${esc(r.description || "")}`,
      r.meeting_url ? `URL:${r.meeting_url}` : "", "END:VEVENT");
  }
  cal.push("END:VCALENDAR");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=swachmeet.ics");
  res.send(cal.filter(Boolean).join("\r\n"));
});

// ---- WAITING ROOM ----
router.post("/rooms/:id/admit/:participantId", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  await db.execute(sql`UPDATE meet_participants SET role = 'admitted' WHERE id = ${req.params.participantId} AND room_id = ${req.params.id}`);
  res.json({ message: "Admitted" });
});

router.post("/rooms/:id/kick/:participantId", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  await db.execute(sql`UPDATE meet_participants SET left_at = NOW(), role = 'removed' WHERE id = ${req.params.participantId} AND room_id = ${req.params.id}`);
  res.json({ message: "Removed" });
});

router.post("/rooms/:id/mute-all", requireAuth, async (req: any, res) => {
  res.json({ message: "Mute all command sent (handled by Jitsi)" });
});

export default router;
export { meetPublicRouter as swachMeetPublicRouter };
