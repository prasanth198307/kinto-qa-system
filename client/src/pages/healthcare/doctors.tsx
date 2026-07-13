import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Plus, X } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EMPTY = { name: "", specialization: "", qualification: "", registration_no: "", phone: "", email: "", consultation_fee: "", employee_id: "", opd_days: "" };

export default function DoctorsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/healthcare/doctors", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }); close(); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/healthcare/doctors/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }); close(); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/healthcare/doctors/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const close = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); };
  const openEdit = (d: any) => { setEditing(d); setForm({ name: d.name || "", specialization: d.specialization || "", qualification: d.qualification || "", registration_no: d.registration_no || "", phone: d.phone || "", email: d.email || "", consultation_fee: (d.consultation_fee ?? "").toString(), employee_id: (d.employee_id ?? "").toString(), opd_days: d.opd_days || "" }); setShowForm(true); };

  const arr = Array.isArray(doctors) ? doctors : [];
  const specializations = new Set(arr.map((d: any) => d.specialization).filter(Boolean));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctors</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add Doctor</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Stethoscope className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total Doctors</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Specializations</p><p className="text-2xl font-bold">{specializations.size}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">HR-Linked</p><p className="text-2xl font-bold text-green-600">{arr.filter((d: any) => d.employee_id).length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Doctor" : "Add Doctor"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={close}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Specialization</Label><Input value={form.specialization} onChange={e => f("specialization", e.target.value)} placeholder="Cardiology" /></div>
            <div><Label>Qualification</Label><Input value={form.qualification} onChange={e => f("qualification", e.target.value)} placeholder="MBBS, MD" /></div>
            <div><Label>Medical Reg No (NMC)</Label><Input value={form.registration_no} onChange={e => f("registration_no", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div><Label>Consultation Fee (₹)</Label><Input type="number" value={form.consultation_fee} onChange={e => f("consultation_fee", e.target.value)} /></div>
            <div><Label>HR Employee ID</Label><Input value={form.employee_id} onChange={e => f("employee_id", e.target.value)} placeholder="Links to hr_employees" /></div>
            <div><Label>OPD Days</Label><Input value={form.opd_days} onChange={e => f("opd_days", e.target.value)} placeholder="Mon, Wed, Fri" /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => { const b = { ...form, consultation_fee: parseFloat(form.consultation_fee || "0") }; editing ? update.mutate({ id: editing.id, b }) : create.mutate(b); }}>{editing ? "Save" : "Add"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {arr.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">Dr. {d.name}</p>
                <p className="text-sm text-gray-600">{d.specialization} · {d.qualification}</p>
                <p className="text-xs text-gray-500">Reg: {d.registration_no} · Fee: {sym}{d.consultation_fee}</p>
                <p className="text-xs text-gray-500">OPD: {d.opd_days ?? "—"} · {d.phone}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {d.employee_id ? <Badge className="bg-green-100 text-green-800">HR #{d.employee_id}</Badge> : <Badge className="bg-gray-100 text-gray-500">HR unlinked</Badge>}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(d.id)}>Del</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {arr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-8 text-center">No doctors registered.</p>}
      </div>
    </div>
  );
}
