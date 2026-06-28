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

const alertColor = (t: string): any => ({ speeding: "destructive", geofence: "secondary", idle: "outline" }[t] || "outline");

export default function LogisticsGPSPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", latitude: "", longitude: "", speed: "", status: "moving" });

  const { data: positions = [] } = useQuery({ queryKey: ["/api/logistics/gps/vehicles"], queryFn: () => api("GET", "/api/logistics/gps/vehicles"), refetchInterval: 30000 });
  const { data: alerts = [] } = useQuery({ queryKey: ["/api/logistics/gps/alerts"], queryFn: () => api("GET", "/api/logistics/gps/alerts") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const updateLocation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/gps/update", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/gps/vehicles"] }); setShowForm(false); toast({ title: "Location updated" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">GPS Tracking</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Update Location</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Manual Location Update</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no || v.vehicle_number}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Latitude" type="number" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
              <Input placeholder="Longitude" type="number" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
              <Input placeholder="Speed (km/h)" type="number" value={form.speed} onChange={e => setForm({ ...form, speed: e.target.value })} />
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moving">Moving</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="mt-4" onClick={() => updateLocation.mutate(form)}>Update</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Vehicle Positions (Live)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Last Location</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Speed (km/h)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p: any) => (
                <TableRow key={p.vehicle_id}>
                  <TableCell className="font-medium">{p.vehicle_no}</TableCell>
                  <TableCell>{p.last_location || "-"}</TableCell>
                  <TableCell>{p.latitude ? Number(p.latitude).toFixed(4) : "-"}</TableCell>
                  <TableCell>{p.longitude ? Number(p.longitude).toFixed(4) : "-"}</TableCell>
                  <TableCell>{p.speed || 0}</TableCell>
                  <TableCell><Badge variant={p.status === "moving" ? "default" : "outline"}>{p.status}</Badge></TableCell>
                  <TableCell>{p.last_updated ? new Date(p.last_updated).toLocaleString("en-IN") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>GPS Alerts</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.vehicle_no}</TableCell>
                    <TableCell><Badge variant={alertColor(a.alert_type)}>{a.alert_type}</Badge></TableCell>
                    <TableCell>{a.timestamp ? new Date(a.timestamp).toLocaleString("en-IN") : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
