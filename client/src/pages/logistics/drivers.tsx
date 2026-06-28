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

export default function LogisticsDriversPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [assignDriverId, setAssignDriverId] = useState<number | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", license_number: "", license_expiry: "", address: "", emergency_contact: "" });

  const { data: drivers = [] } = useQuery({ queryKey: ["/api/logistics/drivers"], queryFn: () => api("GET", "/api/logistics/drivers") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const addDriver = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/drivers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/drivers"] }); setShowForm(false); toast({ title: "Driver added" }); }
  });

  const assignVehicle = useMutation({
    mutationFn: ({ driverId, vehicleId }: any) => api("PUT", "/api/logistics/drivers/" + driverId + "/assign", { vehicle_id: vehicleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/drivers"] }); setAssignDriverId(null); toast({ title: "Vehicle assigned" }); }
  });

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff < 30 && diff > 0;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Driver</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Driver</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="License Number" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} />
              <Input type="date" placeholder="License Expiry" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} />
              <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <Input placeholder="Emergency Contact" value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addDriver.mutate(form)}>Save Driver</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Drivers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License No</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Vehicle Assigned</TableHead>
                <TableHead>Trips (Month)</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d: any) => (
                <>
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.phone}</TableCell>
                    <TableCell>{d.license_no || d.license_number}</TableCell>
                    <TableCell>
                      <span className={isExpiringSoon(d.license_expiry) ? "text-yellow-600 font-bold" : new Date(d.license_expiry) < new Date() ? "text-red-600 font-bold" : ""}>
                        {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString("en-IN") : "-"}
                      </span>
                    </TableCell>
                    <TableCell>{d.vehicle_assigned || "-"}</TableCell>
                    <TableCell>{d.trips_this_month || 0}</TableCell>
                    <TableCell>{d.rating ? d.rating + " ★" : "-"}</TableCell>
                    <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setAssignDriverId(d.id === assignDriverId ? null : d.id)}>Assign Vehicle</Button></TableCell>
                  </TableRow>
                  {assignDriverId === d.id && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <div className="flex gap-4 items-center p-2">
                          <Select value={assignVehicleId} onValueChange={setAssignVehicleId}>
                            <SelectTrigger className="w-64"><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                            <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no || v.vehicle_number}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => assignVehicle.mutate({ driverId: d.id, vehicleId: assignVehicleId })}>Confirm</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
