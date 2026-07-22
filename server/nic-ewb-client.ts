/**
 * NIC E-Way Bill API client
 * Docs: https://einvoice1.gst.gov.in/Documents/eWayBillAPI.pdf
 *
 * Sandbox base URL : https://einvoice1-trail.nic.in/EWB/ewayapi
 * Production base URL: https://einvoice1.gst.gov.in/EWB/ewayapi
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

const SANDBOX_URL = "https://einvoice1-trail.nic.in/EWB/ewayapi";
const PROD_URL    = "https://einvoice1.gst.gov.in/EWB/ewayapi";

function getBaseUrl(mode: string) {
  return mode === "production" ? PROD_URL : SANDBOX_URL;
}

// ─── Auth token (cached in DB, refresh when expired) ──────────────────────────

export async function getNicToken(tenantId: number): Promise<{ token: string; gstin: string; baseUrl: string }> {
  const credRows = await db.execute(sql`
    SELECT gstin, username, password_enc, api_mode, auth_token, token_expiry
    FROM nic_ewb_credentials
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `);

  if (!credRows.rows.length) {
    throw new Error("NIC EWB credentials not configured. Go to Settings → GST/E-Way Bill to add credentials.");
  }

  const cred = credRows.rows[0] as any;
  const baseUrl = getBaseUrl(cred.api_mode ?? "sandbox");

  // Return cached token if still valid (5 min buffer)
  if (cred.auth_token && cred.token_expiry) {
    const expiry = new Date(cred.token_expiry);
    if (expiry.getTime() - Date.now() > 5 * 60 * 1000) {
      return { token: cred.auth_token, gstin: cred.gstin, baseUrl };
    }
  }

  // Request new token from NIC
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Gstin": cred.gstin },
    body: JSON.stringify({
      action: "ACCESSTOKEN",
      username: cred.username,
      password: cred.password_enc, // stored as plain text (operator's responsibility to secure DB)
      app_key: cred.gstin,         // some GSPs use app_key = GSTIN
    }),
  });

  const data = await res.json() as any;

  if (!data.authToken && !data.AuthToken) {
    throw new Error(`NIC auth failed: ${data.message || data.errorMessage || JSON.stringify(data)}`);
  }

  const token = data.authToken ?? data.AuthToken;
  // NIC tokens typically expire in 6 hours
  const expiry = new Date(Date.now() + 6 * 60 * 60 * 1000);

  await db.execute(sql`
    UPDATE nic_ewb_credentials
    SET auth_token = ${token}, token_expiry = ${expiry.toISOString()}, updated_at = NOW()
    WHERE tenant_id = ${tenantId}
  `);

  return { token, gstin: cred.gstin, baseUrl };
}

// ─── Generate E-Way Bill ───────────────────────────────────────────────────────

export async function generateEWB(tenantId: number, payload: Record<string, any>) {
  const { token, gstin, baseUrl } = await getNicToken(tenantId);

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Gstin": gstin,
      "authtoken": token,
    },
    body: JSON.stringify({ action: "GENWB", ...payload }),
  });

  const data = await res.json() as any;

  if (data.status === "0" || data.errorCodes) {
    throw new Error(`NIC EWB generation failed: ${data.message ?? data.errorMessage ?? JSON.stringify(data)}`);
  }

  return {
    ewbNo: data.ewbNo ?? data.EwbNo ?? data.eway_bill_number,
    ewbDate: data.ewbDate ?? data.EwbDate ?? new Date().toISOString(),
    validUpto: data.validUpto ?? data.ValidUpto,
    status: "generated",
    rawResponse: data,
  };
}

// ─── Cancel E-Way Bill ─────────────────────────────────────────────────────────

export async function cancelEWB(tenantId: number, ewbNo: string, cancelReason: number, cancelRemarks: string) {
  const { token, gstin, baseUrl } = await getNicToken(tenantId);

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Gstin": gstin,
      "authtoken": token,
    },
    body: JSON.stringify({
      action: "CANEWB",
      ewbNo,
      cancelRsnCode: cancelReason, // 1=Duplicate, 2=Order Cancelled, 3=Data Entry Mistake, 4=Others
      cancelRmrk: cancelRemarks,
    }),
  });

  const data = await res.json() as any;

  if (data.status === "0" || data.errorCodes) {
    throw new Error(`NIC EWB cancel failed: ${data.message ?? JSON.stringify(data)}`);
  }

  return { cancelDate: data.cancelDate ?? new Date().toISOString(), rawResponse: data };
}

// ─── Extend E-Way Bill validity ────────────────────────────────────────────────

export async function extendEWB(tenantId: number, ewbNo: string, vehicleNo: string, fromPlace: string, fromState: number, remainingDistance: number, transMode: string) {
  const { token, gstin, baseUrl } = await getNicToken(tenantId);

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Gstin": gstin,
      "authtoken": token,
    },
    body: JSON.stringify({
      action: "EXTENDVALIDITY",
      ewbNo,
      vehicleNo,
      fromPlace,
      fromState,
      remainingDistance,
      transMode,
      extnRsnCode: 5,  // 1=Natural Calamity, 2=Law and Order, 3=Transhipment, 4=Accident, 5=Others
      extnRemarks: "Validity extension",
      consignmentStatus: "M", // M=In Movement, T=In Transit
    }),
  });

  const data = await res.json() as any;

  if (data.status === "0" || data.errorCodes) {
    throw new Error(`NIC EWB extend failed: ${data.message ?? JSON.stringify(data)}`);
  }

  return { newValidUpto: data.validUpto ?? data.ValidUpto, rawResponse: data };
}
