import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, GraduationCap, Users, IndianRupee, BookOpen, X } from "lucide-react";

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

// ── Classes Tab ───────────────────────────────────────────────────────────────
function ClassesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/education/classes/${editing.id}`, data) : apiRequest("POST", "/api/education/classes", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/classes"] }); setShowForm(false); setEditing(null); toast({ title: "Class saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/education/classes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/classes"] }); toast({ title: "Class removed" }); },
  });

  const openForm = (c?: any) => { setEditing(c || null); setForm(c || {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-class"><Plus className="h-4 w-4 mr-1" />Add Class</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => (
          <Card key={c.id} data-testid={`card-class-${c.id}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.grade && `Grade ${c.grade}`}{c.section && ` – ${c.section}`}</p>
                  <p className="text-sm mt-1">{c.teacher_name || "No teacher"} · {c.capacity} seats</p>
                  {c.academic_year && <Badge variant="outline" className="mt-2 text-xs">{c.academic_year}</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openForm(c)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {classes.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground">No classes configured</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Class Name *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Class 10A" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Grade</Label><Input value={form.grade || ""} onChange={e => setForm({...form, grade: e.target.value})} placeholder="10" /></div>
              <div><Label>Section</Label><Input value={form.section || ""} onChange={e => setForm({...form, section: e.target.value})} placeholder="A" /></div>
            </div>
            <div><Label>Teacher Name</Label><Input value={form.teacher_name || ""} onChange={e => setForm({...form, teacher_name: e.target.value})} /></div>
            <div><Label>Academic Year</Label><Input value={form.academic_year || ""} onChange={e => setForm({...form, academic_year: e.target.value})} placeholder="2024-25" /></div>
            <div><Label>Capacity (seats)</Label><Input type="number" value={form.capacity || ""} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} data-testid="button-save-class">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────────────────────
function StudentsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/education/students/${editing.id}`, data) : apiRequest("POST", "/api/education/students", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/students"] }); setShowForm(false); setEditing(null); toast({ title: "Student saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.student_code?.includes(search) || s.parent_phone?.includes(search));

  const openForm = (s?: any) => { setEditing(s || null); setForm(s || {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-student-search" />
        </div>
        <Button onClick={() => openForm()} data-testid="button-add-student"><Plus className="h-4 w-4 mr-1" />Add Student</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Code</th><th className="text-left p-3">Name</th><th className="text-left p-3">Class</th><th className="text-left p-3">Parent</th><th className="text-left p-3">Phone</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b hover-elevate" data-testid={`row-student-${s.id}`}>
                  <td className="p-3 font-mono text-xs">{s.student_code}</td>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.class_name || "-"}{s.grade && ` (${s.grade}${s.section || ""})`}</td>
                  <td className="p-3">{s.parent_name || "-"}</td>
                  <td className="p-3">{s.parent_phone || "-"}</td>
                  <td className="p-3"><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => openForm(s)}>Edit</Button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No students found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Full Name *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} data-testid="input-student-name" /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.dob || ""} onChange={e => setForm({...form, dob: e.target.value})} /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender || ""} onValueChange={v => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Class</Label>
                <Select value={form.class_id || ""} onValueChange={v => setForm({...form, class_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Assign to class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.grade && ` (${c.grade}${c.section || ""})`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Parent Name</Label><Input value={form.parent_name || ""} onChange={e => setForm({...form, parent_name: e.target.value})} /></div>
              <div><Label>Parent Phone</Label><Input value={form.parent_phone || ""} onChange={e => setForm({...form, parent_phone: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Enrollment Date</Label><Input type="date" value={form.enrollment_date || ""} onChange={e => setForm({...form, enrollment_date: e.target.value})} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})} /></div>
              {editing && <div><Label>Status</Label>
                <Select value={form.status || "active"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="graduated">Graduated</SelectItem></SelectContent>
                </Select>
              </div>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} data-testid="button-save-student">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Fee Payments Tab ──────────────────────────────────────────────────────────
function FeePaymentsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-payments"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"] });
  const { data: feeStructures = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-structures"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/education/fee-payments", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/education/fee-payments"] }); setShowForm(false); toast({ title: "Payment recorded" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ paid_date: new Date().toISOString().split("T")[0], payment_mode: "cash" }); setShowForm(true); }} data-testid="button-collect-fee"><Plus className="h-4 w-4 mr-1" />Collect Fee</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Receipt</th><th className="text-left p-3">Student</th><th className="text-left p-3">Class</th><th className="text-left p-3">Month</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Mode</th><th className="text-left p-3">Date</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b" data-testid={`row-payment-${p.id}`}>
                  <td className="p-3 font-mono text-xs">{p.receipt_no}</td>
                  <td className="p-3 font-medium">{p.student_name}</td>
                  <td className="p-3 text-muted-foreground">{p.class_name}</td>
                  <td className="p-3">{p.for_month || "-"}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(p.amount).toLocaleString()}</td>
                  <td className="p-3"><Badge variant="outline">{p.payment_mode}</Badge></td>
                  <td className="p-3">{p.paid_date}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No fee payments recorded</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Collect Fee Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Student *</Label>
              <Select value={form.student_id || ""} onValueChange={v => setForm({...form, student_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.student_code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Fee Type</Label>
              <Select value={form.fee_structure_id || ""} onValueChange={v => { const fs = feeStructures.find(f => f.id === v); setForm({...form, fee_structure_id: v, amount: fs?.amount || ""}); }}>
                <SelectTrigger><SelectValue placeholder="Select fee type (optional)" /></SelectTrigger>
                <SelectContent>{feeStructures.map(f => <SelectItem key={f.id} value={f.id}>{f.fee_type} – ₹{f.amount} ({f.frequency})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm({...form, amount: e.target.value})} data-testid="input-fee-amount" /></div>
              <div><Label>For Month</Label>
                <Select value={form.for_month || ""} onValueChange={v => setForm({...form, for_month: v})}>
                  <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.paid_date || ""} onChange={e => setForm({...form, paid_date: e.target.value})} /></div>
              <div><Label>Payment Mode</Label>
                <Select value={form.payment_mode || "cash"} onValueChange={v => setForm({...form, payment_mode: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.student_id || !form.amount} data-testid="button-save-fee-payment">{saveMutation.isPending ? "Saving..." : "Record Payment"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EducationPage() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/education/stats"] });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"] });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Education Management</h1>
        <p className="text-muted-foreground mt-1">Manage students, classes, and fee collection</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats?.totalStudents ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard title="Classes" value={stats?.totalClasses ?? classes.length} icon={BookOpen} color="bg-purple-100 text-purple-600" />
        <StatCard title="Monthly Collection" value={`₹${Number(stats?.monthlyCollection || 0).toLocaleString()}`} icon={IndianRupee} color="bg-green-100 text-green-600" />
        <StatCard title="Active Programs" value={classes.length} icon={GraduationCap} color="bg-orange-100 text-orange-600" />
      </div>

      <Tabs defaultValue="students">
        <TabsList className="flex-wrap">
          <TabsTrigger value="students" data-testid="tab-students">Students</TabsTrigger>
          <TabsTrigger value="classes" data-testid="tab-classes">Classes</TabsTrigger>
          <TabsTrigger value="fees" data-testid="tab-fees">Fee Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4"><StudentsTab /></TabsContent>
        <TabsContent value="classes" className="mt-4"><ClassesTab /></TabsContent>
        <TabsContent value="fees" className="mt-4"><FeePaymentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
