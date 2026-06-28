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

export default function EducationHomeworkPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", class_id: "", subject_id: "", description: "", due_date: "", attachment_url: "" });

  const { data: homework = [] } = useQuery({ queryKey: ["/api/education/homework"], queryFn: () => api("GET", "/api/education/homework") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/homework", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/homework"] }); setShowForm(false); toast({ title: "Homework assigned" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Homework</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Assign Homework</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Assign Homework</CardTitle></CardHeader>
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
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Attachment URL</label>
                <Input value={form.attachment_url} onChange={e => setForm(p => ({...p, attachment_url: e.target.value}))} />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Assign</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Homework List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead>
                <TableHead>Submissions</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homework.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{h.title}</TableCell>
                  <TableCell>{h.class}</TableCell>
                  <TableCell>{h.subject}</TableCell>
                  <TableCell>{h.teacher}</TableCell>
                  <TableCell>{h.assigned_date}</TableCell>
                  <TableCell>{h.due_date}</TableCell>
                  <TableCell>{h.submissions}</TableCell>
                  <TableCell><Badge variant={h.status === "active" ? "default" : "secondary"}>{h.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
