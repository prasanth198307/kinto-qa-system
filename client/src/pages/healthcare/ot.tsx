import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Plus, X, Play, CheckCircle, Clock } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  postponed: "bg-gray-100 text-gray-600",
};

const OT_ROOMS = ["OT-1 (General)", "OT-2 (Ortho)", "OT-3 (Cardiac)", "OT-4 (Neuro)", "OT-5 (Emergency)", "OT-6 (Laparoscopy)"];
const ANAESTHESIA_TYPES = ["General Anaesthesia (GA)", "Spinal Anaesthesia", "Epidural", "Local Anaesthesia", "Regional Block", "Sedation"];

const EMPTY = {
  patient_id: "", doctor_id: "", anaesthetist_id: "", procedure_name: "",
  ot_room: "OT-1 (General)", anaesthesia_type: "General Anaesthesia (GA)",
  scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: "09:00",
  estimated_duration: "60", notes: "", priority: "elective",
};

export default function OTPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  const { data: schedule = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ot/schedule", dateFilter], queryFn: () => api("GET", `/api/healthcare/ot/schedule?date=${dateFilter}`) });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });

  const create = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/ot/schedule", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ot/schedule"] }); setShowForm(false); setForm({ ...EMPTY }); },
  });

  const startOT = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/healthcare/ot/schedule/${id}/start`, { actual_start: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ot/schedule"] }),
  });

  const completeOT = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/healthcare/ot/schedule/${id}/complete`, { actual_end: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ot/schedule"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/healthcare/ot/schedule/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ot/schedule"] }),
  });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const scheduleArr = Array.isArray(schedule) ? schedule : [];
  const inProgress = scheduleArr.filter((o: any) => o.status === "in_progress");
  const todayScheduled = scheduleArr.filter((o: any) => o.status === "scheduled");
  const completed = scheduleArr.filter((o: any) => o.status === "completed");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="w-6 h-6 text-indigo-600" />OT Scheduling</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Schedule OT</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Scheduled</p><p className="text-2xl font-bold text-blue-600">{todayScheduled.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">In Progress</p><p className="text-2xl font-bold text-yellow-600">{inProgress.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Completed Today</p><p className="text-2xl font-bold text-green-600">{completed.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">OT Rooms Available</p><p className="text-2xl font-bold">{OT_ROOMS.length - inProgress.length}</p></CardContent></Card>
      </div>

      <div><Label className="text-xs">Filter by Date</Label><Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" /></div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Schedule OT Procedure</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Patient</Label>
              <Select value={form.patient_id} onValueChange={v => f("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Surgeon</Label>
              <Select value={form.doctor_id} onValueChange={v => f("doctor_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(doctors) && doctors.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name} ({d.specialization})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Anaesthetist</Label>
              <Select value={form.anaesthetist_id} onValueChange={v => f("anaesthetist_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(doctors) && doctors.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Procedure Name</Label><Input value={form.procedure_name} onChange={e => f("procedure_name", e.target.value)} placeholder="e.g. Appendectomy, Total Knee Replacement" /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => f("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elective">Elective</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>OT Room</Label>
              <Select value={form.ot_room} onValueChange={v => f("ot_room", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OT_ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Anaesthesia Type</Label>
              <Select value={form.anaesthesia_type} onValueChange={v => f("anaesthesia_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ANAESTHESIA_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Est. Duration (min)</Label><Input type="number" value={form.estimated_duration} onChange={e => f("estimated_duration", e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={form.scheduled_date} onChange={e => f("scheduled_date", e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={form.scheduled_time} onChange={e => f("scheduled_time", e.target.value)} /></div>
            <div><Label>Notes / Pre-op Instructions</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate({ ...form, patient_id: parseInt(form.patient_id), doctor_id: parseInt(form.doctor_id), anaesthetist_id: parseInt(form.anaesthetist_id || "0"), estimated_duration: parseInt(form.estimated_duration) })}>Schedule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {scheduleArr.map((o: any) => (
          <Card key={o.id} className={o.status === "in_progress" ? "border-yellow-300 bg-yellow-50" : ""}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {o.priority === "emergency" && <Badge className="bg-red-600 text-white text-xs">EMERGENCY</Badge>}
                  {o.priority === "urgent" && <Badge className="bg-orange-500 text-white text-xs">URGENT</Badge>}
                  <p className="font-semibold">{o.procedure_name}</p>
                </div>
                <p className="text-sm text-gray-600">{o.patient_name ?? `Patient #${o.patient_id}`} · Dr. {o.doctor_name ?? o.doctor_id}</p>
                <p className="text-xs text-gray-500">{o.ot_room} · {o.anaesthesia_type} · {o.estimated_duration}min</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{o.scheduled_date?.slice(0, 10)} {o.scheduled_time}</p>
                {o.actual_start && <p className="text-xs text-yellow-700">Started: {new Date(o.actual_start).toLocaleTimeString()}</p>}
                {o.actual_end && <p className="text-xs text-green-700">Ended: {new Date(o.actual_end).toLocaleTimeString()}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={STATUS_COLOR[o.status] ?? "bg-gray-100"}>{o.status?.replace("_", " ")}</Badge>
                <div className="flex gap-1 flex-wrap justify-end">
                  {o.status === "scheduled" && (
                    <>
                      <Button size="sm" onClick={() => startOT.mutate(o.id)}><Play className="w-3 h-3 mr-1" />Start OT</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: o.id, status: "postponed" })}>Postpone</Button>
                    </>
                  )}
                  {o.status === "in_progress" && (
                    <Button size="sm" onClick={() => completeOT.mutate(o.id)}><CheckCircle className="w-3 h-3 mr-1" />Complete OT</Button>
                  )}
                  {["scheduled", "postponed"].includes(o.status) && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus.mutate({ id: o.id, status: "cancelled" })}>Cancel</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {scheduleArr.length === 0 && <p className="text-center text-gray-400 py-8">No OT procedures scheduled for {dateFilter}.</p>}
      </div>
    </div>
  );
}
