import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const apiFetch = (u: string) => fetch(u, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const apiPost = (u: string, b: any) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtPct = (n: any) => Number(n || 0).toFixed(1) + "%";
const fmtNum = (n: any) => Number(n || 0).toLocaleString();

const REPORTS = [
  { id: "daily-summary",    label: "Daily Summary",      icon: "📊" },
  { id: "hourly-sales",     label: "Hourly Sales",       icon: "⏰" },
  { id: "item-wise",        label: "Item Wise Sales",    icon: "🍽️" },
  { id: "category-wise",   label: "Category Wise",      icon: "📁" },
  { id: "cashier-shift",   label: "Cashier / Shift",    icon: "👤" },
  { id: "void-discount",   label: "Voids & Discounts",  icon: "🚫" },
  { id: "complimentary",   label: "Complimentary",      icon: "🎁" },
  { id: "table-analytics", label: "Table Analytics",    icon: "🪑" },
  { id: "gst-summary",     label: "GST Summary",        icon: "🧾" },
  { id: "payment-modes",   label: "Payment Modes",      icon: "💳" },
  { id: "wastage-summary", label: "Wastage Summary",    icon: "🗑️" },
  { id: "food-cost",       label: "Food Cost Analysis", icon: "🥗" },
  { id: "loyalty-summary", label: "Loyalty Summary",    icon: "⭐" },
  { id: "outlet-comparison",label: "Outlet Comparison", icon: "🏪" },
  { id: "franchise",       label: "Franchise Summary",  icon: "🏢" },
  { id: "feedback",        label: "Customer Feedback",  icon: "💬" },
  { id: "eod-email",       label: "EOD Email",          icon: "📧" },
  { id: "tally-export",    label: "Tally Export",       icon: "📤" },
];

type ColFormat = "currency" | "pct" | "number" | "text" | "badge";
type ColDef = { key: string; label: string; format?: ColFormat };

const COLS: Record<string, ColDef[]> = {
  "daily-summary": [
    { key: "date", label: "Date" },
    { key: "orders", label: "Orders", format: "number" },
    { key: "covers", label: "Covers", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "gst", label: "GST Collected", format: "currency" },
    { key: "avg_bill", label: "Avg Bill", format: "currency" },
    { key: "voids", label: "Voids", format: "number" },
    { key: "discounts", label: "Discounts", format: "currency" },
  ],
  "hourly-sales": [
    { key: "hour", label: "Hour" },
    { key: "orders", label: "Orders", format: "number" },
    { key: "covers", label: "Covers", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
  ],
  "item-wise": [
    { key: "item_name", label: "Item" },
    { key: "category", label: "Category", format: "badge" },
    { key: "qty_sold", label: "Qty Sold", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "avg_price", label: "Avg Price", format: "currency" },
    { key: "food_cost", label: "Food Cost", format: "currency" },
    { key: "margin_pct", label: "Margin%", format: "pct" },
  ],
  "category-wise": [
    { key: "category", label: "Category" },
    { key: "items_count", label: "Items", format: "number" },
    { key: "qty_sold", label: "Qty Sold", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "pct_of_total", label: "% of Total", format: "pct" },
  ],
  "cashier-shift": [
    { key: "cashier_name", label: "Cashier" },
    { key: "shift_name", label: "Shift" },
    { key: "opening_cash", label: "Opening ₹", format: "currency" },
    { key: "total_sales", label: "Sales", format: "currency" },
    { key: "closing_cash", label: "Closing ₹", format: "currency" },
    { key: "variance", label: "Variance", format: "currency" },
  ],
  "void-discount": [
    { key: "table_number", label: "Table" },
    { key: "item_name", label: "Item" },
    { key: "amount", label: "Amount", format: "currency" },
    { key: "reason", label: "Reason" },
    { key: "created_at", label: "Time" },
  ],
  "complimentary": [
    { key: "kot_number", label: "KOT#" },
    { key: "table_number", label: "Table" },
    { key: "grand_total", label: "Amount", format: "currency" },
    { key: "nc_reason", label: "Reason" },
    { key: "cashier_name", label: "Approved By" },
    { key: "created_at", label: "Time" },
  ],
  "table-analytics": [
    { key: "table_number", label: "Table" },
    { key: "total_orders", label: "Orders", format: "number" },
    { key: "total_covers", label: "Covers", format: "number" },
    { key: "total_revenue", label: "Revenue", format: "currency" },
    { key: "avg_bill", label: "Avg Bill", format: "currency" },
    { key: "avg_turnaround_mins", label: "Avg Time (min)", format: "number" },
  ],
  "gst-summary": [
    { key: "gst_rate", label: "GST Rate", format: "pct" },
    { key: "taxable_amount", label: "Taxable Amt", format: "currency" },
    { key: "gst_amount", label: "GST Amount", format: "currency" },
    { key: "total", label: "Total", format: "currency" },
  ],
  "payment-modes": [
    { key: "payment_mode", label: "Mode", format: "badge" },
    { key: "count", label: "Transactions", format: "number" },
    { key: "amount", label: "Amount", format: "currency" },
    { key: "pct_of_total", label: "% Share", format: "pct" },
  ],
  "wastage-summary": [
    { key: "item_name", label: "Item" },
    { key: "quantity", label: "Qty", format: "number" },
    { key: "unit", label: "Unit" },
    { key: "reason", label: "Reason", format: "badge" },
    { key: "total_cost", label: "Cost", format: "currency" },
  ],
  "food-cost": [
    { key: "item_name", label: "Item" },
    { key: "qty_sold", label: "Qty Sold", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "total_food_cost", label: "Food Cost", format: "currency" },
    { key: "food_cost_pct", label: "Cost%", format: "pct" },
    { key: "margin_pct", label: "Margin%", format: "pct" },
  ],
  "loyalty-summary": [
    { key: "tier", label: "Tier", format: "badge" },
    { key: "members", label: "Members", format: "number" },
    { key: "points_earned", label: "Points Earned", format: "number" },
    { key: "points_redeemed", label: "Points Redeemed", format: "number" },
    { key: "redemption_value", label: "Redemption ₹", format: "currency" },
  ],
  "outlet-comparison": [
    { key: "outlet_name", label: "Outlet" },
    { key: "orders", label: "Orders", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "avg_bill", label: "Avg Bill", format: "currency" },
    { key: "top_item", label: "Top Item" },
  ],
  "franchise": [
    { key: "outlet_name", label: "Outlet" },
    { key: "outlet_code", label: "Code" },
    { key: "revenue_mtd", label: "Revenue MTD", format: "currency" },
    { key: "orders_mtd", label: "Orders", format: "number" },
    { key: "royalty_pct", label: "Royalty%", format: "pct" },
    { key: "royalty_due", label: "Royalty Due", format: "currency" },
  ],
};

function renderCell(col: ColDef, row: any) {
  const val = row[col.key];
  if (val === null || val === undefined) return <span className="text-gray-400">—</span>;
  switch (col.format) {
    case "currency": return <span className="font-mono">{fmt(val)}</span>;
    case "pct": return <span>{fmtPct(val)}</span>;
    case "number": return <span className="font-mono">{fmtNum(val)}</span>;
    case "badge": return <Badge variant="outline" className="capitalize text-xs">{String(val).replace(/_/g, " ")}</Badge>;
    default: {
      const s = String(val);
      if (s.includes("T") && s.includes(":") && s.length > 16) {
        return <span>{new Date(s).toLocaleString()}</span>;
      }
      return <span>{s}</span>;
    }
  }
}

function FeedbackReport() {
  const { data: summary = {} as any } = useQuery({ queryKey: ["/api/restaurant/feedback/summary"], queryFn: () => apiFetch("/api/restaurant/feedback/summary") });
  const { data: reviews = [] as any[] } = useQuery({ queryKey: ["/api/restaurant/feedback"], queryFn: () => apiFetch("/api/restaurant/feedback") });
  const stars = (n: any) => n ? "⭐".repeat(Math.round(Number(n))) : "—";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[["avg_food", "Food"], ["avg_service", "Service"], ["avg_ambience", "Ambience"], ["avg_overall", "Overall"]].map(([k, l]) => (
          <Card key={k}><CardContent className="pt-4 text-center">
            <div className="text-2xl">{stars(summary[k])}</div>
            <div className="text-2xl font-bold">{Number(summary[k] || 0).toFixed(1)}</div>
            <div className="text-sm text-gray-500">{l}</div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-gray-500">Total Reviews</div><div className="text-2xl font-bold">{summary.total_reviews || 0}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-gray-500">Positive (≥4★)</div><div className="text-2xl font-bold text-green-600">{summary.positive_count || 0}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-gray-500">Needs Attention (≤2★)</div><div className="text-2xl font-bold text-red-600">{summary.negative_count || 0}</div></CardContent></Card>
      </div>
      <div className="rounded border overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Table</TableHead><TableHead>Customer</TableHead>
            <TableHead>Food</TableHead><TableHead>Service</TableHead><TableHead>Ambience</TableHead>
            <TableHead>Overall</TableHead><TableHead>Comment</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(reviews as any[]).map((r: any) => (
              <TableRow key={r.id} className={r.overall_rating >= 4 ? "bg-green-50" : r.overall_rating <= 2 ? "bg-red-50" : ""}>
                <TableCell className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell>{r.table_number || "—"}</TableCell>
                <TableCell>{r.customer_name || "—"}</TableCell>
                <TableCell>{stars(r.food_rating)}</TableCell>
                <TableCell>{stars(r.service_rating)}</TableCell>
                <TableCell>{stars(r.ambience_rating)}</TableCell>
                <TableCell><span className={r.overall_rating >= 4 ? "text-green-700 font-bold" : r.overall_rating <= 2 ? "text-red-700 font-bold" : ""}>{stars(r.overall_rating)}</span></TableCell>
                <TableCell className="text-sm max-w-xs truncate">{r.comment || "—"}</TableCell>
              </TableRow>
            ))}
            {reviews.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No feedback yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TallyExportTab() {
  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [salesLedger, setSalesLedger] = useState("Food Sales A/c");
  const [cashLedger, setCashLedger] = useState("Cash-in-Hand");
  const [bankLedger, setBankLedger] = useState("HDFC Current A/c");
  const [cgstLedger, setCgstLedger] = useState("Output CGST A/c");
  const [sgstLedger, setSgstLedger] = useState("Output SGST A/c");
  const [xmlPreview, setXmlPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateXml = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, sales_ledger: salesLedger, cash_ledger: cashLedger, bank_ledger: bankLedger, cgst_ledger: cgstLedger, sgst_ledger: sgstLedger });
      const res = await fetch(`/api/restaurant/reports/tally-xml?${params}`, { credentials: "include" });
      const text = await res.text();
      setXmlPreview(text);
    } catch {
      toast({ title: "Failed to generate XML", variant: "destructive" });
    }
    setLoading(false);
  };

  const downloadXml = () => {
    if (!xmlPreview) return;
    const blob = new Blob([xmlPreview], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tally-export-${from}-${to}.xml`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Date Range</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-10">From</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-10">To</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Ledger Mapping</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Food Sales →", val: salesLedger, set: setSalesLedger },
              { label: "Cash →", val: cashLedger, set: setCashLedger },
              { label: "Card/UPI →", val: bankLedger, set: setBankLedger },
              { label: "CGST →", val: cgstLedger, set: setCgstLedger },
              { label: "SGST →", val: sgstLedger, set: setSgstLedger },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex gap-2 items-center">
                <label className="text-xs text-gray-500 w-20 shrink-0">{label}</label>
                <Input value={val} onChange={e => set(e.target.value)} className="h-7 text-xs" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={generateXml} disabled={loading} className="gap-2">
          {loading ? "Generating..." : "📤 Generate Tally XML"}
        </Button>
        {xmlPreview && (
          <Button variant="outline" onClick={downloadXml} className="gap-2">⬇ Download XML</Button>
        )}
      </div>

      {xmlPreview && (
        <Card>
          <CardHeader><CardTitle className="text-sm">XML Preview</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-80 font-mono">
              {xmlPreview}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">How to import in Tally:</p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Open Tally Prime / Tally ERP 9</li>
            <li>Go to <strong>Gateway of Tally → Import Data → Vouchers</strong></li>
            <li>Select the downloaded XML file</li>
            <li>Tally will create Sales vouchers for each day automatically</li>
            <li>Verify ledger names match exactly with your Tally chart of accounts</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RestaurantReportsPage() {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState("daily-summary");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [outletId, setOutletId] = useState("all");
  const [reportData, setReportData] = useState<any[]>([]);
  const [franchiseData, setFranchiseData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [eodEmail, setEodEmail] = useState("");
  const [eodDate, setEodDate] = useState(new Date().toISOString().split("T")[0]);
  const [eodPreview, setEodPreview] = useState<any>(null);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: outlets = [] as any[] } = useQuery({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => apiFetch("/api/restaurant/outlets"),
  });

  const { data: todaySummary = {} as any } = useQuery({
    queryKey: ["/api/restaurant/reports/daily-summary-today"],
    queryFn: () => apiFetch(`/api/restaurant/reports/daily-summary?from=${new Date().toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}`).then(d => Array.isArray(d) && d.length > 0 ? d[0] : {}),
  });

  const applyPreset = (preset: string) => {
    const t = new Date().toISOString().split("T")[0];
    const y = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const w = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
    const m = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    if (preset === "today") { setFromDate(t); setToDate(t); }
    if (preset === "yesterday") { setFromDate(y); setToDate(y); }
    if (preset === "week") { setFromDate(w); setToDate(t); }
    if (preset === "month") { setFromDate(m); setToDate(t); }
  };

  const loadReport = async () => {
    if (activeReport === "eod-email" || activeReport === "feedback" || activeReport === "tally-export") return;
    setLoading(true);
    try {
      let url = "";
      if (activeReport === "franchise") {
        url = "/api/restaurant/franchise/summary";
        const data = await apiFetch(url);
        setFranchiseData(data);
        setReportData(data.outlets || []);
      } else {
        url = `/api/restaurant/reports/${activeReport}?from=${fromDate}&to=${toDate}${outletId !== "all" ? "&outlet_id=" + outletId : ""}`;
        const data = await apiFetch(url);
        setReportData(Array.isArray(data) ? data : [data]);
      }
    } catch {
      setReportData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport, fromDate, toDate, outletId]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortedData = [...reportData].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey]; const bv = b[sortKey];
    const cmp = isNaN(Number(av)) ? String(av || "").localeCompare(String(bv || "")) : Number(av) - Number(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const exportCSV = () => {
    const cols = COLS[activeReport];
    if (!cols || sortedData.length === 0) return;
    const header = cols.map(c => c.label).join(",");
    const rows = sortedData.map(row => cols.map(c => {
      const v = row[c.key] ?? "";
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
    }).join(",")).join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeReport}-${fromDate}-${toDate}.csv`;
    a.click();
  };

  const colsForReport = COLS[activeReport];
  const hasCurrencyCols = colsForReport?.some(c => c.format === "currency");

  const sendEOD = async () => {
    try {
      const r = await apiPost("/api/restaurant/reports/send-eod-email", { email: eodEmail, date: eodDate });
      toast({ title: r.message || "EOD report processed" });
      if (r.summary) setEodPreview(r.summary);
    } catch {
      toast({ title: "Failed to send EOD report", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* LEFT NAV */}
      <div className="w-52 border-r bg-gray-50 flex-shrink-0 overflow-y-auto">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Reports</h2>
        </div>
        {REPORTS.map(r => (
          <button
            key={r.id}
            onClick={() => { setActiveReport(r.id); setSortKey(""); }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors ${activeReport === r.id ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600" : "text-gray-700"}`}
          >
            <span>{r.icon}</span>{r.label}
          </button>
        ))}
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* Quick KPI bar — always visible */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Today Orders", val: fmtNum(todaySummary.orders) },
            { label: "Today Revenue", val: fmt(todaySummary.revenue) },
            { label: "Avg Bill", val: fmt(todaySummary.avg_bill) },
            { label: "GST Today", val: fmt(todaySummary.gst) },
          ].map(kpi => (
            <Card key={kpi.label} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3">
                <div className="text-xs text-gray-500">{kpi.label}</div>
                <div className="text-lg font-bold mt-0.5">{kpi.val || "—"}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top filter bar */}
        {activeReport !== "eod-email" && activeReport !== "feedback" && activeReport !== "tally-export" && (
          <div className="flex flex-wrap gap-2 mb-4 items-center bg-gray-50 p-3 rounded border">
            {["today", "yesterday", "week", "month"].map(p => (
              <Button key={p} size="sm" variant="outline" onClick={() => applyPreset(p)} className="capitalize h-7 text-xs">{p}</Button>
            ))}
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36 h-7 text-xs" />
            <span className="text-gray-400 text-xs">to</span>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36 h-7 text-xs" />
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger className="w-40 h-7 text-xs"><SelectValue placeholder="All Outlets" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {(outlets as any[]).map((o: any) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={loadReport} disabled={loading}>{loading ? "Loading..." : "Load"}</Button>
            {sortedData.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCSV}>⬇ Export CSV</Button>
            )}
            <Badge variant="outline" className="ml-auto text-xs">{sortedData.length} rows</Badge>
          </div>
        )}

        {/* Report title */}
        <h2 className="text-xl font-bold mb-4">
          {REPORTS.find(r => r.id === activeReport)?.icon}{" "}
          {REPORTS.find(r => r.id === activeReport)?.label}
        </h2>

        {/* DAILY SUMMARY — KPI cards + table */}
        {activeReport === "daily-summary" && !loading && reportData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Orders", key: "orders", fmt: "number" },
              { label: "Revenue", key: "revenue", fmt: "currency" },
              { label: "Avg Bill", key: "avg_bill", fmt: "currency" },
              { label: "GST Collected", key: "gst", fmt: "currency" },
            ].map(card => {
              const total = reportData.reduce((s, r) => s + Number(r[card.key] || 0), 0);
              return (
                <Card key={card.key}>
                  <CardContent className="pt-4">
                    <div className="text-xs text-gray-500">{card.label}</div>
                    <div className="text-xl font-bold mt-1">
                      {card.fmt === "currency" ? fmt(total) : fmtNum(total)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* HOURLY SALES — bar chart */}
        {activeReport === "hourly-sales" && !loading && reportData.length > 0 && (() => {
          const maxRev = Math.max(...reportData.map((r: any) => Number(r.revenue || 0)), 1);
          return (
            <div className="mb-6 p-4 bg-gray-900 rounded-lg">
              <div className="flex items-end gap-1 h-32">
                {reportData.map((r: any, i: number) => (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-0">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-400 transition-colors cursor-default"
                      style={{ height: `${(Number(r.revenue) / maxRev) * 100}%`, minHeight: "2px" }}
                      title={`${r.hour}: ${fmt(r.revenue)} (${r.orders} orders)`}
                    />
                    <span className="text-gray-400 mt-1" style={{ fontSize: "8px" }}>{String(r.hour || "").replace(":00", "")}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">Revenue by Hour</div>
            </div>
          );
        })()}

        {/* CATEGORY WISE — progress bars */}
        {activeReport === "category-wise" && !loading && reportData.length > 0 && (
          <div className="mb-4 space-y-2">
            {reportData.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-36 text-sm truncate font-medium">{r.category}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full transition-all"
                    style={{ width: `${Math.min(Number(r.pct_of_total) || 0, 100)}%` }}
                  />
                  <span className="absolute left-2 top-0 text-xs text-white leading-6 font-medium">{fmt(r.revenue)}</span>
                  <span className="absolute right-2 top-0 text-xs text-gray-600 leading-6">{fmtPct(r.pct_of_total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAYMENT MODES — cards */}
        {activeReport === "payment-modes" && !loading && reportData.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            {reportData.map((r: any, i: number) => (
              <Card key={i}>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{fmt(r.amount)}</div>
                  <div className="text-sm text-gray-600 capitalize mt-1">{String(r.payment_mode || "").replace(/_/g, " ")}</div>
                  <div className="text-xs text-gray-400 mt-1">{r.count} txns · {fmtPct(r.pct_of_total)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* FRANCHISE — KPI summary */}
        {activeReport === "franchise" && !loading && franchiseData.total_revenue !== undefined && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="pt-4">
              <div className="text-xs text-gray-500">Total Revenue MTD</div>
              <div className="text-xl font-bold">{fmt(franchiseData.total_revenue)}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-xs text-gray-500">Total Royalty Due</div>
              <div className="text-xl font-bold text-orange-600">{fmt(franchiseData.total_royalty)}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-xs text-gray-500">Royalty Rate</div>
              <div className="text-xl font-bold">{fmtPct(franchiseData.royalty_pct)}</div>
            </CardContent></Card>
          </div>
        )}

        {/* FEEDBACK */}
        {activeReport === "feedback" && <FeedbackReport />}

        {/* TALLY EXPORT */}
        {activeReport === "tally-export" && <TallyExportTab />}

        {/* EOD EMAIL */}
        {activeReport === "eod-email" && (
          <div className="max-w-lg">
            <Card>
              <CardHeader><CardTitle>Send End-of-Day Report</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Report Date</label>
                  <Input type="date" value={eodDate} onChange={e => setEodDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Email Address</label>
                  <Input type="email" value={eodEmail} onChange={e => setEodEmail(e.target.value)} placeholder="manager@restaurant.com" />
                </div>
                <Button onClick={sendEOD}>📧 Send EOD Report</Button>
                {eodPreview && (
                  <div className="mt-4 p-3 bg-gray-50 border rounded text-sm space-y-1">
                    <div className="font-semibold mb-2">Summary Preview:</div>
                    {Object.entries(eodPreview).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="font-mono">{String(v ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* GENERIC TABLE */}
        {activeReport !== "eod-email" && activeReport !== "feedback" && activeReport !== "tally-export" && (
          <>
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            )}

            {!loading && sortedData.length === 0 && (
              <div className="text-center py-20 text-gray-400">No data for the selected period</div>
            )}

            {!loading && sortedData.length > 0 && colsForReport && (
              <div className="rounded border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {colsForReport.map(col => (
                        <TableHead
                          key={col.key}
                          onClick={() => toggleSort(col.key)}
                          className="cursor-pointer select-none hover:bg-gray-50 whitespace-nowrap"
                        >
                          {col.label}
                          {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((row, i) => (
                      <TableRow
                        key={i}
                        className={
                          activeReport === "cashier-shift" && Number(row.variance) < 0 ? "bg-red-50" :
                          activeReport === "cashier-shift" && Number(row.variance) > 0 ? "bg-green-50" : ""
                        }
                      >
                        {colsForReport.map(col => (
                          <TableCell key={col.key}>{renderCell(col, row)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    {hasCurrencyCols && (
                      <TableRow className="font-bold bg-gray-50 border-t-2">
                        {colsForReport.map((col, i) => (
                          <TableCell key={col.key}>
                            {i === 0 ? "TOTAL" :
                              col.format === "currency" ? fmt(sortedData.reduce((s, r) => s + Number(r[col.key] || 0), 0)) :
                              col.format === "number" ? fmtNum(sortedData.reduce((s, r) => s + Number(r[col.key] || 0), 0)) :
                              ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Fallback: dynamic table for undefined report types */}
            {!loading && sortedData.length > 0 && !colsForReport && (
              <div className="rounded border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(sortedData[0]).map(k => (
                        <TableHead key={k} className="capitalize whitespace-nowrap">{k.replace(/_/g, " ")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(row).map(([k, v]) => (
                          <TableCell key={k}>{String(v ?? "—")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
