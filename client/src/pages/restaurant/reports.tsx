import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

const REPORT_TYPES = [
  { value: "daily-summary", label: "Daily Summary" },
  { value: "hourly-sales", label: "Hourly Sales" },
  { value: "item-wise", label: "Item-wise Sales" },
  { value: "category-wise", label: "Category-wise Sales" },
  { value: "cashier-shift", label: "Cashier / Shift Report" },
  { value: "void-discount", label: "Voids & Discounts" },
  { value: "complimentary", label: "Complimentary Report" },
  { value: "gst-summary", label: "GST Summary" },
  { value: "payment-modes", label: "Payment Modes" },
  { value: "wastage-summary", label: "Wastage Summary" },
  { value: "loyalty-summary", label: "Loyalty Summary" },
  { value: "food-cost", label: "Food Cost Analysis" },
  { value: "table-analytics", label: "Table Analytics" },
  { value: "outlet-comparison", label: "Outlet Comparison" },
];

const REPORT_COLUMNS: Record<string, { key: string; label: string; format?: "currency" | "pct" | "number" | "text" }[]> = {
  "daily-summary": [
    { key: "date", label: "Date" },
    { key: "orders", label: "Orders", format: "number" },
    { key: "covers", label: "Covers", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "gst", label: "GST", format: "currency" },
    { key: "avg_bill", label: "Avg Bill", format: "currency" },
  ],
  "item-wise": [
    { key: "item_name", label: "Item" },
    { key: "category", label: "Category" },
    { key: "qty_sold", label: "Qty Sold", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "avg_price", label: "Avg Price", format: "currency" },
  ],
  "gst-summary": [
    { key: "gst_rate", label: "GST Rate", format: "pct" },
    { key: "taxable_amount", label: "Taxable Amt", format: "currency" },
    { key: "gst_amount", label: "GST Amount", format: "currency" },
    { key: "total", label: "Total", format: "currency" },
  ],
  "food-cost": [
    { key: "item_name", label: "Item" },
    { key: "qty_sold", label: "Qty Sold", format: "number" },
    { key: "revenue", label: "Revenue", format: "currency" },
    { key: "total_food_cost", label: "Food Cost", format: "currency" },
    { key: "margin_pct", label: "Margin%", format: "pct" },
  ],
  "table-analytics": [
    { key: "table_number", label: "Table" },
    { key: "total_orders", label: "Orders", format: "number" },
    { key: "total_covers", label: "Covers", format: "number" },
    { key: "total_revenue", label: "Revenue", format: "currency" },
    { key: "avg_bill", label: "Avg Bill", format: "currency" },
    { key: "avg_turnaround_mins", label: "Avg Time(min)", format: "number" },
  ],
};

function toTitleCase(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatCell(key: string, value: any, format?: string): string {
  if (value == null || value === "") return "—";
  if (format === "currency") return fmt(value);
  if (format === "pct") return Number(value).toFixed(1) + "%";
  if (format === "number") return Number(value).toLocaleString("en-IN");
  // Dynamic inference
  if (key.endsWith("_amount") || key === "revenue" || key.includes("cost") || key.includes("total") || key === "gst" || key === "avg_bill") return fmt(value);
  if (key.endsWith("_pct") || key.endsWith("pct") || key.includes("margin")) return Number(value).toFixed(1) + "%";
  if (key === "date" || key === "created_at") {
    try { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return String(value); }
  }
  if (key === "count" || key === "qty" || key.includes("orders") || key.includes("covers")) return Number(value).toLocaleString("en-IN");
  return String(value);
}

export default function RestaurantReportsPage() {
  const { toast } = useToast();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState("daily-summary");
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preset, setPreset] = useState("today");

  const { data: todaySnapshot } = useQuery({
    queryKey: ["/api/restaurant/reports/daily-summary", today],
    queryFn: () => api("GET", `/api/restaurant/reports/daily-summary?from=${today}&to=${today}`),
    refetchInterval: 60000,
  });

  const snapshot = Array.isArray(todaySnapshot) ? todaySnapshot[0] : todaySnapshot;

  const loadReport = async () => {
    setIsLoading(true);
    setLoaded(false);
    try {
      const data = await api("GET", `/api/restaurant/reports/${reportType}?from=${fromDate}&to=${toDate}`);
      setReportData(Array.isArray(data) ? data : data?.data || data?.rows || [data].filter(Boolean));
      setLoaded(true);
    } catch {
      toast({ title: "Failed to load report", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (p: string) => {
    setPreset(p);
    if (p === "today") { setFromDate(today); setToDate(today); }
    else if (p === "yesterday") { setFromDate(yesterday); setToDate(yesterday); }
    else if (p === "week") { setFromDate(weekStart); setToDate(today); }
    else if (p === "month") { setFromDate(monthStart); setToDate(today); }
  };

  const exportCSV = () => {
    if (!reportData.length) return;
    const cols = getColumns();
    const header = cols.map(c => c.label).join(",");
    const rows = reportData.map(row => cols.map(c => {
      const v = row[c.key];
      return typeof v === "string" && v.includes(",") ? `"${v}"` : (v ?? "");
    }).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${reportType}_${fromDate}_${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const getColumns = () => {
    if (REPORT_COLUMNS[reportType]) return REPORT_COLUMNS[reportType];
    if (!reportData.length) return [];
    return Object.keys(reportData[0]).map(key => ({ key, label: toTitleCase(key) }));
  };

  const columns = getColumns();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports</h1>
        {loaded && reportData.length > 0 && (
          <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Today's Orders", value: snapshot?.orders ?? "—" },
          { label: "Today's Revenue", value: snapshot?.revenue != null ? fmt(snapshot.revenue) : "—" },
          { label: "Avg Bill", value: snapshot?.avg_bill != null ? fmt(snapshot.avg_bill) : "—" },
          { label: "Open Tables", value: snapshot?.open_tables ?? "—" },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Today", value: "today" },
              { label: "Yesterday", value: "yesterday" },
              { label: "This Week", value: "week" },
              { label: "This Month", value: "month" },
              { label: "Custom", value: "custom" },
            ].map(p => (
              <Button key={p.value} size="sm" variant={preset === p.value ? "default" : "outline"} onClick={() => applyPreset(p.value)}>{p.label}</Button>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-sm font-medium block mb-1">From</label>
              <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPreset("custom"); }} className="w-40" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">To</label>
              <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPreset("custom"); }} className="w-40" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium block mb-1">Report Type</label>
              <Select value={reportType} onValueChange={v => { setReportType(v); setLoaded(false); setReportData([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReport} disabled={isLoading} className="self-end">
              {isLoading ? "Loading..." : "Load Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Output */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {REPORT_TYPES.find(r => r.value === reportType)?.label}
              {" — "}
              {fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}
            </CardTitle>
            {loaded && (
              <Badge variant="secondary">Showing {reportData.length} rows</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!loaded && !isLoading && (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-2">📊</p>
              <p>Select a report type and click "Load Report"</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          )}

          {loaded && !isLoading && reportData.length === 0 && (
            <div className="text-center text-gray-400 py-12">No data found for the selected period.</div>
          )}

          {loaded && !isLoading && reportData.length > 0 && columns.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map(c => (
                        <TableCell key={c.key} className={
                          c.format === "currency" ? "font-medium" :
                          c.format === "pct" ? (Number(row[c.key]) < 0 ? "text-red-600" : "text-green-700") : ""
                        }>
                          {formatCell(c.key, row[c.key], c.format)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
