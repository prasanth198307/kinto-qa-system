import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Layers, Activity } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY = { farm_code: "", farm_name: "", location: "", area_acres: "", soil_type: "", water_source: "", status: "active" };

export default function FarmsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: farms = [] } = useQuery({ queryKey: ["ag-farms"], queryFn: () => api("GET", "/api/agriculture/farms") });

  const save = useMutation({
    mutationFn: (f: any) => editing ? api("PUT", `/api/agriculture/farms/${editing.id}`, f) : api("POST", "/api/agriculture/farms", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-farms"] }); setOpen(false); },
  });

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY }); setOpen(true); };
  const openEdit = (f: any) => { setEditing(f); setForm({ farm_code: f.farm_code, farm_name: f.farm_name, location: f.location, area_acres: f.area_acres, soil_type: f.soil_type, water_source: f.water_source, status: f.status }); setOpen(true); };
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const total = farms.length;
  const totalArea = farms.reduce((s: number, f: any) => s + Number(f.area_acres || 0), 0).toFixed(1);
  const active = farms.filter((f: any) => f.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Farm Master</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Farm</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" />Total Farms</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Layers className="w-4 h-4" />Total Area</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalArea} <span className="text-base font-normal">acres</span></p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" />Active Farms</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{active}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Area (acres)</TableHead>
                <TableHead>Soil Type</TableHead>
                <TableHead>Water Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farms.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono">{f.farm_code}</TableCell>
                  <TableCell className="font-medium">{f.farm_name}</TableCell>
                  <TableCell>{f.location}</TableCell>
                  <TableCell>{f.area_acres}</TableCell>
                  <TableCell>{f.soil_type}</TableCell>
                  <TableCell>{f.water_source}</TableCell>
                  <TableCell><Badge variant={f.status === "active" ? "default" : "secondary"}>{f.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(f)}>Edit</Button></TableCell>
                </TableRow>
              ))}
              {farms.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No farms found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Farm" : "Add Farm"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><label className="text-sm font-medium mb-1 block">Farm Code</label><Input value={form.farm_code} onChange={e => set("farm_code", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Farm Name</label><Input value={form.farm_name} onChange={e => set("farm_name", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Location</label><Input value={form.location} onChange={e => set("location", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Area (acres)</label><Input type="number" value={form.area_acres} onChange={e => set("area_acres", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Soil Type</label><Input value={form.soil_type} onChange={e => set("soil_type", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Water Source</label><Input value={form.water_source} onChange={e => set("water_source", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
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
