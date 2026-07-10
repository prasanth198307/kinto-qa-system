import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

export default function HomeworkPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [gradeForm, setGradeForm] = useState<Record<number, string>>({});
  const [form, setForm] = useState({ title: "", description: "", class_id: "", subject_id: "", due_date: "" });

  const { data: assignments = [] } = useQuery<any[]>({ queryKey: ["/api/education/assignments"], queryFn: () => api("GET", "/api/education/assignments") });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"], queryFn: () => api("GET", "/api/education/subjects") });
  const { data: submissions = [] } = useQuery<any[]>({ queryKey: ["/api/education/assignments/submissions", selectedAssignment], queryFn: () => api("GET", `/api/education/assignments/${selectedAssignment}`), enabled: !!selectedAssignment });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/assignments", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/assignments"] }); setShowForm(false); } });
  const grade = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/education/assignments/${id}/grade`, b), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/assignments/submissions", selectedAssignment] }) });

  const arr = Array.isArray(assignments) ? assignments : [];
  const clsArr = Array.isArray(classes) ? classes : [];
  const subArr = Array.isArray(subjects) ? subjects : [];
  const subsArr = Array.isArray(submissions) ? submissions : (submissions as any)?.submissions ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homework & Assignments</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Assignment</Button>
      </div>

      {showForm && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Assignment</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Class</Label><Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subject</Label><Select value={form.subject_id} onValueChange={v => setForm(p => ({ ...p, subject_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => create.mutate({ ...form, class_id: parseInt(form.class_id), subject_id: parseInt(form.subject_id) })}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {arr.map((a: any) => (
          <Card key={a.id} className={selectedAssignment === a.id ? "ring-2 ring-blue-500" : ""}>
            <CardContent className="pt-4 cursor-pointer" onClick={() => setSelectedAssignment(a.id)}>
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-gray-500">{a.class_name ?? `Class #${a.class_id}`} · {a.subject_name ?? `Sub #${a.subject_id}`}</p>
              <p className="text-xs text-gray-400">Due: {a.due_date?.slice(0,10)}</p>
            </CardContent>
          </Card>
        ))}
        {arr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-4 text-center">No assignments yet.</p>}
      </div>

      {selectedAssignment && (
        <Card>
          <CardHeader><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {subsArr.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border rounded p-2">
                <div><p className="font-medium text-sm">{s.student_name ?? `Student #${s.student_id}`}</p><p className="text-xs text-gray-500">Submitted: {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "Not submitted"}</p></div>
                <div className="flex items-center gap-2">
                  {s.grade ? <Badge className="bg-green-100 text-green-800">Grade: {s.grade}</Badge> : (
                    <>
                      <Input className="w-20" placeholder="Grade" value={gradeForm[s.id] || ""} onChange={e => setGradeForm(p => ({ ...p, [s.id]: e.target.value }))} />
                      <Button size="sm" onClick={() => grade.mutate({ id: s.id, b: { grade: gradeForm[s.id] } })}>Save</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {subsArr.length === 0 && <p className="text-center text-gray-400 py-4">No submissions yet.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
