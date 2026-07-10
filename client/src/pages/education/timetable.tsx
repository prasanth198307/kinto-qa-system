import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Clock } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetablePage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [pf, setPf] = useState({ period_no: "1", start_time: "08:00", end_time: "08:45", label: "" });
  const [sf, setSf] = useState({ class_id: "", day_of_week: "Monday", period_id: "", subject_id: "", teacher_id: "" });

  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: periods = [] } = useQuery<any[]>({ queryKey: ["/api/education/timetable-periods"], queryFn: () => api("GET", "/api/education/timetable-periods") });
  const { data: timetable = [] } = useQuery<any[]>({ queryKey: ["/api/education/timetable", classId], queryFn: () => api("GET", `/api/education/timetable?class_id=${classId}`), enabled: !!classId });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ["/api/education/subjects"], queryFn: () => api("GET", "/api/education/subjects") });
  const { data: teachers = [] } = useQuery<any[]>({ queryKey: ["/api/education/teachers"], queryFn: () => api("GET", "/api/education/teachers") });

  const createPeriod = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/timetable-periods", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/timetable-periods"] }); setShowPeriodForm(false); } });
  const deletePeriod = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/timetable-periods/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/timetable-periods"] }) });
  const createSlot = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/timetable", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/timetable", classId] }); setShowSlotForm(false); } });
  const deleteSlot = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/timetable/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/timetable", classId] }) });

  const periodArr = Array.isArray(periods) ? periods : [];
  const ttArr = Array.isArray(timetable) ? timetable : [];
  const clsArr = Array.isArray(classes) ? classes : [];

  const grid: Record<string, Record<string, any>> = {};
  DAYS.forEach(d => { grid[d] = {}; });
  ttArr.forEach((slot: any) => { if (grid[slot.day_of_week]) grid[slot.day_of_week][slot.period_id] = slot; });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPeriodForm(true)}><Clock className="w-4 h-4 mr-1" />Manage Periods</Button>
          <Button onClick={() => setShowSlotForm(true)}><Plus className="w-4 h-4 mr-1" />Add Slot</Button>
        </div>
      </div>

      <div><Label className="text-xs">View Class</Label>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showPeriodForm && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Add Period</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowPeriodForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            <div><Label>Period No</Label><Input type="number" value={pf.period_no} onChange={e => setPf(p => ({ ...p, period_no: e.target.value }))} /></div>
            <div><Label>Start</Label><Input type="time" value={pf.start_time} onChange={e => setPf(p => ({ ...p, start_time: e.target.value }))} /></div>
            <div><Label>End</Label><Input type="time" value={pf.end_time} onChange={e => setPf(p => ({ ...p, end_time: e.target.value }))} /></div>
            <div><Label>Label</Label><Input value={pf.label} onChange={e => setPf(p => ({ ...p, label: e.target.value }))} placeholder="Lunch" /></div>
            <div className="col-span-4 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowPeriodForm(false)}>Cancel</Button><Button onClick={() => createPeriod.mutate({ ...pf, period_no: parseInt(pf.period_no) })}>Add</Button></div>
          </CardContent>
        </Card>
      )}

      {showSlotForm && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Add Timetable Slot</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowSlotForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Class</Label><Select value={sf.class_id} onValueChange={v => setSf(p => ({ ...p, class_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Day</Label><Select value={sf.day_of_week} onValueChange={v => setSf(p => ({ ...p, day_of_week: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Period</Label><Select value={sf.period_id} onValueChange={v => setSf(p => ({ ...p, period_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{periodArr.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>P{p.period_no} ({p.start_time}–{p.end_time})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subject</Label><Select value={sf.subject_id} onValueChange={v => setSf(p => ({ ...p, subject_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{Array.isArray(subjects) && subjects.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Teacher</Label><Select value={sf.teacher_id} onValueChange={v => setSf(p => ({ ...p, teacher_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{Array.isArray(teachers) && teachers.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end"><Button onClick={() => createSlot.mutate({ ...sf, class_id: parseInt(sf.class_id), period_id: parseInt(sf.period_id), subject_id: parseInt(sf.subject_id), teacher_id: parseInt(sf.teacher_id) })}>Add</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">{periodArr.map((p: any) => <div key={p.id} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs"><span>P{p.period_no}: {p.start_time}–{p.end_time} {p.label && `(${p.label})`}</span><button className="text-red-400 ml-1" onClick={() => deletePeriod.mutate(p.id)}>×</button></div>)}</div>

      {classId && periodArr.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-gray-50"><th className="p-2 border text-left">Day</th>{periodArr.map((p: any) => <th key={p.id} className="p-2 border text-center min-w-24">P{p.period_no}<br /><span className="font-normal text-gray-400">{p.start_time}</span></th>)}</tr></thead>
            <tbody>{DAYS.map(day => (
              <tr key={day} className="border-b"><td className="p-2 border font-medium">{day}</td>
                {periodArr.map((p: any) => {
                  const slot = grid[day]?.[p.id];
                  return <td key={p.id} className="p-1 border text-center">{slot ? <div className="bg-blue-50 rounded p-1"><p className="font-medium">{slot.subject_name ?? `Sub#${slot.subject_id}`}</p><p className="text-gray-500 text-xs">{slot.teacher_name ?? ""}</p><button className="text-red-400 text-xs" onClick={() => deleteSlot.mutate(slot.id)}>×</button></div> : <span className="text-gray-300">—</span>}</td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="text-center text-gray-400 py-8">{classId ? "Add periods first." : "Select a class to view its timetable."}</p>}
    </div>
  );
}
