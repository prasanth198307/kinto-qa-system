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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, BedDouble, LogOut, PlusCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const ADMIT_BLANK = { patient_id: "", doctor_id: "", ward: "", bed_id: "", admission_type: "general", notes: "" };
const CHARGE_BLANK = { description: "", amount: "" };

export default function IPDPage() {
  const qc = useQueryClient();
  const [showAdmit, setShowAdmit] = useState(false);
  const [admit, setAdmit] = useState({ ...ADMIT_BLANK });
  const [chargeFor, setChargeFor] = useState<any>(null);
  const [charge, setCharge] = useState({ ...CHARGE_BLANK });
  const [discharging, setDischarging] = useState<any>(null);
  const [payment, setPayment] = useState("");

  const { data: admissions = [] } = useQuery({
    queryKey: ["/api/healthcare/ipd/admissions"],
    queryFn: () => api("GET", "/api/healthcare/ipd/admissions").then(d => Array.isArray(d) ? d : []),
  });

  const addAdmission = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/ipd/admissions", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd/admissions"] }); setShowAdmit(false); setAdmit({ ...ADMIT_BLANK }); },
  });

  const addCharge = useMutation({
    mutationFn: ({ id, ...d }: any) => api("POST", `/api/healthcare/ipd/${id}/bill/add-charge`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd/admissions"] }); setChargeFor(null); setCharge({ ...CHARGE_BLANK }); },
  });

  const discharge = useMutation({
    mutationFn: ({ id, ...d }: any) => api("PUT", `/api/healthcare/ipd/${id}/discharge`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd/admissions"] }); setDischarging(null); setPayment(""); },
  });

  const finalize = useMutation({
    mutationFn: ({ id, ...d }: any) => api("PUT", `/api/healthcare/ipd/${id}/bill/finalize`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd/admissions"] }); setDischarging(null); setPayment(""); },
  });

  const fa = (k: string, v: string) => setAdmit(p => ({ ...p, [k]: v }));
  const days = (d: string) => { if (!d) return 0; return Math.max(1, Math.ceil((Date.now() - new Date(d).getTime()) / 86400000)); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">IPD — In-Patient Department</h1>
          <Badge variant="secondary">{admissions.filter((a: any) => a.status !== "discharged").length} admitted</Badge>
        </div>
        <Button onClick={() => setShowAdmit(true)}><Plus className="h-4 w-4 mr-1" /> Admit Patient</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Bed</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Admitted</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No current admissions</TableCell></TableRow>}
              {admissions.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.patient_name || a.patient_id}</TableCell>
                  <TableCell>{a.bed_number || a.bed_id || "—"}</TableCell>
                  <TableCell>{a.ward || "—"}</TableCell>
                  <TableCell>{a.doctor_name || a.doctor_id || "—"}</TableCell>
                  <TableCell className="text-xs">{a.admission_date ? new Date(a.admission_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{days(a.admission_date)}d</TableCell>
                  <TableCell>₹{Number(a.total_bill || a.bill_amount || 0).toLocaleString("en-IN")}</TableCell>
                  <TableCell><Badge variant={a.status === "discharged" ? "secondary" : "default"} className="capitalize">{a.status || "admitted"}</Badge></TableCell>
                  <TableCell>
                    {a.status !== "discharged" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setChargeFor(a); setCharge({ ...CHARGE_BLANK }); }}>
                          <PlusCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setDischarging(a); setPayment(""); }}>
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdmit} onOpenChange={v => { setShowAdmit(v); if (!v) setAdmit({ ...ADMIT_BLANK }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Admit Patient</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 space-y-1"><Label>Patient ID</Label><Input value={admit.patient_id} onChange={e => fa("patient_id", e.target.value)} /></div>
            <div className="col-span-2 space-y-1"><Label>Doctor ID</Label><Input value={admit.doctor_id} onChange={e => fa("doctor_id", e.target.value)} /></div>
            <div className="space-y-1"><Label>Ward</Label>
              <Select value={admit.ward} onValueChange={v => fa("ward", v)}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {["General","ICU","Semi-Private","Private","Maternity"].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Bed ID</Label><Input value={admit.bed_id} onChange={e => fa("bed_id", e.target.value)} placeholder="Bed ID" /></div>
            <div className="col-span-2 space-y-1"><Label>Admission Type</Label>
              <Select value={admit.admission_type} onValueChange={v => fa("admission_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="surgery">Surgery</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={admit.notes} onChange={e => fa("notes", e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAdmit(false)}>Cancel</Button>
            <Button onClick={() => addAdmission.mutate(admit)} disabled={addAdmission.isPending || !admit.patient_id}>{addAdmission.isPending ? "Admitting…" : "Admit"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chargeFor} onOpenChange={v => { if (!v) { setChargeFor(null); setCharge({ ...CHARGE_BLANK }); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Charge — {chargeFor?.patient_name || chargeFor?.patient_id}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1"><Label>Description</Label><Input value={charge.description} onChange={e => setCharge(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Amount (₹)</Label><Input type="number" value={charge.amount} onChange={e => setCharge(p => ({ ...p, amount: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setChargeFor(null)}>Cancel</Button>
            <Button onClick={() => addCharge.mutate({ id: chargeFor.id, ...charge })} disabled={addCharge.isPending || !charge.description}>{addCharge.isPending ? "Adding…" : "Add Charge"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!discharging} onOpenChange={v => { if (!v) { setDischarging(null); setPayment(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Discharge — {discharging?.patient_name || discharging?.patient_id}</DialogTitle></DialogHeader>
          {discharging && (
            <div className="space-y-3 mt-2">
              <Card className="bg-gray-50"><CardContent className="p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Total Bill</span><span className="font-bold">₹{Number(discharging.total_bill || discharging.bill_amount || 0).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-gray-500"><span>Days</span><span>{days(discharging.admission_date)}</span></div>
              </CardContent></Card>
              <div className="space-y-1"><Label>Payment Collected (₹)</Label><Input type="number" value={payment} onChange={e => setPayment(e.target.value)} placeholder="Amount" /></div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { finalize.mutate({ id: discharging?.id, payment_amount: payment }); }} disabled={finalize.isPending}>Finalize Bill</Button>
            <Button variant="destructive" onClick={() => discharge.mutate({ id: discharging?.id, payment_amount: payment })} disabled={discharge.isPending}>{discharge.isPending ? "Discharging…" : "Discharge"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
