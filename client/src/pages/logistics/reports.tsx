import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Play, Download } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const REPORTS = [
  { value: "trip-summary", label: "Trip Summary" },
  { value: "fleet-utilization", label: "Fleet Utilization" },
  { value: "driver-performance", label: "Driver Performance" },
  { value: "freight-collection", label: "Freight Collection" },
  { value: "fuel-efficiency", label: "Fuel Efficiency" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("trip-summary");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const run = useMutation({
    mutationFn: () => api("POST", "/api/logistics/reports/run", { report_type: reportType, date_from: dateFrom, date_to: dateTo }),
    onSuccess: (result) => {
      const data = Array.isArray(result?.data) ? result.data : [];
      setRows(data);
      setColumns(data.length > 0 ? Object.keys(data[0]) : []);
      setMeta(result?.meta || null);
    },
  });

  function exportCsv() {
    if (!rows.length) return;
    const header = columns.join(",");
    const body = rows.map((r) => columns.map((c) => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const reportLabel = REPORTS.find((r) => r.value === reportType)?.label ?? reportType;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Logistics Reports</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-sm font-medium block mb-1">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">From Date</label>
              <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">To Date</label>
              <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={() => run.mutate()} disabled={run.isPending}><Play className="w-4 h-4 mr-2" />{run.isPending ? "Running..." : "Run Report"}</Button>
            {rows.length > 0 && <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export CSV</Button>}
          </div>
        </CardContent>
      </Card>

      {run.isError && <p className="text-center text-destructive py-4">Failed to run report. Please try again.</p>}

      {meta && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(meta).map(([k, v]) => (
            <Card key={k}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                <p className="text-xl font-bold mt-1">{String(v)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{reportLabel}{dateFrom && dateTo ? ` — ${dateFrom} to ${dateTo}` : ""}</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => <TableCell key={c}>{row[c] ?? "—"}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {!run.isPending && rows.length === 0 && run.isSuccess && (
        <p className="text-center text-muted-foreground py-8">No data found for the selected parameters.</p>
      )}

      {!run.isSuccess && !run.isPending && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Select a report type and date range, then click Run Report.</p>
        </div>
      )}
    </div>
  );
}
