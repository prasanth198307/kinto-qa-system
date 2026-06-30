import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wheat, BarChart3 } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const GRADES = ["A", "B", "C", "Premium", "Standard"];
const EMPTY = { crop_id: "", harvest_date: "", quantity_harvested: "", unit: "tonnes", moisture_pct: "", grade: "Standard", storage_location: "" };

export default function HarvestPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [filterCrop, setFilterCrop] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data: crops = [] } = useQuery({ queryKey: ["ag-crops"], queryFn: () => api("GET", "/api/agriculture/crops") });
  const { data: harvests = [] } = useQuery({ queryKey: ["ag-harvests"], queryFn: () => api("GET", "/api/agriculture/harvests") });

  const save = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/harvests", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-harvests"] }); setOpen(false); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const filtered = harvests.filter((h: any) => {
    if (filterCrop !== "all" && String(h.crop_id) !== filterCrop) return false;
    if (filterFrom && h.harvest_date < filterFrom) return false;
    if (filterTo && h.harvest_date > filterTo) return false;
    return true;
  });

  const totalYield = filtered.reduce((s: number, h: any) => s + Number(h.quantity_harvested || 0), 0);
  const totalArea = filtered.reduce((s: number, h: any) => s + Number(h.area_acres || 0), 0);
  const avgPerAcre = totalArea > 0 ? (totalYield / totalArea).toFixed(2) : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Harvest Records</h1>
        <Button onClick={() => { setForm({ ...EMPTY }); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Record Harvest</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wheat className="w-4 h-4" />Total Yield</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalYield.toFixed(1)} <span className="text-base font-normal">tonnes</span></p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />Avg Yield / Acre</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{avgPerAcre} <span className="text-base font-normal">t/acre</span></p></CardContent></Card>
      </div>

      <div className="flex gap-4">
        <Select value={filterCrop} onValueChange={setFilterCrop}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Crops" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Crops</SelectItem>
            {crops.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.crop_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-40" placeholder="To" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead><TableHead>Farm</TableHead><TableHead>Harvest Date</TableHead>
                <TableHead>Qty Harvested</TableHead><TableHead>Unit</TableHead><TableHead>Moisture %</TableHead>
                <TableHead>Grade</TableHead><TableHead>Storage Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.crop_name}</TableCell>
                  <TableCell>{h.farm_name}</TableCell>
                  <TableCell>{h.harvest_date}</TableCell>
                  <TableCell>{h.quantity_harvested}</TableCell>
                  <TableCell>{h.unit}</TableCell>
                  <TableCell>{h.moisture_pct}%</TableCell>
                  <TableCell><Badge variant="outline">{h.grade}</Badge></TableCell>
                  <TableCell>{h.storage_location}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No harvest records found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Harvest</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Crop</label>
              <Select value={form.crop_id} onValueChange={v => set("crop_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{crops.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.crop_name} — {c.farm_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Harvest Date</label><Input type="date" value={form.harvest_date} onChange={e => set("harvest_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Qty Harvested</label><Input type="number" value={form.quantity_harvested} onChange={e => set("quantity_harvested", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Unit</label><Input value={form.unit} onChange={e => set("unit", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Moisture %</label><Input type="number" value={form.moisture_pct} onChange={e => set("moisture_pct", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Grade</label>
              <Select value={form.grade} onValueChange={v => set("grade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Storage Location</label><Input value={form.storage_location} onChange={e => set("storage_location", e.target.value)} /></div>
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
