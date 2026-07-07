import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, MessageCircle, BookOpen } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const TABS = ["structures", "assignments", "payments", "scholarships"] as const;
type Tab = typeof TABS[number];

export default function FeesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("structures");
  const [showForm, setShowForm] = useState(false);
  const [structForm, setStructForm] = useState({ class_id: "", fee_type: "tuition", amount: "", frequency: "monthly", academic_year: new Date().getFullYear().toString(), due_day: "10" });
  const [payForm, setPayForm] = useState({ student_id: "", fee_structure_id: "", amount: "", paid_date: new Date().toISOString().slice(0,10), payment_mode: "cash", notes: "" });
  const [schForm, setSchForm] = useState({ name: "", type: "merit", discount_pct: "", max_amount: "" });

  const { data: structures = [] } = useQuery<any[]>({ queryKey: ["/api/education/fee-structures"], queryFn: () => api("GET", "/api/education/fee-structures") });
  const { data: assignments = [] } = useQuery<any[]>({ queryKey: ["/api/education/student-fee-assignments"], queryFn: () => api("GET", "/api/education/student-fee-assignments") });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: scholarships = [] } = useQuery<any[]>({ queryKey: ["/api/education/scholarships"], queryFn: () => api("GET", "/api/education/scholarships") });
  const { data: defaulters = [] } = useQuery<any[]>({ queryKey: ["/api/education/reports/fee-defaulters"], queryFn: () => api("GET", "/api/education/reports/fee-defaulters"), enabled: tab === "payments" });

  const createStruct = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/fee-structures", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/fee-structures"] }); setShowForm(false); } });
  const delStruct = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/fee-structures/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/fee-structures"] }) });
  const recordPayment = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/fee-payments", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/reports/fee-defaulters"] }); setShowForm(false); } });
  const sendReminders = useMutation({ mutationFn: () => api("POST", "/api/education/fees/send-reminders", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/reports/fee-defaulters"] }) });
  const createSch = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/scholarships", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/scholarships"] }); setShowForm(false); } });

  const structArr = Array.isArray(structures) ? structures : [];
  const asgArr = Array.isArray(assignments) ? assignments : [];
  const stdArr = Array.isArray(students) ? students : [];
  const clsArr = Array.isArray(classes) ? classes : [];
  const schArr = Array.isArray(scholarships) ? scholarships : [];
  const defArr = Array.isArray(defaulters) ? defaulters : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fees Management</h1>
        {tab === "payments" ? <Button variant="outline" onClick={() => sendReminders.mutate()}><MessageCircle className="w-4 h-4 mr-1" />Send Fee Due Reminders</Button> : <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New</Button>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Fee Structures</p><p className="text-2xl font-bold">{structArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Fee Defaulters</p><p className="text-2xl font-bold text-red-600">{defArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Scholarships</p><p className="text-2xl font-bold">{schArr.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {TABS.map(t => <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {showForm && tab === "structures" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Fee Structure</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Class</Label><Select value={structForm.class_id} onValueChange={v => setStructForm(p => ({ ...p, class_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Fee Type</Label><Select value={structForm.fee_type} onValueChange={v => setStructForm(p => ({ ...p, fee_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["tuition","transport","hostel","library","exam","misc"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount (₹)</Label><Input type="number" value={structForm.amount} onChange={e => setStructForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Frequency</Label><Select value={structForm.frequency} onValueChange={v => setStructForm(p => ({ ...p, frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["monthly","quarterly","annual","one-time"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Academic Year</Label><Input value={structForm.academic_year} onChange={e => setStructForm(p => ({ ...p, academic_year: e.target.value }))} /></div>
            <div><Label>Due Day of Month</Label><Input type="number" value={structForm.due_day} onChange={e => setStructForm(p => ({ ...p, due_day: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createStruct.mutate({ ...structForm, class_id: parseInt(structForm.class_id), amount: parseFloat(structForm.amount), due_day: parseInt(structForm.due_day) })}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "payments" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Record Fee Payment</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Student</Label><Select value={payForm.student_id} onValueChange={v => setPayForm(p => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{stdArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.roll_number})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Fee Structure</Label><Select value={payForm.fee_structure_id} onValueChange={v => setPayForm(p => ({ ...p, fee_structure_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{structArr.map((f: any) => <SelectItem key={f.id} value={f.id.toString()}>{f.fee_type} — ₹{f.amount}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount (₹)</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Paid Date</Label><Input type="date" value={payForm.paid_date} onChange={e => setPayForm(p => ({ ...p, paid_date: e.target.value }))} /></div>
            <div><Label>Payment Mode</Label><Select value={payForm.payment_mode} onValueChange={v => setPayForm(p => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","neft","rtgs","cheque","upi","card"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Notes</Label><Input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="col-span-3 flex flex-col gap-2">
              <p className="text-xs text-gray-500">GL: DR Cash/Bank · CR Fee Income (auto-posted on save)</p>
              <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => recordPayment.mutate({ ...payForm, student_id: parseInt(payForm.student_id), fee_structure_id: parseInt(payForm.fee_structure_id), amount: parseFloat(payForm.amount) })}>Record & Post GL</Button></div>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "scholarships" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Scholarship</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Name</Label><Input value={schForm.name} onChange={e => setSchForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Type</Label><Select value={schForm.type} onValueChange={v => setSchForm(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["merit","need-based","sports","minority"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Discount %</Label><Input type="number" value={schForm.discount_pct} onChange={e => setSchForm(p => ({ ...p, discount_pct: e.target.value }))} /></div>
            <div><Label>Max Amount (₹)</Label><Input type="number" value={schForm.max_amount} onChange={e => setSchForm(p => ({ ...p, max_amount: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createSch.mutate({ ...schForm, discount_pct: parseFloat(schForm.discount_pct), max_amount: parseFloat(schForm.max_amount) })}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "structures" && <div className="space-y-2">{structArr.map((f: any) => <Card key={f.id}><CardContent className="pt-4 flex justify-between items-center"><div><p className="font-semibold">{f.fee_type} — {f.class_name ?? `Class #${f.class_id}`}</p><p className="text-sm text-gray-500">₹{f.amount} · {f.frequency} · Due: {f.due_day}th</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delStruct.mutate(f.id)}>Del</Button></CardContent></Card>)}{structArr.length === 0 && <p className="text-center text-gray-400 py-8">No fee structures yet.</p>}</div>}

      {tab === "assignments" && <div className="space-y-2">{asgArr.map((a: any) => <Card key={a.id}><CardContent className="pt-4 flex justify-between items-center"><div><p className="font-semibold">{a.student_name ?? `Student #${a.student_id}`}</p><p className="text-sm text-gray-500">{a.fee_type} · ₹{a.amount}</p></div><Badge className={a.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{a.status}</Badge></CardContent></Card>)}{asgArr.length === 0 && <p className="text-center text-gray-400 py-8">No fee assignments yet.</p>}</div>}

      {tab === "payments" && <div className="space-y-2"><h3 className="font-medium text-gray-700 flex items-center gap-2"><BookOpen className="w-4 h-4" />Fee Defaulters</h3>{defArr.map((d: any, i: number) => <Card key={i}><CardContent className="pt-4 flex justify-between items-center"><div><p className="font-semibold">{d.student_name}</p><p className="text-sm text-gray-500">{d.class_name} · Due: ₹{d.due_amount}</p></div><Badge className="bg-red-100 text-red-800">Overdue</Badge></CardContent></Card>)}{defArr.length === 0 && <p className="text-center text-gray-400 py-8">No fee defaulters. All caught up!</p>}</div>}

      {tab === "scholarships" && <div className="space-y-2">{schArr.map((s: any) => <Card key={s.id}><CardContent className="pt-4"><p className="font-semibold">{s.name}</p><p className="text-sm text-gray-500">{s.type} · {s.discount_pct}% discount · Max ₹{s.max_amount}</p></CardContent></Card>)}{schArr.length === 0 && <p className="text-center text-gray-400 py-8">No scholarships defined.</p>}</div>}
    </div>
  );
}
