import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, RefreshCw } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json())
    .catch(() => null);

const REPORTS = [
  { value: "daily-opd", label: "Daily OPD" },
  { value: "bed-occupancy", label: "Bed Occupancy" },
  { value: "doctor-revenue", label: "Doctor Revenue" },
  { value: "lab-tat", label: "Lab TAT" },
  { value: "insurance-claims", label: "Insurance Claims" },
  { value: "discharge-summary", label: "Discharge Summary" },
];

function exportCSV(data: any[]) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(","), ...data.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "report.csv";
  a.click();
}

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [reportType, setReportType] = useState("daily-opd");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [runKey, setRunKey] = useState(0);

  const { data: kpi } = useQuery({ queryKey: ["kpi"], queryFn: () => api("GET", "/api/healthcare/reports/kpi") });
  const { data: reportData, isFetching } = useQuery({
    queryKey: ["report", reportType, from, to, runKey],
    queryFn: () => api("GET", `/api/healthcare/reports/${reportType}?from=${from}&to=${to}`),
    enabled: runKey > 0,
  });

  const kpiData = kpi && typeof kpi === "object" && !Array.isArray(kpi) ? kpi : null;
  const rows = Array.isArray(reportData) ? reportData : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Healthcare Reports</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Today's OPD", value: kpiData?.opd_count ?? "-" },
          { label: "IPD Occupied Beds", value: kpiData?.ipd_beds ?? "-" },
          { label: "Lab Pending", value: kpiData?.lab_pending ?? "-" },
          { label: "Revenue (₹)", value: kpiData?.revenue ? `₹${Number(kpiData.revenue).toLocaleString()}` : "-" },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{k.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Run Report</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-56">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => setRunKey((k) => k + 1)} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />Run Report
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" onClick={() => exportCSV(rows)}>
                <Download className="h-4 w-4 mr-1" />Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {runKey > 0 && (
        <Card>
          <CardHeader><CardTitle>{REPORTS.find((r) => r.value === reportType)?.label} — {from} to {to}</CardTitle></CardHeader>
          <CardContent>
            {isFetching ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: any, i: number) => (
                    <TableRow key={i}>
                      {columns.map((c) => <TableCell key={c}>{row[c] ?? "-"}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
