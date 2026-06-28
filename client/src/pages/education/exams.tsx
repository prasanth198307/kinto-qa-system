import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function EducationExamsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"schedule"|"results">("schedule");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exam_name: "", class_id: "", subject_id: "", exam_date: "", max_marks: "", passing_marks: "" });

  const { data: exams = [] } = useQuery({ queryKey: ["/api/education/exams"], queryFn: () => api("GET", "/api/education/exams") });
  const { data: results = [] } = useQuery({ queryKey: ["/api/education/results"], queryFn: () => api("GET", "/api/education/results") });

  const addExam = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/exams", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/exams"] }); setShowForm(false); toast({ title: "Exam scheduled" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Examinations</h1>
        <div className="flex gap-2">
          <Button variant={tab === "schedule" ? "default" : "outline"} onClick={() => setTab("schedule")}>Exam Schedule</Button>
          <Button variant={tab === "results" ? "default" : "outline"} onClick={() => setTab("results")}>Results</Button>
          {tab === "schedule" && <Button onClick={() => setShowForm(!showForm)}>+ Add Exam</Button>}
        </div>
      </div>

      {tab === "schedule" && showForm && (
        <Card>
          <CardHeader><CardTitle>Schedule Exam</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["exam_name","class_id","subject_id","exam_date","max_marks","passing_marks"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input
                    type={k.includes("date") ? "date" : k.includes("marks") ? "number" : "text"}
                    value={(form as any)[k]}
                    onChange={e => setForm(p => ({...p, [k]: e.target.value}))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addExam.mutate(form)} disabled={addExam.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "schedule" && (
        <Card>
          <CardHeader><CardTitle>Exam Schedule</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead><TableHead>Max Marks</TableHead><TableHead>Pass Marks</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.exam_name}</TableCell>
                    <TableCell>{e.class}</TableCell>
                    <TableCell>{e.subject}</TableCell>
                    <TableCell>{e.date}</TableCell>
                    <TableCell>{e.max_marks}</TableCell>
                    <TableCell>{e.passing_marks}</TableCell>
                    <TableCell><Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "results" && (
        <Card>
          <CardHeader><CardTitle>Exam Results</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>Marks</TableHead><TableHead>Max Marks</TableHead>
                  <TableHead>%</TableHead><TableHead>Grade</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.student}</TableCell>
                    <TableCell>{r.marks_obtained}</TableCell>
                    <TableCell>{r.max_marks}</TableCell>
                    <TableCell>{r.percentage}%</TableCell>
                    <TableCell>{r.grade}</TableCell>
                    <TableCell><Badge variant={r.status === "pass" ? "default" : "destructive"}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
