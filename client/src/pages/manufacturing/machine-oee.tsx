import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const oeeColor = (oee: number) => oee >= 0.85 ? "text-green-600" : oee >= 0.65 ? "text-yellow-600" : "text-red-600";
const oeeLabel = (oee: number) => oee >= 0.85 ? "World Class" : oee >= 0.65 ? "Typical" : "Needs Attention";

export default function MachineOEEPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [oeeOpen, setOeeOpen] = useState(false);
  const [downtimeOpen, setDowntimeOpen] = useState(false);
  const [oeeForm, setOeeForm] = useState({ machineId: "", machineName: "", recordDate: new Date().toISOString().slice(0,10), shift: "Morning", plannedMinutes: "480", downtimeMinutes: "0", idealCycleTimeSec: "", totalUnitsProduced: "", goodUnits: "" });
  const [dtForm, setDtForm] = useState({ machineId: "", machineName: "", downtimeDate: new Date().toISOString().slice(0,10), shift: "Morning", startTime: "", endTime: "", category: "unplanned", reason: "" });

  const { data: dashboard } = useQuery({ queryKey: ["oee-dashboard"], queryFn: () => api("GET", "/api/manufacturing/oee/dashboard") });
  const { data: records = [] } = useQuery({ queryKey: ["oee-records"], queryFn: () => api("GET", "/api/manufacturing/oee/records") });

  const oeeMut = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/oee/records", oeeForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["oee-dashboard"] }); qc.invalidateQueries({ queryKey: ["oee-records"] }); setOeeOpen(false); toast({ title: "OEE record saved" }); },
  });
  const dtMut = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/oee/downtime", dtForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["oee-dashboard"] }); setDowntimeOpen(false); toast({ title: "Downtime logged" }); },
  });

  const dash = dashboard as any;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Machine OEE</h1>
          <p className="text-muted-foreground text-sm">Overall Equipment Effectiveness — Availability × Performance × Quality</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={downtimeOpen} onOpenChange={setDowntimeOpen}>
            <DialogTrigger asChild><Button variant="outline"><AlertTriangle className="w-4 h-4 mr-2" />Log Downtime</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Log Machine Downtime</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {(["machineId","machineName","downtimeDate","startTime","endTime","reason"] as const).map(f => (
                  <div key={f}><label className="text-sm font-medium capitalize">{f.replace(/([A-Z])/g," $1")}</label>
                    <Input type={f.includes("Date") ? "date" : f.includes("Time") ? "datetime-local" : "text"} value={dtForm[f]} onChange={e => setDtForm(p => ({ ...p, [f]: e.target.value }))} /></div>
                ))}
                <div><label className="text-sm font-medium">Category</label>
                  <Select value={dtForm.category} onValueChange={v => setDtForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["planned","unplanned","breakdown","setup","quality","idle"].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select></div>
                <Button className="w-full" onClick={() => dtMut.mutate()} disabled={!dtForm.machineId || !dtForm.startTime || dtMut.isPending}>Log Downtime</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={oeeOpen} onOpenChange={setOeeOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Record OEE</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Record OEE Data</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {(["machineId","machineName","recordDate","plannedMinutes","downtimeMinutes","idealCycleTimeSec","totalUnitsProduced","goodUnits"] as const).map(f => (
                  <div key={f}><label className="text-sm font-medium capitalize">{f.replace(/([A-Z])/g," $1")}</label>
                    <Input type={f === "recordDate" ? "date" : "number"} value={oeeForm[f]} onChange={e => setOeeForm(p => ({ ...p, [f]: e.target.value }))} /></div>
                ))}
                <div><label className="text-sm font-medium">Shift</label>
                  <Select value={oeeForm.shift} onValueChange={v => setOeeForm(f => ({ ...f, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Morning","Afternoon","Night"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select></div>
                <Button className="w-full" onClick={() => oeeMut.mutate()} disabled={!oeeForm.machineId || !oeeForm.recordDate || oeeMut.isPending}>Save OEE Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {dash?.oee_by_machine?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dash.oee_by_machine.map((m: any) => {
            const oee = Number(m.avg_oee) / 100;
            return (
              <Card key={m.machine_id}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{m.machine_name || m.machine_id}</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold ${oeeColor(oee)}`}>{m.avg_oee ?? "—"}%</div>
                  <Badge className="mt-1">{oeeLabel(oee)}</Badge>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Availability</span><span>{m.avg_availability ?? "—"}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Performance</span><span>{m.avg_performance ?? "—"}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Quality</span><span>{m.avg_quality ?? "—"}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Records</span><span>{m.record_count}</span></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="records">
        <TabsList><TabsTrigger value="records">OEE Records</TabsTrigger><TabsTrigger value="downtime">Downtime Log</TabsTrigger><TabsTrigger value="trend">Trend</TabsTrigger></TabsList>

        <TabsContent value="records">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Machine</TableHead><TableHead>Date</TableHead><TableHead>Shift</TableHead>
                <TableHead>Availability</TableHead><TableHead>Performance</TableHead><TableHead>Quality</TableHead><TableHead>OEE</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(records as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No OEE records yet. Start recording daily production data.</TableCell></TableRow>
                ) : (records as any[]).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.machine_name || r.machine_id}</TableCell>
                    <TableCell>{new Date(r.record_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{r.shift || "—"}</TableCell>
                    <TableCell>{r.availability ? `${(Number(r.availability)*100).toFixed(1)}%` : "—"}</TableCell>
                    <TableCell>{r.performance ? `${(Number(r.performance)*100).toFixed(1)}%` : "—"}</TableCell>
                    <TableCell>{r.quality ? `${(Number(r.quality)*100).toFixed(1)}%` : "—"}</TableCell>
                    <TableCell className={`font-bold ${r.oee ? oeeColor(Number(r.oee)) : ""}`}>{r.oee ? `${(Number(r.oee)*100).toFixed(1)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="downtime">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Machine</TableHead><TableHead>Category</TableHead><TableHead>Total Downtime</TableHead><TableHead>Incidents</TableHead></TableRow></TableHeader>
              <TableBody>
                {!dash?.downtime_by_category?.length ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No downtime logged yet.</TableCell></TableRow>
                ) : dash.downtime_by_category.map((d: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{d.machine_name || d.machine_id}</TableCell>
                    <TableCell className="capitalize"><Badge variant="outline">{d.category}</Badge></TableCell>
                    <TableCell>{d.total_downtime_mins ? `${Number(d.total_downtime_mins).toFixed(0)} min` : "—"}</TableCell>
                    <TableCell>{d.incidents}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Avg OEE</TableHead></TableRow></TableHeader>
              <TableBody>
                {!dash?.oee_trend?.length ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No trend data yet.</TableCell></TableRow>
                ) : dash.oee_trend.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(t.record_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className={`font-bold ${oeeColor(Number(t.avg_oee)/100)}`}>{t.avg_oee}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
