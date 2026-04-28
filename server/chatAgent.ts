/**
 * Kinto Smart Ops — Local ERP Chat Agent
 * 80 intent handlers — no external AI API required.
 * Pure keyword/pattern matching → pre-built DB query → formatted response.
 */

import pkg from 'pg';
type Pool = InstanceType<typeof pkg.Pool>;

export interface ChatResponse {
  text: string;
  data?: {
    headers: string[];
    rows: (string | number | null)[][];
  };
  suggestions?: string[];
  intent?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rupees(paise: number | string | null): string {
  const n = Number(paise) || 0;
  return '₹' + (n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function num(v: number | string | null): string {
  return Number(v || 0).toLocaleString('en-IN');
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function monthLabel(): string {
  return new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// ── Intent Definition ─────────────────────────────────────────────────────────

interface Intent {
  id: string;
  // Each inner array is a phrase group; ALL words in a group must appear in the message
  groups: string[][];
  handler: (pool: Pool, tenantId: number, msg: string) => Promise<ChatResponse>;
}

// ── All 80 Intents ────────────────────────────────────────────────────────────

const INTENTS: Intent[] = [

  // ─── 1. GREETING ────────────────────────────────────────────────────────────
  {
    id: 'greeting',
    groups: [['hi'], ['hello'], ['hey'], ['namaste'], ['good morning'], ['good afternoon']],
    async handler() {
      return {
        text: `Hello! I'm your Kinto ERP assistant. Ask me anything about your sales, inventory, production, finances, or operations.`,
        suggestions: ['Total outstanding', 'Today\'s sales', 'Low stock items', 'Pending POs'],
      };
    },
  },

  // ─── 2. HELP ────────────────────────────────────────────────────────────────
  {
    id: 'help',
    groups: [['help'], ['what can you do'], ['what can you answer'], ['capabilities'], ['commands']],
    async handler() {
      return {
        text: `I can answer questions across all your modules:`,
        data: {
          headers: ['Module', 'Example questions'],
          rows: [
            ['Sales & Invoicing', 'Total outstanding, today\'s sales, overdue customers'],
            ['Purchase Orders', 'Pending POs, this month\'s purchases, overdue POs'],
            ['Inventory', 'Low stock, raw material levels, finished goods'],
            ['Production', 'Today\'s output, monthly production, by product'],
            ['Finance', 'Bank balance, receivables, payables, P&L'],
            ['Cash Register', 'Cash in hand, today\'s collections, expenses'],
            ['Expenses', 'Today\'s expenses, by category, pending approvals'],
            ['Advances', 'Advance balance, unapplied advances'],
            ['Maintenance', 'Overdue tasks, upcoming maintenance'],
            ['Dispatch', 'Pending dispatches, today\'s gatepasses'],
            ['HR', 'Present staff, pending leaves, payroll'],
            ['Documents', 'Expiring documents, expired docs'],
            ['Spare Parts', 'Low spare parts, issued this month'],
            ['TDS', 'TDS deducted, TDS payable'],
            ['Logistics', 'Active vehicles, drivers, transporters'],
          ],
        },
        suggestions: ['Outstanding total', 'Low stock', 'Today\'s sales', 'Pending POs'],
      };
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // SALES & INVOICING
  // ══════════════════════════════════════════════════════════════════════════════

  // ─── 3. Outstanding total ────────────────────────────────────────────────────
  {
    id: 'outstanding_total',
    groups: [['total outstanding'], ['outstanding total'], ['how much outstanding'], ['overall outstanding'], ['total pending payment'], ['total receivable']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt,
               SUM(total_amount - COALESCE(amount_received,0)) as total
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status NOT IN ('cancelled','paid')
          AND total_amount > COALESCE(amount_received,0)
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Total outstanding across **${num(row.cnt)} invoices** is **${rupees(row.total)}**.`,
        suggestions: ['Overdue customers', 'Top customers outstanding', 'Today\'s collections'],
      };
    },
  },

  // ─── 4. Overdue invoices ─────────────────────────────────────────────────────
  {
    id: 'overdue_invoices',
    groups: [['overdue customer'], ['overdue invoice'], ['not paid 30'], ['pending more than 30'], ['overdue payment']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT buyer_name,
               COUNT(*) as invoices,
               SUM(total_amount - COALESCE(amount_received,0)) as outstanding,
               MAX(CURRENT_DATE - invoice_date::date) as max_days
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status NOT IN ('cancelled','paid')
          AND total_amount > COALESCE(amount_received,0)
          AND invoice_date < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY buyer_name
        ORDER BY outstanding DESC
        LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No overdue invoices found. All customers are within 30 days.', suggestions: ['Total outstanding'] };
      return {
        text: `Found **${r.rows.length} customers** with invoices older than 30 days:`,
        data: {
          headers: ['Customer', 'Invoices', 'Outstanding', 'Oldest (days)'],
          rows: r.rows.map(x => [x.buyer_name, x.invoices, rupees(x.outstanding), x.max_days]),
        },
        suggestions: ['Total outstanding', 'Today\'s sales'],
      };
    },
  },

  // ─── 5. Today's sales ────────────────────────────────────────────────────────
  {
    id: 'sales_today',
    groups: [['today sales'], ['sales today'], ['today invoice'], ['invoices today'], ['today\'s sales']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(total_amount) as total
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status != 'cancelled'
          AND invoice_date::date = CURRENT_DATE
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Today **${num(row.cnt)} invoices** worth **${rupees(row.total)}** were raised.`,
        suggestions: ['This month\'s sales', 'Today\'s dispatches', 'Cash collected today'],
      };
    },
  },

  // ─── 6. This month's sales ───────────────────────────────────────────────────
  {
    id: 'sales_month',
    groups: [['this month sales'], ['month sales'], ['monthly sales'], ['sales this month'], ['month revenue'], ['monthly revenue']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(total_amount) as total
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status != 'cancelled'
          AND invoice_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `Sales in **${monthLabel()}**: **${num(row.cnt)} invoices** totalling **${rupees(row.total)}**.`,
        suggestions: ['Invoice count this month', 'Today\'s sales', 'Top customers outstanding'],
      };
    },
  },

  // ─── 7. Top customers by outstanding ────────────────────────────────────────
  {
    id: 'top_customers_outstanding',
    groups: [['top customer'], ['who owes most'], ['highest outstanding'], ['biggest outstanding'], ['most outstanding']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT buyer_name,
               COUNT(*) as invoices,
               SUM(total_amount - COALESCE(amount_received,0)) as outstanding
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status NOT IN ('cancelled','paid')
          AND total_amount > COALESCE(amount_received,0)
        GROUP BY buyer_name
        ORDER BY outstanding DESC
        LIMIT 10
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No outstanding found.' };
      return {
        text: `Top ${r.rows.length} customers by outstanding amount:`,
        data: {
          headers: ['Customer', 'Invoices', 'Outstanding'],
          rows: r.rows.map(x => [x.buyer_name, x.invoices, rupees(x.outstanding)]),
        },
        suggestions: ['Overdue customers', 'Total outstanding'],
      };
    },
  },

  // ─── 8. Pending credit notes ─────────────────────────────────────────────────
  {
    id: 'pending_credit_notes',
    groups: [['pending credit note'], ['open credit note'], ['credit note pending']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(grand_total) as total
        FROM credit_notes
        WHERE tenant_id=$1 AND record_status=1 AND status='draft'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} pending credit notes** worth **${rupees(row.total)}**.`,
        suggestions: ['Credit notes issued this month', 'Total outstanding'],
      };
    },
  },

  // ─── 9. Invoice count ────────────────────────────────────────────────────────
  {
    id: 'invoice_count',
    groups: [['how many invoice'], ['invoice count'], ['number of invoice'], ['invoices raised']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as month_cnt,
               (SELECT COUNT(*) FROM invoices WHERE tenant_id=$1 AND record_status=1 AND status!='cancelled' AND invoice_date::date=CURRENT_DATE) as today_cnt
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status != 'cancelled'
          AND invoice_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `**${num(row.today_cnt)} invoices today** | **${num(row.month_cnt)} invoices in ${monthLabel()}**.`,
        suggestions: ['This month\'s sales', 'Today\'s sales'],
      };
    },
  },

  // ─── 10. Customer outstanding (specific) ────────────────────────────────────
  {
    id: 'customer_outstanding',
    groups: [['outstanding for'], ['balance for'], ['how much does'], ['owes us']],
    async handler(pool, tenantId, msg) {
      // extract name after "for" or "does"
      const match = msg.match(/(?:for|does|by)\s+(.+?)(?:\s+owe|\s+outstanding|\s+balance|$)/i);
      const name = match ? match[1].trim() : '';
      if (!name || name.length < 2) {
        return { text: 'Please specify a customer name. E.g. "Outstanding for ABC Traders".' };
      }
      const r = await pool.query(`
        SELECT buyer_name,
               COUNT(*) as invoices,
               SUM(total_amount - COALESCE(amount_received,0)) as outstanding
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status NOT IN ('cancelled','paid')
          AND total_amount > COALESCE(amount_received,0)
          AND LOWER(buyer_name) LIKE LOWER($2)
        GROUP BY buyer_name
      `, [tenantId, `%${name}%`]);
      if (!r.rows.length) return { text: `No outstanding found for customers matching "${name}".` };
      return {
        text: `Outstanding for customers matching "${name}":`,
        data: {
          headers: ['Customer', 'Invoices', 'Outstanding'],
          rows: r.rows.map(x => [x.buyer_name, x.invoices, rupees(x.outstanding)]),
        },
      };
    },
  },

  // ─── 11. Credit notes issued this month ────────────────────────────────────
  {
    id: 'credit_notes_issued',
    groups: [['credit note issued'], ['credit notes this month'], ['issued credit note']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(grand_total) as total
        FROM credit_notes
        WHERE tenant_id=$1 AND record_status=1 AND status='issued'
          AND created_at >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} credit notes issued** in ${monthLabel()} worth **${rupees(row.total)}**.`,
        suggestions: ['Pending credit notes', 'Sales returns this month'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASE ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 12. Pending POs ────────────────────────────────────────────────────────
  {
    id: 'pending_po',
    groups: [['pending purchase order'], ['open purchase order'], ['open po'], ['pending po'], ['purchase order pending']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(grand_total) as total
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1 AND status='pending'
      `, [tenantId]);
      const rows2 = await pool.query(`
        SELECT po_number, vendor_name, grand_total, po_date::date as dt
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1 AND status='pending'
        ORDER BY po_date DESC LIMIT 10
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} pending purchase orders** worth **${rupees(row.total)}**.`,
        data: rows2.rows.length ? {
          headers: ['PO Number', 'Vendor', 'Amount', 'Date'],
          rows: rows2.rows.map(x => [x.po_number, x.vendor_name, rupees(x.grand_total), x.dt]),
        } : undefined,
        suggestions: ['POs not yet received', 'This month\'s purchases'],
      };
    },
  },

  // ─── 13. Purchases this month ────────────────────────────────────────────────
  {
    id: 'purchases_month',
    groups: [['purchases this month'], ['monthly purchases'], ['purchase total'], ['how much purchased'], ['purchases month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(grand_total) as total
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status != 'cancelled'
          AND po_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} purchase orders** in ${monthLabel()} worth **${rupees(row.total)}**.`,
        suggestions: ['Pending POs', 'Top vendors by purchase'],
      };
    },
  },

  // ─── 14. PO count ───────────────────────────────────────────────────────────
  {
    id: 'po_count',
    groups: [['how many po'], ['number of po'], ['po count'], ['purchase order count']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
        GROUP BY status ORDER BY cnt DESC
      `, [tenantId]);
      return {
        text: `Purchase order breakdown:`,
        data: {
          headers: ['Status', 'Count'],
          rows: r.rows.map(x => [x.status, x.cnt]),
        },
        suggestions: ['Pending POs', 'Purchases this month'],
      };
    },
  },

  // ─── 15. Top vendors by purchase ────────────────────────────────────────────
  {
    id: 'top_vendors_purchase',
    groups: [['top vendor'], ['biggest vendor'], ['most purchased from'], ['highest purchase vendor']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT vendor_name, COUNT(*) as orders, SUM(grand_total) as total
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1 AND status != 'cancelled'
          AND po_date >= $2
        GROUP BY vendor_name ORDER BY total DESC LIMIT 10
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No purchase orders in ${monthLabel()}.` };
      return {
        text: `Top vendors by purchase in ${monthLabel()}:`,
        data: {
          headers: ['Vendor', 'Orders', 'Total'],
          rows: r.rows.map(x => [x.vendor_name, x.orders, rupees(x.total)]),
        },
      };
    },
  },

  // ─── 16. POs not yet received ────────────────────────────────────────────────
  {
    id: 'pending_po_delivery',
    groups: [['po not received'], ['pending delivery po'], ['po awaiting delivery'], ['purchase not delivered']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT po_number, vendor_name, grand_total, expected_delivery_date::date as expected
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status IN ('pending','approved')
          AND actual_delivery_date IS NULL
        ORDER BY expected_delivery_date ASC LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'All purchase orders have been delivered.' };
      return {
        text: `**${r.rows.length} POs** pending delivery:`,
        data: {
          headers: ['PO Number', 'Vendor', 'Amount', 'Expected Delivery'],
          rows: r.rows.map(x => [x.po_number, x.vendor_name, rupees(x.grand_total), x.expected || 'Not set']),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 17. Low stock ──────────────────────────────────────────────────────────
  {
    id: 'low_stock',
    groups: [['low stock'], ['below reorder'], ['stock low'], ['items running low'], ['reorder level']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT material_name, material_code, current_stock, reorder_level
        FROM raw_materials
        WHERE tenant_id=$1 AND record_status=1
          AND reorder_level IS NOT NULL
          AND current_stock <= reorder_level
        ORDER BY (current_stock::float / NULLIF(reorder_level,0)) ASC
        LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'All raw materials are above reorder levels.' };
      return {
        text: `**${r.rows.length} items** are at or below reorder level:`,
        data: {
          headers: ['Material', 'Code', 'Current Stock', 'Reorder Level'],
          rows: r.rows.map(x => [x.material_name, x.material_code, num(x.current_stock), num(x.reorder_level)]),
        },
        suggestions: ['Raw material stock levels', 'Pending POs'],
      };
    },
  },

  // ─── 18. Raw material stock ──────────────────────────────────────────────────
  {
    id: 'raw_material_stock',
    groups: [['raw material stock'], ['raw material level'], ['current raw material'], ['material stock']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT material_name, material_code, current_stock, reorder_level, unit_cost
        FROM raw_materials
        WHERE tenant_id=$1 AND record_status=1
        ORDER BY current_stock DESC LIMIT 20
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No raw materials found.' };
      return {
        text: `Raw material stock levels (top 20 by quantity):`,
        data: {
          headers: ['Material', 'Code', 'Stock', 'Reorder Level'],
          rows: r.rows.map(x => [x.material_name, x.material_code, num(x.current_stock), num(x.reorder_level) || '—']),
        },
        suggestions: ['Low stock items', 'Stock value'],
      };
    },
  },

  // ─── 19. Finished goods stock ────────────────────────────────────────────────
  {
    id: 'finished_goods_stock',
    groups: [['finished good'], ['finished goods stock'], ['fg stock'], ['finished product stock']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT p.product_name, SUM(fg.quantity) as qty, fg.quality_status
        FROM finished_goods fg
        JOIN products p ON p.id = fg.product_id
        WHERE fg.tenant_id=$1 AND fg.record_status=1
        GROUP BY p.product_name, fg.quality_status
        ORDER BY qty DESC LIMIT 20
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No finished goods in stock.' };
      return {
        text: `Finished goods inventory:`,
        data: {
          headers: ['Product', 'Quantity', 'Quality Status'],
          rows: r.rows.map(x => [x.product_name, num(x.qty), x.quality_status || 'approved']),
        },
        suggestions: ['Production today', 'Low stock items'],
      };
    },
  },

  // ─── 20. Stock value ────────────────────────────────────────────────────────
  {
    id: 'stock_value',
    groups: [['stock value'], ['inventory value'], ['value of stock'], ['total stock value']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(current_stock * unit_cost) as total_value, COUNT(*) as items
        FROM raw_materials
        WHERE tenant_id=$1 AND record_status=1 AND unit_cost IS NOT NULL
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Raw material inventory value: **${rupees(Number(row.total_value || 0) * 100)}** across **${num(row.items)} materials**.`,
        suggestions: ['Raw material stock', 'Low stock items'],
      };
    },
  },

  // ─── 21. Stock movement today ────────────────────────────────────────────────
  {
    id: 'stock_movement_today',
    groups: [['stock moved today'], ['stock movement today'], ['material issued today'], ['issuance today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT rm.material_name, SUM(rii.quantity_issued) as qty
        FROM raw_material_issuance ri
        JOIN raw_material_issuance_items rii ON rii.issuance_id = ri.id
        JOIN raw_materials rm ON rm.id = rii.raw_material_id
        WHERE ri.tenant_id=$1 AND ri.record_status=1
          AND ri.issuance_date::date = CURRENT_DATE
        GROUP BY rm.material_name
        ORDER BY qty DESC
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No stock issued today.' };
      return {
        text: `Materials issued today:`,
        data: {
          headers: ['Material', 'Quantity Issued'],
          rows: r.rows.map(x => [x.material_name, num(x.qty)]),
        },
      };
    },
  },

  // ─── 22. Specific item stock ─────────────────────────────────────────────────
  {
    id: 'item_stock',
    groups: [['how much'], ['stock of'], ['quantity of'], ['how many']],
    async handler(pool, tenantId, msg) {
      // Try to extract item name
      const match = msg.match(/(?:how much|stock of|quantity of|how many)\s+(.+?)(?:\s+in stock|\s+available|\s+do we have|[?]|$)/i);
      const name = match ? match[1].trim() : '';
      if (!name || name.length < 2) {
        return { text: 'Please specify an item. E.g. "How much 20L jar is in stock?"' };
      }
      const r = await pool.query(`
        SELECT material_name, material_code, current_stock
        FROM raw_materials
        WHERE tenant_id=$1 AND record_status=1
          AND LOWER(material_name) LIKE LOWER($2)
        LIMIT 5
      `, [tenantId, `%${name}%`]);
      if (!r.rows.length) return { text: `No material found matching "${name}".` };
      return {
        text: `Stock for items matching "${name}":`,
        data: {
          headers: ['Material', 'Code', 'Stock'],
          rows: r.rows.map(x => [x.material_name, x.material_code, num(x.current_stock)]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTION
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 23. Production today ────────────────────────────────────────────────────
  {
    id: 'production_today',
    groups: [['production today'], ['today production'], ['produced today'], ['output today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT p.product_name, SUM(pe.produced_quantity) as produced, SUM(pe.rejected_quantity) as rejected
        FROM production_entries pe
        LEFT JOIN products p ON p.id = pe.product_id
        WHERE pe.tenant_id=$1 AND pe.record_status=1
          AND pe.production_date::date = CURRENT_DATE
        GROUP BY p.product_name
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No production entries for today.' };
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.produced), 0);
      return {
        text: `Today's production — **${num(total)} units** produced:`,
        data: {
          headers: ['Product', 'Produced', 'Rejected'],
          rows: r.rows.map(x => [x.product_name || 'N/A', num(x.produced), num(x.rejected)]),
        },
        suggestions: ['Monthly production', 'Production by product'],
      };
    },
  },

  // ─── 24. Production this month ──────────────────────────────────────────────
  {
    id: 'production_month',
    groups: [['production this month'], ['monthly production'], ['month production'], ['production month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT p.product_name, SUM(pe.produced_quantity) as produced, SUM(pe.rejected_quantity) as rejected
        FROM production_entries pe
        LEFT JOIN products p ON p.id = pe.product_id
        WHERE pe.tenant_id=$1 AND pe.record_status=1
          AND pe.production_date >= $2
        GROUP BY p.product_name ORDER BY produced DESC
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No production entries in ${monthLabel()}.` };
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.produced), 0);
      return {
        text: `Production in **${monthLabel()}** — **${num(total)} total units**:`,
        data: {
          headers: ['Product', 'Produced', 'Rejected'],
          rows: r.rows.map(x => [x.product_name || 'N/A', num(x.produced), num(x.rejected)]),
        },
        suggestions: ['Production today', 'Finished goods stock'],
      };
    },
  },

  // ─── 25. Production by product ──────────────────────────────────────────────
  {
    id: 'production_by_product',
    groups: [['how many produced'], ['units produced'], ['production of'], ['produced this week'], ['produced this month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT p.product_name, SUM(pe.produced_quantity) as produced
        FROM production_entries pe
        LEFT JOIN products p ON p.id = pe.product_id
        WHERE pe.tenant_id=$1 AND pe.record_status=1
          AND pe.production_date >= $2
        GROUP BY p.product_name ORDER BY produced DESC
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No production entries in ${monthLabel()}.` };
      return {
        text: `Units produced per product in ${monthLabel()}:`,
        data: {
          headers: ['Product', 'Units Produced'],
          rows: r.rows.map(x => [x.product_name || 'N/A', num(x.produced)]),
        },
      };
    },
  },

  // ─── 26. Production efficiency ──────────────────────────────────────────────
  {
    id: 'production_efficiency',
    groups: [['production efficiency'], ['rejection rate'], ['quality of production'], ['how much rejected']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(produced_quantity) as produced, SUM(rejected_quantity) as rejected
        FROM production_entries
        WHERE tenant_id=$1 AND record_status=1 AND production_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      const prod = Number(row.produced) || 0;
      const rej = Number(row.rejected) || 0;
      const rate = prod > 0 ? ((rej / prod) * 100).toFixed(1) : '0';
      return {
        text: `In ${monthLabel()}: **${num(prod)} produced**, **${num(rej)} rejected** (**${rate}% rejection rate**).`,
        suggestions: ['Production today', 'Monthly production'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE & ACCOUNTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 27. Total receivables ───────────────────────────────────────────────────
  {
    id: 'total_receivables',
    groups: [['total receivable'], ['accounts receivable'], ['how much to receive'], ['receivable balance']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(total_amount - COALESCE(amount_received,0)) as total, COUNT(*) as cnt
        FROM invoices
        WHERE tenant_id=$1 AND record_status=1
          AND status NOT IN ('cancelled','paid')
          AND total_amount > COALESCE(amount_received,0)
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Total receivables: **${rupees(row.total)}** across **${num(row.cnt)} invoices**.`,
        suggestions: ['Total outstanding', 'Overdue customers'],
      };
    },
  },

  // ─── 28. Total payables ─────────────────────────────────────────────────────
  {
    id: 'total_payables',
    groups: [['total payable'], ['how much we owe'], ['accounts payable'], ['vendor payable'], ['payable balance']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(grand_total) as total, COUNT(*) as cnt
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status IN ('pending','approved')
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Total payables (pending POs): **${rupees(row.total)}** across **${num(row.cnt)} orders**.`,
        suggestions: ['Pending vendor payments', 'Pending POs'],
      };
    },
  },

  // ─── 29. Bank balance ───────────────────────────────────────────────────────
  {
    id: 'bank_balance',
    groups: [['bank balance'], ['current balance bank'], ['how much in bank'], ['account balance']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT name, current_balance
        FROM banks
        WHERE tenant_id=$1 AND record_status=1 AND is_active=true
        ORDER BY current_balance DESC
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No bank accounts configured.' };
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.current_balance || 0), 0);
      return {
        text: `Total bank balance: **${rupees(total * 100)}** across **${r.rows.length} accounts**.`,
        data: {
          headers: ['Bank Account', 'Balance'],
          rows: r.rows.map(x => [x.name, rupees(Number(x.current_balance || 0) * 100)]),
        },
        suggestions: ['Cash in hand', 'Total receivables'],
      };
    },
  },

  // ─── 30. Pending vendor payments ────────────────────────────────────────────
  {
    id: 'pending_vendor_payments',
    groups: [['pending vendor payment'], ['vendor payment pending'], ['vendors to pay'], ['outstanding payable']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT vendor_name, COUNT(*) as orders, SUM(grand_total) as total
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status IN ('pending','approved')
        GROUP BY vendor_name ORDER BY total DESC LIMIT 10
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No pending vendor payments.' };
      return {
        text: `Top vendors with pending payments:`,
        data: {
          headers: ['Vendor', 'Orders', 'Total Owed'],
          rows: r.rows.map(x => [x.vendor_name, x.orders, rupees(x.total)]),
        },
      };
    },
  },

  // ─── 31. Expenses this month ────────────────────────────────────────────────
  {
    id: 'expense_month',
    groups: [['expense this month'], ['monthly expense'], ['total expense'], ['expenses month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(total_amount) as total
        FROM expense_vouchers
        WHERE tenant_id=$1 AND record_status=1
          AND voucher_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `Expenses in **${monthLabel()}**: **${num(row.cnt)} vouchers** worth **${rupees(row.total)}**.`,
        suggestions: ['Expenses by category', 'Top expense categories', 'Bank balance'],
      };
    },
  },

  // ─── 32. Quick P&L ──────────────────────────────────────────────────────────
  {
    id: 'pl_summary',
    groups: [['p&l'], ['profit loss'], ['profit and loss'], ['pl this month'], ['monthly pl']],
    async handler(pool, tenantId) {
      const [sales, expense] = await Promise.all([
        pool.query(`SELECT SUM(total_amount) as total FROM invoices WHERE tenant_id=$1 AND record_status=1 AND status!='cancelled' AND invoice_date>=$2`, [tenantId, monthStart()]),
        pool.query(`SELECT SUM(total_amount) as total FROM expense_vouchers WHERE tenant_id=$1 AND record_status=1 AND voucher_date>=$2`, [tenantId, monthStart()]),
      ]);
      const rev = Number(sales.rows[0].total) || 0;
      const exp = Number(expense.rows[0].total) || 0;
      const profit = rev - exp;
      return {
        text: `**Quick P&L — ${monthLabel()}**\n\nRevenue: **${rupees(rev)}**\nExpenses: **${rupees(exp)}**\nNet Profit: **${rupees(profit)}** ${profit >= 0 ? '▲' : '▼'}`,
        suggestions: ['This month\'s sales', 'Expenses this month', 'Bank balance'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CASH REGISTER
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 33. Cash in hand ───────────────────────────────────────────────────────
  {
    id: 'cash_in_hand',
    groups: [['cash in hand'], ['cash on hand'], ['how much cash'], ['cash balance today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT salesperson_name, closing_balance, total_cash_received, status
        FROM cash_register_days
        WHERE tenant_id=$1 AND register_date = CURRENT_DATE
        ORDER BY closing_balance DESC
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No cash register entries for today.' };
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.closing_balance || 0), 0);
      return {
        text: `Cash in hand today: **${rupees(total)}** across **${r.rows.length} registers**.`,
        data: r.rows.length > 1 ? {
          headers: ['Salesperson', 'Cash Balance', 'Collected', 'Status'],
          rows: r.rows.map(x => [x.salesperson_name, rupees(x.closing_balance), rupees(x.total_cash_received), x.status]),
        } : undefined,
        suggestions: ['Cash collected today', 'Cash register status'],
      };
    },
  },

  // ─── 34. Cash collections today ─────────────────────────────────────────────
  {
    id: 'cash_collections_today',
    groups: [['cash collected today'], ['collection today'], ['cash received today'], ['today collection']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(total_cash_received) as total, COUNT(*) as registers
        FROM cash_register_days
        WHERE tenant_id=$1 AND register_date = CURRENT_DATE
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Cash collected today: **${rupees(row.total)}** across **${num(row.registers)} salesperson registers**.`,
        suggestions: ['Cash in hand', 'Cash register status'],
      };
    },
  },

  // ─── 35. Cash register expenses ─────────────────────────────────────────────
  {
    id: 'cash_register_expenses',
    groups: [['cash expense'], ['register expense'], ['cash expense today'], ['petty cash expense']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(total_expenses) as total
        FROM cash_register_days
        WHERE tenant_id=$1 AND register_date = CURRENT_DATE
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Cash register expenses today: **${rupees(row.total || 0)}**.`,
        suggestions: ['Cash in hand', 'Expenses today'],
      };
    },
  },

  // ─── 36. Cash register status ────────────────────────────────────────────────
  {
    id: 'cash_register_status',
    groups: [['cash register closed'], ['register status'], ['cash register open'], ['register open today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT salesperson_name, status, opening_balance, closing_balance
        FROM cash_register_days
        WHERE tenant_id=$1 AND register_date = CURRENT_DATE
        ORDER BY salesperson_name
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No cash registers opened today.' };
      return {
        text: `Cash register status today:`,
        data: {
          headers: ['Salesperson', 'Status', 'Opening', 'Closing'],
          rows: r.rows.map(x => [x.salesperson_name, x.status, rupees(x.opening_balance), rupees(x.closing_balance)]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPENSES
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 37. Expenses today ─────────────────────────────────────────────────────
  {
    id: 'expenses_today',
    groups: [['expense today'], ['expenses today'], ['voucher today'], ['expense entered today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT voucher_number, payee_name, total_amount
        FROM expense_vouchers
        WHERE tenant_id=$1 AND record_status=1 AND voucher_date = CURRENT_DATE
        ORDER BY total_amount DESC LIMIT 10
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No expense vouchers entered today.' };
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.total_amount), 0);
      return {
        text: `**${r.rows.length} expense vouchers** today totalling **${rupees(total)}**:`,
        data: {
          headers: ['Voucher #', 'Payee', 'Amount'],
          rows: r.rows.map(x => [x.voucher_number, x.payee_name, rupees(x.total_amount)]),
        },
      };
    },
  },

  // ─── 38. Expenses by category ────────────────────────────────────────────────
  {
    id: 'expenses_by_category',
    groups: [['expense by category'], ['expense category'], ['category wise expense'], ['how much spent on']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT ec.name as category, COUNT(*) as vouchers, SUM(ev.total_amount) as total
        FROM expense_vouchers ev
        LEFT JOIN expense_categories ec ON ec.id = ev.category_id
        WHERE ev.tenant_id=$1 AND ev.record_status=1 AND ev.voucher_date >= $2
        GROUP BY ec.name ORDER BY total DESC LIMIT 10
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No expenses in ${monthLabel()}.` };
      return {
        text: `Expenses by category in ${monthLabel()}:`,
        data: {
          headers: ['Category', 'Vouchers', 'Total'],
          rows: r.rows.map(x => [x.category || 'Uncategorised', x.vouchers, rupees(x.total)]),
        },
      };
    },
  },

  // ─── 39. Pending expense approvals ──────────────────────────────────────────
  {
    id: 'pending_expense_approvals',
    groups: [['pending expense'], ['expense pending approval'], ['expense approval'], ['unapproved expense']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(total_amount) as total
        FROM expense_vouchers
        WHERE tenant_id=$1 AND record_status=1 AND status='draft'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} expense vouchers** pending approval worth **${rupees(row.total)}**.`,
        suggestions: ['Expenses this month', 'Expenses today'],
      };
    },
  },

  // ─── 40. Top expense categories ─────────────────────────────────────────────
  {
    id: 'top_expense_categories',
    groups: [['top expense category'], ['highest expense'], ['most expensive category'], ['biggest expense']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT ec.name as category, SUM(ev.total_amount) as total
        FROM expense_vouchers ev
        LEFT JOIN expense_categories ec ON ec.id = ev.category_id
        WHERE ev.tenant_id=$1 AND ev.record_status=1 AND ev.voucher_date >= $2
        GROUP BY ec.name ORDER BY total DESC LIMIT 5
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No expenses in ${monthLabel()}.` };
      return {
        text: `Top expense categories in ${monthLabel()}:`,
        data: {
          headers: ['Category', 'Total Spent'],
          rows: r.rows.map(x => [x.category || 'Uncategorised', rupees(x.total)]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER ADVANCES
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 41. Advance balance ────────────────────────────────────────────────────
  {
    id: 'advance_balance',
    groups: [['advance balance'], ['total advance'], ['customer advance'], ['pending advance']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt,
               SUM(amount) as total,
               SUM(amount - used_amount) as balance
        FROM customer_advances
        WHERE tenant_id=$1 AND record_status=1 AND status='active'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} active advances** — Total received: **${rupees(row.total)}** | Balance unused: **${rupees(row.balance)}**.`,
        suggestions: ['Unapplied advances', 'Outstanding total'],
      };
    },
  },

  // ─── 42. Advance by customer ─────────────────────────────────────────────────
  {
    id: 'advance_by_customer',
    groups: [['advance of customer'], ['advance for customer'], ['advance balance of']],
    async handler(pool, tenantId, msg) {
      const match = msg.match(/(?:advance of|advance for|advance balance of)\s+(.+?)(?:\s+customer|[?]|$)/i);
      const name = match ? match[1].trim() : '';
      if (!name) return { text: 'Please specify a customer name.' };
      const r = await pool.query(`
        SELECT v.vendor_name, ca.amount, ca.used_amount, ca.amount - ca.used_amount as balance, ca.status
        FROM customer_advances ca
        JOIN vendors v ON v.id = ca.vendor_id
        WHERE ca.tenant_id=$1 AND ca.record_status=1
          AND LOWER(v.vendor_name) LIKE LOWER($2)
        ORDER BY ca.receipt_date DESC LIMIT 10
      `, [tenantId, `%${name}%`]);
      if (!r.rows.length) return { text: `No advances found for "${name}".` };
      return {
        text: `Advances for customers matching "${name}":`,
        data: {
          headers: ['Customer', 'Amount', 'Used', 'Balance', 'Status'],
          rows: r.rows.map(x => [x.vendor_name, rupees(x.amount), rupees(x.used_amount), rupees(x.balance), x.status]),
        },
      };
    },
  },

  // ─── 43. Unapplied advances ──────────────────────────────────────────────────
  {
    id: 'unapplied_advances',
    groups: [['unapplied advance'], ['unused advance'], ['advance not applied'], ['advance not used']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT v.vendor_name, ca.amount - ca.used_amount as balance, ca.receipt_date::date as dt
        FROM customer_advances ca
        JOIN vendors v ON v.id = ca.vendor_id
        WHERE ca.tenant_id=$1 AND ca.record_status=1
          AND ca.status='active'
          AND ca.amount > ca.used_amount
        ORDER BY balance DESC LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'All advances have been applied.' };
      return {
        text: `Customers with unapplied advance balances:`,
        data: {
          headers: ['Customer', 'Unused Balance', 'Receipt Date'],
          rows: r.rows.map(x => [x.vendor_name, rupees(x.balance), x.dt]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVENTIVE MAINTENANCE
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 44. Overdue maintenance ─────────────────────────────────────────────────
  {
    id: 'overdue_maintenance',
    groups: [['overdue maintenance'], ['maintenance overdue'], ['missed maintenance'], ['pending maintenance overdue']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT m.machine_name, mp.plan_name, mp.next_due_date::date as due
        FROM maintenance_plans mp
        JOIN machines m ON m.id = mp.machine_id
        WHERE mp.tenant_id=$1 AND mp.record_status=1
          AND mp.status='active'
          AND mp.next_due_date < CURRENT_DATE
        ORDER BY mp.next_due_date ASC LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No overdue maintenance tasks.' };
      return {
        text: `**${r.rows.length} overdue maintenance tasks**:`,
        data: {
          headers: ['Machine', 'Plan', 'Was Due'],
          rows: r.rows.map(x => [x.machine_name, x.plan_name, x.due]),
        },
        suggestions: ['Upcoming maintenance', 'Machine status'],
      };
    },
  },

  // ─── 45. Upcoming maintenance ────────────────────────────────────────────────
  {
    id: 'upcoming_maintenance',
    groups: [['upcoming maintenance'], ['maintenance due this week'], ['maintenance next 7 days'], ['due maintenance']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT m.machine_name, mp.plan_name, mp.next_due_date::date as due
        FROM maintenance_plans mp
        JOIN machines m ON m.id = mp.machine_id
        WHERE mp.tenant_id=$1 AND mp.record_status=1
          AND mp.status='active'
          AND mp.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        ORDER BY mp.next_due_date ASC
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No maintenance due in the next 7 days.' };
      return {
        text: `**${r.rows.length} maintenance tasks** due in the next 7 days:`,
        data: {
          headers: ['Machine', 'Plan', 'Due Date'],
          rows: r.rows.map(x => [x.machine_name, x.plan_name, x.due]),
        },
      };
    },
  },

  // ─── 46. Machine status ──────────────────────────────────────────────────────
  {
    id: 'machine_status',
    groups: [['machine status'], ['which machine'], ['machine need attention'], ['machine condition']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT machine_name, status, location
        FROM machines
        WHERE tenant_id=$1 AND record_status=1
        ORDER BY machine_name
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No machines configured.' };
      return {
        text: `**${r.rows.length} machines** registered:`,
        data: {
          headers: ['Machine', 'Status', 'Location'],
          rows: r.rows.map(x => [x.machine_name, x.status || 'Active', x.location || '—']),
        },
        suggestions: ['Overdue maintenance', 'Upcoming maintenance'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPATCH & GATEPASSES
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 47. Pending dispatches ──────────────────────────────────────────────────
  {
    id: 'pending_dispatch',
    groups: [['pending dispatch'], ['pending gatepass'], ['dispatch pending'], ['gatepass not closed'], ['open gatepass']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM gatepasses
        WHERE tenant_id=$1 AND record_status=1 AND status='generated'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} dispatches** pending (gatepass generated, not closed).`,
        suggestions: ['Today\'s dispatches', 'Gatepass count this month'],
      };
    },
  },

  // ─── 48. Dispatches today ────────────────────────────────────────────────────
  {
    id: 'dispatch_today',
    groups: [['dispatch today'], ['gatepass today'], ['dispatched today'], ['delivery today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, COUNT(CASE WHEN status='closed' THEN 1 END) as closed
        FROM gatepasses
        WHERE tenant_id=$1 AND record_status=1
          AND gatepass_date::date = CURRENT_DATE
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} gatepasses** raised today — **${num(row.closed)} closed**, **${num(Number(row.cnt) - Number(row.closed))} pending**.`,
        suggestions: ['Pending dispatches', 'Today\'s sales'],
      };
    },
  },

  // ─── 49. Gatepass count this month ──────────────────────────────────────────
  {
    id: 'gatepass_count',
    groups: [['gatepass count'], ['gatepass this month'], ['how many gatepass'], ['number of gatepass']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM gatepasses
        WHERE tenant_id=$1 AND record_status=1
          AND gatepass_date >= $2
        GROUP BY status
      `, [tenantId, monthStart()]);
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.cnt), 0);
      return {
        text: `**${total} gatepasses** in ${monthLabel()}:`,
        data: {
          headers: ['Status', 'Count'],
          rows: r.rows.map(x => [x.status, x.cnt]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HR
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 50. Attendance today ────────────────────────────────────────────────────
  {
    id: 'attendance_today',
    groups: [['present today'], ['attendance today'], ['staff present'], ['how many staff'], ['employees present']],
    async handler(pool, tenantId) {
      const total = await pool.query(`SELECT COUNT(*) as cnt FROM hr_employees WHERE tenant_id=$1 AND status='active'`, [tenantId]);
      const present = await pool.query(`
        SELECT COUNT(*) as cnt FROM hr_attendance
        WHERE tenant_id=$1 AND attendance_date = CURRENT_DATE AND status='present'
      `, [tenantId]);
      const t = Number(total.rows[0].cnt);
      const p = Number(present.rows[0].cnt);
      return {
        text: `**${p} out of ${t} employees** are present today.`,
        suggestions: ['Pending leaves', 'Payroll status'],
      };
    },
  },

  // ─── 51. Pending leaves ──────────────────────────────────────────────────────
  {
    id: 'pending_leaves',
    groups: [['pending leave'], ['leave request pending'], ['leave approval'], ['unapproved leave']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM hr_leave_requests
        WHERE tenant_id=$1 AND status='pending'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} leave requests** pending approval.`,
        suggestions: ['Attendance today', 'Payroll status'],
      };
    },
  },

  // ─── 52. Payroll status ──────────────────────────────────────────────────────
  {
    id: 'payroll_status',
    groups: [['payroll status'], ['payroll processed'], ['salary processed'], ['payroll this month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT status, COUNT(*) as cnt, SUM(net_pay) as total
        FROM hr_payroll_runs
        WHERE tenant_id=$1 AND pay_period_start >= $2
        GROUP BY status
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No payroll run found for ${monthLabel()}.` };
      return {
        text: `Payroll status for ${monthLabel()}:`,
        data: {
          headers: ['Status', 'Employees', 'Net Pay'],
          rows: r.rows.map(x => [x.status, x.cnt, rupees(x.total)]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SALES RETURNS & NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 53. Sales returns this month ────────────────────────────────────────────
  {
    id: 'sales_returns_month',
    groups: [['sales return'], ['return this month'], ['how many return'], ['return month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, sr.status
        FROM sales_returns sr
        WHERE sr.tenant_id=$1 AND sr.record_status=1
          AND sr.return_date >= $2
        GROUP BY sr.status
      `, [tenantId, monthStart()]);
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.cnt), 0);
      if (!total) return { text: `No sales returns in ${monthLabel()}.` };
      return {
        text: `**${total} sales returns** in ${monthLabel()}:`,
        data: {
          headers: ['Status', 'Count'],
          rows: r.rows.map(x => [x.status, x.cnt]),
        },
        suggestions: ['Credit notes issued', 'Top return customers'],
      };
    },
  },

  // ─── 54. Return value this month ─────────────────────────────────────────────
  {
    id: 'return_value_month',
    groups: [['return value'], ['value of returns'], ['how much returned'], ['return amount']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(i.total_amount) as total, COUNT(*) as cnt
        FROM sales_returns sr
        JOIN invoices i ON i.id = sr.invoice_id
        WHERE sr.tenant_id=$1 AND sr.record_status=1
          AND sr.return_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `Return value in ${monthLabel()}: **${num(row.cnt)} returns** worth **${rupees(row.total)}**.`,
        suggestions: ['Sales returns this month', 'Credit notes issued'],
      };
    },
  },

  // ─── 55. Pending debit notes ─────────────────────────────────────────────────
  {
    id: 'pending_debit_notes',
    groups: [['pending debit note'], ['open debit note'], ['debit note pending']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(grand_total) as total
        FROM debit_notes
        WHERE tenant_id=$1 AND record_status=1 AND status='draft'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${num(row.cnt)} pending debit notes** worth **${rupees(row.total)}**.`,
        suggestions: ['Pending credit notes'],
      };
    },
  },

  // ─── 56. Top return customers ────────────────────────────────────────────────
  {
    id: 'top_return_customers',
    groups: [['top return customer'], ['customer return most'], ['most returns customer'], ['highest return customer']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT i.buyer_name, COUNT(*) as returns
        FROM sales_returns sr
        JOIN invoices i ON i.id = sr.invoice_id
        WHERE sr.tenant_id=$1 AND sr.record_status=1
          AND sr.return_date >= $2
        GROUP BY i.buyer_name ORDER BY returns DESC LIMIT 10
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No sales returns in ${monthLabel()}.` };
      return {
        text: `Customers with most returns in ${monthLabel()}:`,
        data: {
          headers: ['Customer', 'Returns'],
          rows: r.rows.map(x => [x.buyer_name, x.returns]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDORS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 57. Vendor count ────────────────────────────────────────────────────────
  {
    id: 'vendor_count',
    groups: [['how many vendor'], ['vendor count'], ['number of vendor'], ['active vendor']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt FROM vendors
        WHERE tenant_id=$1 AND record_status=1 AND is_active='true'
      `, [tenantId]);
      return {
        text: `**${num(r.rows[0].cnt)} active vendors** registered.`,
        suggestions: ['Top vendors by purchase', 'Pending vendor payments'],
      };
    },
  },

  // ─── 58. New vendors this month ──────────────────────────────────────────────
  {
    id: 'new_vendors_month',
    groups: [['new vendor'], ['vendor added this month'], ['vendors this month']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt FROM vendors
        WHERE tenant_id=$1 AND record_status=1 AND created_at >= $2
      `, [tenantId, monthStart()]);
      return {
        text: `**${num(r.rows[0].cnt)} new vendors** added in ${monthLabel()}.`,
        suggestions: ['Total vendor count', 'Top vendors'],
      };
    },
  },

  // ─── 59. Vendor outstanding ──────────────────────────────────────────────────
  {
    id: 'vendor_outstanding',
    groups: [['we owe vendor'], ['what we owe'], ['vendor balance'], ['owe to vendor']],
    async handler(pool, tenantId, msg) {
      const match = msg.match(/(?:vendor|to|owe)\s+(.+?)(?:\?|$)/i);
      const name = match ? match[1].trim() : '';
      if (!name || name.length < 2) {
        return { text: 'Please specify a vendor name. E.g. "What do we owe Ramesh Traders?"' };
      }
      const r = await pool.query(`
        SELECT vendor_name, SUM(grand_total) as total, COUNT(*) as orders
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status IN ('pending','approved')
          AND LOWER(vendor_name) LIKE LOWER($2)
        GROUP BY vendor_name
      `, [tenantId, `%${name}%`]);
      if (!r.rows.length) return { text: `No pending payables found for "${name}".` };
      return {
        text: `Pending payables for "${name}":`,
        data: {
          headers: ['Vendor', 'Orders', 'Total Owed'],
          rows: r.rows.map(x => [x.vendor_name, x.orders, rupees(x.total)]),
        },
      };
    },
  },

  // ─── 60. Top vendors overdue ─────────────────────────────────────────────────
  {
    id: 'top_vendors_overdue',
    groups: [['overdue vendor payment'], ['vendor overdue'], ['vendor payment overdue'], ['late vendor payment']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT vendor_name, COUNT(*) as orders, SUM(grand_total) as total,
               MAX(CURRENT_DATE - po_date::date) as days_pending
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status IN ('pending','approved')
          AND po_date < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY vendor_name ORDER BY total DESC LIMIT 10
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No overdue vendor payments.' };
      return {
        text: `Vendors with overdue payments (>30 days):`,
        data: {
          headers: ['Vendor', 'Orders', 'Total', 'Oldest (days)'],
          rows: r.rows.map(x => [x.vendor_name, x.orders, rupees(x.total), x.days_pending]),
        },
      };
    },
  },

  // ─── 61. Vendor purchase history ─────────────────────────────────────────────
  {
    id: 'vendor_purchase_history',
    groups: [['purchase from vendor'], ['bought from'], ['vendor purchase'], ['how much from vendor']],
    async handler(pool, tenantId, msg) {
      const match = msg.match(/(?:from|vendor)\s+(.+?)(?:\s+this month|\s+month|\?|$)/i);
      const name = match ? match[1].trim() : '';
      if (!name || name.length < 2) {
        return { text: 'Please specify a vendor. E.g. "How much did we buy from Ramesh Traders this month?"' };
      }
      const r = await pool.query(`
        SELECT vendor_name, COUNT(*) as orders, SUM(grand_total) as total
        FROM purchase_orders
        WHERE tenant_id=$1 AND record_status=1
          AND status != 'cancelled'
          AND po_date >= $2
          AND LOWER(vendor_name) LIKE LOWER($3)
        GROUP BY vendor_name
      `, [tenantId, monthStart(), `%${name}%`]);
      if (!r.rows.length) return { text: `No purchases from "${name}" in ${monthLabel()}.` };
      return {
        text: `Purchases from "${name}" in ${monthLabel()}:`,
        data: {
          headers: ['Vendor', 'Orders', 'Total'],
          rows: r.rows.map(x => [x.vendor_name, x.orders, rupees(x.total)]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCRAP & SPARE PARTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 62. Scrap stock ────────────────────────────────────────────────────────
  {
    id: 'scrap_stock',
    groups: [['scrap stock'], ['scrap inventory'], ['current scrap'], ['scrap quantity']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT p.product_name, SUM(si.quantity) as qty
        FROM scrap_inventory si
        JOIN products p ON p.id = si.product_id
        WHERE si.tenant_id=$1 AND si.record_status=1
        GROUP BY p.product_name ORDER BY qty DESC
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No scrap inventory.' };
      return {
        text: `Current scrap inventory:`,
        data: {
          headers: ['Product', 'Quantity'],
          rows: r.rows.map(x => [x.product_name, num(x.qty)]),
        },
      };
    },
  },

  // ─── 63. Spare parts low ─────────────────────────────────────────────────────
  {
    id: 'spare_parts_low',
    groups: [['spare part low'], ['low spare'], ['spare running low'], ['spare part stock']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT part_name, part_code, current_stock, reorder_level
        FROM spare_parts_catalog
        WHERE tenant_id=$1 AND record_status=1
          AND reorder_level IS NOT NULL
          AND current_stock <= reorder_level
        ORDER BY current_stock ASC LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'All spare parts are above reorder levels.' };
      return {
        text: `**${r.rows.length} spare parts** below reorder level:`,
        data: {
          headers: ['Part Name', 'Code', 'Stock', 'Reorder Level'],
          rows: r.rows.map(x => [x.part_name, x.part_code, num(x.current_stock), num(x.reorder_level)]),
        },
        suggestions: ['Spare parts issued this month', 'Pending POs'],
      };
    },
  },

  // ─── 64. Spare parts issued this month ──────────────────────────────────────
  {
    id: 'spare_parts_issued_month',
    groups: [['spare part issued'], ['spare issued this month'], ['spare parts used'], ['how many spare']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT sp.part_name, SUM(spi.quantity) as qty
        FROM spare_part_issuances spi
        JOIN spare_parts_catalog sp ON sp.id = spi.spare_part_id
        WHERE spi.tenant_id=$1 AND spi.record_status=1
          AND spi.issuance_date >= $2
        GROUP BY sp.part_name ORDER BY qty DESC LIMIT 10
      `, [tenantId, monthStart()]);
      if (!r.rows.length) return { text: `No spare parts issued in ${monthLabel()}.` };
      return {
        text: `Spare parts issued in ${monthLabel()}:`,
        data: {
          headers: ['Part', 'Quantity Issued'],
          rows: r.rows.map(x => [x.part_name, num(x.qty)]),
        },
      };
    },
  },

  // ─── 65. Scrap value ────────────────────────────────────────────────────────
  {
    id: 'scrap_value',
    groups: [['scrap value'], ['value of scrap'], ['scrap worth']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as items, SUM(si.quantity) as total_qty
        FROM scrap_inventory si
        WHERE si.tenant_id=$1 AND si.record_status=1
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `Total scrap inventory: **${num(row.total_qty)} units** across **${num(row.items)} entries**.`,
        suggestions: ['Scrap stock breakdown'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TDS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 66. TDS deducted this month ────────────────────────────────────────────
  {
    id: 'tds_deducted_month',
    groups: [['tds deducted'], ['tds this month'], ['total tds'], ['tds amount']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt, SUM(tds_amount) as total
        FROM tds_entries
        WHERE tenant_id=$1 AND record_status=1
          AND entry_date >= $2
      `, [tenantId, monthStart()]);
      const row = r.rows[0];
      return {
        text: `TDS deducted in ${monthLabel()}: **${rupees(row.total)}** across **${num(row.cnt)} entries**.`,
        suggestions: ['TDS by vendor', 'TDS payable'],
      };
    },
  },

  // ─── 67. TDS by vendor ──────────────────────────────────────────────────────
  {
    id: 'tds_by_vendor',
    groups: [['tds for vendor'], ['tds deducted vendor'], ['vendor tds']],
    async handler(pool, tenantId, msg) {
      const match = msg.match(/(?:for|from|of|vendor)\s+(.+?)(?:\?|tds|$)/i);
      const name = match ? match[1].trim() : '';
      if (!name || name.length < 2) {
        return { text: 'Please specify a vendor. E.g. "TDS deducted for Ramesh Traders".' };
      }
      const r = await pool.query(`
        SELECT vendor_name, SUM(tds_amount) as total, SUM(gross_amount) as gross
        FROM tds_entries
        WHERE tenant_id=$1 AND record_status=1
          AND LOWER(vendor_name) LIKE LOWER($2)
          AND entry_date >= $3
        GROUP BY vendor_name
      `, [tenantId, `%${name}%`, monthStart()]);
      if (!r.rows.length) return { text: `No TDS entries for "${name}" in ${monthLabel()}.` };
      return {
        text: `TDS for "${name}" in ${monthLabel()}:`,
        data: {
          headers: ['Vendor', 'Gross Amount', 'TDS Deducted'],
          rows: r.rows.map(x => [x.vendor_name, rupees(x.gross), rupees(x.total)]),
        },
      };
    },
  },

  // ─── 68. TDS payable ────────────────────────────────────────────────────────
  {
    id: 'tds_payable',
    groups: [['tds payable'], ['tds due payment'], ['tds to pay'], ['pending tds']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(tds_amount) as total, COUNT(*) as cnt
        FROM tds_entries
        WHERE tenant_id=$1 AND record_status=1 AND status='pending'
      `, [tenantId]);
      const row = r.rows[0];
      return {
        text: `**${rupees(row.total)}** TDS payable across **${num(row.cnt)} entries**.`,
        suggestions: ['TDS deducted this month'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 69. Active vehicles ────────────────────────────────────────────────────
  {
    id: 'active_vehicles',
    groups: [['active vehicle'], ['how many vehicle'], ['vehicle count'], ['vehicles registered']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt FROM vehicles WHERE tenant_id=$1 AND record_status=1
      `, [tenantId]);
      return {
        text: `**${num(r.rows[0].cnt)} vehicles** registered.`,
        suggestions: ['Driver count', 'Transporter count'],
      };
    },
  },

  // ─── 70. Driver count ────────────────────────────────────────────────────────
  {
    id: 'driver_count',
    groups: [['how many driver'], ['driver count'], ['drivers registered'], ['active driver']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt FROM drivers WHERE tenant_id=$1 AND record_status=1
      `, [tenantId]);
      return {
        text: `**${num(r.rows[0].cnt)} drivers** registered.`,
        suggestions: ['Active vehicles', 'Transporter count'],
      };
    },
  },

  // ─── 71. Transporter count ───────────────────────────────────────────────────
  {
    id: 'transporter_count',
    groups: [['transporter count'], ['how many transporter'], ['transporters registered']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT COUNT(*) as cnt FROM transporters WHERE tenant_id=$1 AND record_status=1
      `, [tenantId]);
      return {
        text: `**${num(r.rows[0].cnt)} transporters** registered.`,
        suggestions: ['Active vehicles', 'Driver count'],
      };
    },
  },

  // ─── 72. Vehicles by transporter ─────────────────────────────────────────────
  {
    id: 'vehicle_by_transporter',
    groups: [['vehicle of transporter'], ['transporter vehicle'], ['how many vehicle transporter']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT t.name as transporter, COUNT(v.id) as vehicles
        FROM transporters t
        LEFT JOIN vehicles v ON v.transporter_id = t.id AND v.record_status=1
        WHERE t.tenant_id=$1 AND t.record_status=1
        GROUP BY t.name ORDER BY vehicles DESC
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No transporters configured.' };
      return {
        text: `Vehicles by transporter:`,
        data: {
          headers: ['Transporter', 'Vehicles'],
          rows: r.rows.map(x => [x.transporter, x.vehicles]),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUDGETS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 73. Budget vs actual ────────────────────────────────────────────────────
  {
    id: 'budget_vs_actual',
    groups: [['budget vs actual'], ['budget tracking'], ['actual vs budget'], ['how budget']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT b.name, bi.period_label,
               SUM(bi.budgeted_amount) as budgeted,
               SUM(bi.actual_amount) as actual
        FROM budget_items bi
        JOIN budgets b ON b.id = bi.budget_id
        WHERE b.tenant_id=$1 AND b.record_status=1 AND b.status='active'
          AND bi.period_label = $2
        GROUP BY b.name, bi.period_label
      `, [tenantId, monthLabel()]);
      if (!r.rows.length) return { text: `No active budget configured for ${monthLabel()}.` };
      return {
        text: `Budget vs Actual for ${monthLabel()}:`,
        data: {
          headers: ['Budget', 'Period', 'Budgeted', 'Actual'],
          rows: r.rows.map(x => [x.name, x.period_label, rupees(x.budgeted), rupees(x.actual)]),
        },
      };
    },
  },

  // ─── 74. Budget overrun ──────────────────────────────────────────────────────
  {
    id: 'budget_overrun',
    groups: [['budget overrun'], ['exceeded budget'], ['over budget'], ['budget exceeded']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT bi.account_name,
               bi.budgeted_amount,
               bi.actual_amount,
               bi.actual_amount - bi.budgeted_amount as overrun
        FROM budget_items bi
        JOIN budgets b ON b.id = bi.budget_id
        WHERE b.tenant_id=$1 AND b.record_status=1 AND b.status='active'
          AND bi.actual_amount > bi.budgeted_amount
          AND bi.period_label = $2
        ORDER BY overrun DESC LIMIT 10
      `, [tenantId, monthLabel()]);
      if (!r.rows.length) return { text: `No budget overruns in ${monthLabel()}.` };
      return {
        text: `Categories over budget in ${monthLabel()}:`,
        data: {
          headers: ['Account', 'Budgeted', 'Actual', 'Overrun'],
          rows: r.rows.map(x => [x.account_name, rupees(x.budgeted_amount), rupees(x.actual_amount), rupees(x.overrun)]),
        },
      };
    },
  },

  // ─── 75. Remaining budget ────────────────────────────────────────────────────
  {
    id: 'remaining_budget',
    groups: [['remaining budget'], ['budget left'], ['budget balance'], ['how much budget left']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT SUM(bi.budgeted_amount) as budgeted, SUM(bi.actual_amount) as actual
        FROM budget_items bi
        JOIN budgets b ON b.id = bi.budget_id
        WHERE b.tenant_id=$1 AND b.record_status=1 AND b.status='active'
          AND bi.period_label = $2
      `, [tenantId, monthLabel()]);
      const row = r.rows[0];
      if (!row.budgeted) return { text: `No active budget for ${monthLabel()}.` };
      const remaining = Number(row.budgeted) - Number(row.actual || 0);
      return {
        text: `Budget for ${monthLabel()}: **${rupees(row.budgeted)}** budgeted — **${rupees(row.actual)}** spent — **${rupees(remaining)} remaining**.`,
        suggestions: ['Budget vs actual', 'Budget overrun'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 76. Expiring documents ──────────────────────────────────────────────────
  {
    id: 'expiring_documents',
    groups: [['expiring document'], ['document expire soon'], ['documents expiring'], ['document due to expire']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT title, expiry_date::date as expiry,
               expiry_date::date - CURRENT_DATE as days_left
        FROM documents
        WHERE tenant_id=$1 AND record_status=1
          AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ORDER BY expiry_date ASC LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No documents expiring in the next 30 days.' };
      return {
        text: `**${r.rows.length} documents** expiring in the next 30 days:`,
        data: {
          headers: ['Document', 'Expiry Date', 'Days Left'],
          rows: r.rows.map(x => [x.title, x.expiry, x.days_left]),
        },
        suggestions: ['Expired documents'],
      };
    },
  },

  // ─── 77. Expired documents ───────────────────────────────────────────────────
  {
    id: 'expired_documents',
    groups: [['expired document'], ['document already expired'], ['documents expired']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT title, expiry_date::date as expiry
        FROM documents
        WHERE tenant_id=$1 AND record_status=1
          AND expiry_date < CURRENT_DATE
        ORDER BY expiry_date DESC LIMIT 15
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No expired documents found.' };
      return {
        text: `**${r.rows.length} expired documents**:`,
        data: {
          headers: ['Document', 'Expired On'],
          rows: r.rows.map(x => [x.title, x.expiry]),
        },
        suggestions: ['Expiring documents'],
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WHATSAPP / CHECKLISTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 78. Checklist completion today ─────────────────────────────────────────
  {
    id: 'checklist_completion_today',
    groups: [['checklist completed today'], ['checklist today'], ['how many checklist'], ['checklist done today']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM checklist_assignments
        WHERE tenant_id=$1 AND record_status=1
          AND assigned_date = CURRENT_DATE
        GROUP BY status
      `, [tenantId]);
      const total = r.rows.reduce((s: number, x: any) => s + Number(x.cnt), 0);
      if (!total) return { text: 'No checklists assigned today.' };
      return {
        text: `**${total} checklists** today:`,
        data: {
          headers: ['Status', 'Count'],
          rows: r.rows.map(x => [x.status, x.cnt]),
        },
        suggestions: ['Pending checklists', 'Machine startup today'],
      };
    },
  },

  // ─── 79. Pending checklists ──────────────────────────────────────────────────
  {
    id: 'pending_checklists',
    groups: [['pending checklist'], ['incomplete checklist'], ['checklist pending'], ['checklist not done']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT m.machine_name, ca.shift, ca.assigned_date::date as dt
        FROM checklist_assignments ca
        JOIN machines m ON m.id = ca.machine_id
        WHERE ca.tenant_id=$1 AND ca.record_status=1
          AND ca.status = 'pending'
          AND ca.assigned_date = CURRENT_DATE
        ORDER BY m.machine_name
      `, [tenantId]);
      if (!r.rows.length) return { text: 'All checklists for today are completed.' };
      return {
        text: `**${r.rows.length} pending checklists** for today:`,
        data: {
          headers: ['Machine', 'Shift', 'Date'],
          rows: r.rows.map(x => [x.machine_name, x.shift || '—', x.dt]),
        },
      };
    },
  },

  // ─── 80. Machine startup today ───────────────────────────────────────────────
  {
    id: 'machine_startup_today',
    groups: [['machine started today'], ['startup today'], ['machine startup'], ['which machine started']],
    async handler(pool, tenantId) {
      const r = await pool.query(`
        SELECT DISTINCT m.machine_name, ca.shift
        FROM checklist_assignments ca
        JOIN machines m ON m.id = ca.machine_id
        WHERE ca.tenant_id=$1 AND ca.record_status=1
          AND ca.assigned_date = CURRENT_DATE
          AND ca.status IN ('submitted','approved')
        ORDER BY m.machine_name
      `, [tenantId]);
      if (!r.rows.length) return { text: 'No machines started (checklist completed) today yet.' };
      return {
        text: `**${r.rows.length} machines** started today (checklist complete):`,
        data: {
          headers: ['Machine', 'Shift'],
          rows: r.rows.map(x => [x.machine_name, x.shift || '—']),
        },
        suggestions: ['Pending checklists'],
      };
    },
  },
];

// ── Intent Matching Engine ────────────────────────────────────────────────────

function matchIntent(message: string): Intent | null {
  const normalized = message.toLowerCase().trim();
  let bestIntent: Intent | null = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    for (const group of intent.groups) {
      // Check if ALL words in this group appear in the message
      const allMatch = group.every(word => normalized.includes(word));
      if (allMatch) {
        // Score = total characters of matched keywords (longer = more specific)
        const score = group.reduce((s, w) => s + w.length, 0);
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }
    }
  }

  return bestIntent;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function processMessage(
  pool: Pool,
  tenantId: number,
  message: string,
): Promise<ChatResponse> {
  const intent = matchIntent(message);

  if (!intent) {
    return {
      text: `I didn't understand that. Try asking about:`,
      suggestions: ['Total outstanding', 'Today\'s sales', 'Low stock', 'Pending POs', 'Help'],
      intent: 'unknown',
    };
  }

  try {
    const response = await intent.handler(pool, tenantId, message);
    return { ...response, intent: intent.id };
  } catch (err: any) {
    console.error(`[ChatAgent] Error in intent "${intent.id}":`, err?.message);
    return {
      text: `Sorry, I couldn't fetch that data right now. Please try again.`,
      intent: intent.id,
    };
  }
}
