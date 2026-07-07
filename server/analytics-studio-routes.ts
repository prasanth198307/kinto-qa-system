import { Router } from "express";
import { pool } from "./db";
import PDFDocument from "pdfkit";
import crypto from "crypto";

export const analyticsRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;

// ─── Table Init ───────────────────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bi_reports (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      name VARCHAR(300),
      description TEXT,
      module VARCHAR(100),
      report_type VARCHAR(30),
      config JSONB DEFAULT '{}',
      share_token VARCHAR(64),
      share_expires_at TIMESTAMPTZ,
      is_public BOOLEAN DEFAULT FALSE,
      created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bi_dashboards (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      name VARCHAR(300),
      description TEXT,
      layout JSONB DEFAULT '[]',
      dashboard_type VARCHAR(30) DEFAULT 'custom',
      module VARCHAR(100),
      share_token VARCHAR(64),
      share_expires_at TIMESTAMPTZ,
      is_public BOOLEAN DEFAULT FALSE,
      is_default BOOLEAN DEFAULT FALSE,
      created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bi_scheduled_reports (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      report_id INT,
      dashboard_id INT,
      name VARCHAR(300),
      frequency VARCHAR(20),
      send_day INT,
      send_hour INT DEFAULT 8,
      recipients JSONB DEFAULT '[]',
      format VARCHAR(10) DEFAULT 'pdf',
      last_sent_at TIMESTAMPTZ,
      next_send_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bi_report_runs (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      report_id INT,
      ran_at TIMESTAMPTZ DEFAULT NOW(),
      duration_ms INT,
      row_count INT,
      from_cache BOOLEAN DEFAULT FALSE,
      error_msg TEXT
    );
    CREATE TABLE IF NOT EXISTS bi_kpi_canvas (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      name VARCHAR(300),
      canvas_type VARCHAR(30) DEFAULT 'owner',
      widgets JSONB DEFAULT '[]',
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

let tablesReady = false;
async function initOnce() {
  if (tablesReady) return;
  await ensureTables();
  tablesReady = true;
}

// ─── Data Sources ─────────────────────────────────────────────────────────────
const DATA_SOURCES: Record<string, (tenantId: number, filters: any) => string> = {
  gl_monthly: (t, f) => `
    SELECT DATE_TRUNC('month', je.posting_date) as period,
      SUM(CASE WHEN jl.account_code::text ~ '^4' THEN jl.credit - jl.debit ELSE 0 END) as revenue,
      SUM(CASE WHEN jl.account_code::text ~ '^5' THEN jl.debit - jl.credit ELSE 0 END) as cogs,
      SUM(CASE WHEN jl.account_code::text ~ '^6' THEN jl.debit - jl.credit ELSE 0 END) as opex
    FROM journal_lines jl JOIN journal_entries je ON je.id = jl.journal_id
    WHERE je.tenant_id = ${t}
    ${f.from_date ? `AND je.posting_date >= '${f.from_date}'` : ""}
    ${f.to_date ? `AND je.posting_date <= '${f.to_date}'` : ""}
    GROUP BY 1 ORDER BY 1`,

  invoices_by_customer: (t, f) => `
    SELECT customer_name, COUNT(*) as invoice_count, SUM(total_amount) as total_revenue, AVG(total_amount) as avg_value
    FROM invoices WHERE tenant_id = ${t}
    ${f.from_date ? `AND invoice_date >= '${f.from_date}'` : ""}
    ${f.to_date ? `AND invoice_date <= '${f.to_date}'` : ""}
    GROUP BY customer_name ORDER BY total_revenue DESC LIMIT ${f.limit || 20}`,

  hr_headcount: (t, _f) => `
    SELECT department, COUNT(*) as headcount, AVG(gross_salary) as avg_salary
    FROM hr_employees WHERE tenant_id = ${t} AND status = 'active'
    GROUP BY department ORDER BY headcount DESC`,

  crm_pipeline: (t, _f) => `
    SELECT stage, COUNT(*) as deals, SUM(value) as total_value, AVG(probability) as avg_probability
    FROM crm_deals WHERE tenant_id = ${t} AND status = 'active'
    GROUP BY stage ORDER BY total_value DESC`,

  pharmacy_sales: (t, f) => `
    SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as transactions, SUM(total_amount) as revenue
    FROM pharmacy_sales WHERE tenant_id = ${t}
    ${f.from_date ? `AND created_at >= '${f.from_date}'` : `AND created_at >= NOW() - INTERVAL '30 days'`}
    GROUP BY 1 ORDER BY 1`,

  hotel_occupancy: (t, _f) => `
    SELECT room_type, COUNT(*) as total_rooms,
      SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied,
      ROUND(100.0 * SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) as occupancy_pct
    FROM hotel_rooms WHERE tenant_id = ${t} GROUP BY room_type`,

  ecommerce_channel: (t, f) => `
    SELECT channel_type, COUNT(*) as orders, SUM(total_amount) as revenue, AVG(total_amount) as aov
    FROM ecom_orders WHERE tenant_id = ${t}
    ${f.from_date ? `AND created_at >= '${f.from_date}'` : ""}
    GROUP BY channel_type ORDER BY revenue DESC`,

  vertical_revenue: (t, _f) => `
    SELECT account_code, SUM(credit - debit) as revenue
    FROM journal_lines jl JOIN journal_entries je ON je.id = jl.journal_id
    WHERE je.tenant_id = ${t}
      AND je.posting_date >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY account_code ORDER BY revenue DESC`,
};

const DATA_SOURCE_META: Record<string, { name: string; description: string; available_columns: string[] }> = {
  gl_monthly: { name: "GL Monthly Summary", description: "Revenue, COGS, OpEx from journal entries grouped by month", available_columns: ["period", "revenue", "cogs", "opex"] },
  invoices_by_customer: { name: "Invoices by Customer", description: "Invoice count, total revenue and avg value per customer", available_columns: ["customer_name", "invoice_count", "total_revenue", "avg_value"] },
  hr_headcount: { name: "HR Headcount", description: "Active employee count and average salary by department", available_columns: ["department", "headcount", "avg_salary"] },
  crm_pipeline: { name: "CRM Pipeline", description: "Active deal count, total value, avg probability by stage", available_columns: ["stage", "deals", "total_value", "avg_probability"] },
  pharmacy_sales: { name: "Pharmacy Daily Sales", description: "Daily transaction count and revenue for pharmacy module", available_columns: ["date", "transactions", "revenue"] },
  hotel_occupancy: { name: "Hotel Occupancy", description: "Room occupancy rate by room type", available_columns: ["room_type", "total_rooms", "occupied", "occupancy_pct"] },
  ecommerce_channel: { name: "Ecommerce by Channel", description: "Orders, revenue, AOV grouped by sales channel", available_columns: ["channel_type", "orders", "revenue", "aov"] },
  vertical_revenue: { name: "Vertical Revenue YTD", description: "Revenue by account code year-to-date", available_columns: ["account_code", "revenue"] },
};

async function runDataSource(tenantId: number, dataSource: string, filters: any): Promise<any[]> {
  if (!DATA_SOURCES[dataSource]) throw new Error(`Unknown data source: ${dataSource}`);
  const q = DATA_SOURCES[dataSource](tenantId, filters || {});
  if (/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|GRANT)\b/i.test(q)) throw new Error("Query validation failed");
  const r = await pool.query(q);
  return r.rows;
}

// ─── Report Builder ───────────────────────────────────────────────────────────

analyticsRouter.get("/reports", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_reports WHERE tenant_id=$1 ORDER BY created_at DESC`, [tid(req)]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/reports", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { name, description, module, report_type, config } = req.body;
    const r = await pool.query(
      `INSERT INTO bi_reports (tenant_id,name,description,module,report_type,config,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tid(req), name, description, module, report_type, JSON.stringify(config || {}), req.user?.id]
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/reports/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.put("/reports/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { name, description, module, report_type, config } = req.body;
    const r = await pool.query(
      `UPDATE bi_reports SET name=$1,description=$2,module=$3,report_type=$4,config=$5,updated_at=NOW()
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [name, description, module, report_type, JSON.stringify(config || {}), req.params.id, tid(req)]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.delete("/reports/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    await pool.query(`DELETE FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/reports/:id/run", requireAuth, async (req: any, res: any) => {
  await initOnce();
  const start = Date.now();
  try {
    const r = await pool.query(`SELECT * FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const report = r.rows[0];
    const config = report.config || {};
    const rows = await runDataSource(tid(req), config.data_source, { ...config.filters, limit: config.limit });
    const duration_ms = Date.now() - start;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    await pool.query(
      `INSERT INTO bi_report_runs (tenant_id,report_id,duration_ms,row_count) VALUES ($1,$2,$3,$4)`,
      [tid(req), req.params.id, duration_ms, rows.length]
    );
    res.json({ columns, rows, metadata: { row_count: rows.length, duration_ms } });
  } catch (e: any) {
    await pool.query(`INSERT INTO bi_report_runs (tenant_id,report_id,error_msg) VALUES ($1,$2,$3)`, [tid(req), req.params.id, e.message]).catch(() => {});
    res.status(500).json({ message: e.message });
  }
});

analyticsRouter.get("/reports/:id/export/csv", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const report = r.rows[0];
    const config = report.config || {};
    const rows = await runDataSource(tid(req), config.data_source, { ...config.filters, limit: config.limit });
    if (!rows.length) return res.status(200).send("");
    const columns = Object.keys(rows[0]);
    const header = columns.join(",");
    const body = rows.map((row: any) => columns.map((c: string) => {
      const v = row[c];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${report.name?.replace(/[^a-z0-9]/gi, "_")}_export.csv"`);
    res.send(header + "\n" + body);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/reports/:id/export/pdf", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const report = r.rows[0];
    const config = report.config || {};
    const rows = await runDataSource(tid(req), config.data_source, { ...config.filters, limit: config.limit });
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.name?.replace(/[^a-z0-9]/gi, "_")}_report.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text(report.name || "Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}  |  Rows: ${rows.length}`, { align: "center" });
    doc.moveDown(1);

    if (columns.length > 0) {
      const colW = Math.min(120, Math.floor((doc.page.width - 80) / columns.length));
      const rowH = 20;
      let x = 40, y = doc.y;

      // Header
      doc.fontSize(9).fillColor("#ffffff");
      doc.rect(x, y, colW * columns.length, rowH).fill("#2563eb");
      columns.forEach((col, i) => {
        doc.fillColor("#ffffff").text(col.toUpperCase(), x + i * colW + 4, y + 5, { width: colW - 8, ellipsis: true });
      });
      y += rowH;

      // Rows
      rows.slice(0, 200).forEach((row: any, ri: number) => {
        if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
        const bg = ri % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.rect(x, y, colW * columns.length, rowH).fill(bg);
        doc.fillColor("#1e293b");
        columns.forEach((col, i) => {
          const v = row[col] !== null && row[col] !== undefined ? String(row[col]) : "";
          doc.fontSize(8).text(v, x + i * colW + 4, y + 5, { width: colW - 8, ellipsis: true });
        });
        y += rowH;
      });
    }

    doc.end();
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/data-sources", requireAuth, async (req: any, res: any) => {
  res.json(Object.entries(DATA_SOURCE_META).map(([key, meta]) => ({ key, ...meta })));
});

// ─── Dashboard Builder ────────────────────────────────────────────────────────

analyticsRouter.get("/dashboards", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_dashboards WHERE tenant_id=$1 ORDER BY is_default DESC, created_at DESC`, [tid(req)]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/dashboards", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { name, description, dashboard_type, module, layout } = req.body;
    const r = await pool.query(
      `INSERT INTO bi_dashboards (tenant_id,name,description,dashboard_type,module,layout,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tid(req), name, description, dashboard_type || "custom", module, JSON.stringify(layout || []), req.user?.id]
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/dashboards/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_dashboards WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const dash = r.rows[0];
    const layout = dash.layout || [];
    const reportIds = layout.map((l: any) => l.report_id).filter(Boolean);
    let reports: any[] = [];
    if (reportIds.length) {
      const reps = await pool.query(`SELECT * FROM bi_reports WHERE id = ANY($1) AND tenant_id=$2`, [reportIds, tid(req)]);
      reports = reps.rows;
    }
    res.json({ ...dash, reports });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.put("/dashboards/:id/layout", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { layout } = req.body;
    const r = await pool.query(
      `UPDATE bi_dashboards SET layout=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [JSON.stringify(layout || []), req.params.id, tid(req)]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Append a report widget to the dashboard layout
analyticsRouter.post("/dashboards/:id/add-report", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { report_id, position } = req.body;
    const r = await pool.query(`SELECT layout FROM bi_dashboards WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const layout: any[] = r.rows[0].layout || [];
    layout.push({ report_id: Number(report_id), ...(position || { x: 0, y: 0, w: 4, h: 3 }) });
    const upd = await pool.query(
      `UPDATE bi_dashboards SET layout=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [JSON.stringify(layout), req.params.id, tid(req)]
    );
    res.json(upd.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.delete("/dashboards/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    await pool.query(`DELETE FROM bi_dashboards WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/dashboards/:id/data", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_dashboards WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const dash = r.rows[0];
    const layout: any[] = dash.layout || [];
    const reportIds = [...new Set(layout.map((l: any) => l.report_id).filter(Boolean))] as number[];
    const reportData: Record<number, any> = {};

    await Promise.allSettled(reportIds.map(async (rid) => {
      try {
        const rr = await pool.query(`SELECT * FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [rid, tid(req)]);
        if (!rr.rows.length) return;
        const rep = rr.rows[0];
        const config = rep.config || {};
        const rows = await runDataSource(tid(req), config.data_source, { ...config.filters, limit: config.limit });
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        reportData[rid] = { columns, rows };
      } catch (e: any) {
        reportData[rid] = { error: e.message };
      }
    }));

    res.json({ reports: reportIds.map((id) => ({ id, data: reportData[id] || null })) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── KPI Canvas ───────────────────────────────────────────────────────────────

analyticsRouter.get("/kpi-canvas", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(
      `SELECT * FROM bi_kpi_canvas WHERE tenant_id=$1 ORDER BY is_default DESC, created_at DESC`,
      [tid(req)]
    );
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/kpi-canvas", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { name, canvas_type, widgets, is_default } = req.body;
    const r = await pool.query(
      `INSERT INTO bi_kpi_canvas (tenant_id,name,canvas_type,widgets,is_default) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tid(req), name, canvas_type || "owner", JSON.stringify(widgets || []), is_default || false]
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.put("/kpi-canvas/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { name, canvas_type, widgets, is_default } = req.body;
    const r = await pool.query(
      `UPDATE bi_kpi_canvas SET name=$1,canvas_type=$2,widgets=$3,is_default=$4 WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [name, canvas_type, JSON.stringify(widgets || []), is_default || false, req.params.id, tid(req)]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/kpi-canvas/:id/data", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_kpi_canvas WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const canvas = r.rows[0];
    const widgets: any[] = canvas.widgets || [];
    const t = tid(req);

    const [revenueRow, cogsRow, opexRow, headcountRow, ticketsRow, churnRow, cashRow] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(credit-debit),0) as val FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_id WHERE je.tenant_id=$1 AND jl.account_code::text ~ '^4' AND je.posting_date >= DATE_TRUNC('month',CURRENT_DATE)`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
      pool.query(`SELECT COALESCE(SUM(debit-credit),0) as val FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_id WHERE je.tenant_id=$1 AND jl.account_code::text ~ '^5' AND je.posting_date >= DATE_TRUNC('month',CURRENT_DATE)`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
      pool.query(`SELECT COALESCE(SUM(debit-credit),0) as val FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_id WHERE je.tenant_id=$1 AND jl.account_code::text ~ '^6' AND je.posting_date >= DATE_TRUNC('month',CURRENT_DATE)`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
      pool.query(`SELECT COUNT(*) as val FROM hr_employees WHERE tenant_id=$1 AND status='active'`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
      pool.query(`SELECT COUNT(*) as val FROM desk_tickets WHERE tenant_id=$1 AND status NOT IN ('closed','resolved')`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
      pool.query(`SELECT ROUND(100.0*SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as val FROM crm_deals WHERE tenant_id=$1 AND created_at >= DATE_TRUNC('month',CURRENT_DATE)`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
      pool.query(`SELECT COALESCE(SUM(debit-credit),0) as val FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_id WHERE je.tenant_id=$1 AND jl.account_code::text IN ('1001','1002','1003')`, [t]).catch(() => ({ rows: [{ val: 0 }] })),
    ]);

    const liveMetrics: Record<string, number> = {
      revenue: parseFloat(revenueRow.rows[0]?.val || "0"),
      cogs: parseFloat(cogsRow.rows[0]?.val || "0"),
      opex: parseFloat(opexRow.rows[0]?.val || "0"),
      headcount: parseInt(headcountRow.rows[0]?.val || "0"),
      open_tickets: parseInt(ticketsRow.rows[0]?.val || "0"),
      churn: parseFloat(churnRow.rows[0]?.val || "0"),
      cash: parseFloat(cashRow.rows[0]?.val || "0"),
    };
    liveMetrics.ebitda = liveMetrics.revenue - liveMetrics.cogs - liveMetrics.opex;

    const enriched = widgets.map((w: any) => {
      const current_value = liveMetrics[w.metric] ?? null;
      const target = w.target || 0;
      const vs_target_pct = target ? parseFloat(((current_value / target) * 100 - 100).toFixed(1)) : null;
      const trend: string = current_value === null ? "flat" : current_value > target ? "up" : current_value < target ? "down" : "flat";
      return { ...w, current_value, vs_target_pct, trend };
    });

    res.json({ widgets: enriched });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Public Dashboard Sharing ─────────────────────────────────────────────────

analyticsRouter.post("/dashboards/:id/share", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const r = await pool.query(
      `UPDATE bi_dashboards SET share_token=$1,share_expires_at=$2,is_public=true,updated_at=NOW()
       WHERE id=$3 AND tenant_id=$4 RETURNING *`,
      [token, expiresAt.toISOString(), req.params.id, tid(req)]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    res.json({ share_url: `${base}/analytics/public/${token}`, expires_at: expiresAt.toISOString() });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.delete("/dashboards/:id/share", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    await pool.query(
      `UPDATE bi_dashboards SET is_public=false,share_token=NULL,share_expires_at=NULL WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, tid(req)]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Scheduled Reports ────────────────────────────────────────────────────────

function calcNextSendAt(frequency: string, send_day: number, send_hour: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(send_hour);

  if (frequency === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    const daysUntil = (send_day - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);
  } else if (frequency === "monthly") {
    next.setDate(send_day);
    if (next <= now) { next.setMonth(next.getMonth() + 1); next.setDate(send_day); }
  }
  return next;
}

analyticsRouter.get("/scheduled-reports", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_scheduled_reports WHERE tenant_id=$1 ORDER BY created_at DESC`, [tid(req)]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/scheduled-reports", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { report_id, dashboard_id, name, frequency, send_day, send_hour, recipients, format } = req.body;
    const next_send_at = calcNextSendAt(frequency, send_day || 1, send_hour || 8);
    const r = await pool.query(
      `INSERT INTO bi_scheduled_reports (tenant_id,report_id,dashboard_id,name,frequency,send_day,send_hour,recipients,format,next_send_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tid(req), report_id || null, dashboard_id || null, name, frequency, send_day || null, send_hour || 8,
       JSON.stringify(recipients || []), format || "pdf", next_send_at.toISOString()]
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.put("/scheduled-reports/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const { name, frequency, send_day, send_hour, recipients, format, is_active } = req.body;
    const next_send_at = calcNextSendAt(frequency, send_day || 1, send_hour || 8);
    const r = await pool.query(
      `UPDATE bi_scheduled_reports SET name=$1,frequency=$2,send_day=$3,send_hour=$4,recipients=$5,format=$6,is_active=$7,next_send_at=$8
       WHERE id=$9 AND tenant_id=$10 RETURNING *`,
      [name, frequency, send_day, send_hour, JSON.stringify(recipients || []), format, is_active ?? true, next_send_at.toISOString(), req.params.id, tid(req)]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.delete("/scheduled-reports/:id", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    await pool.query(`DELETE FROM bi_scheduled_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Build a PDF buffer for a report's rows (A4 landscape table)
function buildReportPdf(name: string, rows: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(16).text(name, { align: "center" });
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, { align: "center" }).moveDown();
    if (!rows.length) { doc.fontSize(11).text("No data"); doc.end(); return; }
    const cols = Object.keys(rows[0]);
    const colW = (doc.page.width - 80) / cols.length;
    let y = doc.y;
    doc.fontSize(8).font("Helvetica-Bold");
    cols.forEach((c, i) => doc.text(String(c), 40 + i * colW, y, { width: colW - 4 }));
    doc.font("Helvetica");
    y += 16;
    for (const row of rows.slice(0, 200)) {
      if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
      cols.forEach((c, i) => doc.text(String(row[c] ?? ""), 40 + i * colW, y, { width: colW - 4, height: 12, ellipsis: true }));
      y += 14;
    }
    doc.end();
  });
}

function buildReportCsv(rows: any[]): string {
  if (!rows.length) return "No data";
  return [Object.keys(rows[0]).join(","), ...rows.map(r => Object.values(r).map(v => JSON.stringify(v ?? "")).join(","))].join("\n");
}

// Real delivery: runs the report, attaches PDF or CSV, sends via SendGrid.
// Without SENDGRID_API_KEY it logs to notif_log as a simulated send.
async function sendScheduledReport(schedule: any): Promise<void> {
  const recipients: string[] = Array.isArray(schedule.recipients) ? schedule.recipients : [];
  let rows: any[] = [];
  let reportName = schedule.name || "Scheduled Report";
  if (schedule.report_id) {
    const rr = await pool.query(`SELECT * FROM bi_reports WHERE id=$1`, [schedule.report_id]);
    if (rr.rows.length) {
      const rep = rr.rows[0];
      reportName = rep.name || reportName;
      const config = rep.config || {};
      try { rows = await runDataSource(schedule.tenant_id, config.data_source, { ...config.filters, limit: config.limit }); }
      catch (e: any) { console.error("[ScheduledReport] query error:", e.message); }
    }
  }

  const format = schedule.format === "csv" ? "csv" : "pdf";
  const attachment = format === "pdf"
    ? { content: (await buildReportPdf(reportName, rows)).toString("base64"), type: "application/pdf", filename: `${reportName.replace(/[^a-z0-9]/gi, "_")}.pdf` }
    : { content: Buffer.from(buildReportCsv(rows)).toString("base64"), type: "text/csv", filename: `${reportName.replace(/[^a-z0-9]/gi, "_")}.csv` };

  const subject = `Scheduled Report: ${reportName}`;
  const body = `Your scheduled report "${reportName}" is attached (${format.toUpperCase()}, ${rows.length} rows).`;

  for (const email of recipients) {
    let sent = false, error = "";
    if (process.env.SENDGRID_API_KEY) {
      try {
        const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }], subject }],
            from: { email: process.env.FROM_EMAIL || "noreply@swacherp.com", name: "SwachERP Analytics" },
            content: [{ type: "text/plain", value: body }],
            attachments: [{ content: attachment.content, type: attachment.type, filename: attachment.filename, disposition: "attachment" }],
          }),
        });
        sent = resp.status === 202;
        if (!sent) error = `SendGrid ${resp.status}`;
      } catch (e: any) { error = e.message; }
    } else {
      console.log(`[ScheduledReport SIM] ${subject} → ${email} (${attachment.filename}, ${rows.length} rows)`);
      sent = true;
    }
    await pool.query(
      `INSERT INTO notif_log (tenant_id, channel, recipient, message, status, error_msg, entity_type, entity_id, sent_at)
       VALUES ($1,'email',$2,$3,$4,$5,'bi_scheduled_report',$6,${sent ? "NOW()" : "NULL"})`,
      [schedule.tenant_id, email, subject, sent ? "sent" : "failed", error || null, schedule.id]
    ).catch(() => {});
  }
}

analyticsRouter.post("/scheduled-reports/process-due", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const due = await pool.query(`SELECT * FROM bi_scheduled_reports WHERE is_active=true AND next_send_at <= NOW()`);
    let processed = 0, sent = 0;
    const errors: string[] = [];

    for (const sched of due.rows) {
      processed++;
      try {
        await sendScheduledReport(sched);
        const next = calcNextSendAt(sched.frequency, sched.send_day || 1, sched.send_hour || 8);
        await pool.query(
          `UPDATE bi_scheduled_reports SET last_sent_at=NOW(),next_send_at=$1 WHERE id=$2`,
          [next.toISOString(), sched.id]
        );
        sent++;
      } catch (e: any) {
        errors.push(`Schedule ${sched.id}: ${e.message}`);
      }
    }
    res.json({ processed, sent, errors });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/scheduled-reports/:id/send-now", requireAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(`SELECT * FROM bi_scheduled_reports WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid(req)]);
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    await sendScheduledReport(r.rows[0]);
    await pool.query(`UPDATE bi_scheduled_reports SET last_sent_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ success: true, message: "Report sent" });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── External BI Connector ────────────────────────────────────────────────────

// API keys are stored per tenant so Power BI / Tableau can authenticate without a session.
async function ensureApiKeyTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS bi_api_keys (
    id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL, label VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE, last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

// Accepts either a logged-in session OR Authorization: Bearer <api_key> / ?apikey=
const biConnectorAuth = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated?.() || req.user) return next();
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const key = bearer || String(req.query.apikey || "");
  if (!key) return res.status(401).json({ message: "Unauthorized — provide Authorization: Bearer <api_key>" });
  try {
    await ensureApiKeyTable();
    const r = await pool.query(`SELECT tenant_id FROM bi_api_keys WHERE api_key=$1 AND is_active=true`, [key]);
    if (!r.rows.length) return res.status(401).json({ message: "Invalid API key" });
    (req as any)._biTenantId = r.rows[0].tenant_id;
    pool.query(`UPDATE bi_api_keys SET last_used_at=NOW() WHERE api_key=$1`, [key]).catch(() => {});
    next();
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};
const biTid = (req: any): number => (req as any)._biTenantId ?? tid(req);

analyticsRouter.get("/bi-connector/odata", biConnectorAuth, async (req: any, res: any) => {
  res.json({
    "@odata.context": "$metadata",
    value: [
      { name: "GLMonthly", kind: "EntitySet", url: "GLMonthly" },
      { name: "Invoices", kind: "EntitySet", url: "Invoices" },
      { name: "HRPayroll", kind: "EntitySet", url: "HRPayroll" },
      { name: "CRMDeals", kind: "EntitySet", url: "CRMDeals" },
    ],
  });
});

analyticsRouter.get("/bi-connector/odata/GLMonthly", biConnectorAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const rows = await runDataSource(biTid(req), "gl_monthly", {});
    res.json({ "@odata.context": "../$metadata#GLMonthly", value: rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/bi-connector/odata/Invoices", biConnectorAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const rows = await runDataSource(biTid(req), "invoices_by_customer", {});
    res.json({ "@odata.context": "../$metadata#Invoices", value: rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/bi-connector/odata/HRPayroll", biConnectorAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const rows = await runDataSource(biTid(req), "hr_headcount", {});
    res.json({ "@odata.context": "../$metadata#HRPayroll", value: rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.get("/bi-connector/odata/CRMDeals", biConnectorAuth, async (req: any, res: any) => {
  await initOnce();
  try {
    const rows = await runDataSource(biTid(req), "crm_pipeline", {});
    res.json({ "@odata.context": "../$metadata#CRMDeals", value: rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

analyticsRouter.post("/bi-connector/api-key", requireAuth, async (req: any, res: any) => {
  const apiKey = crypto.randomBytes(24).toString("hex");
  await ensureApiKeyTable();
  await pool.query(
    `INSERT INTO bi_api_keys (tenant_id, api_key, label) VALUES ($1,$2,$3)`,
    [tid(req), apiKey, req.body?.label || "BI Connector"]
  );
  res.json({
    api_key: apiKey,
    instructions: {
      power_bi: "In Power BI, use 'Web' connector with URL: /api/analytics/bi-connector/odata and add header Authorization: Bearer <api_key>",
      tableau: "In Tableau, use JSON connector pointing to /api/analytics/bi-connector/schema with the API key header",
    },
    endpoints: {
      odata_feed: "/api/analytics/bi-connector/odata",
      schema: "/api/analytics/bi-connector/schema",
    },
  });
});

analyticsRouter.get("/bi-connector/schema", biConnectorAuth, async (req: any, res: any) => {
  res.json({
    version: "1.0",
    entities: Object.entries(DATA_SOURCE_META).map(([key, meta]) => ({
      name: key,
      label: meta.name,
      description: meta.description,
      columns: meta.available_columns.map((col) => ({ name: col, type: "string" })),
      endpoint: `/api/analytics/bi-connector/odata/${key}`,
    })),
  });
});

// ─── Scheduled Report Delivery ────────────────────────────────────────────────

// Called once on server boot
export function startAnalyticsScheduler() {
  // Run every 5 minutes
  setInterval(async () => {
    try {
      await processScheduledReports();
    } catch (e) {
      console.error('Analytics scheduler error:', e);
    }
  }, 5 * 60 * 1000);
  console.log('[Analytics] Scheduled report cron started (every 5 min)');
}

async function processScheduledReports() {
  // Ensure tables exist
  await pool.query(`CREATE TABLE IF NOT EXISTS bi_scheduled_reports (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    report_id INT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
    recipients JSONB DEFAULT '[]',
    next_send_at TIMESTAMP,
    last_sent_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  // Find due schedules
  const due = await pool.query(
    `SELECT s.*, r.name as report_name, r.data_source, r.custom_sql
     FROM bi_scheduled_reports s
     JOIN bi_reports r ON r.id = s.report_id
     WHERE s.is_active = true AND s.next_send_at <= NOW()`
  );

  for (const sched of due.rows) {
    try {
      // Run the report
      const runRes = await pool.query(
        `INSERT INTO bi_report_runs (tenant_id, report_id, status, started_at)
         VALUES ($1, $2, 'running', NOW()) RETURNING id`,
        [sched.tenant_id, sched.report_id]
      );
      const runId = runRes.rows[0].id;

      // Execute report query (safe — already stored, not user input at this point)
      let rows: any[] = [];
      try {
        const sql = sched.custom_sql || getDataSourceQuery(sched.data_source);
        const result = await pool.query(sql);
        rows = result.rows;
      } catch (qErr) {
        console.error('Analytics scheduler query error:', qErr);
      }

      // Deliver with PDF/CSV attachment via the shared sender
      const recipients: string[] = Array.isArray(sched.recipients) ? sched.recipients : [];
      try {
        await sendScheduledReport({ ...sched, recipients });
      } catch (notifErr) {
        console.error('Analytics scheduler delivery error:', notifErr);
      }

      // Calculate next_send_at
      const next = new Date();
      if (sched.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (sched.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (sched.frequency === 'monthly') next.setMonth(next.getMonth() + 1);

      await pool.query(
        `UPDATE bi_scheduled_reports SET next_send_at=$1, last_sent_at=NOW() WHERE id=$2`,
        [next, sched.id]
      );
      await pool.query(
        `UPDATE bi_report_runs SET status='completed', completed_at=NOW(), row_count=$1 WHERE id=$2`,
        [rows.length, runId]
      );

      console.log(`[Analytics] Delivered scheduled report "${sched.report_name}" to ${recipients.length} recipient(s)`);
    } catch (e) {
      console.error(`[Analytics] Failed schedule id ${sched.id}:`, e);
    }
  }
}

function getDataSourceQuery(source: string): string {
  const map: Record<string, string> = {
    gl_monthly: `SELECT date_trunc('month', created_at) as month, SUM(debit_amount) as total_debit, SUM(credit_amount) as total_credit FROM journal_lines GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    invoices_by_customer: `SELECT customer_name, COUNT(*) as invoice_count, SUM(total_amount) as total_value FROM invoices GROUP BY customer_name ORDER BY total_value DESC LIMIT 50`,
    hr_headcount: `SELECT department, COUNT(*) as headcount FROM hr_employees WHERE is_active=true GROUP BY department`,
    crm_pipeline: `SELECT stage, COUNT(*) as deals, SUM(value) as total_value FROM crm_deals GROUP BY stage`,
    vertical_revenue: `SELECT account_code, SUM(credit_amount - debit_amount) as revenue FROM journal_lines WHERE account_code BETWEEN '4000' AND '4999' GROUP BY account_code ORDER BY revenue DESC`,
  };
  return map[source] ?? `SELECT NOW() as generated_at, 'No data source' as message`;
}

// ─── Public Dashboard Router (no auth — token-gated, read-only) ──────────────
export const analyticsPublicRouter = Router();

analyticsPublicRouter.get("/dashboard/:token", async (req: any, res: any) => {
  await initOnce();
  try {
    const r = await pool.query(
      `SELECT * FROM bi_dashboards WHERE share_token=$1 AND is_public=true`,
      [req.params.token]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Dashboard not found or link revoked" });
    const dash = r.rows[0];
    if (dash.share_expires_at && new Date(dash.share_expires_at) < new Date()) {
      return res.status(410).json({ message: "Share link expired" });
    }
    const layout: any[] = dash.layout || [];
    const reportIds = Array.from(new Set(layout.map((l: any) => l.report_id).filter(Boolean))) as number[];
    const reportData: Record<number, any> = {};
    await Promise.allSettled(reportIds.map(async (rid) => {
      try {
        const rr = await pool.query(`SELECT * FROM bi_reports WHERE id=$1 AND tenant_id=$2`, [rid, dash.tenant_id]);
        if (!rr.rows.length) return;
        const rep = rr.rows[0];
        const config = rep.config || {};
        const rows = await runDataSource(dash.tenant_id, config.data_source, { ...config.filters, limit: config.limit });
        reportData[rid] = { name: rep.name, columns: rows.length ? Object.keys(rows[0]) : [], rows };
      } catch (e: any) { reportData[rid] = { error: e.message }; }
    }));
    res.json({
      name: dash.name, description: dash.description,
      layout, reports: reportIds.map((id) => ({ id, data: reportData[id] || null })),
      expires_at: dash.share_expires_at,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});
