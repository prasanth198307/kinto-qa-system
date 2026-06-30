import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope, Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json())
    .catch(() => null);

const statusVariant: Record<string, any> = { scheduled: "secondary", in_progress: "default", completed: "outline" };

export default function OTPage() {
  const qc = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ patient_id: "", surgery_type: "", surgeon_id: "", ot_room: "OT1", scheduled_date: "", scheduled_time: "", anaesthesia_type: "general", notes: "" });
  const [statusForm, setStatusForm] = useState({ status: "in_progress", actual_duration: "" });

  const { data: schedule } = useQuery({ queryKey: ["ot-schedule"], queryFn: () => api("GET", "/api/healthcare/ot/schedule") });
  const { data: doctors } = useQuery({ queryKey: ["doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });

  const addSchedule = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/ot/schedule", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ot-schedule"] }); setScheduleOpen(false); setForm({ patient_id: "", surgery_type: "", surgeon_id: "", ot_room: "OT1", scheduled_date: "", scheduled_time: "", anaesthesia_type: "general", notes: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api("PUT", `/api/healthcare/ot/schedule/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ot-schedule"] }); setStatusOpen(null); },
  });

  const surgeries = Array.isArray(schedule) ? schedule : [];
  const doctorList = Array.isArray(doctors) ? doctors : [];

  const roomStats = ["OT1", "OT2", "OT3"].map((room) => {
    const completed = surgeries.filter((s: any) => s.ot_room === room && s.actual_duration);
    const hours = completed.reduce((sum: number, s: any) => sum + (Number(s.actual_duration) || 0), 0);
    return { room, count: completed.length, hours };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Operation Theatre</h1>
        </div>
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Schedule Surgery</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule Surgery</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><Label>Patient ID</Label><Input value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} /></div>
              <div><Label>Surgery Type</Label><Input value={form.surgery_type} onChange={(e) => setForm({ ...form, surgery_type: e.target.value })} /></div>
              <div>
                <Label>Surgeon</Label>
                <Select value={form.surgeon_id} onValueChange={(v) => setForm({ ...form, surgeon_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select surgeon" /></SelectTrigger>
                  <SelectContent>
                    {doctorList.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>OT Room</Label>
                <Select value={form.ot_room} onValueChange={(v) => setForm({ ...form, ot_room: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OT1">OT1</SelectItem>
                    <SelectItem value="OT2">OT2</SelectItem>
                    <SelectItem value="OT3">OT3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Anaesthesia</Label>
                <Select value={form.anaesthesia_type} onValueChange={(v) => setForm({ ...form, anaesthesia_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="spinal">Spinal</SelectItem>
                    <SelectItem value="epidural">Epidural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="col-span-2" onClick={() => addSchedule.mutate(form)} disabled={addSchedule.isPending}>Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {roomStats.map((r) => (
          <Card key={r.room}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{r.room} — Today</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{r.hours}h</p>
              <p className="text-xs text-muted-foreground">{r.count} completed</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Today's OT Schedule</CardTitle></CardHeader>
        <CardContent>
          {surgeries.length === 0 ? <p className="text-muted-foreground text-sm">No surgeries scheduled.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Surgery</TableHead>
                  <TableHead>Surgeon</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Anaesthesia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surgeries.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.patient_name ?? s.patient_id}</TableCell>
                    <TableCell>{s.surgery_type}</TableCell>
                    <TableCell>{s.surgeon_name ?? s.surgeon_id}</TableCell>
                    <TableCell>{s.ot_room}</TableCell>
                    <TableCell className="text-xs">{s.scheduled_time}</TableCell>
                    <TableCell className="capitalize">{s.anaesthesia_type}</TableCell>
                    <TableCell><Badge variant={statusVariant[s.status] ?? "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell>
                      {s.status !== "completed" && (
                        <Dialog open={statusOpen === s.id} onOpenChange={(v) => setStatusOpen(v ? s.id : null)}>
                          <DialogTrigger asChild><Button size="sm" variant="outline">Update</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                              <div>
                                <Label>Status</Label>
                                <Select value={statusForm.status} onValueChange={(v) => setStatusForm({ ...statusForm, status: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div><Label>Actual Duration (hours)</Label><Input value={statusForm.actual_duration} onChange={(e) => setStatusForm({ ...statusForm, actual_duration: e.target.value })} /></div>
                              <Button className="w-full" onClick={() => updateStatus.mutate({ id: s.id, body: statusForm })}>Save</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
