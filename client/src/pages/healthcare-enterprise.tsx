import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const apiRequest = async (method: string, url: string, body?: any) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function OPDTab() {
  const [f, setF] = useState({ patient_id: "", doctor_id: "", consultation_charge: "", procedure_charges: "", lab_charges: "", pharmacy_charges: "", discount: "" });
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: bills = [] } = useQuery({ queryKey: ["/api/healthcare/opd/bills"], queryFn: () => apiRequest("GET", "/api/healthcare/opd/bills") });
  const qc = useQueryClient();
  const submit = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/healthcare/opd/bill", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/opd/bills"] }) });
  const total = ["consultation_charge","procedure_charges","lab_charges","pharmacy_charges"].reduce((s, k) => s + Number((f as any)[k] || 0), 0) - Number(f.discount || 0);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">New OPD Bill</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Patient ID" value={f.patient_id} onChange={e => setF({ ...f, patient_id: e.target.value })} />
          <Input placeholder="Doctor ID" value={f.doctor_id} onChange={e => setF({ ...f, doctor_id: e.target.value })} />
          <Input placeholder="Consultation" value={f.consultation_charge} onChange={e => setF({ ...f, consultation_charge: e.target.value })} />
          <Input placeholder="Procedures" value={f.procedure_charges} onChange={e => setF({ ...f, procedure_charges: e.target.value })} />
          <Input placeholder="Lab" value={f.lab_charges} onChange={e => setF({ ...f, lab_charges: e.target.value })} />
          <Input placeholder="Pharmacy" value={f.pharmacy_charges} onChange={e => setF({ ...f, pharmacy_charges: e.target.value })} />
          <Input placeholder="Discount" value={f.discount} onChange={e => setF({ ...f, discount: e.target.value })} />
          <div className="flex items-center text-sm font-semibold">Total: {sym}{fmt(total)}</div>
          <Button onClick={() => submit.mutate(f)}>Submit Bill</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Bill No</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{bills.map((b: any) => <TableRow key={b.id}><TableCell>{b.bill_number}</TableCell><TableCell>{b.patient_name}</TableCell><TableCell>{b.doctor_name}</TableCell><TableCell>{sym}{fmt(b.total_amount)}</TableCell><TableCell><Badge>{b.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function IPDTab() {
  const { data: admissions = [] } = useQuery({ queryKey: ["/api/healthcare/ipd/admissions"], queryFn: () => apiRequest("GET", "/api/healthcare/ipd/admissions") });
  const [selected, setSelected] = useState<any>(null);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [chargeForm, setChargeForm] = useState({ charge_type: "", description: "", quantity: "1", unit_price: "" });
  const [showDialog, setShowDialog] = useState(false);
  const qc = useQueryClient();
  const addCharge = useMutation({ mutationFn: (d: any) => apiRequest("POST", `/api/healthcare/ipd/${selected?.id}/bill/add-charge`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd/admissions"] }); setShowDialog(false); } });
  const finalize = useMutation({ mutationFn: (id: any) => apiRequest("POST", `/api/healthcare/ipd/${id}/bill/finalize`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ipd/admissions"] }) });
  return (
    <div className="space-y-4">
      <Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Ward</TableHead><TableHead>Bed</TableHead><TableHead>Admitted</TableHead><TableHead>Bill Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{admissions.map((a: any) => <TableRow key={a.id}><TableCell>{a.patient_name}</TableCell><TableCell>{a.ward_name}</TableCell><TableCell>{a.bed_number}</TableCell><TableCell>{a.admission_date}</TableCell><TableCell>{sym}{fmt(a.current_bill_total)}</TableCell>
          <TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setSelected(a); setShowDialog(true); }}>Add Charge</Button><Button size="sm" onClick={() => finalize.mutate(a.id)}>Finalize</Button></TableCell></TableRow>)}</TableBody>
      </Table>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Charge</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Charge Type" value={chargeForm.charge_type} onChange={e => setChargeForm({ ...chargeForm, charge_type: e.target.value })} />
            <Input placeholder="Description" value={chargeForm.description} onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })} />
            <Input placeholder="Quantity" value={chargeForm.quantity} onChange={e => setChargeForm({ ...chargeForm, quantity: e.target.value })} />
            <Input placeholder="Unit Price" value={chargeForm.unit_price} onChange={e => setChargeForm({ ...chargeForm, unit_price: e.target.value })} />
            <Button onClick={() => addCharge.mutate(chargeForm)}>Add Charge</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BedsTab() {
  const { data: beds = [] } = useQuery({ queryKey: ["/api/healthcare/beds"], queryFn: () => apiRequest("GET", "/api/healthcare/beds") });
  const [ward, setWard] = useState("all");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const qc = useQueryClient();
  const release = useMutation({ mutationFn: (id: any) => apiRequest("POST", `/api/healthcare/beds/${id}/release`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }) });
  const wards = [...new Set(beds.map((b: any) => b.ward_name))];
  const filtered = ward === "all" ? beds : beds.filter((b: any) => b.ward_name === ward);
  const color = (s: string) => s === "available" ? "bg-green-50 border-green-300" : s === "occupied" ? "bg-red-50 border-red-300" : "bg-yellow-50 border-yellow-300";
  return (
    <div className="space-y-3">
      <Select value={ward} onValueChange={setWard}><SelectTrigger className="w-40"><SelectValue placeholder="All Wards" /></SelectTrigger><SelectContent><SelectItem value="all">All Wards</SelectItem>{wards.map((w: any) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select>
      <div className="grid grid-cols-6 gap-2">
        {filtered.map((b: any) => (
          <div key={b.id} className={`p-2 border rounded text-xs text-center ${color(b.status)}`}>
            <div className="font-semibold">Bed {b.bed_number}</div>
            <div>{b.ward_name}</div>
            <Badge variant="outline" className="text-xs mt-1">{b.status}</Badge>
            {b.status === "occupied" && <Button size="sm" className="h-5 text-xs mt-1 w-full" onClick={() => release.mutate(b.id)}>Release</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OTTab() {
  const { data: schedule = [] } = useQuery({ queryKey: ["/api/healthcare/ot/schedule"], queryFn: () => apiRequest("GET", "/api/healthcare/ot/schedule") });
  const [f, setF] = useState({ patient_id: "", surgery_name: "", surgeon_id: "", scheduled_date: "", scheduled_time: "", estimated_duration_mins: "", anesthesia_type: "" });
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const qc = useQueryClient();
  const book = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/healthcare/ot/schedule", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/ot/schedule"] }) });
  const statusColor: Record<string, any> = { scheduled: "secondary", in_progress: "default", completed: "outline" };
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Book OT</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Patient ID" value={f.patient_id} onChange={e => setF({ ...f, patient_id: e.target.value })} />
          <Input placeholder="Surgery Name" value={f.surgery_name} onChange={e => setF({ ...f, surgery_name: e.target.value })} />
          <Input placeholder="Surgeon ID" value={f.surgeon_id} onChange={e => setF({ ...f, surgeon_id: e.target.value })} />
          <Input type="date" value={f.scheduled_date} onChange={e => setF({ ...f, scheduled_date: e.target.value })} />
          <Input type="time" value={f.scheduled_time} onChange={e => setF({ ...f, scheduled_time: e.target.value })} />
          <Input placeholder="Duration (mins)" value={f.estimated_duration_mins} onChange={e => setF({ ...f, estimated_duration_mins: e.target.value })} />
          <Input placeholder="Anesthesia" value={f.anesthesia_type} onChange={e => setF({ ...f, anesthesia_type: e.target.value })} />
          <Button onClick={() => book.mutate(f)}>Book OT</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Surgery</TableHead><TableHead>Surgeon</TableHead><TableHead>Date/Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{schedule.map((s: any) => <TableRow key={s.id}><TableCell>{s.patient_name}</TableCell><TableCell>{s.surgery_name}</TableCell><TableCell>{s.surgeon_name}</TableCell><TableCell>{s.scheduled_date} {s.scheduled_time}</TableCell><TableCell><Badge variant={statusColor[s.status] || "secondary"}>{s.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function LabTab() {
  const { data: pending = [] } = useQuery({ queryKey: ["/api/healthcare/lab/orders/pending"], queryFn: () => apiRequest("GET", "/api/healthcare/lab/orders/pending") });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [rf, setRf] = useState({ result_value: "", normal_range: "", is_critical: false });
  const qc = useQueryClient();
  const enter = useMutation({ mutationFn: ({ orderId, d }: any) => apiRequest("POST", `/api/healthcare/lab/orders/${orderId}/results`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/lab/orders/pending"] }); setSelectedOrder(null); } });
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-semibold text-sm mb-2">Pending Orders</h3>
        <div className="space-y-2">
          {pending.map((o: any) => (
            <div key={o.id} className="flex justify-between items-center border rounded p-2 text-sm">
              <div><div>{o.test_name}</div><div className="text-xs text-gray-500">{o.patient_name}</div></div>
              <Button size="sm" onClick={() => setSelectedOrder(o)}>Enter Results</Button>
            </div>
          ))}
        </div>
      </div>
      {selectedOrder && (
        <Card><CardHeader><CardTitle className="text-sm">{selectedOrder.test_name}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Result Value" value={rf.result_value} onChange={e => setRf({ ...rf, result_value: e.target.value })} />
            <Input placeholder="Normal Range" value={rf.normal_range} onChange={e => setRf({ ...rf, normal_range: e.target.value })} />
            <div className="flex items-center gap-2"><input type="checkbox" checked={rf.is_critical} onChange={e => setRf({ ...rf, is_critical: e.target.checked })} /><span className="text-sm">Critical</span></div>
            <Button onClick={() => enter.mutate({ orderId: selectedOrder.id, d: rf })}>Save Results</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsuranceTab() {
  const [pf, setPf] = useState({ patient_id: "", insurance_company: "", policy_number: "", sum_insured: "", valid_to: "" });
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: claims = [] } = useQuery({ queryKey: ["/api/healthcare/tpa/claims"], queryFn: () => apiRequest("GET", "/api/healthcare/tpa/claims") });
  const qc = useQueryClient();
  const addPolicy = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/healthcare/insurance/policy", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/tpa/claims"] }) });
  const statusColor: Record<string, any> = { pending: "secondary", approved: "default", settled: "outline", submitted: "secondary" };
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Add Insurance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Patient ID" value={pf.patient_id} onChange={e => setPf({ ...pf, patient_id: e.target.value })} />
          <Input placeholder="Insurance Co." value={pf.insurance_company} onChange={e => setPf({ ...pf, insurance_company: e.target.value })} />
          <Input placeholder="Policy No." value={pf.policy_number} onChange={e => setPf({ ...pf, policy_number: e.target.value })} />
          <Input placeholder="Sum Insured" value={pf.sum_insured} onChange={e => setPf({ ...pf, sum_insured: e.target.value })} />
          <Input type="date" value={pf.valid_to} onChange={e => setPf({ ...pf, valid_to: e.target.value })} />
          <Button onClick={() => addPolicy.mutate(pf)}>Add Policy</Button>
        </CardContent>
      </Card>
      <h3 className="font-semibold text-sm">TPA Claims</h3>
      <Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Pre-Auth</TableHead><TableHead>Claim</TableHead><TableHead>Approved</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{claims.map((c: any) => <TableRow key={c.id}><TableCell>{c.patient_name}</TableCell><TableCell>{sym}{fmt(c.pre_auth_amount)}</TableCell><TableCell>{sym}{fmt(c.claim_amount)}</TableCell><TableCell>{sym}{fmt(c.approved_amount)}</TableCell><TableCell><Badge variant={statusColor[c.status] || "secondary"}>{c.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function BloodBankTab() {
  const { data: inventory = [] } = useQuery({ queryKey: ["/api/healthcare/blood-bank/stock"], queryFn: () => apiRequest("GET", "/api/healthcare/blood-bank/stock") });
  const [sf, setSf] = useState({ blood_group: "A+", component: "Whole Blood", units_available: "", donor_name: "", expiry_date: "" });
  const qc = useQueryClient();
  const addStock = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/healthcare/blood-bank/stock", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/blood-bank/stock"] }) });
  const groups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-8 gap-2">
        {groups.map(g => { const inv = inventory.find((i: any) => i.blood_group === g); return <Card key={g} className="text-center"><CardContent className="pt-3 pb-2"><div className="font-bold text-lg text-red-600">{g}</div><div className="text-2xl font-bold">{inv?.units_available || 0}</div><div className="text-xs text-gray-500">units</div></CardContent></Card>; })}
      </div>
      <Card><CardHeader><CardTitle className="text-sm">Add Stock</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Select value={sf.blood_group} onValueChange={v => setSf({ ...sf, blood_group: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Donor Name" value={sf.donor_name} onChange={e => setSf({ ...sf, donor_name: e.target.value })} />
          <Input placeholder="Units" value={sf.units_available} onChange={e => setSf({ ...sf, units_available: e.target.value })} />
          <Input type="date" value={sf.expiry_date} onChange={e => setSf({ ...sf, expiry_date: e.target.value })} />
          <Button onClick={() => addStock.mutate(sf)}>Add Stock</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthReportsTab() {
  const [type, setType] = useState("daily-census"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [data, setData] = useState<any[]>([]);
  const fetch = async () => { try { const r = await apiRequest("GET", `/api/healthcare/reports/${type}?from=${from}&to=${to}`); setData(Array.isArray(r) ? r : r.data || []); } catch { setData([]); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{["daily-census","revenue-by-dept","bed-occupancy","doctor-revenue","tpa-outstanding"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        <Button onClick={fetch}>Fetch</Button>
      </div>
      {data.length > 0 && <Table><TableHeader><TableRow>{Object.keys(data[0]).map(k => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader><TableBody>{data.map((row, i) => <TableRow key={i}>{Object.values(row).map((v: any, j) => <TableCell key={j}>{String(v)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </div>
  );
}

export default function HealthcareEnterprisePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Healthcare Enterprise</h1>
      <Tabs defaultValue="opd">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          {[["opd","OPD"],["ipd","IPD"],["beds","Beds"],["ot","OT"],["lab","Lab"],["insurance","Insurance"],["bloodbank","Blood Bank"],["reports","Reports"]].map(([v,l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="opd"><OPDTab /></TabsContent>
        <TabsContent value="ipd"><IPDTab /></TabsContent>
        <TabsContent value="beds"><BedsTab /></TabsContent>
        <TabsContent value="ot"><OTTab /></TabsContent>
        <TabsContent value="lab"><LabTab /></TabsContent>
        <TabsContent value="insurance"><InsuranceTab /></TabsContent>
        <TabsContent value="bloodbank"><BloodBankTab /></TabsContent>
        <TabsContent value="reports"><HealthReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
