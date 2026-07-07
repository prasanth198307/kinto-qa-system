import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function expiryBadge(dateStr: string | null) {
  if (!dateStr) return <Badge variant="outline">N/A</Badge>;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge style={{ background: "#ef4444", color: "#fff" }}>Expired</Badge>;
  if (days <= 30) return <Badge style={{ background: "#f59e0b", color: "#fff" }}>{dateStr} ({days}d)</Badge>;
  return <Badge style={{ background: "#22c55e", color: "#fff" }}>{dateStr}</Badge>;
}

const EMPTY_VEHICLE = { reg_no: "", type: "truck", make: "", model: "", year: "", capacity_tons: "", fuel_type: "diesel", status: "active", insurance_expiry: "", fitness_expiry: "", permit_expiry: "", puc_expiry: "" };

export default function FleetPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_VEHICLE);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showMaint, setShowMaint] = useState(false);
  const [maintForm, setMaintForm] = useState({ type: "", description: "", cost: "", date: new Date().toISOString().slice(0, 10) });

  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });
  const { data: maintDue = [] } = useQuery({ queryKey: ["/api/logistics/vehicles/maintenance-due"], queryFn: () => api("GET", "/api/logistics/vehicles/maintenance-due") });
  const { data: maintSchedule = [] } = useQuery({
    queryKey: ["/api/logistics/vehicles", selectedVehicle?.id, "maintenance-schedule"],
    queryFn: () => api("GET", `/api/logistics/vehicles/${selectedVehicle.id}/maintenance-schedule`),
    enabled: !!selectedVehicle,
  });

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api("PUT", `/api/logistics/vehicles/${editing.id}`, data)
      : api("POST", "/api/logistics/vehicles", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }); setShowForm(false); toast({ title: editing ? "Vehicle updated" : "Vehicle added" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/logistics/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }),
  });

  const addMaintMut = useMutation({
    mutationFn: (data: any) => api("POST", `/api/logistics/vehicles/${selectedVehicle.id}/maintenance`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/vehicles", selectedVehicle?.id, "maintenance-schedule"] }); setShowMaint(false); toast({ title: "Maintenance record added" }); },
  });

  function openAdd() { setEditing(null); setForm(EMPTY_VEHICLE); setShowForm(true); }
  function openEdit(v: any) { setEditing(v); setForm({ ...v }); setShowForm(true); }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <Button onClick={openAdd}>+ Add Vehicle</Button>
      </div>

      {Array.isArray(maintDue) && maintDue.length > 0 && (
        <Alert style={{ borderColor: "#f59e0b", background: "#fffbeb" }}>
          <AlertDescription>⚠ {maintDue.length} vehicle(s) have maintenance due: {maintDue.map((v: any) => v.reg_no).join(", ")}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Vehicles ({vehicles.length})</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Reg No", "Type", "Make/Model", "Year", "Capacity", "Fuel", "Status", "Insurance", "Fitness", "Permit", "PUC", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v: any) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{v.reg_no}</td>
                    <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{v.type}</td>
                    <td style={{ padding: "8px 12px" }}>{v.make} {v.model}</td>
                    <td style={{ padding: "8px 12px" }}>{v.year}</td>
                    <td style={{ padding: "8px 12px" }}>{v.capacity_tons}T</td>
                    <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{v.fuel_type}</td>
                    <td style={{ padding: "8px 12px" }}><Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status}</Badge></td>
                    <td style={{ padding: "8px 12px" }}>{expiryBadge(v.insurance_expiry)}</td>
                    <td style={{ padding: "8px 12px" }}>{expiryBadge(v.fitness_expiry)}</td>
                    <td style={{ padding: "8px 12px" }}>{expiryBadge(v.permit_expiry)}</td>
                    <td style={{ padding: "8px 12px" }}>{expiryBadge(v.puc_expiry)}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedVehicle(v); }}>Maint</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(v.id)}>Del</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && <tr><td colSpan={12} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No vehicles found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedVehicle && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Maintenance — {selectedVehicle.reg_no}</CardTitle>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" onClick={() => setShowMaint(true)}>+ Add Record</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedVehicle(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Date", "Type", "Description", "Cost"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.isArray(maintSchedule) && maintSchedule.map((m: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 12px" }}>{m.date}</td>
                    <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{m.type}</td>
                    <td style={{ padding: "8px 12px" }}>{m.description}</td>
                    <td style={{ padding: "8px 12px" }}>{m.cost ? fmt(m.cost) : "—"}</td>
                  </tr>
                ))}
                {(!Array.isArray(maintSchedule) || maintSchedule.length === 0) && <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No records.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 560 }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["reg_no", "Reg No"], ["make", "Make"], ["model", "Model"], ["year", "Year"], ["capacity_tons", "Capacity (T)"], ["insurance_expiry", "Insurance Expiry"], ["fitness_expiry", "Fitness Expiry"], ["permit_expiry", "Permit Expiry"], ["puc_expiry", "PUC Expiry"]].map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input value={form[k] || ""} onChange={set(k)} type={k.includes("expiry") ? "date" : "text"} />
              </div>
            ))}
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm((f: any) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["truck", "van", "tempo", "trailer", "container"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fuel Type</Label>
              <Select value={form.fuel_type} onValueChange={v => setForm((f: any) => ({ ...f, fuel_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["diesel", "petrol", "cng", "electric"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "inactive", "under_repair"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Maintenance Dialog */}
      <Dialog open={showMaint} onOpenChange={setShowMaint}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Maintenance Record</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gap: 12 }}>
            <div><Label>Date</Label><Input type="date" value={maintForm.date} onChange={e => setMaintForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Type</Label>
              <Select value={maintForm.type} onValueChange={v => setMaintForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{["oil_change", "tyre_change", "brake_service", "engine_service", "general"].map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Cost (₹)</Label><Input type="number" value={maintForm.cost} onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowMaint(false)}>Cancel</Button>
            <Button onClick={() => addMaintMut.mutate(maintForm)} disabled={addMaintMut.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
