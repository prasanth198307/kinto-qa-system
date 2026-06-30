import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserCheck, UserX, Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const EMPTY = { name: "", class: "", section: "", dob: "", phone: "", guardian_name: "", gender: "male", status: "active" };

export default function StudentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const { data: students = [] } = useQuery({ queryKey: ["edu-students"], queryFn: () => api("GET", "/api/education/students") });
  const { data: fees = [] } = useQuery({ queryKey: ["edu-student-fees", detail?.id], queryFn: () => api("GET", `/api/education/students/${detail?.id}/fees`), enabled: !!detail?.id });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/education/students/${editing.id}`, d) : api("POST", "/api/education/students", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-students"] }); setOpen(false); setEditing(null); setForm(EMPTY); },
  });

  const list = Array.isArray(students) ? students : [];
  const total = list.length;
  const active = list.filter((s: any) => s.status === "active").length;
  const male = list.filter((s: any) => s.gender === "male").length;
  const female = list.filter((s: any) => s.gender === "female").length;

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ ...s }); setOpen(true); };
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Student</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{total}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><UserCheck className="w-8 h-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{active}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Male</p><p className="text-2xl font-bold">{male}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Female</p><p className="text-2xl font-bold">{female}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead>
              <TableHead>Section</TableHead><TableHead>DOB</TableHead><TableHead>Phone</TableHead>
              <TableHead>Guardian</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.student_id || s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.class}</TableCell>
                  <TableCell>{s.section}</TableCell>
                  <TableCell>{s.dob}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.guardian_name}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDetail(s)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input placeholder="Full Name" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <Input placeholder="Class (e.g. 10)" value={form.class} onChange={(e) => set("class", e.target.value)} />
            <Input placeholder="Section (e.g. A)" value={form.section} onChange={(e) => set("section", e.target.value)} />
            <Input placeholder="Date of Birth" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <div className="col-span-2"><Input placeholder="Guardian Name" value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} /></div>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
            <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="transferred">Transferred</SelectItem></SelectContent></Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Student Detail — {detail?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            <div><span className="text-muted-foreground">Class:</span> {detail?.class}-{detail?.section}</div>
            <div><span className="text-muted-foreground">DOB:</span> {detail?.dob}</div>
            <div><span className="text-muted-foreground">Guardian:</span> {detail?.guardian_name}</div>
          </div>
          <h3 className="font-semibold mb-2">Fee History</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Fee Head</TableHead><TableHead>Due Date</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(Array.isArray(fees) ? fees : []).map((f: any, i: number) => (
                <TableRow key={i}><TableCell>{f.fee_head}</TableCell><TableCell>{f.due_date}</TableCell><TableCell>₹{f.amount}</TableCell><TableCell>₹{f.paid_amount}</TableCell><TableCell><Badge variant={f.status === "paid" ? "default" : "destructive"}>{f.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
