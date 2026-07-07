import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

interface Patient { id: number; name: string; age: number; gender: string; phone: string; }
interface ICD10 { code: string; description: string; }
interface PrescriptionRow { drug: string; dose: string; frequency: string; duration: string; instructions: string; }
interface InvestigationRow { test: string; urgency: string; }
interface Visit { id: number; visit_date: string; chief_complaint: string; diagnosis: string; }
interface Vital { date: string; bp_systolic: number; bp_diastolic: number; pulse: number; weight: number; }

const emptyRx: PrescriptionRow = { drug: "", dose: "", frequency: "", duration: "", instructions: "" };
const emptyInv: InvestigationRow = { test: "", urgency: "routine" };

function SparkLine({ values, label }: { values: number[]; label: string }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 6;
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <svg width={values.length * w} height={30} className="overflow-visible">
        <polyline
          points={values.map((v, i) => `${i * w},${28 - ((v - min) / range) * 24}`).join(" ")}
          fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary"
        />
      </svg>
      <span className="text-xs font-medium">{values[values.length - 1]}</span>
    </div>
  );
}

export default function EMRVisitPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [icd10Search, setIcd10Search] = useState("");
  const [primaryDx, setPrimaryDx] = useState<ICD10 | null>(null);
  const [secondaryDx, setSecondaryDx] = useState<ICD10[]>([]);
  const [rxRows, setRxRows] = useState<PrescriptionRow[]>([{ ...emptyRx }]);
  const [invRows, setInvRows] = useState<InvestigationRow[]>([{ ...emptyInv }]);
  const [followUp, setFollowUp] = useState("");

  const [soap, setSoap] = useState({
    chief_complaint: "", history: "", examination_findings: "", treatment_plan: "",
    bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "", spo2: "", weight: "", height: "",
  });
  const setS = (k: string, v: string) => setSoap(p => ({ ...p, [k]: v }));

  const bmi = soap.weight && soap.height
    ? (Number(soap.weight) / Math.pow(Number(soap.height) / 100, 2)).toFixed(1)
    : null;

  const { data: patientResults = [] } = useQuery<Patient[]>({
    queryKey: ["patient-search", patientSearch],
    queryFn: () => patientSearch.length > 2 ? api("GET", `/api/healthcare/emr/patients/search?q=${encodeURIComponent(patientSearch)}`).catch(() => []) : Promise.resolve([]),
    enabled: patientSearch.length > 2,
  });

  const { data: icd10Results = [] } = useQuery<ICD10[]>({
    queryKey: ["icd10-search", icd10Search],
    queryFn: () => icd10Search.length > 2 ? api("GET", `/api/healthcare/icd10/search?q=${encodeURIComponent(icd10Search)}`).catch(() => []) : Promise.resolve([]),
    enabled: icd10Search.length > 2,
  });

  const { data: visitHistory = [] } = useQuery<Visit[]>({
    queryKey: ["patient-visits", selectedPatient?.id],
    queryFn: () => api("GET", `/api/healthcare/emr/patients/${selectedPatient!.id}/visits`).catch(() => []),
    enabled: !!selectedPatient,
  });

  const { data: vitals = [] } = useQuery<Vital[]>({
    queryKey: ["patient-vitals", selectedPatient?.id],
    queryFn: () => api("GET", `/api/healthcare/emr/patients/${selectedPatient!.id}/vitals`).catch(() => []),
    enabled: !!selectedPatient,
  });

  const saveMut = useMutation({
    mutationFn: (body: unknown) => api("POST", "/api/healthcare/emr/visits", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["patient-visits"] }); toast({ title: "Visit saved" }); },
    onError: () => toast({ title: "Error saving visit", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!selectedPatient) { toast({ title: "Select a patient first", variant: "destructive" }); return; }
    saveMut.mutate({
      patient_id: selectedPatient.id, ...soap, bmi,
      primary_diagnosis: primaryDx, secondary_diagnoses: secondaryDx,
      prescriptions: rxRows, investigations: invRows, follow_up_date: followUp,
    });
  };

  const bpValues = vitals.slice(-10).map(v => v.bp_systolic);
  const weightValues = vitals.slice(-10).map(v => v.weight);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">EMR Consultation</h1>
        <Button onClick={handleSave} disabled={saveMut.isPending}>Save Visit</Button>
      </div>

      {/* Patient Search */}
      <Card>
        <CardHeader><CardTitle>Patient Lookup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search patient by name..." value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)} />
          </div>
          {patientResults.length > 0 && !selectedPatient && (
            <div className="border rounded divide-y max-h-48 overflow-y-auto">
              {patientResults.map(p => (
                <button key={p.id} className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                  onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); }}>
                  {p.name} — {p.age}y, {p.gender} | {p.phone}
                </button>
              ))}
            </div>
          )}
          {selectedPatient && (
            <div className="flex items-center justify-between bg-primary/5 rounded p-3">
              <div className="text-sm">
                <span className="font-semibold">{selectedPatient.name}</span> &nbsp;
                <span className="text-muted-foreground">{selectedPatient.age}y · {selectedPatient.gender} · {selectedPatient.phone}</span>
              </div>
              <div className="flex gap-4">
                {bpValues.length > 0 && <SparkLine values={bpValues} label="BP Sys" />}
                {weightValues.length > 0 && <SparkLine values={weightValues} label="Weight" />}
              </div>
              <Button size="sm" variant="outline" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}>Change</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Vitals */}
          <Card>
            <CardHeader><CardTitle>Vitals</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>BP Systolic</Label>
                  <Input type="number" value={soap.bp_systolic} onChange={e => setS("bp_systolic", e.target.value)} placeholder="120" />
                </div>
                <div className="space-y-1">
                  <Label>BP Diastolic</Label>
                  <Input type="number" value={soap.bp_diastolic} onChange={e => setS("bp_diastolic", e.target.value)} placeholder="80" />
                </div>
                <div className="space-y-1">
                  <Label>Pulse (bpm)</Label>
                  <Input type="number" value={soap.pulse} onChange={e => setS("pulse", e.target.value)} placeholder="72" />
                </div>
                <div className="space-y-1">
                  <Label>Temperature (°F)</Label>
                  <Input type="number" value={soap.temperature} onChange={e => setS("temperature", e.target.value)} placeholder="98.6" />
                </div>
                <div className="space-y-1">
                  <Label>SpO2 (%)</Label>
                  <Input type="number" value={soap.spo2} onChange={e => setS("spo2", e.target.value)} placeholder="98" />
                </div>
                <div className="space-y-1">
                  <Label>Weight (kg)</Label>
                  <Input type="number" value={soap.weight} onChange={e => setS("weight", e.target.value)} placeholder="70" />
                </div>
                <div className="space-y-1">
                  <Label>Height (cm)</Label>
                  <Input type="number" value={soap.height} onChange={e => setS("height", e.target.value)} placeholder="170" />
                </div>
                {bmi && (
                  <div className="space-y-1 flex flex-col justify-end">
                    <Label>BMI</Label>
                    <div className="border rounded px-3 py-2 text-sm font-semibold bg-muted">{bmi}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SOAP Notes */}
          <Card>
            <CardHeader><CardTitle>SOAP Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["chief_complaint", "Chief Complaint"],
                ["history", "History"],
                ["examination_findings", "Examination Findings"],
                ["treatment_plan", "Treatment Plan"],
              ].map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <Label>{label}</Label>
                  <Textarea value={(soap as Record<string, string>)[k]} onChange={e => setS(k, e.target.value)} rows={3} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Diagnosis */}
          <Card>
            <CardHeader><CardTitle>Diagnosis (ICD-10)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Search Primary Diagnosis</Label>
                <Input placeholder="e.g. Hypertension, J06..." value={icd10Search}
                  onChange={e => { setIcd10Search(e.target.value); setPrimaryDx(null); }} />
                {icd10Results.length > 0 && !primaryDx && (
                  <div className="border rounded divide-y max-h-40 overflow-y-auto">
                    {icd10Results.map(c => (
                      <button key={c.code} className="w-full text-left px-3 py-1.5 hover:bg-muted text-sm"
                        onClick={() => { setPrimaryDx(c); setIcd10Search(`${c.code} — ${c.description}`); }}>
                        <span className="font-mono text-primary">{c.code}</span> — {c.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {primaryDx && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">{primaryDx.code}</Badge>
                  <span className="text-sm">{primaryDx.description}</span>
                </div>
              )}
              {secondaryDx.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {secondaryDx.map((d, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {d.code} — {d.description}
                      <button onClick={() => setSecondaryDx(p => p.filter((_, j) => j !== i))}>×</button>
                    </Badge>
                  ))}
                </div>
              )}
              {primaryDx && (
                <Button size="sm" variant="outline" onClick={() => { if (primaryDx) setSecondaryDx(p => [...p, primaryDx]); setPrimaryDx(null); setIcd10Search(""); }}>
                  <Plus className="h-3 w-3 mr-1" /> Add as Secondary
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Prescriptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prescriptions</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setRxRows(p => [...p, { ...emptyRx }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Instructions</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rxRows.map((row, i) => (
                    <TableRow key={i}>
                      {(["drug", "dose", "frequency", "duration", "instructions"] as const).map(k => (
                        <TableCell key={k}>
                          <Input value={row[k]} onChange={e => setRxRows(p => p.map((r, j) => j === i ? { ...r, [k]: e.target.value } : r))}
                            className="h-8 text-xs" />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setRxRows(p => p.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Investigations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Investigations Ordered</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setInvRows(p => [...p, { ...emptyInv }])}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {invRows.map((row, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Input placeholder="Test name" value={row.test}
                    onChange={e => setInvRows(p => p.map((r, j) => j === i ? { ...r, test: e.target.value } : r))} />
                  <Select value={row.urgency} onValueChange={v => setInvRows(p => p.map((r, j) => j === i ? { ...r, urgency: v } : r))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["routine", "urgent", "stat"].map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => setInvRows(p => p.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-1">
            <Label>Follow-up Date</Label>
            <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="w-48" />
          </div>
        </div>

        {/* Sidebar — Visit History */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {selectedPatient ? (
                visitHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous visits</p>
                ) : visitHistory.slice(0, 5).map(v => (
                  <div key={v.id} className="border rounded p-2 text-sm cursor-pointer hover:bg-muted">
                    <div className="font-medium">{v.visit_date}</div>
                    <div className="text-muted-foreground truncate">{v.chief_complaint}</div>
                    <Badge variant="outline" className="text-xs mt-1">{v.diagnosis}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Select a patient to view history</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
