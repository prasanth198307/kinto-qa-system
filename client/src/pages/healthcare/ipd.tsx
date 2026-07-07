import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Plus, X, FileText, Download } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function IpdPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [charging, setCharging] = useState<number | null>(null);
  const [chargeForm, setChargeForm] = useState({ description: "", amount: "" });
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", ward_id: "", admission_date: new Date().toISOString().slice(0, 10), diagnosis: "", notes: "" });

  const { data: admissions = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ipd-admissions"], queryFn: () => api("GET", "/api/healthcare/ipd-admissions") });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });
  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"], queryFn: () => api("GET", "/api/healthcare/wards") });

  const admit = useMutation({ mutationFn: (b: any) => api("POST", "/api/healthcare/ipd-admissions", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd-admissions"] }); setShowForm(false); } });
  const addCharge = useMutation({ mutationFn: ({ id, b }: any) => api("POST", `/api/healthcare/ipd/${id}/bill/add-charge`, b), onSuccess: () => { setCharging(null); setChargeForm({ description: "", amount: "" }); } });
  const finalize = useMutation({ mutationFn: (id: number) => api("POST", `/api/healthcare/ipd/${id}/bill/finalize`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd-admissions"] }) });
  const discharge = useMutation({ mutationFn: (id: number) => api("PUT", `/api/healthcare/ipd-admissions/${id}`, { status: "discharged", discharge_date: new Date().toISOString().slice(0, 10) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd-admissions"] }) });

  const arr = Array.isArray(admissions) ? admissions : [];
  const active = arr.filter((a: any) => a.status !== "discharged");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">IPD — Admissions</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Admission</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><BedDouble className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Current Inpatients</p><p className="text-2xl font-bold">{active.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Admissions</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Discharged</p><p className="text-2xl font-bold text-green-600">{arr.length - active.length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Admit Patient</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Patient</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(p => ({ ...p, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Attending Doctor</Label>
              <Select value={form.doctor_id} onValueChange={v => setForm(p => ({ ...p, doctor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(doctors) && doctors.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ward</Label>
              <Select value={form.ward_id} onValueChange={v => setForm(p => ({ ...p, ward_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(wards) && wards.map((w: any) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Admission Date</Label><Input type="date" value={form.admission_date} onChange={e => setForm(p => ({ ...p, admission_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Provisional Diagnosis (ICD-10 on EMR page)</Label><Input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} /></div>
            <div className="col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => admit.mutate({ ...form, patient_id: parseInt(form.patient_id), doctor_id: parseInt(form.doctor_id), ward_id: parseInt(form.ward_id) })}>Admit</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {arr.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{a.patient_name ?? `Patient #${a.patient_id}`}</p>
                <p className="text-sm text-gray-600">Dr. {a.doctor_name ?? a.doctor_id} · Ward: {a.ward_name ?? a.ward_id}</p>
                <p className="text-xs text-gray-500">Admitted {a.admission_date?.slice(0, 10)}{a.discharge_date ? ` · Discharged ${a.discharge_date.slice(0, 10)}` : ""} · {a.diagnosis}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={a.status === "discharged" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{a.status ?? "admitted"}</Badge>
                <div className="flex gap-1 flex-wrap justify-end">
                  {a.status !== "discharged" && <>
                    <Button size="sm" variant="outline" onClick={() => setCharging(charging === a.id ? null : a.id)}>Add Charge</Button>
                    <Button size="sm" variant="outline" onClick={() => finalize.mutate(a.id)}>Finalize Bill → GL</Button>
                    <Button size="sm" onClick={() => discharge.mutate(a.id)}>Discharge</Button>
                  </>}
                  <Button size="sm" variant="outline" onClick={() => window.open(`/api/healthcare/ipd/${a.id}/bill-pdf`, "_blank")}><Download className="w-3 h-3 mr-1" />Bill PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/api/healthcare/ipd/${a.id}/discharge-summary`, "_blank")}><FileText className="w-3 h-3 mr-1" />Discharge Summary</Button>
                </div>
              </div>
            </CardContent>
            {charging === a.id && (
              <CardContent className="border-t pt-3 flex gap-2 items-end">
                <div className="flex-1"><Label className="text-xs">Charge Description</Label><Input value={chargeForm.description} onChange={e => setChargeForm(p => ({ ...p, description: e.target.value }))} placeholder="Room rent, OT charges, consumables…" /></div>
                <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={chargeForm.amount} onChange={e => setChargeForm(p => ({ ...p, amount: e.target.value }))} className="w-32" /></div>
                <Button size="sm" onClick={() => addCharge.mutate({ id: a.id, b: { description: chargeForm.description, amount: parseFloat(chargeForm.amount) } })}>Add</Button>
              </CardContent>
            )}
          </Card>
        ))}
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No IPD admissions.</p>}
      </div>
    </div>
  );
}
