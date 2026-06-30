import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, FileText } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const ICD10_CODES = [
  { code: "A09", desc: "Diarrhoea and gastroenteritis" },
  { code: "B34.9", desc: "Viral infection, unspecified" },
  { code: "E11", desc: "Type 2 diabetes mellitus" },
  { code: "G43", desc: "Migraine" },
  { code: "I10", desc: "Essential hypertension" },
  { code: "J00", desc: "Acute nasopharyngitis (common cold)" },
  { code: "J06.9", desc: "Acute upper respiratory infection" },
  { code: "J18.9", desc: "Pneumonia, unspecified" },
  { code: "K21", desc: "GERD" },
  { code: "K29.7", desc: "Gastritis, unspecified" },
  { code: "L20", desc: "Atopic dermatitis" },
  { code: "M54.5", desc: "Low back pain" },
  { code: "N39.0", desc: "Urinary tract infection" },
  { code: "R05", desc: "Cough" },
  { code: "R50.9", desc: "Fever, unspecified" },
  { code: "R51", desc: "Headache" },
  { code: "S00-T98", desc: "Injury / Trauma" },
  { code: "Z00.0", desc: "General examination" },
  { code: "Z30", desc: "Contraceptive management" },
  { code: "Z23", desc: "Immunization" },
];

const BLANK_NOTE = { chief_complaint: "", history: "", examination: "", assessment: "", plan: "", icd10_code: "", icd10_desc: "" };
const BLANK_RX = { medicine: "", dose: "", frequency: "", duration: "", route: "Oral" };
const MOCK_PATIENT = { id: 1, name: "Ravi Kumar", age: 42, blood_group: "B+", allergies: "Penicillin", conditions: "Hypertension, Type 2 Diabetes" };
const MOCK_VITALS = [
  { date: "2026-06-25", bp: "130/85", pulse: 78, spo2: 98, weight: 72, temp: 98.6 },
  { date: "2026-06-10", bp: "135/90", pulse: 82, spo2: 97, weight: 73, temp: 99.0 },
  { date: "2026-05-20", bp: "128/82", pulse: 76, spo2: 99, weight: 71, temp: 98.4 },
];

export default function EMRPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [patient, setPatient] = useState<typeof MOCK_PATIENT | null>(null);
  const [note, setNote] = useState({ ...BLANK_NOTE });
  const [rx, setRx] = useState<typeof BLANK_RX[]>([]);
  const [rxForm, setRxForm] = useState({ ...BLANK_RX });
  const [icdSearch, setIcdSearch] = useState("");

  const { data: emrData } = useQuery({
    queryKey: ["emr-patient", patient?.id],
    queryFn: () => api("GET", `/api/healthcare/emr/patient/${patient?.id}`),
    enabled: !!patient,
  });

  const saveNote = useMutation({
    mutationFn: () => api("POST", `/api/healthcare/emr/patient/${patient?.id}`, { note, prescriptions: rx }),
    onSuccess: () => { toast({ title: "EMR saved successfully" }); qc.invalidateQueries({ queryKey: ["emr-patient", patient?.id] }); },
    onError: () => toast({ title: "Failed to save EMR", variant: "destructive" }),
  });

  const handleSearch = () => {
    if (search.trim()) { setPatient(MOCK_PATIENT); }
  };

  const addRx = () => {
    if (!rxForm.medicine) return;
    setRx(prev => [...prev, { ...rxForm }]);
    setRxForm({ ...BLANK_RX });
  };

  const filteredICD = ICD10_CODES.filter(c => !icdSearch || c.code.toLowerCase().includes(icdSearch.toLowerCase()) || c.desc.toLowerCase().includes(icdSearch.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Electronic Medical Records (EMR)</h1>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input placeholder="Search patient by name or ID..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
        <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
      </div>

      {patient && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><p className="text-xs text-gray-500">Patient</p><p className="font-semibold">{patient.name}</p></div>
                <div><p className="text-xs text-gray-500">Age</p><p className="font-semibold">{patient.age} yrs</p></div>
                <div><p className="text-xs text-gray-500">Blood Group</p><Badge className="bg-red-100 text-red-800">{patient.blood_group}</Badge></div>
                <div><p className="text-xs text-gray-500">Allergies</p><p className="font-semibold text-red-600">{patient.allergies}</p></div>
                <div><p className="text-xs text-gray-500">Chronic Conditions</p><p className="text-sm">{patient.conditions}</p></div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Visit Notes</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="lab">Lab Reports</TabsTrigger>
              <TabsTrigger value="vitals">Vitals History</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-base">SOAP Notes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Chief Complaint</Label>
                    <Input value={note.chief_complaint} onChange={e => setNote(n => ({ ...n, chief_complaint: e.target.value }))} placeholder="Patient's main complaint..." />
                  </div>
                  <div>
                    <Label>History of Present Illness</Label>
                    <Textarea rows={2} value={note.history} onChange={e => setNote(n => ({ ...n, history: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Examination Findings</Label>
                    <Textarea rows={2} value={note.examination} onChange={e => setNote(n => ({ ...n, examination: e.target.value }))} />
                  </div>
                  <div>
                    <Label>ICD-10 Diagnosis Code</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Search ICD-10..." value={icdSearch} onChange={e => setIcdSearch(e.target.value)} className="w-48" />
                      <Select value={note.icd10_code} onValueChange={v => {
                        const found = ICD10_CODES.find(c => c.code === v);
                        setNote(n => ({ ...n, icd10_code: v, icd10_desc: found?.desc || "" }));
                      }}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select ICD-10 code" /></SelectTrigger>
                        <SelectContent>
                          {filteredICD.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.code} — {c.desc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {note.icd10_code && <p className="text-sm text-blue-600 mt-1">{note.icd10_code}: {note.icd10_desc}</p>}
                  </div>
                  <div>
                    <Label>Assessment & Plan</Label>
                    <Textarea rows={3} value={note.plan} onChange={e => setNote(n => ({ ...n, plan: e.target.value }))} />
                  </div>
                  <Button onClick={() => saveNote.mutate()} disabled={saveNote.isPending}>
                    {saveNote.isPending ? "Saving..." : "Save EMR"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-4 space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-base">Prescription Builder</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Input placeholder="Medicine name" value={rxForm.medicine} onChange={e => setRxForm(r => ({ ...r, medicine: e.target.value }))} />
                    <Input placeholder="Dose (e.g. 500mg)" value={rxForm.dose} onChange={e => setRxForm(r => ({ ...r, dose: e.target.value }))} />
                    <Select value={rxForm.frequency} onValueChange={v => setRxForm(r => ({ ...r, frequency: v }))}>
                      <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                      <SelectContent>
                        {["OD", "BD", "TDS", "QID", "SOS", "HS"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Duration (e.g. 5 days)" value={rxForm.duration} onChange={e => setRxForm(r => ({ ...r, duration: e.target.value }))} />
                    <Select value={rxForm.route} onValueChange={v => setRxForm(r => ({ ...r, route: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Oral", "IV", "IM", "SC", "Topical", "Inhaled"].map(rt => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={addRx}><Plus className="h-4 w-4 mr-1" />Add Medicine</Button>
                  {rx.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead><TableHead>Dose</TableHead>
                          <TableHead>Frequency</TableHead><TableHead>Duration</TableHead>
                          <TableHead>Route</TableHead><TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rx.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.medicine}</TableCell><TableCell>{r.dose}</TableCell>
                            <TableCell>{r.frequency}</TableCell><TableCell>{r.duration}</TableCell>
                            <TableCell>{r.route}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => setRx(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lab" className="mt-4">
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <p>No lab reports attached. Upload or link lab results from Lab module.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vitals" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Vitals History</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead><TableHead>BP</TableHead>
                        <TableHead>Pulse</TableHead><TableHead>SpO2 (%)</TableHead>
                        <TableHead>Weight (kg)</TableHead><TableHead>Temp (°F)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MOCK_VITALS.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell>{v.date}</TableCell><TableCell>{v.bp}</TableCell>
                          <TableCell>{v.pulse}</TableCell><TableCell>{v.spo2}</TableCell>
                          <TableCell>{v.weight}</TableCell><TableCell>{v.temp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
