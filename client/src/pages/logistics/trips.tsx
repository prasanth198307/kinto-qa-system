import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_COLORS: Record<string, string> = {
  planned: "#6366f1",
  in_transit: "#f59e0b",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const STATUSES = ["planned", "in_transit", "delivered", "cancelled"];

const EMPTY = { trip_no: "", vehicle_id: "", driver_id: "", origin: "", destination: "", start_date: "", end_date: "", distance_km: "", status: "planned", notes: "" };

export default function TripsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  const { data: trips = [] } = useQuery({ queryKey: ["/api/logistics/trips"], queryFn: () => api("GET", "/api/logistics/trips") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });
  const { data: drivers = [] } = useQuery({ queryKey: ["/api/logistics/drivers"], queryFn: () => api("GET", "/api/logistics/drivers") });
  const { data: freightBills = [] } = useQuery({ queryKey: ["/api/logistics/freight-bills"], queryFn: () => api("GET", "/api/logistics/freight-bills") });

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api("PUT", `/api/logistics/trips/${editing.id}`, data)
      : api("POST", "/api/logistics/trips", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/trips"] }); setShowForm(false); toast({ title: "Trip saved" }); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/logistics/trips/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/trips"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/logistics/trips/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/trips"] }),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(t: any) { setEditing(t); setForm({ ...t }); setShowForm(true); }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  const vehicleMap = Object.fromEntries((Array.isArray(vehicles) ? vehicles : []).map((v: any) => [v.id, v.reg_no]));
  const driverMap = Object.fromEntries((Array.isArray(drivers) ? drivers : []).map((d: any) => [d.id, d.name]));
  const tripBills = selectedTrip ? (Array.isArray(freightBills) ? freightBills : []).filter((b: any) => b.trip_id === selectedTrip.id) : [];

  const nextStatus = (s: string) => {
    const idx = STATUSES.indexOf(s);
    return STATUSES[idx + 1] || null;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trip Management</h1>
        <Button onClick={openAdd}>+ New Trip</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {STATUSES.map(s => {
          const count = (Array.isArray(trips) ? trips : []).filter((t: any) => t.status === s).length;
          return (
            <Card key={s}>
              <CardContent style={{ paddingTop: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLORS[s] }}>{count}</div>
                <div style={{ fontSize: 13, color: "#6b7280", textTransform: "capitalize" }}>{s.replace("_", " ")}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Trips ({Array.isArray(trips) ? trips.length : 0})</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Trip No", "Vehicle", "Driver", "Origin", "Destination", "Start", "End", "Distance", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(trips) ? trips : []).map((t: any) => {
                  const next = nextStatus(t.status);
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                        <button onClick={() => setSelectedTrip(t === selectedTrip ? null : t)} style={{ color: "#4f46e5", background: "none", border: "none", cursor: "pointer" }}>{t.trip_no}</button>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{vehicleMap[t.vehicle_id] || t.vehicle_id}</td>
                      <td style={{ padding: "8px 12px" }}>{driverMap[t.driver_id] || t.driver_id}</td>
                      <td style={{ padding: "8px 12px" }}>{t.origin}</td>
                      <td style={{ padding: "8px 12px" }}>{t.destination}</td>
                      <td style={{ padding: "8px 12px" }}>{t.start_date}</td>
                      <td style={{ padding: "8px 12px" }}>{t.end_date || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{t.distance_km ? `${t.distance_km} km` : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge style={{ background: STATUS_COLORS[t.status], color: "#fff" }}>{t.status.replace("_", " ")}</Badge>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                          {next && t.status !== "cancelled" && (
                            <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: t.id, status: next })}
                              style={{ color: STATUS_COLORS[next], borderColor: STATUS_COLORS[next] }}>
                              → {next.replace("_", " ")}
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(t.id)}>Del</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!Array.isArray(trips) || trips.length === 0) && <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No trips found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTrip && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Freight Bills — {selectedTrip.trip_no}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSelectedTrip(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {tripBills.length === 0 ? <p style={{ color: "#6b7280" }}>No freight bills linked to this trip.</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                    {["Bill No", "Amount", "GST", "Total", "Status"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tripBills.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>{b.bill_no}</td>
                      <td style={{ padding: "8px 12px" }}>{fmt(b.amount)}</td>
                      <td style={{ padding: "8px 12px" }}>{fmt(b.gst_amount || 0)}</td>
                      <td style={{ padding: "8px 12px" }}>{fmt((b.amount || 0) + (b.gst_amount || 0))}</td>
                      <td style={{ padding: "8px 12px" }}><Badge variant={b.status === "paid" ? "default" : "secondary"}>{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 540 }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Trip" : "New Trip"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Trip No</Label><Input value={form.trip_no} onChange={set("trip_no")} /></div>
            <div><Label>Origin</Label><Input value={form.origin} onChange={set("origin")} /></div>
            <div><Label>Destination</Label><Input value={form.destination} onChange={set("destination")} /></div>
            <div><Label>Distance (km)</Label><Input type="number" value={form.distance_km} onChange={set("distance_km")} /></div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={set("start_date")} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={set("end_date")} /></div>
            <div>
              <Label>Vehicle</Label>
              <Select value={String(form.vehicle_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(Array.isArray(vehicles) ? vehicles : []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.reg_no}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select value={String(form.driver_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(Array.isArray(drivers) ? drivers : []).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: "1/-1" }}><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
