import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, GraduationCap, BookOpen, Users } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const TABS = ["classes", "subjects", "teachers"] as const;
type Tab = typeof TABS[number];

export default function ClassesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("classes");
  const [showForm, setShowForm] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", section: "", academic_year: new Date().getFullYear().toString() });
  const [subForm, setSubForm] = useState({ name: "", code: "", class_id: "" });
  const [tchForm, setTchForm] = useState({ name: "", employee_id: "", qualification: "", specialization: "", phone: "", email: "" });

  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"], queryFn: () => api("GET", "/api/education/subjects") });
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"], queryFn: () => api("GET", "/api/education/teachers") });
  const { data: payroll = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers/payroll-status"], queryFn: () => api("GET", "/api/education/teachers/payroll-status"), enabled: tab === "teachers" });

  const createClass = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/classes", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/classes"] }); setShowForm(false); } });
  const delClass = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/classes/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/classes"] }) });
  const createSub = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/subjects", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/subjects"] }); setShowForm(false); } });
  const delSub = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/subjects/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/subjects"] }) });
  const createTch = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/teachers", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/teachers"] }); setShowForm(false); } });
  const delTch = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/teachers/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/teachers"] }) });

  const clsArr = Array.isArray(classes) ? classes : [];
  const subArr = Array.isArray(subjects) ? subjects : [];
  const tchArr = Array.isArray(teachers) ? teachers : [];
  const payArr = Array.isArray(payroll) ? payroll : [];
  const payMap = payArr.reduce((m: any, p: any) => { m[p.teacher_id] = p; return m; }, {});

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes, Subjects & Teachers</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add {tab === "classes" ? "Class" : tab === "subjects" ? "Subject" : "Teacher"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex gap-2 items-center"><GraduationCap className="w-6 h-6 text-blue-500" /><div><p className="text-sm text-gray-500">Classes</p><p className="text-xl font-bold">{clsArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex gap-2 items-center"><BookOpen className="w-6 h-6 text-green-500" /><div><p className="text-sm text-gray-500">Subjects</p><p className="text-xl font-bold">{subArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex gap-2 items-center"><Users className="w-6 h-6 text-purple-500" /><div><p className="text-sm text-gray-500">Teachers</p><p className="text-xl font-bold">{tchArr.length}</p></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {TABS.map(t => <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {showForm && tab === "classes" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Class</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Class Name</Label><Input value={classForm.name} onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))} placeholder="Class 10" /></div>
            <div><Label>Section</Label><Input value={classForm.section} onChange={e => setClassForm(p => ({ ...p, section: e.target.value }))} placeholder="A" /></div>
            <div><Label>Academic Year</Label><Input value={classForm.academic_year} onChange={e => setClassForm(p => ({ ...p, academic_year: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createClass.mutate(classForm)}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "subjects" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Subject</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Subject Name</Label><Input value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Code</Label><Input value={subForm.code} onChange={e => setSubForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label>Class</Label><Select value={subForm.class_id} onValueChange={v => setSubForm(p => ({ ...p, class_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createSub.mutate({ ...subForm, class_id: parseInt(subForm.class_id) })}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "teachers" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Teacher</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Name</Label><Input value={tchForm.name} onChange={e => setTchForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>HR Employee ID</Label><Input value={tchForm.employee_id} onChange={e => setTchForm(p => ({ ...p, employee_id: e.target.value }))} placeholder="Links to hr_employees" /></div>
            <div><Label>Qualification</Label><Input value={tchForm.qualification} onChange={e => setTchForm(p => ({ ...p, qualification: e.target.value }))} /></div>
            <div><Label>Specialization</Label><Input value={tchForm.specialization} onChange={e => setTchForm(p => ({ ...p, specialization: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={tchForm.phone} onChange={e => setTchForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={tchForm.email} onChange={e => setTchForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createTch.mutate(tchForm)}>Add Teacher</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "classes" && <div className="grid grid-cols-3 gap-3">{clsArr.map((c: any) => <Card key={c.id}><CardContent className="pt-4 flex justify-between items-start"><div><p className="font-semibold">{c.name} — {c.section}</p><p className="text-xs text-gray-500">{c.academic_year}</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delClass.mutate(c.id)}>Del</Button></CardContent></Card>)}{clsArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-4 text-center">No classes yet.</p>}</div>}

      {tab === "subjects" && <div className="grid grid-cols-3 gap-3">{subArr.map((s: any) => <Card key={s.id}><CardContent className="pt-4 flex justify-between"><div><p className="font-semibold">{s.name}</p><p className="text-xs text-gray-500">{s.code}</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delSub.mutate(s.id)}>Del</Button></CardContent></Card>)}{subArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-4 text-center">No subjects yet.</p>}</div>}

      {tab === "teachers" && <div className="space-y-2">{tchArr.map((t: any) => {
        const p = payMap[t.id];
        return <Card key={t.id}><CardContent className="pt-4 flex justify-between items-center">
          <div><p className="font-semibold">{t.name}</p><p className="text-sm text-gray-600">{t.specialization} · {t.qualification}</p><p className="text-xs text-gray-500">{t.phone} · HR emp: {t.employee_id || "Not linked"}</p></div>
          <div className="flex items-center gap-2">
            {p ? <Badge className={p.payroll_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{p.payroll_status} ({p.payroll_month}/{p.payroll_year})</Badge> : <Badge className="bg-gray-100 text-gray-500">Payroll: unlinked</Badge>}
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => delTch.mutate(t.id)}>Del</Button>
          </div>
        </CardContent></Card>;
      })}{tchArr.length === 0 && <p className="text-center text-gray-400 py-8">No teachers yet.</p>}</div>}
    </div>
  );
}
