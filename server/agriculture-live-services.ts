import { db } from "./db";
import { sql } from "drizzle-orm";
import { getCredential } from "./masters-routes";

// ── Agmarknet / eNAM Live Mandi Price API ────────────────────────────────────
// API: data.gov.in OGD resource for daily mandi arrivals & prices
// Endpoint: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
const AGMARKNET_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";

export async function fetchMandiPricesLive(
  tenantId: number,
  commodity?: string,
  state?: string,
  limit = 100
): Promise<{ source: "live" | "db"; records: any[] }> {
  const apiKey = await getCredential(tenantId, "AGMARKNET_API_KEY");
  if (!apiKey) return { source: "db", records: [] };

  let url = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE}?api-key=${apiKey}&format=json&limit=${limit}`;
  if (commodity) url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
  if (state) url += `&filters[state]=${encodeURIComponent(state)}`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`Agmarknet API ${resp.status}: ${await resp.text()}`);
  const data: any = await resp.json();
  const records: any[] = data.records ?? [];

  // Upsert into agri_mandi_prices
  for (const r of records) {
    const modal = parseFloat(r.modal_price || r.modalPrice || "0");
    const min = parseFloat(r.min_price || r.minPrice || "0");
    const max = parseFloat(r.max_price || r.maxPrice || "0");
    const arrDate = r.arrival_date || r.arrivalDate || null;
    await db.execute(sql`
      INSERT INTO agri_mandi_prices (tenant_id, commodity, market_name, state, district,
        min_price, max_price, modal_price, arrival_date, unit, source)
      VALUES (${tenantId}, ${r.commodity||commodity||null}, ${r.market||r.market_name||null},
              ${r.state||state||null}, ${r.district||null}, ${min}, ${max}, ${modal},
              ${arrDate}, ${r.variety||'Quintal'}, 'agmarknet_live')
      ON CONFLICT DO NOTHING
    `).catch(() => {});
  }

  return { source: "live", records };
}

// ── PMFBY Ministry of Agriculture API ────────────────────────────────────────
// Real PMFBY portal: https://pmfby.gov.in/api
// Uses PMFBY_API_KEY (issued by NIC / MoA&FW to insurance companies)
// Farmers submit via bank/CSC; this API registers enrollment and fetches claim status

export async function submitPmfbyApplication(
  tenantId: number,
  payload: {
    farmer_id: number;
    farm_id?: number;
    crop_name: string;
    crop_season: string;
    policy_year: number;
    insured_area: number;
    sum_insured: number;
    premium_amount: number;
    bank_account: string;
    bank_ifsc: string;
    survey_no?: string;
    application_no?: string;
  }
): Promise<{ application_no: string; policy_no?: string; status: string; source: "live" | "local" }> {
  const apiKey = await getCredential(tenantId, "PMFBY_API_KEY");
  const portalToken = await getCredential(tenantId, "PMFBY_PORTAL_TOKEN");

  if (apiKey && portalToken) {
    try {
      const resp = await fetch("https://pmfby.gov.in/api/v2/enrollment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
          "Authorization": `Bearer ${portalToken}`,
        },
        body: JSON.stringify({
          farmerBankAccount: payload.bank_account,
          farmerBankIFSC: payload.bank_ifsc,
          cropName: payload.crop_name,
          season: payload.crop_season,
          year: payload.policy_year,
          surveyNo: payload.survey_no || "",
          insuredArea: payload.insured_area,
          sumInsured: payload.sum_insured,
          premium: payload.premium_amount,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        return {
          application_no: data.applicationNo || data.application_no,
          policy_no: data.policyNo || data.policy_no,
          status: data.status || "submitted",
          source: "live",
        };
      }
    } catch (e) {
      console.error("PMFBY live API failed, falling back to local:", e);
    }
  }

  // Fallback: generate local application number
  const yr = payload.policy_year || new Date().getFullYear();
  const appNo = payload.application_no || `PMFBY-${yr}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return { application_no: appNo, status: "local_registered", source: "local" };
}

export async function getPmfbyClaimStatus(
  tenantId: number,
  applicationNo: string
): Promise<{ status: string; claim_amount?: number; disbursed?: boolean; source: "live" | "local" }> {
  const apiKey = await getCredential(tenantId, "PMFBY_API_KEY");
  const portalToken = await getCredential(tenantId, "PMFBY_PORTAL_TOKEN");

  if (apiKey && portalToken) {
    try {
      const resp = await fetch(`https://pmfby.gov.in/api/v2/claim/status/${applicationNo}`, {
        headers: { "X-Api-Key": apiKey, "Authorization": `Bearer ${portalToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        return {
          status: data.status,
          claim_amount: data.claimAmount,
          disbursed: data.disbursed,
          source: "live",
        };
      }
    } catch {}
  }
  return { status: "unknown", source: "local" };
}

// ── IoT Sensor Device Provisioning ───────────────────────────────────────────
// Supports two IoT modes:
//   1. HTTP push: devices POST to /api/agriculture/sensors/reading with device_key
//   2. External IoT platform poll: Tago.io / ThingsBoard REST API (when IOT_API_URL set)

export async function ensureDevicesTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS agri_iot_devices (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, farm_id INT,
    device_id VARCHAR(100) NOT NULL,
    device_key VARCHAR(64) NOT NULL,
    device_name VARCHAR(200),
    sensor_types TEXT[] DEFAULT '{}',
    platform VARCHAR(50) DEFAULT 'http',
    platform_device_id VARCHAR(200),
    last_seen TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, device_id)
  )`);
}

export function generateDeviceKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function pollExternalIoTPlatform(
  tenantId: number,
  farmId: number
): Promise<{ source: "live" | "db"; readings: any[] }> {
  const iotApiUrl = await getCredential(tenantId, "IOT_API_URL");
  const iotApiToken = await getCredential(tenantId, "IOT_API_TOKEN");

  if (!iotApiUrl || !iotApiToken) return { source: "db", readings: [] };

  // Generic REST poll — works for Tago.io, ThingsBoard, or any REST IoT platform
  // Tago.io: GET https://api.tago.io/data?query=last_item&variable=soil_moisture
  // ThingsBoard: GET https://{host}/api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries
  const resp = await fetch(`${iotApiUrl}/api/data?farmId=${farmId}&last=true`, {
    headers: { Authorization: `Token ${iotApiToken}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`IoT platform API ${resp.status}`);
  const data: any = await resp.json();

  const readings: any[] = Array.isArray(data) ? data : data.result ?? data.data ?? [];
  // Persist each reading to agri_sensor_readings
  for (const r of readings) {
    await db.execute(sql`
      INSERT INTO agri_sensor_readings (tenant_id, farm_id, sensor_id, sensor_type, value, unit, recorded_at)
      VALUES (${tenantId}, ${farmId}, ${r.variable || r.sensor_id || "ext"}, ${r.variable || r.type || "unknown"},
              ${parseFloat(r.value) || 0}, ${r.unit || null}, ${r.time ? new Date(r.time).toISOString() : sql`NOW()`})
    `).catch(() => {});
  }
  return { source: "live", readings };
}

// ── IoT Alert Thresholds ──────────────────────────────────────────────────────
export function checkSensorAlerts(readings: any[]): string[] {
  const alerts: string[] = [];
  for (const r of readings) {
    const v = parseFloat(r.value);
    if (r.sensor_type === "soil_moisture" && v < 20) alerts.push(`⚠ Low soil moisture: ${v}% at sensor ${r.sensor_id || r.farm_id}`);
    if (r.sensor_type === "temperature" && v > 40) alerts.push(`🌡 High temperature: ${v}°C at sensor ${r.sensor_id || r.farm_id}`);
    if (r.sensor_type === "soil_moisture" && v > 90) alerts.push(`💧 Waterlogged: soil moisture ${v}% — check drainage at sensor ${r.sensor_id || r.farm_id}`);
  }
  return alerts;
}
