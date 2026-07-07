import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartPulse, Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY_VITALS = { temperature: "", pulse: "", bp_systolic: "", bp_diastolic: "", spo2: "", respiratory_rate: "", notes: "" };

export default function NursingPage() {
  const qc = useQueryClient();
  const [admissionId, setAdmissionId] = useState("");
  const [vitals, setVitals] = useState({ ...EMPTY_VITALS });

  const { data: admissions = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ipd-admissions"], queryFn: () => api("GET", "/api/healthcare/ipd-admissions") });
  const { data: vitalHistory = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/nursing/vitals", admissionId], queryFn: () => api("GET", `/api/healthcare/nursing/vitals/${admissionId}`), enabled: !!admissionId });
  const { data: notes = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/nursing/notes", admissionId], queryFn: () => api("GET", `/api/healthcare/nursing/notes/${admissionId}`), enabled: !!admissionId });

  const recordVitals = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/nursing/vitals", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/nursing/vitals", admissionId] }); setVitals({ ...EMPTY_VITALS }); },
  });

  const active = (Array.isArray(admissions) ? admissions : []).filter((a: any) => a.status !== "discharged");
  const vhArr = Array.isArray(vitalHistory) ? vitalHistory : [];
  const notesArr = Array.isArray(notes) ? notes : [];

  const v = (k: string, val: string) => setVitals(p => ({ ...p, [k]: val }));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><HeartPulse className="w-6 h-6 text-red-500" />Nursing Station</h1>

      <div><Label className="text-xs">Select Inpatient</Label>
        <Select value={admissionId} onValueChange={setAdmissionId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select admitted patient" /></SelectTrigger>
          <SelectContent>{active.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.patient_name ?? `Patient #${a.patient_id}`} — {a.ward_name ?? `Ward ${a.ward_id}`}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {admissionId && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Record Vitals</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs">Temp (°F)</Label><Input type="number" value={vitals.temperature} onChange={e => v("temperature", e.target.value)} /></div>
              <div><Label className="text-xs">Pulse (bpm)</Label><Input type="number" value={vitals.pulse} onChange={e => v("pulse", e.target.value)} /></div>
              <div><Label className="text-xs">BP Systolic</Label><Input type="number" value={vitals.bp_systolic} onChange={e => v("bp_systolic", e.target.value)} /></div>
              <div><Label className="text-xs">BP Diastolic</Label><Input type="number" value={vitals.bp_diastolic} onChange={e => v("bp_diastolic", e.target.value)} /></div>
              <div><Label className="text-xs">SpO₂ (%)</Label><Input type="number" value={vitals.spo2} onChange={e => v("spo2", e.target.value)} /></div>
              <div><Label className="text-xs">Resp. Rate</Label><Input type="number" value={vitals.respiratory_rate} onChange={e => v("respiratory_rate", e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Nursing Notes</Label><Input value={vitals.notes} onChange={e => v("notes", e.target.value)} /></div>
              <div className="col-span-4 flex justify-end">
                <Button onClick={() => recordVitals.mutate({ admission_id: parseInt(admissionId), ...Object.fromEntries(Object.entries(vitals).map(([k, val]) => [k, k === "notes" ? val : parseFloat(val as string) || null])) })}>
                  <Plus className="w-4 h-4 mr-1" />Record
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Vitals History</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50">{["Time", "Temp", "Pulse", "BP", "SpO₂", "RR", "Notes"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
                <tbody>
                  {vhArr.map((r: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{r.recorded_at ? new Date(r.recorded_at).toLocaleString() : "—"}</td>
                      <td className="p-2">{r.temperature}°F</td>
                      <td className="p-2">{r.pulse}</td>
                      <td className="p-2">{r.bp_systolic}/{r.bp_diastolic}</td>
                      <td className="p-2">{r.spo2}%</td>
                      <td className="p-2">{r.respiratory_rate}</td>
                      <td className="p-2 text-gray-500">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vhArr.length === 0 && <p className="text-center text-gray-400 py-4">No vitals recorded yet.</p>}
            </CardContent>
          </Card>

          {notesArr.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nursing Notes</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {notesArr.map((n: any, i: number) => <p key={i} className="text-sm border-b pb-1"><span className="text-gray-400 text-xs">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</span> {n.note ?? n.notes}</p>)}
              </CardContent>
            </Card>
          )}
        </>
      )}
      {!admissionId && <p className="text-center text-gray-400 py-8">Select an admitted patient to record vitals.</p>}
    </div>
  );
}
