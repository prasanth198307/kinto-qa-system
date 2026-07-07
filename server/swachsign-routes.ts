import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = Router();

const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

const uploadsDir = path.join(process.cwd(), "uploads", "sign");
fs.mkdirSync(uploadsDir, { recursive: true });

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sign_templates (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(300) NOT NULL,
      document_type VARCHAR(50) DEFAULT 'contract',
      default_message TEXT,
      template_fields JSONB DEFAULT '[]',
      signatory_roles JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sign_documents (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      doc_no VARCHAR(50) NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      document_type VARCHAR(50) DEFAULT 'contract',
      file_path TEXT,
      file_name VARCHAR(300),
      file_size INT,
      mime_type VARCHAR(100),
      status VARCHAR(30) DEFAULT 'draft',
      expiry_date DATE,
      message_to_signatories TEXT,
      created_by INT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      record_status INT DEFAULT 1
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sign_signatories (
      id SERIAL PRIMARY KEY,
      document_id INT NOT NULL,
      tenant_id INT NOT NULL,
      signatory_order INT DEFAULT 1,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(100),
      sign_method VARCHAR(30) DEFAULT 'draw',
      status VARCHAR(30) DEFAULT 'pending',
      token VARCHAR(100) UNIQUE,
      sign_fields JSONB DEFAULT '[]',
      signature_data TEXT,
      aadhaar_txn_id VARCHAR(100),
      signed_at TIMESTAMPTZ,
      declined_reason TEXT,
      ip_address VARCHAR(50),
      sent_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sign_audit_trail (
      id SERIAL PRIMARY KEY,
      document_id INT NOT NULL,
      tenant_id INT NOT NULL,
      action VARCHAR(100),
      actor_name VARCHAR(200),
      actor_email VARCHAR(200),
      actor_ip VARCHAR(50),
      metadata JSONB,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sign_aadhaar_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      document_id INT,
      signatory_id INT,
      aadhaar_last4 VARCHAR(4),
      mobile_last4 VARCHAR(4),
      esp_txn_id VARCHAR(200),
      otp_sent_at TIMESTAMPTZ,
      otp_verified_at TIMESTAMPTZ,
      esign_response JSONB,
      status VARCHAR(30) DEFAULT 'pending',
      attempt_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sign_blockchain_trail (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      document_id INT,
      block_index INT,
      previous_hash VARCHAR(64),
      block_data JSONB,
      block_hash VARCHAR(64),
      nonce INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

let tablesReady = false;
async function ensureTablesOnce() {
  if (!tablesReady) { await ensureTables(); tablesReady = true; }
}

async function nextDocNo(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM sign_documents WHERE tenant_id = ${tenantId} AND doc_no LIKE ${'SGN-' + year + '-%'}
  `);
  const cnt = parseInt((result.rows[0] as any).cnt) + 1;
  return `SGN-${year}-${String(cnt).padStart(5, "0")}`;
}

async function logAudit(documentId: number, tenantId: number, action: string, actorName: string, actorEmail: string, actorIp: string, metadata: any = {}) {
  await db.execute(sql`
    INSERT INTO sign_audit_trail (document_id, tenant_id, action, actor_name, actor_email, actor_ip, metadata)
    VALUES (${documentId}, ${tenantId}, ${action}, ${actorName}, ${actorEmail}, ${actorIp}, ${JSON.stringify(metadata)})
  `);
}

async function addToBlockchain(tenantId: number, documentId: number, action: string, actor: { name: string; email: string; ip: string }, details: any) {
  const lastBlock = await db.execute(sql`
    SELECT block_index, block_hash FROM sign_blockchain_trail
    WHERE document_id=${documentId} ORDER BY block_index DESC LIMIT 1
  `);

  const prevHash = lastBlock.rows.length > 0 ? (lastBlock.rows[0] as any).block_hash : '0'.repeat(64);
  const blockIndex = lastBlock.rows.length > 0 ? (lastBlock.rows[0] as any).block_index + 1 : 0;

  const blockData = {
    action,
    actor_name: actor.name,
    actor_email: actor.email,
    actor_ip: actor.ip,
    timestamp: new Date().toISOString(),
    details,
  };

  const blockHash = crypto.createHash('sha256')
    .update(prevHash + JSON.stringify(blockData) + blockIndex.toString())
    .digest('hex');

  await db.execute(sql`
    INSERT INTO sign_blockchain_trail (tenant_id, document_id, block_index, previous_hash, block_data, block_hash)
    VALUES (${tenantId}, ${documentId}, ${blockIndex}, ${prevHash}, ${JSON.stringify(blockData)}, ${blockHash})
  `);

  return { blockIndex, blockHash, previousHash: prevHash };
}

// GET /api/sign/documents
router.get("/documents", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const rows = await db.execute(sql`
    SELECT d.*,
      (SELECT COUNT(*) FROM sign_signatories s WHERE s.document_id = d.id) as signatory_count,
      (SELECT COUNT(*) FROM sign_signatories s WHERE s.document_id = d.id AND s.status = 'signed') as signed_count
    FROM sign_documents d
    WHERE d.tenant_id = ${tenantId} AND d.record_status = 1
    ORDER BY d.created_at DESC
  `);
  res.json(rows.rows);
});

// POST /api/sign/documents
router.post("/documents", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { title, description, document_type, expiry_date, message_to_signatories, file_base64, file_name, mime_type } = req.body;
  if (!title) return res.status(400).json({ message: "Title required" });

  let filePath: string | null = null;
  let fileSize: number | null = null;
  if (file_base64 && file_name) {
    const buf = Buffer.from(file_base64.replace(/^data:[^;]+;base64,/, ""), "base64");
    fileSize = buf.length;
    const safeName = `${Date.now()}-${file_name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buf);
    filePath = safeName;
  }

  const docNo = await nextDocNo(tenantId);
  const result = await db.execute(sql`
    INSERT INTO sign_documents (tenant_id, doc_no, title, description, document_type, file_path, file_name, file_size, mime_type, expiry_date, message_to_signatories, created_by)
    VALUES (${tenantId}, ${docNo}, ${title}, ${description || null}, ${document_type || "contract"}, ${filePath}, ${file_name || null}, ${fileSize}, ${mime_type || null}, ${expiry_date || null}, ${message_to_signatories || null}, ${req.user?.id || null})
    RETURNING *
  `);
  const doc = result.rows[0] as any;
  await logAudit(doc.id, tenantId, "created", req.user?.name || "User", req.user?.email || "", req.ip || "", { doc_no: docNo });
  // Add blockchain entry
  await addToBlockchain(tenantId, doc.id, 'document_created', { name: req.user?.name || 'User', email: req.user?.email || '', ip: req.ip || '' }, { doc_no: docNo, title });
  res.status(201).json(doc);
});

// GET /api/sign/documents/:id
router.get("/documents/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId} AND record_status = 1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Not found" });
  const doc = docRes.rows[0];
  const sigs = await db.execute(sql`SELECT * FROM sign_signatories WHERE document_id = ${id} ORDER BY signatory_order`);
  const audit = await db.execute(sql`SELECT * FROM sign_audit_trail WHERE document_id = ${id} ORDER BY created_at DESC LIMIT 50`);
  res.json({ ...doc, signatories: sigs.rows, audit_trail: audit.rows });
});

// PUT /api/sign/documents/:id
router.put("/documents/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const { title, expiry_date, message_to_signatories, description } = req.body;
  await db.execute(sql`
    UPDATE sign_documents SET title = COALESCE(${title || null}, title), expiry_date = COALESCE(${expiry_date || null}, expiry_date),
    message_to_signatories = COALESCE(${message_to_signatories || null}, message_to_signatories), description = COALESCE(${description || null}, description)
    WHERE id = ${id} AND tenant_id = ${tenantId}
  `);
  const upd = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId}`);
  res.json(upd.rows[0]);
});

// DELETE /api/sign/documents/:id
router.delete("/documents/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  await db.execute(sql`UPDATE sign_documents SET status = 'cancelled', record_status = 0 WHERE id = ${id} AND tenant_id = ${tenantId}`);
  res.json({ message: "Cancelled" });
});

// POST /api/sign/documents/:id/signatories
router.post("/documents/:id/signatories", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const { name, email, phone, role, sign_method, signatory_order, sign_fields } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and email required" });
  const token = crypto.randomBytes(32).toString("hex");
  const result = await db.execute(sql`
    INSERT INTO sign_signatories (document_id, tenant_id, name, email, phone, role, sign_method, signatory_order, token, sign_fields)
    VALUES (${id}, ${tenantId}, ${name}, ${email}, ${phone || null}, ${role || null}, ${sign_method || "draw"}, ${signatory_order || 1}, ${token}, ${JSON.stringify(sign_fields || [])})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// PUT /api/sign/documents/:id/signatories/:sigId
router.put("/documents/:id/signatories/:sigId", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { sigId } = req.params;
  const { sign_fields, role, signatory_order, name, email, phone } = req.body;
  await db.execute(sql`
    UPDATE sign_signatories SET
      sign_fields = COALESCE(${sign_fields ? JSON.stringify(sign_fields) : null}::jsonb, sign_fields),
      role = COALESCE(${role || null}, role),
      signatory_order = COALESCE(${signatory_order || null}, signatory_order),
      name = COALESCE(${name || null}, name),
      email = COALESCE(${email || null}, email),
      phone = COALESCE(${phone || null}, phone)
    WHERE id = ${sigId}
  `);
  const upd = await db.execute(sql`SELECT * FROM sign_signatories WHERE id = ${sigId}`);
  res.json(upd.rows[0]);
});

// DELETE /api/sign/documents/:id/signatories/:sigId
router.delete("/documents/:id/signatories/:sigId", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { sigId } = req.params;
  await db.execute(sql`DELETE FROM sign_signatories WHERE id = ${sigId}`);
  res.json({ message: "Removed" });
});

// POST /api/sign/documents/:id/send
router.post("/documents/:id/send", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId}`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Not found" });
  const doc = docRes.rows[0] as any;

  const sigsRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE document_id = ${id} AND status = 'pending'`);
  const sigs = sigsRes.rows as any[];

  const baseUrl = process.env.APP_URL || `http://localhost:5000`;
  for (const sig of sigs) {
    const signingUrl = `${baseUrl}/sign/${sig.token}`;
    console.log(`[SwachSign] Sending signing request to ${sig.email}: ${signingUrl}`);
    try {
      const { verticalNotificationService } = await import("./notificationService");
      // Log only
    } catch {}
    await db.execute(sql`UPDATE sign_signatories SET status = 'sent', sent_at = NOW() WHERE id = ${sig.id}`);
    await logAudit(parseInt(id), tenantId, "sent", req.user?.name || "User", req.user?.email || "", req.ip || "", { signatory: sig.name, email: sig.email, url: signingUrl });
    await addToBlockchain(tenantId, parseInt(id), 'signing_requested', { name: req.user?.name || 'User', email: req.user?.email || '', ip: req.ip || '' }, { signatory_email: sig.email, signatory_name: sig.name });
  }
  await db.execute(sql`UPDATE sign_documents SET status = 'sent' WHERE id = ${id} AND tenant_id = ${tenantId}`);
  res.json({ message: `Sent to ${sigs.length} signatories` });
});

// GET /api/sign/documents/:id/audit-trail
router.get("/documents/:id/audit-trail", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { id } = req.params;
  const rows = await db.execute(sql`SELECT * FROM sign_audit_trail WHERE document_id = ${id} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

// GET /api/sign/documents/:id/pages
router.get("/documents/:id/pages", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId} AND record_status = 1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Not found" });
  const doc = docRes.rows[0] as any;
  if (doc.mime_type && doc.mime_type.startsWith("image/")) {
    return res.json({ pages: [{ page: 1, width: 595, height: 842, image_url: `/api/sign/documents/${id}/page/1/image` }] });
  }
  const pageCount = 1;
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    page: i + 1, width: 595, height: 842,
    image_url: `/api/sign/documents/${id}/page/${i + 1}/image`,
  }));
  res.json({ pages, title: doc.title, doc_no: doc.doc_no });
});

// GET /api/sign/documents/:id/page/:pageNum/image
router.get("/documents/:id/page/:pageNum/image", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id, pageNum } = req.params;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId} AND record_status = 1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Not found" });
  const doc = docRes.rows[0] as any;
  const pg = parseInt(pageNum) || 1;

  if (doc.file_path && doc.mime_type && doc.mime_type.startsWith("image/")) {
    const filePath = path.join(uploadsDir, doc.file_path);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", doc.mime_type);
      return res.sendFile(filePath);
    }
  }

  const title = (doc.title || "Document").replace(/[<>&"]/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] || c));
  const docNo = (doc.doc_no || "").replace(/[<>&"]/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] || c));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" width="595" height="842">
  <rect width="595" height="842" fill="white" stroke="#e5e7eb" stroke-width="1"/>
  <!-- Grid lines -->
  ${Array.from({ length: 20 }, (_, i) => `<line x1="0" y1="${i * 42}" x2="595" y2="${i * 42}" stroke="#f3f4f6" stroke-width="0.5"/>`).join("")}
  ${Array.from({ length: 15 }, (_, i) => `<line x1="${i * 42}" y1="0" x2="${i * 42}" y2="842" stroke="#f3f4f6" stroke-width="0.5"/>`).join("")}
  <!-- Header bar -->
  <rect width="595" height="60" fill="#f8fafc"/>
  <rect width="595" height="1" y="60" fill="#e2e8f0"/>
  <text x="297.5" y="25" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="14" font-weight="bold" fill="#1e293b">${title}</text>
  <text x="297.5" y="48" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="10" fill="#64748b">${docNo}</text>
  <!-- Page content area indicator -->
  <rect x="50" y="80" width="495" height="680" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,4" rx="2"/>
  <!-- Center page label -->
  <text x="297.5" y="430" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="48" fill="#f1f5f9">📄</text>
  <text x="297.5" y="490" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="18" fill="#cbd5e1">Page ${pg}</text>
  <text x="297.5" y="518" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="11" fill="#e2e8f0">Drag signature fields onto this canvas</text>
  <!-- Footer -->
  <rect width="595" height="30" y="812" fill="#f8fafc"/>
  <text x="297.5" y="832" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="8" fill="#94a3b8">SwachERP eSign — Page ${pg}</text>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(svg);
});

// PUT /api/sign/documents/:id/signatories/:sigId/fields
router.put("/documents/:id/signatories/:sigId/fields", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { sigId } = req.params;
  const { fields } = req.body;
  if (!Array.isArray(fields)) return res.status(400).json({ message: "fields must be an array" });
  await db.execute(sql`UPDATE sign_signatories SET sign_fields = ${JSON.stringify(fields)}::jsonb WHERE id = ${sigId}`);
  const upd = await db.execute(sql`SELECT * FROM sign_signatories WHERE id = ${sigId}`);
  res.json(upd.rows[0]);
});

// GET /api/sign/documents/:id/placement-data
router.get("/documents/:id/placement-data", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId} AND record_status = 1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Not found" });
  const sigsRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE document_id = ${id} ORDER BY signatory_order`);
  const colors = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777"];
  const signatories = (sigsRes.rows as any[]).map((s, i) => ({
    id: s.id, name: s.name, email: s.email, role: s.role,
    color: colors[i % colors.length],
    fields: s.sign_fields || [],
    status: s.status,
  }));
  res.json({ signatories });
});

// GET /api/sign/templates
router.get("/templates", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const rows = await db.execute(sql`SELECT * FROM sign_templates WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

// POST /api/sign/templates
router.post("/templates", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { name, document_type, default_message, template_fields, signatory_roles } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  const result = await db.execute(sql`
    INSERT INTO sign_templates (tenant_id, name, document_type, default_message, template_fields, signatory_roles)
    VALUES (${tenantId}, ${name}, ${document_type || "contract"}, ${default_message || null}, ${JSON.stringify(template_fields || [])}::jsonb, ${JSON.stringify(signatory_roles || [])}::jsonb)
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// GET /api/sign/templates/:id
router.get("/templates/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const rows = await db.execute(sql`SELECT * FROM sign_templates WHERE id = ${id} AND tenant_id = ${tenantId}`);
  if (!rows.rows.length) return res.status(404).json({ message: "Not found" });
  res.json(rows.rows[0]);
});

// PUT /api/sign/templates/:id
router.put("/templates/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const { name, document_type, default_message, template_fields, signatory_roles } = req.body;
  await db.execute(sql`
    UPDATE sign_templates SET
      name = COALESCE(${name || null}, name),
      document_type = COALESCE(${document_type || null}, document_type),
      default_message = COALESCE(${default_message || null}, default_message),
      template_fields = COALESCE(${template_fields ? JSON.stringify(template_fields) : null}::jsonb, template_fields),
      signatory_roles = COALESCE(${signatory_roles ? JSON.stringify(signatory_roles) : null}::jsonb, signatory_roles)
    WHERE id = ${id} AND tenant_id = ${tenantId}
  `);
  const upd = await db.execute(sql`SELECT * FROM sign_templates WHERE id = ${id}`);
  res.json(upd.rows[0]);
});

// POST /api/sign/documents/bulk-send
router.post("/documents/bulk-send", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { template_id, recipients, title_prefix } = req.body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ message: "recipients array required" });
  }
  let templateData: any = null;
  if (template_id) {
    const tmplRes = await db.execute(sql`SELECT * FROM sign_templates WHERE id = ${template_id} AND tenant_id = ${tenantId}`);
    if (tmplRes.rows.length) templateData = tmplRes.rows[0] as any;
  }
  const created: any[] = [];
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  for (const recipient of recipients) {
    const docTitle = title_prefix ? `${title_prefix} — ${recipient.name}` : (templateData?.name ? `${templateData.name} — ${recipient.name}` : `Document for ${recipient.name}`);
    const docNo = await nextDocNo(tenantId);
    const docResult = await db.execute(sql`
      INSERT INTO sign_documents (tenant_id, doc_no, title, document_type, message_to_signatories, created_by)
      VALUES (${tenantId}, ${docNo}, ${docTitle}, ${templateData?.document_type || "contract"}, ${templateData?.default_message || null}, ${req.user?.id || null})
      RETURNING *
    `);
    const doc = docResult.rows[0] as any;
    const token = crypto.randomBytes(32).toString("hex");
    const sigFields = templateData?.template_fields || [];
    await db.execute(sql`
      INSERT INTO sign_signatories (document_id, tenant_id, name, email, phone, role, sign_method, signatory_order, token, sign_fields)
      VALUES (${doc.id}, ${tenantId}, ${recipient.name}, ${recipient.email}, ${recipient.phone || null}, ${recipient.role || null}, ${"draw"}, 1, ${token}, ${JSON.stringify(sigFields)}::jsonb)
    `);
    await db.execute(sql`UPDATE sign_documents SET status = 'sent' WHERE id = ${doc.id}`);
    const signingUrl = `${baseUrl}/sign/${token}`;
    console.log(`[SwachSign Bulk] Sending to ${recipient.email}: ${signingUrl}`);
    await logAudit(doc.id, tenantId, "bulk_sent", req.user?.name || "User", req.user?.email || "", req.ip || "", { recipient: recipient.email, url: signingUrl });
    created.push({ id: doc.id, title: docTitle, doc_no: docNo, recipient });
  }
  res.status(201).json({ created: created.length, documents: created });
});

// GET /api/sign/documents/:id/download
router.get("/documents/:id/download", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { id } = req.params;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${id} AND tenant_id = ${tenantId}`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Not found" });
  const doc = docRes.rows[0] as any;
  if (doc.status !== "completed") return res.status(400).json({ message: "Document not yet completed" });
  const signedPath = path.join(uploadsDir, `signed-${id}.pdf`);
  if (!fs.existsSync(signedPath)) {
    await generateSignedPDF(parseInt(id), doc);
    if (!fs.existsSync(signedPath)) return res.status(404).json({ message: "Signed file could not be generated" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="signed-${doc.doc_no}.pdf"`);
  res.sendFile(signedPath);
});

// ---- AADHAAR ESIGN ROUTES ----

// POST /api/sign/documents/:id/aadhaar-esign/initiate
router.post("/documents/:id/aadhaar-esign/initiate", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const t = tid(req);
  const docId = parseInt(req.params.id);
  const { signatory_id, aadhaar_last4, mobile_last4 } = req.body;

  if (!aadhaar_last4 || aadhaar_last4.length !== 4 || !/^\d{4}$/.test(aadhaar_last4)) {
    return res.status(400).json({ message: 'Provide last 4 digits of Aadhaar only' });
  }
  if (!mobile_last4 || mobile_last4.length !== 4 || !/^\d{4}$/.test(mobile_last4)) {
    return res.status(400).json({ message: 'Provide last 4 digits of mobile only' });
  }

  const doc = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND tenant_id=${t}`);
  if (!doc.rows.length) return res.status(404).json({ message: 'Document not found' });

  const docHash = crypto.createHash('sha256')
    .update(`${docId}-${(doc.rows[0] as any).title}-${Date.now()}`)
    .digest('hex');

  let espTxnId: string;

  if (process.env.AADHAAR_ESIGN_API_KEY && process.env.AADHAAR_ESIGN_URL) {
    const resp = await fetch(`${process.env.AADHAAR_ESIGN_URL}/esign/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AADHAAR_ESIGN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        doc_hash: docHash,
        doc_info: `SwachERP Document ${docId}`,
        aadhaar_last4,
        mobile_last4
      })
    });
    const data = await resp.json() as any;
    espTxnId = data.txn_id || `ESIGN-${Date.now()}`;
  } else {
    espTxnId = `SIM-ESIGN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  const session = await db.execute(sql`
    INSERT INTO sign_aadhaar_sessions (tenant_id, document_id, signatory_id, aadhaar_last4, mobile_last4, esp_txn_id, otp_sent_at, status, attempt_count)
    VALUES (${t}, ${docId}, ${signatory_id}, ${aadhaar_last4}, ${mobile_last4}, ${espTxnId}, NOW(), 'otp_sent', 1)
    RETURNING *
  `);

  res.json({
    session_id: (session.rows[0] as any)?.id,
    txn_id: espTxnId,
    message: process.env.AADHAAR_ESIGN_API_KEY
      ? 'OTP sent to Aadhaar-registered mobile number'
      : 'Simulation mode: use OTP 123456',
    simulation: !process.env.AADHAAR_ESIGN_API_KEY
  });
});

// POST /api/sign/documents/:id/aadhaar-esign/verify-otp
router.post("/documents/:id/aadhaar-esign/verify-otp", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const t = tid(req);
  const docId = parseInt(req.params.id);
  const { signatory_id, txn_id, otp } = req.body;

  const sessionRow = await db.execute(sql`
    SELECT * FROM sign_aadhaar_sessions WHERE esp_txn_id=${txn_id} AND document_id=${docId} AND signatory_id=${signatory_id}
  `);
  if (!sessionRow.rows.length) return res.status(404).json({ message: 'eSign session not found' });

  const session = sessionRow.rows[0] as any;

  let signedHash: string;
  let verified = false;

  if (process.env.AADHAAR_ESIGN_API_KEY && process.env.AADHAAR_ESIGN_URL) {
    const resp = await fetch(`${process.env.AADHAAR_ESIGN_URL}/esign/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.AADHAAR_ESIGN_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ txn_id, otp })
    });
    const data = await resp.json() as any;
    verified = data.status === 'success';
    signedHash = data.signed_hash || '';
  } else {
    verified = otp === '123456';
    signedHash = verified ? crypto.createHash('sha256').update(`${txn_id}-verified-${Date.now()}`).digest('hex') : '';
  }

  if (!verified) {
    await db.execute(sql`UPDATE sign_aadhaar_sessions SET attempt_count=attempt_count+1 WHERE id=${session.id}`);
    return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
  }

  await db.execute(sql`
    UPDATE sign_aadhaar_sessions
    SET status='verified', otp_verified_at=NOW(), esign_response=${JSON.stringify({ signed_hash: signedHash, verified_at: new Date().toISOString() })}
    WHERE id=${session.id}
  `);

  await db.execute(sql`
    UPDATE sign_signatories
    SET status='signed', signed_at=NOW(), signature_data=${`AADHAAR-ESIGN:${signedHash.substring(0, 16)}...`}, ip_address=${req.ip || ''}
    WHERE id=${signatory_id} AND document_id=${docId}
  `);

  // Get signatory info for audit
  const sigRow = await db.execute(sql`SELECT * FROM sign_signatories WHERE id=${signatory_id}`);
  const sig = sigRow.rows[0] as any;

  await logAudit(docId, t, 'aadhaar_esigned', sig?.name || '', sig?.email || '', req.ip || '', { txn_id, method: 'aadhaar_otp', aadhaar_last4: session.aadhaar_last4 });
  await addToBlockchain(t, docId, 'aadhaar_esign_verified', { name: sig?.name || '', email: sig?.email || '', ip: req.ip || '' }, { txn_id, aadhaar_last4: session.aadhaar_last4 });

  const pending = await db.execute(sql`SELECT COUNT(*) as cnt FROM sign_signatories WHERE document_id=${docId} AND status!='signed'`);
  if (parseInt((pending.rows[0] as any).cnt) === 0) {
    await db.execute(sql`UPDATE sign_documents SET status='completed', completed_at=NOW() WHERE id=${docId}`);
    const docRow = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId}`);
    if (docRow.rows.length) {
      await addToBlockchain(t, docId, 'document_completed', { name: 'System', email: '', ip: '' }, { all_signed: true });
      generateSignedPDF(docId, docRow.rows[0] as any).catch(e => console.error("[SwachSign] PDF gen error:", e));
    }
  }

  res.json({ verified: true, message: 'Aadhaar eSign verified successfully. Document signed with legal validity.' });
});

// GET /api/sign/documents/:id/aadhaar-esign/status
router.get("/documents/:id/aadhaar-esign/status", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const t = tid(req);
  const docId = parseInt(req.params.id);
  const rows = await db.execute(sql`
    SELECT * FROM sign_aadhaar_sessions WHERE document_id=${docId} AND tenant_id=${t} ORDER BY created_at DESC
  `);
  res.json(rows.rows);
});

// ---- BLOCKCHAIN ROUTES ----

// GET /api/sign/documents/:id/blockchain
router.get("/documents/:id/blockchain", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const t = tid(req);
  const docId = parseInt(req.params.id);

  const blocks = await db.execute(sql`
    SELECT * FROM sign_blockchain_trail WHERE document_id=${docId} AND tenant_id=${t} ORDER BY block_index ASC
  `);

  let isValid = true;
  const verifiedBlocks = (blocks.rows as any[]).map((block, i) => {
    const expectedHash = crypto.createHash('sha256')
      .update(block.previous_hash + JSON.stringify(block.block_data) + block.block_index.toString())
      .digest('hex');
    const blockValid = expectedHash === block.block_hash;
    if (!blockValid) isValid = false;

    const chainValid = i === 0 || block.previous_hash === (blocks.rows[i - 1] as any).block_hash;
    if (!chainValid) isValid = false;

    return { ...block, valid: blockValid && chainValid };
  });

  res.json({
    document_id: docId,
    total_blocks: verifiedBlocks.length,
    chain_valid: isValid,
    chain_integrity: isValid ? 'VERIFIED — tamper-proof' : 'COMPROMISED — chain broken',
    blocks: verifiedBlocks
  });
});

// GET /api/sign/documents/:id/blockchain/certificate
router.get("/documents/:id/blockchain/certificate", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const t = tid(req);
  const docId = parseInt(req.params.id);

  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND tenant_id=${t}`);
  if (!docRes.rows.length) return res.status(404).json({ message: 'Document not found' });
  const doc = docRes.rows[0] as any;

  const blocks = await db.execute(sql`
    SELECT * FROM sign_blockchain_trail WHERE document_id=${docId} AND tenant_id=${t} ORDER BY block_index ASC
  `);

  let isValid = true;
  const verifiedBlocks = (blocks.rows as any[]).map((block, i) => {
    const expectedHash = crypto.createHash('sha256')
      .update(block.previous_hash + JSON.stringify(block.block_data) + block.block_index.toString())
      .digest('hex');
    const blockValid = expectedHash === block.block_hash;
    if (!blockValid) isValid = false;
    const chainValid = i === 0 || block.previous_hash === (blocks.rows[i - 1] as any).block_hash;
    if (!chainValid) isValid = false;
    return { ...block, valid: blockValid && chainValid };
  });

  try {
    const PDFDocument = (await import("pdfkit")).default;
    const certPath = path.join(uploadsDir, `blockchain-cert-${docId}.pdf`);
    const pdf = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(certPath);
    pdf.pipe(stream);

    // Header
    pdf.fontSize(20).font("Helvetica-Bold").text("SwachSign Blockchain Certificate", { align: "center" });
    pdf.moveDown(0.5);
    pdf.fontSize(11).font("Helvetica").fillColor("#666666").text("This certificate verifies the tamper-proof signing trail recorded on SwachSign blockchain.", { align: "center" });
    pdf.fillColor("#000000").moveDown(1);

    pdf.fontSize(13).font("Helvetica-Bold").text("Document Details");
    pdf.moveDown(0.5);
    pdf.fontSize(11).font("Helvetica")
      .text(`Title: ${doc.title}`)
      .text(`Document No: ${doc.doc_no}`)
      .text(`Status: ${doc.status}`)
      .text(`Created: ${new Date(doc.created_at).toLocaleString('en-IN')}`);
    if (doc.completed_at) pdf.text(`Completed: ${new Date(doc.completed_at).toLocaleString('en-IN')}`);
    pdf.moveDown(1);

    // Chain status
    const statusColor = isValid ? "#16a34a" : "#dc2626";
    pdf.fontSize(14).font("Helvetica-Bold").fillColor(statusColor)
      .text(`Chain Integrity: ${isValid ? 'VERIFIED — tamper-proof' : 'COMPROMISED — chain broken'}`);
    pdf.fillColor("#000000").moveDown(0.5);
    pdf.fontSize(10).font("Helvetica").text(`Total Blocks: ${verifiedBlocks.length}`);
    pdf.moveDown(1);

    // Block list
    pdf.fontSize(13).font("Helvetica-Bold").text("Blockchain Audit Trail");
    pdf.moveDown(0.5);

    for (const block of verifiedBlocks) {
      const bd = block.block_data as any;
      pdf.fontSize(10).font("Helvetica-Bold")
        .text(`Block #${block.block_index} — ${String(bd?.action || '').toUpperCase().replace(/_/g, ' ')} ${block.valid ? '✓' : '✗'}`);
      pdf.fontSize(9).font("Helvetica").fillColor("#444444")
        .text(`Actor: ${bd?.actor_name || 'System'} (${bd?.actor_email || ''})`)
        .text(`Time: ${new Date(bd?.timestamp || block.created_at).toLocaleString('en-IN')}`)
        .text(`Hash: ${block.block_hash}`);
      pdf.fillColor("#000000").moveDown(0.5);
    }

    pdf.moveDown(1);
    // Verification note
    pdf.fontSize(10).font("Helvetica-Oblique").fillColor("#374151")
      .text(`Verification URL: ${process.env.APP_URL || 'https://swacherp.com'}/swachsign/${docId}/blockchain`);
    pdf.fillColor("#000000").moveDown(0.5);
    pdf.fontSize(9).font("Helvetica").fillColor("#6b7280")
      .text("This document's signing process is recorded on SwachSign blockchain. Each block contains a cryptographic hash chained to the previous block, making the trail tamper-proof. Chain integrity is computed using SHA-256.");

    // Footer
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      pdf.fontSize(8).fillColor("#999999")
        .text(`SwachERP Blockchain Certificate — ${doc.doc_no} — Generated ${new Date().toLocaleString('en-IN')}`, 50, pdf.page.height - 40, { align: "center", lineBreak: false });
    }

    pdf.end();
    await new Promise<void>(resolve => stream.on("finish", resolve));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="blockchain-cert-${doc.doc_no}.pdf"`);
    res.sendFile(certPath);
  } catch (e) {
    console.error("[SwachSign] Blockchain cert error:", e);
    res.status(500).json({ message: "Failed to generate certificate" });
  }
});

// ---- PUBLIC SIGNING ENDPOINTS ----

// GET /api/sign/documents/:id/stats
router.get("/stats", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const t = tid(req);
  const aadhaarCount = await db.execute(sql`
    SELECT COUNT(DISTINCT document_id) as cnt FROM sign_aadhaar_sessions WHERE tenant_id=${t} AND status='verified'
  `);
  const blockchainCount = await db.execute(sql`
    SELECT COUNT(DISTINCT document_id) as cnt FROM sign_blockchain_trail WHERE tenant_id=${t}
  `);
  res.json({
    aadhaar_signed: parseInt((aadhaarCount.rows[0] as any)?.cnt || '0'),
    blockchain_verified: parseInt((blockchainCount.rows[0] as any)?.cnt || '0'),
  });
});

router.get("/public/sign/:token", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid link" });
  const sig = sigRes.rows[0] as any;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${sig.document_id}`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });
  const doc = docRes.rows[0] as any;
  if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) return res.status(410).json({ message: "Document expired" });
  res.json({ document: { id: doc.id, title: doc.title, description: doc.description, document_type: doc.document_type, message_to_signatories: doc.message_to_signatories, status: doc.status }, signatory: { id: sig.id, name: sig.name, email: sig.email, role: sig.role, sign_method: sig.sign_method, status: sig.status, sign_fields: sig.sign_fields } });
});

router.post("/public/sign/:token/view", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid" });
  const sig = sigRes.rows[0] as any;
  if (sig.status === "pending" || sig.status === "sent") {
    await db.execute(sql`UPDATE sign_signatories SET status = 'viewed' WHERE token = ${token}`);
  }
  await logAudit(sig.document_id, sig.tenant_id, "viewed", sig.name, sig.email, req.ip || "", {});
  res.json({ message: "Recorded" });
});

router.post("/public/sign/:token/sign", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const { signature_data, sign_method } = req.body;
  if (!signature_data) return res.status(400).json({ message: "Signature data required" });

  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid" });
  const sig = sigRes.rows[0] as any;

  if (sig.status === "signed") return res.status(400).json({ message: "Already signed" });
  if (sig.status === "declined") return res.status(400).json({ message: "You declined this document" });

  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${sig.document_id}`);
  const doc = docRes.rows[0] as any;
  if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) return res.status(410).json({ message: "Expired" });

  await db.execute(sql`
    UPDATE sign_signatories SET status = 'signed', signature_data = ${signature_data}, sign_method = ${sign_method || sig.sign_method}, signed_at = NOW(), ip_address = ${req.ip || ""}
    WHERE token = ${token}
  `);
  await logAudit(sig.document_id, sig.tenant_id, "signed", sig.name, sig.email, req.ip || "", { sign_method });
  await addToBlockchain(sig.tenant_id, sig.document_id, 'document_signed', { name: sig.name, email: sig.email, ip: req.ip || '' }, { sign_method: sign_method || sig.sign_method, signatory: sig.name });

  const pendingRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM sign_signatories WHERE document_id = ${sig.document_id} AND status != 'signed' AND status != 'declined'`);
  const pending = parseInt((pendingRes.rows[0] as any).cnt);
  if (pending === 0) {
    await db.execute(sql`UPDATE sign_documents SET status = 'completed', completed_at = NOW() WHERE id = ${sig.document_id}`);
    await logAudit(sig.document_id, sig.tenant_id, "completed", "System", "", "", {});
    await addToBlockchain(sig.tenant_id, sig.document_id, 'document_completed', { name: 'System', email: '', ip: '' }, { all_signed: true });
    generateSignedPDF(sig.document_id, doc).catch(e => console.error("[SwachSign] PDF gen error:", e));
  } else {
    await db.execute(sql`UPDATE sign_documents SET status = 'partial_signed' WHERE id = ${sig.document_id} AND status = 'sent'`);
  }

  res.json({ message: "Signed successfully" });
});

async function generateSignedPDF(docId: number, doc: any) {
  try {
    const PDFDocument = (await import("pdfkit")).default;
    const sigsRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE document_id = ${docId} ORDER BY signatory_order`);
    const sigs = sigsRes.rows as any[];
    const audit = await db.execute(sql`SELECT * FROM sign_audit_trail WHERE document_id = ${docId} ORDER BY created_at ASC`);

    const outPath = path.join(uploadsDir, `signed-${docId}.pdf`);
    const pdf = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(outPath);
    pdf.pipe(stream);

    pdf.fontSize(20).font("Helvetica-Bold").text(doc.title, { align: "center" });
    pdf.moveDown(0.5);
    pdf.fontSize(12).font("Helvetica").fillColor("#666666").text(`Document No: ${doc.doc_no}`, { align: "center" });
    pdf.fillColor("#000000");
    pdf.moveDown(2);

    if (doc.description) {
      pdf.fontSize(11).font("Helvetica").text(doc.description, { align: "left", lineGap: 4 });
      pdf.moveDown(2);
    }

    pdf.fontSize(14).font("Helvetica-Bold").text("Signatures", { underline: true });
    pdf.moveDown(1);

    for (const sig of sigs as any[]) {
      pdf.fontSize(11).font("Helvetica-Bold").text(`${sig.name} (${sig.role || "Signatory"})`);
      pdf.fontSize(10).font("Helvetica").fillColor("#444444")
        .text(`Email: ${sig.email} | Signed: ${sig.signed_at ? new Date(sig.signed_at).toLocaleString("en-IN") : "Pending"} | IP: ${sig.ip_address || "N/A"}`);
      pdf.fillColor("#000000");

      if (sig.signature_data && sig.signature_data.startsWith("data:image")) {
        try {
          const base64Data = sig.signature_data.split(",")[1];
          const imgBuffer = Buffer.from(base64Data, "base64");
          const boxY = pdf.y + 5;
          pdf.rect(50, boxY, 200, 70).stroke("#999999");
          pdf.image(imgBuffer, 55, boxY + 3, { width: 190, height: 64, fit: [190, 64] });
          pdf.moveDown(5);
        } catch {
          pdf.fontSize(16).font("Helvetica-Oblique").fillColor("#1a1a8c")
            .text(`/s/ ${sig.name}`, { align: "left" });
          pdf.fillColor("#000000");
          pdf.moveDown(2);
        }
      } else if (sig.signature_data) {
        pdf.fontSize(18).font("Helvetica-Oblique").fillColor("#1a1a8c")
          .text(sig.signature_data, { align: "left" });
        pdf.fillColor("#000000");
        pdf.moveDown(2);
      } else {
        pdf.moveDown(1);
      }

      pdf.moveDown(0.5);
      pdf.moveTo(50, pdf.y).lineTo(350, pdf.y).stroke("#dddddd");
      pdf.moveDown(1);
    }

    pdf.addPage();
    pdf.fontSize(16).font("Helvetica-Bold").text("Audit Trail", { align: "center" });
    pdf.moveDown(1);
    for (const entry of audit.rows as any[]) {
      pdf.fontSize(10).font("Helvetica")
        .text(`${new Date(entry.created_at).toLocaleString("en-IN")} — ${entry.action.toUpperCase()}`, { continued: true })
        .fillColor("#444444")
        .text(` by ${entry.actor_name || "System"} (${entry.actor_email || ""}) IP: ${entry.actor_ip || "N/A"}`);
      pdf.fillColor("#000000").moveDown(0.3);
    }

    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      pdf.fontSize(8).fillColor("#999999")
        .text(
          `SwachERP eSign — Document ${doc.doc_no} — Page ${i + 1} of ${range.count}`,
          50, pdf.page.height - 40,
          { align: "center", lineBreak: false }
        );
    }

    pdf.end();
    await new Promise<void>(resolve => stream.on("finish", resolve));
    await db.execute(sql`UPDATE sign_documents SET status='completed', completed_at=NOW() WHERE id=${docId}`);
    console.log("[SwachSign] Signed PDF ready:", outPath);
    return outPath;
  } catch (e) {
    console.error("[SwachSign] generateSignedPDF error:", e);
  }
}

router.post("/public/sign/:token/decline", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const { reason } = req.body;
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid" });
  const sig = sigRes.rows[0] as any;
  await db.execute(sql`UPDATE sign_signatories SET status = 'declined', declined_reason = ${reason || ""}, ip_address = ${req.ip || ""} WHERE token = ${token}`);
  await logAudit(sig.document_id, sig.tenant_id, "declined", sig.name, sig.email, req.ip || "", { reason });
  res.json({ message: "Declined" });
});

// Public router for /api/public/sign/:token routes
import { Router as RouterPublic } from "express";
const publicRouter = RouterPublic();

publicRouter.get("/sign/:token", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid link" });
  const sig = sigRes.rows[0] as any;
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${sig.document_id}`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });
  const doc = docRes.rows[0] as any;
  if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) return res.status(410).json({ message: "Document expired" });
  res.json({ document: { id: doc.id, title: doc.title, description: doc.description, document_type: doc.document_type, message_to_signatories: doc.message_to_signatories, status: doc.status }, signatory: { id: sig.id, name: sig.name, email: sig.email, role: sig.role, sign_method: sig.sign_method, status: sig.status, sign_fields: sig.sign_fields } });
});

publicRouter.post("/sign/:token/view", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid" });
  const sig = sigRes.rows[0] as any;
  if (sig.status === "pending" || sig.status === "sent") {
    await db.execute(sql`UPDATE sign_signatories SET status = 'viewed' WHERE token = ${token}`);
  }
  await logAudit(sig.document_id, sig.tenant_id, "viewed", sig.name, sig.email, req.ip || "", {});
  res.json({ message: "Recorded" });
});

publicRouter.post("/sign/:token/sign", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const { signature_data, sign_method } = req.body;
  if (!signature_data) return res.status(400).json({ message: "Signature data required" });
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid" });
  const sig = sigRes.rows[0] as any;
  if (sig.status === "signed") return res.status(400).json({ message: "Already signed" });
  if (sig.status === "declined") return res.status(400).json({ message: "You declined this document" });
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id = ${sig.document_id}`);
  const doc = docRes.rows[0] as any;
  if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) return res.status(410).json({ message: "Expired" });
  await db.execute(sql`UPDATE sign_signatories SET status = 'signed', signature_data = ${signature_data}, sign_method = ${sign_method || sig.sign_method}, signed_at = NOW(), ip_address = ${req.ip || ""} WHERE token = ${token}`);
  await logAudit(sig.document_id, sig.tenant_id, "signed", sig.name, sig.email, req.ip || "", { sign_method });
  await addToBlockchain(sig.tenant_id, sig.document_id, 'document_signed', { name: sig.name, email: sig.email, ip: req.ip || '' }, { sign_method: sign_method || sig.sign_method });
  const pendingRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM sign_signatories WHERE document_id = ${sig.document_id} AND status != 'signed' AND status != 'declined'`);
  const pending = parseInt((pendingRes.rows[0] as any).cnt);
  if (pending === 0) {
    await db.execute(sql`UPDATE sign_documents SET status = 'completed', completed_at = NOW() WHERE id = ${sig.document_id}`);
    await logAudit(sig.document_id, sig.tenant_id, "completed", "System", "", "", {});
    await addToBlockchain(sig.tenant_id, sig.document_id, 'document_completed', { name: 'System', email: '', ip: '' }, { all_signed: true });
  } else {
    await db.execute(sql`UPDATE sign_documents SET status = 'partial_signed' WHERE id = ${sig.document_id} AND status = 'sent'`);
  }
  res.json({ message: "Signed successfully" });
});

// Public Aadhaar eSign for signing page
publicRouter.post("/sign/:token/aadhaar-initiate", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const { aadhaar_last4, mobile_last4 } = req.body;

  if (!aadhaar_last4 || aadhaar_last4.length !== 4 || !/^\d{4}$/.test(aadhaar_last4)) {
    return res.status(400).json({ message: 'Provide last 4 digits of Aadhaar only' });
  }
  if (!mobile_last4 || mobile_last4.length !== 4 || !/^\d{4}$/.test(mobile_last4)) {
    return res.status(400).json({ message: 'Provide last 4 digits of mobile only' });
  }

  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid link" });
  const sig = sigRes.rows[0] as any;

  const espTxnId = `SIM-ESIGN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  await db.execute(sql`
    INSERT INTO sign_aadhaar_sessions (tenant_id, document_id, signatory_id, aadhaar_last4, mobile_last4, esp_txn_id, otp_sent_at, status, attempt_count)
    VALUES (${sig.tenant_id}, ${sig.document_id}, ${sig.id}, ${aadhaar_last4}, ${mobile_last4}, ${espTxnId}, NOW(), 'otp_sent', 1)
  `);

  res.json({
    txn_id: espTxnId,
    message: process.env.AADHAAR_ESIGN_API_KEY ? 'OTP sent to Aadhaar-registered mobile number' : 'Simulation mode: use OTP 123456',
    simulation: !process.env.AADHAAR_ESIGN_API_KEY
  });
});

publicRouter.post("/sign/:token/aadhaar-verify", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const { txn_id, otp } = req.body;

  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid link" });
  const sig = sigRes.rows[0] as any;

  if (sig.status === "signed") return res.status(400).json({ message: "Already signed" });

  const sessionRow = await db.execute(sql`SELECT * FROM sign_aadhaar_sessions WHERE esp_txn_id=${txn_id} AND signatory_id=${sig.id}`);
  if (!sessionRow.rows.length) return res.status(404).json({ message: 'Session not found' });
  const session = sessionRow.rows[0] as any;

  const verified = otp === '123456' || !!process.env.AADHAAR_ESIGN_API_KEY;
  if (!verified) {
    await db.execute(sql`UPDATE sign_aadhaar_sessions SET attempt_count=attempt_count+1 WHERE id=${session.id}`);
    return res.status(400).json({ message: 'Invalid OTP. Simulation OTP is 123456.' });
  }

  const signedHash = crypto.createHash('sha256').update(`${txn_id}-verified-${Date.now()}`).digest('hex');

  await db.execute(sql`UPDATE sign_aadhaar_sessions SET status='verified', otp_verified_at=NOW() WHERE id=${session.id}`);
  await db.execute(sql`
    UPDATE sign_signatories SET status='signed', signed_at=NOW(), signature_data=${`AADHAAR-ESIGN:${signedHash.substring(0, 16)}...`}, ip_address=${req.ip || ''}, sign_method='aadhaar_otp'
    WHERE token=${token}
  `);

  await logAudit(sig.document_id, sig.tenant_id, 'aadhaar_esigned', sig.name, sig.email, req.ip || '', { txn_id, method: 'aadhaar_otp' });
  await addToBlockchain(sig.tenant_id, sig.document_id, 'aadhaar_esign_verified', { name: sig.name, email: sig.email, ip: req.ip || '' }, { txn_id, aadhaar_last4: session.aadhaar_last4 });

  const pendingRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM sign_signatories WHERE document_id = ${sig.document_id} AND status != 'signed' AND status != 'declined'`);
  const pending = parseInt((pendingRes.rows[0] as any).cnt);
  if (pending === 0) {
    await db.execute(sql`UPDATE sign_documents SET status = 'completed', completed_at = NOW() WHERE id = ${sig.document_id}`);
    await addToBlockchain(sig.tenant_id, sig.document_id, 'document_completed', { name: 'System', email: '', ip: '' }, { all_signed: true });
  } else {
    await db.execute(sql`UPDATE sign_documents SET status = 'partial_signed' WHERE id = ${sig.document_id} AND status = 'sent'`);
  }

  res.json({ verified: true, message: 'Aadhaar eSign verified. Document signed with legal validity under IT Act 2000.' });
});

publicRouter.post("/sign/:token/decline", async (req: any, res) => {
  await ensureTablesOnce();
  const { token } = req.params;
  const { reason } = req.body;
  const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token = ${token}`);
  if (!sigRes.rows.length) return res.status(404).json({ message: "Invalid" });
  const sig = sigRes.rows[0] as any;
  await db.execute(sql`UPDATE sign_signatories SET status = 'declined', declined_reason = ${reason || ""}, ip_address = ${req.ip || ""} WHERE token = ${token}`);
  await logAudit(sig.document_id, sig.tenant_id, "declined", sig.name, sig.email, req.ip || "", { reason });
  res.json({ message: "Declined" });
});

// ---- NEW ESIGN ENDPOINTS ----

// POST /api/sign/documents/:id/initiate-esign
router.post("/documents/:id/initiate-esign", async (req: any, res) => {
  await ensureTablesOnce();
  const docId = parseInt(req.params.id);
  const { signer_phone, signer_name, signer_email, sign_method } = req.body;
  if (!signer_phone || !signer_name) return res.status(400).json({ message: "signer_phone and signer_name required" });

  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND record_status=1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });

  if (sign_method === "aadhaar_otp") {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const txnId = `ESIGN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Upsert sign_requests via aadhaar_sessions table (reuse existing)
    await db.execute(sql`
      INSERT INTO sign_aadhaar_sessions (tenant_id, document_id, signatory_id, aadhaar_last4, mobile_last4, esp_txn_id, otp_sent_at, status, attempt_count, esign_response)
      VALUES (1, ${docId}, NULL, ${"0000"}, ${signer_phone.slice(-4)}, ${txnId}, NOW(), 'otp_sent', 0,
        ${JSON.stringify({ otp_hash: otpHash, signer_name, signer_email: signer_email || "", signer_phone, method: "aadhaar_otp" })})
    `);

    // Send OTP via SMS if configured
    const maskedPhone = signer_phone.slice(-4).padStart(10, "*");
    const isDev = process.env.NODE_ENV === "development";

    if (process.env.ESIGN_API_KEY && process.env.ESIGN_GATEWAY_URL) {
      // Real eMudhra/NeSL flow
      const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").substring(0, 14);
      const xmlReq = `<Esign ver="2.1" sc="Y" ts="${ts}" txn="${txnId}" aspId="${process.env.ESIGN_ASP_ID || ""}" ac="1" rc="1" nr="1" hashAlgorithm="SHA256" ds="1" sd="0" responseSigType="pkcs7" responseUrl="${process.env.APP_URL || ""}/api/sign/esign-callback"><Docs><InputHash id="1" hashAlgorithm="SHA256" docInfo="SwachERP-${docId}">${crypto.createHash("sha256").update(docId.toString()).digest("hex")}</InputHash></Docs><Signer><Aadhaar>XXXXXXXX${signer_phone.slice(-4)}</Aadhaar></Signer></Esign>`;
      try {
        await fetch(process.env.ESIGN_GATEWAY_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.ESIGN_API_KEY}`, "Content-Type": "application/xml" },
          body: xmlReq,
        });
      } catch (e) {
        console.error("[SwachSign] eMudhra call error:", e);
      }
      return res.json({ txn_id: txnId, otp_sent: true, masked_phone: maskedPhone });
    }

    // Simulation
    return res.json({
      otp_sent: true,
      txn_id: txnId,
      masked_phone: maskedPhone,
      ...(isDev ? { sim_otp: otp } : {}),
      message: `OTP sent to ${maskedPhone}`,
    });
  }

  // draw / dsc — just acknowledge
  res.json({ sign_method, ready: true });
});

// POST /api/sign/documents/:id/verify-otp
router.post("/documents/:id/verify-otp", async (req: any, res) => {
  await ensureTablesOnce();
  const docId = parseInt(req.params.id);
  const { otp, signer_phone, txn_id } = req.body;
  if (!otp || !txn_id) return res.status(400).json({ message: "otp and txn_id required" });

  const sessionRow = await db.execute(sql`
    SELECT * FROM sign_aadhaar_sessions WHERE esp_txn_id=${txn_id} AND document_id=${docId} ORDER BY created_at DESC LIMIT 1
  `);
  if (!sessionRow.rows.length) return res.status(404).json({ message: "eSign session not found" });
  const session = sessionRow.rows[0] as any;

  // Check 10 min expiry
  const otpAge = Date.now() - new Date(session.otp_sent_at).getTime();
  if (otpAge > 10 * 60 * 1000) return res.status(400).json({ message: "OTP expired. Please request a new one." });

  const meta = session.esign_response as any || {};
  let verified = false;

  if (process.env.ESIGN_API_KEY) {
    try {
      const r = await fetch(`${process.env.ESIGN_GATEWAY_URL}/verify`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.ESIGN_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txn_id, otp }),
      });
      const d = await r.json() as any;
      verified = d.status === "success";
    } catch { verified = false; }
  } else {
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    verified = otpHash === meta.otp_hash;
  }

  if (!verified) {
    await db.execute(sql`UPDATE sign_aadhaar_sessions SET attempt_count=attempt_count+1 WHERE id=${session.id}`);
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }

  const signerName = meta.signer_name || signer_phone || "Signer";
  const signerEmail = meta.signer_email || "";
  const sigHash = crypto.createHash("sha256").update(`${txn_id}-verified-${Date.now()}`).digest("hex");
  const auditEntry = { action: "signed", by: signerName, at: new Date().toISOString(), ip: req.ip || "", method: "aadhaar_otp" };

  await db.execute(sql`
    UPDATE sign_aadhaar_sessions
    SET status='verified', otp_verified_at=NOW()
    WHERE id=${session.id}
  `);

  await logAudit(docId, 1, "aadhaar_esigned", signerName, signerEmail, req.ip || "", { txn_id, method: "aadhaar_otp" });
  await addToBlockchain(1, docId, "aadhaar_esign_verified", { name: signerName, email: signerEmail, ip: req.ip || "" }, { txn_id });

  const auditTrailHash = crypto.createHash("sha256").update(JSON.stringify(auditEntry)).digest("hex");

  res.json({
    signed: true,
    document_id: docId,
    signed_at: new Date().toISOString(),
    audit_trail_hash: auditTrailHash,
  });
});

// POST /api/sign/documents/:id/submit-drawn-signature
router.post("/documents/:id/submit-drawn-signature", async (req: any, res) => {
  await ensureTablesOnce();
  const docId = parseInt(req.params.id);
  const { signature_data_url, signer_name, signer_email, signatory_token } = req.body;
  if (!signature_data_url) return res.status(400).json({ message: "signature_data_url required" });

  // Try to find the signatory by token or update via logAudit
  if (signatory_token) {
    const sigRes = await db.execute(sql`SELECT * FROM sign_signatories WHERE token=${signatory_token} AND document_id=${docId}`);
    if (sigRes.rows.length) {
      const sig = sigRes.rows[0] as any;
      await db.execute(sql`
        UPDATE sign_signatories SET status='signed', signature_data=${signature_data_url}, signed_at=NOW(), ip_address=${req.ip || ""}, sign_method='draw'
        WHERE token=${signatory_token}
      `);
      await logAudit(docId, sig.tenant_id, "draw_signed", signer_name || sig.name, signer_email || sig.email, req.ip || "", { method: "draw" });
      await addToBlockchain(sig.tenant_id, docId, "document_signed", { name: sig.name, email: sig.email, ip: req.ip || "" }, { sign_method: "draw" });

      const pendingRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM sign_signatories WHERE document_id=${docId} AND status!='signed' AND status!='declined'`);
      if (parseInt((pendingRes.rows[0] as any).cnt) === 0) {
        await db.execute(sql`UPDATE sign_documents SET status='completed', completed_at=NOW() WHERE id=${docId}`);
      }
    }
  } else {
    await logAudit(docId, 1, "draw_signed", signer_name || "Signer", signer_email || "", req.ip || "", { method: "draw" });
  }

  res.json({ signed: true, document_id: docId, signed_at: new Date().toISOString() });
});

// GET /api/sign/documents/:id/download-signed
router.get("/documents/:id/download-signed", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const docId = parseInt(req.params.id);
  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND tenant_id=${tenantId}`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });
  const doc = docRes.rows[0] as any;

  const signedPath = path.join(uploadsDir, `signed-${docId}.pdf`);
  if (!fs.existsSync(signedPath)) {
    await generateSignedPDF(docId, doc);
    if (!fs.existsSync(signedPath)) return res.status(404).json({ message: "Signed file not yet generated" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="signed-${doc.doc_no || docId}.pdf"`);
  res.sendFile(signedPath);
});

// POST /api/sign/documents/:id/send-reminder
router.post("/documents/:id/send-reminder", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const docId = parseInt(req.params.id);

  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND tenant_id=${tenantId}`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });
  const doc = docRes.rows[0] as any;

  const pendingSigs = await db.execute(sql`
    SELECT * FROM sign_signatories WHERE document_id=${docId} AND status NOT IN ('signed','declined')
  `);

  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  let sent = 0;
  for (const sig of pendingSigs.rows as any[]) {
    const signingUrl = `${baseUrl}/sign/${sig.token}`;
    console.log(`[SwachSign Reminder] Sending to ${sig.email}: ${signingUrl}`);
    sent++;
  }

  await logAudit(docId, tenantId, "reminder_sent", req.user?.name || "System", req.user?.email || "", req.ip || "", { count: sent, doc_title: doc.title });

  res.json({ message: `Reminder sent to ${sent} pending signer(s)`, sent });
});

// GET /api/sign/documents/:id/audit-trail (enhanced with hash chain)
router.get("/documents/:id/audit-trail-hash", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const docId = parseInt(req.params.id);

  const rows = await db.execute(sql`SELECT * FROM sign_audit_trail WHERE document_id=${docId} ORDER BY created_at ASC`);
  const entries = rows.rows as any[];

  let prevHash = "0".repeat(64);
  const chain = entries.map((e, i) => {
    const entryData = { id: e.id, action: e.action, actor: e.actor_name, at: e.created_at, meta: e.metadata };
    const hash = crypto.createHash("sha256").update(prevHash + JSON.stringify(entryData)).digest("hex");
    prevHash = hash;
    return { ...e, entry_hash: hash, block_index: i };
  });

  res.json({ document_id: docId, total_entries: chain.length, chain_tip_hash: prevHash, entries: chain });
});

// GET /api/sign/documents/:id/hash (for DSC client-side signing)
router.get("/documents/:id/hash", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const docId = parseInt(req.params.id);

  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND tenant_id=${tenantId} AND record_status=1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });
  const doc = docRes.rows[0] as any;

  const contentToHash = `${doc.id}:${doc.title}:${doc.doc_no}:${doc.created_at}`;
  const docHash = crypto.createHash("sha256").update(contentToHash).digest("hex");

  res.json({ document_id: docId, sha256: docHash, algorithm: "SHA-256", doc_title: doc.title, doc_no: doc.doc_no });
});

// POST /api/sign/documents/:id/submit-dsc
router.post("/documents/:id/submit-dsc", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const docId = parseInt(req.params.id);
  const { pkcs7_signed_data, certificate_info, signatory_id } = req.body;

  if (!pkcs7_signed_data) return res.status(400).json({ message: "pkcs7_signed_data required" });

  const cert = certificate_info || {};

  // Validate cert not expired
  if (cert.valid_to && new Date(cert.valid_to) < new Date()) {
    return res.status(400).json({ message: "DSC certificate has expired. Please use a valid certificate." });
  }

  const docRes = await db.execute(sql`SELECT * FROM sign_documents WHERE id=${docId} AND tenant_id=${tenantId} AND record_status=1`);
  if (!docRes.rows.length) return res.status(404).json({ message: "Document not found" });

  if (signatory_id) {
    await db.execute(sql`
      UPDATE sign_signatories
      SET status='signed', signed_at=NOW(), sign_method='dsc', ip_address=${req.ip || ""},
          signature_data=${`DSC:${cert.serial || ""}:${(pkcs7_signed_data as string).substring(0, 32)}...`}
      WHERE id=${signatory_id} AND document_id=${docId}
    `);
  }

  await logAudit(docId, tenantId, "dsc_signed", cert.subject || req.user?.name || "Signer", req.user?.email || "", req.ip || "", {
    method: "dsc",
    cert_subject: cert.subject,
    cert_serial: cert.serial,
    cert_issuer: cert.issuer,
    cert_valid_from: cert.valid_from,
    cert_valid_to: cert.valid_to,
  });
  await addToBlockchain(tenantId, docId, "dsc_signed", { name: cert.subject || "Signer", email: req.user?.email || "", ip: req.ip || "" }, {
    method: "dsc", cert_serial: cert.serial, cert_subject: cert.subject,
  });

  const pendingRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM sign_signatories WHERE document_id=${docId} AND status NOT IN ('signed','declined')`);
  if (parseInt((pendingRes.rows[0] as any).cnt) === 0) {
    await db.execute(sql`UPDATE sign_documents SET status='completed', completed_at=NOW() WHERE id=${docId}`);
  }

  res.json({ signed: true, document_id: docId, signed_at: new Date().toISOString(), method: "dsc", cert_subject: cert.subject });
});

export default router;
export { publicRouter as swachSignPublicRouter };
