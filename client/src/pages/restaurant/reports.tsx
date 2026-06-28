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
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const REPORT_TYPES = [
  { value: "daily-summary", label: "Daily Summary" },
  { value: "hourly-sales", label: "Hourly Sales" },
  { value: "item-wise", label: "Item-wise Sales" },
  { value: "category-wise", label: "Category-wise Sales" },
  { value: "cashier-shift", label: "Cashier Shift" },
  { value: "void-discount", label: "Void & Discount" },
  { value: "complimentary", label: "Complimentary" },
  { value: "gst-summary", label: "GST Summary" },
  { value: "payment-modes", label: "Payment Modes" },
  { value: "wastage-summary", label: "Wastage Summary" },
  { value: "loyalty-summary", label: "Loyalty Summary" },
  { value: "food-cost", label: "Food Cost Analysis" },
  { value: "table-analytics", label: "Table Analytics" },
  { value: "outlet-comparison", label: "Outlet Comparison" },
];

const COLUMNS: Record<string, string[]> = {
  "daily-summary": ["date", "orders", "covers", "avg_bill", "total_sales", "gst", "payment_breakdown"],
  "hourly-sales": ["hour", "orders", "revenue"],
  "item-wise": ["item_name", "category", "qty_sold", "revenue", "avg_price"],
  "category-wise": ["category", "items_sold", "revenue", "contribution_pct"],
  "cashier-shift": ["cashier", "shift", "orders", "sales", "voids", "discounts"],
  "void-discount": ["time", "table", "item", "reason", "amount", "cashier"],
  "complimentary": ["time", "table", "item", "reason", "amount", "approved_by"],
  "gst-summary": ["gst_rate", "taxable_amount", "gst_amount", "total"],
  "payment-modes": ["mode", "count", "amount", "percentage"],
  "wastage-summary": ["reason", "qty", "cost"],
  "loyalty-summary": ["type", "count", "points", "amount"],
};

const colLabel = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

function exportCSV(data: any[], reportType: string) {
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  const rows = [cols.join(","), ...data.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function RestaurantReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState("daily-summary");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api("GET", `/api/restaurant/reports/${reportType}?from=${fromDate}&to=${toDate}`);
      setReportData(Array.isArray(res) ? res : res.data || []);
    } catch {
      toast({ title: "Failed to load report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const cols = reportData.length > 0 ? Object.keys(reportData[0]) : (COLUMNS[reportType] || []);

  // Summary stats from daily-summary data or any report
  const totalOrders = reportData.reduce((s, r) => s + Number(r.orders || 0), 0);
  const totalRevenue = reportData.reduce((s, r) => s + Number(r.total_sales || r.revenue || r.amount || 0), 0);
  const avgBill = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Filters */}
      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">From Date</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">To Date</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={loadReport} disabled={loading}>{loading ? "Loading..." : "Load Report"}</Button>
          {reportData.length > 0 && <Button variant="outline" onClick={() => exportCSV(reportData, reportType)}>Export CSV</Button>}
        </div>
      </CardContent></Card>

      {/* Summary Stats */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Orders</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalOrders.toLocaleString("en-IN")}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">₹{fmt(totalRevenue)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Avg Bill</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">₹{fmt(avgBill)}</p></CardContent></Card>
        </div>
      )}

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {REPORT_TYPES.find(r => r.value === reportType)?.label}
            {reportData.length > 0 && <Badge variant="secondary">{reportData.length} rows</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Select a report type and click "Load Report" to view data.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{cols.map(c => <TableHead key={c}>{colLabel(c)}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, i) => (
                    <TableRow key={i}>
                      {cols.map(c => (
                        <TableCell key={c}>
                          {typeof row[c] === "number"
                            ? (c.includes("pct") || c.includes("percentage") ? `${fmt(row[c])}%` : c.includes("amount") || c.includes("sales") || c.includes("revenue") || c.includes("cost") || c.includes("bill") || c.includes("total") ? `₹${fmt(row[c])}` : fmt(row[c]))
                            : String(row[c] ?? "-")}
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
