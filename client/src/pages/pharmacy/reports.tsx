import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const REPORTS = [
  { value: "sales-by-drug", label: "Sales by Drug" },
  { value: "margin-analysis", label: "Margin Analysis" },
  { value: "purchase-vs-sales", label: "Purchase vs Sales" },
  { value: "schedule-h-export", label: "Schedule H Export" },
  { value: "schedule-x-export", label: "Schedule X Export" },
  { value: "expiry-report", label: "Expiry Report" },
];

export default function PharmacyReports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("sales-by-drug");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [enabled, setEnabled] = useState(false);

  const { data: reportData, isLoading, error } = useQuery<any[]>({
    queryKey: ["pharmacy-report", reportType, from, to],
    queryFn: () => api("GET", `/api/pharmacy/reports/${reportType}?from=${from}&to=${to}`),
    enabled,
    retry: false,
  });

  const rows = Array.isArray(reportData) ? reportData : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const runReport = () => {
    if (!from || !to) { toast({ title: "Please select date range", variant: "destructive" }); return; }
    setEnabled(true);
  };

  const exportCSV = () => {
    if (rows.length === 0) { toast({ title: "No data to export", variant: "destructive" }); return; }
    const csv = [columns, ...rows.map((r) => columns.map((c) => r[c]))].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${reportType}-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Card>
        <CardHeader><CardTitle>Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-52">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => { setReportType(v); setEnabled(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setEnabled(false); }} />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setEnabled(false); }} />
            </div>
            <Button onClick={runReport} disabled={isLoading}>
              <PlayCircle className="h-4 w-4 mr-2" />{isLoading ? "Running..." : "Run Report"}
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          Failed to load report. Please try again or check if the report type is supported.
        </div>
      )}

      {enabled && !isLoading && rows.length === 0 && !error && (
        <div className="p-4 text-center text-muted-foreground">No data found for selected parameters.</div>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{REPORTS.find((r) => r.value === reportType)?.label}</span>
              <span className="text-sm font-normal text-muted-foreground">{rows.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="capitalize">{col.replace(/_/g, " ")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col}>
                          {typeof row[col] === "number" && (col.includes("amount") || col.includes("value") || col.includes("total") || col.includes("price") || col.includes("mrp"))
                            ? `₹${Number(row[col]).toFixed(2)}`
                            : String(row[col] ?? "-")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
