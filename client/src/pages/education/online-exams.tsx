import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, HelpCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

export default function OnlineExamsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showQForm, setShowQForm] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", class_id: "", subject_id: "", duration_minutes: "30", total_marks: "50", start_time: "" });
  const [qForm, setQForm] = useState({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "A", marks: "1" });

  const { data: onlineExams = [] } = useQuery<any[]>({ queryKey: ["/api/education/online-exams"], queryFn: () => api("GET", "/api/education/online-exams") });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"], queryFn: () => api("GET", "/api/education/subjects") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/online-exams", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/online-exams"] }); setShowForm(false); } });
  const addQuestion = useMutation({ mutationFn: ({ id, b }: any) => api("POST", `/api/education/online-exams/${id}/questions`, b), onSuccess: () => { setShowQForm(null); setQForm({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "A", marks: "1" }); } });

  const arr = Array.isArray(onlineExams) ? onlineExams : [];
  const clsArr = Array.isArray(classes) ? classes : [];
  const subArr = Array.isArray(subjects) ? subjects : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Online Exams</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Online Exam</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Exams</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Scheduled</p><p className="text-2xl font-bold text-blue-600">{arr.filter((e: any) => e.status === "scheduled").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{arr.filter((e: any) => e.status === "completed").length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Online Exam</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Class</Label><Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subject</Label><Select value={form.subject_id} onValueChange={v => setForm(p => ({ ...p, subject_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} /></div>
            <div><Label>Total Marks</Label><Input type="number" value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))} /></div>
            <div><Label>Start Time</Label><Input type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => create.mutate({ ...form, class_id: parseInt(form.class_id), subject_id: parseInt(form.subject_id), duration_minutes: parseInt(form.duration_minutes), total_marks: parseFloat(form.total_marks) })}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {arr.map((e: any) => (
          <Card key={e.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div><p className="font-semibold">{e.title}</p><p className="text-sm text-gray-500">{e.class_name ?? `Class #${e.class_id}`} · {e.subject_name ?? `Sub #${e.subject_id}`} · {e.duration_minutes} min · {e.total_marks} marks</p><p className="text-xs text-gray-400">Starts: {e.start_time ? new Date(e.start_time).toLocaleString() : "—"}</p></div>
                <div className="flex items-center gap-2">
                  <Badge className={e.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>{e.status ?? "scheduled"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setShowQForm(showQForm === e.id ? null : e.id)}><HelpCircle className="w-3 h-3 mr-1" />Add Question</Button>
                </div>
              </div>
              {showQForm === e.id && (
                <div className="mt-3 border-t pt-3 grid grid-cols-2 gap-2">
                  <div className="col-span-2"><Label className="text-xs">Question</Label><Input value={qForm.question_text} onChange={ev => setQForm(p => ({ ...p, question_text: ev.target.value }))} /></div>
                  <div><Label className="text-xs">Option A</Label><Input value={qForm.option_a} onChange={ev => setQForm(p => ({ ...p, option_a: ev.target.value }))} /></div>
                  <div><Label className="text-xs">Option B</Label><Input value={qForm.option_b} onChange={ev => setQForm(p => ({ ...p, option_b: ev.target.value }))} /></div>
                  <div><Label className="text-xs">Option C</Label><Input value={qForm.option_c} onChange={ev => setQForm(p => ({ ...p, option_c: ev.target.value }))} /></div>
                  <div><Label className="text-xs">Option D</Label><Input value={qForm.option_d} onChange={ev => setQForm(p => ({ ...p, option_d: ev.target.value }))} /></div>
                  <div><Label className="text-xs">Correct Option</Label><Select value={qForm.correct_option} onValueChange={v => setQForm(p => ({ ...p, correct_option: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["A","B","C","D"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Marks</Label><Input type="number" value={qForm.marks} onChange={ev => setQForm(p => ({ ...p, marks: ev.target.value }))} /></div>
                  <div className="col-span-2 flex justify-end"><Button size="sm" onClick={() => addQuestion.mutate({ id: e.id, b: { ...qForm, marks: parseFloat(qForm.marks) } })}>Add Question</Button></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No online exams yet.</p>}
      </div>
    </div>
  );
}
