import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, AlertCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const REPORT_TYPES = [
  { value: "donor-summary", label: "Donor Summary" },
  { value: "donation-register", label: "Donation Register" },
  { value: "80g-register", label: "80G Register" },
  { value: "grant-utilization", label: "Grant Utilization" },
  { value: "project-status", label: "Project Status" },
  { value: "volunteer-summary", label: "Volunteer Summary" },
  { value: "beneficiary-register", label: "Beneficiary Register" },
];

const FY_OPTIONS = ["2024-25", "2025-26", "2026-27"];

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(","), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("donor-summary");
  const [mode, setMode] = useState<"range" | "fy">("fy");
  const [fy, setFy] = useState("2025-26");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [enabled, setEnabled] = useState(false);

  const params = mode === "fy" ? `fy=${fy}` : `from=${from}&to=${to}`;

  const { data: result, isFetching, isError } = useQuery({
    queryKey: ["ngo-report", reportType, params],
    queryFn: () => api("GET", `/api/ngo/reports/${reportType}?${params}`),
    enabled,
  });

  const rows: any[] = Array.isArray(result) ? result : (result?.data ?? []);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  const handleRun = () => setEnabled(true);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">NGO Reports</h1>
        {rows.length > 0 && (
          <Button variant="outline" onClick={() => exportCSV(rows, `${reportType}-${fy || from}.csv`)}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        )}
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">Upload annual report to DARPAN portal (<span className="font-medium">darpan.india.gov.in</span>) by 30th September each year.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Report Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={v => { setReportType(v); setEnabled(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Tabs value={mode} onValueChange={v => { setMode(v as any); setEnabled(false); }}>
                <TabsList className="mb-2">
                  <TabsTrigger value="fy">Financial Year</TabsTrigger>
                  <TabsTrigger value="range">Date Range</TabsTrigger>
                </TabsList>
                <TabsContent value="fy" className="mt-0">
                  <Select value={fy} onValueChange={v => { setFy(v); setEnabled(false); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FY_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="range" className="mt-0">
                  <div className="flex gap-2">
                    <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => { setFrom(e.target.value); setEnabled(false); }} /></div>
                    <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => { setTo(e.target.value); setEnabled(false); }} /></div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <Button onClick={handleRun} disabled={isFetching}>{isFetching ? "Running..." : "Run Report"}</Button>
          </div>
        </CardContent>
      </Card>

      {isError && <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded">Failed to load report. Please check the API.</div>}

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{REPORT_TYPES.find(r => r.value === reportType)?.label} — {mode === "fy" ? fy : `${from} to ${to}`} <span className="text-muted-foreground font-normal text-sm">({rows.length} records)</span></CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{cols.map(c => <TableHead key={c} className="whitespace-nowrap">{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>{cols.map(c => <TableCell key={c} className="whitespace-nowrap">{row[c] ?? "—"}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {enabled && !isFetching && rows.length === 0 && !isError && (
        <div className="text-center text-muted-foreground py-12">No data found for the selected report and period.</div>
      )}
    </div>
  );
}
