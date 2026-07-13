import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
  Plus, Pencil, Trash2, Users, BookOpen, GraduationCap, Receipt, AlertTriangle,
  BookMarked, Bus, Megaphone, ClipboardList, Library, Search, CheckSquare,
  Calendar, BookCopy, BarChart3, X
} from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function F({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function SC({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const STATUSES = ["present","absent","late","leave"];

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/education/stats"] });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <SC title="Total Students" value={stats?.totalStudents ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
      <SC title="Total Staff" value={stats?.totalTeachers ?? 0} icon={GraduationCap} color="bg-green-100 text-green-600" />
      <SC title="Total Classes" value={stats?.totalClasses ?? 0} icon={BookOpen} color="bg-purple-100 text-purple-600" />
      <SC title="Monthly Collection" value={`${sym}${fmt(stats?.monthlyCollection)}`} icon={Receipt} color="bg-orange-100 text-orange-600" />
      <SC title="Overdue Books" value={stats?.overdueBooks ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-600" />
      <SC title="Monthly Fee Target" value={`${sym}${fmt(stats?.monthlyFeeTarget)}`} icon={BookMarked} color="bg-teal-100 text-teal-600" />
      <SC title="Active Notices" value={stats?.activeAnnouncements ?? 0} icon={Megaphone} color="bg-yellow-100 text-yellow-600" />
      <SC title="Transport Students" value={stats?.transportStudents ?? 0} icon={Bus} color="bg-indigo-100 text-indigo-600" />
    </div>
  );
}

// ── Students ──────────────────────────────────────────────────────────────────
function StudentsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/students/${editing.id}`, d) : apiRequest("POST", "/api/education/students", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/students"] }); setShowForm(false); toast({ title: "Saved" }); },
  });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/students/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/students"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "active", gender: "Male" }); setShowForm(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ ...s }); setShowForm(true); };
  const filtered = (students as any[]).filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.admission_no?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Student</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Adm No","Name","Class","Section","Roll No","Gender","Blood Grp","Parent","Phone","Transport","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((s: any) => (
          <tr key={s.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{s.admission_no || s.student_code}</td>
            <td className="px-3 py-2 font-medium">{s.name}</td>
            <td className="px-3 py-2">{s.class_name || "—"}</td>
            <td className="px-3 py-2">{s.section || "—"}</td>
            <td className="px-3 py-2">{s.roll_number || "—"}</td>
            <td className="px-3 py-2">{s.gender || "—"}</td>
            <td className="px-3 py-2">{s.blood_group || "—"}</td>
            <td className="px-3 py-2">{s.parent_name || "—"}</td>
            <td className="px-3 py-2">{s.parent_phone || "—"}</td>
            <td className="px-3 py-2">{s.transport_required ? <Badge variant="outline">Yes</Badge> : "—"}</td>
            <td className="px-3 py-2"><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => delMut.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
          </tr>
        ))}{!filtered.length && <tr><td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">No students found</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <F label="Admission No"><Input value={form.admission_no||""} onChange={e=>setForm({...form,admission_no:e.target.value})} placeholder="ADM-2024-001"/></F>
            <F label="Student Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F>
            <F label="Date of Birth"><Input type="date" value={form.dob||""} onChange={e=>setForm({...form,dob:e.target.value})}/></F>
            <F label="Gender"><Select value={form.gender||"Male"} onValueChange={v=>setForm({...form,gender:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Male","Female","Other"].map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></F>
            <F label="Blood Group"><Select value={form.blood_group||"__none__"} onValueChange={v=>setForm({...form,blood_group:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent><SelectItem value="__none__">Not specified</SelectItem>{BLOOD_GROUPS.map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></F>
            <F label="Class"><Select value={form.class_id?String(form.class_id):"__none__"} onValueChange={v=>setForm({...form,class_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Select class"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Section"><Input value={form.section||""} onChange={e=>setForm({...form,section:e.target.value})} placeholder="A, B, C..."/></F>
            <F label="Roll Number"><Input value={form.roll_number||""} onChange={e=>setForm({...form,roll_number:e.target.value})}/></F>
            <F label="Academic Year"><Input value={form.academic_year||""} onChange={e=>setForm({...form,academic_year:e.target.value})} placeholder="2024-25"/></F>
            <F label="Enrollment Date"><Input type="date" value={form.enrollment_date||""} onChange={e=>setForm({...form,enrollment_date:e.target.value})}/></F>
            <F label="Parent/Guardian Name"><Input value={form.parent_name||""} onChange={e=>setForm({...form,parent_name:e.target.value})}/></F>
            <F label="Parent Mobile"><Input value={form.parent_phone||""} onChange={e=>setForm({...form,parent_phone:e.target.value})}/></F>
            <F label="Email"><Input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"active"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["active","inactive","transferred","passed out"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Address"><Textarea value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} rows={2}/></F></div>
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={!!form.transport_required} onCheckedChange={v=>setForm({...form,transport_required:v?1:0})}/><span className="text-sm">Transport Required</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={!!form.hostel_required} onCheckedChange={v=>setForm({...form,hostel_required:v?1:0})}/><span className="text-sm">Hostel Required</span></label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Staff ─────────────────────────────────────────────────────────────────────
function StaffTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"] });
  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/teachers/${editing.id}`, d) : apiRequest("POST", "/api/education/teachers", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/teachers"] }); setShowForm(false); toast({ title: "Saved" }); },
  });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/teachers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/teachers"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "active" }); setShowForm(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...t }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Staff</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Name","Department","Designation","Subject","Phone","Joining Date","Salary","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{(teachers as any[]).map((t: any) => (
          <tr key={t.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{t.teacher_code}</td>
            <td className="px-3 py-2 font-medium">{t.name}</td>
            <td className="px-3 py-2">{t.department || "—"}</td>
            <td className="px-3 py-2">{t.designation || "—"}</td>
            <td className="px-3 py-2">{t.subject || "—"}</td>
            <td className="px-3 py-2">{t.phone || "—"}</td>
            <td className="px-3 py-2">{t.date_of_joining || "—"}</td>
            <td className="px-3 py-2">{sym}{fmt(t.salary)}</td>
            <td className="px-3 py-2"><Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" onClick={() => delMut.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
          </tr>
        ))}{!(teachers as any[]).length && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No staff added yet</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit Staff" : "Add Staff"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Department"><Input value={form.department||""} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Science, Arts…"/></F>
            <F label="Designation"><Input value={form.designation||""} onChange={e=>setForm({...form,designation:e.target.value})} placeholder="HOD, Teacher…"/></F>
            <F label="Subject"><Input value={form.subject||""} onChange={e=>setForm({...form,subject:e.target.value})}/></F>
            <F label="Qualification"><Input value={form.qualification||""} onChange={e=>setForm({...form,qualification:e.target.value})}/></F>
            <F label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F>
            <F label="Email"><Input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F>
            <F label="Joining Date"><Input type="date" value={form.date_of_joining||""} onChange={e=>setForm({...form,date_of_joining:e.target.value})}/></F>
            <F label="Salary "><Input type="number" value={form.salary||""} onChange={e=>setForm({...form,salary:e.target.value})}/></F>
            <div className="col-span-2"><F label="Status"><Select value={form.status||"active"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["active","inactive","on leave"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Classes ───────────────────────────────────────────────────────────────────
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
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Class</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Name","Grade","Section","Academic Year","Class Teacher","Room","Capacity",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(classes as any[]).map((c: any) => (
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
            <F label="Grade"><Input placeholder="1,2,3…" value={form.grade||""} onChange={e=>setForm({...form,grade:e.target.value})}/></F>
            <F label="Section"><Input placeholder="A, B…" value={form.section||""} onChange={e=>setForm({...form,section:e.target.value})}/></F>
            <F label="Academic Year"><Input placeholder="2024-25" value={form.academic_year||""} onChange={e=>setForm({...form,academic_year:e.target.value})}/></F>
            <F label="Room No"><Input value={form.room_number||""} onChange={e=>setForm({...form,room_number:e.target.value})}/></F>
            <F label="Capacity"><Input type="number" value={form.capacity||""} onChange={e=>setForm({...form,capacity:e.target.value})}/></F>
            <div className="col-span-2"><F label="Class Teacher"><Select value={form.teacher_id?String(form.teacher_id):"__none__"} onValueChange={v=>{const t=(teachers as any[]).find((x:any)=>String(x.id)===v);setForm({...form,teacher_id:v==="__none__"?"":v,teacher_name:t?.name||""})}}><SelectTrigger><SelectValue placeholder="Select teacher"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(teachers as any[]).map((t:any)=><SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent></Select></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Subjects ──────────────────────────────────────────────────────────────────
function SubjectsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"] });
  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/subjects/${editing.id}`, d) : apiRequest("POST", "/api/education/subjects", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/subjects"] }); setShowForm(false); toast({ title: "Saved" }); },
  });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/subjects/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/subjects"] }) });
  const openNew = () => { setEditing(null); setForm({ theory_practical: "theory", pass_marks: 35, total_marks: 100 }); setShowForm(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ ...s }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Subject</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Subject Name","Type","Theory/Practical","Pass Marks","Total Marks",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(subjects as any[]).map((s: any) => (
          <tr key={s.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{s.subject_code||"—"}</td>
            <td className="px-3 py-2 font-medium">{s.name}</td>
            <td className="px-3 py-2">{s.subject_type||"—"}</td>
            <td className="px-3 py-2 capitalize">{s.theory_practical}</td>
            <td className="px-3 py-2">{s.pass_marks}</td>
            <td className="px-3 py-2">{s.total_marks}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(s)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(subjects as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No subjects added yet</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit Subject":"Add Subject"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <F label="Subject Code"><Input value={form.subject_code||""} onChange={e=>setForm({...form,subject_code:e.target.value})} placeholder="ENG-01"/></F>
            <F label="Subject Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F>
            <F label="Subject Type"><Input value={form.subject_type||""} onChange={e=>setForm({...form,subject_type:e.target.value})} placeholder="Core, Elective…"/></F>
            <F label="Theory / Practical"><Select value={form.theory_practical||"theory"} onValueChange={v=>setForm({...form,theory_practical:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["theory","practical","both"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></F>
            <F label="Pass Marks"><Input type="number" value={form.pass_marks||35} onChange={e=>setForm({...form,pass_marks:e.target.value})}/></F>
            <F label="Total Marks"><Input type="number" value={form.total_marks||100} onChange={e=>setForm({...form,total_marks:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Attendance ────────────────────────────────────────────────────────────────
function AttendanceTab() {
  const { toast } = useToast();
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const [subTab, setSubTab] = useState<"students"|"staff">("students");
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [selectedClass, setSelectedClass] = useState("all");
  const [overrides, setOverrides] = useState<Record<string,string>>({});
  const [staffOverrides, setStaffOverrides] = useState<Record<string,any>>({});
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });

  const classFilterId = selectedClass === "all" ? "" : selectedClass;

  const { data: rawAttendance, isError: attError } = useQuery<any[]>({
    queryKey: ["/api/education/attendance", selectedDate, classFilterId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (classFilterId) params.set("class_id", classFilterId);
      const r = await fetch(`/api/education/attendance?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`);
      return r.json();
    },
  });
  const savedAttendance: any[] = Array.isArray(rawAttendance) ? rawAttendance : [];

  const { data: staff = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"] });
  const { data: rawStaffAttendance, isError: staffAttError } = useQuery<any[]>({
    queryKey: ["/api/education/staff-attendance", selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/education/staff-attendance?date=${selectedDate}`, { credentials: "include" });
      if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`);
      return r.json();
    },
    enabled: subTab === "staff",
  });
  const staffAttendance: any[] = Array.isArray(rawStaffAttendance) ? rawStaffAttendance : [];

  useEffect(() => { setOverrides({}); setStaffOverrides({}); }, [selectedDate]);
  useEffect(() => { setOverrides({}); }, [selectedClass]);

  const classStudents = classFilterId
    ? (students as any[]).filter((s: any) => String(s.class_id) === classFilterId)
    : (students as any[]);

  const getStatus = (studentId: string) => {
    if (overrides[studentId] !== undefined) return overrides[studentId];
    const saved = savedAttendance.find((a: any) => String(a.student_id) === String(studentId));
    return saved?.status || "present";
  };

  const bulkSaveMut = useMutation({
    mutationFn: (records: any[]) => apiRequest("POST", "/api/education/attendance/bulk", {
      class_id: classFilterId || null,
      attendance_date: selectedDate,
      records,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/attendance"] });
      setOverrides({});
      toast({ title: `Attendance saved for ${selectedDate}` });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const staffBulkMut = useMutation({
    mutationFn: (records: any[]) => apiRequest("POST", "/api/education/staff-attendance/bulk", {
      attendance_date: selectedDate,
      records,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/staff-attendance"] });
      setStaffOverrides({});
      toast({ title: "Staff attendance saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const markAll = (status: string) => {
    const n: Record<string,string> = {};
    classStudents.forEach((s: any) => { n[String(s.id)] = status; });
    setOverrides(n);
  };

  const changedCount = Object.keys(overrides).length;

  const handleSaveStudentAttendance = () => {
    if (!classStudents.length) { toast({ title: "No students to save attendance for" }); return; }
    bulkSaveMut.mutate(classStudents.map((s: any) => ({ student_id: String(s.id), status: getStatus(s.id) })));
  };

  const handleSaveStaffAttendance = () => {
    const records = (staff as any[]).map((t: any) => {
      const ov = staffOverrides[t.id] || {};
      const saved = staffAttendance.find((a: any) => Number(a.staff_id) === Number(t.id));
      return {
        staff_id: Number(t.id),
        status: ov.status ?? saved?.status ?? "present",
        check_in: ov.check_in ?? saved?.check_in ?? null,
        check_out: ov.check_out ?? saved?.check_out ?? null,
      };
    });
    staffBulkMut.mutate(records);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={subTab==="students"?"default":"outline"} onClick={()=>setSubTab("students")}>Student Attendance</Button>
        <Button variant={subTab==="staff"?"default":"outline"} onClick={()=>setSubTab("staff")}>Staff Attendance</Button>
        <div className="flex-1"/>
        <Input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="w-40" data-testid="input-attendance-date"/>
        {subTab==="students"&&(
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-40" data-testid="select-attendance-class"><SelectValue placeholder="All Classes"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {subTab==="students"&&(
        <>
          {attError&&<p className="text-sm text-destructive">Failed to load saved attendance. Please refresh.</p>}
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" variant="outline" onClick={()=>markAll("present")} data-testid="button-mark-all-present">All Present</Button>
            <Button size="sm" variant="outline" onClick={()=>markAll("absent")} data-testid="button-mark-all-absent">All Absent</Button>
            <div className="flex-1"/>
            <Button onClick={handleSaveStudentAttendance} disabled={bulkSaveMut.isPending} data-testid="button-save-attendance">
              {bulkSaveMut.isPending?"Saving…":changedCount>0?`Save (${changedCount} changed)`:"Save Attendance"}
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Roll No","Student","Section","Status","Mark"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{classStudents.map((s: any) => {
              const status = getStatus(s.id);
              return (
                <tr key={s.id} className="border-t hover:bg-muted/30" data-testid={`row-student-${s.id}`}>
                  <td className="px-3 py-2 text-muted-foreground">{s.roll_number||"—"}</td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2">{s.section||s.class_section||"—"}</td>
                  <td className="px-3 py-2"><Badge variant={status==="present"?"default":status==="absent"?"destructive":"secondary"} className="capitalize">{status}</Badge></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">{STATUSES.map(st=>(
                      <Button key={st} size="sm" variant={status===st?"default":"outline"} className="capitalize"
                        onClick={()=>setOverrides(prev=>({...prev,[String(s.id)]:st}))}>{st}</Button>
                    ))}</div>
                  </td>
                </tr>
              );
            })}{!classStudents.length&&<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No students{classFilterId?" in this class":""}</td></tr>}</tbody>
          </table></div>
          {classStudents.length>0&&(
            <div className="flex gap-4 text-sm text-muted-foreground">
              {STATUSES.map(st=><span key={st} className="capitalize">{st}: {classStudents.filter((s:any)=>getStatus(s.id)===st).length}</span>)}
            </div>
          )}
        </>
      )}

      {subTab==="staff"&&(
        <>
          {staffAttError&&<p className="text-sm text-destructive">Failed to load staff attendance. Please refresh.</p>}
          <div className="flex justify-end">
            <Button onClick={handleSaveStaffAttendance} disabled={staffBulkMut.isPending} data-testid="button-save-staff-attendance">
              {staffBulkMut.isPending?"Saving…":"Save Staff Attendance"}
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Name","Department","Designation","Check-In","Check-Out","Status"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{(staff as any[]).map((t: any) => {
              const saved = staffAttendance.find((a: any) => Number(a.staff_id) === Number(t.id));
              const ov = staffOverrides[t.id] || {};
              const status = ov.status ?? saved?.status ?? "present";
              const checkIn = ov.check_in ?? (saved?.check_in ? String(saved.check_in).substring(0,5) : "");
              const checkOut = ov.check_out ?? (saved?.check_out ? String(saved.check_out).substring(0,5) : "");
              const update = (patch: any) => setStaffOverrides(prev => ({ ...prev, [t.id]: { ...ov, staff_id: Number(t.id), status, check_in: checkIn, check_out: checkOut, ...patch } }));
              return (
                <tr key={t.id} className="border-t hover:bg-muted/30" data-testid={`row-staff-${t.id}`}>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.department||"—"}</td>
                  <td className="px-3 py-2">{t.designation||"—"}</td>
                  <td className="px-3 py-2"><Input type="time" value={checkIn} onChange={e=>update({check_in:e.target.value})} className="w-28"/></td>
                  <td className="px-3 py-2"><Input type="time" value={checkOut} onChange={e=>update({check_out:e.target.value})} className="w-28"/></td>
                  <td className="px-3 py-2">
                    <Select value={status} onValueChange={v=>update({status:v})}>
                      <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                      <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}{!(staff as any[]).length&&<tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No staff added</td></tr>}</tbody>
          </table></div>
        </>
      )}
    </div>
  );
}

// ── Timetable ─────────────────────────────────────────────────────────────────
function TimetableTab() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState("");
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [periodForm, setPeriodForm] = useState<any>({});
  const [entryForm, setEntryForm] = useState<any>({});
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: periods = [] } = useQuery<any[]>({ queryKey: ["/api/education/timetable-periods"] });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"] });
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"] });
  const { data: timetable = [] } = useQuery<any[]>({
    queryKey: ["/api/education/timetable", selectedClass],
    queryFn: () => fetch(`/api/education/timetable${selectedClass?`?class_id=${selectedClass}`:""}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    enabled: !!selectedClass,
  });
  const savePeriodMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/timetable-periods", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/timetable-periods"] }); setShowPeriodForm(false); toast({ title: "Period saved" }); } });
  const delPeriodMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/timetable-periods/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/timetable-periods"] }) });
  const saveEntryMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/timetable", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/timetable"] }); setShowEntryForm(false); toast({ title: "Saved" }); } });
  const delEntryMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/timetable/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/timetable"] }) });

  const cellMap: Record<string, any> = {};
  (timetable as any[]).forEach((e: any) => { cellMap[`${e.day_of_week}-${e.period_id}`] = e; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-48"><SelectValue placeholder="Select class…"/></SelectTrigger><SelectContent>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select>
        <div className="flex-1"/>
        <Button variant="outline" onClick={()=>{setPeriodForm({sort_order:(periods as any[]).length+1});setShowPeriodForm(true);}}><Plus className="h-4 w-4 mr-1"/>Add Period</Button>
        {selectedClass&&<Button onClick={()=>{setEntryForm({class_id:selectedClass});setShowEntryForm(true);}}><Plus className="h-4 w-4 mr-1"/>Add Entry</Button>}
      </div>
      {(periods as any[]).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(periods as any[]).map((p: any) => (
            <div key={p.id} className="flex items-center gap-1 border rounded-md px-2 py-1 text-xs">
              <span className="font-medium">{p.period_name}</span>
              {p.start_time&&<span className="text-muted-foreground">{p.start_time}–{p.end_time}</span>}
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={()=>delPeriodMut.mutate(p.id)}><X className="h-3 w-3"/></Button>
            </div>
          ))}
        </div>
      )}
      {selectedClass && (periods as any[]).length > 0 && (
        <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left font-medium">Day</th>{(periods as any[]).map((p:any)=><th key={p.id} className="px-3 py-2 text-left font-medium">{p.period_name}<br/><span className="text-xs font-normal text-muted-foreground">{p.start_time}</span></th>)}</tr></thead>
          <tbody>{DAYS.map(day=>(
            <tr key={day} className="border-t">
              <td className="px-3 py-2 font-medium">{day}</td>
              {(periods as any[]).map((p:any)=>{
                const entry = cellMap[`${day}-${p.id}`];
                return (
                  <td key={p.id} className="px-3 py-2 align-top min-w-28">
                    {entry ? (
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium">{entry.subject_name||"—"}</div>
                        <div className="text-muted-foreground">{entry.teacher_name||""}</div>
                        {entry.room_no&&<div className="text-muted-foreground">Rm: {entry.room_no}</div>}
                        <Button size="sm" variant="ghost" className="h-5 text-xs p-1" onClick={()=>delEntryMut.mutate(entry.id)}><Trash2 className="h-3 w-3"/></Button>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {!selectedClass&&<div className="text-center py-12 text-muted-foreground">Select a class to view timetable</div>}
      {selectedClass && (periods as any[]).length===0&&<div className="text-center py-8 text-muted-foreground">Add periods first using the "Add Period" button</div>}

      <Dialog open={showPeriodForm} onOpenChange={setShowPeriodForm}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Add Period</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Period Name *"><Input value={periodForm.period_name||""} onChange={e=>setPeriodForm({...periodForm,period_name:e.target.value})} placeholder="Period 1, Lunch…"/></F>
            <F label="Start Time"><Input type="time" value={periodForm.start_time||""} onChange={e=>setPeriodForm({...periodForm,start_time:e.target.value})}/></F>
            <F label="End Time"><Input type="time" value={periodForm.end_time||""} onChange={e=>setPeriodForm({...periodForm,end_time:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowPeriodForm(false)}>Cancel</Button><Button onClick={()=>savePeriodMut.mutate(periodForm)} disabled={savePeriodMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEntryForm} onOpenChange={setShowEntryForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <F label="Day *"><Select value={entryForm.day_of_week||""} onValueChange={v=>setEntryForm({...entryForm,day_of_week:v})}><SelectTrigger><SelectValue placeholder="Day"/></SelectTrigger><SelectContent>{DAYS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></F>
            <F label="Period *"><Select value={String(entryForm.period_id||"")} onValueChange={v=>{const p=(periods as any[]).find((x:any)=>String(x.id)===v);setEntryForm({...entryForm,period_id:v,period_name:p?.period_name||""})}}><SelectTrigger><SelectValue placeholder="Period"/></SelectTrigger><SelectContent>{(periods as any[]).map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.period_name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Subject"><Select value={entryForm.subject_id?String(entryForm.subject_id):"__none__"} onValueChange={v=>setEntryForm({...entryForm,subject_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Subject"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(subjects as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Teacher"><Select value={entryForm.teacher_id?String(entryForm.teacher_id):"__none__"} onValueChange={v=>setEntryForm({...entryForm,teacher_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Teacher"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(teachers as any[]).map((t:any)=><SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Section"><Input value={entryForm.section||""} onChange={e=>setEntryForm({...entryForm,section:e.target.value})} placeholder="A, B…"/></F>
            <F label="Room No"><Input value={entryForm.room_no||""} onChange={e=>setEntryForm({...entryForm,room_no:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowEntryForm(false)}>Cancel</Button><Button onClick={()=>saveEntryMut.mutate(entryForm)} disabled={saveEntryMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Transport ─────────────────────────────────────────────────────────────────
function TransportTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<"vehicles"|"routes"|"students">("vehicles");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/education/vehicles"] });
  const { data: routes = [] } = useQuery<any[]>({ queryKey: ["/api/education/routes"] });
  const { data: studentTransport = [] } = useQuery<any[]>({ queryKey: ["/api/education/student-transport"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const vehicleMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/vehicles/${editing.id}`, d) : apiRequest("POST", "/api/education/vehicles", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/vehicles"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const routeMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/routes/${editing.id}`, d) : apiRequest("POST", "/api/education/routes", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/routes"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const stMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/student-transport", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/student-transport"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delV = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/vehicles/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/vehicles"] }) });
  const delR = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/routes/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/routes"] }) });
  const delSt = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/student-transport/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/student-transport"] }) });
  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (item: any) => { setEditing(item); setForm({ ...item }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={subTab==="vehicles"?"default":"outline"} onClick={()=>setSubTab("vehicles")}>Vehicles ({(vehicles as any[]).length})</Button>
        <Button variant={subTab==="routes"?"default":"outline"} onClick={()=>setSubTab("routes")}>Routes ({(routes as any[]).length})</Button>
        <Button variant={subTab==="students"?"default":"outline"} onClick={()=>setSubTab("students")}>Student Assignments ({(studentTransport as any[]).length})</Button>
        <div className="flex-1"/>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add {subTab==="students"?"Assignment":subTab==="vehicles"?"Vehicle":"Route"}</Button>
      </div>

      {subTab==="vehicles"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Vehicle No","Driver","Route","Capacity",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(vehicles as any[]).map((v:any)=>(
          <tr key={v.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{v.vehicle_no}</td><td className="px-3 py-2">{v.driver_name||"—"}</td><td className="px-3 py-2">{v.route||"—"}</td><td className="px-3 py-2">{v.capacity}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(v)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delV.mutate(v.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(vehicles as any[]).length&&<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No vehicles added</td></tr>}</tbody>
      </table></div>}

      {subTab==="routes"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Route Name","Pickup Points","Distance (km)","Fee ",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(routes as any[]).map((r:any)=>(
          <tr key={r.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{r.route_name}</td><td className="px-3 py-2">{r.pickup_points||"—"}</td><td className="px-3 py-2">{r.distance_km||"—"}</td><td className="px-3 py-2">{sym}{fmt(r.fee)}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(r)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delR.mutate(r.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(routes as any[]).length&&<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No routes added</td></tr>}</tbody>
      </table></div>}

      {subTab==="students"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Student","Route","Pickup Point","Vehicle",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(studentTransport as any[]).map((st:any)=>(
          <tr key={st.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{st.student_name}</td><td className="px-3 py-2">{st.route_name||"—"}</td><td className="px-3 py-2">{st.pickup_point||"—"}</td><td className="px-3 py-2">{st.vehicle_no||"—"}</td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delSt.mutate(st.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(studentTransport as any[]).length&&<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No assignments yet</td></tr>}</tbody>
      </table></div>}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add {subTab==="students"?"Transport Assignment":subTab==="vehicles"?"Vehicle":"Route"}</DialogTitle></DialogHeader>
          {subTab==="vehicles"&&<div className="grid grid-cols-2 gap-3">
            <F label="Vehicle No *"><Input value={form.vehicle_no||""} onChange={e=>setForm({...form,vehicle_no:e.target.value})}/></F>
            <F label="Driver Name"><Input value={form.driver_name||""} onChange={e=>setForm({...form,driver_name:e.target.value})}/></F>
            <F label="Route"><Input value={form.route||""} onChange={e=>setForm({...form,route:e.target.value})}/></F>
            <F label="Capacity"><Input type="number" value={form.capacity||""} onChange={e=>setForm({...form,capacity:e.target.value})}/></F>
          </div>}
          {subTab==="routes"&&<div className="grid gap-3">
            <F label="Route Name *"><Input value={form.route_name||""} onChange={e=>setForm({...form,route_name:e.target.value})}/></F>
            <F label="Pickup Points"><Textarea value={form.pickup_points||""} onChange={e=>setForm({...form,pickup_points:e.target.value})} rows={2} placeholder="Stop 1, Stop 2…"/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Distance (km)"><Input type="number" value={form.distance_km||""} onChange={e=>setForm({...form,distance_km:e.target.value})}/></F>
              <F label="Fee "><Input type="number" value={form.fee||""} onChange={e=>setForm({...form,fee:e.target.value})}/></F>
            </div>
          </div>}
          {subTab==="students"&&<div className="grid gap-3">
            <F label="Student *"><Select value={String(form.student_id||"")} onValueChange={v=>setForm({...form,student_id:v})}><SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger><SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Route"><Select value={form.route_id?String(form.route_id):"__none__"} onValueChange={v=>setForm({...form,route_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Select route"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(routes as any[]).map((r:any)=><SelectItem key={r.id} value={String(r.id)}>{r.route_name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Pickup Point"><Input value={form.pickup_point||""} onChange={e=>setForm({...form,pickup_point:e.target.value})}/></F>
            <F label="Vehicle"><Select value={form.vehicle_id?String(form.vehicle_id):"__none__"} onValueChange={v=>setForm({...form,vehicle_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Select vehicle"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(vehicles as any[]).map((v:any)=><SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no}</SelectItem>)}</SelectContent></Select></F>
          </div>}
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>{subTab==="vehicles"?vehicleMut.mutate(form):subTab==="routes"?routeMut.mutate(form):stMut.mutate(form)}} disabled={vehicleMut.isPending||routeMut.isPending||stMut.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Announcements ─────────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: announcements = [] } = useQuery<any[]>({ queryKey: ["/api/education/announcements"] });
  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/education/announcements/${editing.id}`, d) : apiRequest("POST", "/api/education/announcements", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/announcements"] }); setShowForm(false); toast({ title: "Saved" }); },
  });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/announcements/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/announcements"] }) });
  const openNew = () => { setEditing(null); setForm({ audience: "all", priority: "normal", start_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ ...a }); setShowForm(true); };
  const priorityColor: Record<string,any> = { high: "destructive", normal: "secondary", low: "outline" };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Post Announcement</Button></div>
      <div className="space-y-3">{(announcements as any[]).map((a: any) => (
        <Card key={a.id}><CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{a.title}</h3>
                <Badge variant={priorityColor[a.priority]}>{a.priority}</Badge>
                <Badge variant="outline">{a.audience}</Badge>
              </div>
              {a.description&&<p className="text-sm text-muted-foreground">{a.description}</p>}
              <p className="text-xs text-muted-foreground">{a.start_date}{a.end_date&&` → ${a.end_date}`}</p>
            </div>
            <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(a)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(a.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div>
          </div>
        </CardContent></Card>
      ))}{!(announcements as any[]).length&&<div className="text-center py-12 text-muted-foreground">No announcements posted yet</div>}</div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"Post"} Announcement</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Title *"><Input value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/></F>
            <F label="Description"><Textarea value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} rows={3}/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Audience"><Select value={form.audience||"all"} onValueChange={v=>setForm({...form,audience:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["all","students","parents","staff","management"].map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></F>
              <F label="Priority"><Select value={form.priority||"normal"} onValueChange={v=>setForm({...form,priority:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["high","normal","low"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></F>
              <F label="Start Date"><Input type="date" value={form.start_date||""} onChange={e=>setForm({...form,start_date:e.target.value})}/></F>
              <F label="End Date"><Input type="date" value={form.end_date||""} onChange={e=>setForm({...form,end_date:e.target.value})}/></F>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Assessments ───────────────────────────────────────────────────────────────
function AssessmentsTab() {
  const { toast } = useToast();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [examForm, setExamForm] = useState<any>({});
  const [marksData, setMarksData] = useState<Record<string,any>>({});
  const { data: examinations = [] } = useQuery<any[]>({ queryKey: ["/api/education/examinations"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ["/api/education/exam-marks", selectedExam?.id],
    queryFn: () => fetch(`/api/education/exam-marks/${selectedExam.id}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    enabled: !!selectedExam,
  });
  useEffect(() => {
    if (selectedExam && marks) {
      const m: Record<string,any> = {};
      (marks as any[]).forEach((x: any) => { m[x.student_id] = { marks_obtained: x.marks_obtained, grade: x.grade, remarks: x.remarks }; });
      setMarksData(m);
    }
  }, [(marks as any[]).length, selectedExam?.id]);
  const saveMut = useMutation({
    mutationFn: (d: any) => editingExam ? apiRequest("PUT", `/api/education/examinations/${editingExam.id}`, d) : apiRequest("POST", "/api/education/examinations", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/examinations"] }); setShowExamForm(false); toast({ title: "Saved" }); },
  });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/examinations/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/examinations"] }) });
  const marksMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/education/exam-marks/bulk", { examination_id: selectedExam.id, marks: Object.entries(marksData).map(([sid, m]: any) => ({ student_id: sid, ...m })) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/exam-marks"] }); toast({ title: "Marks saved" }); },
  });
  const classStudents = selectedExam ? (students as any[]).filter((s: any) => String(s.class_id) === String(selectedExam.class_id)) : [];
  return (
    <div className="space-y-4">
      {!selectedExam ? (
        <>
          <div className="flex justify-end"><Button onClick={()=>{setEditingExam(null);setExamForm({max_marks:100,pass_marks:35});setShowExamForm(true);}}><Plus className="h-4 w-4 mr-1"/>Add Exam</Button></div>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Exam Name","Class","Subject","Date","Max Marks","Pass Marks",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{(examinations as any[]).map((e: any) => (
              <tr key={e.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium"><button className="text-primary underline-offset-2 hover:underline" onClick={()=>setSelectedExam(e)}>{e.exam_name}</button></td>
                <td className="px-3 py-2">{e.class_name||"—"}</td><td className="px-3 py-2">{e.subject||"—"}</td>
                <td className="px-3 py-2">{e.exam_date||"—"}</td><td className="px-3 py-2">{e.max_marks}</td><td className="px-3 py-2">{e.pass_marks}</td>
                <td className="px-3 py-2"><div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={()=>setSelectedExam(e)}>Enter Marks</Button>
                  <Button size="icon" variant="ghost" onClick={()=>{setEditingExam(e);setExamForm({...e});setShowExamForm(true);}}><Pencil className="h-3.5 w-3.5"/></Button>
                  <Button size="icon" variant="ghost" onClick={()=>delMut.mutate(e.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                </div></td>
              </tr>
            ))}{!(examinations as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No exams added</td></tr>}</tbody>
          </table></div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={()=>setSelectedExam(null)}>← Back</Button>
            <h2 className="font-semibold">{selectedExam.exam_name} — {selectedExam.class_name} — {selectedExam.subject}</h2>
            <div className="flex-1"/>
            <Button onClick={()=>marksMut.mutate(undefined as any)} disabled={marksMut.isPending}>Save Marks</Button>
          </div>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Roll No","Student",`Marks (/${selectedExam.max_marks})`,"Grade","Remarks"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{classStudents.map((s: any) => {
              const m = marksData[s.id] || {};
              const pct = selectedExam.max_marks > 0 ? (Number(m.marks_obtained||0)/Number(selectedExam.max_marks))*100 : 0;
              const grade = pct>=90?'A+':pct>=75?'A':pct>=60?'B':pct>=45?'C':pct>=35?'D':'F';
              return (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">{s.roll_number||"—"}</td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 w-32"><Input type="number" min={0} max={selectedExam.max_marks} value={m.marks_obtained??""} onChange={e=>setMarksData({...marksData,[s.id]:{...m,marks_obtained:e.target.value}})} className="h-7"/></td>
                  <td className="px-3 py-2"><Badge variant={grade==="F"?"destructive":grade.startsWith("A")?"default":"secondary"}>{m.marks_obtained!==undefined?grade:"—"}</Badge></td>
                  <td className="px-3 py-2 w-40"><Input value={m.remarks||""} onChange={e=>setMarksData({...marksData,[s.id]:{...m,remarks:e.target.value}})} className="h-7"/></td>
                </tr>
              );
            })}{!classStudents.length&&<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No students in this class</td></tr>}</tbody>
          </table></div>
        </>
      )}
      <Dialog open={showExamForm} onOpenChange={setShowExamForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingExam?"Edit Exam":"Add Exam"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Exam Name *"><Input value={examForm.exam_name||""} onChange={e=>setExamForm({...examForm,exam_name:e.target.value})}/></F></div>
            <F label="Class"><Select value={examForm.class_id?String(examForm.class_id):"__none__"} onValueChange={v=>setExamForm({...examForm,class_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Select class"/></SelectTrigger><SelectContent><SelectItem value="__none__">All</SelectItem>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Subject"><Select value={examForm.subject||"__none__"} onValueChange={v=>setExamForm({...examForm,subject:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Subject"/></SelectTrigger><SelectContent><SelectItem value="__none__">—</SelectItem>{(subjects as any[]).map((s:any)=><SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Exam Date"><Input type="date" value={examForm.exam_date||""} onChange={e=>setExamForm({...examForm,exam_date:e.target.value})}/></F>
            <F label="Academic Year"><Input value={examForm.academic_year||""} onChange={e=>setExamForm({...examForm,academic_year:e.target.value})} placeholder="2024-25"/></F>
            <F label="Max Marks"><Input type="number" value={examForm.max_marks||100} onChange={e=>setExamForm({...examForm,max_marks:e.target.value})}/></F>
            <F label="Pass Marks"><Input type="number" value={examForm.pass_marks||35} onChange={e=>setExamForm({...examForm,pass_marks:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowExamForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(examForm)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Library ───────────────────────────────────────────────────────────────────
function LibraryTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<"books"|"issues">("books");
  const [showBook, setShowBook] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [bookForm, setBookForm] = useState<any>({});
  const [issueForm, setIssueForm] = useState<any>({});
  const { data: books = [] } = useQuery<any[]>({ queryKey: ["/api/education/library-books"] });
  const { data: issues = [] } = useQuery<any[]>({ queryKey: ["/api/education/book-issues"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const bookSave = useMutation({ mutationFn: (d: any) => editingBook ? apiRequest("PUT", `/api/education/library-books/${editingBook.id}`, d) : apiRequest("POST", "/api/education/library-books", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }); setShowBook(false); toast({ title: "Saved" }); } });
  const bookDel = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/library-books/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }) });
  const issueSave = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/book-issues", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/book-issues"] }); queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }); setShowIssue(false); toast({ title: "Book issued" }); } });
  const returnMut = useMutation({ mutationFn: ({id,...d}: any) => apiRequest("PUT", `/api/education/book-issues/${id}/return`, d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/book-issues"] }); queryClient.invalidateQueries({ queryKey: ["/api/education/library-books"] }); toast({ title: "Book returned" }); } });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={subTab==="books"?"default":"outline"} onClick={()=>setSubTab("books")}>Books ({(books as any[]).length})</Button>
        <Button variant={subTab==="issues"?"default":"outline"} onClick={()=>setSubTab("issues")}>Issues ({(issues as any[]).filter((i:any)=>i.status==="issued").length} active)</Button>
        <div className="flex-1"/>
        {subTab==="books"&&<Button onClick={()=>{setEditingBook(null);setBookForm({total_copies:1});setShowBook(true);}}><Plus className="h-4 w-4 mr-1"/>Add Book</Button>}
        {subTab==="issues"&&<Button onClick={()=>{setIssueForm({issue_date:new Date().toISOString().split("T")[0]});setShowIssue(true);}}><Plus className="h-4 w-4 mr-1"/>Issue Book</Button>}
      </div>
      {subTab==="books"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Title","Author","ISBN","Category","Rack","Total","Available",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(books as any[]).map((b:any)=>(
          <tr key={b.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{b.book_code}</td><td className="px-3 py-2 font-medium">{b.title}</td><td className="px-3 py-2">{b.author||"—"}</td>
            <td className="px-3 py-2">{b.isbn||"—"}</td><td className="px-3 py-2">{b.category||"—"}</td><td className="px-3 py-2">{b.rack_number||"—"}</td>
            <td className="px-3 py-2">{b.total_copies}</td><td className="px-3 py-2"><Badge variant={b.available_copies>0?"default":"destructive"}>{b.available_copies}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>{setEditingBook(b);setBookForm({...b});setShowBook(true);}}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>bookDel.mutate(b.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(books as any[]).length&&<tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No books in library</td></tr>}</tbody>
      </table></div>}
      {subTab==="issues"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Book","Student","Issue Date","Due Date","Status","Fine",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(issues as any[]).map((i:any)=>(
          <tr key={i.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{i.book_title}</td><td className="px-3 py-2">{i.student_name_ref||i.student_name||"—"}</td>
            <td className="px-3 py-2">{i.issue_date}</td><td className="px-3 py-2">{i.due_date||"—"}</td>
            <td className="px-3 py-2"><Badge variant={i.status==="issued"?"default":"secondary"}>{i.status}</Badge></td>
            <td className="px-3 py-2">{sym}{fmt(i.fine_amount||0)}</td>
            <td className="px-3 py-2">{i.status==="issued"&&<Button size="sm" variant="outline" onClick={()=>returnMut.mutate({id:i.id,return_date:new Date().toISOString().split("T")[0],fine_amount:0})}>Return</Button>}</td>
          </tr>
        ))}{!(issues as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No book issues</td></tr>}</tbody>
      </table></div>}
      <Dialog open={showBook} onOpenChange={setShowBook}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingBook?"Edit Book":"Add Book"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Title *"><Input value={bookForm.title||""} onChange={e=>setBookForm({...bookForm,title:e.target.value})}/></F></div>
            <F label="Author"><Input value={bookForm.author||""} onChange={e=>setBookForm({...bookForm,author:e.target.value})}/></F>
            <F label="ISBN"><Input value={bookForm.isbn||""} onChange={e=>setBookForm({...bookForm,isbn:e.target.value})}/></F>
            <F label="Category"><Input value={bookForm.category||""} onChange={e=>setBookForm({...bookForm,category:e.target.value})}/></F>
            <F label="Publisher"><Input value={bookForm.publisher||""} onChange={e=>setBookForm({...bookForm,publisher:e.target.value})}/></F>
            <F label="Total Copies"><Input type="number" value={bookForm.total_copies||1} onChange={e=>setBookForm({...bookForm,total_copies:e.target.value})}/></F>
            <F label="Rack No"><Input value={bookForm.rack_number||""} onChange={e=>setBookForm({...bookForm,rack_number:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowBook(false)}>Cancel</Button><Button onClick={()=>bookSave.mutate(bookForm)} disabled={bookSave.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Book *"><Select value={String(issueForm.book_id||"")} onValueChange={v=>setIssueForm({...issueForm,book_id:v})}><SelectTrigger><SelectValue placeholder="Select book"/></SelectTrigger><SelectContent>{(books as any[]).filter((b:any)=>b.available_copies>0).map((b:any)=><SelectItem key={b.id} value={String(b.id)}>{b.title} (Avail: {b.available_copies})</SelectItem>)}</SelectContent></Select></F>
            <F label="Student"><Select value={String(issueForm.student_id||"")} onValueChange={v=>{const s=(students as any[]).find((x:any)=>String(x.id)===v);setIssueForm({...issueForm,student_id:v,student_name:s?.name||""})}}><SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger><SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Issue Date"><Input type="date" value={issueForm.issue_date||""} onChange={e=>setIssueForm({...issueForm,issue_date:e.target.value})}/></F>
              <F label="Due Date"><Input type="date" value={issueForm.due_date||""} onChange={e=>setIssueForm({...issueForm,due_date:e.target.value})}/></F>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowIssue(false)}>Cancel</Button><Button onClick={()=>issueSave.mutate(issueForm)} disabled={issueSave.isPending}>Issue</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Advanced Fee Engine ───────────────────────────────────────────────────────
function FeesTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<"payments"|"structures"|"components"|"scholarships"|"discounts"|"ledger">("payments");

  // ── data ──
  const { data: structures = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-structures"] });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-payments"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });
  const { data: components = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-components"] });
  const { data: scholarships = [] } = useQuery<any[]>({ queryKey: ["/api/education/scholarships"] });
  const { data: discounts = [] } = useQuery<any[]>({ queryKey: ["/api/education/discounts"] });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-ledger"] });
  const { data: studentScholarships = [] } = useQuery<any[]>({ queryKey: ["/api/education/student-scholarships"] });
  const { data: studentDiscounts = [] } = useQuery<any[]>({ queryKey: ["/api/education/student-discounts"] });

  // ── payment form state ──
  const [showPayment, setShowPayment] = useState(false);
  const [pf, setPf] = useState<any>({ payment_mode: "cash", paid_date: new Date().toISOString().split("T")[0] });

  // ── scholarship master form ──
  const [showSchMaster, setShowSchMaster] = useState(false);
  const [editingSch, setEditingSch] = useState<any>(null);
  const [schForm, setSchForm] = useState<any>({ type: "percentage" });

  // ── assign scholarship to student ──
  const [showAssignSch, setShowAssignSch] = useState(false);
  const [assignSchForm, setAssignSchForm] = useState<any>({});

  // ── discount master form ──
  const [showDiscMaster, setShowDiscMaster] = useState(false);
  const [discForm, setDiscForm] = useState<any>({ type: "fixed" });

  // ── assign discount to student ──
  const [showAssignDisc, setShowAssignDisc] = useState(false);
  const [assignDiscForm, setAssignDiscForm] = useState<any>({});

  // ── structure / component / ledger forms ──
  const [showSfForm, setShowSfForm] = useState(false);
  const [editingSf, setEditingSf] = useState<any>(null);
  const [sfForm, setSfForm] = useState<any>({ frequency: "monthly", due_day: 10 });

  const [showCompForm, setShowCompForm] = useState(false);
  const [editingComp, setEditingComp] = useState<any>(null);
  const [compForm, setCompForm] = useState<any>({});

  const [showLedger, setShowLedger] = useState(false);
  const [ledgerForm, setLedgerForm] = useState<any>({});

  // ── payment breakdown computation ──
  const selStudentId = String(pf.student_id || "");
  const grossAmt = Number(pf.gross_amount || 0);

  const appliedSchols = (studentScholarships as any[]).filter(ss => String(ss.student_id) === selStudentId);
  const appliedDiscs  = (studentDiscounts   as any[]).filter(sd => String(sd.student_id) === selStudentId);

  const breakdown: { label: string; amount: number }[] = [];
  appliedSchols.forEach(ss => {
    const base = (scholarships as any[]).find(s => s.id === ss.scholarship_id);
    const type  = base?.type || "percentage";
    const value = Number(ss.value ?? base?.value ?? 0);
    const amt   = type === "percentage" ? Math.round(grossAmt * value / 100) : value;
    if (amt > 0) breakdown.push({ label: `${ss.scholarship_name} (${type === "percentage" ? value + "%" : sym + fmt(value)})`, amount: amt });
  });
  appliedDiscs.forEach(sd => {
    const base  = (discounts as any[]).find(d => d.id === sd.discount_id);
    const type  = base?.type || "fixed";
    const value = Number(sd.value || 0);
    const amt   = type === "percentage" ? Math.round(grossAmt * value / 100) : value;
    if (amt > 0) breakdown.push({ label: `${sd.discount_name} Discount`, amount: amt });
  });
  const totalDeduction = breakdown.reduce((s, b) => s + b.amount, 0);
  const netPayable = Math.max(0, grossAmt - totalDeduction);

  // ── mutations ──
  const pfSave = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/education/fee-payments", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/fee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/education/fee-ledger"] });
      setShowPayment(false);
      setPf({ payment_mode: "cash", paid_date: new Date().toISOString().split("T")[0] });
      toast({ title: "Payment recorded", description: "Ledger entries posted automatically." });
    }
  });
  const schMasterSave = useMutation({
    mutationFn: (d: any) => editingSch ? apiRequest("PUT", `/api/education/scholarships/${editingSch.id}`, d) : apiRequest("POST", "/api/education/scholarships", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/scholarships"] }); setShowSchMaster(false); toast({ title: "Saved" }); }
  });
  const schMasterDel = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/scholarships/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/scholarships"] }) });
  const assignSchSave = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/education/student-scholarships", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/student-scholarships"] }); setShowAssignSch(false); toast({ title: "Scholarship assigned" }); }
  });
  const assignSchDel = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/student-scholarships/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/student-scholarships"] }) });

  const discMasterSave = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/education/discounts", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/discounts"] }); setShowDiscMaster(false); toast({ title: "Saved" }); }
  });
  const discMasterDel = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/discounts/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/discounts"] }) });
  const assignDiscSave = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/education/student-discounts", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/student-discounts"] }); setShowAssignDisc(false); toast({ title: "Discount assigned" }); }
  });
  const assignDiscDel = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/student-discounts/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/student-discounts"] }) });

  const sfSave = useMutation({ mutationFn: (d: any) => editingSf ? apiRequest("PUT", `/api/education/fee-structures/${editingSf.id}`, d) : apiRequest("POST", "/api/education/fee-structures", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/fee-structures"] }); setShowSfForm(false); toast({ title: "Saved" }); } });
  const sfDel  = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/fee-structures/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/fee-structures"] }) });
  const compSave = useMutation({ mutationFn: (d: any) => editingComp ? apiRequest("PUT", `/api/education/fee-components/${editingComp.id}`, d) : apiRequest("POST", "/api/education/fee-components", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/fee-components"] }); setShowCompForm(false); toast({ title: "Saved" }); } });
  const compDel  = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/education/fee-components/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/education/fee-components"] }) });
  const ledgerSave = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/fee-ledger", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/fee-ledger"] }); setShowLedger(false); toast({ title: "Entry added" }); } });

  const SUBTABS = [
    { key: "payments",    label: `Payments (${(payments as any[]).length})` },
    { key: "structures",  label: "Fee Structures" },
    { key: "components",  label: "Fee Components" },
    { key: "scholarships",label: "Scholarships" },
    { key: "discounts",   label: "Discounts" },
    { key: "ledger",      label: "Fee Ledger" },
  ];

  const addBtn: Record<string, { label: string; action: () => void }> = {
    payments:    { label: "Record Payment",  action: () => setShowPayment(true) },
    structures:  { label: "Add Structure",   action: () => { setEditingSf(null); setSfForm({ frequency:"monthly", due_day:10 }); setShowSfForm(true); } },
    components:  { label: "Add Component",   action: () => { setEditingComp(null); setCompForm({}); setShowCompForm(true); } },
    scholarships:{ label: "Add Scholarship", action: () => { setEditingSch(null); setSchForm({ type:"percentage" }); setShowSchMaster(true); } },
    discounts:   { label: "Add Discount",    action: () => { setDiscForm({ type:"fixed" }); setShowDiscMaster(true); } },
    ledger:      { label: "Add Entry",       action: () => { setLedgerForm({}); setShowLedger(true); } },
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex flex-wrap items-center gap-2">
        {SUBTABS.map(t => <Button key={t.key} variant={subTab===t.key?"default":"outline"} onClick={()=>setSubTab(t.key as any)} className="text-xs">{t.label}</Button>)}
        <div className="flex-1"/>
        <Button onClick={addBtn[subTab].action}><Plus className="h-4 w-4 mr-1"/>{addBtn[subTab].label}</Button>
      </div>

      {/* ── Payments ── */}
      {subTab==="payments"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Receipt","Student","Class","Month","Gross","Discount","Net Paid","Mode","Date"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(payments as any[]).map((p:any)=>(
          <tr key={p.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{p.receipt_no}</td>
            <td className="px-3 py-2 font-medium">{p.student_name}</td>
            <td className="px-3 py-2">{p.class_name||"—"}</td>
            <td className="px-3 py-2">{p.for_month||"—"}</td>
            <td className="px-3 py-2">{sym}{fmt(p.gross_amount||p.amount)}</td>
            <td className="px-3 py-2 text-green-600 dark:text-green-400">{Number(p.discount_amount)>0?`−${sym}${fmt(p.discount_amount)}`:"—"}</td>
            <td className="px-3 py-2 font-semibold">{sym}{fmt(p.amount)}</td>
            <td className="px-3 py-2 uppercase">{p.payment_mode}</td>
            <td className="px-3 py-2">{p.paid_date?.split("T")[0]}</td>
          </tr>
        ))}{!(payments as any[]).length&&<tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No payments recorded</td></tr>}</tbody>
      </table></div>}

      {/* ── Fee Structures ── */}
      {subTab==="structures"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Class","Fee Type","Amount","Frequency","Year","Due Day",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(structures as any[]).map((s:any)=>(
          <tr key={s.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2">{s.class_name||"All"}</td><td className="px-3 py-2 font-medium">{s.fee_type}</td><td className="px-3 py-2">{sym}{fmt(s.amount)}</td>
            <td className="px-3 py-2 capitalize">{s.frequency}</td><td className="px-3 py-2">{s.academic_year||"—"}</td><td className="px-3 py-2">{s.due_day}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>{setEditingSf(s);setSfForm({...s});setShowSfForm(true);}}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>sfDel.mutate(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(structures as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No fee structures defined</td></tr>}</tbody>
      </table></div>}

      {/* ── Fee Components ── */}
      {subTab==="components"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Component Name","Mandatory","Recurring",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(components as any[]).map((c:any)=>(
          <tr key={c.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{c.name}</td>
            <td className="px-3 py-2"><Badge variant={c.mandatory?"default":"secondary"}>{c.mandatory?"Yes":"No"}</Badge></td>
            <td className="px-3 py-2"><Badge variant={c.recurring?"default":"secondary"}>{c.recurring?"Yes":"No"}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>{setEditingComp(c);setCompForm({...c});setShowCompForm(true);}}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>compDel.mutate(c.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(components as any[]).length&&<tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No fee components defined</td></tr>}</tbody>
      </table></div>}

      {/* ── Scholarships ── */}
      {subTab==="scholarships"&&<div className="space-y-4">
        {/* Master list */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Scholarship Definitions</p>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Name","Type","Value",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{(scholarships as any[]).map((s:any)=>(
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{s.name}</td><td className="px-3 py-2 capitalize">{s.type}</td>
                <td className="px-3 py-2">{s.type==="percentage"?`${s.value}%`:`${sym}${fmt(s.value)}`}</td>
                <td className="px-3 py-2"><div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={()=>{setEditingSch(s);setSchForm({...s});setShowSchMaster(true);}}><Pencil className="h-3.5 w-3.5"/></Button>
                  <Button size="icon" variant="ghost" onClick={()=>schMasterDel.mutate(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                </div></td>
              </tr>
            ))}{!(scholarships as any[]).length&&<tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No scholarships defined</td></tr>}</tbody>
          </table></div>
        </div>
        {/* Student assignments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Student Assignments</p>
            <Button size="sm" variant="outline" onClick={()=>{setAssignSchForm({});setShowAssignSch(true);}}><Plus className="h-3.5 w-3.5 mr-1"/>Assign to Student</Button>
          </div>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Student","Scholarship","Override Value",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{(studentScholarships as any[]).map((ss:any)=>(
              <tr key={ss.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{ss.student_name}</td>
                <td className="px-3 py-2">{ss.scholarship_name}</td>
                <td className="px-3 py-2">{ss.value!=null?(ss.type==="percentage"?`${ss.value}%`:`${sym}${fmt(ss.value)}`):"Default"}</td>
                <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>assignSchDel.mutate(ss.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
              </tr>
            ))}{!(studentScholarships as any[]).length&&<tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No assignments yet</td></tr>}</tbody>
          </table></div>
        </div>
      </div>}

      {/* ── Discounts ── */}
      {subTab==="discounts"&&<div className="space-y-4">
        {/* Master list */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Discount Definitions</p>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Name","Type",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{(discounts as any[]).map((d:any)=>(
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{d.name}</td><td className="px-3 py-2 capitalize">{d.type}</td>
                <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>discMasterDel.mutate(d.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
              </tr>
            ))}{!(discounts as any[]).length&&<tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No discounts defined</td></tr>}</tbody>
          </table></div>
        </div>
        {/* Student assignments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Student Assignments</p>
            <Button size="sm" variant="outline" onClick={()=>{setAssignDiscForm({});setShowAssignDisc(true);}}><Plus className="h-3.5 w-3.5 mr-1"/>Assign to Student</Button>
          </div>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Student","Discount","Value","Applicable On",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{(studentDiscounts as any[]).map((sd:any)=>(
              <tr key={sd.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{sd.student_name}</td>
                <td className="px-3 py-2">{sd.discount_name}</td>
                <td className="px-3 py-2">{sym}{fmt(sd.value)}</td>
                <td className="px-3 py-2">{sd.applicable_on||"All fees"}</td>
                <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>assignDiscDel.mutate(sd.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
              </tr>
            ))}{!(studentDiscounts as any[]).length&&<tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No assignments yet</td></tr>}</tbody>
          </table></div>
        </div>
      </div>}

      {/* ── Fee Ledger ── */}
      {subTab==="ledger"&&<div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Voucher","Date","Student","Description","Debit","Credit","Balance"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(ledger as any[]).map((l:any)=>(
          <tr key={l.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{l.voucher_no}</td>
            <td className="px-3 py-2">{l.entry_date?.split("T")[0]||l.entry_date}</td>
            <td className="px-3 py-2 font-medium">{l.student_name}</td>
            <td className="px-3 py-2">{l.component_name||l.narration||"—"}</td>
            <td className="px-3 py-2 text-red-600 dark:text-red-400">{Number(l.debit)>0?`${sym}${fmt(l.debit)}`:"—"}</td>
            <td className="px-3 py-2 text-green-600 dark:text-green-400">{Number(l.credit)>0?`${sym}${fmt(l.credit)}`:"—"}</td>
            <td className="px-3 py-2 font-semibold">{sym}{fmt(l.balance)}</td>
          </tr>
        ))}{!(ledger as any[]).length&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No ledger entries</td></tr>}</tbody>
      </table></div>}

      {/* ══ PAYMENT DIALOG ══ */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Fee Payment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Student *">
              <Select value={String(pf.student_id||"")} onValueChange={v=>setPf({...pf,student_id:v,gross_amount:""})}>
                <SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger>
                <SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}{s.class_name?` — ${s.class_name}`:""}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Fee Structure">
              <Select value={pf.fee_structure_id?String(pf.fee_structure_id):"__none__"} onValueChange={v=>{
                const sf = (structures as any[]).find(s=>String(s.id)===v);
                setPf({...pf, fee_structure_id: v==="__none__"?"":v, gross_amount: sf?.amount||pf.gross_amount });
              }}>
                <SelectTrigger><SelectValue placeholder="Select structure (optional)"/></SelectTrigger>
                <SelectContent><SelectItem value="__none__">None</SelectItem>{(structures as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.fee_type} — {sym}{fmt(s.amount)}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Gross Amount (${sym}) *">
              <Input type="number" placeholder="Total fee before deductions" value={pf.gross_amount||""} onChange={e=>setPf({...pf,gross_amount:e.target.value})}/>
            </F>

            {/* Deduction breakdown — shown when student selected & gross > 0 */}
            {selStudentId && grossAmt > 0 && (
              <div className="rounded-md bg-muted/40 border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Fee</span><span>{sym}{fmt(grossAmt)}</span></div>
                {breakdown.length > 0
                  ? breakdown.map((b,i)=>(
                    <div key={i} className="flex justify-between text-green-600 dark:text-green-400">
                      <span>{b.label}</span><span>−{sym}{fmt(b.amount)}</span>
                    </div>
                  ))
                  : <div className="text-muted-foreground text-xs">No scholarships or discounts assigned to this student.</div>
                }
                <div className="border-t pt-1.5 flex justify-between font-semibold">
                  <span>Net Payable</span><span>{sym}{fmt(netPayable)}</span>
                </div>
              </div>
            )}

            <F label="For Month"><Input placeholder="April 2025" value={pf.for_month||""} onChange={e=>setPf({...pf,for_month:e.target.value})}/></F>
            <F label="Payment Mode">
              <Select value={pf.payment_mode||"cash"} onValueChange={v=>setPf({...pf,payment_mode:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["cash","cheque","upi","bank_transfer","dd"].map(m=><SelectItem key={m} value={m}>{m.replace("_"," ").toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Date *"><Input type="date" value={pf.paid_date||""} onChange={e=>setPf({...pf,paid_date:e.target.value})}/></F>
            <F label="Notes"><Input value={pf.notes||""} onChange={e=>setPf({...pf,notes:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowPayment(false)}>Cancel</Button>
            <Button onClick={()=>pfSave.mutate({ ...pf, gross_amount: grossAmt, discount_amount: totalDeduction, amount: netPayable })} disabled={pfSave.isPending||!pf.student_id||!grossAmt||!pf.paid_date}>
              {pfSave.isPending?"Saving…":"Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ SCHOLARSHIP MASTER DIALOG ══ */}
      <Dialog open={showSchMaster} onOpenChange={setShowSchMaster}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingSch?"Edit":"Add"} Scholarship</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Name *"><Input value={schForm.name||""} onChange={e=>setSchForm({...schForm,name:e.target.value})}/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Type">
                <Select value={schForm.type||"percentage"} onValueChange={v=>setSchForm({...schForm,type:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (${sym})</SelectItem></SelectContent>
                </Select>
              </F>
              <F label="Value *"><Input type="number" value={schForm.value||""} onChange={e=>setSchForm({...schForm,value:e.target.value})} placeholder={schForm.type==="percentage"?"%":sym}/></F>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowSchMaster(false)}>Cancel</Button>
            <Button onClick={()=>schMasterSave.mutate(schForm)} disabled={schMasterSave.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ ASSIGN SCHOLARSHIP DIALOG ══ */}
      <Dialog open={showAssignSch} onOpenChange={setShowAssignSch}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Scholarship to Student</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Student *">
              <Select value={String(assignSchForm.student_id||"")} onValueChange={v=>setAssignSchForm({...assignSchForm,student_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger>
                <SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Scholarship *">
              <Select value={String(assignSchForm.scholarship_id||"")} onValueChange={v=>setAssignSchForm({...assignSchForm,scholarship_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select scholarship"/></SelectTrigger>
                <SelectContent>{(scholarships as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.type==="percentage"?`${s.value}%`:`${sym}${fmt(s.value)}`})</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Override Value (optional)"><Input type="number" placeholder="Leave blank to use default" value={assignSchForm.value||""} onChange={e=>setAssignSchForm({...assignSchForm,value:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowAssignSch(false)}>Cancel</Button>
            <Button onClick={()=>assignSchSave.mutate(assignSchForm)} disabled={assignSchSave.isPending||!assignSchForm.student_id||!assignSchForm.scholarship_id}>Assign</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ DISCOUNT MASTER DIALOG ══ */}
      <Dialog open={showDiscMaster} onOpenChange={setShowDiscMaster}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Discount Type</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Name *"><Input value={discForm.name||""} onChange={e=>setDiscForm({...discForm,name:e.target.value})}/></F>
            <F label="Type">
              <Select value={discForm.type||"fixed"} onValueChange={v=>setDiscForm({...discForm,type:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="fixed">Fixed (${sym})</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent>
              </Select>
            </F>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowDiscMaster(false)}>Cancel</Button>
            <Button onClick={()=>discMasterSave.mutate(discForm)} disabled={discMasterSave.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ ASSIGN DISCOUNT DIALOG ══ */}
      <Dialog open={showAssignDisc} onOpenChange={setShowAssignDisc}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Discount to Student</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Student *">
              <Select value={String(assignDiscForm.student_id||"")} onValueChange={v=>setAssignDiscForm({...assignDiscForm,student_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger>
                <SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Discount *">
              <Select value={String(assignDiscForm.discount_id||"")} onValueChange={v=>setAssignDiscForm({...assignDiscForm,discount_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select discount"/></SelectTrigger>
                <SelectContent>{(discounts as any[]).map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Amount / Value (${sym} or %)"><Input type="number" value={assignDiscForm.value||""} onChange={e=>setAssignDiscForm({...assignDiscForm,value:e.target.value})}/></F>
            <F label="Applicable On"><Input placeholder="e.g. Tuition Fee (or leave blank for all)" value={assignDiscForm.applicable_on||""} onChange={e=>setAssignDiscForm({...assignDiscForm,applicable_on:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowAssignDisc(false)}>Cancel</Button>
            <Button onClick={()=>assignDiscSave.mutate(assignDiscForm)} disabled={assignDiscSave.isPending||!assignDiscForm.student_id||!assignDiscForm.discount_id}>Assign</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ FEE STRUCTURE DIALOG ══ */}
      <Dialog open={showSfForm} onOpenChange={setShowSfForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSf?"Edit":"Add"} Fee Structure</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Class">
              <Select value={sfForm.class_id?String(sfForm.class_id):"__none__"} onValueChange={v=>setSfForm({...sfForm,class_id:v==="__none__"?"":v})}>
                <SelectTrigger><SelectValue placeholder="All classes"/></SelectTrigger>
                <SelectContent><SelectItem value="__none__">All Classes</SelectItem>{(classes as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </F></div>
            <F label="Fee Type *"><Input placeholder="Tuition, Transport…" value={sfForm.fee_type||""} onChange={e=>setSfForm({...sfForm,fee_type:e.target.value})}/></F>
            <F label="Amount (${sym}) *"><Input type="number" value={sfForm.amount||""} onChange={e=>setSfForm({...sfForm,amount:e.target.value})}/></F>
            <F label="Frequency">
              <Select value={sfForm.frequency||"monthly"} onValueChange={v=>setSfForm({...sfForm,frequency:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["monthly","quarterly","annual","one-time"].map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Due Day"><Input type="number" min={1} max={31} value={sfForm.due_day||10} onChange={e=>setSfForm({...sfForm,due_day:e.target.value})}/></F>
            <div className="col-span-2"><F label="Academic Year"><Input placeholder="2024-25" value={sfForm.academic_year||""} onChange={e=>setSfForm({...sfForm,academic_year:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowSfForm(false)}>Cancel</Button>
            <Button onClick={()=>sfSave.mutate(sfForm)} disabled={sfSave.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ FEE COMPONENT DIALOG ══ */}
      <Dialog open={showCompForm} onOpenChange={setShowCompForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingComp?"Edit":"Add"} Fee Component</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Component Name *"><Input value={compForm.name||""} onChange={e=>setCompForm({...compForm,name:e.target.value})} placeholder="Tuition Fee, Lab Fee…"/></F>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={compForm.mandatory!==0&&compForm.mandatory!==false} onCheckedChange={v=>setCompForm({...compForm,mandatory:v?1:0})}/><span className="text-sm">Mandatory</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={compForm.recurring!==0&&compForm.recurring!==false} onCheckedChange={v=>setCompForm({...compForm,recurring:v?1:0})}/><span className="text-sm">Recurring</span></label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowCompForm(false)}>Cancel</Button>
            <Button onClick={()=>compSave.mutate(compForm)} disabled={compSave.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ MANUAL LEDGER ENTRY DIALOG ══ */}
      <Dialog open={showLedger} onOpenChange={setShowLedger}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Ledger Entry</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <F label="Student *">
              <Select value={String(ledgerForm.student_id||"")} onValueChange={v=>setLedgerForm({...ledgerForm,student_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger>
                <SelectContent>{(students as any[]).map((s:any)=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Description"><Input value={ledgerForm.component_name||""} onChange={e=>setLedgerForm({...ledgerForm,component_name:e.target.value})} placeholder="Tuition Fee, Transport…"/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Debit "><Input type="number" value={ledgerForm.debit||""} onChange={e=>setLedgerForm({...ledgerForm,debit:e.target.value})}/></F>
              <F label="Credit "><Input type="number" value={ledgerForm.credit||""} onChange={e=>setLedgerForm({...ledgerForm,credit:e.target.value})}/></F>
            </div>
            <F label="Date"><Input type="date" value={ledgerForm.entry_date||""} onChange={e=>setLedgerForm({...ledgerForm,entry_date:e.target.value})}/></F>
            <F label="Narration"><Input value={ledgerForm.narration||""} onChange={e=>setLedgerForm({...ledgerForm,narration:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowLedger(false)}>Cancel</Button>
            <Button onClick={()=>ledgerSave.mutate(ledgerForm)} disabled={ledgerSave.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EducationPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Education Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Students, Staff, Classes, Subjects, Attendance, Timetable, Library, Transport, Fees &amp; Announcements</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview"><BarChart3 className="h-3.5 w-3.5 mr-1"/>Overview</TabsTrigger>
          <TabsTrigger value="students"><Users className="h-3.5 w-3.5 mr-1"/>Students</TabsTrigger>
          <TabsTrigger value="staff"><GraduationCap className="h-3.5 w-3.5 mr-1"/>Staff</TabsTrigger>
          <TabsTrigger value="classes"><BookOpen className="h-3.5 w-3.5 mr-1"/>Classes</TabsTrigger>
          <TabsTrigger value="subjects"><BookCopy className="h-3.5 w-3.5 mr-1"/>Subjects</TabsTrigger>
          <TabsTrigger value="attendance"><CheckSquare className="h-3.5 w-3.5 mr-1"/>Attendance</TabsTrigger>
          <TabsTrigger value="timetable"><Calendar className="h-3.5 w-3.5 mr-1"/>Timetable</TabsTrigger>
          <TabsTrigger value="assessments"><ClipboardList className="h-3.5 w-3.5 mr-1"/>Assessments</TabsTrigger>
          <TabsTrigger value="library"><Library className="h-3.5 w-3.5 mr-1"/>Library</TabsTrigger>
          <TabsTrigger value="transport"><Bus className="h-3.5 w-3.5 mr-1"/>Transport</TabsTrigger>
          <TabsTrigger value="fees"><Receipt className="h-3.5 w-3.5 mr-1"/>Fees</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="h-3.5 w-3.5 mr-1"/>Announcements</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab/></TabsContent>
        <TabsContent value="students" className="mt-4"><StudentsTab/></TabsContent>
        <TabsContent value="staff" className="mt-4"><StaffTab/></TabsContent>
        <TabsContent value="classes" className="mt-4"><ClassesTab/></TabsContent>
        <TabsContent value="subjects" className="mt-4"><SubjectsTab/></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab/></TabsContent>
        <TabsContent value="timetable" className="mt-4"><TimetableTab/></TabsContent>
        <TabsContent value="assessments" className="mt-4"><AssessmentsTab/></TabsContent>
        <TabsContent value="library" className="mt-4"><LibraryTab/></TabsContent>
        <TabsContent value="transport" className="mt-4"><TransportTab/></TabsContent>
        <TabsContent value="fees" className="mt-4"><FeesTab/></TabsContent>
        <TabsContent value="announcements" className="mt-4"><AnnouncementsTab/></TabsContent>
      </Tabs>
    </div>
  );
}
