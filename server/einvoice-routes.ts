/**
 * SwachERP e-Invoice API Routes
 * POST /api/einvoice/generate/:invoiceId  — Generate IRN
 * POST /api/einvoice/cancel/:invoiceId    — Cancel IRN
 * POST /api/einvoice/eway-bill/:invoiceId — Generate e-Way Bill
 * GET  /api/einvoice/status/:invoiceId    — Get IRN/EWB status
 * GET  /api/einvoice/config               — Get config (masked)
 * PUT  /api/einvoice/config               — Save config
 */

import { Router } from "express";
import { pool } from "./db";
import { generateIRN, cancelIRN, generateEWayBill, getIRNDetails } from "./einvoice-service";

const router = Router();

// Auth middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
}
function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (!['admin', 'manager'].includes(req.user?.role) && !req.user?.isSuperAdmin)
    return res.status(403).json({ message: 'Admin only' });
  next();
}

// ── Generate IRN ──────────────────────────────────────────────────────────────
router.post("/generate/:invoiceId", requireAdmin, async (req: any, res) => {
  try {
    const result = await generateIRN(req.params.invoiceId);
    if (result.success) {
      res.json({ success: true, irn: result.irn, ackNumber: result.ackNumber, ackDate: result.ackDate, signedQrCode: result.signedQrCode });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Cancel IRN ────────────────────────────────────────────────────────────────
router.post("/cancel/:invoiceId", requireAdmin, async (req: any, res) => {
  try {
    const { reason, remarks } = req.body;
    if (!reason) return res.status(400).json({ error: 'Cancellation reason required' });
    const result = await cancelIRN(req.params.invoiceId, reason, remarks || '');
    if (result.success) {
      res.json({ success: true, message: 'IRN cancelled successfully' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Generate e-Way Bill ───────────────────────────────────────────────────────
router.post("/eway-bill/:invoiceId", requireAdmin, async (req: any, res) => {
  try {
    const { transMode, transId, transName, vehNo, vehType } = req.body;
    const result = await generateEWayBill(req.params.invoiceId, transMode, transId, transName, vehNo, vehType);
    if (result.success) {
      res.json({ success: true, ewayBillNo: result.ewayBillNo, validUpto: result.validUpto });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Get IRN/EWB status for an invoice ────────────────────────────────────────
router.get("/status/:invoiceId", requireAuth, async (req: any, res) => {
  try {
    const result = await pool.query(`
      SELECT irn, irn_status, irn_generated_at, ack_number, ack_date,
             signed_qr_code, einvoice_cancelled_at, einvoice_cancel_reason,
             eway_bill_number, eway_bill_date, eway_bill_valid_upto, eway_bill_status
      FROM invoices WHERE id = $1 LIMIT 1
    `, [req.params.invoiceId]);
    res.json(result.rows[0] || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk IRN status — list invoices with IRN info ─────────────────────────────
router.get("/list", requireAuth, async (req: any, res) => {
  try {
    const tenantId = (req.session as any)?.tenantId ?? req.user?.tenantId;
    const { status, from, to, page = 1, pageSize = 25 } = req.query;
    let where = `WHERE tenant_id = $1 AND record_status = 1`;
    const params: any[] = [tenantId];
    let idx = 2;
    if (status) { where += ` AND irn_status = $${idx++}`; params.push(status); }
    if (from)   { where += ` AND invoice_date >= $${idx++}`; params.push(from); }
    if (to)     { where += ` AND invoice_date <= $${idx++}`; params.push(to); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM invoices ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const offset = (Number(page) - 1) * Number(pageSize);

    const result = await pool.query(`
      SELECT id, invoice_number, invoice_date, buyer_name, buyer_gstin,
             total_amount, irn, irn_status, irn_generated_at, ack_number,
             eway_bill_number, eway_bill_status, eway_bill_valid_upto
      FROM invoices ${where}
      ORDER BY invoice_date DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, offset]);

    res.json({ data: result.rows, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get e-Invoice config (super admin) ───────────────────────────────────────
router.get("/config", async (req: any, res) => {
  if (!req.isAuthenticated() || !req.user?.isSuperAdmin)
    return res.sendStatus(403);
  try {
    const result = await pool.query(`
      SELECT key, value FROM platform_settings
      WHERE key LIKE 'einvoice_%' ORDER BY key
    `);
    const cfg: Record<string, string> = {};
    for (const r of result.rows) {
      // Mask sensitive fields
      if (r.key.includes('secret') || r.key.includes('password')) {
        cfg[r.key] = r.value ? r.value.substring(0, 4) + '••••••••' : '';
      } else {
        cfg[r.key] = r.value || '';
      }
    }
    res.json(cfg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save e-Invoice config (super admin) ──────────────────────────────────────
router.put("/config", async (req: any, res) => {
  if (!req.isAuthenticated() || !req.user?.isSuperAdmin)
    return res.sendStatus(403);
  try {
    const allowed = ['einvoice_client_id','einvoice_client_secret','einvoice_username','einvoice_password','einvoice_gstin','einvoice_mode'];
    for (const [key, value] of Object.entries(req.body)) {
      if (!allowed.includes(key)) continue;
      if (typeof value === 'string' && value.includes('••••')) continue; // skip masked
      await pool.query(`
        INSERT INTO platform_settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, value]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Test connection ───────────────────────────────────────────────────────────
router.post("/test-connection", async (req: any, res) => {
  if (!req.isAuthenticated() || !req.user?.isSuperAdmin)
    return res.sendStatus(403);
  try {
    const { getIRNDetails } = await import('./einvoice-service');
    // Try fetching a known test IRN to verify connectivity
    const result = await fetch('https://einv-apisandbox.nic.in/eivital/v1.04/auth', {
      method: 'HEAD',
    }).then(() => ({ success: true, message: 'NIC sandbox reachable' }))
      .catch(() => ({ success: false, message: 'NIC sandbox unreachable' }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
