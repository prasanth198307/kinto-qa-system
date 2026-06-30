import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { generateEWB, cancelEWB, extendEWB } from "./nic-ewb-client";

const router = Router();
const getTenantId = (req: any) => req.session?.tenantId ?? req.user?.tenantId;

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}
function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// ─── SHOP FLOOR / JOB CARDS ──────────────────────────────────────────────────

router.get("/job-cards", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { workOrderId, status, from, to } = req.query;
    const rows = await db.execute(sql`
      SELECT jc.*, u.first_name || ' ' || u.last_name AS operator_full_name,
             wo.work_order_number
      FROM job_cards jc
      LEFT JOIN users u ON u.id = jc.operator_id
      LEFT JOIN work_orders wo ON wo.id = jc.work_order_id
      WHERE jc.tenant_id = ${tenantId}
        AND (${workOrderId ?? null}::text IS NULL OR jc.work_order_id::text = ${workOrderId ?? null})
        AND (${status ?? null}::text IS NULL OR jc.status = ${status ?? null})
        AND (${from ?? null}::date IS NULL OR jc.created_at::date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR jc.created_at::date <= ${to ?? null}::date)
      ORDER BY jc.created_at DESC LIMIT 300
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.post("/job-cards", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { workOrderId, operationName, sequenceNo, machineId, machineName,
            operatorId, operatorName, plannedQty, plannedStart, plannedEnd } = req.body;
    if (!operationName) return res.status(400).json({ message: "operationName required" });

    const cnt = await db.execute(sql`SELECT COUNT(*) AS c FROM job_cards WHERE tenant_id=${tenantId}`);
    const seq = Number((cnt.rows[0] as any).c) + 1;
    const jobCardNumber = `JC-${new Date().getFullYear()}-${String(seq).padStart(5,"0")}`;

    const result = await db.execute(sql`
      INSERT INTO job_cards
        (tenant_id, job_card_number, work_order_id, operation_name, sequence_no,
         machine_id, machine_name, operator_id, operator_name,
         planned_qty, planned_start, planned_end, created_by)
      VALUES (${tenantId}, ${jobCardNumber}, ${workOrderId ?? null}, ${operationName},
              ${sequenceNo ?? 1}, ${machineId ?? null}, ${machineName ?? null},
              ${operatorId ?? null}, ${operatorName ?? null},
              ${plannedQty ?? null}, ${plannedStart ?? null}, ${plannedEnd ?? null},
              ${req.user?.id ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.patch("/job-cards/:id/start", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await db.execute(sql`
      UPDATE job_cards SET status='in_progress', actual_start=NOW(), updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tenantId} AND status='open'
      RETURNING *
    `);
    if (!result.rows.length) return res.status(404).json({ message: "Job card not found or already started" });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.patch("/job-cards/:id/complete", requireRole("admin", "manager", "operator"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { actualQty, rejectedQty, remarks } = req.body;
    const result = await db.execute(sql`
      UPDATE job_cards SET
        status='completed', actual_end=NOW(), actual_qty=${actualQty ?? null},
        rejected_qty=${rejectedQty ?? 0}, remarks=${remarks ?? null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tenantId} AND status='in_progress'
      RETURNING *
    `);
    if (!result.rows.length) return res.status(404).json({ message: "Job card not found or not in progress" });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.get("/job-cards/summary", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status='open') AS open,
        COUNT(*) FILTER (WHERE status='in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status='completed') AS completed,
        ROUND(AVG(duration_minutes) FILTER (WHERE status='completed'), 1) AS avg_duration_mins,
        ROUND(SUM(actual_qty) FILTER (WHERE status='completed'), 0) AS total_qty_produced,
        ROUND(SUM(rejected_qty) FILTER (WHERE status='completed'), 0) AS total_rejected
      FROM job_cards WHERE tenant_id=${tenantId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);
    res.json(rows.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// ─── SUB-CONTRACTING / JOB WORK ──────────────────────────────────────────────

router.get("/job-work", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { status } = req.query;
    const rows = await db.execute(sql`
      SELECT jwo.*, v.vendor_name AS vendor_display_name
      FROM job_work_orders jwo
      LEFT JOIN vendors v ON v.id = jwo.vendor_id
      WHERE jwo.tenant_id = ${tenantId}
        AND (${status ?? null}::text IS NULL OR jwo.status = ${status ?? null})
      ORDER BY jwo.created_at DESC LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.post("/job-work", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { vendorId, vendorName, vendorGstin, productId, productName,
            plannedQty, ratePerUnit, gstRate, plannedReturnDate, notes } = req.body;
    if (!vendorId || !plannedQty) return res.status(400).json({ message: "vendorId and plannedQty required" });

    const cnt = await db.execute(sql`SELECT COUNT(*) AS c FROM job_work_orders WHERE tenant_id=${tenantId}`);
    const seq = Number((cnt.rows[0] as any).c) + 1;
    const jwNumber = `JW-${new Date().getFullYear()}-${String(seq).padStart(4,"0")}`;
    const totalValue = ratePerUnit && plannedQty ? Number(ratePerUnit) * Number(plannedQty) : null;

    const result = await db.execute(sql`
      INSERT INTO job_work_orders
        (tenant_id, jw_number, vendor_id, vendor_name, vendor_gstin, product_id, product_name,
         planned_qty, rate_per_unit, total_value, gst_rate, planned_return_date, notes, created_by)
      VALUES (${tenantId}, ${jwNumber}, ${vendorId}, ${vendorName ?? null}, ${vendorGstin ?? null},
              ${productId ?? null}, ${productName ?? null}, ${plannedQty}, ${ratePerUnit ?? null},
              ${totalValue}, ${gstRate ?? 18}, ${plannedReturnDate ?? null}, ${notes ?? null}, ${req.user?.id ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// Create outward / inward challan (57F)
router.post("/job-work/:id/challan", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { challanType, challanDate, quantitySent, quantityReceived,
            rawMaterialDetails, vehicleNumber, remarks } = req.body;
    if (!challanType) return res.status(400).json({ message: "challanType required (outward|inward)" });

    const jwo: any = (await db.execute(sql`SELECT * FROM job_work_orders WHERE id=${req.params.id} AND tenant_id=${tenantId}`)).rows[0];
    if (!jwo) return res.status(404).json({ message: "Job work order not found" });

    const cnt = await db.execute(sql`SELECT COUNT(*) AS c FROM job_work_challans WHERE tenant_id=${tenantId}`);
    const seq = Number((cnt.rows[0] as any).c) + 1;
    const fy = new Date().getFullYear();
    const challanNumber = `JWC/${fy}-${String(fy+1).slice(-2)}/${String(seq).padStart(3,"0")}`;

    const result = await db.execute(sql`
      INSERT INTO job_work_challans
        (tenant_id, challan_number, challan_type, job_work_order_id, challan_date,
         vendor_id, vendor_name, quantity_sent, quantity_received,
         raw_material_details, vehicle_number, remarks, created_by)
      VALUES (${tenantId}, ${challanNumber}, ${challanType}, ${req.params.id},
              ${challanDate ?? new Date().toISOString().slice(0,10)},
              ${jwo.vendor_id}, ${jwo.vendor_name},
              ${challanType==="outward" ? quantitySent ?? null : null},
              ${challanType==="inward" ? quantityReceived ?? null : null},
              ${rawMaterialDetails ? JSON.stringify(rawMaterialDetails) : null},
              ${vehicleNumber ?? null}, ${remarks ?? null}, ${req.user?.id ?? null})
      RETURNING *
    `);

    // Update job work order received qty and status on inward
    if (challanType === "inward" && quantityReceived) {
      await db.execute(sql`
        UPDATE job_work_orders SET
          received_qty = received_qty + ${Number(quantityReceived)},
          status = CASE WHEN received_qty + ${Number(quantityReceived)} >= planned_qty THEN 'completed' ELSE 'partially_received' END,
          actual_return_date = COALESCE(actual_return_date, CURRENT_DATE),
          updated_at = NOW()
        WHERE id = ${req.params.id} AND tenant_id = ${tenantId}
      `);
    } else if (challanType === "outward") {
      await db.execute(sql`UPDATE job_work_orders SET status='challan_sent', updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tenantId} AND status='open'`);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.get("/job-work/:id/challans", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await db.execute(sql`
      SELECT * FROM job_work_challans WHERE job_work_order_id=${req.params.id} AND tenant_id=${tenantId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// ─── E-WAY BILL ──────────────────────────────────────────────────────────────

router.get("/eway-bills", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { status, from, to } = req.query;
    const rows = await db.execute(sql`
      SELECT * FROM eway_bills
      WHERE tenant_id=${tenantId}
        AND (${status ?? null}::text IS NULL OR status=${status ?? null})
        AND (${from ?? null}::date IS NULL OR created_at::date >= ${from ?? null}::date)
        AND (${to ?? null}::date IS NULL OR created_at::date <= ${to ?? null}::date)
      ORDER BY created_at DESC LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// Generate E-Way Bill from gatepass
router.post("/eway-bills/generate", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { gatpassId, invoiceId, vehicleNumber, transporterName, transporterId,
            distanceKm, transportMode = "1", vehicleType = "R" } = req.body;
    if (!invoiceId) return res.status(400).json({ message: "invoiceId required" });

    // Fetch invoice + company details
    const invResult = await db.execute(sql`
      SELECT i.*, c.gstin AS company_gstin, c.name AS company_name,
             c.address AS company_address, c.pincode AS company_pincode, c.state AS company_state
      FROM invoices i
      LEFT JOIN companies c ON c.tenant_id = i.tenant_id
      WHERE i.id = ${invoiceId} AND i.tenant_id = ${tenantId}
      LIMIT 1
    `);
    if (!invResult.rows.length) return res.status(404).json({ message: "Invoice not found" });
    const inv = invResult.rows[0] as any;

    // Check threshold — EWB mandatory above ₹50,000
    if (Number(inv.total_amount) < 50000) {
      return res.status(400).json({ message: `Invoice value ₹${inv.total_amount} is below ₹50,000 EWB threshold` });
    }

    // Check if EWB already exists
    const existing = await db.execute(sql`
      SELECT id, ewb_number FROM eway_bills WHERE invoice_id=${invoiceId} AND tenant_id=${tenantId} AND status='generated' LIMIT 1
    `);
    if (existing.rows.length) {
      return res.status(409).json({ message: "E-Way Bill already generated", ewb: existing.rows[0] });
    }

    // Build NIC EWB payload
    const ewbPayload = {
      supplyType: "O",
      subSupplyType: "1",
      docType: "INV",
      docNo: inv.invoice_number,
      docDate: inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
      fromGstin: inv.company_gstin ?? "",
      fromTrdName: inv.company_name ?? "",
      fromAddr1: inv.company_address ?? "",
      fromPincode: inv.company_pincode ?? "",
      fromStateCode: inv.company_state ?? "36",
      toGstin: inv.buyer_gstin ?? "URP",
      toTrdName: inv.buyer_name ?? "",
      toAddr1: inv.ship_to_address ?? inv.buyer_address ?? "",
      toPincode: inv.ship_to_pincode ?? inv.buyer_pincode ?? "",
      toStateCode: inv.ship_to_state ?? inv.buyer_state ?? "36",
      totalValue: Number(inv.total_amount),
      cgstValue: Number(inv.cgst_amount ?? 0),
      sgstValue: Number(inv.sgst_amount ?? 0),
      igstValue: Number(inv.igst_amount ?? 0),
      transMode: transportMode,
      vehicleType,
      vehicleNo: vehicleNumber ?? "",
      transId: transporterId ?? "",
      transName: transporterName ?? "",
      transDocNo: "",
      transDocDate: "",
      actFromStateCode: inv.company_state ?? "36",
      actToStateCode: inv.ship_to_state ?? inv.buyer_state ?? "36",
      distance: distanceKm ?? 0,
    };

    // Store EWB record (pending — actual NIC API call requires credentials)
    const ewbRecord = await db.execute(sql`
      INSERT INTO eway_bills
        (tenant_id, gatepass_id, invoice_id, supply_type, sub_supply_type, doc_type,
         doc_number, doc_date, from_gstin, from_name, to_gstin, to_name, to_address,
         to_pincode, to_state_code, total_value, taxable_value, cgst, sgst, igst,
         transport_mode, vehicle_type, vehicle_number, transporter_id, transporter_name,
         distance_km, status, api_response, created_by)
      VALUES (${tenantId}, ${gatpassId ?? null}, ${invoiceId},
              'O', '1', 'INV', ${inv.invoice_number},
              ${inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)},
              ${inv.company_gstin ?? ""}, ${inv.company_name ?? ""},
              ${inv.buyer_gstin ?? "URP"}, ${inv.buyer_name ?? ""},
              ${inv.ship_to_address ?? inv.buyer_address ?? ""},
              ${inv.ship_to_pincode ?? inv.buyer_pincode ?? ""},
              ${inv.ship_to_state ?? inv.buyer_state ?? "36"},
              ${Number(inv.total_amount)}, ${Number(inv.taxable_amount ?? inv.total_amount ?? 0)},
              ${Number(inv.cgst_amount ?? 0)}, ${Number(inv.sgst_amount ?? 0)}, ${Number(inv.igst_amount ?? 0)},
              ${transportMode}, ${vehicleType}, ${vehicleNumber ?? null},
              ${transporterId ?? null}, ${transporterName ?? null}, ${distanceKm ?? null},
              'pending', ${JSON.stringify(ewbPayload)}, ${req.user?.id ?? null})
      RETURNING *
    `);

    // Call NIC EWB API — if credentials configured, submit live; otherwise return pending record
    let finalRecord = ewbRecord.rows[0] as any;
    let nicMessage = "E-Way Bill record saved (pending). Add NIC EWB credentials in Settings → GST to auto-submit.";
    let nicLive = false;

    try {
      const nicResult = await generateEWB(tenantId, ewbPayload);
      // Update DB record with real EWB number and validity
      const updated = await db.execute(sql`
        UPDATE eway_bills SET
          ewb_number = ${nicResult.ewbNo},
          ewb_date = ${nicResult.ewbDate ? new Date(nicResult.ewbDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)},
          ewb_valid_until = ${nicResult.validUpto ? new Date(nicResult.validUpto).toISOString().slice(0,10) : null},
          status = 'generated',
          api_response = ${JSON.stringify(nicResult.rawResponse)},
          updated_at = NOW()
        WHERE id = ${(ewbRecord.rows[0] as any).id}
        RETURNING *
      `);
      finalRecord = updated.rows[0];
      nicMessage = `E-Way Bill generated successfully. EWB No: ${nicResult.ewbNo}`;
      nicLive = true;
    } catch (nicErr: any) {
      // Credentials missing or NIC API error — keep record as pending, tell user why
      nicMessage = nicErr.message?.includes("not configured")
        ? "E-Way Bill record saved. Add NIC EWB credentials in Settings → GST to auto-submit to portal."
        : `NIC API error: ${nicErr.message}. EWB record saved as pending.`;
    }

    res.status(201).json({
      message: nicMessage,
      eway_bill: finalRecord,
      live: nicLive,
      nic_payload: ewbPayload,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to generate E-Way Bill" }); }
});

router.patch("/eway-bills/:id/cancel", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { cancelReason = 4, cancelRemarks = "Cancelled" } = req.body;

    // Fetch EWB to get ewb_number
    const ewbRow = await db.execute(sql`
      SELECT * FROM eway_bills WHERE id=${req.params.id} AND tenant_id=${tenantId} LIMIT 1
    `);
    if (!ewbRow.rows.length) return res.status(404).json({ message: "E-Way Bill not found" });
    const ewb = ewbRow.rows[0] as any;

    // If live EWB number exists, cancel on NIC portal first
    if (ewb.ewb_number && ewb.status === "generated") {
      try {
        await cancelEWB(tenantId, ewb.ewb_number, Number(cancelReason), cancelRemarks);
      } catch (nicErr: any) {
        // Log NIC error but still mark as cancelled locally
        console.error("NIC cancel error:", nicErr.message);
      }
    }

    const result = await db.execute(sql`
      UPDATE eway_bills SET status='cancelled', cancel_reason=${cancelReason},
        cancel_remarks=${cancelRemarks}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tenantId}
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to cancel E-Way Bill" }); }
});

router.get("/eway-bills/summary", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='generated') AS generated,
        COUNT(*) FILTER (WHERE status='pending') AS pending,
        COUNT(*) FILTER (WHERE status='cancelled') AS cancelled,
        COUNT(*) FILTER (WHERE status='expired') AS expired,
        COALESCE(SUM(total_value) FILTER (WHERE status='generated'), 0) AS total_value_covered
      FROM eway_bills WHERE tenant_id=${tenantId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);
    res.json(rows.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

// ─── NIC EWB Credentials (Settings → GST) ────────────────────────────────────

router.get("/eway-bills/credentials", requireRole("admin"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await db.execute(sql`
      SELECT gstin, username, api_mode,
        CASE WHEN auth_token IS NOT NULL THEN true ELSE false END AS is_connected,
        token_expiry
      FROM nic_ewb_credentials WHERE tenant_id = ${tenantId} LIMIT 1
    `);
    res.json(rows.rows[0] ?? { configured: false });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
});

router.post("/eway-bills/credentials", requireRole("admin"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { gstin, username, password, apiMode = "sandbox" } = req.body;
    if (!gstin || !username || !password) {
      return res.status(400).json({ message: "gstin, username and password are required" });
    }
    await db.execute(sql`
      INSERT INTO nic_ewb_credentials (tenant_id, gstin, username, password_enc, api_mode)
      VALUES (${tenantId}, ${gstin}, ${username}, ${password}, ${apiMode})
      ON CONFLICT (tenant_id) DO UPDATE SET
        gstin = ${gstin}, username = ${username}, password_enc = ${password},
        api_mode = ${apiMode}, auth_token = NULL, token_expiry = NULL, updated_at = NOW()
    `);
    // Test auth immediately
    try {
      const { getNicToken } = await import("./nic-ewb-client");
      await getNicToken(tenantId);
      res.json({ success: true, message: "NIC EWB credentials saved and authenticated successfully." });
    } catch (authErr: any) {
      res.json({ success: true, warning: `Credentials saved but auth test failed: ${authErr.message}` });
    }
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to save credentials" }); }
});

export default router;
