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

const STATUS_COLORS: Record<string,any> = { scheduled: "secondary", "in-progress": "default", completed: "secondary", cancelled: "destructive" };

export default function HealthcareOTPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", surgeon_id: "", procedure_name: "", ot_number: "", scheduled_at: "", anesthetist: "", duration_mins: "" });

  const { data: schedules = [] } = useQuery({ queryKey: ["/api/healthcare/ot-schedules"], queryFn: () => api("GET", "/api/healthcare/ot-schedules") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/ot-schedules", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ot-schedules"] }); setShowForm(false); toast({ title: "OT scheduled" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">OT Scheduling</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Schedule OT</Button>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle>Schedule Operation</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["patient_id","Patient ID"],["surgeon_id","Surgeon ID"],["procedure_name","Procedure"],["ot_number","OT Number"],["scheduled_at","Scheduled At","datetime-local"],["anesthetist","Anesthetist"],["duration_mins","Duration (mins)","number"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date/Time</TableHead><TableHead>Patient</TableHead><TableHead>Surgeon</TableHead>
            <TableHead>Procedure</TableHead><TableHead>OT No</TableHead><TableHead>Anesthetist</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {schedules.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="font-medium">{s.patient_name}</TableCell>
                <TableCell>{s.surgeon}</TableCell>
                <TableCell>{s.procedure_name}</TableCell>
                <TableCell>{s.ot_number}</TableCell>
                <TableCell>{s.anesthetist}</TableCell>
                <TableCell>{s.duration_mins}m</TableCell>
                <TableCell><Badge variant={STATUS_COLORS[s.status]||"secondary"}>{s.status}</Badge></TableCell>
              </TableRow>
            ))}
            {schedules.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No OT schedules</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
