import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STAGES = ["sowing", "growing", "harvesting", "completed"];
const SEASONS = ["Kharif", "Rabi", "Zaid"];
const EMPTY_CROP = { crop_code: "", crop_name: "", farm_id: "", variety: "", sowing_date: "", expected_harvest: "", area_acres: "", season: "Kharif", status: "sowing" };
const statusColor: Record<string, any> = { sowing: "secondary", growing: "default", harvesting: "outline", completed: "destructive" };

export default function CropsPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_CROP });
  const [newStage, setNewStage] = useState("sowing");
  const [filterFarm, setFilterFarm] = useState("all");
  const [filterSeason, setFilterSeason] = useState("all");

  const { data: farms = [] } = useQuery({ queryKey: ["ag-farms"], queryFn: () => api("GET", "/api/agriculture/farms") });
  const { data: crops = [] } = useQuery({ queryKey: ["ag-crops"], queryFn: () => api("GET", "/api/agriculture/crops") });

  const addCrop = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/crops", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-crops"] }); setAddOpen(false); },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/agriculture/crops/${id}/stage`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-crops"] }); setStageOpen(false); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const openStage = (c: any) => { setSelected(c); setNewStage(c.status); setStageOpen(true); };

  const filtered = crops.filter((c: any) =>
    (filterFarm === "all" || String(c.farm_id) === filterFarm) &&
    (filterSeason === "all" || c.season === filterSeason)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Crop Management</h1>
        <Button onClick={() => { setForm({ ...EMPTY_CROP }); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Crop</Button>
      </div>

      <div className="flex gap-4">
        <Select value={filterFarm} onValueChange={setFilterFarm}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Farms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Farms</SelectItem>
            {farms.map((f: any) => <SelectItem key={f.id} value={String(f.id)}>{f.farm_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Seasons" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Crop Name</TableHead><TableHead>Farm</TableHead>
                <TableHead>Variety</TableHead><TableHead>Sowing Date</TableHead><TableHead>Exp. Harvest</TableHead>
                <TableHead>Area (acres)</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.crop_code}</TableCell>
                  <TableCell className="font-medium">{c.crop_name}</TableCell>
                  <TableCell>{c.farm_name}</TableCell>
                  <TableCell>{c.variety}</TableCell>
                  <TableCell>{c.sowing_date}</TableCell>
                  <TableCell>{c.expected_harvest}</TableCell>
                  <TableCell>{c.area_acres}</TableCell>
                  <TableCell><Badge variant={statusColor[c.status] || "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openStage(c)}><RefreshCw className="w-3 h-3 mr-1" />Stage</Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No crops found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Crop</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><label className="text-sm font-medium mb-1 block">Crop Code</label><Input value={form.crop_code} onChange={e => set("crop_code", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Crop Name</label><Input value={form.crop_name} onChange={e => set("crop_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Farm</label>
              <Select value={form.farm_id} onValueChange={v => set("farm_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
                <SelectContent>{farms.map((f: any) => <SelectItem key={f.id} value={String(f.id)}>{f.farm_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Variety</label><Input value={form.variety} onChange={e => set("variety", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Sowing Date</label><Input type="date" value={form.sowing_date} onChange={e => set("sowing_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Expected Harvest</label><Input type="date" value={form.expected_harvest} onChange={e => set("expected_harvest", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Area (acres)</label><Input type="number" value={form.area_acres} onChange={e => set("area_acres", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Season</label>
              <Select value={form.season} onValueChange={v => set("season", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addCrop.mutate(form)} disabled={addCrop.isPending}>{addCrop.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stageOpen} onOpenChange={setStageOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Stage — {selected?.crop_name}</DialogTitle></DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">New Stage</label>
            <Select value={newStage} onValueChange={setNewStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageOpen(false)}>Cancel</Button>
            <Button onClick={() => updateStage.mutate({ id: selected?.id, status: newStage })} disabled={updateStage.isPending}>{updateStage.isPending ? "Updating..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
