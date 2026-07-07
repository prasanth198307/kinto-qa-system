import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, UserCheck } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const TABS = ["inquiries", "applications", "entrance_tests"] as const;
type Tab = typeof TABS[number];
const INQ_STATUS: Record<string, string> = { new: "bg-blue-100 text-blue-800", contacted: "bg-yellow-100 text-yellow-800", scheduled: "bg-purple-100 text-purple-800", converted: "bg-green-100 text-green-800", lost: "bg-red-100 text-red-800" };

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("inquiries");
  const [showForm, setShowForm] = useState(false);
  const [iqForm, setIqForm] = useState({ student_name: "", parent_name: "", phone: "", email: "", class_applying: "", academic_year: new Date().getFullYear().toString() });
  const [appForm, setAppForm] = useState({ student_name: "", parent_name: "", phone: "", class_applying: "", academic_year: new Date().getFullYear().toString(), dob: "" });
  const [testForm, setTestForm] = useState({ application_id: "", test_date: "", venue: "", marks_obtained: "", max_marks: "100" });

  const { data: inquiries = [] } = useQuery<any[]>({ queryKey: ["/api/education/inquiries"], queryFn: () => api("GET", "/api/education/inquiries") });
  const { data: applications = [] } = useQuery<any[]>({ queryKey: ["/api/education/applications"], queryFn: () => api("GET", "/api/education/applications") });
  const { data: tests = [] } = useQuery<any[]>({ queryKey: ["/api/education/entrance-tests"], queryFn: () => api("GET", "/api/education/entrance-tests") });

  const createInq = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/inquiries", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/inquiries"] }); setShowForm(false); } });
  const updateInqStatus = useMutation({ mutationFn: ({ id, status }: any) => api("PUT", `/api/education/inquiries/${id}/status`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/inquiries"] }) });
  const createApp = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/applications", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/applications"] }); setShowForm(false); } });
  const enroll = useMutation({ mutationFn: (id: number) => api("POST", `/api/education/applications/${id}/enroll`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/applications"] }) });
  const createTest = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/entrance-tests", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/entrance-tests"] }); setShowForm(false); } });

  const iqArr = Array.isArray(inquiries) ? inquiries : [];
  const appArr = Array.isArray(applications) ? applications : [];
  const testArr = Array.isArray(tests) ? tests : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admissions</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New {tab === "inquiries" ? "Inquiry" : tab === "applications" ? "Application" : "Test"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Inquiries</p><p className="text-2xl font-bold">{iqArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Applications</p><p className="text-2xl font-bold">{appArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Enrolled</p><p className="text-2xl font-bold text-green-600">{appArr.filter((a: any) => a.status === "enrolled").length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {TABS.map(t => <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t === "inquiries" ? "Inquiries" : t === "applications" ? "Applications" : "Entrance Tests"}</button>)}
      </div>

      {showForm && tab === "inquiries" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Inquiry</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Student Name</Label><Input value={iqForm.student_name} onChange={e => setIqForm(p => ({ ...p, student_name: e.target.value }))} /></div>
            <div><Label>Parent Name</Label><Input value={iqForm.parent_name} onChange={e => setIqForm(p => ({ ...p, parent_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={iqForm.phone} onChange={e => setIqForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={iqForm.email} onChange={e => setIqForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Class Applying For</Label><Input value={iqForm.class_applying} onChange={e => setIqForm(p => ({ ...p, class_applying: e.target.value }))} /></div>
            <div><Label>Academic Year</Label><Input value={iqForm.academic_year} onChange={e => setIqForm(p => ({ ...p, academic_year: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createInq.mutate(iqForm)}>Submit</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "applications" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Application</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Student Name</Label><Input value={appForm.student_name} onChange={e => setAppForm(p => ({ ...p, student_name: e.target.value }))} /></div>
            <div><Label>Parent Name</Label><Input value={appForm.parent_name} onChange={e => setAppForm(p => ({ ...p, parent_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={appForm.phone} onChange={e => setAppForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Class Applying</Label><Input value={appForm.class_applying} onChange={e => setAppForm(p => ({ ...p, class_applying: e.target.value }))} /></div>
            <div><Label>DOB</Label><Input type="date" value={appForm.dob} onChange={e => setAppForm(p => ({ ...p, dob: e.target.value }))} /></div>
            <div><Label>Academic Year</Label><Input value={appForm.academic_year} onChange={e => setAppForm(p => ({ ...p, academic_year: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createApp.mutate(appForm)}>Submit</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "entrance_tests" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Record Test Result</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div><Label>Application ID</Label><Input value={testForm.application_id} onChange={e => setTestForm(p => ({ ...p, application_id: e.target.value }))} /></div>
            <div><Label>Test Date</Label><Input type="date" value={testForm.test_date} onChange={e => setTestForm(p => ({ ...p, test_date: e.target.value }))} /></div>
            <div><Label>Venue</Label><Input value={testForm.venue} onChange={e => setTestForm(p => ({ ...p, venue: e.target.value }))} /></div>
            <div><Label>Marks (obtained / max)</Label><div className="flex gap-1"><Input value={testForm.marks_obtained} onChange={e => setTestForm(p => ({ ...p, marks_obtained: e.target.value }))} placeholder="45" /><Input value={testForm.max_marks} onChange={e => setTestForm(p => ({ ...p, max_marks: e.target.value }))} placeholder="100" /></div></div>
            <div className="col-span-2 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createTest.mutate({ ...testForm, application_id: parseInt(testForm.application_id), marks_obtained: parseFloat(testForm.marks_obtained), max_marks: parseFloat(testForm.max_marks) })}>Save</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "inquiries" && <div className="space-y-2">{iqArr.map((iq: any) => (
        <Card key={iq.id}><CardContent className="pt-4 flex items-center justify-between">
          <div><p className="font-semibold">{iq.student_name}</p><p className="text-sm text-gray-600">{iq.parent_name} · {iq.phone}</p><p className="text-xs text-gray-500">Class {iq.class_applying} · {iq.academic_year}</p></div>
          <div className="flex items-center gap-2">
            <Badge className={INQ_STATUS[iq.status] ?? "bg-gray-100"}>{iq.status}</Badge>
            {iq.status === "new" && <Button size="sm" variant="outline" onClick={() => updateInqStatus.mutate({ id: iq.id, status: "contacted" })}>Contacted</Button>}
            {iq.status === "contacted" && <Button size="sm" variant="outline" onClick={() => updateInqStatus.mutate({ id: iq.id, status: "converted" })}>Convert</Button>}
          </div>
        </CardContent></Card>
      ))}{iqArr.length === 0 && <p className="text-center text-gray-400 py-8">No inquiries yet.</p>}</div>}

      {tab === "applications" && <div className="space-y-2">{appArr.map((a: any) => (
        <Card key={a.id}><CardContent className="pt-4 flex items-center justify-between">
          <div><p className="font-semibold">{a.student_name}</p><p className="text-sm text-gray-600">{a.parent_name} · Class {a.class_applying}</p></div>
          <div className="flex items-center gap-2">
            <Badge className={a.status === "enrolled" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{a.status}</Badge>
            {a.status !== "enrolled" && <Button size="sm" onClick={() => enroll.mutate(a.id)}><UserCheck className="w-3 h-3 mr-1" />Enroll</Button>}
          </div>
        </CardContent></Card>
      ))}{appArr.length === 0 && <p className="text-center text-gray-400 py-8">No applications yet.</p>}</div>}

      {tab === "entrance_tests" && <div className="space-y-2">{testArr.map((t: any) => (
        <Card key={t.id}><CardContent className="pt-4 flex items-center justify-between">
          <div><p className="font-semibold">Application #{t.application_id}</p><p className="text-sm text-gray-500">{t.test_date?.slice(0,10)} · {t.venue}</p></div>
          <p className="font-bold text-xl">{t.marks_obtained}/{t.max_marks}</p>
        </CardContent></Card>
      ))}{testArr.length === 0 && <p className="text-center text-gray-400 py-8">No tests recorded.</p>}</div>}
    </div>
  );
}
