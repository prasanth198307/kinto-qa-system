import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function NightAuditPage() {
  const qc = useQueryClient();
  const [resultOpen, setResultOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  const { data: history = [] } = useQuery({ queryKey: ["hotel-audit-history"], queryFn: () => api("GET", "/api/hotel/night-audit/history") });
  const { data: kpi } = useQuery({ queryKey: ["hotel-kpi"], queryFn: () => api("GET", "/api/hotel/kpi") });

  const runAudit = useMutation({
    mutationFn: () => api("POST", "/api/hotel/night-audit/run"),
    onSuccess: (data) => { setAuditResult(data); setResultOpen(true); qc.invalidateQueries({ queryKey: ["hotel-audit-history"] }); qc.invalidateQueries({ queryKey: ["hotel-kpi"] }); }
  });

  const todayAudit = history.find((h: any) => h.audit_date === new Date().toISOString().split("T")[0]);

  const checklist = [
    { label: "All checkouts completed", done: kpi?.pending_checkouts === 0 },
    { label: "Room charges posted", done: kpi?.unposted_charges === 0 },
    { label: "Cash balanced", done: kpi?.cash_balanced === true },
  ];

  const kpiCards = [
    { label: "Rooms Occupied", value: kpi?.rooms_occupied ?? "—", sub: `of ${kpi?.total_rooms ?? "—"} total` },
    { label: "ADR", value: kpi?.adr ? `₹${Number(kpi.adr).toFixed(2)}` : "—", sub: "Avg Daily Rate" },
    { label: "RevPAR", value: kpi?.revpar ? `₹${Number(kpi.revpar).toFixed(2)}` : "—", sub: "Rev per Available Room" },
    { label: "Room Revenue", value: kpi?.total_room_revenue ? `₹${Number(kpi.total_room_revenue).toFixed(2)}` : "—", sub: "Today" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Night Audit</h1>
        <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending} className="bg-indigo-600 hover:bg-indigo-700">
          <Play size={16} className="mr-2" />{runAudit.isPending ? "Running..." : "Run Night Audit"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Audit Status</CardTitle></CardHeader>
          <CardContent>
            {todayAudit ? (
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-500" size={28} />
                <div>
                  <p className="font-medium text-green-700">Audit Completed</p>
                  <p className="text-xs text-gray-500">Run by {todayAudit.run_by} at {new Date(todayAudit.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Clock className="text-yellow-500" size={28} />
                <div>
                  <p className="font-medium text-yellow-700">Audit Not Yet Run</p>
                  <p className="text-xs text-gray-500">Complete the checklist and run audit</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.done ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
                <span className={`text-sm ${item.done ? "text-gray-700" : "text-gray-400"}`}>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {kpiCards.map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-sm font-medium mt-1">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Audit History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rooms Audited</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead>Run By</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No audit history</TableCell></TableRow>
              )}
              {history.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{h.audit_date}</TableCell>
                  <TableCell><Badge variant={h.status === "completed" ? "default" : "secondary"}>{h.status}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{h.rooms_audited ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{h.total_revenue ? `₹${Number(h.total_revenue).toFixed(2)}` : "—"}</TableCell>
                  <TableCell className="text-sm">{h.run_by ?? "—"}</TableCell>
                  <TableCell className="text-xs text-gray-400">{h.created_at ? new Date(h.created_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Night Audit Result</DialogTitle></DialogHeader>
          {auditResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} />
                <span className="font-medium text-green-700">Audit Completed Successfully</span>
              </div>
              <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                {auditResult.rooms_audited != null && <div className="flex justify-between"><span className="text-gray-500">Rooms Audited</span><span>{auditResult.rooms_audited}</span></div>}
                {auditResult.total_revenue != null && <div className="flex justify-between"><span className="text-gray-500">Total Revenue</span><span>₹{Number(auditResult.total_revenue).toFixed(2)}</span></div>}
                {auditResult.charges_posted != null && <div className="flex justify-between"><span className="text-gray-500">Charges Posted</span><span>{auditResult.charges_posted}</span></div>}
                {auditResult.message && <p className="text-gray-600 italic">{auditResult.message}</p>}
              </div>
              <Button className="w-full" onClick={() => setResultOpen(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
