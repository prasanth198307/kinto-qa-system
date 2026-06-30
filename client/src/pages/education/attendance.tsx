import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function AttendancePage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [classVal, setClassVal] = useState("");
  const [section, setSection] = useState("");
  const [attendance, setAttendance] = useState<Record<number, string>>({});

  const { data: students = [] } = useQuery({
    queryKey: ["edu-attendance-students", classVal, section],
    queryFn: () => api("GET", `/api/education/students?class=${classVal}&section=${section}`),
    enabled: !!classVal,
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["edu-attendance-existing", date, classVal, section],
    queryFn: async () => {
      const res = await api("GET", `/api/education/attendance?date=${date}&class=${classVal}&section=${section}`);
      if (Array.isArray(res)) {
        const map: Record<number, string> = {};
        res.forEach((r: any) => { map[r.student_id] = r.status; });
        setAttendance(map);
      }
      return res;
    },
    enabled: !!classVal && !!date,
  });

  const submit = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/attendance", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edu-attendance-existing"] }),
  });

  const list = Array.isArray(students) ? students : [];
  const mark = (id: number, status: string) => setAttendance((a) => ({ ...a, [id]: status }));
  const markAll = (status: string) => {
    const m: Record<number, string> = {};
    list.forEach((s: any) => { m[s.id] = status; });
    setAttendance(m);
  };

  const present = Object.values(attendance).filter((v) => v === "present").length;
  const absent = Object.values(attendance).filter((v) => v === "absent").length;
  const late = Object.values(attendance).filter((v) => v === "late").length;

  const handleSubmit = () => {
    const records = list.map((s: any) => ({ student_id: s.id, date, status: attendance[s.id] || "absent" }));
    submit.mutate({ date, class: classVal, section, records });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>

      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <Input placeholder="Class (e.g. 10)" value={classVal} onChange={(e) => setClassVal(e.target.value)} className="w-36" />
        <Input placeholder="Section (e.g. A)" value={section} onChange={(e) => setSection(e.target.value)} className="w-36" />
        <Button variant="outline" onClick={() => markAll("present")}>Mark All Present</Button>
        <Button variant="outline" onClick={() => markAll("absent")}>Mark All Absent</Button>
      </div>

      {list.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Summary — {date}</CardTitle></CardHeader>
          <CardContent className="flex gap-6 text-sm">
            <span className="text-green-600 font-semibold">Present: {present}</span>
            <span className="text-red-600 font-semibold">Absent: {absent}</span>
            <span className="text-yellow-600 font-semibold">Late: {late}</span>
            <span className="text-muted-foreground">Total: {list.length}</span>
          </CardContent>
        </Card>
      )}

      {list.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Attendance</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((s: any, i: number) => (
                  <TableRow key={s.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{s.student_id || s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <RadioGroup value={attendance[s.id] || "absent"} onValueChange={(v) => mark(s.id, v)} className="flex gap-4">
                        <div className="flex items-center gap-1"><RadioGroupItem value="present" id={`p-${s.id}`} /><Label htmlFor={`p-${s.id}`} className="text-green-600">Present</Label></div>
                        <div className="flex items-center gap-1"><RadioGroupItem value="absent" id={`a-${s.id}`} /><Label htmlFor={`a-${s.id}`} className="text-red-600">Absent</Label></div>
                        <div className="flex items-center gap-1"><RadioGroupItem value="late" id={`l-${s.id}`} /><Label htmlFor={`l-${s.id}`} className="text-yellow-600">Late</Label></div>
                      </RadioGroup>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {list.length > 0 && (
        <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">Submit Attendance</Button>
      )}

      {!classVal && <p className="text-muted-foreground text-center py-8">Enter class to load students.</p>}
    </div>
  );
}
