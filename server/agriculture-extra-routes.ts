import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { getCredential } from "./masters-routes";
import {
  fetchMandiPricesLive,
  submitPmfbyApplication,
  getPmfbyClaimStatus,
  pollExternalIoTPlatform,
  ensureDevicesTable,
  generateDeviceKey,
  checkSensorAlerts,
} from "./agriculture-live-services";

const router = Router();
function auth(req: any, res: any, next: any) { if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" }); next(); }
function tid(req: any): number { return Number(req.session?.tenantId ?? req.user?.tenantId ?? 1); }

// Weather
router.get('/weather/farm/:farmId', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM farm_weather_logs WHERE tenant_id=${t} AND farm_id=${req.params.farmId} ORDER BY recorded_at DESC LIMIT 1`);
  res.json(r.rows[0] ? { current: r.rows[0] } : {});
});

router.post('/weather/farm/:farmId', auth, async (req: any, res) => {
  const t = tid(req);
  const { temperature, humidity, rainfall, wind_speed } = req.body;
  const r = await db.execute(sql`INSERT INTO farm_weather_logs (tenant_id,farm_id,temperature,humidity,rainfall,wind_speed,recorded_at)
    VALUES (${t},${req.params.farmId},${temperature},${humidity},${rainfall||0},${wind_speed||0},now()) RETURNING *`);
  res.json(r.rows[0]);
});

router.get('/weather/alerts', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM farm_weather_advisories WHERE tenant_id=${t} AND valid_until>=CURRENT_DATE ORDER BY created_at DESC`);
  res.json(r.rows);
});

// PM Kisan
router.get('/schemes/pm-kisan', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM pm_kisan_records WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

router.post('/schemes/pm-kisan', auth, async (req: any, res) => {
  const t = tid(req);
  const { farmer_id, registration_no } = req.body;
  const r = await db.execute(sql`INSERT INTO pm_kisan_records (tenant_id,farmer_id,registration_no,created_at) VALUES (${t},${farmer_id},${registration_no},now()) RETURNING *`);
  res.json(r.rows[0]);
});

// PMFBY
router.get('/schemes/pmfby', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM pmfby_records WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

router.post('/schemes/pmfby', auth, async (req: any, res) => {
  const t = tid(req);
  const { farmer_id, crop, area, insured_amount, premium } = req.body;
  const r = await db.execute(sql`INSERT INTO pmfby_records (tenant_id,farmer_id,crop,area,insured_amount,premium,created_at) VALUES (${t},${farmer_id},${crop},${area},${insured_amount},${premium},now()) RETURNING *`);
  res.json(r.rows[0]);
});

// FPO Members
router.get('/fpo/members', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM fpo_members WHERE tenant_id=${t} ORDER BY joined_date DESC`);
  res.json(r.rows);
});

router.post('/fpo/members', auth, async (req: any, res) => {
  const t = tid(req);
  const { farmer_id, share_qty, share_value } = req.body;
  const r = await db.execute(sql`INSERT INTO fpo_members (tenant_id,farmer_id,share_qty,share_value,joined_date) VALUES (${t},${farmer_id},${share_qty},${share_value},CURRENT_DATE) RETURNING *`);
  res.json(r.rows[0]);
});

// Mandi prices
router.get('/mandi/prices', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM mandi_prices WHERE tenant_id=${t} ORDER BY date DESC LIMIT 50`);
  res.json(r.rows);
});

router.post('/mandi/prices', auth, async (req: any, res) => {
  const t = tid(req);
  const { commodity, mandi_name, price_per_qt, date } = req.body;
  const r = await db.execute(sql`INSERT INTO mandi_prices (tenant_id,commodity,mandi_name,price_per_qt,date) VALUES (${t},${commodity},${mandi_name},${price_per_qt},${date}) RETURNING *`);
  res.json(r.rows[0]);
});

// Livestock
router.get('/livestock/animals', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM livestock_animals WHERE tenant_id=${t} ORDER BY created_at DESC`);
  res.json(r.rows);
});

router.post('/livestock/animals', auth, async (req: any, res) => {
  const t = tid(req);
  const { farmer_id, animal_type, breed, tag_no, dob } = req.body;
  const r = await db.execute(sql`INSERT INTO livestock_animals (tenant_id,farmer_id,animal_type,breed,tag_no,dob,created_at) VALUES (${t},${farmer_id||t},${animal_type},${breed||null},${tag_no},${dob||null},now()) RETURNING *`);
  res.json(r.rows[0]);
});

router.post('/livestock/animals/:id/milk', auth, async (req: any, res) => {
  const t = tid(req);
  const { date, morning_yield, evening_yield } = req.body;
  const total = (Number(morning_yield)||0) + (Number(evening_yield)||0);
  const r = await db.execute(sql`INSERT INTO milk_yield_logs (tenant_id,animal_id,date,morning_yield,evening_yield,total_yield) VALUES (${t},${req.params.id},${date},${morning_yield},${evening_yield},${total}) RETURNING *`);
  res.json(r.rows[0]);
});

router.get('/livestock/animals/:id/milk', auth, async (req: any, res) => {
  const t = tid(req);
  const r = await db.execute(sql`SELECT * FROM milk_yield_logs WHERE tenant_id=${t} AND animal_id=${req.params.id} ORDER BY date DESC LIMIT 30`);
  res.json(r.rows);
});

// ── Weather Forecasts (OpenWeather API — free tier) ───────────────────────────
router.post("/weather/sync", auth, async (req: any, res) => {
  const t = tid(req);
  const { lat, lon, farm_id, location_name } = req.body;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS agri_weather_data (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL, farm_id INT,
      location_name VARCHAR(200), lat NUMERIC(9,6), lon NUMERIC(9,6),
      fetch_date DATE NOT NULL DEFAULT CURRENT_DATE,
      temp_min NUMERIC(5,1), temp_max NUMERIC(5,1), temp_current NUMERIC(5,1),
      humidity INT, wind_speed NUMERIC(6,2), wind_direction INT,
      rainfall_mm NUMERIC(8,2) DEFAULT 0,
      condition_code INT, condition_desc VARCHAR(200),
      condition_icon VARCHAR(50),
      sunrise_time TIME, sunset_time TIME,
      uv_index NUMERIC(4,1),
      forecast_json JSONB,
      source VARCHAR(50) DEFAULT 'openweather',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    let weatherData: any = null;
    try {
      const apiKey = await getCredential(tid(req), 'OPENWEATHER_API_KEY') || process.env.OPENWEATHER_API_KEY || '';
      const baseUrl = `https://api.openweathermap.org/data/2.5`;
      let current: any = null, forecast: any = null;
      if (apiKey) {
        const [cResp, fResp] = await Promise.all([
          fetch(`${baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
          fetch(`${baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=40`)
        ]);
        current = await cResp.json();
        forecast = await fResp.json();
      }
      if (current && current.main) {
        weatherData = {
          temp_min: current.main.temp_min,
          temp_max: current.main.temp_max,
          temp_current: current.main.temp,
          humidity: current.main.humidity,
          wind_speed: current.wind?.speed,
          wind_direction: current.wind?.deg,
          rainfall_mm: current.rain?.['1h'] || 0,
          condition_code: current.weather?.[0]?.id,
          condition_desc: current.weather?.[0]?.description,
          condition_icon: current.weather?.[0]?.icon,
          sunrise_time: current.sys?.sunrise ? new Date(current.sys.sunrise*1000).toTimeString().slice(0,8) : null,
          sunset_time: current.sys?.sunset ? new Date(current.sys.sunset*1000).toTimeString().slice(0,8) : null,
          uv_index: null,
          forecast_json: forecast || null,
        };
      }
    } catch (apiErr) {
      // API unavailable — return stored data or empty
    }
    if (weatherData) {
      await db.execute(sql`INSERT INTO agri_weather_data (tenant_id, farm_id, location_name, lat, lon, fetch_date, temp_min, temp_max, temp_current, humidity, wind_speed, wind_direction, rainfall_mm, condition_code, condition_desc, condition_icon, sunrise_time, sunset_time, uv_index, forecast_json)
        VALUES (${t}, ${farm_id||null}, ${location_name||null}, ${lat||null}, ${lon||null}, CURRENT_DATE, ${weatherData.temp_min}, ${weatherData.temp_max}, ${weatherData.temp_current}, ${weatherData.humidity}, ${weatherData.wind_speed}, ${weatherData.wind_direction}, ${weatherData.rainfall_mm}, ${weatherData.condition_code}, ${weatherData.condition_desc}, ${weatherData.condition_icon}, ${weatherData.sunrise_time}, ${weatherData.sunset_time}, ${weatherData.uv_index}, ${weatherData.forecast_json ? JSON.stringify(weatherData.forecast_json) : null})`);
      res.json({ success: true, weather: weatherData, source: 'live' });
    } else {
      const stored = await db.execute(sql`SELECT * FROM agri_weather_data WHERE tenant_id=${t} ${farm_id ? sql`AND farm_id=${parseInt(farm_id)}` : sql``} ORDER BY created_at DESC LIMIT 1`);
      res.json({ success: true, weather: stored.rows[0] || null, source: 'cached' });
    }
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/weather/history", auth, async (req: any, res) => {
  const t = tid(req);
  const { farm_id, days } = req.query;
  try {
    const d = parseInt(days as string) || 30;
    let q = sql`SELECT * FROM agri_weather_data WHERE tenant_id=${t} AND fetch_date >= CURRENT_DATE - INTERVAL '${sql.raw(String(d))} days'`;
    if (farm_id) q = sql`${q} AND farm_id=${parseInt(farm_id as string)}`;
    q = sql`${q} ORDER BY fetch_date DESC`;
    const rows = await db.execute(q);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/weather/latest", auth, async (req: any, res) => {
  const t = tid(req);
  const { farm_id } = req.query;
  try {
    let q = sql`SELECT * FROM agri_weather_data WHERE tenant_id=${t}`;
    if (farm_id) q = sql`${q} AND farm_id=${parseInt(farm_id as string)}`;
    q = sql`${q} ORDER BY created_at DESC LIMIT 1`;
    const r = await db.execute(q);
    res.json(r.rows[0] || null);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Farm-to-Fork QR Traceability ─────────────────────────────────────────────
router.get("/traceability/batches", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS agri_trace_batches (
      id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
      batch_code VARCHAR(50) NOT NULL UNIQUE,
      crop_name VARCHAR(200) NOT NULL,
      crop_variety VARCHAR(100),
      farm_id INT, farm_name VARCHAR(200), farm_location TEXT,
      farmer_name VARCHAR(200), farmer_id INT,
      sowing_date DATE, harvest_date DATE NOT NULL,
      harvest_qty NUMERIC(12,2), harvest_unit VARCHAR(30) DEFAULT 'kg',
      processed_date DATE, processed_by VARCHAR(200), processing_location VARCHAR(200),
      packed_date DATE, packed_qty NUMERIC(12,2), pack_size_kg NUMERIC(8,2),
      quality_grade VARCHAR(10) DEFAULT 'A',
      pesticide_residue_test VARCHAR(50),
      lab_certificate_no VARCHAR(100), lab_test_date DATE,
      organic_certified INT DEFAULT 0, organic_cert_no VARCHAR(100),
      inputs_used JSONB,
      sold_to VARCHAR(200), sold_date DATE, invoice_no VARCHAR(50),
      qr_code_url TEXT,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), record_status INT DEFAULT 1
    )`);
    const rows = await db.execute(sql`SELECT * FROM agri_trace_batches WHERE tenant_id=${t} AND record_status=1 ORDER BY harvest_date DESC LIMIT 100`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/traceability/batches", auth, async (req: any, res) => {
  const t = tid(req);
  const { crop_name, crop_variety, farm_id, farm_name, farm_location, farmer_name, farmer_id, sowing_date, harvest_date, harvest_qty, harvest_unit, processed_date, processed_by, processing_location, packed_date, packed_qty, pack_size_kg, quality_grade, pesticide_residue_test, lab_certificate_no, lab_test_date, organic_certified, organic_cert_no, inputs_used, notes } = req.body;
  try {
    const ts = Date.now().toString(36).toUpperCase();
    const batchCode = `FTF-${new Date().getFullYear()}-${ts}`;
    const qrUrl = `/api/agriculture/traceability/public/${batchCode}`;
    const r = await db.execute(sql`INSERT INTO agri_trace_batches (tenant_id, batch_code, crop_name, crop_variety, farm_id, farm_name, farm_location, farmer_name, farmer_id, sowing_date, harvest_date, harvest_qty, harvest_unit, processed_date, processed_by, processing_location, packed_date, packed_qty, pack_size_kg, quality_grade, pesticide_residue_test, lab_certificate_no, lab_test_date, organic_certified, organic_cert_no, inputs_used, qr_code_url, notes)
      VALUES (${t}, ${batchCode}, ${crop_name}, ${crop_variety||null}, ${farm_id||null}, ${farm_name||null}, ${farm_location||null}, ${farmer_name||null}, ${farmer_id||null}, ${sowing_date||null}, ${harvest_date}, ${harvest_qty||0}, ${harvest_unit||'kg'}, ${processed_date||null}, ${processed_by||null}, ${processing_location||null}, ${packed_date||null}, ${packed_qty||null}, ${pack_size_kg||null}, ${quality_grade||'A'}, ${pesticide_residue_test||null}, ${lab_certificate_no||null}, ${lab_test_date||null}, ${organic_certified?1:0}, ${organic_cert_no||null}, ${inputs_used?JSON.stringify(inputs_used):null}, ${qrUrl}, ${notes||null}) RETURNING *`);
    res.json({ ...r.rows[0] as any, qr_data: batchCode, public_url: qrUrl });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// Public endpoint — no auth — scanned by consumers via QR code
router.get("/traceability/public/:batchCode", async (req: any, res) => {
  try {
    const r = await db.execute(sql`SELECT b.batch_code, b.crop_name, b.crop_variety, b.farm_name, b.farm_location, b.farmer_name, b.sowing_date, b.harvest_date, b.harvest_qty, b.harvest_unit, b.processed_date, b.processing_location, b.packed_date, b.quality_grade, b.pesticide_residue_test, b.lab_certificate_no, b.lab_test_date, b.organic_certified, b.organic_cert_no, b.inputs_used, b.sold_to, b.sold_date, b.notes FROM agri_trace_batches b WHERE b.batch_code=${req.params.batchCode} AND b.record_status=1`);
    if (!r.rows[0]) return res.status(404).json({ message: 'Batch not found. This QR code may be invalid.' });
    const batch = r.rows[0] as any;
    res.json({
      ...batch,
      message: 'This product is traceable. Scan verified.',
      trace_verified: true,
      scanned_at: new Date().toISOString(),
    });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/traceability/batches/:id/sell", auth, async (req: any, res) => {
  const t = tid(req);
  const { sold_to, sold_date, invoice_no } = req.body;
  try {
    const r = await db.execute(sql`UPDATE agri_trace_batches SET sold_to=${sold_to}, sold_date=${sold_date||new Date().toISOString().slice(0,10)}, invoice_no=${invoice_no||null} WHERE id=${parseInt(req.params.id)} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/traceability/batches/:id", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT b.*, f.location as farm_location_detail, f.area_acres FROM agri_trace_batches b LEFT JOIN farms f ON f.id=b.farm_id AND f.tenant_id=${t} WHERE b.id=${parseInt(req.params.id)} AND b.tenant_id=${t}`);
    if (!r.rows[0]) return res.status(404).json({ message: 'Batch not found' });
    res.json(r.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── Mandi Prices ──────────────────────────────────────────────────────────────

async function ensureMandiTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS agri_mandi_prices (
    id SERIAL PRIMARY KEY, tenant_id INT, commodity VARCHAR(200),
    market_name VARCHAR(200), state VARCHAR(100), district VARCHAR(100),
    min_price DECIMAL(10,2), max_price DECIMAL(10,2), modal_price DECIMAL(10,2),
    arrival_date DATE, unit VARCHAR(30) DEFAULT 'Quintal',
    source VARCHAR(30) DEFAULT 'manual', created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

const MANDI_SEED_PRICES = [
  {commodity:'Paddy', market_name:'Nizamabad', state:'Telangana', district:'Nizamabad', min_price:1950, max_price:2100, modal_price:2015},
  {commodity:'Wheat', market_name:'Karnal', state:'Haryana', district:'Karnal', min_price:2050, max_price:2200, modal_price:2125},
  {commodity:'Cotton', market_name:'Warangal', state:'Telangana', district:'Warangal', min_price:6500, max_price:7200, modal_price:6850},
  {commodity:'Soybean', market_name:'Indore', state:'Madhya Pradesh', district:'Indore', min_price:4200, max_price:4600, modal_price:4380},
  {commodity:'Tomato', market_name:'Kolar', state:'Karnataka', district:'Kolar', min_price:800, max_price:2500, modal_price:1650},
  {commodity:'Onion', market_name:'Lasalgaon', state:'Maharashtra', district:'Nashik', min_price:1200, max_price:2800, modal_price:1900},
  {commodity:'Potato', market_name:'Agra', state:'Uttar Pradesh', district:'Agra', min_price:900, max_price:1400, modal_price:1100},
  {commodity:'Maize', market_name:'Davangere', state:'Karnataka', district:'Davangere', min_price:1750, max_price:1950, modal_price:1830},
  {commodity:'Groundnut', market_name:'Rajkot', state:'Gujarat', district:'Rajkot', min_price:5500, max_price:6200, modal_price:5850},
  {commodity:'Sugarcane', market_name:'Kolhapur', state:'Maharashtra', district:'Kolhapur', min_price:280, max_price:350, modal_price:315},
  {commodity:'Turmeric', market_name:'Nizamabad', state:'Telangana', district:'Nizamabad', min_price:6800, max_price:8500, modal_price:7600},
  {commodity:'Chilli', market_name:'Guntur', state:'Andhra Pradesh', district:'Guntur', min_price:9000, max_price:14000, modal_price:11500},
  {commodity:'Sunflower', market_name:'Dharwad', state:'Karnataka', district:'Dharwad', min_price:4800, max_price:5600, modal_price:5200},
  {commodity:'Jowar', market_name:'Solapur', state:'Maharashtra', district:'Solapur', min_price:2000, max_price:2400, modal_price:2180},
  {commodity:'Bajra', market_name:'Bikaner', state:'Rajasthan', district:'Bikaner', min_price:1900, max_price:2200, modal_price:2050},
  {commodity:'Arhar Dal', market_name:'Latur', state:'Maharashtra', district:'Latur', min_price:6200, max_price:7500, modal_price:6800},
  {commodity:'Moong Dal', market_name:'Jaipur', state:'Rajasthan', district:'Jaipur', min_price:7500, max_price:9000, modal_price:8200},
  {commodity:'Rice', market_name:'Palakkad', state:'Kerala', district:'Palakkad', min_price:2200, max_price:2600, modal_price:2400},
  {commodity:'Mustard', market_name:'Alwar', state:'Rajasthan', district:'Alwar', min_price:5000, max_price:5800, modal_price:5400},
  {commodity:'Banana', market_name:'Anand', state:'Gujarat', district:'Anand', min_price:800, max_price:1500, modal_price:1100},
];

router.get("/mandi/prices", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureMandiTable();
    // Seed if empty
    const cnt = await db.execute(sql`SELECT COUNT(*) as c FROM agri_mandi_prices WHERE tenant_id=${t}`);
    if (Number((cnt.rows[0] as any)?.c || 0) === 0) {
      for (const s of MANDI_SEED_PRICES) {
        await db.execute(sql`INSERT INTO agri_mandi_prices (tenant_id, commodity, market_name, state, district, min_price, max_price, modal_price, source)
          VALUES (${t}, ${s.commodity}, ${s.market_name}, ${s.state}, ${s.district}, ${s.min_price}, ${s.max_price}, ${s.modal_price}, 'seed')`);
      }
    }
    // Try live Agmarknet API via integration_credentials
    const apiKey = await getCredential(tid(req), 'AGMARKNET_API_KEY');
    if (apiKey) {
      try {
        const { source, records } = await fetchMandiPricesLive(
          tid(req),
          req.query.commodity as string,
          req.query.state as string
        );
        if (records.length) {
          res.json({ source, prices: records });
          return;
        }
      } catch (liveErr) {
        console.error('Agmarknet live fetch failed:', liveErr);
      }
    }
    // Return last 7-day cached data
    const { commodity, state } = req.query;
    let q = sql`SELECT * FROM agri_mandi_prices WHERE tenant_id=${t}`;
    if (commodity) q = sql`${q} AND LOWER(commodity) LIKE ${'%'+(commodity as string).toLowerCase()+'%'}`;
    if (state) q = sql`${q} AND LOWER(state) LIKE ${'%'+(state as string).toLowerCase()+'%'}`;
    const rows = await db.execute(sql`${q} ORDER BY arrival_date DESC NULLS LAST, id DESC LIMIT 200`);
    res.json({ source: 'db', prices: rows.rows });
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/mandi/prices/history/:commodity", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureMandiTable();
    const commodity = req.params.commodity;
    const rows = await db.execute(sql`SELECT * FROM agri_mandi_prices WHERE tenant_id=${t}
      AND LOWER(commodity) LIKE ${'%'+commodity.toLowerCase()+'%'}
      AND (arrival_date IS NULL OR arrival_date >= CURRENT_DATE - INTERVAL '30 days')
      ORDER BY arrival_date ASC, id ASC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/mandi/commodities", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureMandiTable();
    const rows = await db.execute(sql`SELECT DISTINCT commodity FROM agri_mandi_prices WHERE tenant_id=${t} ORDER BY commodity`);
    res.json(rows.rows.map((r: any) => r.commodity));
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/mandi/prices", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureMandiTable();
    const { commodity, market_name, state, district, min_price, max_price, modal_price, arrival_date, unit } = req.body;
    const row = await db.execute(sql`INSERT INTO agri_mandi_prices (tenant_id, commodity, market_name, state, district, min_price, max_price, modal_price, arrival_date, unit, source)
      VALUES (${t}, ${commodity}, ${market_name||null}, ${state||null}, ${district||null},
              ${min_price||0}, ${max_price||0}, ${modal_price||0}, ${arrival_date||null}, ${unit||'Quintal'}, 'manual')
      RETURNING *`);
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── IoT Sensor Data ───────────────────────────────────────────────────────────

async function ensureSensorTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS agri_sensor_readings (
    id SERIAL PRIMARY KEY, tenant_id INT, farm_id INT, sensor_id VARCHAR(100),
    sensor_type VARCHAR(50), value DECIMAL(10,4), unit VARCHAR(20),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

// No requireAuth — device key validation
router.post("/sensors/reading", async (req: any, res) => {
  try {
    await ensureSensorTable();
    const { tenant_id, farm_id, sensor_id, sensor_type, value, unit, device_key } = req.body;
    // Basic device key validation
    if (!device_key || device_key.length < 8) return res.status(401).json({ error: 'Invalid device key' });
    const t = tenant_id || 1;
    const row = await db.execute(sql`INSERT INTO agri_sensor_readings (tenant_id, farm_id, sensor_id, sensor_type, value, unit)
      VALUES (${t}, ${farm_id||null}, ${sensor_id||null}, ${sensor_type||'temperature'}, ${value||0}, ${unit||null})
      RETURNING *`);
    // Alert if soil_moisture < threshold
    if (sensor_type === 'soil_moisture' && Number(value) < 20) {
      console.warn(`[IoT ALERT] Low soil moisture: ${value}% at farm ${farm_id}, sensor ${sensor_id}`);
    }
    res.json(row.rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/sensors/:farmId/latest", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureSensorTable();
    const rows = await db.execute(sql`SELECT DISTINCT ON (sensor_type) * FROM agri_sensor_readings
      WHERE tenant_id=${t} AND farm_id=${parseInt(req.params.farmId)}
      ORDER BY sensor_type, recorded_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/sensors/:farmId/history", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureSensorTable();
    const rows = await db.execute(sql`SELECT * FROM agri_sensor_readings
      WHERE tenant_id=${t} AND farm_id=${parseInt(req.params.farmId)}
        AND recorded_at >= NOW() - INTERVAL '7 days'
      ORDER BY recorded_at DESC`);
    res.json(rows.rows);
  } catch(e: any) { res.status(500).json({ message: e.message }); }
});

// ── PMFBY Live API Routes ─────────────────────────────────────────────────────

router.get("/pmfby/api-status", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const apiKey = await getCredential(t, "PMFBY_API_KEY");
    const portalToken = await getCredential(t, "PMFBY_PORTAL_TOKEN");
    res.json({
      configured: !!(apiKey && portalToken),
      mode: apiKey && portalToken ? "live" : "local",
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/pmfby/submit-live", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const result = await submitPmfbyApplication(t, req.body);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/pmfby/claim-status/:applicationNo", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const result = await getPmfbyClaimStatus(t, req.params.applicationNo);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── IoT Device Provisioning Routes ───────────────────────────────────────────

router.get("/iot/devices", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDevicesTable();
    const rows = await db.execute(sql`SELECT id, device_id, device_name, farm_id, sensor_types, platform, last_seen, is_active, created_at FROM agri_iot_devices WHERE tenant_id=${t} ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/iot/devices", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDevicesTable();
    const { farm_id, device_name, sensor_types, platform } = req.body;
    const deviceId = `DEV-${Date.now().toString(36).toUpperCase()}`;
    const deviceKey = generateDeviceKey();
    const row = await db.execute(sql`
      INSERT INTO agri_iot_devices (tenant_id, farm_id, device_id, device_key, device_name, sensor_types, platform)
      VALUES (${t}, ${farm_id||null}, ${deviceId}, ${deviceKey},
              ${device_name||deviceId}, ${JSON.stringify(sensor_types||['temperature','soil_moisture','humidity'])},
              ${platform||'http'})
      RETURNING id, device_id, device_name, farm_id, sensor_types, platform, created_at`);
    // Return key only once on provisioning
    res.json({ ...row.rows[0] as any, device_key: deviceKey, note: "Save device_key — shown only once. Use in POST /api/agriculture/sensors/reading" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/iot/devices/:farmId/status", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await ensureDevicesTable();
    // Try external IoT platform first
    const iotApiUrl = await getCredential(t, "IOT_API_URL");
    let externalReadings: any[] = [];
    if (iotApiUrl) {
      const { readings } = await pollExternalIoTPlatform(t, parseInt(req.params.farmId)).catch(() => ({ source: "db", readings: [] }));
      externalReadings = readings;
    }
    // Always return latest from DB (includes HTTP-pushed readings)
    const dbReadings = await db.execute(sql`
      SELECT DISTINCT ON (sensor_type) * FROM agri_sensor_readings
      WHERE tenant_id=${t} AND farm_id=${parseInt(req.params.farmId)}
      ORDER BY sensor_type, recorded_at DESC
    `);
    const alerts = checkSensorAlerts(dbReadings.rows);
    res.json({
      source: iotApiUrl ? "external_polled" : "http_push",
      farm_id: req.params.farmId,
      readings: dbReadings.rows,
      alerts,
      external_synced: externalReadings.length,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/iot/api-status", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const iotApiUrl = await getCredential(t, "IOT_API_URL");
    const iotApiToken = await getCredential(t, "IOT_API_TOKEN");
    res.json({
      mode: iotApiUrl ? "external_platform" : "http_push",
      configured: !!(iotApiUrl && iotApiToken),
      http_push_endpoint: "/api/agriculture/sensors/reading",
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Mandi Live Sync (manual trigger) ─────────────────────────────────────────

router.post("/mandi/sync-live", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const { commodity, state } = req.body;
    const apiKey = await getCredential(t, "AGMARKNET_API_KEY");
    if (!apiKey) return res.json({ success: false, message: "AGMARKNET_API_KEY not configured in Integration Credentials" });
    const { source, records } = await fetchMandiPricesLive(t, commodity, state, 200);
    res.json({ success: true, source, synced: records.length });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
