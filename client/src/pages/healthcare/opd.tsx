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
import { Plus, Stethoscope, Receipt, Clock } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = { waiting: "bg-yellow-100 text-yellow-800", "in-consultation": "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800" };

const APPT_BLANK = { patient_id: "", doctor_id: "", time_slot: "", appointment_type: "new", notes: "" };
const CONSULT_BLANK = { chief_complaint: "", diagnosis: "", prescription: "", next_visit: "" };
const BILL_BLANK = { patient_id: "", doctor_id: "", consultation_charge: "", procedure_charges: "", lab_charges: "", pharmacy_charges: "", discount: "" };

export default function OPDPage() {
  const qc = useQueryClient();
  const [showAppt, setShowAppt] = useState(false);
  const [appt, setAppt] = useState({ ...APPT_BLANK });
  const [consulting, setConsulting] = useState<any>(null);
  const [consult, setConsult] = useState({ ...CONSULT_BLANK });
  const [showBill, setShowBill] = useState(false);
  const [bill, setBill] = useState({ ...BILL_BLANK });

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/healthcare/opd/appointments"],
    queryFn: () => api("GET", "/api/healthcare/opd/appointments").then(d => Array.isArray(d) ? d : []),
    refetchInterval: 30000,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["/api/healthcare/opd/bills"],
    queryFn: () => api("GET", "/api/healthcare/opd/bills").then(d => Array.isArray(d) ? d : []),
  });

  const addAppt = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/opd/appointments", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/opd/appointments"] }); setShowAppt(false); setAppt({ ...APPT_BLANK }); },
  });

  const updateAppt = useMutation({
    mutationFn: ({ id, ...d }: any) => api("PUT", `/api/healthcare/opd/appointments/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/opd/appointments"] }); setConsulting(null); setConsult({ ...CONSULT_BLANK }); },
  });

  const submitBill = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/opd/bill", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/opd/bills"] }); setShowBill(false); setBill({ ...BILL_BLANK }); },
  });

  const fa = (k: string, v: string) => setAppt(p => ({ ...p, [k]: v }));
  const fc = (k: string, v: string) => setConsult(p => ({ ...p, [k]: v }));
  const fb = (k: string, v: string) => setBill(p => ({ ...p, [k]: v }));

  const billTotal = ["consultation_charge","procedure_charges","lab_charges","pharmacy_charges"].reduce((s, k) => s + Number((bill as any)[k] || 0), 0) - Number(bill.discount || 0);

  const today = appointments.filter((a: any) => {
    const d = a.appointment_date || a.created_at;
    return d && new Date(d).toDateString() === new Date().toDateString();
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">OPD Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBill(true)}><Receipt className="h-4 w-4 mr-1" /> Bill</Button>
          <Button onClick={() => setShowAppt(true)}><Plus className="h-4 w-4 mr-1" /> Appointment</Button>
        </div>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Today's Queue <Badge className="ml-1" variant="secondary">{today.length}</Badge></TabsTrigger>
          <TabsTrigger value="all">All Appointments</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {today.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No appointments today</TableCell></TableRow>}
                  {today.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell><span className="font-bold text-lg text-blue-600">{a.token_number || a.id}</span></TableCell>
                      <TableCell className="font-medium">{a.patient_name || a.patient_id}</TableCell>
                      <TableCell>{a.doctor_name || a.doctor_id}</TableCell>
                      <TableCell><div className="flex items-center gap-1 text-sm"><Clock className="h-3.5 w-3.5 text-gray-400" />{a.time_slot || "—"}</div></TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{a.appointment_type || "new"}</Badge></TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] || "bg-gray-100 text-gray-700"}`}>{a.status || "waiting"}</span></TableCell>
                      <TableCell>
                        {a.status !== "completed" && (
                          <Button size="sm" onClick={() => { setConsulting(a); setConsult({ ...CONSULT_BLANK }); }}>Consult</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No appointments</TableCell></TableRow>}
                  {appointments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{a.patient_name || a.patient_id}</TableCell>
                      <TableCell>{a.doctor_name || a.doctor_id}</TableCell>
                      <TableCell className="capitalize">{a.appointment_type || "new"}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] || "bg-gray-100 text-gray-700"}`}>{a.status || "waiting"}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Bill #</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No bills</TableCell></TableRow>}
                  {bills.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.bill_number || b.id}</TableCell>
                      <TableCell>{b.patient_name || b.patient_id}</TableCell>
                      <TableCell>{b.doctor_name || b.doctor_id}</TableCell>
                      <TableCell>₹{Number(b.total_amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant={b.status === "paid" ? "default" : "secondary"}>{b.status || "pending"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAppt} onOpenChange={v => { setShowAppt(v); if (!v) setAppt({ ...APPT_BLANK }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Appointment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 space-y-1"><Label>Patient ID</Label><Input value={appt.patient_id} onChange={e => fa("patient_id", e.target.value)} placeholder="Patient ID" /></div>
            <div className="col-span-2 space-y-1"><Label>Doctor ID</Label><Input value={appt.doctor_id} onChange={e => fa("doctor_id", e.target.value)} placeholder="Doctor ID" /></div>
            <div className="space-y-1"><Label>Time Slot</Label><Input value={appt.time_slot} onChange={e => fa("time_slot", e.target.value)} placeholder="e.g. 10:00 AM" /></div>
            <div className="space-y-1"><Label>Type</Label>
              <Select value={appt.appointment_type} onValueChange={v => fa("appointment_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="followup">Follow-up</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={appt.notes} onChange={e => fa("notes", e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAppt(false)}>Cancel</Button>
            <Button onClick={() => addAppt.mutate(appt)} disabled={addAppt.isPending || !appt.patient_id}>{addAppt.isPending ? "Saving…" : "Book"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!consulting} onOpenChange={v => { if (!v) { setConsulting(null); setConsult({ ...CONSULT_BLANK }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Consultation — {consulting?.patient_name || consulting?.patient_id}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1"><Label>Chief Complaint</Label><Input value={consult.chief_complaint} onChange={e => fc("chief_complaint", e.target.value)} /></div>
            <div className="space-y-1"><Label>Diagnosis</Label><Input value={consult.diagnosis} onChange={e => fc("diagnosis", e.target.value)} /></div>
            <div className="space-y-1"><Label>Prescription</Label><Textarea value={consult.prescription} onChange={e => fc("prescription", e.target.value)} rows={4} placeholder="Medications, dosage…" /></div>
            <div className="space-y-1"><Label>Next Visit</Label><Input type="date" value={consult.next_visit} onChange={e => fc("next_visit", e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConsulting(null)}>Cancel</Button>
            <Button onClick={() => updateAppt.mutate({ id: consulting.id, ...consult, status: "completed" })} disabled={updateAppt.isPending}>{updateAppt.isPending ? "Saving…" : "Complete"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBill} onOpenChange={v => { setShowBill(v); if (!v) setBill({ ...BILL_BLANK }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>OPD Bill</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 space-y-1"><Label>Patient ID</Label><Input value={bill.patient_id} onChange={e => fb("patient_id", e.target.value)} /></div>
            <div className="col-span-2 space-y-1"><Label>Doctor ID</Label><Input value={bill.doctor_id} onChange={e => fb("doctor_id", e.target.value)} /></div>
            <div className="space-y-1"><Label>Consultation (₹)</Label><Input type="number" value={bill.consultation_charge} onChange={e => fb("consultation_charge", e.target.value)} /></div>
            <div className="space-y-1"><Label>Procedures (₹)</Label><Input type="number" value={bill.procedure_charges} onChange={e => fb("procedure_charges", e.target.value)} /></div>
            <div className="space-y-1"><Label>Lab (₹)</Label><Input type="number" value={bill.lab_charges} onChange={e => fb("lab_charges", e.target.value)} /></div>
            <div className="space-y-1"><Label>Pharmacy (₹)</Label><Input type="number" value={bill.pharmacy_charges} onChange={e => fb("pharmacy_charges", e.target.value)} /></div>
            <div className="space-y-1"><Label>Discount (₹)</Label><Input type="number" value={bill.discount} onChange={e => fb("discount", e.target.value)} /></div>
            <div className="flex items-end"><p className="font-bold text-lg">Total: ₹{billTotal.toLocaleString("en-IN")}</p></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBill(false)}>Cancel</Button>
            <Button onClick={() => submitBill.mutate(bill)} disabled={submitBill.isPending || !bill.patient_id}>{submitBill.isPending ? "Saving…" : "Generate Bill"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
