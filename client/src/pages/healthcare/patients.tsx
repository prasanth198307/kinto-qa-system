import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X, Search } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY = { name: "", gender: "M", dob: "", phone: "", email: "", blood_group: "", address: "", emergency_contact: "", allergies: "" };

export default function PatientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/healthcare/patients", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); close(); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/healthcare/patients/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); close(); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/healthcare/patients/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const close = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); };
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name || "", gender: p.gender || "M", dob: p.dob?.slice(0, 10) || "", phone: p.phone || "", email: p.email || "", blood_group: p.blood_group || "", address: p.address || "", emergency_contact: p.emergency_contact || "", allergies: p.allergies || "" }); setShowForm(true); };

  const arr = Array.isArray(patients) ? patients : [];
  const filtered = arr.filter((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search) || p.patient_no?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Register Patient</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total Patients</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">With ABHA Linked</p><p className="text-2xl font-bold text-green-600">{arr.filter((p: any) => p.abha_number).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Known Allergies</p><p className="text-2xl font-bold text-orange-600">{arr.filter((p: any) => p.allergies).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-4 h-4 text-gray-400" />
        <Input placeholder="Search by name, phone, patient no…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Patient" : "Register Patient"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={close}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Full Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => f("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem><SelectItem value="O">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={e => f("dob", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div><Label>Blood Group</Label>
              <Select value={form.blood_group} onValueChange={v => f("blood_group", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => f("address", e.target.value)} /></div>
            <div><Label>Emergency Contact</Label><Input value={form.emergency_contact} onChange={e => f("emergency_contact", e.target.value)} /></div>
            <div className="col-span-3"><Label>Known Allergies</Label><Input value={form.allergies} onChange={e => f("allergies", e.target.value)} placeholder="Penicillin, sulfa drugs…" /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => editing ? update.mutate({ id: editing.id, b: form }) : create.mutate(form)}>{editing ? "Save" : "Register"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">{["Patient No", "Name", "Gender", "DOB", "Phone", "Blood", "ABHA", "Allergies", "Actions"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-mono text-xs">{p.patient_no ?? p.id}</td>
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2">{p.gender}</td>
                <td className="p-2">{p.dob?.slice(0, 10)}</td>
                <td className="p-2">{p.phone}</td>
                <td className="p-2">{p.blood_group}</td>
                <td className="p-2">{p.abha_number ? <Badge className="bg-green-100 text-green-800">Linked</Badge> : <Badge className="bg-gray-100 text-gray-500">—</Badge>}</td>
                <td className="p-2">{p.allergies ? <Badge className="bg-orange-100 text-orange-800">{p.allergies.slice(0, 20)}</Badge> : "—"}</td>
                <td className="p-2"><div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(p.id)}>Del</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No patients found.</p>}
      </div>
    </div>
  );
}
