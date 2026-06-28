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
  { value: "sales-summary", label: "Sales Summary" },
  { value: "collection-report", label: "Collection Report" },
  { value: "broker-commissions", label: "Broker Commissions" },
  { value: "project-status", label: "Project Status" },
  { value: "inventory-aging", label: "Inventory Aging" },
];

export default function RealEstateReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("sales-summary");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (projectId) params.set("project_id", projectId);
      const result = await api("GET", "/api/real-estate/reports/" + reportType + "?" + params.toString());
      const rows = Array.isArray(result) ? result : result.data || [];
      setData(rows);
      setColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
    } catch (e) {
      toast({ title: "Failed to fetch report", variant: "destructive" });
    }
    setLoading(false);
  };

  const formatCell = (val: any) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "number") return fmt(val);
    if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(val).toLocaleDateString("en-IN");
    return String(val);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Real Estate Reports</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" placeholder="From" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <Input type="date" placeholder="To" value={toDate} onChange={e => setToDate(e.target.value)} />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={fetchReport} disabled={loading}>{loading ? "Loading..." : "Fetch Report"}</Button>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{REPORT_TYPES.find(r => r.value === reportType)?.label} ({data.length} rows)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>{columns.map(c => <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i}>{columns.map(c => <TableCell key={c}>{formatCell(row[c])}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !loading && (
        <div className="text-center text-muted-foreground py-12">Select report type and click Fetch Report</div>
      )}
    </div>
  );
}
