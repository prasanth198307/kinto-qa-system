import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const LICENSE_TYPES = ["Drug License (Retail 20/21)", "Drug License (Wholesale 20B/21B)", "GST Registration", "Narcotics License", "Schedule X License", "Shop & Establishment", "FSSAI (nutraceuticals)"];

function expiryBadge(expiry: string) {
  if (!expiry) return <Badge className="bg-gray-100 text-gray-600">No expiry</Badge>;
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
  if (days <= 60) return <Badge className="bg-orange-100 text-orange-800">Renew in {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
}

const EMPTY = { license_type: LICENSE_TYPES[0], license_number: "", issued_by: "", issue_date: "", expiry_date: "", pharmacist_name: "", pharmacist_reg_no: "" };

export default function LicensesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: licenses = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/licenses"], queryFn: () => api("GET", "/api/pharmacy/licenses") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/pharmacy/licenses", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/licenses"] }); close(); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/pharmacy/licenses/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/licenses"] }); close(); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/pharmacy/licenses/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pharmacy/licenses"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const close = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); };
  const openEdit = (l: any) => { setEditing(l); setForm({ license_type: l.license_type || LICENSE_TYPES[0], license_number: l.license_number || "", issued_by: l.issued_by || "", issue_date: l.issue_date?.slice(0, 10) || "", expiry_date: l.expiry_date?.slice(0, 10) || "", pharmacist_name: l.pharmacist_name || "", pharmacist_reg_no: l.pharmacist_reg_no || "" }); setShowForm(true); };

  const arr = Array.isArray(licenses) ? licenses : [];
  const expiring = arr.filter((l: any) => { const d = Math.floor((new Date(l.expiry_date).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 60; }).length;
  const expiredCount = arr.filter((l: any) => l.expiry_date && new Date(l.expiry_date) < new Date()).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Licenses & Compliance</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add License</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Licenses</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Renewal Due (60d)</p><p className="text-2xl font-bold text-orange-600">{expiring}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Expired</p><p className="text-2xl font-bold text-red-600">{expiredCount}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit License" : "Add License"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={close}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Type</Label>
              <Select value={form.license_type} onValueChange={v => f("license_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LICENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>License Number</Label><Input value={form.license_number} onChange={e => f("license_number", e.target.value)} /></div>
            <div><Label>Issued By</Label><Input value={form.issued_by} onChange={e => f("issued_by", e.target.value)} placeholder="State Drug Control" /></div>
            <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => f("issue_date", e.target.value)} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => f("expiry_date", e.target.value)} /></div>
            <div><Label>Registered Pharmacist</Label><Input value={form.pharmacist_name} onChange={e => f("pharmacist_name", e.target.value)} /></div>
            <div><Label>Pharmacist Reg No</Label><Input value={form.pharmacist_reg_no} onChange={e => f("pharmacist_reg_no", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => editing ? update.mutate({ id: editing.id, b: form }) : create.mutate(form)}>{editing ? "Save" : "Add"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {arr.map((l: any) => (
          <Card key={l.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-semibold">{l.license_type}</p>
                  <p className="text-sm text-gray-600">{l.license_number} · Issued by {l.issued_by}</p>
                  <p className="text-xs text-gray-500">Valid {l.issue_date?.slice(0, 10)} → {l.expiry_date?.slice(0, 10) ?? "—"}</p>
                  {l.pharmacist_name && <p className="text-xs text-gray-500">Pharmacist: {l.pharmacist_name} ({l.pharmacist_reg_no})</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {expiryBadge(l.expiry_date)}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(l)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(l.id)}>Del</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No licenses recorded.</p>}
      </div>
    </div>
  );
}
