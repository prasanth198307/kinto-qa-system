import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Plus, X, MessageCircle, Receipt } from "lucide-react";
import { useTenantConfig } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLORS: Record<string, string> = { scheduled: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800", no_show: "bg-gray-100 text-gray-600" };

export default function OpdPage() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [apptForm, setApptForm] = useState({ patient_id: "", doctor_id: "", appointment_date: new Date().toISOString().slice(0, 10), appointment_time: "10:00", reason: "" });
  const [billing, setBilling] = useState<any>(null);
  const [billAmount, setBillAmount] = useState("");

  const { data: appointments = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/appointments", date], queryFn: () => api("GET", `/api/healthcare/appointments?date=${date}`) });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/healthcare/appointments", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }); setShowForm(false); } });
  const updateStatus = useMutation({ mutationFn: ({ id, status }: any) => api("PUT", `/api/healthcare/appointments/${id}`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }) });
  const sendReminders = useMutation({ mutationFn: () => api("POST", "/api/healthcare/appointments/send-reminders", { date }) });
  const createBill = useMutation({ mutationFn: (b: any) => api("POST", "/api/healthcare/opd/bill", b), onSuccess: () => { setBilling(null); setBillAmount(""); qc.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }); } });

  const arr = Array.isArray(appointments) ? appointments : [];
  const ptArr = Array.isArray(patients) ? patients : [];
  const drArr = Array.isArray(doctors) ? doctors : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">OPD — Appointments</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => sendReminders.mutate()}><MessageCircle className="w-4 h-4 mr-1" />Send WhatsApp Reminders</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Appointment</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><CalendarClock className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Today's Appointments</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{arr.filter((a: any) => a.status === "completed").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Waiting</p><p className="text-2xl font-bold text-blue-600">{arr.filter((a: any) => a.status === "scheduled").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">No-shows</p><p className="text-2xl font-bold text-gray-500">{arr.filter((a: any) => a.status === "no_show").length}</p></CardContent></Card>
      </div>

      <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" /></div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">New Appointment</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Patient</Label>
              <Select value={apptForm.patient_id} onValueChange={v => setApptForm(p => ({ ...p, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ptArr.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.phone})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Doctor</Label>
              <Select value={apptForm.doctor_id} onValueChange={v => setApptForm(p => ({ ...p, doctor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{drArr.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name} ({d.specialization})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date & Time</Label><div className="flex gap-1"><Input type="date" value={apptForm.appointment_date} onChange={e => setApptForm(p => ({ ...p, appointment_date: e.target.value }))} /><Input type="time" value={apptForm.appointment_time} onChange={e => setApptForm(p => ({ ...p, appointment_time: e.target.value }))} className="w-28" /></div></div>
            <div className="col-span-2"><Label>Reason / Complaint</Label><Input value={apptForm.reason} onChange={e => setApptForm(p => ({ ...p, reason: e.target.value }))} /></div>
            <div className="flex items-end"><Button onClick={() => create.mutate({ ...apptForm, patient_id: parseInt(apptForm.patient_id), doctor_id: parseInt(apptForm.doctor_id) })}>Book</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {arr.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{a.patient_name ?? `Patient #${a.patient_id}`}</p>
                <p className="text-sm text-gray-600">Dr. {a.doctor_name ?? a.doctor_id} · {a.appointment_time}</p>
                <p className="text-xs text-gray-500">{a.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={STATUS_COLORS[a.status] ?? "bg-gray-100"}>{a.status}</Badge>
                <div className="flex gap-1">
                  {a.status === "scheduled" && <>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: "completed" })}>Complete</Button>
                    <Button size="sm" variant="outline" onClick={() => setBilling(a)}><Receipt className="w-3 h-3 mr-1" />Bill</Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: a.id, status: "no_show" })}>No-show</Button>
                  </>}
                </div>
              </div>
            </CardContent>
            {billing?.id === a.id && (
              <CardContent className="border-t pt-3 flex gap-2 items-end">
                <div><Label className="text-xs">{`Consultation Amount (${sym})`}</Label><Input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} className="w-36" /></div>
                <Button size="sm" onClick={() => createBill.mutate({ appointment_id: a.id, patient_id: a.patient_id, doctor_id: a.doctor_id, amount: parseFloat(billAmount) })}>Generate Bill & Post GL</Button>
                <Button size="sm" variant="ghost" onClick={() => setBilling(null)}><X className="w-3 h-3" /></Button>
                <p className="text-xs text-gray-400">GL: DR Cash · CR OPD Revenue</p>
              </CardContent>
            )}
          </Card>
        ))}
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No appointments for {date}.</p>}
      </div>
    </div>
  );
}
