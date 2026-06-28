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

const statusColor = (s: string): any => ({ active: "default", "in-trip": "secondary", maintenance: "destructive", idle: "outline" }[s] || "outline");

export default function LogisticsFleetPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_number: "", vehicle_type: "truck", make_model: "", capacity_tons: "", owner_name: "", rc_expiry: "", insurance_expiry: "" });

  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const addVehicle = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/vehicles", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }); setShowForm(false); toast({ title: "Vehicle added" }); }
  });

  const total = vehicles.length;
  const active = vehicles.filter((v: any) => v.status === "active").length;
  const inTrip = vehicles.filter((v: any) => v.status === "in-trip").length;
  const maintenance = vehicles.filter((v: any) => v.status === "maintenance").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Vehicle</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{total}</div><div className="text-sm text-muted-foreground">Total Vehicles</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{active}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{inTrip}</div><div className="text-sm text-muted-foreground">In Trip</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{maintenance}</div><div className="text-sm text-muted-foreground">Maintenance</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Vehicle</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Vehicle Number" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} />
              <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="tempo">Tempo</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Make & Model" value={form.make_model} onChange={e => setForm({ ...form, make_model: e.target.value })} />
              <Input placeholder="Capacity (Tons)" type="number" value={form.capacity_tons} onChange={e => setForm({ ...form, capacity_tons: e.target.value })} />
              <Input placeholder="Owner Name" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              <Input type="date" placeholder="RC Expiry" value={form.rc_expiry} onChange={e => setForm({ ...form, rc_expiry: e.target.value })} />
              <Input type="date" placeholder="Insurance Expiry" value={form.insurance_expiry} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addVehicle.mutate(form)}>Save Vehicle</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Vehicles</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Capacity (Tons)</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Service</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.vehicle_no || v.vehicle_number}</TableCell>
                  <TableCell className="capitalize">{v.type || v.vehicle_type}</TableCell>
                  <TableCell>{v.owner || v.owner_name}</TableCell>
                  <TableCell>{v.capacity_tons}</TableCell>
                  <TableCell>{v.driver_name || "-"}</TableCell>
                  <TableCell><Badge variant={statusColor(v.status)}>{v.status}</Badge></TableCell>
                  <TableCell>{v.last_service ? new Date(v.last_service).toLocaleDateString("en-IN") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
