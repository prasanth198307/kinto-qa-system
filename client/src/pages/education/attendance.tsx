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

export default function EducationAttendancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [attendance, setAttendance] = useState<Record<number, "present"|"absent">>({});

  const { data: students = [] } = useQuery({
    queryKey: ["/api/education/students", selectedClass, selectedSection],
    queryFn: () => api("GET", `/api/education/students?class=${selectedClass}&section=${selectedSection}`),
    enabled: !!selectedClass,
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ["/api/education/attendance"],
    queryFn: () => api("GET", "/api/education/attendance"),
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/attendance/bulk", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/attendance"] }); toast({ title: "Attendance saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggle = (id: number) => setAttendance(p => ({ ...p, [id]: p[id] === "present" ? "absent" : "present" }));

  const present = Object.values(attendance).filter(v => v === "present").length;
  const absent = Object.values(attendance).filter(v => v === "absent").length;
  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const handleSave = () => {
    const records = students.map((s: any) => ({ student_id: s.id, date, status: attendance[s.id] || "absent" }));
    saveMutation.mutate({ date, class: selectedClass, section: selectedSection, records });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-sm font-medium">Class</label>
              <Input value={selectedClass} onChange={e => setSelectedClass(e.target.value)} placeholder="e.g. 10" className="w-24" />
            </div>
            <div>
              <label className="text-sm font-medium">Section</label>
              <Input value={selectedSection} onChange={e => setSelectedSection(e.target.value)} placeholder="e.g. A" className="w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{present}</div><div className="text-sm text-muted-foreground">Present</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{absent}</div><div className="text-sm text-muted-foreground">Absent</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{pct}%</div><div className="text-sm text-muted-foreground">Attendance %</div></CardContent></Card>
        </div>
      )}

      {students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Mark Attendance — {date}</CardTitle>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>Save Attendance</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Roll No</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.roll_no}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={attendance[s.id] === "present" ? "default" : "outline"}
                        onClick={() => toggle(s.id)}
                      >
                        {attendance[s.id] === "present" ? "Present" : "Absent"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Monthly Attendance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Class</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>%</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.class}</TableCell>
                  <TableCell className="text-green-600">{r.present_count}</TableCell>
                  <TableCell className="text-red-600">{r.absent_count}</TableCell>
                  <TableCell>{r.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
