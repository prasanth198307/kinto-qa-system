import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json())
    .catch(() => null);

export default function NursingPage() {
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({ bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "", spo2: "", weight: "", recorded_by: "" });
  const [noteText, setNoteText] = useState("");

  const { data: admissions } = useQuery({ queryKey: ["ipd-admissions"], queryFn: () => api("GET", "/api/healthcare/ipd/admissions") });
  const { data: vitals } = useQuery({ queryKey: ["vitals", selectedPatient], queryFn: () => api("GET", `/api/healthcare/nursing/vitals/${selectedPatient}`), enabled: !!selectedPatient });
  const { data: notes } = useQuery({ queryKey: ["nursing-notes", selectedPatient], queryFn: () => api("GET", `/api/healthcare/nursing/notes/${selectedPatient}`), enabled: !!selectedPatient });

  const addVitals = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/nursing/vitals", { ...body, patient_id: selectedPatient }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vitals", selectedPatient] }); setVitalsOpen(false); setVitalsForm({ bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "", spo2: "", weight: "", recorded_by: "" }); },
  });

  const addNote = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/nursing/notes", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nursing-notes", selectedPatient] }); setNoteOpen(false); setNoteText(""); },
  });

  const admissionList = Array.isArray(admissions) ? admissions : [];
  const vitalsList = Array.isArray(vitals) ? vitals : [];
  const notesList = Array.isArray(notes) ? notes : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Nursing Station</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Patient (IPD)</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Select admitted patient" /></SelectTrigger>
            <SelectContent>
              {admissionList.map((a: any) => (
                <SelectItem key={a.patient_id ?? a.id} value={String(a.patient_id ?? a.id)}>
                  {a.patient_name ?? `Patient ${a.patient_id}`} — {a.ward ?? a.bed_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPatient && (
        <Tabs defaultValue="vitals">
          <TabsList>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="notes">Nursing Notes</TabsTrigger>
            <TabsTrigger value="mar">MAR</TabsTrigger>
          </TabsList>

          <TabsContent value="vitals" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={vitalsOpen} onOpenChange={setVitalsOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add Vitals</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Vitals</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div><Label>BP Systolic</Label><Input value={vitalsForm.bp_systolic} onChange={(e) => setVitalsForm({ ...vitalsForm, bp_systolic: e.target.value })} /></div>
                    <div><Label>BP Diastolic</Label><Input value={vitalsForm.bp_diastolic} onChange={(e) => setVitalsForm({ ...vitalsForm, bp_diastolic: e.target.value })} /></div>
                    <div><Label>Pulse (bpm)</Label><Input value={vitalsForm.pulse} onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })} /></div>
                    <div><Label>Temperature (°F)</Label><Input value={vitalsForm.temperature} onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })} /></div>
                    <div><Label>SpO2 (%)</Label><Input value={vitalsForm.spo2} onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })} /></div>
                    <div><Label>Weight (kg)</Label><Input value={vitalsForm.weight} onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })} /></div>
                    <div className="col-span-2"><Label>Recorded By</Label><Input value={vitalsForm.recorded_by} onChange={(e) => setVitalsForm({ ...vitalsForm, recorded_by: e.target.value })} /></div>
                    <Button className="col-span-2" onClick={() => addVitals.mutate(vitalsForm)} disabled={addVitals.isPending}>Save Vitals</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="pt-4">
                {vitalsList.length === 0 ? <p className="text-muted-foreground text-sm">No vitals recorded.</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>BP</TableHead>
                        <TableHead>Pulse</TableHead>
                        <TableHead>Temp</TableHead>
                        <TableHead>SpO2</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vitalsList.map((v: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{v.recorded_at ? new Date(v.recorded_at).toLocaleString() : "-"}</TableCell>
                          <TableCell>{v.bp_systolic}/{v.bp_diastolic}</TableCell>
                          <TableCell>{v.pulse}</TableCell>
                          <TableCell>{v.temperature}</TableCell>
                          <TableCell>{v.spo2}%</TableCell>
                          <TableCell>{v.weight} kg</TableCell>
                          <TableCell>{v.recorded_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add Note</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nursing Note</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Textarea rows={5} placeholder="Enter nursing note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                    <Button className="w-full" onClick={() => addNote.mutate({ patient_id: selectedPatient, note: noteText })} disabled={addNote.isPending}>Save Note</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {notesList.length === 0 ? <p className="text-muted-foreground text-sm">No notes recorded.</p> : notesList.map((n: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">{n.created_at ? new Date(n.created_at).toLocaleString() : "-"}</p>
                    <p className="text-sm">{n.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mar" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Medication Administration Record</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">No medications prescribed.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
