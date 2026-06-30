import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Stethoscope, IndianRupee } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const BLANK = { name: "", specialization: "", qualification: "", phone: "", email: "", consultation_fee: "", revenue_share_pct: "", status: "active", schedule_config: "" };
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_BADGE: Record<string, string> = { active: "default", inactive: "secondary", on_leave: "outline" };

export default function DoctorsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [revenueDoc, setRevenueDoc] = useState<any>(null);

  const { data: doctors = [] } = useQuery({
    queryKey: ["/api/healthcare/doctors"],
    queryFn: () => api("GET", "/api/healthcare/doctors").then(d => Array.isArray(d) ? d : []),
  });

  const { data: revenue } = useQuery({
    queryKey: ["/api/healthcare/doctors", revenueDoc?.id, "revenue"],
    queryFn: () => api("GET", `/api/healthcare/doctors/${revenueDoc.id}/revenue`).catch(() => null),
    enabled: !!revenueDoc?.id,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/healthcare/doctors/${editing.id}`, d) : api("POST", "/api/healthcare/doctors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }); setShowForm(false); setEditing(null); setForm({ ...BLANK }); },
  });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({ name: d.name, specialization: d.specialization || "", qualification: d.qualification || "", phone: d.phone || "", email: d.email || "", consultation_fee: d.consultation_fee || "", revenue_share_pct: d.revenue_share_pct || "", status: d.status || "active", schedule_config: typeof d.schedule_config === "object" ? JSON.stringify(d.schedule_config, null, 2) : (d.schedule_config || "") });
    setShowForm(true);
  };

  const parseSchedule = (doc: any) => {
    try { return typeof doc.schedule_config === "object" ? doc.schedule_config : JSON.parse(doc.schedule_config || "{}"); } catch { return {}; }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold">Doctor Management</h1>
          <Badge variant="secondary">{doctors.length}</Badge>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ ...BLANK }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" /> Add Doctor</Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Doctors</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Rev. Share</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">No doctors found</TableCell></TableRow>}
                  {doctors.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.doctor_id || d.id}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.specialization || "—"}</TableCell>
                      <TableCell className="text-xs">{d.qualification || "—"}</TableCell>
                      <TableCell>{d.phone || "—"}</TableCell>
                      <TableCell>₹{Number(d.consultation_fee || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{d.revenue_share_pct ? `${d.revenue_share_pct}%` : "—"}</TableCell>
                      <TableCell><Badge variant={(STATUS_BADGE[d.status] || "secondary") as any} className="capitalize">{d.status || "active"}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setRevenueDoc(revenueDoc?.id === d.id ? null : d)}>
                          <IndianRupee className="h-3.5 w-3.5" />
                        </Button>
                        {revenueDoc?.id === d.id && (
                          <span className="text-xs ml-1">{revenue === null || revenue === undefined ? "N/A" : `₹${Number(revenue?.amount || revenue || 0).toLocaleString("en-IN")}`}</span>
                        )}
                      </TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Edit2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-3">
          <div className="space-y-3">
            {doctors.length === 0 && <p className="text-gray-400 text-center py-8">No doctors to display</p>}
            {doctors.map((d: any) => {
              const sched = parseSchedule(d);
              return (
                <Card key={d.id}>
                  <CardHeader className="py-3 px-4"><CardTitle className="text-sm">{d.name} <span className="text-gray-400 font-normal text-xs">— {d.specialization}</span></CardTitle></CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map(day => {
                        const slot = sched[day] || sched[day.toLowerCase()];
                        return (
                          <div key={day} className={`px-2 py-1 rounded text-xs border ${slot ? "border-teal-300 bg-teal-50 text-teal-800" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
                            <div className="font-semibold">{day}</div>
                            <div>{slot || "Off"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); setForm({ ...BLANK }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Doctor" : "Add Doctor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div className="space-y-1"><Label>Specialization</Label><Input value={form.specialization} onChange={e => f("specialization", e.target.value)} /></div>
            <div className="space-y-1"><Label>Qualification</Label><Input value={form.qualification} onChange={e => f("qualification", e.target.value)} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div className="space-y-1"><Label>Consultation Fee (₹)</Label><Input type="number" value={form.consultation_fee} onChange={e => f("consultation_fee", e.target.value)} /></div>
            <div className="space-y-1"><Label>Revenue Share (%)</Label><Input type="number" value={form.revenue_share_pct} onChange={e => f("revenue_share_pct", e.target.value)} /></div>
            <div className="col-span-2 space-y-1"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="on_leave">On Leave</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{'Schedule Config (JSON — e.g. {"Mon":"9am-1pm","Tue":"2pm-6pm"})'}</Label>
              <Textarea value={form.schedule_config} onChange={e => f("schedule_config", e.target.value)} rows={3} placeholder='{"Mon":"9am-1pm","Wed":"2pm-6pm"}' />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => {
              const payload = { ...form };
              try { (payload as any).schedule_config = JSON.parse(form.schedule_config); } catch {}
              save.mutate(payload);
            }} disabled={save.isPending || !form.name}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
