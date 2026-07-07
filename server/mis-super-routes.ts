import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// GET /api/mis/super-dashboard
// Cross-ERP consolidated view for owner/CFO
router.get('/super-dashboard', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [
      restaurantKPI, hotelKPI, pharmacyKPI, educationKPI,
      crmKPI, hrKPI, glKPI, formsKPI, deskKPI
    ] = await Promise.allSettled([
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as orders FROM restaurant_orders WHERE tenant_id=${t} AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COUNT(*) as occupied FROM hotel_rooms WHERE tenant_id=${t} AND status='occupied'`),
      db.execute(sql`SELECT COALESCE(SUM(total_amount),0) as revenue FROM pharmacy_sales WHERE tenant_id=${t} AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) as pending FROM education_fees WHERE tenant_id=${t} AND status='pending'`),
      db.execute(sql`SELECT COUNT(*) as leads FROM crm_leads WHERE tenant_id=${t} AND status NOT IN ('won','lost')`),
      db.execute(sql`SELECT COUNT(*) as employees FROM hr_employees WHERE tenant_id=${t} AND status='active'`),
      db.execute(sql`SELECT
        COALESCE(SUM(CASE WHEN jl.account_code::int BETWEEN 4000 AND 4999 THEN jl.credit-jl.debit ELSE 0 END),0) as revenue,
        COALESCE(SUM(CASE WHEN jl.account_code::int BETWEEN 5000 AND 6999 THEN jl.debit-jl.credit ELSE 0 END),0) as expenses
        FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_id
        WHERE je.tenant_id=${t} AND DATE_TRUNC('month',je.posting_date)=DATE_TRUNC('month',CURRENT_DATE)`),
      db.execute(sql`SELECT COUNT(*) as submissions FROM sf_form_submissions WHERE tenant_id=${t} AND DATE(created_at)=CURRENT_DATE`),
      db.execute(sql`SELECT COUNT(*) as open_tickets FROM desk_tickets WHERE tenant_id=${t} AND status NOT IN ('resolved','closed')`),
    ]);

    const safe = (result: PromiseSettledResult<any>, key: string, fallback: any = 0) => {
      if (result.status === 'fulfilled' && result.value.rows.length) return result.value.rows[0][key] ?? fallback;
      return fallback;
    };

    const glData = glKPI.status === 'fulfilled' ? (glKPI.value.rows[0] as any) : { revenue: 0, expenses: 0 };

    res.json({
      generated_at: new Date().toISOString(),
      period: 'today + this_month',
      kpis: {
        total_revenue_this_month_paise: parseInt(glData.revenue || 0),
        total_expenses_this_month_paise: parseInt(glData.expenses || 0),
        net_profit_this_month_paise: parseInt(glData.revenue || 0) - parseInt(glData.expenses || 0),
        restaurant_revenue_today: parseFloat(safe(restaurantKPI, 'revenue')),
        restaurant_orders_today: parseInt(safe(restaurantKPI, 'orders')),
        hotel_rooms_occupied: parseInt(safe(hotelKPI, 'occupied')),
        pharmacy_revenue_today: parseFloat(safe(pharmacyKPI, 'revenue')),
        education_pending_fees: parseFloat(safe(educationKPI, 'pending')),
        crm_open_leads: parseInt(safe(crmKPI, 'leads')),
        hr_active_employees: parseInt(safe(hrKPI, 'employees')),
        form_submissions_today: parseInt(safe(formsKPI, 'submissions')),
        desk_open_tickets: parseInt(safe(deskKPI, 'open_tickets')),
      }
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /api/mis/revenue-trend?days=30
router.get('/revenue-trend', requireAuth, async (req: any, res) => {
  const t = tid(req);
  const days = parseInt(req.query.days as string) || 30;
  try {
    const r = await db.execute(sql`
      SELECT DATE(je.posting_date) as date,
        SUM(CASE WHEN jl.account_code::int BETWEEN 4000 AND 4999 THEN jl.credit - jl.debit ELSE 0 END) as revenue,
        SUM(CASE WHEN jl.account_code::int BETWEEN 5000 AND 6999 THEN jl.debit - jl.credit ELSE 0 END) as expenses
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_id
      WHERE je.tenant_id=${t} AND je.posting_date >= CURRENT_DATE - (${days} || ' days')::interval
      GROUP BY DATE(je.posting_date) ORDER BY date ASC
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /api/mis/vertical-performance
router.get('/vertical-performance', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`
      SELECT jl.account_code,
        SUM(jl.credit - jl.debit) as net_revenue
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_id
      WHERE je.tenant_id=${t} AND jl.account_code::int BETWEEN 4001 AND 4080
        AND je.posting_date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY jl.account_code ORDER BY net_revenue DESC
    `);

    const accountNames: Record<number, string> = {
      4001: 'Pharmacy', 4010: 'Hotel', 4020: 'Education', 4030: 'Restaurant',
      4040: 'Logistics', 4050: 'Healthcare', 4060: 'Agriculture', 4070: 'Gold',
      4080: 'Real Estate'
    };

    const verticals = (r.rows as any[]).map(row => ({
      vertical: accountNames[parseInt(row.account_code)] || `Account ${row.account_code}`,
      account_code: row.account_code,
      revenue_paise: parseInt(row.net_revenue || 0),
      revenue_inr: Math.round(parseInt(row.net_revenue || 0) / 100)
    }));

    res.json({ period: 'this_month', verticals });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /api/mis/cash-position
router.get('/cash-position', requireAuth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`
      SELECT jl.account_code,
        SUM(jl.debit) - SUM(jl.credit) as balance
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_id
      WHERE je.tenant_id=${t} AND jl.account_code IN ('1001', '1002', '1003')
      GROUP BY jl.account_code
    `);
    const accounts: Record<string, string> = { '1001': 'Cash', '1002': 'Bank', '1003': 'Petty Cash' };
    const positions = (r.rows as any[]).map(row => ({
      account: accounts[row.account_code] || `${row.account_code}`,
      balance_paise: parseInt(row.balance || 0),
      balance_inr: Math.round(parseInt(row.balance || 0) / 100)
    }));
    const total = positions.reduce((s, p) => s + p.balance_paise, 0);
    res.json({ positions, total_cash_paise: total, total_cash_inr: Math.round(total / 100) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// GET /api/mis/alerts
router.get('/alerts', requireAuth, async (req: any, res) => {
  const t = tid(req);
  const alerts: any[] = [];

  await Promise.allSettled([
    db.execute(sql`SELECT COUNT(*) as cnt FROM desk_tickets WHERE tenant_id=${t} AND status='open' AND created_at < NOW() - INTERVAL '48 hours'`)
      .then(r => { if (parseInt((r.rows[0] as any).cnt) > 0) alerts.push({ type: 'warning', module: 'SwachDesk', message: `${(r.rows[0] as any).cnt} tickets overdue (>48h)` }); })
      .catch(() => {}),
    db.execute(sql`SELECT COUNT(*) as cnt FROM pharmacy_batches WHERE tenant_id=${t} AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND quantity > 0`)
      .then(r => { if (parseInt((r.rows[0] as any).cnt) > 0) alerts.push({ type: 'warning', module: 'Pharmacy', message: `${(r.rows[0] as any).cnt} batches expiring within 90 days` }); })
      .catch(() => {}),
    db.execute(sql`SELECT COUNT(*) as cnt FROM nidhi_loans WHERE tenant_id=${t} AND next_emi_date <= CURRENT_DATE AND status='active'`)
      .then(r => { if (parseInt((r.rows[0] as any).cnt) > 0) alerts.push({ type: 'urgent', module: 'Nidhi', message: `${(r.rows[0] as any).cnt} EMIs overdue` }); })
      .catch(() => {}),
    db.execute(sql`SELECT COUNT(*) as cnt FROM logistics_vehicles WHERE tenant_id=${t} AND next_service_date <= CURRENT_DATE + INTERVAL '7 days'`)
      .then(r => { if (parseInt((r.rows[0] as any).cnt) > 0) alerts.push({ type: 'info', module: 'Logistics', message: `${(r.rows[0] as any).cnt} vehicles due for service` }); })
      .catch(() => {}),
  ]);

  res.json({ alerts, generated_at: new Date().toISOString() });
});

export default router;
