import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const EMPTY = { title: "", class: "", subject: "", teacher: "", assigned_date: "", due_date: "", description: "" };

export default function HomeworkPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("");

  const { data: homework = [] } = useQuery({ queryKey: ["edu-homework"], queryFn: () => api("GET", "/api/education/homework") });

  const addHw = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/homework", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-homework"] }); setOpen(false); setForm(EMPTY); },
  });

  const markSubmission = useMutation({
    mutationFn: ({ id, count }: any) => api("PUT", `/api/education/homework/${id}/submissions`, { count }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edu-homework"] }),
  });

  const list = Array.isArray(homework) ? homework : [];
  const classes = [...new Set(list.map((h: any) => h.class))];

  const filtered = list.filter((h: any) => {
    if (filterClass !== "all" && h.class !== filterClass) return false;
    if (filterSubject && !h.subject?.toLowerCase().includes(filterSubject.toLowerCase())) return false;
    return true;
  });

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const statusBadge = (h: any) => {
    const due = new Date(h.due_date);
    const now = new Date();
    if (h.status === "closed") return <Badge variant="secondary">Closed</Badge>;
    if (due < now) return <Badge variant="destructive">Overdue</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homework</h1>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Homework</Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map((c: any) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Filter by subject..." value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-44" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Assignments</p><p className="text-2xl font-bold">{list.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{list.filter((h: any) => h.status !== "closed" && new Date(h.due_date) >= new Date()).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold">{list.filter((h: any) => h.status !== "closed" && new Date(h.due_date) < new Date()).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead>
              <TableHead>Status</TableHead><TableHead>Submissions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.title}</TableCell>
                  <TableCell>{h.class}</TableCell>
                  <TableCell>{h.subject}</TableCell>
                  <TableCell>{h.teacher}</TableCell>
                  <TableCell>{h.assigned_date}</TableCell>
                  <TableCell>{h.due_date}</TableCell>
                  <TableCell>{statusBadge(h)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{h.submissions_count || 0}</span>
                      <Button size="sm" variant="outline" onClick={() => { const c = prompt("Enter submission count:"); if (c) markSubmission.mutate({ id: h.id, count: Number(c) }); }}>Update</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Homework</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Class" value={form.class} onChange={(e) => set("class", e.target.value)} />
              <Input placeholder="Subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
            </div>
            <Input placeholder="Teacher Name" value={form.teacher} onChange={(e) => set("teacher", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Assigned Date" type="date" value={form.assigned_date} onChange={(e) => set("assigned_date", e.target.value)} />
              <Input placeholder="Due Date" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <Input placeholder="Description (optional)" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addHw.mutate(form)} disabled={addHw.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
