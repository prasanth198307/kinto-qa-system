import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();
function auth(req: any, res: any, next: any) { if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" }); next(); }
function tid(req: any) { return req.session?.tenantId ?? req.user?.tenantId; }

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

export default router;
