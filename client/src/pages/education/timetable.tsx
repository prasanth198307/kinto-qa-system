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

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function EducationTimetablePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day: "", period_no: "", class_id: "", subject_id: "", teacher_id: "", start_time: "", end_time: "" });

  const { data: timetable = [] } = useQuery({
    queryKey: ["/api/education/timetable", selectedClass],
    queryFn: () => api("GET", `/api/education/timetable?class=${selectedClass}`),
    enabled: !!selectedClass,
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/timetable", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/timetable"] }); setShowForm(false); toast({ title: "Period saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const periods = [...new Set(timetable.map((t: any) => t.period_no))].sort();

  const getCell = (period: any, day: string) => timetable.find((t: any) => t.period_no === period && t.day === day);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <div className="flex gap-2">
          <Input value={selectedClass} onChange={e => setSelectedClass(e.target.value)} placeholder="Class (e.g. 10A)" className="w-32" />
          <Button onClick={() => setShowForm(!showForm)}>+ Add Period</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add/Edit Period</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Day</label>
                <Select value={form.day} onValueChange={v => setForm(p => ({...p, day: v}))}>
                  <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["period_no","class_id","subject_id","teacher_id","start_time","end_time"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input
                    type={k.includes("time") ? "time" : "text"}
                    value={(form as any)[k]}
                    onChange={e => setForm(p => ({...p, [k]: e.target.value}))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {timetable.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Timetable — Class {selectedClass}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  {DAYS.map(d => <TableHead key={d}>{d}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map(p => (
                  <TableRow key={p}>
                    <TableCell className="font-medium">P{p}</TableCell>
                    {DAYS.map(d => {
                      const cell = getCell(p, d);
                      return (
                        <TableCell key={d}>
                          {cell ? (
                            <div>
                              <div className="font-medium text-sm">{cell.subject}</div>
                              <div className="text-xs text-muted-foreground">{cell.teacher}</div>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      );
                    })}
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
