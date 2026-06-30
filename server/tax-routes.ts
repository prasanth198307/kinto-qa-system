// Tax Engine API Routes — Phase 5
import { Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { computeTax, generateZATCAQR, EU_VAT_RATES, US_SALES_TAX_RATES, TaxParams } from './tax-engine';
const taxRouter = Router();

const SUPPORTED_REGIMES = [
  { regime: 'GST',        countries: ['India'],                         description: 'Goods and Services Tax (CGST/SGST/IGST)' },
  { regime: 'ZATCA',      countries: ['Saudi Arabia'],                  description: 'Zakat, Tax & Customs Authority VAT 15%' },
  { regime: 'VAT',        countries: ['UAE', ...Object.keys(EU_VAT_RATES)], description: 'Value Added Tax' },
  { regime: 'Sales Tax',  countries: ['USA'],                           description: 'US State Sales Tax' },
  { regime: 'None',       countries: ['Other'],                         description: 'No applicable tax' },
];

// GET /api/tax/regimes
taxRouter.get('/regimes', (_req, res) => {
  res.json({ regimes: SUPPORTED_REGIMES });
});

// GET /api/tax/us-rates
taxRouter.get('/us-rates', (_req, res) => {
  const rates = Object.entries(US_SALES_TAX_RATES).map(([state, rate]) => ({ state, rate }));
  res.json({ rates });
});

// GET /api/tax/eu-rates
taxRouter.get('/eu-rates', (_req, res) => {
  const rates = Object.entries(EU_VAT_RATES).map(([country, rate]) => ({ country, rate }));
  res.json({ rates });
});

// POST /api/tax/compute
taxRouter.post('/compute', (req, res) => {
  try {
    const params: TaxParams = req.body;
    if (!params.country || params.taxableAmount == null) {
      return res.status(400).json({ error: 'country and taxableAmount are required' });
    }
    const result = computeTax(params);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/tax/zatca-qr
taxRouter.post('/zatca-qr', (req, res) => {
  try {
    const { sellerName, vatNumber, invoiceDate, totalWithVat, vatAmount } = req.body;
    if (!sellerName || !vatNumber || !invoiceDate || totalWithVat == null || vatAmount == null) {
      return res.status(400).json({ error: 'Missing required ZATCA fields' });
    }
    const qr = generateZATCAQR({ sellerName, vatNumber, invoiceDate, totalWithVat, vatAmount });
    return res.json({ qr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/tax/settings
taxRouter.get('/settings', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    const tenantId = req.user?.tenantId;
    const rows = await db.execute(sql`SELECT * FROM tenant_tax_settings WHERE tenant_id = ${tenantId} LIMIT 1`);
    const row = rows.rows?.[0] ?? null;
    res.json({ settings: row });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tax/settings
taxRouter.put('/settings', async (req: any, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  try {
    const tenantId = req.user?.tenantId;
    const {
      country = 'India',
      default_state,
      seller_state,
      vat_number,
      tax_regime = 'GST',
      eu_vat_number,
      zatca_enabled = false,
      us_state,
      additional_rates,
    } = req.body;

    await db.execute(sql`
      INSERT INTO tenant_tax_settings
        (tenant_id, country, default_state, seller_state, vat_number, tax_regime, eu_vat_number, zatca_enabled, us_state, additional_rates, updated_at)
      VALUES
        (${tenantId}, ${country}, ${default_state ?? null}, ${seller_state ?? null}, ${vat_number ?? null},
         ${tax_regime}, ${eu_vat_number ?? null}, ${zatca_enabled}, ${us_state ?? null},
         ${additional_rates ? JSON.stringify(additional_rates) : null}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        country = EXCLUDED.country,
        default_state = EXCLUDED.default_state,
        seller_state = EXCLUDED.seller_state,
        vat_number = EXCLUDED.vat_number,
        tax_regime = EXCLUDED.tax_regime,
        eu_vat_number = EXCLUDED.eu_vat_number,
        zatca_enabled = EXCLUDED.zatca_enabled,
        us_state = EXCLUDED.us_state,
        additional_rates = EXCLUDED.additional_rates,
        updated_at = NOW()
    `);

    const rows = await db.execute(sql`SELECT * FROM tenant_tax_settings WHERE tenant_id = ${tenantId} LIMIT 1`);
    res.json({ settings: rows.rows?.[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { taxRouter };
