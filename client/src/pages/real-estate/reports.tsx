import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Play } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const REPORTS = [
  { value: "sales-register", label: "Sales Register" },
  { value: "collection-report", label: "Collection Report" },
  { value: "broker-commission", label: "Broker Commission" },
  { value: "construction-progress", label: "Construction Progress" },
  { value: "inventory-status", label: "Inventory Status" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState<any>(null);

  const runReport = useMutation({
    mutationFn: () => api("POST", "/api/real-estate/reports/run", { report_type: reportType, date_from: dateFrom, date_to: dateTo }),
    onSuccess: (data) => setReportData(data),
  });

  const columns: string[] = reportData?.columns ?? [];
  const rows: any[][] = Array.isArray(reportData?.rows) ? reportData.rows : [];

  function exportCSV() {
    if (!rows.length) return;
    const header = columns.join(",");
    const body = rows.map((r) => r.map((v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-${dateFrom || "all"}-${dateTo || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select Report" /></SelectTrigger>
                <SelectContent>{REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={() => { setReportData(null); runReport.mutate(); }} disabled={!reportType || runReport.isPending}>
              <Play className="w-4 h-4 mr-2" />{runReport.isPending ? "Running..." : "Run Report"}
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {runReport.isError && <div className="p-4 text-destructive text-center">Failed to run report.</div>}

      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{REPORTS.find((r) => r.value === reportType)?.label} Results</CardTitle>
            <span className="text-sm text-muted-foreground">{rows.length} rows</span>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 && <div className="p-8 text-center text-muted-foreground">No data for selected parameters.</div>}
            {rows.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>{columns.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell: any, j: number) => (
                          <TableCell key={j} className="whitespace-nowrap">{cell ?? "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!reportData && !runReport.isPending && (
        <div className="p-12 text-center text-muted-foreground">
          Select a report type and click Run Report to view results.
        </div>
      )}
    </div>
  );
}
