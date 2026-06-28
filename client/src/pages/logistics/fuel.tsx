import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function LogisticsFuelPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", date: "", liters: "", rate_per_liter: "", odometer_reading: "", fuel_type: "diesel", station_name: "" });

  const { data: records = [] } = useQuery({ queryKey: ["/api/logistics/fuel/records"], queryFn: () => api("GET", "/api/logistics/fuel/records") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const addRecord = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/fuel/records", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/fuel/records"] }); setShowForm(false); toast({ title: "Fuel record added" }); }
  });

  // Vehicle-wise fuel cost summary
  const vehicleSummary = records.reduce((acc: any, r: any) => {
    const key = r.vehicle_no || r.vehicle_id;
    if (!acc[key]) acc[key] = { vehicle: key, totalLiters: 0, totalCost: 0, records: 0 };
    acc[key].totalLiters += Number(r.liters || 0);
    acc[key].totalCost += Number(r.amount || 0);
    acc[key].records += 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fuel Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Fuel Record</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Fuel Record</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no || v.vehicle_number}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <Input placeholder="Liters" type="number" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} />
              <Input placeholder="Rate per Liter" type="number" value={form.rate_per_liter} onChange={e => setForm({ ...form, rate_per_liter: e.target.value })} />
              <Input placeholder="Odometer Reading (km)" type="number" value={form.odometer_reading} onChange={e => setForm({ ...form, odometer_reading: e.target.value })} />
              <Select value={form.fuel_type} onValueChange={v => setForm({ ...form, fuel_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Station Name" value={form.station_name} onChange={e => setForm({ ...form, station_name: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addRecord.mutate(form)}>Save Record</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Vehicle-wise Fuel Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(vehicleSummary).map((v: any) => (
              <div key={v.vehicle} className="border rounded p-3 space-y-1">
                <div className="font-bold">{v.vehicle}</div>
                <div className="text-sm">{v.totalLiters.toFixed(1)} L ({v.records} fills)</div>
                <div className="text-sm font-medium">₹{fmt(v.totalCost)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fuel Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead>Rate (₹/L)</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Odometer (km)</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Mileage (km/L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date ? new Date(r.date).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell>{r.vehicle_no || r.vehicle_id}</TableCell>
                  <TableCell>{r.liters}</TableCell>
                  <TableCell>₹{fmt(r.rate_per_liter || r.rate)}</TableCell>
                  <TableCell>₹{fmt(r.amount)}</TableCell>
                  <TableCell>{r.odometer_km || r.odometer_reading}</TableCell>
                  <TableCell className="capitalize">{r.fuel_type}</TableCell>
                  <TableCell>{r.petrol_station || r.station_name}</TableCell>
                  <TableCell>{r.mileage_kmpl ? Number(r.mileage_kmpl).toFixed(2) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
