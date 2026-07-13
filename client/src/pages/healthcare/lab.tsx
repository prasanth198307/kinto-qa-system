import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Plus, X, Download, CheckCircle } from "lucide-react";
import { useTenantConfig } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sample_collected: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const EMPTY_TEST = { name: "", category: "", price: "", turnaround_hours: "24", reference_range: "", unit: "" };
const EMPTY_ORDER = { patient_id: "", doctor_id: "", lab_test_id: "", priority: "routine", notes: "" };
const EMPTY_RESULT = { value: "", unit: "", flag: "normal", remarks: "" };

export default function LabPage() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const qc = useQueryClient();
  const [tab, setTab] = useState("orders");
  const [showTestForm, setShowTestForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [testForm, setTestForm] = useState({ ...EMPTY_TEST });
  const [orderForm, setOrderForm] = useState({ ...EMPTY_ORDER });
  const [enteringResult, setEnteringResult] = useState<any>(null);
  const [resultForm, setResultForm] = useState({ ...EMPTY_RESULT });

  const { data: tests = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/lab-tests"], queryFn: () => api("GET", "/api/healthcare/lab-tests") });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/lab/orders"], queryFn: () => api("GET", "/api/healthcare/lab/orders") });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"], queryFn: () => api("GET", "/api/healthcare/doctors") });

  const createTest = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/lab-tests", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/lab-tests"] }); setShowTestForm(false); setTestForm({ ...EMPTY_TEST }); },
  });

  const createOrder = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/lab/orders", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/lab/orders"] }); setShowOrderForm(false); setOrderForm({ ...EMPTY_ORDER }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/healthcare/lab/orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/lab/orders"] }),
  });

  const submitResult = useMutation({
    mutationFn: ({ id, b }: any) => api("POST", `/api/healthcare/lab/orders/${id}/results`, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/lab/orders"] }); setEnteringResult(null); setResultForm({ ...EMPTY_RESULT }); },
  });

  const tf = (k: string, v: string) => setTestForm(p => ({ ...p, [k]: v }));
  const of = (k: string, v: string) => setOrderForm(p => ({ ...p, [k]: v }));
  const rf = (k: string, v: string) => setResultForm(p => ({ ...p, [k]: v }));

  const testsArr = Array.isArray(tests) ? tests : [];
  const ordersArr = Array.isArray(orders) ? orders : [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6 text-purple-500" />Lab & Diagnostics</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Orders</p><p className="text-2xl font-bold">{ordersArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{ordersArr.filter((o: any) => o.status === "pending").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Processing</p><p className="text-2xl font-bold text-purple-600">{ordersArr.filter((o: any) => o.status === "processing").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Completed Today</p><p className="text-2xl font-bold text-green-600">{ordersArr.filter((o: any) => o.status === "completed").length}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orders">Lab Orders</TabsTrigger>
          <TabsTrigger value="tests">Test Master</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowOrderForm(true)}><Plus className="w-4 h-4 mr-1" />New Lab Order</Button>
          </div>

          {showOrderForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Lab Order</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowOrderForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Patient</Label>
                  <Select value={orderForm.patient_id} onValueChange={v => of("patient_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Referring Doctor</Label>
                  <Select value={orderForm.doctor_id} onValueChange={v => of("doctor_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{Array.isArray(doctors) && doctors.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Test</Label>
                  <Select value={orderForm.lab_test_id} onValueChange={v => of("lab_test_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                    <SelectContent>{testsArr.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name} — {sym}{t.price}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={orderForm.priority} onValueChange={v => of("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT (Emergency)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Clinical Notes</Label><Input value={orderForm.notes} onChange={e => of("notes", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowOrderForm(false)}>Cancel</Button>
                  <Button onClick={() => createOrder.mutate({ ...orderForm, patient_id: parseInt(orderForm.patient_id), doctor_id: parseInt(orderForm.doctor_id), lab_test_id: parseInt(orderForm.lab_test_id) })}>Create Order</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {ordersArr.map((o: any) => (
              <Card key={o.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{o.patient_name ?? `Patient #${o.patient_id}`}</p>
                      <p className="text-sm text-gray-600">{o.test_name ?? `Test #${o.lab_test_id}`} · Dr. {o.doctor_name ?? o.doctor_id}</p>
                      <p className="text-xs text-gray-500">Order #{o.id} · {o.created_at ? new Date(o.created_at).toLocaleDateString() : "Today"} · {o.priority}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={STATUS_COLOR[o.status] ?? "bg-gray-100"}>{o.status}</Badge>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {o.status === "pending" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: "sample_collected" })}>Collect Sample</Button>}
                        {o.status === "sample_collected" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: "processing" })}>Start Processing</Button>}
                        {o.status === "processing" && (
                          <Button size="sm" variant="outline" onClick={() => { setEnteringResult(o); setResultForm({ ...EMPTY_RESULT }); }}>
                            <CheckCircle className="w-3 h-3 mr-1" />Enter Result
                          </Button>
                        )}
                        {o.status === "completed" && (
                          <Button size="sm" variant="outline" onClick={() => window.open(`/api/healthcare/lab/orders/${o.id}/report`, "_blank")}>
                            <Download className="w-3 h-3 mr-1" />Report PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {enteringResult?.id === o.id && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 items-end">
                      <div><Label className="text-xs">Result Value</Label><Input value={resultForm.value} onChange={e => rf("value", e.target.value)} placeholder="e.g. 5.2" /></div>
                      <div><Label className="text-xs">Unit</Label><Input value={resultForm.unit} onChange={e => rf("unit", e.target.value)} placeholder="e.g. mg/dL" /></div>
                      <div><Label className="text-xs">Flag</Label>
                        <Select value={resultForm.flag} onValueChange={v => rf("flag", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High (H)</SelectItem>
                            <SelectItem value="low">Low (L)</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => submitResult.mutate({ id: o.id, b: resultForm })}>Save Result</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEnteringResult(null)}><X className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {ordersArr.length === 0 && <p className="text-center text-gray-400 py-8">No lab orders.</p>}
          </div>
        </TabsContent>

        <TabsContent value="tests" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTestForm(true)}><Plus className="w-4 h-4 mr-1" />Add Test</Button>
          </div>

          {showTestForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Add Lab Test</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTestForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Test Name</Label><Input value={testForm.name} onChange={e => tf("name", e.target.value)} placeholder="CBC, LFT, Blood Sugar..." /></div>
                <div><Label>Category</Label>
                  <Select value={testForm.category} onValueChange={v => tf("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Haematology", "Biochemistry", "Microbiology", "Serology", "Radiology", "Pathology", "Urine Analysis", "Hormone"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Price (₹)</Label><Input type="number" value={testForm.price} onChange={e => tf("price", e.target.value)} /></div>
                <div><Label>TAT (hours)</Label><Input type="number" value={testForm.turnaround_hours} onChange={e => tf("turnaround_hours", e.target.value)} /></div>
                <div><Label>Reference Range</Label><Input value={testForm.reference_range} onChange={e => tf("reference_range", e.target.value)} placeholder="e.g. 70-110" /></div>
                <div><Label>Unit</Label><Input value={testForm.unit} onChange={e => tf("unit", e.target.value)} placeholder="mg/dL, g/L..." /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowTestForm(false)}>Cancel</Button>
                  <Button onClick={() => createTest.mutate({ ...testForm, price: parseFloat(testForm.price || "0"), turnaround_hours: parseInt(testForm.turnaround_hours || "24") })}>Add</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-3">
            {testsArr.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="pt-4">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.category} · TAT: {t.turnaround_hours}h</p>
                  <p className="text-sm font-medium text-green-700 mt-1">{sym}{t.price}</p>
                  {t.reference_range && <p className="text-xs text-gray-400">Ref: {t.reference_range} {t.unit}</p>}
                </CardContent>
              </Card>
            ))}
            {testsArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-8 text-center">No tests in master. Add tests above.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
