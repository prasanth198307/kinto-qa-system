import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function HealthcareNursingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [form, setForm] = useState({ patient_id: "", bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "", spo2: "", weight: "", notes: "" });

  const { data: vitals = [] } = useQuery({ queryKey: ["/api/healthcare/vitals"], queryFn: () => api("GET", "/api/healthcare/vitals") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/vitals", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/vitals"] }); toast({ title: "Vitals recorded" }); setForm(p => ({ ...p, bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "", spo2: "", weight: "", notes: "" })); }
  });

  const patientVitals = selectedPatient ? vitals.filter((v: any) => v.patient_id === selectedPatient || v.patient_name?.includes(selectedPatient)) : vitals.slice(0, 20);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Nursing & Vitals</h1>

      <Card><CardHeader><CardTitle>Record Vitals</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="col-span-3"><label className="text-sm font-medium">Patient ID / Name</label>
            <Input value={form.patient_id} onChange={e => { setForm(p => ({ ...p, patient_id: e.target.value })); setSelectedPatient(e.target.value); }} placeholder="Search patient..." /></div>
          {[["bp_systolic","BP Systolic"],["bp_diastolic","BP Diastolic"],["pulse","Pulse (bpm)"],["temperature","Temp (°F)"],["spo2","SpO2 (%)"],["weight","Weight (kg)"]].map(([k,l]) => (
            <div key={k}><label className="text-sm font-medium">{l}</label>
              <Input type="number" value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
          <div className="col-span-3"><label className="text-sm font-medium">Notes</label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          <Button onClick={() => add.mutate(form)}>Record Vitals</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vitals Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Patient</TableHead><TableHead>Recorded At</TableHead><TableHead>BP</TableHead>
              <TableHead>Pulse</TableHead><TableHead>Temp</TableHead><TableHead>SpO2</TableHead><TableHead>Weight</TableHead><TableHead>Recorded By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {patientVitals.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.patient_name}</TableCell>
                  <TableCell>{v.recorded_at ? new Date(v.recorded_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{v.bp_systolic && v.bp_diastolic ? v.bp_systolic + "/" + v.bp_diastolic : "—"}</TableCell>
                  <TableCell>{v.pulse || "—"}</TableCell>
                  <TableCell>{v.temperature || "—"}</TableCell>
                  <TableCell>{v.spo2 ? v.spo2 + "%" : "—"}</TableCell>
                  <TableCell>{v.weight ? v.weight + " kg" : "—"}</TableCell>
                  <TableCell>{v.recorded_by}</TableCell>
                </TableRow>
              ))}
              {patientVitals.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No vitals recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
