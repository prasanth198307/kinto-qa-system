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

const STATUS_COLORS: Record<string, any> = {
  scheduled: "secondary", waiting: "outline", consulting: "default", completed: "secondary", cancelled: "destructive"
};

export default function HealthcareOPDPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", appointment_date: "", appointment_time: "", type: "OPD", complaint: "" });

  const { data: appointments = [] } = useQuery({ queryKey: ["/api/healthcare/appointments"], queryFn: () => api("GET", "/api/healthcare/appointments") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/appointments", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }); setShowForm(false); toast({ title: "Appointment booked" }); }
  });

  const today = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter((a: any) => a.appointment_date?.startsWith(today));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">OPD & Appointments</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Appointment</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Book Appointment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["patient_id","Patient ID"],["doctor_id","Doctor ID"],["appointment_date","Date","date"],["appointment_time","Time","time"],["complaint","Chief Complaint"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div><label className="text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="OPD">OPD</SelectItem><SelectItem value="Follow-up">Follow-up</SelectItem></SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Book</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Today's Appointments ({todayAppts.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead>
              <TableHead>Department</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {todayAppts.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.appointment_time}</TableCell>
                  <TableCell className="font-medium">{a.patient_name}</TableCell>
                  <TableCell>{a.doctor}</TableCell>
                  <TableCell>{a.department}</TableCell>
                  <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_COLORS[a.status]||"secondary"}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {todayAppts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No appointments today</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
