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
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function EducationStudentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", gender: "", class_id: "", section: "", roll_no: "", parent_name: "", parent_phone: "", address: "", blood_group: "" });

  const { data: students = [] } = useQuery({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/students", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/students"] }); setShowForm(false); toast({ title: "Student added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const filtered = students.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.toString().includes(search)
  );

  const total = students.length;
  const active = students.filter((s: any) => s.status === "active").length;
  const thisMonth = students.filter((s: any) => {
    const d = new Date(s.admission_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Student</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{total}</div><div className="text-sm text-muted-foreground">Total Students</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{active}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{thisMonth}</div><div className="text-sm text-muted-foreground">New This Month</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Student</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["name","dob","roll_no","section","class_id","parent_name","parent_phone","address","blood_group"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace("_"," ")}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Gender</label>
                <Select value={form.gender} onValueChange={v => setForm(p => ({...p, gender: v}))}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Student List</CardTitle>
            <Input className="w-64" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead>
                <TableHead>Section</TableHead><TableHead>Roll No</TableHead><TableHead>Parent Phone</TableHead>
                <TableHead>Status</TableHead><TableHead>Admission Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.student_id}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.class}</TableCell>
                  <TableCell>{s.section}</TableCell>
                  <TableCell>{s.roll_no}</TableCell>
                  <TableCell>{s.parent_phone}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell>{s.admission_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
