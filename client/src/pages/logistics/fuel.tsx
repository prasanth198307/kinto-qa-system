import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Fuel, TrendingUp, IndianRupee } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const empty = { vehicle_number: "", fuel_date: "", litres: "", rate: "", odometer_reading: "", fuel_type: "diesel", vendor: "" };

export default function FuelPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [filterVehicle, setFilterVehicle] = useState("all");

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-fuel"], queryFn: () => api("GET", "/api/logistics/fuel") });
  const logs: any[] = Array.isArray(data) ? data : [];

  const addLog = useMutation({
    mutationFn: (body: any) => api("POST", "/api/logistics/fuel", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-fuel"] }); setOpen(false); setForm(empty); },
  });

  const vehicles = Array.from(new Set(logs.map((l) => l.vehicle_number))).filter(Boolean);

  const now = new Date();
  const thisMonth = logs.filter((l) => {
    if (!l.fuel_date) return false;
    const d = new Date(l.fuel_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalCost = thisMonth.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const avgKmpl = (() => {
    const valid = logs.filter((l) => l.kmpl && parseFloat(l.kmpl) > 0);
    if (!valid.length) return 0;
    return (valid.reduce((s, l) => s + parseFloat(l.kmpl), 0) / valid.length).toFixed(2);
  })();

  const filtered = filterVehicle === "all" ? logs : logs.filter((l) => l.vehicle_number === filterVehicle);

  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  const amount = (parseFloat(form.litres) || 0) * (parseFloat(form.rate) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fuel Log</h1>
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Entry</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Fuel Cost This Month</CardTitle><IndianRupee className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalCost.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Fuel Efficiency</CardTitle><TrendingUp className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{avgKmpl} km/l</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Entries</CardTitle><Fuel className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{logs.length}</div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Vehicles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            {vehicles.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load fuel logs.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Date</TableHead><TableHead>Litres</TableHead><TableHead>Rate (₹/L)</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Odometer (km)</TableHead><TableHead>km/l</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No fuel entries found.</TableCell></TableRow>}
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.vehicle_number}</TableCell>
                  <TableCell>{l.fuel_date}</TableCell>
                  <TableCell>{l.litres}</TableCell>
                  <TableCell>{l.rate}</TableCell>
                  <TableCell>{l.amount}</TableCell>
                  <TableCell>{l.odometer_reading}</TableCell>
                  <TableCell>{l.kmpl ? parseFloat(l.kmpl).toFixed(2) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Fuel Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Vehicle Number</label><Input value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Date</label><Input type="date" value={form.fuel_date} onChange={(e) => set("fuel_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Litres</label><Input type="number" value={form.litres} onChange={(e) => set("litres", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Rate (₹/L)</label><Input type="number" value={form.rate} onChange={(e) => set("rate", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Amount (₹)</label><Input value={amount.toFixed(2)} readOnly className="bg-muted" /></div>
            <div><label className="text-sm font-medium">Odometer (km)</label><Input type="number" value={form.odometer_reading} onChange={(e) => set("odometer_reading", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Fuel Type</label>
              <Select value={form.fuel_type} onValueChange={(v) => set("fuel_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="diesel">Diesel</SelectItem><SelectItem value="petrol">Petrol</SelectItem><SelectItem value="cng">CNG</SelectItem></SelectContent></Select>
            </div>
            <div><label className="text-sm font-medium">Vendor</label><Input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addLog.mutate({ ...form, amount: amount.toFixed(2) })} disabled={addLog.isPending}>{addLog.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
