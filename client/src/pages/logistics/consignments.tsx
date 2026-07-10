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
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_COLORS: Record<string, string> = {
  pending: "#6366f1",
  in_transit: "#f59e0b",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const EMPTY = {
  lr_no: "", shipper_name: "", consignee_name: "", origin: "", destination: "",
  weight_kg: "", freight_charges: "", status: "pending", goods_description: "",
  vehicle_id: "", driver_id: "", eway_bill_no: "",
};

export default function ConsignmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const { data: consignments = [] } = useQuery({ queryKey: ["/api/logistics/consignment-notes"], queryFn: () => api("GET", "/api/logistics/consignment-notes") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });
  const { data: drivers = [] } = useQuery({ queryKey: ["/api/logistics/drivers"], queryFn: () => api("GET", "/api/logistics/drivers") });

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api("PUT", `/api/logistics/consignment-notes/${editing.id}`, data)
      : api("POST", "/api/logistics/consignment-notes", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/consignment-notes"] }); setShowForm(false); toast({ title: "Consignment saved" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/logistics/consignment-notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/consignment-notes"] }),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(c: any) { setEditing(c); setForm({ ...c }); setShowForm(true); }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  const vehicleMap = Object.fromEntries((Array.isArray(vehicles) ? vehicles : []).map((v: any) => [v.id, v.reg_no]));
  const driverMap = Object.fromEntries((Array.isArray(drivers) ? drivers : []).map((d: any) => [d.id, d.name]));

  const list = Array.isArray(consignments) ? consignments : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consignment Notes (LR)</h1>
        <Button onClick={openAdd}>+ New LR</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {["pending", "in_transit", "delivered", "cancelled"].map(s => {
          const count = list.filter((c: any) => c.status === s).length;
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
        <CardHeader><CardTitle>Consignment Notes ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["LR No", "Shipper", "Consignee", "Origin", "Destination", "Weight", "Freight", "E-Way Bill", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.lr_no}</td>
                    <td style={{ padding: "8px 12px" }}>{c.shipper_name}</td>
                    <td style={{ padding: "8px 12px" }}>{c.consignee_name}</td>
                    <td style={{ padding: "8px 12px" }}>{c.origin}</td>
                    <td style={{ padding: "8px 12px" }}>{c.destination}</td>
                    <td style={{ padding: "8px 12px" }}>{c.weight_kg ? `${c.weight_kg} kg` : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.freight_charges ? fmt(c.freight_charges) : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.eway_bill_no || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <Badge style={{ background: STATUS_COLORS[c.status] || "#6b7280", color: "#fff" }}>{c.status?.replace("_", " ")}</Badge>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button size="sm" variant="outline"
                          onClick={() => window.open(`/api/logistics/consignment-notes/${c.id}/lr-pdf`, "_blank")}>
                          LR PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(c.id)}>Del</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No consignments found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 580 }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Consignment" : "New Consignment Note"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["lr_no", "LR No"], ["shipper_name", "Shipper"], ["consignee_name", "Consignee"], ["origin", "Origin"], ["destination", "Destination"], ["weight_kg", "Weight (kg)"], ["freight_charges", "Freight Charges (₹)"], ["eway_bill_no", "E-Way Bill No"], ["goods_description", "Goods Description"]].map(([k, lbl]) => (
              <div key={k} style={k === "goods_description" ? { gridColumn: "1/-1" } : {}}>
                <Label>{lbl}</Label>
                <Input value={form[k] || ""} onChange={set(k)} type={["weight_kg", "freight_charges"].includes(k) ? "number" : "text"} />
              </div>
            ))}
            <div>
              <Label>Vehicle</Label>
              <Select value={String(form.vehicle_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(Array.isArray(vehicles) ? vehicles : []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.reg_no}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select value={String(form.driver_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(Array.isArray(drivers) ? drivers : []).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending", "in_transit", "delivered", "cancelled"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
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
