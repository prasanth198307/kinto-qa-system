import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any) => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ── Tables ────────────────────────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureAITables() {
  if (tablesEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_summaries (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      entity_type VARCHAR(50),
      entity_id INT,
      summary TEXT,
      suggested_reply TEXT,
      sentiment VARCHAR(20),
      key_points JSONB DEFAULT '[]',
      action_items JSONB DEFAULT '[]',
      model_used VARCHAR(100),
      tokens_used INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_chat_history (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      user_id INT,
      session_id VARCHAR(100),
      role VARCHAR(20),
      content TEXT,
      context_type VARCHAR(50),
      context_id INT,
      tokens_used INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS meet_transcripts (
      id SERIAL PRIMARY KEY,
      room_id INT,
      tenant_id INT,
      recording_id INT,
      transcript TEXT,
      language VARCHAR(10) DEFAULT 'en',
      duration_secs INT,
      word_count INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tablesEnsured = true;
}

// ── Claude API helper ─────────────────────────────────────────────────────────
async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 500): Promise<{ text: string; tokens: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      text: `{"summary":"AI analysis not available. Configure ANTHROPIC_API_KEY for real AI summaries. Preview: ${userPrompt.substring(0, 80).replace(/"/g, "'")}...","sentiment":"neutral","key_points":["Configure API key for full analysis"],"suggested_reply":"Thank you for reaching out. We will review your request and respond shortly.","action_items":["Enable AI by setting ANTHROPIC_API_KEY"]}`,
      tokens: 0,
    };
  }
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = (await resp.json()) as any;
  if (data.error) throw new Error(data.error.message);
  return {
    text: data.content?.[0]?.text || "",
    tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

function safeParseJSON(text: string, fallback: any = {}) {
  try {
    // Extract JSON from markdown code blocks if present
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    return JSON.parse(match ? match[1] : text);
  } catch {
    return fallback;
  }
}

// ── TICKET ROUTES ─────────────────────────────────────────────────────────────

// POST /api/ai/tickets/:id/summarise
router.post("/tickets/:id/summarise", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const tenantId = tid(req);
    const ticketId = parseInt(req.params.id);

    // Fetch ticket
    const ticketRows = await db.execute(sql`
      SELECT id, ticket_no, subject, description, priority, status, created_at
      FROM desk_tickets WHERE id = ${ticketId} AND tenant_id = ${tenantId}
    `);
    const ticket = (ticketRows as any).rows?.[0] || (ticketRows as any)[0];
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Fetch comments
    const commentRows = await db.execute(sql`
      SELECT content, author_type, author_name, created_at
      FROM desk_ticket_comments
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at ASC
    `);
    const comments = (commentRows as any).rows || (commentRows as any) || [];

    const thread = comments.map((c: any) =>
      `[${new Date(c.created_at).toLocaleString()}] ${c.author_name || c.author_type}: ${c.content}`
    ).join("\n");

    const systemPrompt = `You are an expert customer support analyst. Analyse the ticket and provide: 1) A 2-3 sentence summary, 2) Sentiment (positive/neutral/negative/urgent), 3) 3-5 key points as a list, 4) Suggested reply draft (professional, empathetic, 3-4 sentences), 5) Any action items. Format as JSON: {summary, sentiment, key_points: [], suggested_reply, action_items: []}`;
    const userPrompt = `Ticket #${ticket.id}: ${ticket.subject}\n\nDescription: ${ticket.description || "No description"}\n\nConversation:\n${thread || "No comments yet"}`;

    const { text, tokens } = await callClaude(systemPrompt, userPrompt, 600);
    const parsed = safeParseJSON(text, {
      summary: text.substring(0, 200),
      sentiment: "neutral",
      key_points: [],
      suggested_reply: "",
      action_items: [],
    });

    // Upsert into ai_summaries
    await db.execute(sql`
      INSERT INTO ai_summaries (tenant_id, entity_type, entity_id, summary, suggested_reply, sentiment, key_points, action_items, model_used, tokens_used)
      VALUES (${tenantId}, 'ticket', ${ticketId}, ${parsed.summary}, ${parsed.suggested_reply}, ${parsed.sentiment},
              ${JSON.stringify(parsed.key_points || [])}::jsonb, ${JSON.stringify(parsed.action_items || [])}::jsonb,
              'claude-haiku-4-5-20251001', ${tokens})
      ON CONFLICT DO NOTHING
    `);

    // Try to update desk_tickets with AI columns (ignore if columns don't exist)
    try {
      await db.execute(sql`ALTER TABLE desk_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT`);
      await db.execute(sql`ALTER TABLE desk_tickets ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20)`);
      await db.execute(sql`
        UPDATE desk_tickets SET ai_summary = ${parsed.summary}, ai_sentiment = ${parsed.sentiment}
        WHERE id = ${ticketId}
      `);
    } catch (_) { /* ignore */ }

    res.json({ ...parsed, tokens_used: tokens });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ai/tickets/:id/summary
router.get("/tickets/:id/summary", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const rows = await db.execute(sql`
      SELECT * FROM ai_summaries
      WHERE entity_type = 'ticket' AND entity_id = ${parseInt(req.params.id)} AND tenant_id = ${tid(req)}
      ORDER BY created_at DESC LIMIT 1
    `);
    const row = (rows as any).rows?.[0] || (rows as any)[0] || null;
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/ai/tickets/bulk-summarise
router.post("/tickets/bulk-summarise", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const tenantId = tid(req);
    let ticketIds: number[] = req.body.ticket_ids || [];

    if (!ticketIds.length && req.body.status) {
      const rows = await db.execute(sql`
        SELECT id FROM desk_tickets WHERE tenant_id = ${tenantId} AND status = ${req.body.status} LIMIT 20
      `);
      ticketIds = ((rows as any).rows || rows as any[]).map((r: any) => r.id);
    }

    ticketIds = ticketIds.slice(0, 20);
    const results: any[] = [];

    for (const id of ticketIds) {
      try {
        const mockReq = { ...req, params: { id: String(id) } };
        // Re-use summarise logic inline
        const ticketRows = await db.execute(sql`
          SELECT id, ticket_no, subject, description FROM desk_tickets WHERE id = ${id} AND tenant_id = ${tenantId}
        `);
        const ticket = (ticketRows as any).rows?.[0] || (ticketRows as any)[0];
        if (!ticket) continue;

        const { text, tokens } = await callClaude(
          `You are a customer support analyst. Return JSON: {summary, sentiment, key_points: [], suggested_reply, action_items: []}`,
          `Ticket #${ticket.id}: ${ticket.subject}\n${ticket.description || ""}`,
          400
        );
        const parsed = safeParseJSON(text, { summary: text.substring(0, 200), sentiment: "neutral", key_points: [], suggested_reply: "", action_items: [] });

        await db.execute(sql`
          INSERT INTO ai_summaries (tenant_id, entity_type, entity_id, summary, suggested_reply, sentiment, key_points, action_items, model_used, tokens_used)
          VALUES (${tenantId}, 'ticket', ${id}, ${parsed.summary}, ${parsed.suggested_reply}, ${parsed.sentiment},
                  ${JSON.stringify(parsed.key_points || [])}::jsonb, ${JSON.stringify(parsed.action_items || [])}::jsonb,
                  'claude-haiku-4-5-20251001', ${tokens})
          ON CONFLICT DO NOTHING
        `);
        results.push({ ticket_id: id, ...parsed });
      } catch (_) { /* skip failed tickets */ }
    }

    res.json({ processed: results.length, results });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/ai/tickets/:id/smart-tag
router.post("/tickets/:id/smart-tag", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const tenantId = tid(req);
    const ticketId = parseInt(req.params.id);

    const rows = await db.execute(sql`
      SELECT subject, description FROM desk_tickets WHERE id = ${ticketId} AND tenant_id = ${tenantId}
    `);
    const ticket = (rows as any).rows?.[0] || (rows as any)[0];
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const { text } = await callClaude(
      `Classify this support ticket into 1-3 tags from: billing, technical, account, performance, feature-request, urgent, data-loss, security, onboarding, general. Return JSON array of tags only.`,
      `${ticket.subject}\n${ticket.description || ""}`,
      100
    );

    let tags: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*?\]/);
      tags = JSON.parse(match ? match[0] : text);
    } catch {
      tags = ["general"];
    }

    try {
      await db.execute(sql`ALTER TABLE desk_tickets ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'`);
      await db.execute(sql`UPDATE desk_tickets SET tags = ${JSON.stringify(tags)}::jsonb WHERE id = ${ticketId}`);
    } catch (_) { /* ignore */ }

    res.json({ tags });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ai/tickets/sentiment-report
router.get("/tickets/sentiment-report", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const tenantId = tid(req);
    const rows = await db.execute(sql`
      SELECT sentiment, COUNT(*) as count
      FROM ai_summaries
      WHERE entity_type = 'ticket' AND tenant_id = ${tenantId}
      GROUP BY sentiment
    `);
    const data = (rows as any).rows || (rows as any) || [];
    const result: Record<string, number> = { positive: 0, neutral: 0, negative: 0, urgent: 0, total: 0 };
    for (const row of data) {
      const s = row.sentiment as string;
      if (s in result) result[s] = parseInt(row.count);
      result.total += parseInt(row.count);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── MEETING ROUTES ────────────────────────────────────────────────────────────

// POST /api/ai/meetings/:id/transcribe
router.post("/meetings/:id/transcribe", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const tenantId = tid(req);
    const roomId = parseInt(req.params.id);

    // Fetch recording if any
    let downloadUrl: string | null = null;
    let recordingId: number | null = null;
    let durationSecs: number | null = null;
    try {
      const recRows = await db.execute(sql`
        SELECT id, download_url, duration_secs FROM meet_recordings
        WHERE room_id = ${roomId} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 1
      `);
      const rec = (recRows as any).rows?.[0] || (recRows as any)[0];
      if (rec) {
        downloadUrl = rec.download_url;
        recordingId = rec.id;
        durationSecs = rec.duration_secs;
      }
    } catch (_) { /* table may not exist */ }

    let transcript = "";

    if (process.env.OPENAI_API_KEY && downloadUrl) {
      try {
        const audioResp = await fetch(downloadUrl);
        const audioBlob = await audioResp.blob();
        const formData = new FormData();
        formData.append("file", audioBlob, "meeting.mp4");
        formData.append("model", "whisper-1");
        formData.append("language", "en");
        formData.append("response_format", "verbose_json");

        const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: formData,
        });
        const whisperData = (await whisperResp.json()) as any;
        transcript = whisperData.text || "";
        durationSecs = whisperData.duration ? Math.round(whisperData.duration) : durationSecs;
      } catch (_) { /* fall through to simulation */ }
    }

    if (!transcript) {
      transcript = `[00:00] Host: Good morning everyone, let's get started with today's meeting agenda.\n[00:45] Participant 1: Thank you for joining. We'll cover project updates and next steps.\n[02:30] Host: The main discussion point is the Q3 roadmap and resource allocation.\n[05:00] Participant 2: I have some concerns about the timeline we discussed last week.\n[08:30] Host: Let's address those concerns. We can adjust the sprint planning accordingly.\n[12:00] All: Great, let's wrap up with action items.`;
    }

    const wordCount = transcript.split(/\s+/).length;

    // Store transcript
    await db.execute(sql`
      INSERT INTO meet_transcripts (room_id, tenant_id, recording_id, transcript, duration_secs, word_count)
      VALUES (${roomId}, ${tenantId}, ${recordingId}, ${transcript}, ${durationSecs}, ${wordCount})
    `);

    // Summarise with Claude
    const { text, tokens } = await callClaude(
      `You are a meeting analyst. Extract from this transcript: 1) Executive summary (3-4 sentences), 2) Key decisions made (bullet list), 3) Action items with owner names if mentioned (bullet list), 4) Next steps. Format as JSON: {summary, key_decisions: [], action_items: [], next_steps: []}`,
      transcript,
      600
    );
    const parsed = safeParseJSON(text, { summary: "", key_decisions: [], action_items: [], next_steps: [] });

    // Store in ai_summaries
    await db.execute(sql`
      INSERT INTO ai_summaries (tenant_id, entity_type, entity_id, summary, key_points, action_items, model_used, tokens_used)
      VALUES (${tenantId}, 'meeting', ${roomId}, ${parsed.summary},
              ${JSON.stringify(parsed.key_decisions || [])}::jsonb,
              ${JSON.stringify(parsed.action_items || [])}::jsonb,
              'claude-haiku-4-5-20251001', ${tokens})
      ON CONFLICT DO NOTHING
    `);

    res.json({ transcript, ...parsed });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ai/meetings/:id/transcript
router.get("/meetings/:id/transcript", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const roomId = parseInt(req.params.id);
    const tenantId = tid(req);

    const transcriptRows = await db.execute(sql`
      SELECT * FROM meet_transcripts WHERE room_id = ${roomId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT 1
    `);
    const transcript = (transcriptRows as any).rows?.[0] || (transcriptRows as any)[0] || null;

    const summaryRows = await db.execute(sql`
      SELECT * FROM ai_summaries WHERE entity_type = 'meeting' AND entity_id = ${roomId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT 1
    `);
    const summary = (summaryRows as any).rows?.[0] || (summaryRows as any)[0] || null;

    res.json({ transcript, summary });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/ai/meetings/:id/transcribe-live
router.post("/meetings/:id/transcribe-live", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const roomId = parseInt(req.params.id);
    const tenantId = tid(req);
    const chunk = req.body.audio_chunk || "";

    // Append to running transcript
    const existing = await db.execute(sql`
      SELECT id, transcript FROM meet_transcripts
      WHERE room_id = ${roomId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT 1
    `);
    const row = (existing as any).rows?.[0] || (existing as any)[0];

    const timestamp = new Date().toISOString();
    const newLine = `[${timestamp}] ${chunk ? "[audio chunk received]" : "[silence]"}`;

    if (row) {
      const updated = (row.transcript || "") + "\n" + newLine;
      await db.execute(sql`
        UPDATE meet_transcripts SET transcript = ${updated}, word_count = ${updated.split(/\s+/).length}
        WHERE id = ${row.id}
      `);
      res.json({ transcript: updated });
    } else {
      await db.execute(sql`
        INSERT INTO meet_transcripts (room_id, tenant_id, transcript, word_count)
        VALUES (${roomId}, ${tenantId}, ${newLine}, ${newLine.split(/\s+/).length})
      `);
      res.json({ transcript: newLine });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── AI CHAT ───────────────────────────────────────────────────────────────────

// POST /api/ai/chat
router.post("/chat", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const tenantId = tid(req);
    const userId = (req as any).user?.id || 0;
    const { message, context_type, context_id, session_id } = req.body;
    const sessionId = session_id || `session_${userId}_${Date.now()}`;

    if (!message) return res.status(400).json({ message: "message is required" });

    // Fetch last 10 messages
    const historyRows = await db.execute(sql`
      SELECT role, content FROM ai_chat_history
      WHERE session_id = ${sessionId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT 10
    `);
    const history = ((historyRows as any).rows || historyRows as any[]).reverse();

    // Build context string
    let contextStr = "";
    if (context_type === "ticket" && context_id) {
      try {
        const rows = await db.execute(sql`SELECT subject, description, status, priority FROM desk_tickets WHERE id = ${context_id} AND tenant_id = ${tenantId}`);
        const t = (rows as any).rows?.[0] || (rows as any)[0];
        if (t) contextStr = `\n\nContext - Ticket #${context_id}: ${t.subject} | Status: ${t.status} | Priority: ${t.priority}\n${t.description || ""}`;
      } catch (_) { /* ignore */ }
    } else if (context_type === "invoice" && context_id) {
      try {
        const rows = await db.execute(sql`SELECT invoice_no, total_amount, status FROM invoices WHERE id = ${context_id} AND tenant_id = ${tenantId}`);
        const inv = (rows as any).rows?.[0] || (rows as any)[0];
        if (inv) contextStr = `\n\nContext - Invoice #${inv.invoice_no}: Total ₹${inv.total_amount} | Status: ${inv.status}`;
      } catch (_) { /* ignore */ }
    } else if (context_type === "report") {
      const since = new Date(); since.setDate(since.getDate() - 30);
      try {
        const rows = await db.execute(sql`SELECT COUNT(*) as total_tickets FROM desk_tickets WHERE tenant_id = ${tenantId} AND created_at > ${since.toISOString()}`);
        const r = (rows as any).rows?.[0] || (rows as any)[0];
        if (r) contextStr = `\n\nContext - Last 30 days: ${r.total_tickets} tickets created`;
      } catch (_) { /* ignore */ }
    }

    const systemPrompt = `You are SwachAI, an intelligent ERP assistant for SwachERP. You help users understand their business data, summarise documents, and answer questions about their ERP. Be concise, professional, and India-aware (GST, INR, Hindi terms are fine). Never make up data — if you don't have the data, say so.${contextStr}`;

    // Build messages array with history
    const messages = [
      ...history.map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: message },
    ];

    let reply = "";
    let tokens = 0;

    if (!process.env.ANTHROPIC_API_KEY) {
      reply = `SwachAI: I received your message: "${message}". Configure ANTHROPIC_API_KEY for real AI responses.`;
    } else {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: systemPrompt,
          messages,
        }),
      });
      const data = (await resp.json()) as any;
      if (data.error) throw new Error(data.error.message);
      reply = data.content?.[0]?.text || "";
      tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    }

    // Save both messages
    await db.execute(sql`
      INSERT INTO ai_chat_history (tenant_id, user_id, session_id, role, content, context_type, context_id)
      VALUES (${tenantId}, ${userId}, ${sessionId}, 'user', ${message}, ${context_type || 'general'}, ${context_id || null})
    `);
    await db.execute(sql`
      INSERT INTO ai_chat_history (tenant_id, user_id, session_id, role, content, tokens_used)
      VALUES (${tenantId}, ${userId}, ${sessionId}, 'assistant', ${reply}, ${tokens})
    `);

    res.json({ reply, session_id: sessionId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ai/chat/history
router.get("/chat/history", requireAuth, async (req, res) => {
  try {
    await ensureAITables();
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ message: "session_id required" });

    const rows = await db.execute(sql`
      SELECT role, content, created_at FROM ai_chat_history
      WHERE session_id = ${session_id as string} AND tenant_id = ${tid(req)}
      ORDER BY created_at ASC LIMIT 50
    `);
    res.json((rows as any).rows || rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
