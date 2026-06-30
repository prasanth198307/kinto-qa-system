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

// Generate E-Way Bill — accepts direct form fields OR legacy invoiceId
router.post("/eway-bills/generate", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const b = req.body;

    // ── Validate mandatory NIC fields ──────────────────────────────────────────
    if (!b.docNo) return res.status(400).json({ message: "Document number (docNo) is required" });
    if (!b.fromGstin) return res.status(400).json({ message: "Consignor GSTIN (fromGstin) is required" });
    if (!b.fromAddr1 || !b.fromPlace || !b.fromPincode) return res.status(400).json({ message: "Consignor address fields are required" });
    if (!b.toTrdName || !b.toAddr1 || !b.toPlace || !b.toPincode) return res.status(400).json({ message: "Consignee name and address fields are required" });
    // URP: if no GSTIN provided, set URP
    const toGstin = (!b.toGstin || b.toGstin === "URP") ? "URP" : b.toGstin;

    // Format docDate as DD/MM/YYYY for NIC (NIC expects this format)
    const docDateFmt = b.docDate
      ? new Date(b.docDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
      : new Date().toLocaleDateString("en-IN");

    // Compute GST amounts from rates + taxable value (if amounts not provided directly)
    const taxableValue = Number(b.taxableValue ?? 0);
    const isInterState = b.fromStateCode !== b.toStateCode;
    const cgstRate = Number(b.cgstRate ?? 0);
    const sgstRate = Number(b.sgstRate ?? cgstRate); // SGST = CGST for intrastate
    const igstRate = Number(b.igstRate ?? (isInterState ? cgstRate * 2 : 0));

    const cgstValue = isInterState ? 0 : +(taxableValue * cgstRate / 100).toFixed(2);
    const sgstValue = isInterState ? 0 : +(taxableValue * sgstRate / 100).toFixed(2);
    const igstValue = isInterState ? +(taxableValue * igstRate / 100).toFixed(2) : 0;
    const cessValue = +(taxableValue * Number(b.cessRate ?? 0) / 100).toFixed(2);
    const totalValue = Number(b.totalInvoiceValue ?? (taxableValue + cgstValue + sgstValue + igstValue + cessValue));

    // Build NIC-compliant EWB payload
    const ewbPayload: Record<string, any> = {
      supplyType: b.supplyType ?? "O",
      subSupplyType: b.subSupplyType ?? "1",
      docType: b.docType ?? "INV",
      docNo: b.docNo,
      docDate: docDateFmt,
      // Consignor (From)
      fromGstin: b.fromGstin,
      fromTrdName: b.fromTrdName ?? "",
      fromAddr1: b.fromAddr1,
      fromAddr2: b.fromAddr2 ?? "",
      fromPlace: b.fromPlace,
      fromPincode: String(b.fromPincode),
      fromStateCode: String(b.fromStateCode ?? "36"),
      // Consignee (To)
      toGstin,
      toTrdName: b.toTrdName ?? "",
      toAddr1: b.toAddr1,
      toAddr2: b.toAddr2 ?? "",
      toPlace: b.toPlace,
      toPincode: String(b.toPincode),
      toStateCode: String(b.toStateCode ?? "36"),
      // Goods
      productName: b.productName ?? "",
      productDesc: b.productName ?? "",
      hsnCode: b.hsnCode ?? "",
      quantity: Number(b.quantity ?? 1),
      qtyUnit: b.qtyUnit ?? "NOS",
      taxableAmount: taxableValue,
      sgstRate: isInterState ? 0 : sgstRate,
      cgstRate: isInterState ? 0 : cgstRate,
      igstRate: isInterState ? igstRate : 0,
      cessRate: Number(b.cessRate ?? 0),
      cessNonAdvolRate: 0,
      // Values
      totalValue,
      cgstValue,
      sgstValue,
      igstValue,
      cessValue,
      totInvVal: totalValue,
      // Transport
      transMode: String(b.transMode ?? "1"),
      vehicleType: b.vehicleType ?? "R",
      vehicleNo: b.vehicleNo ?? "",
      transId: b.transId ?? "",
      transName: b.transName ?? "",
      transDocNo: b.transDocNo ?? "",
      transDocDate: b.transDocDate ?? "",
      actFromStateCode: String(b.fromStateCode ?? "36"),
      actToStateCode: String(b.toStateCode ?? "36"),
      distance: Number(b.distanceKm ?? 0),
    };

    // Store EWB record (pending — actual NIC API call requires credentials)
    const ewbRecord = await db.execute(sql`
      INSERT INTO eway_bills
        (tenant_id, invoice_id, supply_type, sub_supply_type, doc_type,
         doc_number, doc_date, from_gstin, from_name, from_address, from_pincode, from_state_code,
         to_gstin, to_name, to_address, to_pincode, to_state_code,
         total_value, taxable_value, cgst, sgst, igst,
         transport_mode, vehicle_type, vehicle_number, transporter_id, transporter_name,
         distance_km, status, api_response, created_by)
      VALUES (${tenantId}, ${b.invoiceId ?? null},
              ${ewbPayload.supplyType}, ${ewbPayload.subSupplyType}, ${ewbPayload.docType},
              ${b.docNo}, ${b.docDate ? new Date(b.docDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)},
              ${b.fromGstin}, ${b.fromTrdName ?? ""}, ${b.fromAddr1}, ${String(b.fromPincode)}, ${String(b.fromStateCode ?? "36")},
              ${toGstin}, ${b.toTrdName ?? ""}, ${b.toAddr1}, ${String(b.toPincode)}, ${String(b.toStateCode ?? "36")},
              ${totalValue}, ${taxableValue},
              ${cgstValue}, ${sgstValue}, ${igstValue},
              ${String(b.transMode ?? "1")}, ${b.vehicleType ?? "R"}, ${b.vehicleNo ?? null},
              ${b.transId ?? null}, ${b.transName ?? null}, ${Number(b.distanceKm ?? 0)},
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

// Fetch invoice data for EWB pre-fill
router.get("/eway-bills/invoice-prefill/:invoiceId", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const { invoiceId } = req.params;

    const invRes = await db.execute(sql`
      SELECT i.*,
             t.gst_number AS tenant_gstin, t.name AS tenant_name, t.address AS tenant_address
      FROM invoices i
      LEFT JOIN tenants t ON t.id = ${tenantId}
      WHERE i.id = ${invoiceId} AND i.tenant_id = ${tenantId}
      LIMIT 1
    `);
    if (!invRes.rows.length) return res.status(404).json({ message: "Invoice not found" });
    const inv = invRes.rows[0] as any;

    // Fetch first item for HSN/product/rate details
    const itemRes = await db.execute(sql`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      LEFT JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ${invoiceId} AND ii.tenant_id = ${tenantId}
      ORDER BY ii.id LIMIT 1
    `);
    const item = itemRes.rows[0] as any;

    res.json({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      // Consignor (From) — seller details
      from_gstin: inv.seller_gstin ?? inv.tenant_gstin ?? "",
      from_name: inv.seller_name ?? inv.tenant_name ?? "",
      from_addr1: inv.seller_address ?? inv.tenant_address ?? "",
      from_place: "", // not stored separately — user fills
      from_pincode: "", // not stored separately — user fills
      from_state_code: inv.seller_state_code ?? "36",
      // Consignee (To) — buyer/ship-to details
      to_gstin: inv.buyer_gstin ?? "",
      to_name: inv.ship_to_name ?? inv.buyer_name ?? "",
      to_addr1: inv.ship_to_address ?? inv.buyer_address ?? "",
      to_place: inv.ship_to_city ?? "",
      to_pincode: inv.ship_to_pincode ?? "",
      to_state_code: inv.buyer_state_code ?? "36",
      // Goods (from first invoice item)
      product_name: item?.product_name ?? item?.description ?? "",
      hsn_code: item?.hsn_code ?? "",
      quantity: item?.quantity ?? 1,
      qty_unit: "NOS",
      taxable_value: Number(inv.subtotal ?? 0),
      cgst_rate: item?.cgst_rate ?? "9",
      sgst_rate: item?.sgst_rate ?? "9",
      igst_rate: item?.igst_rate ?? "0",
      cess_rate: item?.cess_rate ?? "0",
      total_invoice_value: Number(inv.total_amount ?? 0),
      // Transport (if already filled on invoice)
      transport_mode: inv.transport_mode ?? "1",
      vehicle_no: inv.vehicle_number ?? "",
    });
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed to fetch invoice" }); }
});

// List invoices for EWB picker (search by invoice number)
router.get("/eway-bills/invoices-search", auth, async (req: any, res) => {
  try {
    const tenantId = getTenantId(req);
    const q = req.query.q ? `%${req.query.q}%` : "%";
    const rows = await db.execute(sql`
      SELECT id, invoice_number, invoice_date, buyer_name, total_amount, eway_bill_number
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND record_status != 'deleted'
        AND (invoice_number ILIKE ${q} OR buyer_name ILIKE ${q})
        AND total_amount >= 50000
      ORDER BY invoice_date DESC LIMIT 30
    `);
    res.json(rows.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: "Failed" }); }
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
