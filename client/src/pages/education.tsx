import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, BookOpen, GraduationCap, ClipboardList, Library, Receipt, Pencil, Trash2, X, AlertTriangle, BookMarked } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function F({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function SC({ title, value, icon: Icon, color }: any) {
  return <Card><CardContent className="p-5 flex items-center gap-4"><div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}

function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/education/stats"] });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <SC title="Total Students" value={stats?.totalStudents ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
      <SC title="Total Teachers" value={stats?.totalTeachers ?? 0} icon={GraduationCap} color="bg-green-100 text-green-600" />
      <SC title="Total Classes" value={stats?.totalClasses ?? 0} icon={BookOpen} color="bg-purple-100 text-purple-600" />
      <SC title="Monthly Collection" value={`₹${fmt(stats?.monthlyCollection)}`} icon={Receipt} color="bg-orange-100 text-orange-600" />
      <SC title="Overdue Books" value={stats?.overdueBooks ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-600" />
      <SC title="Monthly Fee Target" value={`₹${fmt(stats?.monthlyFeeTarget)}`} icon={BookMarked} color="bg-teal-100 text-teal-600" />
    </div>
  );
}

function ClassesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"] });
  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/classes/${editing.id}`, d) : apiRequest("POST", "/api/education/classes", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/classes"] }); setShowForm(false); toast({ title: "Saved" }); },
  });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/classes/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/classes"] }) });
  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c }); setShowForm(true); };
  const onTeacher = (id: string) => { const t = (teachers as any[]).find((t: any) => String(t.id) === id); setForm({ ...form, teacher_id: id, teacher_name: t?.name || "" }); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Class</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Class Name","Grade","Section","Academic Year","Class Teacher","Room","Capacity",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(classes as any[]).map(c=>(
          <tr key={c.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{c.name}</td>
            <td className="px-3 py-2">{c.grade||"—"}</td><td className="px-3 py-2">{c.section||"—"}</td>
            <td className="px-3 py-2">{c.academic_year||"—"}</td><td className="px-3 py-2">{c.teacher_name||"—"}</td>
            <td className="px-3 py-2">{c.room_number||"—"}</td><td className="px-3 py-2">{c.max_students||c.capacity||"—"}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(c)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(c.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(classes as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No classes yet</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit Class":"Add Class"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Class Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Grade"><Input placeholder="1,2,3..." value={form.grade||""} onChange={e=>setForm({...form,grade:e.target.value})}/></F>
            <F label="Section"><Input placeholder="A,B,C..." value={form.section||""} onChange={e=>setForm({...form,section:e.target.value})}/></F>
            <F label="Academic Year"><Input placeholder="2024-25" value={form.academic_year||""} onChange={e=>setForm({...form,academic_year:e.target.value})}/></F>
            <F label="Room No."><Input value={form.room_number||""} onChange={e=>setForm({...form,room_number:e.target.value})}/></F>
            <div className="col-span-2"><F label="Class Teacher"><Select value={String(form.teacher_id||"")} onValueChange={onTeacher}><SelectTrigger><SelectValue placeholder="Select teacher"/></SelectTrigger><SelectContent>{(teachers as any[]).map((t:any)=><SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent></Select></F></div>
            <div className="col-span-2"><F label="Max Students"><Input type="number" value={form.max_students||""} onChange={e=>setForm({...form,max_students:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeachersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/teachers/${editing.id}`, d) : apiRequest("POST", "/api/education/teachers", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/teachers"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/teachers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/teachers"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "active" }); setShowForm(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...t, date_of_joining: t.date_of_joining?.split("T")[0] }); setShowForm(true); };
  const filtered = (teachers as any[]).filter(t => t.name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search teachers..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Teacher</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Name","Subject","Qualification","Phone","Joining Date","Salary","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(t=>(
          <tr key={t.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{t.teacher_code}</td><td className="px-3 py-2 font-medium">{t.name}</td>
            <td className="px-3 py-2">{t.subject||"—"}</td><td className="px-3 py-2">{t.qualification||"—"}</td>
            <td className="px-3 py-2">{t.phone||"—"}</td><td className="px-3 py-2">{t.date_of_joining?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2">₹{fmt(t.salary)}</td>
            <td className="px-3 py-2"><Badge className={t.status==="active"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}>{t.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(t)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(t.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No teachers found</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit Teacher":"Add Teacher"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Subject"><Input value={form.subject||""} onChange={e=>setForm({...form,subject:e.target.value})}/></F>
            <F label="Qualification"><Input value={form.qualification||""} onChange={e=>setForm({...form,qualification:e.target.value})}/></F>
            <F label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F>
            <F label="Email"><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F>
            <F label="Date of Joining"><Input type="date" value={form.date_of_joining||""} onChange={e=>setForm({...form,date_of_joining:e.target.value})}/></F>
            <F label="Salary (₹)"><Input type="number" value={form.salary||""} onChange={e=>setForm({...form,salary:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"active"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/students/${editing.id}`, d) : apiRequest("POST", "/api/education/students", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/students"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/students/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/students"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "active" }); setShowForm(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ ...s, dob: s.dob?.split("T")[0], enrollment_date: s.enrollment_date?.split("T")[0] }); setShowForm(true); };
  const filtered = (students as any[]).filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.student_code?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search students..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Student</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Name","Class","Gender","Parent","Phone","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(s=>(
          <tr key={s.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{s.student_code}</td><td className="px-3 py-2 font-medium">{s.name}</td>
            <td className="px-3 py-2">{s.class_name?`${s.class_name}${s.section?`-${s.section}`:""}` : "—"}</td>
            <td className="px-3 py-2">{s.gender||"—"}</td><td className="px-3 py-2">{s.parent_name||"—"}</td><td className="px-3 py-2">{s.parent_phone||"—"}</td>
            <td className="px-3 py-2"><Badge className={s.status==="active"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}>{s.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(s)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No students found</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit Student":"Add Student"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Date of Birth"><Input type="date" value={form.dob||""} onChange={e=>setForm({...form,dob:e.target.value})}/></F>
            <F label="Gender"><Select value={form.gender||""} onValueChange={v=>setForm({...form,gender:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["Male","Female","Other"].map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Class"><Select value={String(form.class_id||"")} onValueChange={v=>setForm({...form,class_id:v})}><SelectTrigger><SelectValue placeholder="Select class"/></SelectTrigger><SelectContent>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}{c.section?`-${c.section}`:""}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Parent Name"><Input value={form.parent_name||""} onChange={e=>setForm({...form,parent_name:e.target.value})}/></F>
            <F label="Parent Phone"><Input value={form.parent_phone||""} onChange={e=>setForm({...form,parent_phone:e.target.value})}/></F>
            <F label="Email"><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F>
            <F label="Enrollment Date"><Input type="date" value={form.enrollment_date||""} onChange={e=>setForm({...form,enrollment_date:e.target.value})}/></F>
            <div className="col-span-2"><F label="Address"><Textarea rows={2} value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttendanceTab() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState(""); const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); const [attendance, setAttendance] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false);
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: existing = [] } = useQuery<any[]>({ queryKey: ["/api/education/attendance", selectedDate, selectedClass], queryFn: () => { const p = new URLSearchParams({ date: selectedDate }); if (selectedClass) p.set("class_id", selectedClass); return fetch(`/api/education/attendance?${p}`, { credentials: "include" }).then(r => r.json()); }, enabled: !!selectedDate });
  const classStudents = (students as any[]).filter(s => !selectedClass || String(s.class_id) === selectedClass);
  const getStatus = (id: string) => { if (attendance[id]) return attendance[id]; const f = (existing as any[]).find(e => String(e.student_id) === id); return f?.status || "present"; };
  const toggle = (id: string, st: string) => setAttendance(p => ({ ...p, [id]: st }));
  const save = async () => {
    setSaving(true);
    try { await apiRequest("POST", "/api/education/attendance/bulk", { class_id: selectedClass || null, attendance_date: selectedDate, records: classStudents.map(s => ({ student_id: s.id, status: getStatus(String(s.id)) })) }); toast({ title: "Attendance saved" }); queryClient.invalidateQueries({ queryKey: ["/api/education/attendance"] }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };
  const sc: Record<string, string> = { present: "bg-green-100 text-green-700 border-green-200", absent: "bg-red-100 text-red-700 border-red-200", late: "bg-yellow-100 text-yellow-700 border-yellow-200", leave: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <F label="Date"><Input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="w-auto"/></F>
        <F label="Class"><Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-44"><SelectValue placeholder="All classes"/></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}{c.section?`-${c.section}`:""}</SelectItem>)}</SelectContent></Select></F>
        <div className="pt-5"><Button onClick={save} disabled={saving}>Save Attendance</Button></div>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Class</th>{["present","absent","late","leave"].map(s=><th key={s} className="px-3 py-2 text-center capitalize">{s}</th>)}</tr></thead>
        <tbody>{classStudents.map(s => {
          const st = getStatus(String(s.id));
          return <tr key={s.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{s.name}</td><td className="px-3 py-2 text-muted-foreground">{s.class_name}{s.section?`-${s.section}`:""}</td>
            {["present","absent","late","leave"].map(status=><td key={status} className="px-3 py-2 text-center"><button onClick={()=>toggle(String(s.id),status)} className={`w-7 h-7 rounded-full border-2 text-xs font-medium transition-all ${st===status?sc[status]:"border-muted bg-transparent"}`}>{status[0].toUpperCase()}</button></td>)}
          </tr>;
        })}{!classStudents.length&&<tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No students for selected filter</td></tr>}</tbody>
      </table></div>
    </div>
  );
}

function ExaminationsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({}); const [showMarks, setShowMarks] = useState<any>(null); const [marks, setMarks] = useState<Record<string, string>>({}); const [savingMarks, setSavingMarks] = useState(false);
  const { data: exams = [] } = useQuery<any[]>({ queryKey: ["/api/education/examinations"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: examMarks = [] } = useQuery<any[]>({ queryKey: ["/api/education/exam-marks", showMarks?.id], enabled: !!showMarks, queryFn: () => fetch(`/api/education/exam-marks/${showMarks.id}`, { credentials: "include" }).then(r => r.json()) });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/examinations/${editing.id}`, d) : apiRequest("POST", "/api/education/examinations", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/examinations"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/examinations/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/examinations"] }) });
  const classStudents = showMarks ? (students as any[]).filter(s => String(s.class_id) === String(showMarks.class_id)) : [];
  const getMark = (sid: string) => { if (marks[sid] !== undefined) return marks[sid]; const f = (examMarks as any[]).find(m => String(m.student_id) === sid); return f?.marks_obtained !== undefined ? String(f.marks_obtained) : ""; };
  const saveMarks = async () => {
    setSavingMarks(true);
    try { await apiRequest("POST", "/api/education/exam-marks/bulk", { examination_id: showMarks.id, marks: classStudents.map(s => ({ student_id: s.id, marks_obtained: Number(getMark(String(s.id))) || 0 })) }); toast({ title: "Marks saved" }); queryClient.invalidateQueries({ queryKey: ["/api/education/exam-marks", showMarks.id] }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setSavingMarks(false);
  };
  const openNew = () => { setEditing(null); setForm({ max_marks: 100, pass_marks: 35 }); setShowForm(true); };
  const openEdit = (e: any) => { setEditing(e); setForm({ ...e, exam_date: e.exam_date?.split("T")[0] }); setShowForm(true); };
  const grade = (m: number, pm: number) => m >= 90 ? "A+" : m >= 75 ? "A" : m >= 60 ? "B" : m >= 45 ? "C" : m >= pm ? "D" : "F";
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Exam</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Exam Name","Class","Subject","Date","Max","Pass","Year",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(exams as any[]).map(e=>(
          <tr key={e.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{e.exam_name}</td><td className="px-3 py-2">{e.class_name||"—"}</td><td className="px-3 py-2">{e.subject}</td>
            <td className="px-3 py-2">{e.exam_date?.split("T")[0]||"—"}</td><td className="px-3 py-2">{e.max_marks}</td><td className="px-3 py-2">{e.pass_marks}</td><td className="px-3 py-2">{e.academic_year||"—"}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>{setShowMarks(e);setMarks({});}}>Marks</Button><Button size="icon" variant="ghost" onClick={()=>openEdit(e)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(e.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(exams as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No exams</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit Exam":"Add Exam"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Exam Name *"><Input value={form.exam_name||""} onChange={e=>setForm({...form,exam_name:e.target.value})}/></F></div>
            <div className="col-span-2"><F label="Class"><Select value={String(form.class_id||"")} onValueChange={v=>setForm({...form,class_id:v})}><SelectTrigger><SelectValue placeholder="Select class"/></SelectTrigger><SelectContent>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Subject *"><Input value={form.subject||""} onChange={e=>setForm({...form,subject:e.target.value})}/></F>
            <F label="Exam Date"><Input type="date" value={form.exam_date||""} onChange={e=>setForm({...form,exam_date:e.target.value})}/></F>
            <F label="Max Marks"><Input type="number" value={form.max_marks||100} onChange={e=>setForm({...form,max_marks:e.target.value})}/></F>
            <F label="Pass Marks"><Input type="number" value={form.pass_marks||35} onChange={e=>setForm({...form,pass_marks:e.target.value})}/></F>
            <div className="col-span-2"><F label="Academic Year"><Input placeholder="2024-25" value={form.academic_year||""} onChange={e=>setForm({...form,academic_year:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!showMarks} onOpenChange={()=>setShowMarks(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Marks — {showMarks?.exam_name} · {showMarks?.subject}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Max: {showMarks?.max_marks} | Pass: {showMarks?.pass_marks}</p>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">Marks /{showMarks?.max_marks}</th><th className="px-3 py-2 text-left">Grade</th></tr></thead>
            <tbody>{classStudents.map(s=>{
              const m=Number(getMark(String(s.id))); const g=grade(m,showMarks?.pass_marks||35); const mk=getMark(String(s.id));
              return <tr key={s.id} className="border-t">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2"><Input className="h-7 w-24" type="number" min={0} max={showMarks?.max_marks} value={mk} onChange={e=>setMarks(p=>({...p,[String(s.id)]:e.target.value}))}/></td>
                <td className="px-3 py-2"><Badge className={g==="F"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}>{mk!==""?g:"—"}</Badge></td>
              </tr>;
            })}{!classStudents.length&&<tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No students in this class</td></tr>}</tbody>
          </table></div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowMarks(null)}>Close</Button><Button onClick={saveMarks} disabled={savingMarks}>Save Marks</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LibraryTab() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"books"|"issues">("books"); const [showForm, setShowForm] = useState(false); const [showIssue, setShowIssue] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({}); const [issueForm, setIssueForm] = useState<any>({});
  const { data: books = [] } = useQuery<any[]>({ queryKey: ["/api/education/library-books"] });
  const { data: issues = [] } = useQuery<any[]>({ queryKey: ["/api/education/book-issues"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/library-books/${editing.id}`, d) : apiRequest("POST", "/api/education/library-books", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const issueMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/book-issues", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/book-issues"] }); queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }); setShowIssue(false); toast({ title: "Issued" }); } });
  const returnMut = useMutation({ mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/education/book-issues/${id}/return`, d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/book-issues"] }); queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }); toast({ title: "Returned" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/library-books/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }) });
  const openNew = () => { setEditing(null); setForm({ total_copies: 1 }); setShowForm(true); };
  const openEdit = (b: any) => { setEditing(b); setForm({ ...b }); setShowForm(true); };
  const onStudent = (id: string) => { const s = (students as any[]).find(s => String(s.id) === id); setIssueForm({ ...issueForm, student_id: id, student_name: s?.name || "" }); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab==="books"?"default":"outline"} onClick={()=>setTab("books")}>Books ({(books as any[]).length})</Button>
        <Button variant={tab==="issues"?"default":"outline"} onClick={()=>setTab("issues")}>Issued ({(issues as any[]).filter((i:any)=>i.status==="issued").length})</Button>
        <div className="flex-1"/>
        {tab==="books"&&<Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Book</Button>}
        {tab==="issues"&&<Button onClick={()=>{setIssueForm({issue_date:new Date().toISOString().split("T")[0]});setShowIssue(true);}}><Plus className="h-4 w-4 mr-1"/>Issue Book</Button>}
      </div>
      {tab==="books"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Title","Author","Category","Total","Available","Rack",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(books as any[]).map(b=>(
          <tr key={b.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{b.book_code}</td><td className="px-3 py-2 font-medium">{b.title}</td><td className="px-3 py-2">{b.author||"—"}</td><td className="px-3 py-2">{b.category||"—"}</td>
            <td className="px-3 py-2">{b.total_copies}</td><td className={`px-3 py-2 font-medium ${b.available_copies<=0?"text-red-600":"text-green-700"}`}>{b.available_copies}</td><td className="px-3 py-2">{b.rack_number||"—"}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(b)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(b.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(books as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No books</td></tr>}</tbody>
      </table></div>}
      {tab==="issues"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Book","Student","Issue Date","Due Date","Return Date","Fine","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(issues as any[]).map(i=>(
          <tr key={i.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{i.book_title}</td><td className="px-3 py-2">{i.student_name||i.student_name_ref||"—"}</td>
            <td className="px-3 py-2">{i.issue_date?.split("T")[0]}</td><td className="px-3 py-2">{i.due_date?.split("T")[0]||"—"}</td><td className="px-3 py-2">{i.return_date?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2">₹{fmt(i.fine_amount)}</td>
            <td className="px-3 py-2"><Badge className={i.status==="returned"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}>{i.status}</Badge></td>
            <td className="px-3 py-2">{i.status==="issued"&&<Button size="sm" variant="outline" onClick={()=>returnMut.mutate({id:i.id,return_date:new Date().toISOString().split("T")[0],fine_amount:0})}>Return</Button>}</td>
          </tr>
        ))}{!(issues as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No issues</td></tr>}</tbody>
      </table></div>}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit Book":"Add Book"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Title *"><Input value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></F></div>
            <F label="Author"><Input value={form.author||""} onChange={e=>setForm({...form,author:e.target.value})}/></F>
            <F label="ISBN"><Input value={form.isbn||""} onChange={e=>setForm({...form,isbn:e.target.value})}/></F>
            <F label="Category"><Input value={form.category||""} onChange={e=>setForm({...form,category:e.target.value})}/></F>
            <F label="Publisher"><Input value={form.publisher||""} onChange={e=>setForm({...form,publisher:e.target.value})}/></F>
            <F label="Total Copies"><Input type="number" value={form.total_copies||1} onChange={e=>setForm({...form,total_copies:e.target.value})}/></F>
            <F label="Rack Number"><Input value={form.rack_number||""} onChange={e=>setForm({...form,rack_number:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Book *"><Select value={String(issueForm.book_id||"")} onValueChange={v=>setIssueForm({...issueForm,book_id:v})}><SelectTrigger><SelectValue placeholder="Select book"/></SelectTrigger><SelectContent>{(books as any[]).filter((b:any)=>b.available_copies>0).map((b:any)=><SelectItem key={b.id} value={String(b.id)}>{b.title} (avail: {b.available_copies})</SelectItem>)}</SelectContent></Select></F>
            <F label="Student"><Select value={String(issueForm.student_id||"")} onValueChange={onStudent}><SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger><SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Issue Date"><Input type="date" value={issueForm.issue_date||""} onChange={e=>setIssueForm({...issueForm,issue_date:e.target.value})}/></F>
            <F label="Due Date"><Input type="date" value={issueForm.due_date||""} onChange={e=>setIssueForm({...issueForm,due_date:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowIssue(false)}>Cancel</Button><Button onClick={()=>issueMut.mutate(issueForm)} disabled={issueMut.isPending}>Issue</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeesTab() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"payments"|"structures">("payments"); const [showSF, setShowSF] = useState(false); const [showPF, setShowPF] = useState(false); const [editingSF, setEditingSF] = useState<any>(null); const [sf, setSf] = useState<any>({}); const [pf, setPf] = useState<any>({});
  const { data: structures = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-structures"] });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-payments"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const sfSave = useMutation({ mutationFn: (d: any) => editingSF ? apiRequest("PUT", `/api/education/fee-structures/${editingSF.id}`, d) : apiRequest("POST", "/api/education/fee-structures", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/fee-structures"] }); setShowSF(false); toast({ title: "Saved" }); } });
  const sfDel = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/fee-structures/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/fee-structures"] }) });
  const pfSave = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/fee-payments", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/fee-payments"] }); setShowPF(false); toast({ title: "Payment recorded" }); } });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab==="payments"?"default":"outline"} onClick={()=>setTab("payments")}>Payments ({(payments as any[]).length})</Button>
        <Button variant={tab==="structures"?"default":"outline"} onClick={()=>setTab("structures")}>Fee Structures</Button>
        <div className="flex-1"/>
        {tab==="payments"&&<Button onClick={()=>{setPf({paid_date:new Date().toISOString().split("T")[0],payment_mode:"cash"});setShowPF(true);}}><Plus className="h-4 w-4 mr-1"/>Record Payment</Button>}
        {tab==="structures"&&<Button onClick={()=>{setEditingSF(null);setSf({frequency:"monthly",due_day:10});setShowSF(true);}}><Plus className="h-4 w-4 mr-1"/>Add Fee Structure</Button>}
      </div>
      {tab==="payments"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Receipt","Student","Class","Month","Amount","Mode","Date"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(payments as any[]).map(p=>(
          <tr key={p.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{p.receipt_no}</td><td className="px-3 py-2 font-medium">{p.student_name}</td><td className="px-3 py-2">{p.class_name||"—"}</td>
            <td className="px-3 py-2">{p.for_month||"—"}</td><td className="px-3 py-2 font-medium">₹{fmt(p.amount)}</td><td className="px-3 py-2 capitalize">{p.payment_mode}</td><td className="px-3 py-2">{p.paid_date?.split("T")[0]}</td>
          </tr>
        ))}{!(payments as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No payments</td></tr>}</tbody>
      </table></div>}
      {tab==="structures"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Class","Fee Type","Amount","Frequency","Year","Due Day",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(structures as any[]).map(s=>(
          <tr key={s.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2">{s.class_name||"All"}</td><td className="px-3 py-2 font-medium">{s.fee_type}</td><td className="px-3 py-2">₹{fmt(s.amount)}</td>
            <td className="px-3 py-2 capitalize">{s.frequency}</td><td className="px-3 py-2">{s.academic_year||"—"}</td><td className="px-3 py-2">{s.due_day}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>{setEditingSF(s);setSf({...s});setShowSF(true);}}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>sfDel.mutate(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(structures as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No fee structures</td></tr>}</tbody>
      </table></div>}
      <Dialog open={showSF} onOpenChange={setShowSF}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingSF?"Edit":"Add"} Fee Structure</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Class"><Select value={String(sf.class_id||"")} onValueChange={v=>setSf({...sf,class_id:v})}><SelectTrigger><SelectValue placeholder="All classes"/></SelectTrigger><SelectContent><SelectItem value="">All Classes</SelectItem>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Fee Type *"><Input placeholder="Tuition, Transport..." value={sf.fee_type||""} onChange={e=>setSf({...sf,fee_type:e.target.value})}/></F>
            <F label="Amount (₹) *"><Input type="number" value={sf.amount||""} onChange={e=>setSf({...sf,amount:e.target.value})}/></F>
            <F label="Frequency"><Select value={sf.frequency||"monthly"} onValueChange={v=>setSf({...sf,frequency:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["monthly","quarterly","annual","one-time"].map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></F>
            <F label="Due Day"><Input type="number" min={1} max={31} value={sf.due_day||10} onChange={e=>setSf({...sf,due_day:e.target.value})}/></F>
            <div className="col-span-2"><F label="Academic Year"><Input placeholder="2024-25" value={sf.academic_year||""} onChange={e=>setSf({...sf,academic_year:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowSF(false)}>Cancel</Button><Button onClick={()=>sfSave.mutate(sf)} disabled={sfSave.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={showPF} onOpenChange={setShowPF}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Record Fee Payment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Student *"><Select value={String(pf.student_id||"")} onValueChange={v=>setPf({...pf,student_id:v})}><SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger><SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.class_name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Amount (₹) *"><Input type="number" value={pf.amount||""} onChange={e=>setPf({...pf,amount:e.target.value})}/></F>
            <F label="For Month"><Input placeholder="April 2025" value={pf.for_month||""} onChange={e=>setPf({...pf,for_month:e.target.value})}/></F>
            <F label="Payment Mode"><Select value={pf.payment_mode||"cash"} onValueChange={v=>setPf({...pf,payment_mode:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["cash","cheque","upi","bank_transfer"].map(m=><SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></F>
            <F label="Date"><Input type="date" value={pf.paid_date||""} onChange={e=>setPf({...pf,paid_date:e.target.value})}/></F>
            <F label="Notes"><Input value={pf.notes||""} onChange={e=>setPf({...pf,notes:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowPF(false)}>Cancel</Button><Button onClick={()=>pfSave.mutate(pf)} disabled={pfSave.isPending}>Record</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EducationPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Education Management</h1><p className="text-muted-foreground text-sm mt-1">Students, Teachers, Classes, Attendance, Exams, Library & Fees</p></div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students"><Users className="h-3.5 w-3.5 mr-1"/>Students</TabsTrigger>
          <TabsTrigger value="teachers"><GraduationCap className="h-3.5 w-3.5 mr-1"/>Teachers</TabsTrigger>
          <TabsTrigger value="classes"><BookOpen className="h-3.5 w-3.5 mr-1"/>Classes</TabsTrigger>
          <TabsTrigger value="attendance"><ClipboardList className="h-3.5 w-3.5 mr-1"/>Attendance</TabsTrigger>
          <TabsTrigger value="exams">Exams & Marks</TabsTrigger>
          <TabsTrigger value="library"><Library className="h-3.5 w-3.5 mr-1"/>Library</TabsTrigger>
          <TabsTrigger value="fees"><Receipt className="h-3.5 w-3.5 mr-1"/>Fees</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab/></TabsContent>
          <TabsContent value="students"><StudentsTab/></TabsContent>
          <TabsContent value="teachers"><TeachersTab/></TabsContent>
          <TabsContent value="classes"><ClassesTab/></TabsContent>
          <TabsContent value="attendance"><AttendanceTab/></TabsContent>
          <TabsContent value="exams"><ExaminationsTab/></TabsContent>
          <TabsContent value="library"><LibraryTab/></TabsContent>
          <TabsContent value="fees"><FeesTab/></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
