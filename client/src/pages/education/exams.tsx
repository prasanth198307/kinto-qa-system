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
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function ExamsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [form, setForm] = useState({ name: "", class_id: "", subject_id: "", exam_date: "", max_marks: "100", exam_type: "unit_test" });

  const { data: exams = [] } = useQuery<any[]>({ queryKey: ["/api/education/examinations"], queryFn: () => api("GET", "/api/education/examinations") });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"], queryFn: () => api("GET", "/api/education/subjects") });
  const { data: examMarks = [] } = useQuery<any[]>({ queryKey: ["/api/education/exam-marks", selectedExam], queryFn: () => api("GET", `/api/education/exam-marks/${selectedExam}`), enabled: !!selectedExam });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });

  const createExam = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/examinations", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/examinations"] }); setShowForm(false); } });
  const delExam = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/examinations/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/examinations"] }) });
  const saveMarks = useMutation({ mutationFn: (records: any[]) => api("POST", "/api/education/exam-marks/bulk", { examination_id: selectedExam, records }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/exam-marks", selectedExam] }) });

  const examArr = Array.isArray(exams) ? exams : [];
  const clsArr = Array.isArray(classes) ? classes : [];
  const subArr = Array.isArray(subjects) ? subjects : [];
  const stdArr = Array.isArray(students) ? students : [];
  const marksArr = Array.isArray(examMarks) ? examMarks : [];
  const marksMap = marksArr.reduce((m: any, r: any) => { m[r.student_id] = r.marks_obtained; return m; }, {});

  const selectedExamObj = examArr.find((e: any) => e.id === selectedExam);
  const classStudents = selectedExamObj ? stdArr.filter((s: any) => s.class_id === selectedExamObj.class_id) : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Examinations</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Exam</Button>
      </div>

      {showForm && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Examination</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Exam Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mid-term 2026" /></div>
            <div><Label>Class</Label><Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subject</Label><Select value={form.subject_id} onValueChange={v => setForm(p => ({ ...p, subject_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Exam Date</Label><Input type="date" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))} /></div>
            <div><Label>Max Marks</Label><Input type="number" value={form.max_marks} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))} /></div>
            <div><Label>Type</Label><Select value={form.exam_type} onValueChange={v => setForm(p => ({ ...p, exam_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["unit_test","mid_term","final","annual"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createExam.mutate({ ...form, class_id: parseInt(form.class_id), subject_id: parseInt(form.subject_id), max_marks: parseFloat(form.max_marks) })}>Create</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {examArr.map((e: any) => (
          <Card key={e.id} className={selectedExam === e.id ? "ring-2 ring-blue-500" : ""}>
            <CardContent className="pt-4 flex justify-between items-center cursor-pointer" onClick={() => setSelectedExam(e.id)}>
              <div><p className="font-semibold">{e.name}</p><p className="text-sm text-gray-500">{e.class_name ?? `Class #${e.class_id}`} · {e.subject_name ?? `Sub #${e.subject_id}`}</p><p className="text-xs text-gray-400">{e.exam_date?.slice(0,10)} · Max: {e.max_marks}</p></div>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={(ev) => { ev.stopPropagation(); delExam.mutate(e.id); }}>Del</Button>
            </CardContent>
          </Card>
        ))}
        {examArr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-4 text-center">No examinations yet.</p>}
      </div>

      {selectedExam && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Enter Marks — {selectedExamObj?.name}</CardTitle>
            <Button size="sm" onClick={() => saveMarks.mutate(classStudents.map((s: any) => ({ student_id: s.id, marks_obtained: parseFloat(marks[s.id] ?? marksMap[s.id] ?? "0") })))}>Save Marks</Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {classStudents.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border rounded p-2">
                <div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.roll_number}</p></div>
                <Input type="number" className="w-24" value={marks[s.id] ?? marksMap[s.id] ?? ""} onChange={e => setMarks(p => ({ ...p, [s.id]: e.target.value }))} placeholder={`/${selectedExamObj?.max_marks}`} />
              </div>
            ))}
            {classStudents.length === 0 && <p className="text-center text-gray-400 py-4">No students in this class.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
