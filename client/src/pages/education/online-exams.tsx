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

export default function EducationOnlineExamsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", class_id: "", subject_id: "", duration_mins: "", start_time: "", end_time: "", instructions: "" });

  const { data: exams = [] } = useQuery({ queryKey: ["/api/education/lms/content"], queryFn: () => api("GET", "/api/education/lms/content?type=exam") });

  const createMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/lms/content", { ...d, content_type: "exam" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/lms/content"] }); setShowForm(false); toast({ title: "Online exam created" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Online Exams</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Create Exam</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Online Exam</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Class ID</label>
                <Input value={form.class_id} onChange={e => setForm(p => ({...p, class_id: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Subject ID</label>
                <Input value={form.subject_id} onChange={e => setForm(p => ({...p, subject_id: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (mins)</label>
                <Input type="number" value={form.duration_mins} onChange={e => setForm(p => ({...p, duration_mins: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({...p, start_time: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input type="datetime-local" value={form.end_time} onChange={e => setForm(p => ({...p, end_time: e.target.value}))} />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium">Instructions</label>
                <Input value={form.instructions} onChange={e => setForm(p => ({...p, instructions: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Online Exam List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
                <TableHead>Duration</TableHead><TableHead>Questions</TableHead>
                <TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{e.class}</TableCell>
                  <TableCell>{e.subject}</TableCell>
                  <TableCell>{e.duration_mins} mins</TableCell>
                  <TableCell>{e.questions_count}</TableCell>
                  <TableCell>{e.start_time}</TableCell>
                  <TableCell>{e.end_time}</TableCell>
                  <TableCell><Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
