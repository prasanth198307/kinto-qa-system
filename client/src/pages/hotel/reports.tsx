import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const REPORT_TYPES = [
  { value: "occupancy", label: "Occupancy" },
  { value: "revenue", label: "Revenue" },
  { value: "arrivals-departures", label: "Arrivals and Departures" },
  { value: "room-type-wise", label: "Room Type-wise" },
  { value: "channel-wise", label: "Channel-wise" },
  { value: "agent-commission", label: "Agent Commission" },
];

export default function HotelReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("occupancy");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api("GET", `/api/hotel/reports/${reportType}?from=${from}&to=${to}`);
      setReportData(data);
    } catch {
      toast({ title: "Failed to load report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const rows: any[] = Array.isArray(reportData) ? reportData : reportData?.data || reportData?.rows || [];
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Hotel Reports</h1>
      <Card>
        <CardHeader><CardTitle>Report Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <div className="text-sm text-gray-500 mb-1">Report Type</div>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">From</div>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">To</div>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
            </div>
            <Button onClick={fetchReport} disabled={loading}>{loading ? "Loading..." : "Fetch Report"}</Button>
          </div>
        </CardContent>
      </Card>
      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{REPORT_TYPES.find(r => r.value === reportType)?.label} Report</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>{cols.map(c => <TableHead key={c} className="capitalize">{c.replace(/_/g," ")}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any, i: number) => (
                  <TableRow key={i}>
                    {cols.map(c => <TableCell key={c}>{typeof row[c] === "number" ? fmt(row[c]) : String(row[c] ?? "-")}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {reportData && rows.length === 0 && (
        <div className="text-center text-gray-400 py-8">No data for selected parameters</div>
      )}
    </div>
  );
}
