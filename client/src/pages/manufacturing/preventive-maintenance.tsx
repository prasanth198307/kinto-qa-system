import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, CheckCircle, AlertTriangle, Clock, Loader2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const URGENCY_COLOR: Record<string, string> = {
  overdue: "bg-red-100 text-red-700",
  due_soon: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export default function PreventiveMaintenancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState<number | null>(null);
  const [sForm, setSForm] = useState({ machine_name: "", task_name: "", frequency: "monthly", frequency_value: "1", next_due_date: "", estimated_hours: "2", priority: "medium", checklist: "" });
  const [cForm, setCForm] = useState({ technician_notes: "", downtime_minutes: "0" });

  const { data: schedules = [] } = useQuery<any[]>({ queryKey: ["pm-schedules"], queryFn: () => fetch("/api/manufacturing/pm/schedules").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: workOrders = [] } = useQuery<any[]>({ queryKey: ["pm-work-orders"], queryFn: () => fetch("/api/manufacturing/pm/work-orders").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: oeeDash } = useQuery({ queryKey: ["oee-dash"], queryFn: () => fetch("/api/manufacturing/oee/dashboard").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const overdue = (schedules as any[]).filter((s: any) => s.urgency === "overdue").length;
  const dueSoon = (schedules as any[]).filter((s: any) => s.urgency === "due_soon").length;
  const pendingWOs = (workOrders as any[]).filter((w: any) => w.status === "pending").length;

  const addSchedule = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/pm/schedules", d),
    onSuccess: () => { toast({ title: "PM schedule added" }); qc.invalidateQueries({ queryKey: ["pm-schedules"] }); setScheduleOpen(false); },
  });

  const generateWOs = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/pm/generate-work-orders", {}),
    onSuccess: (d) => { toast({ title: `${d.created} work orders generated` }); qc.invalidateQueries({ queryKey: ["pm-work-orders"] }); },
  });

  const completeWO = useMutation({
    mutationFn: ({ id, ...d }: any) => api("PATCH", `/api/manufacturing/pm/work-orders/${id}/complete`, d),
    onSuccess: () => { toast({ title: "PM completed · Next due date advanced" }); qc.invalidateQueries({ queryKey: ["pm-schedules", "pm-work-orders"] }); setCompleteOpen(null); },
  });

  const removeSchedule = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/manufacturing/pm/schedules/${id}`),
    onSuccess: () => { toast({ title: "Schedule deactivated" }); qc.invalidateQueries({ queryKey: ["pm-schedules"] }); },
  });

  const avgOEE = oeeDash?.avg_oee ? Number(oeeDash.avg_oee).toFixed(1) : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preventive Maintenance Scheduler</h1>
          <p className="text-sm text-muted-foreground">PM schedules + work orders · OEE impact tracking · Machine downtime recording</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => generateWOs.mutate()} disabled={generateWOs.isPending}>
            {generateWOs.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            Generate WOs
          </Button>
          <Button size="sm" onClick={() => setScheduleOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Schedule</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="border-red-200"><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{overdue}</p>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Due This Week</p>
          <p className="text-2xl font-bold text-amber-600">{dueSoon}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pending WOs</p>
          <p className="text-2xl font-bold text-blue-600">{pendingWOs}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Avg Plant OEE</p>
          <p className={`text-2xl font-bold ${Number(avgOEE) >= 85 ? "text-green-600" : Number(avgOEE) >= 70 ? "text-amber-600" : "text-red-600"}`}>{avgOEE}%</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="schedules">
        <TabsList>
          <TabsTrigger value="schedules">PM Schedules ({(schedules as any[]).length})</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders ({(workOrders as any[]).length})</TabsTrigger>
          <TabsTrigger value="oee">OEE Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          <Table>
            <TableHeader><TableRow><TableHead>Machine</TableHead><TableHead>Task</TableHead><TableHead>Frequency</TableHead><TableHead>Next Due</TableHead><TableHead>Est. Hours</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Urgency</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(schedules as any[]).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.machine_name}</TableCell>
                  <TableCell>{s.task_name}</TableCell>
                  <TableCell className="text-xs">{s.frequency_value > 1 ? `Every ${s.frequency_value} ` : ""}{s.frequency}</TableCell>
                  <TableCell>{s.next_due_date ? new Date(s.next_due_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>{s.estimated_hours}h</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.priority}</Badge></TableCell>
                  <TableCell>{s.pending_wo > 0 ? <Badge className="text-xs bg-blue-100 text-blue-700">{s.pending_wo} open WO</Badge> : <Badge className="text-xs bg-gray-100">—</Badge>}</TableCell>
                  <TableCell><Badge className={`text-xs ${URGENCY_COLOR[s.urgency] || ""}`}>{s.urgency?.replace("_", " ")}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => removeSchedule.mutate(s.id)} className="text-xs h-7">Remove</Button></TableCell>
                </TableRow>
              ))}
              {(schedules as any[]).length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No PM schedules. Click "Add Schedule" to begin.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="work-orders">
          <Table>
            <TableHeader><TableRow><TableHead>Machine</TableHead><TableHead>Task</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Downtime</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(workOrders as any[]).map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.machine_name}</TableCell>
                  <TableCell>{w.task_name}</TableCell>
                  <TableCell className={new Date(w.due_date) < new Date() && w.status !== "completed" ? "text-red-600 font-medium" : ""}>{w.due_date ? new Date(w.due_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLOR[w.status] || "bg-gray-100"}`}>{w.status}</Badge></TableCell>
                  <TableCell>{w.downtime_minutes ? `${w.downtime_minutes}min` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.technician_notes?.slice(0, 40) || "—"}</TableCell>
                  <TableCell>
                    {w.status !== "completed" && (
                      <Button size="sm" variant="outline" onClick={() => setCompleteOpen(w.id)} className="text-xs h-7 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Complete</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(workOrders as any[]).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No PM work orders. Click "Generate WOs" to create from due schedules.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="oee">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">OEE — PM Integration</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>PM downtime is captured on WO completion and reflected in OEE Availability</li>
                <li>Completed PM WOs reduce unplanned breakdown frequency (OEE MTBF improvement)</li>
                <li>Machine OEE dashboard at <span className="font-mono">/manufacturing/machine-oee</span> shows PM-scheduled vs unplanned downtime</li>
                <li>World-class OEE target: 85%+ (Availability × Performance × Quality)</li>
              </ul>
            </div>
            {oeeDash && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Average OEE", value: `${Number(oeeDash.avg_oee || 0).toFixed(1)}%`, color: Number(oeeDash.avg_oee) >= 85 ? "text-green-600" : "text-amber-600" },
                  { label: "Total Downtime (min)", value: oeeDash.total_downtime || 0 },
                  { label: "Machines Tracked", value: oeeDash.machine_count || 0 },
                ].map((kpi, i) => (
                  <Card key={i}><CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${(kpi as any).color || ""}`}>{kpi.value}</p>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add PM Schedule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Machine Name</Label><Input value={sForm.machine_name} onChange={e => setSForm(f => ({ ...f, machine_name: e.target.value }))} placeholder="Press #3" /></div>
            <div><Label>Priority</Label>
              <Select value={sForm.priority} onValueChange={v => setSForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Task Name</Label><Input value={sForm.task_name} onChange={e => setSForm(f => ({ ...f, task_name: e.target.value }))} placeholder="Lubricate spindle bearings" /></div>
            <div><Label>Frequency</Label>
              <Select value={sForm.frequency} onValueChange={v => setSForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annual">Annual</SelectItem><SelectItem value="hours_based">Hours Based</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Est. Hours</Label><Input type="number" value={sForm.estimated_hours} onChange={e => setSForm(f => ({ ...f, estimated_hours: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Next Due Date</Label><Input type="date" value={sForm.next_due_date} onChange={e => setSForm(f => ({ ...f, next_due_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Checklist (one item per line)</Label><Textarea value={sForm.checklist} onChange={e => setSForm(f => ({ ...f, checklist: e.target.value }))} rows={3} placeholder="Check oil level&#10;Inspect belts&#10;Clean filters" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={() => addSchedule.mutate({ ...sForm, estimated_hours: Number(sForm.estimated_hours) })} disabled={!sForm.machine_name || !sForm.task_name || !sForm.next_due_date || addSchedule.isPending}>Save Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {completeOpen !== null && (
        <Dialog open onOpenChange={() => setCompleteOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Complete PM Work Order #{completeOpen}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Technician Notes</Label><Textarea value={cForm.technician_notes} onChange={e => setCForm(f => ({ ...f, technician_notes: e.target.value }))} rows={3} placeholder="Work performed, observations, parts used..." /></div>
              <div><Label>Downtime (minutes)</Label><Input type="number" value={cForm.downtime_minutes} onChange={e => setCForm(f => ({ ...f, downtime_minutes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteOpen(null)}>Cancel</Button>
              <Button onClick={() => completeWO.mutate({ id: completeOpen, ...cForm, downtime_minutes: Number(cForm.downtime_minutes) })} disabled={completeWO.isPending} className="bg-green-600 hover:bg-green-700">
                {completeWO.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Mark Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
