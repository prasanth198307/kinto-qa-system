import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, X, CheckCircle, Pill } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", verified: "bg-blue-100 text-blue-800", dispensed: "bg-green-100 text-green-800" };
const EMPTY = { patient_name: "", patient_phone: "", doctor_name: "", doctor_reg_no: "", prescription_date: new Date().toISOString().slice(0, 10), rx_image_url: "", notes: "" };

export default function PrescriptionsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "dispensed">("pending");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: prescriptions = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/prescriptions"], queryFn: () => api("GET", "/api/pharmacy/prescriptions") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/pharmacy/prescriptions", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] }); setShowForm(false); setForm({ ...EMPTY }); } });
  const verify = useMutation({ mutationFn: (id: number) => api("POST", `/api/pharmacy/prescriptions/${id}/verify`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] }) });
  const dispense = useMutation({ mutationFn: (id: number) => api("POST", `/api/pharmacy/prescriptions/${id}/dispense`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const arr = Array.isArray(prescriptions) ? prescriptions : [];
  const visible = filter === "all" ? arr : arr.filter((p: any) => (filter === "pending" ? p.status !== "dispensed" : p.status === "dispensed"));
  const pending = arr.filter((p: any) => p.status !== "dispensed").length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prescription Management</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Prescription</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Rx</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Pending Dispense</p><p className="text-2xl font-bold text-yellow-600">{pending}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Dispensed</p><p className="text-2xl font-bold text-green-600">{arr.length - pending}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {(["pending", "dispensed", "all"] as const).map(fl => (
          <Button key={fl} variant={filter === fl ? "default" : "outline"} size="sm" onClick={() => setFilter(fl)}>{fl.charAt(0).toUpperCase() + fl.slice(1)}</Button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Record Prescription (Rx scan / manual)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Patient Name</Label><Input value={form.patient_name} onChange={e => f("patient_name", e.target.value)} /></div>
            <div><Label>Patient Phone</Label><Input value={form.patient_phone} onChange={e => f("patient_phone", e.target.value)} /></div>
            <div><Label>Rx Date</Label><Input type="date" value={form.prescription_date} onChange={e => f("prescription_date", e.target.value)} /></div>
            <div><Label>Doctor Name</Label><Input value={form.doctor_name} onChange={e => f("doctor_name", e.target.value)} /></div>
            <div><Label>Doctor Reg No</Label><Input value={form.doctor_reg_no} onChange={e => f("doctor_reg_no", e.target.value)} /></div>
            <div><Label>Rx Scan URL</Label><Input value={form.rx_image_url} onChange={e => f("rx_image_url", e.target.value)} placeholder="https://… (uploaded scan)" /></div>
            <div className="col-span-3"><Label>Notes / Medicines Prescribed</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate(form)}>Save Prescription</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {visible.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-semibold">{p.patient_name} <span className="text-gray-400 font-normal">· {p.patient_phone}</span></p>
                  <p className="text-sm text-gray-600">Dr. {p.doctor_name} {p.doctor_reg_no && `(${p.doctor_reg_no})`} · {p.prescription_date?.slice(0, 10)}</p>
                  {p.notes && <p className="text-xs text-gray-500">{p.notes}</p>}
                  {p.rx_image_url && <button className="text-xs text-blue-600 underline" onClick={() => window.open(p.rx_image_url, "_blank")}>View Rx scan</button>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={STATUS_COLORS[p.status] ?? "bg-gray-100"}>{p.status ?? "pending"}</Badge>
                <div className="flex gap-1">
                  {p.status === "pending" && <Button size="sm" variant="outline" onClick={() => verify.mutate(p.id)}><CheckCircle className="w-3 h-3 mr-1" />Verify</Button>}
                  {p.status !== "dispensed" && <Button size="sm" onClick={() => dispense.mutate(p.id)}><Pill className="w-3 h-3 mr-1" />Dispense → Bill</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {visible.length === 0 && <p className="text-center text-gray-400 py-8">No prescriptions found.</p>}
      </div>
    </div>
  );
}
