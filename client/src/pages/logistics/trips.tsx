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

const STATUSES = ["planned", "in-transit", "delivered", "cancelled"];
const statusColor = (s: string): any => ({ planned: "outline", "in-transit": "secondary", delivered: "default", cancelled: "destructive" }[s] || "outline");

export default function LogisticsTripsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", driver_id: "", origin: "", destination: "", departure_time: "", cargo_description: "", cargo_weight_tons: "", client_name: "" });

  const { data: trips = [] } = useQuery({ queryKey: ["/api/logistics/trips"], queryFn: () => api("GET", "/api/logistics/trips") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });
  const { data: drivers = [] } = useQuery({ queryKey: ["/api/logistics/drivers"], queryFn: () => api("GET", "/api/logistics/drivers") });

  const addTrip = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/trips", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/trips"] }); setShowForm(false); toast({ title: "Trip created" }); }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", "/api/logistics/trips/" + id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/trips"] }); toast({ title: "Status updated" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trip Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Create Trip</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Trip</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no || v.vehicle_number}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.driver_id} onValueChange={v => setForm({ ...form, driver_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Driver" /></SelectTrigger>
                <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Origin" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} />
              <Input placeholder="Destination" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
              <Input type="datetime-local" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} />
              <Input placeholder="Cargo Description" value={form.cargo_description} onChange={e => setForm({ ...form, cargo_description: e.target.value })} />
              <Input placeholder="Cargo Weight (Tons)" type="number" value={form.cargo_weight_tons} onChange={e => setForm({ ...form, cargo_weight_tons: e.target.value })} />
              <Input placeholder="Client Name" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addTrip.mutate(form)}>Save Trip</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Active Trips</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip No</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Cargo (T)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.trip_no}</TableCell>
                  <TableCell>{t.vehicle_no}</TableCell>
                  <TableCell>{t.driver_name}</TableCell>
                  <TableCell>{t.origin}</TableCell>
                  <TableCell>{t.destination}</TableCell>
                  <TableCell>{t.departure_time ? new Date(t.departure_time).toLocaleString("en-IN") : "-"}</TableCell>
                  <TableCell>{t.eta ? new Date(t.eta).toLocaleString("en-IN") : "-"}</TableCell>
                  <TableCell>{t.cargo_weight_tons}</TableCell>
                  <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
                  <TableCell>
                    <Select onValueChange={v => updateStatus.mutate({ id: t.id, status: v })}>
                      <SelectTrigger className="w-32"><SelectValue placeholder="Move to" /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
