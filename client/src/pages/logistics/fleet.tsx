import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, CheckCircle, Wrench, Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const empty = { vehicle_number: "", vehicle_type: "truck", make: "", model: "", year: "", rc_number: "", insurance_expiry: "", fitness_expiry: "", permit_expiry: "", load_capacity: "", owner_type: "own", status: "active" };

export default function FleetPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-fleet"], queryFn: () => api("GET", "/api/logistics/fleet") });
  const vehicles: any[] = Array.isArray(data) ? data : [];

  const save = useMutation({
    mutationFn: (body: any) => editing ? api("PUT", `/api/logistics/fleet/${editing.id}`, body) : api("POST", "/api/logistics/fleet", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-fleet"] }); setOpen(false); setEditing(null); setForm(empty); },
  });

  const total = vehicles.length;
  const active = vehicles.filter((v) => v.status === "active").length;
  const maintenance = vehicles.filter((v) => v.status === "maintenance").length;

  function openAdd() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(v: any) { setEditing(v); setForm({ ...v }); setOpen(true); }
  function set(k: string, val: string) { setForm((f: any) => ({ ...f, [k]: val })); }

  const statusColor: Record<string, string> = { active: "default", inactive: "secondary", maintenance: "destructive" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Vehicle</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Vehicles</CardTitle><Truck className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><CheckCircle className="w-4 h-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{active}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">In Maintenance</CardTitle><Wrench className="w-4 h-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{maintenance}</div></CardContent></Card>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load fleet data.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle No.</TableHead><TableHead>Type</TableHead><TableHead>Make / Model</TableHead><TableHead>Owner</TableHead><TableHead>Capacity (T)</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {vehicles.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No vehicles found.</TableCell></TableRow>}
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.vehicle_number}</TableCell>
                  <TableCell className="capitalize">{v.vehicle_type}</TableCell>
                  <TableCell>{v.make} {v.model}</TableCell>
                  <TableCell className="capitalize">{v.owner_type}</TableCell>
                  <TableCell>{v.load_capacity}</TableCell>
                  <TableCell><Badge variant={statusColor[v.status] as any || "secondary"}>{v.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Vehicle Number</label><Input value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Type</label>
              <Select value={form.vehicle_type} onValueChange={(v) => set("vehicle_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="truck">Truck</SelectItem><SelectItem value="mini-truck">Mini Truck</SelectItem><SelectItem value="tempo">Tempo</SelectItem><SelectItem value="trailer">Trailer</SelectItem></SelectContent></Select>
            </div>
            <div><label className="text-sm font-medium">Make</label><Input value={form.make} onChange={(e) => set("make", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Model</label><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Year</label><Input value={form.year} onChange={(e) => set("year", e.target.value)} /></div>
            <div><label className="text-sm font-medium">RC Number</label><Input value={form.rc_number} onChange={(e) => set("rc_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Insurance Expiry</label><Input type="date" value={form.insurance_expiry} onChange={(e) => set("insurance_expiry", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Fitness Expiry</label><Input type="date" value={form.fitness_expiry} onChange={(e) => set("fitness_expiry", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Permit Expiry</label><Input type="date" value={form.permit_expiry} onChange={(e) => set("permit_expiry", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Load Capacity (T)</label><Input value={form.load_capacity} onChange={(e) => set("load_capacity", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Owner Type</label>
              <Select value={form.owner_type} onValueChange={(v) => set("owner_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="own">Own</SelectItem><SelectItem value="hired">Hired</SelectItem></SelectContent></Select>
            </div>
            <div><label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
