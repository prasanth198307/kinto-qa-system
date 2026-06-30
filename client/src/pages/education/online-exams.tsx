import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Square } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const EMPTY = { name: "", class: "", subject: "", duration_mins: "", total_questions: "", scheduled_at: "", questions: "" };

export default function OnlineExamsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);

  const { data: exams = [] } = useQuery({ queryKey: ["edu-online-exams"], queryFn: () => api("GET", "/api/education/online-exams") });

  const createExam = useMutation({
    mutationFn: (d: any) => {
      let questions = d.questions;
      try { questions = JSON.parse(d.questions); } catch {}
      return api("POST", "/api/education/online-exams", { ...d, questions });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-online-exams"] }); setOpen(false); setForm(EMPTY); },
  });

  const toggleExam = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/education/online-exams/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edu-online-exams"] }),
  });

  const list = Array.isArray(exams) ? exams : [];
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const statusColor: Record<string, any> = { draft: "secondary", active: "default", ended: "outline" };
  const statusLabel: Record<string, string> = { draft: "Draft", active: "Active", ended: "Ended" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Online Exams</h1>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Create Exam</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{list.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{list.filter((e: any) => e.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Ended</p><p className="text-2xl font-bold">{list.filter((e: any) => e.status === "ended").length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Exam Name</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
              <TableHead>Duration</TableHead><TableHead>Questions</TableHead><TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.class}</TableCell>
                  <TableCell>{e.subject}</TableCell>
                  <TableCell>{e.duration_mins} min</TableCell>
                  <TableCell>{e.total_questions}</TableCell>
                  <TableCell>{e.scheduled_at ? new Date(e.scheduled_at).toLocaleString() : "—"}</TableCell>
                  <TableCell><Badge variant={statusColor[e.status] || "secondary"}>{statusLabel[e.status] || e.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    {e.status !== "active" && e.status !== "ended" && (
                      <Button size="sm" variant="default" onClick={() => toggleExam.mutate({ id: e.id, status: "active" })}><Play className="w-3 h-3 mr-1" />Start</Button>
                    )}
                    {e.status === "active" && (
                      <Button size="sm" variant="destructive" onClick={() => toggleExam.mutate({ id: e.id, status: "ended" })}><Square className="w-3 h-3 mr-1" />End</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Online Exam</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Exam Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Class" value={form.class} onChange={(e) => set("class", e.target.value)} />
              <Input placeholder="Subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Duration (mins)" type="number" value={form.duration_mins} onChange={(e) => set("duration_mins", e.target.value)} />
              <Input placeholder="Total Questions" type="number" value={form.total_questions} onChange={(e) => set("total_questions", e.target.value)} />
            </div>
            <Input placeholder="Scheduled At" type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at", e.target.value)} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Questions (JSON array)</p>
              <textarea
                className="w-full border rounded p-2 text-sm font-mono h-28 resize-none bg-background"
                placeholder='[{"q": "What is 2+2?", "options": ["3","4","5"], "answer": "4"}]'
                value={form.questions}
                onChange={(e) => set("questions", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createExam.mutate(form)} disabled={createExam.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
