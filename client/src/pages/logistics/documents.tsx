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

const DOC_TYPES = ["registration", "insurance", "fitness", "permit", "puc", "other"];

function expiryStatus(dateStr: string | null): { label: string; color: string; bg: string } {
  if (!dateStr) return { label: "N/A", color: "#6b7280", bg: "#f3f4f6" };
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired (${Math.abs(days)}d ago)`, color: "#fff", bg: "#ef4444" };
  if (days <= 30) return { label: `Expiring in ${days}d`, color: "#fff", bg: "#f59e0b" };
  return { label: `Valid — ${dateStr}`, color: "#fff", bg: "#22c55e" };
}

const EMPTY = { vehicle_id: "", doc_type: "registration", doc_number: "", issued_date: "", expiry_date: "", issuing_authority: "" };

export default function DocumentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: docs = [] } = useQuery({ queryKey: ["/api/logistics/vehicle-documents"], queryFn: () => api("GET", "/api/logistics/vehicle-documents") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api("PUT", `/api/logistics/vehicle-documents/${editing.id}`, data)
      : api("POST", "/api/logistics/vehicle-documents", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/vehicle-documents"] }); setShowForm(false); toast({ title: "Document saved" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/logistics/vehicle-documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/vehicle-documents"] }),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(d: any) { setEditing(d); setForm({ ...d }); setShowForm(true); }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  const vehicleMap = Object.fromEntries((Array.isArray(vehicles) ? vehicles : []).map((v: any) => [v.id, v.reg_no]));
  let list = Array.isArray(docs) ? docs : [];
  if (filterType !== "all") list = list.filter((d: any) => d.doc_type === filterType);
  if (filterStatus === "expired") list = list.filter((d: any) => d.expiry_date && new Date(d.expiry_date) < new Date());
  if (filterStatus === "expiring") list = list.filter((d: any) => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  });
  if (filterStatus === "valid") list = list.filter((d: any) => {
    if (!d.expiry_date) return true;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000);
    return days > 30;
  });

  const allDocs = Array.isArray(docs) ? docs : [];
  const expiredCount = allDocs.filter((d: any) => d.expiry_date && new Date(d.expiry_date) < new Date()).length;
  const expiringCount = allDocs.filter((d: any) => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vehicle Documents</h1>
        <Button onClick={openAdd}>+ Add Document</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card><CardContent style={{ paddingTop: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>{expiredCount}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Expired</div>
        </CardContent></Card>
        <Card><CardContent style={{ paddingTop: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{expiringCount}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Expiring (30 days)</div>
        </CardContent></Card>
        <Card><CardContent style={{ paddingTop: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{allDocs.length - expiredCount - expiringCount}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Valid</div>
        </CardContent></Card>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger style={{ width: 180 }}><SelectValue placeholder="Filter by type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger style={{ width: 180 }}><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring">Expiring (30d)</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Documents ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Vehicle", "Doc Type", "Doc Number", "Issued", "Expiry Status", "Authority", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((d: any) => {
                  const status = expiryStatus(d.expiry_date);
                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{vehicleMap[d.vehicle_id] || d.vehicle_id}</td>
                      <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{d.doc_type}</td>
                      <td style={{ padding: "8px 12px" }}>{d.doc_number || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{d.issued_date || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge style={{ background: status.bg, color: status.color }}>{status.label}</Badge>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{d.issuing_authority || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(d.id)}>Del</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No documents found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Vehicle</Label>
              <Select value={String(form.vehicle_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{(Array.isArray(vehicles) ? vehicles : []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.reg_no}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={form.doc_type} onValueChange={v => setForm((f: any) => ({ ...f, doc_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[["doc_number", "Document Number"], ["issuing_authority", "Issuing Authority"], ["issued_date", "Issued Date"], ["expiry_date", "Expiry Date"]].map(([k, lbl]) => (
              <div key={k}>
                <Label>{lbl}</Label>
                <Input value={form[k] || ""} onChange={set(k)} type={k.includes("date") ? "date" : "text"} />
              </div>
            ))}
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
