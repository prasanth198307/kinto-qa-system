import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Eye, Edit2, Users } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const BLANK = { name: "", date_of_birth: "", gender: "", blood_group: "", phone: "", email: "", address: "", emergency_contact: "", emergency_phone: "" };

export default function PatientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [viewing, setViewing] = useState<any>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/healthcare/patients", search],
    queryFn: () => api("GET", `/api/healthcare/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(d => Array.isArray(d) ? d : []),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["/api/healthcare/patients", viewing?.id, "visits"],
    queryFn: () => api("GET", `/api/healthcare/patients/${viewing.id}/visits`).then(d => Array.isArray(d) ? d : []),
    enabled: !!viewing?.id,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/healthcare/patients/${editing.id}`, d) : api("POST", "/api/healthcare/patients", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); setShowForm(false); setEditing(null); setForm({ ...BLANK }); },
  });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, date_of_birth: p.date_of_birth?.split("T")[0] ?? "", gender: p.gender ?? "", blood_group: p.blood_group ?? "", phone: p.phone ?? "", email: p.email ?? "", address: p.address ?? "", emergency_contact: p.emergency_contact ?? "", emergency_phone: p.emergency_phone ?? "" }); setShowForm(true); };

  const age = (dob: string) => { if (!dob) return "—"; const d = new Date(dob); const y = new Date().getFullYear() - d.getFullYear(); return `${y}y`; };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Patient Master</h1>
          <Badge variant="secondary">{patients.length}</Badge>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ ...BLANK }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Patient
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input className="pl-8" placeholder="Search name / phone / patient ID…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No patients found</TableCell></TableRow>
              )}
              {patients.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.patient_id || p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{age(p.date_of_birth)}</TableCell>
                  <TableCell>{p.gender || "—"}</TableCell>
                  <TableCell>{p.phone || "—"}</TableCell>
                  <TableCell>{p.blood_group ? <Badge variant="outline">{p.blood_group}</Badge> : "—"}</TableCell>
                  <TableCell className="text-xs text-gray-500">{p.last_visit ? new Date(p.last_visit).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(p)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); setForm({ ...BLANK }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Patient" : "Add Patient"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Full name" /></div>
            <div className="space-y-1"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => f("date_of_birth", e.target.value)} /></div>
            <div className="space-y-1"><Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => f("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Blood Group</Label>
              <Select value={form.blood_group} onValueChange={v => f("blood_group", v)}>
                <SelectTrigger><SelectValue placeholder="Blood group" /></SelectTrigger>
                <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="Phone" /></div>
            <div className="col-span-2 space-y-1"><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} placeholder="Email" /></div>
            <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => f("address", e.target.value)} placeholder="Address" /></div>
            <div className="space-y-1"><Label>Emergency Contact</Label><Input value={form.emergency_contact} onChange={e => f("emergency_contact", e.target.value)} placeholder="Name" /></div>
            <div className="space-y-1"><Label>Emergency Phone</Label><Input value={form.emergency_phone} onChange={e => f("emergency_phone", e.target.value)} placeholder="Phone" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={v => { if (!v) setViewing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Patient Details — {viewing?.name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Patient ID:</span> <span className="font-mono">{viewing.patient_id || viewing.id}</span></div>
                <div><span className="text-gray-500">DOB:</span> {viewing.date_of_birth?.split("T")[0] || "—"}</div>
                <div><span className="text-gray-500">Gender:</span> {viewing.gender || "—"}</div>
                <div><span className="text-gray-500">Blood Group:</span> {viewing.blood_group || "—"}</div>
                <div><span className="text-gray-500">Phone:</span> {viewing.phone || "—"}</div>
                <div><span className="text-gray-500">Email:</span> {viewing.email || "—"}</div>
                <div className="col-span-2"><span className="text-gray-500">Address:</span> {viewing.address || "—"}</div>
                <div><span className="text-gray-500">Emergency:</span> {viewing.emergency_contact || "—"}</div>
                <div><span className="text-gray-500">Emg. Phone:</span> {viewing.emergency_phone || "—"}</div>
              </div>
              <div>
                <p className="font-semibold text-sm mb-2">Visit History</p>
                {visits.length === 0 ? <p className="text-gray-400 text-sm">No visits recorded</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Doctor</TableHead><TableHead>Diagnosis</TableHead></TableRow></TableHeader>
                    <TableBody>{visits.map((v: any) => <TableRow key={v.id}><TableCell className="text-xs">{new Date(v.visit_date || v.created_at).toLocaleDateString()}</TableCell><TableCell>{v.appointment_type || "OPD"}</TableCell><TableCell>{v.doctor_name || "—"}</TableCell><TableCell className="text-xs">{v.diagnosis || "—"}</TableCell></TableRow>)}</TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
