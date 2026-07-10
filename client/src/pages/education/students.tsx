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
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EMPTY = { name: "", roll_number: "", admission_no: "", class_id: "", gender: "M", dob: "", phone: "", parent_name: "", parent_phone: "", address: "", status: "active" };

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/students", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/students"] }); closeForm(); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/education/students/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/students"] }); closeForm(); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/students/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/students"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const closeForm = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, roll_number: s.roll_number || "", admission_no: s.admission_no || "", class_id: s.class_id?.toString() || "", gender: s.gender || "M", dob: s.dob || "", phone: s.phone || "", parent_name: s.parent_name || "", parent_phone: s.parent_phone || "", address: s.address || "", status: s.status || "active" });
    setShowForm(true);
  };

  const arr = Array.isArray(students) ? students : [];
  const filtered = arr.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.roll_number?.toLowerCase().includes(search.toLowerCase()) || s.admission_no?.toLowerCase().includes(search.toLowerCase()));
  const active = arr.filter(s => s.status === "active").length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add Student</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total Students</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-green-600">{active}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Inactive / Transferred</p><p className="text-2xl font-bold text-gray-500">{arr.length - active}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-4 h-4 text-gray-400" />
        <Input placeholder="Search by name, roll no, admission no…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Student" : "Add Student"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={closeForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Full Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Roll Number</Label><Input value={form.roll_number} onChange={e => f("roll_number", e.target.value)} /></div>
            <div><Label>Admission No</Label><Input value={form.admission_no} onChange={e => f("admission_no", e.target.value)} /></div>
            <div><Label>Class</Label>
              <Select value={form.class_id} onValueChange={v => f("class_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{Array.isArray(classes) && classes.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => f("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem><SelectItem value="O">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={e => f("dob", e.target.value)} /></div>
            <div><Label>Student Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={e => f("parent_name", e.target.value)} /></div>
            <div><Label>Parent Phone</Label><Input value={form.parent_phone} onChange={e => f("parent_phone", e.target.value)} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => f("address", e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="transferred">Transferred</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={() => editing ? update.mutate({ id: editing.id, b: { ...form, class_id: parseInt(form.class_id) } }) : create.mutate({ ...form, class_id: parseInt(form.class_id) })}>{editing ? "Save Changes" : "Add Student"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">{["Adm No", "Name", "Roll No", "Class", "Parent", "Phone", "Status", "Actions"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-mono text-xs">{s.admission_no}</td>
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2">{s.roll_number}</td>
                <td className="p-2">{s.class_name ?? `Class #${s.class_id}`} {s.section}</td>
                <td className="p-2">{s.parent_name}</td>
                <td className="p-2">{s.parent_phone}</td>
                <td className="p-2"><Badge className={s.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}>{s.status}</Badge></td>
                <td className="p-2"><div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(s.id)}>Del</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No students found.</p>}
      </div>
    </div>
  );
}
