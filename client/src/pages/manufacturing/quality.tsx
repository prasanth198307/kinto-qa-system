import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle, XCircle } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const DECISIONS = ["Accepted", "Rejected", "Rework"];
const REJECTION_REASONS = ["Weight out of tolerance", "Dimension mismatch", "Surface defect", "Chemical spec failure", "Appearance issue"];

const MOCK_INSPECTIONS = [
  { id: 1, batch: "BT-001", product: "Water Purifier X1", date: "2026-06-28", inspector: "QC Team A", result: "Accepted", params: "Weight: OK, Dims: OK" },
  { id: 2, batch: "BT-002", product: "UV Module", date: "2026-06-29", inspector: "QC Team B", result: "Rejected", params: "UV intensity below spec" },
  { id: 3, batch: "BT-003", product: "Filter Housing", date: "2026-06-30", inspector: "QC Team A", result: "Rework", params: "Sealing gap found" },
];

const REJECTION_DATA = [
  { reason: "Weight tolerance", count: 8, color: "#ef4444" },
  { reason: "Dimension mismatch", count: 5, color: "#f97316" },
  { reason: "Surface defect", count: 12, color: "#eab308" },
  { reason: "Chemical spec", count: 3, color: "#8b5cf6" },
  { reason: "Appearance", count: 6, color: "#06b6d4" },
];

const EMPTY = { batch: "", product: "", inspector: "", params: "", decision: "Accepted", rejection_reason: "" };

export default function QualityPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: inspections = [] } = useQuery({ queryKey: ["qc-inspections"], queryFn: () => api("GET", "/api/manufacturing/quality-inspections") });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/manufacturing/quality-inspections", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qc-inspections"] }); setOpen(false); setForm({ ...EMPTY }); },
  });

  const rows: Array<Record<string, unknown>> = Array.isArray(inspections) && inspections.length ? inspections : MOCK_INSPECTIONS;

  const total = REJECTION_DATA.reduce((s, d) => s + d.count, 0);
  let startAngle = 0;
  const slices = REJECTION_DATA.map(d => {
    const angle = (d.count / total) * 2 * Math.PI;
    const x1 = 100 + 80 * Math.cos(startAngle);
    const y1 = 100 + 80 * Math.sin(startAngle);
    startAngle += angle;
    const x2 = 100 + 80 * Math.cos(startAngle);
    const y2 = 100 + 80 * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...d, d: `M100,100 L${x1},${y1} A80,80 0 ${large},1 ${x2},${y2} Z` };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quality Control</h1>
          <p className="text-muted-foreground">Inspection management and rejection analysis</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Inspection</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Inspections</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Accepted</p>
          <p className="text-2xl font-bold text-green-600">{rows.filter((r: Record<string, unknown>) => r.result === "Accepted").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Rejected / Rework</p>
          <p className="text-2xl font-bold text-red-600">{rows.filter((r: Record<string, unknown>) => r.result !== "Accepted").length}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Inspection List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: Record<string, unknown>, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{String(r.batch)}</TableCell>
                    <TableCell>{String(r.product)}</TableCell>
                    <TableCell>{String(r.date)}</TableCell>
                    <TableCell>{String(r.inspector)}</TableCell>
                    <TableCell>
                      <Badge variant={r.result === "Accepted" ? "default" : r.result === "Rejected" ? "destructive" : "outline"}>
                        {r.result === "Accepted" ? <CheckCircle className="h-3 w-3 mr-1 inline" /> : <XCircle className="h-3 w-3 mr-1 inline" />}
                        {String(r.result)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rejection Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 items-start">
              <svg viewBox="0 0 200 200" className="w-40 h-40 flex-shrink-0">
                {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1" />)}
              </svg>
              <div className="space-y-1">
                {REJECTION_DATA.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span>{d.reason}</span>
                    <span className="text-muted-foreground">({d.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New QC Inspection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(["batch", "product", "inspector", "params"] as const).map(f => (
              <div key={f}>
                <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium mb-1 block">Decision</label>
              <Select value={form.decision} onValueChange={v => setForm(p => ({ ...p, decision: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DECISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.decision === "Rejected" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Rejection Reason</label>
                <Select value={form.rejection_reason} onValueChange={v => setForm(p => ({ ...p, rejection_reason: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>{REJECTION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)}>Save Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
