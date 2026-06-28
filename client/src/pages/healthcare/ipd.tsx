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

export default function HealthcareIPDPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [dischargeId, setDischargeId] = useState<number|null>(null);
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [form, setForm] = useState({ patient_id: "", bed_id: "", ward: "", doctor_id: "", diagnosis: "", admission_type: "planned" });

  const { data: admissions = [] } = useQuery({ queryKey: ["/api/healthcare/admissions"], queryFn: () => api("GET", "/api/healthcare/admissions") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/admissions", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/admissions"] }); setShowForm(false); toast({ title: "Patient admitted" }); }
  });

  const discharge = useMutation({
    mutationFn: ({ id, notes }: any) => api("PUT", "/api/healthcare/admissions/" + id + "/discharge", { discharge_notes: notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/admissions"] }); setDischargeId(null); toast({ title: "Patient discharged" }); }
  });

  const daysDiff = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">IPD & Admissions</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Admit Patient</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Admit Patient</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["patient_id","Patient ID"],["bed_id","Bed ID"],["ward","Ward"],["doctor_id","Doctor ID"],["diagnosis","Diagnosis"]].map(([k,l]) => (
              <div key={k}><label className="text-sm font-medium">{l}</label>
                <Input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} /></div>
            ))}
            <div><label className="text-sm font-medium">Admission Type</label>
              <Select value={form.admission_type} onValueChange={v => setForm(p => ({ ...p, admission_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="planned">Planned</SelectItem></SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Admit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      {dischargeId && (
        <Card><CardHeader><CardTitle>Discharge Patient</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Discharge notes..." value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => discharge.mutate({ id: dischargeId, notes: dischargeNotes })}>Confirm Discharge</Button>
              <Button variant="outline" onClick={() => setDischargeId(null)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Admission No</TableHead><TableHead>Patient</TableHead><TableHead>Bed</TableHead>
            <TableHead>Ward</TableHead><TableHead>Doctor</TableHead><TableHead>Admitted</TableHead>
            <TableHead>Days</TableHead><TableHead>Diagnosis</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {admissions.filter((a: any) => a.status !== "discharged").map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono">{a.admission_no}</TableCell>
                <TableCell className="font-medium">{a.patient_name}</TableCell>
                <TableCell>{a.bed_no}</TableCell>
                <TableCell>{a.ward}</TableCell>
                <TableCell>{a.doctor}</TableCell>
                <TableCell>{new Date(a.admission_date).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant="outline">{daysDiff(a.admission_date)}d</Badge></TableCell>
                <TableCell>{a.diagnosis}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => setDischargeId(a.id)}>Discharge</Button></TableCell>
              </TableRow>
            ))}
            {admissions.filter((a: any) => a.status !== "discharged").length === 0 &&
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No active admissions</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
