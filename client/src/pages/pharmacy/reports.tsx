import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

const REPORT_TYPES = [
  { value: "sales-summary", label: "Sales Summary" },
  { value: "purchase-summary", label: "Purchase Summary" },
  { value: "stock-valuation", label: "Stock Valuation" },
  { value: "expiry-report", label: "Expiry Report" },
  { value: "schedule-register", label: "Schedule Register" },
  { value: "gst-summary", label: "GST Summary" },
];

export default function PharmacyReportsPage() {
  const [reportType, setReportType] = useState("sales-summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fetch, setFetch] = useState(false);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/pharmacy/reports", reportType, from, to],
    queryFn: () => api("GET", "/api/pharmacy/reports/" + reportType + "?from=" + from + "&to=" + to),
    enabled: fetch
  });

  const rows: any[] = Array.isArray(reportData) ? reportData : (reportData?.data || []);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pharmacy Reports</h1>

      <Card><CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div><label className="text-sm font-medium block mb-1">Report Type</label>
            <Select value={reportType} onValueChange={v => { setReportType(v); setFetch(false); }}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label className="text-sm font-medium block mb-1">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><label className="text-sm font-medium block mb-1">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <Button onClick={() => setFetch(true)}>Generate Report</Button>
        </div>
      </CardContent></Card>

      {fetch && (
        <Card>
          <CardHeader><CardTitle>{REPORT_TYPES.find(r => r.value === reportType)?.label}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : rows.length > 0 ? (
              <Table>
                <TableHeader><TableRow>{cols.map(c => <TableHead key={c} className="capitalize">{c.replace(/_/g," ")}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {rows.map((row: any, i: number) => (
                    <TableRow key={i}>{cols.map(c => <TableCell key={c}>{String(row[c] ?? "—")}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data for selected criteria</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
