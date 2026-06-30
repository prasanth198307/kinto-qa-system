import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Users } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const EMPTY = { class_name: "", section: "", room_number: "", class_teacher: "", capacity: "" };

export default function ClassesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  const { data: classes = [] } = useQuery({ queryKey: ["edu-classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: classStudents = [] } = useQuery({
    queryKey: ["edu-class-students", selectedClass?.id],
    queryFn: () => api("GET", `/api/education/classes/${selectedClass?.id}/students`),
    enabled: !!selectedClass?.id,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/education/classes/${editing.id}`, d) : api("POST", "/api/education/classes", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-classes"] }); setOpen(false); setEditing(null); setForm(EMPTY); },
  });

  const list = Array.isArray(classes) ? classes : [];
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c }); setOpen(true); };
  const openStudents = (c: any) => { setSelectedClass(c); setStudentsOpen(true); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes & Sections</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Class</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Classes</p><p className="text-2xl font-bold">{list.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Capacity</p><p className="text-2xl font-bold">{list.reduce((s: number, c: any) => s + Number(c.capacity || 0), 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Enrolled</p><p className="text-2xl font-bold">{list.reduce((s: number, c: any) => s + Number(c.enrolled_count || 0), 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Class</TableHead><TableHead>Section</TableHead><TableHead>Room</TableHead>
              <TableHead>Class Teacher</TableHead><TableHead>Capacity</TableHead><TableHead>Enrolled</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.class_name}</TableCell>
                  <TableCell>{c.section}</TableCell>
                  <TableCell>{c.room_number}</TableCell>
                  <TableCell>{c.class_teacher}</TableCell>
                  <TableCell>{c.capacity}</TableCell>
                  <TableCell>
                    <span className={Number(c.enrolled_count) >= Number(c.capacity) ? "text-red-600 font-semibold" : ""}>{c.enrolled_count || 0}</span>
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openStudents(c)}><Users className="w-3 h-3 mr-1" />Students</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Class Name (e.g. 10)" value={form.class_name} onChange={(e) => set("class_name", e.target.value)} />
              <Input placeholder="Section (e.g. A)" value={form.section} onChange={(e) => set("section", e.target.value)} />
            </div>
            <Input placeholder="Room Number" value={form.room_number} onChange={(e) => set("room_number", e.target.value)} />
            <Input placeholder="Class Teacher" value={form.class_teacher} onChange={(e) => set("class_teacher", e.target.value)} />
            <Input placeholder="Capacity" type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={studentsOpen} onOpenChange={setStudentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Students — Class {selectedClass?.class_name}{selectedClass?.section}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Gender</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(Array.isArray(classStudents) ? classStudents : []).map((s: any) => (
                <TableRow key={s.id}><TableCell className="font-mono text-xs">{s.student_id || s.id}</TableCell><TableCell>{s.name}</TableCell><TableCell>{s.gender}</TableCell><TableCell>{s.phone}</TableCell><TableCell>{s.status}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
