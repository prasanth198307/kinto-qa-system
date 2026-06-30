import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Users, DollarSign, CheckCircle, Download } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const REPORT_TYPES = [
  { value: "lead-funnel", label: "Lead Funnel" },
  { value: "activity-summary", label: "Activity Summary" },
  { value: "campaign-performance", label: "Campaign Performance" },
  { value: "account-wise-revenue", label: "Account-wise Revenue" },
  { value: "conversion-rate", label: "Conversion Rate" },
];

interface KPIs {
  total_leads: number;
  active_deals: number;
  won_this_month: number;
  avg_deal_size: number;
}

interface ReportRow {
  [key: string]: string | number | null;
}

function exportCSV(rows: ReportRow[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("lead-funnel");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [run, setRun] = useState(false);

  const { data: kpis } = useQuery<KPIs>({
    queryKey: ["crm-kpis"],
    queryFn: () => api("GET", "/api/crm/reports/kpis"),
  });

  const { data: reportData = [], isLoading: reportLoading } = useQuery<ReportRow[]>({
    queryKey: ["crm-report", reportType, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ type: reportType });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      return api("GET", `/api/crm/reports?${params}`);
    },
    enabled: run,
  });

  const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">CRM Reports</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="text-blue-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Total Leads</p>
              <p className="text-xl font-bold">{kpis?.total_leads ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <TrendingUp className="text-purple-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Active Deals</p>
              <p className="text-xl font-bold">{kpis?.active_deals ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Won This Month</p>
              <p className="text-xl font-bold">{kpis?.won_this_month ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="text-orange-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Avg Deal Size</p>
              <p className="text-xl font-bold">{kpis?.avg_deal_size != null ? `₹${kpis.avg_deal_size.toLocaleString()}` : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Report Type</label>
              <Select value={reportType} onValueChange={(v) => { setReportType(v); setRun(false); }}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">From</label>
              <Input type="date" className="w-36" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setRun(false); }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">To</label>
              <Input type="date" className="w-36" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setRun(false); }} />
            </div>
            <Button onClick={() => setRun(true)}>Run Report</Button>
            {reportData.length > 0 && (
              <Button variant="outline" onClick={() => exportCSV(reportData, `${reportType}-report.csv`)}>
                <Download size={16} className="mr-1" /> Export CSV
              </Button>
            )}
          </div>

          {run && reportLoading && <p className="text-gray-400 text-sm">Running report...</p>}
          {run && !reportLoading && reportData.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">No data for selected parameters</p>}
          {run && !reportLoading && reportData.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => <TableHead key={h} className="capitalize">{h.replace(/_/g, " ")}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (
                        <TableCell key={h} className="text-sm">
                          {row[h] != null ? String(row[h]) : "—"}
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
