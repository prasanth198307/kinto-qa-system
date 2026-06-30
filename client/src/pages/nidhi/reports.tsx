import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Play } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const REPORT_TYPES = [
  { value: "member-register", label: "Member Register" },
  { value: "deposit-register", label: "Deposit Register" },
  { value: "loan-register", label: "Loan Register" },
  { value: "collection-report", label: "Collection Report" },
  { value: "npa-report", label: "NPA Report" },
  { value: "maturing-deposits", label: "Maturing Deposits" },
];

function exportCSV(rows: any[], columns: string[], filename: string) {
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [reportType, setReportType] = useState("member-register");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [runKey, setRunKey] = useState<string | null>(null);

  const needsDates = reportType === "collection-report";

  const { data, isFetching } = useQuery({
    queryKey: ["nidhi-report", runKey],
    queryFn: () => {
      const params = new URLSearchParams();
      if (needsDates) { params.set("from", from); params.set("to", to); }
      return api("GET", `/api/nidhi-company/reports/${reportType}?${params.toString()}`);
    },
    enabled: !!runKey,
  });

  const rows: any[] = Array.isArray(data) ? data : (data?.rows ?? []);
  const columns: string[] = rows.length > 0 ? Object.keys(rows[0]) : [];

  function run() {
    setRunKey(`${reportType}-${from}-${to}-${Date.now()}`);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-60">
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={(v) => { setReportType(v); setRunKey(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REPORT_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {needsDates && (
          <>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
          </>
        )}
        <Button onClick={run} disabled={isFetching}><Play className="w-4 h-4 mr-1" />{isFetching ? "Running..." : "Run Report"}</Button>
        {rows.length > 0 && (
          <Button variant="outline" onClick={() => exportCSV(rows, columns, `${reportType}.csv`)}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
        )}
      </div>

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>{columns.map((c) => <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>{columns.map((c) => <TableCell key={c}>{row[c] ?? "—"}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {runKey && !isFetching && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No data found for the selected report.</p>
      )}
    </div>
  );
}
