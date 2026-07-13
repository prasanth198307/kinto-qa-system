import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const PERIODS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 3 Months", value: "last_3" },
  { label: "This Year", value: "this_year" },
];

function filterByPeriod(orders: any[], period: string) {
  const now = new Date();
  return orders.filter((o: any) => {
    const d = new Date(o.order_date || o.created_at || now);
    if (period === "this_month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "last_month") { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
    if (period === "last_3") return d >= new Date(now.getFullYear(), now.getMonth() - 3, 1);
    if (period === "this_year") return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const s: Record<string, any> = {
  page: { padding: 24, fontFamily: "sans-serif", background: "#f8f9fa", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  tabs: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const },
  tab: (active: boolean) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 400, background: active ? "#2563eb" : "#fff", color: active ? "#fff" : "#374151", borderColor: active ? "#2563eb" : "#d1d5db" }),
  toolbar: { display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" as const },
  select: { padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 },
  btn: { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, background: "#2563eb", color: "#fff" },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { padding: "8px 12px", textAlign: "left" as const, borderBottom: "2px solid #e5e7eb", fontWeight: 600, color: "#374151", background: "#f9fafb" },
  td: { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#111" },
};

const TABS = ["Sales by Channel", "Monthly Trend", "Top Products", "Return Analysis"];

export default function ReportsPage() {
  const [tab, setTab] = useState(0);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [period, setPeriod] = useState("this_month");

  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["ecom-orders"], queryFn: () => api("/api/ecommerce/orders") });
  const { data: commissions = {} } = useQuery<any>({ queryKey: ["ecom-commissions"], queryFn: () => api("/api/ecommerce/commissions/summary?year=2025") });
  const { data: returns_ = [] } = useQuery<any[]>({ queryKey: ["ecom-returns"], queryFn: () => api("/api/ecommerce/returns") });
  const { data: listings = [] } = useQuery<any[]>({ queryKey: ["ecom-listings"], queryFn: () => api("/api/ecommerce/listings") });

  const filtered = useMemo(() => filterByPeriod(orders, period), [orders, period]);

  // Sales by Channel
  const salesByChannel = useMemo(() => {
    const map: Record<string, any> = {};
    filtered.forEach((o: any) => {
      const ch = o.channel_name || "Unknown";
      if (!map[ch]) map[ch] = { channel: ch, orders: 0, gross: 0, returns: 0 };
      map[ch].orders++;
      map[ch].gross += Number(o.order_amount || o.total_amount || 0);
    });
    return Object.values(map).map(r => {
      const comm = (commissions as any)[r.channel] || 0;
      const returnRate = filtered.length ? ((r.returns / r.orders) * 100).toFixed(1) : "0.0";
      return { ...r, commission: comm, net: r.gross - comm, returnRate };
    });
  }, [filtered, commissions]);

  // Monthly Trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, any> = {};
    orders.forEach((o: any) => {
      const d = new Date(o.order_date || o.created_at || new Date());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, orders: 0, revenue: 0, returns: 0 };
      map[key].orders++;
      map[key].revenue += Number(o.order_amount || o.total_amount || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(r => ({ ...r, net: r.revenue - r.returns }));
  }, [orders]);

  // Top Products
  const topProducts = useMemo(() =>
    [...listings].sort((a: any, b: any) => Number(b.stock_qty || 0) - Number(a.stock_qty || 0)).slice(0, 20),
    [listings]
  );

  // Return Analysis
  const returnAnalysis = useMemo(() => {
    const map: Record<string, any> = {};
    (returns_ as any[]).forEach((r: any) => {
      const type = r.return_type || r.reason || "Other";
      if (!map[type]) map[type] = { type, count: 0, amount: 0 };
      map[type].count++;
      map[type].amount += Number(r.return_amount || 0);
    });
    const total = filtered.length || 1;
    return Object.values(map).map(r => ({ ...r, pct: ((r.count / total) * 100).toFixed(1) }));
  }, [returns_, filtered]);

  const handleExport = () => {
    if (tab === 0) exportCSV(["Channel","Orders","Gross Revenue","Commission","Net Revenue","Return Rate"], salesByChannel.map(r => [r.channel, r.orders, r.gross, r.commission, r.net, r.returnRate + "%"]), "sales-by-channel.csv");
    if (tab === 1) exportCSV(["Month","Orders","Revenue","Returns","Net"], monthlyTrend.map(r => [r.month, r.orders, r.revenue, r.returns, r.net]), "monthly-trend.csv");
    if (tab === 2) exportCSV(["SKU","Product","Stock Qty"], topProducts.map((r: any) => [r.sku || "", r.product_name || r.name || "", r.stock_qty || 0]), "top-products.csv");
    if (tab === 3) exportCSV(["Return Type","Count","Total Amount","% of Orders"], returnAnalysis.map(r => [r.type, r.count, r.amount, r.pct + "%"]), "return-analysis.csv");
  };

  const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>E-Commerce Reports</h1>
        <button style={s.btn} onClick={handleExport}>⬇ Export CSV</button>
      </div>

      <div style={s.toolbar}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Period:</label>
        <select style={s.select} value={period} onChange={e => setPeriod(e.target.value)}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div style={s.tabs}>{TABS.map((t, i) => <button key={t} style={s.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>)}</div>

      <div style={s.card}>
        {tab === 0 && (
          <table style={s.table}><thead><tr>{["Channel","Orders","Gross Revenue","Commission","Net Revenue","Return Rate"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{salesByChannel.length === 0 ? <tr><td colSpan={6} style={{ ...s.td, color: "#9ca3af", textAlign: "center" }}>No data</td></tr> : salesByChannel.map((r, i) => <tr key={i}><td style={s.td}>{r.channel}</td><td style={s.td}>{r.orders}</td><td style={s.td}>{fmt(r.gross)}</td><td style={s.td}>{fmt(r.commission)}</td><td style={s.td}>{fmt(r.net)}</td><td style={s.td}>{r.returnRate}%</td></tr>)}</tbody>
          </table>
        )}
        {tab === 1 && (
          <table style={s.table}><thead><tr>{["Month","Orders","Revenue","Returns","Net"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{monthlyTrend.length === 0 ? <tr><td colSpan={5} style={{ ...s.td, color: "#9ca3af", textAlign: "center" }}>No data</td></tr> : monthlyTrend.map((r, i) => <tr key={i}><td style={s.td}>{r.month}</td><td style={s.td}>{r.orders}</td><td style={s.td}>{fmt(r.revenue)}</td><td style={s.td}>{fmt(r.returns)}</td><td style={s.td}>{fmt(r.net)}</td></tr>)}</tbody>
          </table>
        )}
        {tab === 2 && (
          <table style={s.table}><thead><tr>{["SKU","Product Name","Stock Qty"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{topProducts.length === 0 ? <tr><td colSpan={3} style={{ ...s.td, color: "#9ca3af", textAlign: "center" }}>No data</td></tr> : topProducts.map((r: any, i: number) => <tr key={i}><td style={s.td}>{r.sku || "—"}</td><td style={s.td}>{r.product_name || r.name || "—"}</td><td style={s.td}>{r.stock_qty ?? 0}</td></tr>)}</tbody>
          </table>
        )}
        {tab === 3 && (
          <table style={s.table}><thead><tr>{["Return Type","Count","Total Amount","% of Orders"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{returnAnalysis.length === 0 ? <tr><td colSpan={4} style={{ ...s.td, color: "#9ca3af", textAlign: "center" }}>No data</td></tr> : returnAnalysis.map((r, i) => <tr key={i}><td style={s.td}>{r.type}</td><td style={s.td}>{r.count}</td><td style={s.td}>{fmt(r.amount)}</td><td style={s.td}>{r.pct}%</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
