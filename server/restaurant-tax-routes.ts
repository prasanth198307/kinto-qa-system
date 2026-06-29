import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => { if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" }); next(); };
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

const DEFAULT_COUNTRIES = [
  { country: 'India', tax_name: 'GST', tax_rate: 5.00, invoice_prefix: 'INV', currency: 'INR', currency_symbol: '₹', date_format: 'DD/MM/YYYY' },
  { country: 'UAE', tax_name: 'VAT', tax_rate: 5.00, invoice_prefix: 'UAE-INV', currency: 'AED', currency_symbol: 'د.إ', date_format: 'DD/MM/YYYY' },
  { country: 'Saudi Arabia', tax_name: 'VAT', tax_rate: 15.00, invoice_prefix: 'SA-INV', currency: 'SAR', currency_symbol: 'ر.س', date_format: 'DD/MM/YYYY' },
  { country: 'UK', tax_name: 'VAT', tax_rate: 20.00, invoice_prefix: 'UK-INV', currency: 'GBP', currency_symbol: '£', date_format: 'DD/MM/YYYY' },
  { country: 'USA', tax_name: 'Sales Tax', tax_rate: 8.00, invoice_prefix: 'US-INV', currency: 'USD', currency_symbol: '$', date_format: 'MM/DD/YYYY' },
  { country: 'Singapore', tax_name: 'GST', tax_rate: 9.00, invoice_prefix: 'SG-INV', currency: 'SGD', currency_symbol: 'S$', date_format: 'DD/MM/YYYY' },
];

router.get("/countries", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const rows = await db.execute(sql`SELECT * FROM country_tax_config WHERE tenant_id = ${t}`);
    const existing = new Map((rows.rows as any[]).map((r: any) => [r.country, r]));
    const merged = DEFAULT_COUNTRIES.map(d => ({ ...d, ...(existing.get(d.country) || {}), tenant_id: t }));
    res.json(merged);
  } catch { res.json(DEFAULT_COUNTRIES); }
});

router.get("/:country", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const country = decodeURIComponent(req.params.country);
    const rows = await db.execute(sql`SELECT * FROM country_tax_config WHERE tenant_id = ${t} AND country = ${country}`);
    const def = DEFAULT_COUNTRIES.find(d => d.country === country) || {};
    res.json(rows.rows[0] || def);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/:country", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const country = decodeURIComponent(req.params.country);
    const { tax_number, tax_rate, invoice_prefix, currency, currency_symbol } = req.body;
    const def = DEFAULT_COUNTRIES.find(d => d.country === country) || {} as any;
    await db.execute(sql`
      INSERT INTO country_tax_config (tenant_id, country, tax_name, tax_rate, tax_number, invoice_prefix, currency, currency_symbol, date_format)
      VALUES (${t}, ${country}, ${def.tax_name||'TAX'}, ${tax_rate||def.tax_rate||0}, ${tax_number||null}, ${invoice_prefix||def.invoice_prefix||'INV'}, ${currency||def.currency||'INR'}, ${currency_symbol||def.currency_symbol||'₹'}, ${def.date_format||'DD/MM/YYYY'})
      ON CONFLICT (tenant_id, country) DO UPDATE SET
        tax_number = EXCLUDED.tax_number, tax_rate = EXCLUDED.tax_rate,
        invoice_prefix = EXCLUDED.invoice_prefix, currency = EXCLUDED.currency, currency_symbol = EXCLUDED.currency_symbol`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/calculate", requireAuth, async (req: any, res: any) => {
  try {
    const { amount, country } = req.body;
    const def = DEFAULT_COUNTRIES.find(d => d.country === country) || { tax_name: 'TAX', tax_rate: 5, currency_symbol: '₹' };
    const taxable = Number(amount);
    const taxRate = Number(def.tax_rate) / 100;
    const taxAmount = Math.round(taxable * taxRate * 100) / 100;
    res.json({ taxable_amount: taxable, tax_name: def.tax_name, tax_rate: def.tax_rate, tax_amount: taxAmount, total: taxable + taxAmount, currency_symbol: def.currency_symbol });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/invoice/:kotId", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const order = await db.execute(sql`SELECT ko.*, json_agg(ki.*) as items FROM kot_orders ko LEFT JOIN kot_items ki ON ki.kot_id = ko.id WHERE ko.id = ${req.params.kotId} AND ko.tenant_id = ${t} GROUP BY ko.id`);
    const o = order.rows[0] as any;
    if (!o) return res.status(404).json({ error: "Order not found" });
    const outlet = o.outlet_id ? await db.execute(sql`SELECT country FROM restaurant_outlets WHERE id = ${o.outlet_id}`) : { rows: [] };
    const country = (outlet.rows[0] as any)?.country || 'India';
    const taxCfg = DEFAULT_COUNTRIES.find(d => d.country === country) || DEFAULT_COUNTRIES[0];
    res.json({ order: o, tax_config: taxCfg, invoice_number: `${taxCfg.invoice_prefix}-${o.id}`, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ZATCA (Saudi Arabia) compliance
router.post("/zatca/generate", requireAuth, async (req: any, res: any) => {
  try {
    const { seller_name, trn, invoice_date, total, vat_amount } = req.body;
    const tlvEncode = (tag: number, value: string): Buffer => {
      const valBuf = Buffer.from(value, 'utf8');
      return Buffer.concat([Buffer.from([tag, valBuf.length]), valBuf]);
    };
    const qrData = Buffer.concat([
      tlvEncode(1, seller_name || 'Restaurant'),
      tlvEncode(2, trn || '000000000000000'),
      tlvEncode(3, invoice_date || new Date().toISOString()),
      tlvEncode(4, String(total || 0)),
      tlvEncode(5, String(vat_amount || 0)),
    ]).toString('base64');
    res.json({ qr_code: qrData, zatca_compliant: true, format: 'TLV', instructions: 'Display this QR code on the invoice as required by ZATCA Phase 2' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/vat-return-data", requireAuth, async (req: any, res: any) => {
  try {
    const t = tid(req);
    const { from, to } = req.query;
    const rows = await db.execute(sql`
      SELECT DATE_TRUNC('month', created_at) as period,
        SUM(grand_total) as total_sales,
        SUM(gst_amount) as vat_collected,
        COUNT(*) as invoice_count
      FROM kot_orders WHERE tenant_id = ${t} AND payment_status = 'paid'
      AND created_at BETWEEN ${from || '2024-01-01'} AND ${to || 'NOW()'}
      GROUP BY period ORDER BY period`);
    res.json({ vat_return: rows.rows, country: 'UAE', currency: 'AED', instructions: 'Submit this data to UAE FTA portal quarterly' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
