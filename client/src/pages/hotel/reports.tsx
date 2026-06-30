import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, BedDouble, DollarSign, BarChart2 } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const REPORTS = [
  { value: "occupancy", label: "Occupancy Report" },
  { value: "revenue", label: "Revenue Report" },
  { value: "arrivals_departures", label: "Arrivals & Departures" },
  { value: "source_mix", label: "Source Mix" },
  { value: "agent_commission", label: "Agent Commission" },
  { value: "corporate_summary", label: "Corporate Account Summary" },
];

type KPI = { occupancy_pct: number; adr: number; rev_par: number; total_revenue: number };
type ReportRow = Record<string, string | number>;

function KpiStrip({ kpi }: { kpi: KPI }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { label: "Occupancy", value: `${kpi.occupancy_pct ?? 0}%`, icon: BedDouble, color: "text-blue-600" },
        { label: "ADR", value: `₹${kpi.adr ?? 0}`, icon: TrendingUp, color: "text-green-600" },
        { label: "RevPAR", value: `₹${kpi.rev_par ?? 0}`, icon: BarChart2, color: "text-purple-600" },
        { label: "Total Revenue", value: `₹${(kpi.total_revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-orange-600" },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SourceMixBars({ rows }: { rows: ReportRow[] }) {
  const max = Math.max(...rows.map((r) => Number(r.count ?? 0)), 1);
  return (
    <div className="space-y-3 mt-4">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 text-sm capitalize">{String(r.source)}</span>
          <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div className="h-full bg-blue-500 flex items-center px-2 text-white text-xs font-medium transition-all" style={{ width: `${Math.max(4, (Number(r.count) / max) * 100)}%` }}>
              {r.count}
            </div>
          </div>
          <span className="text-sm text-muted-foreground w-16 text-right">₹{Number(r.revenue ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return <p className="text-center text-muted-foreground py-8">No data for selected range.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <Table>
      <TableHeader>
        <TableRow>{keys.map((k) => <TableHead key={k}>{k.replace(/_/g, " ")}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>{keys.map((k) => <TableCell key={k}>{String(row[k] ?? "")}</TableCell>)}</TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [reportType, setReportType] = useState("occupancy");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [runParams, setRunParams] = useState<{ type: string; from: string; to: string } | null>(null);

  const { data: kpi } = useQuery<KPI>({ queryKey: ["hotel-kpi"], queryFn: () => api("GET", "/api/hotel/kpi") });
  const { data: reportData = [], isFetching } = useQuery<ReportRow[]>({
    queryKey: ["hotel-report", runParams],
    queryFn: () => api("GET", `/api/hotel/reports/${runParams!.type}?from=${runParams!.from}&to=${runParams!.to}`),
    enabled: !!runParams,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Hotel Reports</h1>

      {kpi && <KpiStrip kpi={kpi} />}

      <div className="flex items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/20">
        <div className="flex-1">
          <Label>Report</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
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
        <Button onClick={() => setRunParams({ type: reportType, from, to })} disabled={isFetching}>
          {isFetching ? "Running..." : "Run Report"}
        </Button>
      </div>

      {runParams && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">{REPORTS.find((r) => r.value === runParams.type)?.label} — {runParams.from} to {runParams.to}</h2>
          {runParams.type === "source_mix" ? <SourceMixBars rows={reportData} /> : <ReportTable rows={reportData} />}
        </div>
      )}
    </div>
  );
}
