import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, CheckCircle2, Plus, ClipboardList, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLOR: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
};

export default function JobCardsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [rejectedQty, setRejectedQty] = useState("0");
  const [form, setForm] = useState({ operationName: "", machineId: "", machineName: "", operatorName: "", plannedQty: "", workOrderId: "" });

  const { data: jcs = [], isLoading } = useQuery({ queryKey: ["job-cards"], queryFn: () => api("GET", "/api/manufacturing/job-cards") });
  const { data: summary } = useQuery({ queryKey: ["job-cards-summary"], queryFn: () => api("GET", "/api/manufacturing/job-cards/summary") });
  const { data: wos = [] } = useQuery({ queryKey: ["work-orders-list"], queryFn: () => api("GET", "/api/manufacturing/work-orders?status=released,in_progress") });

  const createMut = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/job-cards", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-cards"] }); setOpen(false); toast({ title: "Job card created" }); },
  });
  const startMut = useMutation({
    mutationFn: (id: string) => api("PATCH", `/api/manufacturing/job-cards/${id}/start`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-cards"] }); toast({ title: "Job card started" }); },
  });
  const completeMut = useMutation({
    mutationFn: ({ id, qty, rej }: { id: string; qty: string; rej: string }) =>
      api("PATCH", `/api/manufacturing/job-cards/${id}/complete`, { actualQty: Number(qty), rejectedQty: Number(rej) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-cards"] }); qc.invalidateQueries({ queryKey: ["job-cards-summary"] }); setCompleteId(null); toast({ title: "Job card completed" }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Shop Floor / Job Cards</h1>
          <p className="text-muted-foreground text-sm">Track operator-level production operations per machine</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Job Card</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Job Card</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Work Order (optional)</label>
                <Select onValueChange={v => setForm(f => ({ ...f, workOrderId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
                  <SelectContent>{(wos as any[]).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.work_order_number} — {w.product_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(["operationName", "machineId", "machineName", "operatorName", "plannedQty"] as const).map(f => (
                <div key={f}>
                  <label className="text-sm font-medium capitalize">{f.replace(/([A-Z])/g, " $1")}</label>
                  <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <Button className="w-full" onClick={() => createMut.mutate()} disabled={!form.operationName || createMut.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Open", value: (summary as any).open, icon: ClipboardList, color: "text-gray-600" },
            { label: "In Progress", value: (summary as any).in_progress, icon: PlayCircle, color: "text-blue-600" },
            { label: "Completed", value: (summary as any).completed, icon: CheckCircle2, color: "text-green-600" },
            { label: "Avg Duration", value: `${(summary as any).avg_duration_mins ?? "—"} min`, icon: Clock, color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}><CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-8 h-8 ${color}`} />
                <div><div className="text-2xl font-bold">{value ?? 0}</div><div className="text-sm text-muted-foreground">{label}</div></div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Job Cards</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Card #</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Planned Qty</TableHead>
                  <TableHead>Actual Qty</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jcs as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No job cards yet. Create one to start tracking shop floor operations.</TableCell></TableRow>
                ) : (jcs as any[]).map((jc: any) => (
                  <TableRow key={jc.id}>
                    <TableCell className="font-mono text-sm">{jc.job_card_number}</TableCell>
                    <TableCell>{jc.operation_name}</TableCell>
                    <TableCell>{jc.machine_name || jc.machine_id || "—"}</TableCell>
                    <TableCell>{jc.operator_name || jc.operator_full_name || "—"}</TableCell>
                    <TableCell>{jc.planned_qty ?? "—"}</TableCell>
                    <TableCell>{jc.actual_qty ?? "—"}</TableCell>
                    <TableCell>{jc.duration_minutes ? `${jc.duration_minutes} min` : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLOR[jc.status] || ""}>{jc.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      {jc.status === "open" && <Button size="sm" variant="outline" onClick={() => startMut.mutate(jc.id)} disabled={startMut.isPending}><PlayCircle className="w-3 h-3 mr-1" />Start</Button>}
                      {jc.status === "in_progress" && (
                        completeId === jc.id ? (
                          <div className="flex gap-2 items-center">
                            <Input className="w-20 h-7" placeholder="Qty" value={actualQty} onChange={e => setActualQty(e.target.value)} />
                            <Input className="w-16 h-7" placeholder="Rej" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} />
                            <Button size="sm" onClick={() => completeMut.mutate({ id: jc.id, qty: actualQty, rej: rejectedQty })} disabled={completeMut.isPending}>Done</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => { setCompleteId(jc.id); setActualQty(String(jc.planned_qty || "")); }}><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
