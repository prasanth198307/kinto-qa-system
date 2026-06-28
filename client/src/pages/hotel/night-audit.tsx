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

export default function HotelNightAuditPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: summary } = useQuery({ queryKey: ["hotel-night-audit-summary"], queryFn: () => api("GET", "/api/hotel/night-audit/summary") });
  const { data: auditLog = [] } = useQuery({ queryKey: ["hotel-audit-log"], queryFn: () => api("GET", "/api/hotel/night-audit/log") });

  const runAudit = useMutation({
    mutationFn: () => api("POST", "/api/hotel/night-audit/run", { date: auditDate }),
    onSuccess: () => { toast({ title: "Night audit completed" }); qc.invalidateQueries({ queryKey: ["hotel-night-audit-summary","hotel-audit-log"] }); }
  });

  const auditList: any[] = Array.isArray(auditLog) ? auditLog : (auditLog as any)?.logs || [];
  const s: any = summary || {};

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Night Audit</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{s.rooms_occupied || 0}</div><div className="text-gray-500 text-sm">Rooms Occupied</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">Rs {fmt(s.revenue_today)}</div><div className="text-gray-500 text-sm">Revenue Today</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{s.pending_checkouts || 0}</div><div className="text-gray-500 text-sm">Pending Checkouts</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{s.no_shows || 0}</div><div className="text-gray-500 text-sm">No Shows</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Run Night Audit</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div>
              <div className="text-sm text-gray-500 mb-1">Audit Date</div>
              <Input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)} className="w-36" />
            </div>
            <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending}>
              {runAudit.isPending ? "Running..." : "Run Night Audit"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Rooms Processed</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditList.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.operator}</TableCell>
                  <TableCell>{a.rooms_processed}</TableCell>
                  <TableCell>Rs {fmt(a.total_revenue)}</TableCell>
                  <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
