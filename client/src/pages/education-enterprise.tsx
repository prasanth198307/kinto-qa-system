import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const apiRequest = async (method: string, url: string, body?: any) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STAGES = ["New", "Contacted", "Test Scheduled", "Selected", "Enrolled"];

function AdmissionsTab() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: inquiries = [] } = useQuery({ queryKey: ["/api/education/inquiries"], queryFn: () => apiRequest("GET", "/api/education/inquiries") });
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ student_name: "", phone: "", father_name: "", applying_for_class: "", source: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/inquiries", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/inquiries"] }); setShowAdd(false); } });
  const move = useMutation({ mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/education/inquiries/${id}/status`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/inquiries"] }) });
  return (
    <div className="space-y-3">
      <div className="flex justify-between"><h2 className="font-semibold">Admissions Pipeline</h2><Button onClick={() => setShowAdd(true)}>+ New Inquiry</Button></div>
      <div className="grid grid-cols-5 gap-2 overflow-x-auto">
        {STAGES.map(stage => {
          const cards = inquiries.filter((i: any) => (i.stage || i.status || "New") === stage);
          return (
            <div key={stage} className="bg-gray-50 rounded p-2 min-h-40">
              <div className="text-xs font-semibold text-gray-600 mb-2">{stage} ({cards.length})</div>
              {cards.map((c: any) => (
                <div key={c.id} className="bg-white border rounded p-2 mb-2 text-xs">
                  <div className="font-medium">{c.student_name}</div>
                  <div className="text-gray-500">{c.phone}</div>
                  <div>Class: {c.applying_for_class}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {STAGES.filter(s => s !== stage).slice(0, 2).map(s => <button key={s} className="text-blue-600 underline text-xs" onClick={() => move.mutate({ id: c.id, status: s })}>→{s}</button>)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Inquiry</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Student Name" value={f.student_name} onChange={e => setF({ ...f, student_name: e.target.value })} />
            <Input placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
            <Input placeholder="Father Name" value={f.father_name} onChange={e => setF({ ...f, father_name: e.target.value })} />
            <Input placeholder="Applying for Class" value={f.applying_for_class} onChange={e => setF({ ...f, applying_for_class: e.target.value })} />
            <Input placeholder="Source" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} />
            <Button onClick={() => add.mutate(f)}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentsTab() {
  const [cls, setCls] = useState(""); const [sec, setSec] = useState("");
  const { data: students = [] } = useQuery({ queryKey: ["/api/education/students", cls, sec], queryFn: () => apiRequest("GET", `/api/education/students?class=${cls}&section=${sec}`) });
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Input placeholder="Class" value={cls} onChange={e => setCls(e.target.value)} className="w-24" /><Input placeholder="Section" value={sec} onChange={e => setSec(e.target.value)} className="w-24" /></div>
      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Class</TableHead><TableHead>Section</TableHead><TableHead>Roll No</TableHead><TableHead>Phone</TableHead><TableHead>Attendance%</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{students.map((s: any) => <TableRow key={s.id}><TableCell>{s.student_name}</TableCell><TableCell>{s.class_name}</TableCell><TableCell>{s.section}</TableCell><TableCell>{s.roll_no}</TableCell><TableCell>{s.phone}</TableCell><TableCell>{s.attendance_pct}%</TableCell><TableCell className="flex gap-1"><Button size="sm" variant="outline" className="text-xs h-6">TC</Button><Button size="sm" variant="outline" className="text-xs h-6">Bonafide</Button></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function AcademicsTab() {
  const qc = useQueryClient();
  const { data: assignments = [] } = useQuery({ queryKey: ["/api/education/assignments"], queryFn: () => apiRequest("GET", "/api/education/assignments") });
  const { data: exams = [] } = useQuery({ queryKey: ["/api/education/online-exams"], queryFn: () => apiRequest("GET", "/api/education/online-exams") });
  const { data: circulars = [] } = useQuery({ queryKey: ["/api/education/circulars"], queryFn: () => apiRequest("GET", "/api/education/circulars") });
  const { data: events = [] } = useQuery({ queryKey: ["/api/education/events"], queryFn: () => apiRequest("GET", "/api/education/events") });
  const [af, setAf] = useState({ title: "", class_id: "", subject_id: "", due_date: "", max_marks: "" });
  const [ef, setEf] = useState({ exam_name: "", class_id: "", duration_minutes: "", total_marks: "", start_datetime: "" });
  const [cf, setCf] = useState({ title: "", content: "", circular_type: "", target_classes: "" });
  const [evf, setEvf] = useState({ event_name: "", event_date: "", venue: "", description: "" });
  const addAssign = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/assignments", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/assignments"] }) });
  const addExam = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/online-exams", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/online-exams"] }) });
  const addCircular = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/circulars", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/circulars"] }) });
  const addEvent = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/events", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/events"] }) });
  return (
    <Tabs defaultValue="assignments">
      <TabsList><TabsTrigger value="assignments">Assignments</TabsTrigger><TabsTrigger value="exams">Exams</TabsTrigger><TabsTrigger value="circulars">Circulars</TabsTrigger><TabsTrigger value="events">Events</TabsTrigger></TabsList>
      <TabsContent value="assignments" className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Title" value={af.title} onChange={e => setAf({ ...af, title: e.target.value })} /><Input placeholder="Class" value={af.class_id} onChange={e => setAf({ ...af, class_id: e.target.value })} /><Input type="date" value={af.due_date} onChange={e => setAf({ ...af, due_date: e.target.value })} /><Input placeholder="Max Marks" value={af.max_marks} onChange={e => setAf({ ...af, max_marks: e.target.value })} /><Button onClick={() => addAssign.mutate(af)}>Add</Button></div>
        <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Due Date</TableHead><TableHead>Marks</TableHead></TableRow></TableHeader><TableBody>{assignments.map((a: any) => <TableRow key={a.id}><TableCell>{a.title}</TableCell><TableCell>{a.due_date}</TableCell><TableCell>{a.max_marks}</TableCell></TableRow>)}</TableBody></Table>
      </TabsContent>
      <TabsContent value="exams" className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Exam Name" value={ef.exam_name} onChange={e => setEf({ ...ef, exam_name: e.target.value })} /><Input placeholder="Duration" value={ef.duration_minutes} onChange={e => setEf({ ...ef, duration_minutes: e.target.value })} /><Input type="datetime-local" value={ef.start_datetime} onChange={e => setEf({ ...ef, start_datetime: e.target.value })} /><Button onClick={() => addExam.mutate(ef)}>Add</Button></div>
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Duration</TableHead><TableHead>Start</TableHead></TableRow></TableHeader><TableBody>{exams.map((e: any) => <TableRow key={e.id}><TableCell>{e.exam_name}</TableCell><TableCell>{e.duration_minutes}min</TableCell><TableCell>{e.start_datetime}</TableCell></TableRow>)}</TableBody></Table>
      </TabsContent>
      <TabsContent value="circulars" className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Title" value={cf.title} onChange={e => setCf({ ...cf, title: e.target.value })} /><Input placeholder="Type" value={cf.circular_type} onChange={e => setCf({ ...cf, circular_type: e.target.value })} /><Button onClick={() => addCircular.mutate(cf)}>Add</Button></div>
        <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead></TableRow></TableHeader><TableBody>{circulars.map((c: any) => <TableRow key={c.id}><TableCell>{c.title}</TableCell><TableCell>{c.circular_type}</TableCell></TableRow>)}</TableBody></Table>
      </TabsContent>
      <TabsContent value="events" className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Event Name" value={evf.event_name} onChange={e => setEvf({ ...evf, event_name: e.target.value })} /><Input type="date" value={evf.event_date} onChange={e => setEvf({ ...evf, event_date: e.target.value })} /><Input placeholder="Venue" value={evf.venue} onChange={e => setEvf({ ...evf, venue: e.target.value })} /><Button onClick={() => addEvent.mutate(evf)}>Add</Button></div>
        <Table><TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Venue</TableHead></TableRow></TableHeader><TableBody>{events.map((e: any) => <TableRow key={e.id}><TableCell>{e.event_name}</TableCell><TableCell>{e.event_date}</TableCell><TableCell>{e.venue}</TableCell></TableRow>)}</TableBody></Table>
      </TabsContent>
    </Tabs>
  );
}

function FeesTab() {
  const { data: fees = [] } = useQuery({ queryKey: ["/api/education/fees"], queryFn: () => apiRequest("GET", "/api/education/fees") });
  const { data: summary = {} } = useQuery({ queryKey: ["/api/education/fees/summary"], queryFn: () => apiRequest("GET", "/api/education/fees/summary") });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Today's Collection", summary.today_collection],["Monthly Total", summary.monthly_total],["Pending Dues", summary.pending_dues]].map(([l,v]) => <Card key={l as string}><CardContent className="pt-4"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold">{sym}{fmt(v)}</div></CardContent></Card>)}
      </div>
      <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Fee Type</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{fees.map((f: any) => <TableRow key={f.id}><TableCell>{f.student_name}</TableCell><TableCell>{f.class_name}</TableCell><TableCell>{f.fee_type}</TableCell><TableCell>{sym}{fmt(f.amount)}</TableCell><TableCell>{f.paid_date}</TableCell><TableCell><Badge variant={f.status === "paid" ? "default" : "destructive"}>{f.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function HostelTab() {
  const { data: rooms = [] } = useQuery({ queryKey: ["/api/education/hostel/rooms"], queryFn: () => apiRequest("GET", "/api/education/hostel/rooms") });
  const { data: allotments = [] } = useQuery({ queryKey: ["/api/education/hostel/allotments"], queryFn: () => apiRequest("GET", "/api/education/hostel/allotments") });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        {rooms.map((r: any) => <Card key={r.id} className={r.occupied >= r.capacity ? "border-red-300" : "border-green-300"}><CardContent className="pt-3 text-xs text-center"><div className="font-bold">Room {r.room_number}</div><div>{r.occupied}/{r.capacity}</div><div className="text-gray-500">{sym}{fmt(r.monthly_charge)}/mo</div></CardContent></Card>)}
      </div>
      <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Room</TableHead><TableHead>Monthly</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{allotments.map((a: any) => <TableRow key={a.id}><TableCell>{a.student_name}</TableCell><TableCell>{a.room_number}</TableCell><TableCell>{sym}{fmt(a.monthly_charge)}</TableCell><TableCell><Badge>{a.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function AlumniTab() {
  const qc = useQueryClient();
  const { data: alumni = [] } = useQuery({ queryKey: ["/api/education/alumni"], queryFn: () => apiRequest("GET", "/api/education/alumni") });
  const [f, setF] = useState({ name: "", batch_year: "", last_class: "", current_occupation: "", company: "", phone: "", email: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/education/alumni", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/alumni"] }) });
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Add Alumni</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <Input placeholder="Batch Year" value={f.batch_year} onChange={e => setF({ ...f, batch_year: e.target.value })} />
          <Input placeholder="Last Class" value={f.last_class} onChange={e => setF({ ...f, last_class: e.target.value })} />
          <Input placeholder="Occupation" value={f.current_occupation} onChange={e => setF({ ...f, current_occupation: e.target.value })} />
          <Input placeholder="Company" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
          <Input placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
          <Input placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          <Button onClick={() => add.mutate(f)}>Add Alumni</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Batch</TableHead><TableHead>Occupation</TableHead><TableHead>Company</TableHead></TableRow></TableHeader>
        <TableBody>{alumni.map((a: any) => <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell>{a.batch_year}</TableCell><TableCell>{a.current_occupation}</TableCell><TableCell>{a.company}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function EduReportsTab() {
  const [type, setType] = useState("admission-funnel"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [data, setData] = useState<any[]>([]);
  const fetch = async () => { try { const r = await apiRequest("GET", `/api/education/reports/${type}?from=${from}&to=${to}`); setData(Array.isArray(r) ? r : r.data || []); } catch { setData([]); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{["admission-funnel","attendance-summary","fee-collection","fee-defaulters","exam-results"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        <Button onClick={fetch}>Fetch</Button>
      </div>
      {type === "admission-funnel" && data.length > 0 && (
        <div className="space-y-2">{data.map((row: any) => <div key={row.stage} className="flex items-center gap-2"><span className="w-32 text-sm">{row.stage}</span><div className="bg-blue-500 h-6 rounded" style={{ width: `${Math.min((row.count / (data[0]?.count || 1)) * 300, 300)}px` }} /><span className="text-sm">{row.count}</span></div>)}</div>
      )}
      {type !== "admission-funnel" && data.length > 0 && <Table><TableHeader><TableRow>{Object.keys(data[0]).map(k => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader><TableBody>{data.map((row, i) => <TableRow key={i}>{Object.values(row).map((v: any, j) => <TableCell key={j}>{String(v)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </div>
  );
}

export default function EducationEnterprisePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Education Enterprise</h1>
      <Tabs defaultValue="admissions">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          {[["admissions","Admissions"],["students","Students"],["academics","Academics"],["fees","Fees"],["hostel","Hostel"],["alumni","Alumni"],["reports","Reports"]].map(([v,l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="admissions"><AdmissionsTab /></TabsContent>
        <TabsContent value="students"><StudentsTab /></TabsContent>
        <TabsContent value="academics"><AcademicsTab /></TabsContent>
        <TabsContent value="fees"><FeesTab /></TabsContent>
        <TabsContent value="hostel"><HostelTab /></TabsContent>
        <TabsContent value="alumni"><AlumniTab /></TabsContent>
        <TabsContent value="reports"><EduReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
