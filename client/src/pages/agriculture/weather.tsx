import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, CloudRain, Thermometer, Wind } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY = { date: "", temperature_min: "", temperature_max: "", rainfall_mm: "", humidity_pct: "", wind_speed: "", notes: "" };

export default function WeatherPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: logs = [] } = useQuery({ queryKey: ["ag-weather"], queryFn: () => api("GET", "/api/agriculture/weather") });

  const save = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/weather", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-weather"] }); setOpen(false); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const recent7 = logs.slice(0, 7);
  const avgTemp = recent7.length ? (recent7.reduce((s: number, l: any) => s + (Number(l.temperature_max) + Number(l.temperature_min)) / 2, 0) / recent7.length).toFixed(1) : "—";
  const totalRain = recent7.reduce((s: number, l: any) => s + Number(l.rainfall_mm || 0), 0).toFixed(1);
  const avgHumidity = recent7.length ? (recent7.reduce((s: number, l: any) => s + Number(l.humidity_pct || 0), 0) / recent7.length).toFixed(0) : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weather Log</h1>
        <Button onClick={() => { setForm({ ...EMPTY }); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Entry</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Thermometer className="w-4 h-4" />Avg Temp (7d)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{avgTemp} <span className="text-base font-normal">°C</span></p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CloudRain className="w-4 h-4" />Total Rainfall (7d)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalRain} <span className="text-base font-normal">mm</span></p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wind className="w-4 h-4" />Avg Humidity (7d)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{avgHumidity} <span className="text-base font-normal">%</span></p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Min Temp (°C)</TableHead><TableHead>Max Temp (°C)</TableHead>
                <TableHead>Rainfall (mm)</TableHead><TableHead>Humidity %</TableHead><TableHead>Wind (km/h)</TableHead>
                <TableHead>Alert</TableHead><TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => {
                const highRain = Number(l.rainfall_mm) > 50;
                return (
                  <TableRow key={l.id} className={highRain ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                    <TableCell className="font-medium">{l.date}</TableCell>
                    <TableCell>{l.temperature_min}</TableCell>
                    <TableCell>{l.temperature_max}</TableCell>
                    <TableCell className={highRain ? "font-bold text-blue-600" : ""}>{l.rainfall_mm}</TableCell>
                    <TableCell>{l.humidity_pct}%</TableCell>
                    <TableCell>{l.wind_speed}</TableCell>
                    <TableCell>{highRain && <Badge variant="destructive">Heavy Rain</Badge>}</TableCell>
                    <TableCell className="max-w-xs truncate">{l.notes}</TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No weather records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Weather Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Date</label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Min Temp (°C)</label><Input type="number" value={form.temperature_min} onChange={e => set("temperature_min", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Max Temp (°C)</label><Input type="number" value={form.temperature_max} onChange={e => set("temperature_max", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Rainfall (mm)</label><Input type="number" value={form.rainfall_mm} onChange={e => set("rainfall_mm", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Humidity %</label><Input type="number" value={form.humidity_pct} onChange={e => set("humidity_pct", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Wind Speed (km/h)</label><Input type="number" value={form.wind_speed} onChange={e => set("wind_speed", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Notes</label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
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
