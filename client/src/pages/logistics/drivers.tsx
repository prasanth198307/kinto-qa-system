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
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

function licBadge(exp: string | null) {
  if (!exp) return <Badge variant="outline">N/A</Badge>;
  const days = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge style={{ background: "#ef4444", color: "#fff" }}>Expired {exp}</Badge>;
  if (days <= 30) return <Badge style={{ background: "#f59e0b", color: "#fff" }}>{exp} ({days}d left)</Badge>;
  return <Badge style={{ background: "#22c55e", color: "#fff" }}>{exp}</Badge>;
}

const EMPTY = { name: "", license_no: "", license_expiry: "", phone: "", address: "", employee_id: "", assigned_vehicle_id: "", status: "active" };

export default function DriversPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const { data: drivers = [] } = useQuery({ queryKey: ["/api/logistics/drivers"], queryFn: () => api("GET", "/api/logistics/drivers") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const expiring = Array.isArray(drivers) ? drivers.filter((d: any) => {
    if (!d.license_expiry) return false;
    const days = Math.ceil((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
    return days <= 30;
  }) : [];

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api("PUT", `/api/logistics/drivers/${editing.id}`, data)
      : api("POST", "/api/logistics/drivers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/drivers"] }); setShowForm(false); toast({ title: editing ? "Driver updated" : "Driver added" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/logistics/drivers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/drivers"] }),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(d: any) { setEditing(d); setForm({ ...d }); setShowForm(true); }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  const vehicleMap = Object.fromEntries((Array.isArray(vehicles) ? vehicles : []).map((v: any) => [v.id, v.reg_no]));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Driver Management</h1>
        <Button onClick={openAdd}>+ Add Driver</Button>
      </div>

      {expiring.length > 0 && (
        <Alert style={{ borderColor: "#f59e0b", background: "#fffbeb" }}>
          <AlertDescription>⚠ License expiring soon: {expiring.map((d: any) => d.name).join(", ")}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Drivers ({Array.isArray(drivers) ? drivers.length : 0})</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Name", "License No", "License Expiry", "Phone", "Employee ID", "Assigned Vehicle", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(drivers) ? drivers : []).map((d: any) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: "8px 12px" }}>{d.license_no}</td>
                    <td style={{ padding: "8px 12px" }}>{licBadge(d.license_expiry)}</td>
                    <td style={{ padding: "8px 12px" }}>{d.phone}</td>
                    <td style={{ padding: "8px 12px" }}>{d.employee_id || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{d.assigned_vehicle_id ? vehicleMap[d.assigned_vehicle_id] || d.assigned_vehicle_id : "—"}</td>
                    <td style={{ padding: "8px 12px" }}><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(d.id)}>Del</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!Array.isArray(drivers) || drivers.length === 0) && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No drivers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Driver" : "Add Driver"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["name", "Full Name"], ["license_no", "License No"], ["phone", "Phone"], ["address", "Address"], ["employee_id", "Employee ID (HR Link)"], ["license_expiry", "License Expiry"]].map(([k, lbl]) => (
              <div key={k}>
                <Label>{lbl}</Label>
                <Input value={form[k] || ""} onChange={set(k)} type={k === "license_expiry" ? "date" : "text"} />
              </div>
            ))}
            <div>
              <Label>Assigned Vehicle</Label>
              <Select value={String(form.assigned_vehicle_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, assigned_vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(Array.isArray(vehicles) ? vehicles : []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.reg_no}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "inactive", "on_leave"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
