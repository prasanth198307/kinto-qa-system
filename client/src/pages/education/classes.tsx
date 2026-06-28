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

export default function EducationClassesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"classes"|"subjects">("classes");
  const [showForm, setShowForm] = useState(false);
  const [classForm, setClassForm] = useState({ class_name: "", section: "", class_teacher_id: "", room_no: "", academic_year: "" });

  const { data: classes = [] } = useQuery({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: subjects = [] } = useQuery({ queryKey: ["/api/education/subjects"], queryFn: () => api("GET", "/api/education/subjects") });

  const addClass = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/classes", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/classes"] }); setShowForm(false); toast({ title: "Class added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Classes &amp; Subjects</h1>
        <div className="flex gap-2">
          <Button variant={tab === "classes" ? "default" : "outline"} onClick={() => setTab("classes")}>Classes</Button>
          <Button variant={tab === "subjects" ? "default" : "outline"} onClick={() => setTab("subjects")}>Subjects</Button>
          {tab === "classes" && <Button onClick={() => setShowForm(!showForm)}>+ Add Class</Button>}
        </div>
      </div>

      {tab === "classes" && showForm && (
        <Card>
          <CardHeader><CardTitle>Add Class</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["class_name","section","class_teacher_id","room_no","academic_year"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(classForm as any)[k]} onChange={e => setClassForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addClass.mutate(classForm)} disabled={addClass.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "classes" && (
        <Card>
          <CardHeader><CardTitle>Classes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead><TableHead>Section</TableHead><TableHead>Class Teacher</TableHead>
                  <TableHead>Strength</TableHead><TableHead>Academic Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.class_name}</TableCell>
                    <TableCell>{c.section}</TableCell>
                    <TableCell>{c.class_teacher}</TableCell>
                    <TableCell>{c.strength}</TableCell>
                    <TableCell>{c.academic_year}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "subjects" && (
        <Card>
          <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead><TableHead>Code</TableHead><TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead><TableHead>Periods/Week</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.subject_name}</TableCell>
                    <TableCell>{s.subject_code}</TableCell>
                    <TableCell>{s.class}</TableCell>
                    <TableCell>{s.teacher}</TableCell>
                    <TableCell>{s.periods_per_week}</TableCell>
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
