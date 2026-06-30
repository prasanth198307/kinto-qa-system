import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Play } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const REPORTS = [
  { id: "crop-yield", label: "Crop Yield Report" },
  { id: "input-cost", label: "Input Cost Report" },
  { id: "farm-profitability", label: "Farm Profitability" },
  { id: "harvest-register", label: "Harvest Register" },
  { id: "market-sales", label: "Market Sales Report" },
];
const SEASONS = ["all", "Kharif", "Rabi", "Zaid"];

function exportCsv(rows: any[], columns: string[], filename: string) {
  const header = columns.join(",");
  const body = rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("crop-yield");
  const [season, setSeason] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  const run = useMutation({
    mutationFn: () => api("POST", "/api/agriculture/reports/run", { report_type: reportType, season, date_from: dateFrom, date_to: dateTo }),
    onSuccess: (data: any) => {
      const rows = data.rows || [];
      setResults(rows);
      setColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
    },
  });

  const handleExport = () => {
    if (results.length === 0) return;
    exportCsv(results, columns, `${reportType}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const selectedReport = REPORTS.find(r => r.id === reportType);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium mb-1 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORTS.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Season</label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Seasons" : s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              <Play className="w-4 h-4 mr-2" />
              {run.isPending ? "Running..." : "Run Report"}
            </Button>
            {results.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {run.isError && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-destructive text-sm">Failed to load report. Please try again.</p></CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{selectedReport?.label} — {results.length} rows</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(c => <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map(c => <TableCell key={c}>{row[c] ?? "—"}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!run.isPending && results.length === 0 && run.isSuccess && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No data found for selected parameters.</CardContent>
        </Card>
      )}

      {!run.isSuccess && !run.isPending && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {REPORTS.map(r => (
            <Card key={r.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setReportType(r.id); }}>
              <CardContent className="pt-6 pb-4">
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to select, then Run Report</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
