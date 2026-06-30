import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const EXAM_EMPTY = { name: "", class: "", date_from: "", date_to: "", exam_type: "unit_test" };
const RESULT_EMPTY = { exam_id: "", student_id: "", subject: "", max_marks: "", obtained: "", grade: "", remarks: "" };

export default function ExamsPage() {
  const qc = useQueryClient();
  const [examOpen, setExamOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [examForm, setExamForm] = useState<any>(EXAM_EMPTY);
  const [resultForm, setResultForm] = useState<any>(RESULT_EMPTY);

  const { data: exams = [] } = useQuery({ queryKey: ["edu-exams"], queryFn: () => api("GET", "/api/education/exams") });
  const { data: results = [] } = useQuery({ queryKey: ["edu-results"], queryFn: () => api("GET", "/api/education/exam-results") });

  const addExam = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/exams", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-exams"] }); setExamOpen(false); setExamForm(EXAM_EMPTY); },
  });

  const addResult = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/exam-results", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-results"] }); setResultOpen(false); setResultForm(RESULT_EMPTY); },
  });

  const examList = Array.isArray(exams) ? exams : [];
  const resultList = Array.isArray(results) ? results : [];

  const setE = (k: string, v: string) => setExamForm((f: any) => ({ ...f, [k]: v }));
  const setR = (k: string, v: string) => setResultForm((f: any) => ({ ...f, [k]: v }));

  const gradeColor: Record<string, any> = { A: "default", B: "secondary", C: "outline", D: "outline", F: "destructive" };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Exam Management</h1>

      <Tabs defaultValue="exams">
        <TabsList><TabsTrigger value="exams">Exams</TabsTrigger><TabsTrigger value="results">Results</TabsTrigger></TabsList>

        <TabsContent value="exams" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setExamForm(EXAM_EMPTY); setExamOpen(true); }}><Plus className="w-4 h-4 mr-2" />Create Exam</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Exam Name</TableHead><TableHead>Class</TableHead><TableHead>Type</TableHead>
                  <TableHead>From</TableHead><TableHead>To</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {examList.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.class}</TableCell>
                      <TableCell><Badge variant="secondary">{e.exam_type?.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{e.date_from}</TableCell>
                      <TableCell>{e.date_to}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setResultForm(RESULT_EMPTY); setResultOpen(true); }}><Plus className="w-4 h-4 mr-2" />Enter Results</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Max</TableHead>
                  <TableHead>Obtained</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {resultList.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.student_name || r.student_id}</TableCell>
                      <TableCell>{r.subject}</TableCell>
                      <TableCell>{r.max_marks}</TableCell>
                      <TableCell>{r.obtained}</TableCell>
                      <TableCell><Badge variant={gradeColor[r.grade] || "secondary"}>{r.grade}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Exam Name" value={examForm.name} onChange={(e) => setE("name", e.target.value)} />
            <Input placeholder="Class" value={examForm.class} onChange={(e) => setE("class", e.target.value)} />
            <Select value={examForm.exam_type} onValueChange={(v) => setE("exam_type", v)}>
              <SelectTrigger><SelectValue placeholder="Exam Type" /></SelectTrigger>
              <SelectContent><SelectItem value="unit_test">Unit Test</SelectItem><SelectItem value="mid_term">Mid Term</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Date From" type="date" value={examForm.date_from} onChange={(e) => setE("date_from", e.target.value)} />
            <Input placeholder="Date To" type="date" value={examForm.date_to} onChange={(e) => setE("date_to", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamOpen(false)}>Cancel</Button>
            <Button onClick={() => addExam.mutate(examForm)} disabled={addExam.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enter Results</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={resultForm.exam_id} onValueChange={(v) => setR("exam_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>{examList.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Student ID" value={resultForm.student_id} onChange={(e) => setR("student_id", e.target.value)} />
            <Input placeholder="Subject" value={resultForm.subject} onChange={(e) => setR("subject", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Max Marks" type="number" value={resultForm.max_marks} onChange={(e) => setR("max_marks", e.target.value)} />
              <Input placeholder="Obtained" type="number" value={resultForm.obtained} onChange={(e) => setR("obtained", e.target.value)} />
            </div>
            <Input placeholder="Grade (A/B/C...)" value={resultForm.grade} onChange={(e) => setR("grade", e.target.value)} />
            <Input placeholder="Remarks" value={resultForm.remarks} onChange={(e) => setR("remarks", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultOpen(false)}>Cancel</Button>
            <Button onClick={() => addResult.mutate(resultForm)} disabled={addResult.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
