import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { syncBranchToVerticalOutlet } from "./cross-module-sync";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function paginationParams(query: any): { limit: number; offset: number } {
  const page = parseInt(query.page ?? "1", 10);
  const limit = parseInt(query.limit ?? "50", 10);
  const offset = (page - 1) * limit;
  return { limit, offset };
}

// ─── HSN CODES ───────────────────────────────────────────────────────────────

router.get("/hsn-codes", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM hsn_codes
      WHERE tenant_id=${tid}
        ${search ? sql`AND (hsn_code ILIKE ${"%" + search + "%"} OR description ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY hsn_code
      LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/hsn-codes", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { hsn_code, description, gst_rate } = req.body;
    const r = await db.execute(sql`
      INSERT INTO hsn_codes (tenant_id, hsn_code, description, gst_rate)
      VALUES (${tid}, ${hsn_code}, ${description}, ${gst_rate})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/hsn-codes/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { hsn_code, description, gst_rate } = req.body;
    const r = await db.execute(sql`
      UPDATE hsn_codes
      SET hsn_code=${hsn_code}, description=${description}, gst_rate=${gst_rate}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hsn-codes/bulk", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const items: Array<{ hsn_code: string; description: string; gst_rate: number }> = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "Expected array" });
    let inserted = 0;
    let updated = 0;
    for (const item of items) {
      const r = await db.execute(sql`
        INSERT INTO hsn_codes (tenant_id, hsn_code, description, gst_rate)
        VALUES (${tid}, ${item.hsn_code}, ${item.description}, ${item.gst_rate})
        ON CONFLICT (tenant_id, hsn_code)
        DO UPDATE SET description=EXCLUDED.description, gst_rate=EXCLUDED.gst_rate
        RETURNING (xmax = 0) AS is_insert`);
      const row = r.rows[0] as any;
      if (row?.is_insert) inserted++;
      else updated++;
    }
    res.json({ inserted, updated, total: items.length });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── SAC CODES ───────────────────────────────────────────────────────────────

router.get("/sac-codes", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM sac_codes
      WHERE tenant_id=${tid}
        ${search ? sql`AND (sac_code ILIKE ${"%" + search + "%"} OR description ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY sac_code
      LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/sac-codes", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { sac_code, description, gst_rate } = req.body;
    const r = await db.execute(sql`
      INSERT INTO sac_codes (tenant_id, sac_code, description, gst_rate)
      VALUES (${tid}, ${sac_code}, ${description}, ${gst_rate})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/sac-codes/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { sac_code, description, gst_rate } = req.body;
    const r = await db.execute(sql`
      UPDATE sac_codes
      SET sac_code=${sac_code}, description=${description}, gst_rate=${gst_rate}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── TAX CONFIG ──────────────────────────────────────────────────────────────

router.get("/tax-config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM tax_config
      WHERE tenant_id=${tid}
        ${search ? sql`AND name ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY name
      LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/tax-config", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, tax_type, rate, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO tax_config (tenant_id, name, tax_type, rate, is_active)
      VALUES (${tid}, ${name}, ${tax_type}, ${rate}, ${is_active ?? true})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/tax-config/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, tax_type, rate, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE tax_config
      SET name=${name}, tax_type=${tax_type}, rate=${rate}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/tax-config/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    await db.execute(sql`DELETE FROM tax_config WHERE id=${id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── STATES ──────────────────────────────────────────────────────────────────

router.get("/states", auth, async (req: any, res: any) => {
  try {
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    // Try state_master first, fall back to states
    let r;
    try {
      r = await db.execute(sql`
        SELECT * FROM state_master
          ${search ? sql`WHERE name ILIKE ${"%" + search + "%"} OR code ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    } catch {
      r = await db.execute(sql`
        SELECT * FROM states
          ${search ? sql`WHERE name ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    }
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/states", auth, async (req: any, res: any) => {
  try {
    const { name, code, country_id, gst_state_code } = req.body;
    let r;
    try {
      r = await db.execute(sql`
        INSERT INTO state_master (name, code, country_id, gst_state_code)
        VALUES (${name}, ${code}, ${country_id}, ${gst_state_code})
        RETURNING *`);
    } catch {
      r = await db.execute(sql`
        INSERT INTO states (name, code, country_id)
        VALUES (${name}, ${code}, ${country_id})
        RETURNING *`);
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── COUNTRIES ───────────────────────────────────────────────────────────────

router.get("/countries", auth, async (req: any, res: any) => {
  try {
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    let r;
    try {
      r = await db.execute(sql`
        SELECT * FROM country_master
          ${search ? sql`WHERE name ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    } catch {
      r = await db.execute(sql`
        SELECT * FROM countries
          ${search ? sql`WHERE name ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    }
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/countries", auth, async (req: any, res: any) => {
  try {
    const { name, code, phone_code } = req.body;
    let r;
    try {
      r = await db.execute(sql`
        INSERT INTO country_master (name, code, phone_code) VALUES (${name}, ${code}, ${phone_code}) RETURNING *`);
    } catch {
      r = await db.execute(sql`
        INSERT INTO countries (name, code, phone_code) VALUES (${name}, ${code}, ${phone_code}) RETURNING *`);
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── BANKS ───────────────────────────────────────────────────────────────────

router.get("/banks", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM banks
      WHERE tenant_id=${tid}
        ${search ? sql`AND (name ILIKE ${"%" + search + "%"} OR ifsc_prefix ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/banks", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, ifsc_prefix, account_number, branch_name } = req.body;
    const r = await db.execute(sql`
      INSERT INTO banks (tenant_id, name, ifsc_prefix, account_number, branch_name)
      VALUES (${tid}, ${name}, ${ifsc_prefix}, ${account_number}, ${branch_name})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/banks/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, ifsc_prefix, account_number, branch_name } = req.body;
    const r = await db.execute(sql`
      UPDATE banks
      SET name=${name}, ifsc_prefix=${ifsc_prefix}, account_number=${account_number}, branch_name=${branch_name}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── BRANCHES ────────────────────────────────────────────────────────────────

router.get("/branches", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM branches
      WHERE tenant_id=${tid}
        ${search ? sql`AND name ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/branches", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, address, phone, gstin, state_id } = req.body;
    const branchCode = 'BR-' + Date.now().toString().slice(-8);
    const r = await db.execute(sql`
      INSERT INTO branches (tenant_id, branch_code, branch_name, address, phone, gstin)
      VALUES (${tid}, ${branchCode}, ${name}, ${address||null}, ${phone||null}, ${gstin||null})
      RETURNING *`);
    const branch = r.rows[0] as any;
    // Auto-sync to vertical outlet/location table (fire-and-forget)
    syncBranchToVerticalOutlet(tid, {
      id: branch.id, name: branch.branch_name,
      address: branch.address ?? null, phone: branch.phone ?? null, gstin: branch.gstin ?? null,
    }).catch(() => {});
    res.json(branch);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/branches/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, address, phone, gstin, state_id } = req.body;
    const r = await db.execute(sql`
      UPDATE branches
      SET branch_name=${name}, address=${address}, phone=${phone}, gstin=${gstin}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── DOCUMENT NUMBERING ──────────────────────────────────────────────────────

router.get("/doc-numbering", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    let tableName = "doc_numbering";
    let r;
    try {
      r = await db.execute(sql`
        SELECT * FROM doc_numbering
        WHERE tenant_id=${tid}
          ${search ? sql`AND doc_type ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY doc_type LIMIT ${limit} OFFSET ${offset}`);
    } catch {
      r = await db.execute(sql`
        SELECT * FROM document_numbering
        WHERE tenant_id=${tid}
          ${search ? sql`AND doc_type ILIKE ${"%" + search + "%"}` : sql``}
        ORDER BY doc_type LIMIT ${limit} OFFSET ${offset}`);
      tableName = "document_numbering";
    }
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/doc-numbering", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { doc_type, prefix, suffix, current_number, padding, reset_period } = req.body;
    let r;
    try {
      r = await db.execute(sql`
        INSERT INTO doc_numbering (tenant_id, doc_type, prefix, suffix, current_number, padding, reset_period)
        VALUES (${tid}, ${doc_type}, ${prefix}, ${suffix}, ${current_number ?? 0}, ${padding ?? 4}, ${reset_period ?? 'never'})
        RETURNING *`);
    } catch {
      r = await db.execute(sql`
        INSERT INTO document_numbering (tenant_id, doc_type, prefix, suffix, current_number, padding, reset_period)
        VALUES (${tid}, ${doc_type}, ${prefix}, ${suffix}, ${current_number ?? 0}, ${padding ?? 4}, ${reset_period ?? 'never'})
        RETURNING *`);
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/doc-numbering/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { prefix, suffix, current_number, padding, reset_period } = req.body;
    let r;
    try {
      r = await db.execute(sql`
        UPDATE doc_numbering
        SET prefix=${prefix}, suffix=${suffix}, current_number=${current_number}, padding=${padding}, reset_period=${reset_period}
        WHERE id=${id} AND tenant_id=${tid}
        RETURNING *`);
    } catch {
      r = await db.execute(sql`
        UPDATE document_numbering
        SET prefix=${prefix}, suffix=${suffix}, current_number=${current_number}, padding=${padding}, reset_period=${reset_period}
        WHERE id=${id} AND tenant_id=${tid}
        RETURNING *`);
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/doc-numbering/preview/:docType", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { docType } = req.params;
    let config: any;
    try {
      const r = await db.execute(sql`
        SELECT * FROM doc_numbering WHERE tenant_id=${tid} AND doc_type=${docType} LIMIT 1`);
      config = r.rows[0];
    } catch {
      const r = await db.execute(sql`
        SELECT * FROM document_numbering WHERE tenant_id=${tid} AND doc_type=${docType} LIMIT 1`);
      config = r.rows[0];
    }
    if (!config) {
      const year = new Date().getFullYear();
      return res.json({ preview: `${docType.toUpperCase()}-${year}-0001` });
    }
    const nextNum = (parseInt(config.current_number, 10) + 1).toString().padStart(config.padding ?? 4, "0");
    const year = new Date().getFullYear();
    const preview = `${config.prefix ?? ""}${year}-${nextNum}${config.suffix ?? ""}`;
    res.json({ preview });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

router.get("/email-templates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM email_templates
      WHERE tenant_id=${tid}
        ${search ? sql`AND (name ILIKE ${"%" + search + "%"} OR subject ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/email-templates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, subject, body, template_type } = req.body;
    const r = await db.execute(sql`
      INSERT INTO email_templates (tenant_id, name, subject, body, template_type)
      VALUES (${tid}, ${name}, ${subject}, ${body}, ${template_type})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/email-templates/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, subject, body, template_type } = req.body;
    const r = await db.execute(sql`
      UPDATE email_templates
      SET name=${name}, subject=${subject}, body=${body}, template_type=${template_type}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/email-templates/:id/test-send", auth, async (req: any, res: any) => {
  const { id } = req.params;
  console.log(`[email-templates] test send for template id=${id}`);
  res.json({ success: true });
});

// ─── SMS TEMPLATES ───────────────────────────────────────────────────────────

router.get("/sms-templates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM sms_templates
      WHERE tenant_id=${tid}
        ${search ? sql`AND (name ILIKE ${"%" + search + "%"} OR body ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/sms-templates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, body, template_type, dlt_template_id } = req.body;
    const r = await db.execute(sql`
      INSERT INTO sms_templates (tenant_id, name, body, template_type, dlt_template_id)
      VALUES (${tid}, ${name}, ${body}, ${template_type}, ${dlt_template_id})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/sms-templates/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, body, template_type, dlt_template_id } = req.body;
    const r = await db.execute(sql`
      UPDATE sms_templates
      SET name=${name}, body=${body}, template_type=${template_type}, dlt_template_id=${dlt_template_id}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── APPROVAL MATRIX ─────────────────────────────────────────────────────────

router.get("/approval-matrix", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM approval_matrix
      WHERE tenant_id=${tid}
        ${search ? sql`AND (doc_type ILIKE ${"%" + search + "%"} OR approver_role ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY doc_type, level LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/approval-matrix", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { doc_type, level, approver_role, min_amount, max_amount, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO approval_matrix (tenant_id, doc_type, level, approver_role, min_amount, max_amount, is_active)
      VALUES (${tid}, ${doc_type}, ${level}, ${approver_role}, ${min_amount}, ${max_amount}, ${is_active ?? true})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/approval-matrix/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { doc_type, level, approver_role, min_amount, max_amount, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE approval_matrix
      SET doc_type=${doc_type}, level=${level}, approver_role=${approver_role},
          min_amount=${min_amount}, max_amount=${max_amount}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/approval-matrix/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    await db.execute(sql`DELETE FROM approval_matrix WHERE id=${id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── FEATURE FLAGS ───────────────────────────────────────────────────────────

router.get("/feature-flags", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM feature_flags
      WHERE (tenant_id=${tid} OR tenant_id IS NULL)
        ${search ? sql`AND flag_key ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY flag_key LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.put("/feature-flags/:flagKey", auth, async (req: any, res: any) => {
  try {
    const { flagKey } = req.params;
    const { is_enabled, description } = req.body;
    const r = await db.execute(sql`
      INSERT INTO feature_flags (flag_key, is_enabled, description)
      VALUES (${flagKey}, ${is_enabled}, ${description})
      ON CONFLICT (flag_key) DO UPDATE SET is_enabled=EXCLUDED.is_enabled, description=EXCLUDED.description
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/feature-flags/:flagKey/tenant-override", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { flagKey } = req.params;
    const { is_enabled } = req.body;
    const r = await db.execute(sql`
      INSERT INTO feature_flags (tenant_id, flag_key, is_enabled)
      VALUES (${tid}, ${flagKey}, ${is_enabled})
      ON CONFLICT (tenant_id, flag_key) DO UPDATE SET is_enabled=EXCLUDED.is_enabled
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── PRINT TEMPLATES ─────────────────────────────────────────────────────────

router.get("/print-templates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT * FROM print_templates
      WHERE tenant_id=${tid}
        ${search ? sql`AND (name ILIKE ${"%" + search + "%"} OR template_type ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY template_type, name LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/print-templates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, template_type, content, paper_size, is_default } = req.body;
    const r = await db.execute(sql`
      INSERT INTO print_templates (tenant_id, name, template_type, content, paper_size, is_default)
      VALUES (${tid}, ${name}, ${template_type}, ${content}, ${paper_size ?? 'A4'}, ${is_default ?? false})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/print-templates/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, template_type, content, paper_size, is_default } = req.body;
    const r = await db.execute(sql`
      UPDATE print_templates
      SET name=${name}, template_type=${template_type}, content=${content},
          paper_size=${paper_size}, is_default=${is_default}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/print-templates/:id/set-default", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    // Get template type first
    const tplR = await db.execute(sql`
      SELECT template_type FROM print_templates WHERE id=${id} AND tenant_id=${tid}`);
    const tpl = tplR.rows[0] as any;
    if (!tpl) return res.status(404).json({ message: "Template not found" });
    // Clear existing defaults for this type
    await db.execute(sql`
      UPDATE print_templates SET is_default=false
      WHERE tenant_id=${tid} AND template_type=${tpl.template_type}`);
    const r = await db.execute(sql`
      UPDATE print_templates SET is_default=true WHERE id=${id} AND tenant_id=${tid} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────

router.get("/webhooks", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search } = req.query;
    const { limit, offset } = paginationParams(req.query);
    const r = await db.execute(sql`
      SELECT id, tenant_id, name, url, event_types, is_active, created_at
      FROM webhooks
      WHERE tenant_id=${tid}
        ${search ? sql`AND (name ILIKE ${"%" + search + "%"} OR url ILIKE ${"%" + search + "%"})` : sql``}
      ORDER BY name LIMIT ${limit} OFFSET ${offset}`);
    res.json(r.rows);
  } catch (e: any) {
    if (e.message?.includes("does not exist")) return res.json([]);
    res.status(500).json({ message: e.message });
  }
});

router.post("/webhooks", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { name, url, event_types, secret, is_active } = req.body;
    const r = await db.execute(sql`
      INSERT INTO webhooks (tenant_id, name, url, event_types, secret, is_active)
      VALUES (${tid}, ${name}, ${url}, ${JSON.stringify(event_types ?? [])}, ${secret}, ${is_active ?? true})
      RETURNING id, tenant_id, name, url, event_types, is_active, created_at`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/webhooks/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { id } = req.params;
    const { name, url, event_types, secret, is_active } = req.body;
    const r = await db.execute(sql`
      UPDATE webhooks
      SET name=${name}, url=${url}, event_types=${JSON.stringify(event_types ?? [])},
          secret=${secret}, is_active=${is_active}
      WHERE id=${id} AND tenant_id=${tid}
      RETURNING id, tenant_id, name, url, event_types, is_active, created_at`);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/webhooks/:id/test", auth, async (req: any, res: any) => {
  res.json({ success: true, message: "Test webhook sent" });
});

// ── Integration Credentials (encrypted per tenant) ───────────────────────────
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENC_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY ?? "swacherp-default-32-byte-key-xxx";
const KEY = createHash("sha256").update(ENC_KEY).digest();

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", KEY, iv);
  return iv.toString("hex") + ":" + cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

function decrypt(enc: string): string {
  try {
    const [ivHex, data] = enc.split(":");
    const decipher = createDecipheriv("aes-256-cbc", KEY, Buffer.from(ivHex, "hex"));
    return decipher.update(data, "hex", "utf8") + decipher.final("utf8");
  } catch { return ""; }
}

async function ensureCredTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS integration_credentials (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    cred_key TEXT NOT NULL,
    cred_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, cred_key)
  )`);
}

router.get("/integration-credentials", auth, async (req: any, res: any) => {
  await ensureCredTable();
  const tid = getTenantId(req);
  const rows = await db.execute(sql`SELECT cred_key FROM integration_credentials WHERE tenant_id=${tid}`);
  // Return only which keys are set (not the values — security)
  const result: Record<string, boolean> = {};
  rows.rows.forEach((r: any) => { result[r.cred_key] = true; });
  res.json(result);
});

router.get("/integration-credentials/status", auth, async (req: any, res: any) => {
  await ensureCredTable();
  const tid = getTenantId(req);
  const rows = await db.execute(sql`SELECT cred_key FROM integration_credentials WHERE tenant_id=${tid}`);
  const result: Record<string, boolean> = {};
  rows.rows.forEach((r: any) => { result[r.cred_key] = true; });
  res.json(result);
});

router.put("/integration-credentials", auth, async (req: any, res: any) => {
  await ensureCredTable();
  const tid = getTenantId(req);
  const payload: Record<string, string> = req.body ?? {};
  for (const [key, value] of Object.entries(payload)) {
    if (!value) continue;
    const encrypted = encrypt(value);
    await db.execute(sql`
      INSERT INTO integration_credentials (tenant_id, cred_key, cred_value, updated_at)
      VALUES (${tid}, ${key}, ${encrypted}, NOW())
      ON CONFLICT (tenant_id, cred_key) DO UPDATE SET cred_value=${encrypted}, updated_at=NOW()
    `);
    // Also set in process.env so routes using process.env pick up immediately
    process.env[key] = value;
  }
  res.json({ ok: true, updated: Object.keys(payload).length });
});

// Helper: resolve a credential — DB first, then env var
export async function getCredential(tenantId: number, key: string): Promise<string | undefined> {
  try {
    await ensureCredTable();
    const r = await db.execute(sql`
      SELECT cred_value FROM integration_credentials WHERE tenant_id=${tenantId} AND cred_key=${key} LIMIT 1
    `);
    if (r.rows.length) return decrypt(r.rows[0].cred_value as string);
  } catch {}
  return process.env[key];
}

export default router;
