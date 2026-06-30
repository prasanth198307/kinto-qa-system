import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Printer, XCircle, RefreshCw, Settings, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const SUPPLY_TYPES = ["Outward", "Inward", "Job Work", "Sub-contracting"];
const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship"];

export default function EWayBillPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    consignor_gstin: "", consignee_gstin: "", supply_type: "Outward", transport_mode: "Road",
    vehicle_no: "", distance: "", invoice_no: "", invoice_date: "", hsn: "", value: "", tax: "",
  });
  const [credForm, setCredForm] = useState({ gstin: "", username: "", password: "", apiMode: "sandbox" });
  const [credOpen, setCredOpen] = useState(false);
  const [generated, setGenerated] = useState<any>(null);

  const { data: ewbList = [] } = useQuery<any[]>({
    queryKey: ["manufacturing-eway-bills"],
    queryFn: () => api("GET", "/api/manufacturing/eway-bills").catch(() => []),
  });

  const { data: credentials } = useQuery<any>({
    queryKey: ["ewb-credentials"],
    queryFn: () => api("GET", "/api/manufacturing/eway-bills/credentials").catch(() => null),
  });

  const generateMutation = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/eway-bills/generate", {
      vehicleNumber: form.vehicle_no,
      transportMode: form.transport_mode === "Road" ? "1" : form.transport_mode === "Rail" ? "2" : form.transport_mode === "Air" ? "3" : "4",
      distanceKm: form.distance,
    }),
    onSuccess: (data) => {
      setGenerated(data?.eway_bill || data);
      qc.invalidateQueries({ queryKey: ["manufacturing-eway-bills"] });
      toast({ title: data?.live ? "E-Way Bill submitted to NIC GST portal!" : "E-Way Bill record saved (pending NIC credentials)", description: data?.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api("PATCH", `/api/manufacturing/eway-bills/${id}/cancel`, { cancelReason: 4, cancelRemarks: "Cancelled" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manufacturing-eway-bills"] }); toast({ title: "E-Way Bill cancelled" }); },
  });

  const extendMutation = useMutation({
    mutationFn: (id: string) => api("PUT", `/api/manufacturing/eway-bills/${id}/extend`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manufacturing-eway-bills"] }),
  });

  const credMutation = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/eway-bills/credentials", credForm),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ewb-credentials"] });
      setCredOpen(false);
      toast({ title: data?.warning ? "Credentials saved (check warning)" : "NIC EWB connected!", description: data?.message ?? data?.warning });
    },
  });

  const rows = ewbList;
  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const isConnected = credentials?.is_connected === true;

  const printEWB = (ewb: any) => {
    const html = `<html><body style="font-family:Arial;padding:40px">
      <h2>E-WAY BILL</h2>
      <p>EWB No: <strong>${ewb.ewb_number ?? ewb.ewb_no ?? "PENDING"}</strong></p>
      <p>From GSTIN: ${ewb.from_gstin ?? "—"} → To GSTIN: ${ewb.to_gstin ?? "—"}</p>
      <p>Vehicle: ${ewb.vehicle_number ?? "—"} | Mode: ${ewb.transport_mode ?? "—"}</p>
      <p>Value: ₹${ewb.total_value ?? "—"}</p>
      <p>Valid Upto: ${ewb.ewb_valid_until ?? ewb.valid_upto ?? "—"}</p>
      <p>Status: ${ewb.status}</p>
      </body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.print(); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">E-Way Bill Generator</h1>
        <Dialog open={credOpen} onOpenChange={setCredOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              {isConnected ? "NIC Connected" : "Connect NIC Portal"}
              {isConnected ? <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" /> : <AlertTriangle className="w-3 h-3 ml-1 text-yellow-500" />}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>NIC E-Way Bill API Credentials</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <Alert>
                <AlertDescription>
                  Register at <strong>einvoice1.gst.gov.in</strong> → E-Way Bill → API Registration.
                  Use Sandbox mode for testing.
                </AlertDescription>
              </Alert>
              <div><Label>GSTIN</Label><Input value={credForm.gstin} onChange={e => setCredForm(p => ({ ...p, gstin: e.target.value }))} placeholder="27AAAAA0000A1Z5" /></div>
              <div><Label>NIC Username</Label><Input value={credForm.username} onChange={e => setCredForm(p => ({ ...p, username: e.target.value }))} /></div>
              <div><Label>NIC Password</Label><Input type="password" value={credForm.password} onChange={e => setCredForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div>
                <Label>API Mode</Label>
                <Select value={credForm.apiMode} onValueChange={v => setCredForm(p => ({ ...p, apiMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production (Live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {credentials?.gstin && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Currently saved: <strong>{credentials.gstin}</strong> / {credentials.username} ({credentials.api_mode})
                  {isConnected && <span className="text-green-600 ml-2">● Connected</span>}
                </div>
              )}
              <Button className="w-full" onClick={() => credMutation.mutate()} disabled={!credForm.gstin || !credForm.username || !credForm.password || credMutation.isPending}>
                Save & Test Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            NIC EWB portal not connected. E-Way Bills are saved locally as <strong>pending</strong>.
            Click <strong>Connect NIC Portal</strong> above to enable live submission.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate EWB</TabsTrigger>
          <TabsTrigger value="list">EWB List ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader><CardTitle>New E-Way Bill</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Consignor GSTIN</Label><Input value={form.consignor_gstin} onChange={e => f("consignor_gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" /></div>
                <div><Label>Consignee GSTIN</Label><Input value={form.consignee_gstin} onChange={e => f("consignee_gstin", e.target.value)} placeholder="27BBBBB0000B1Z1" /></div>
                <div>
                  <Label>Supply Type</Label>
                  <Select value={form.supply_type} onValueChange={v => f("supply_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUPPLY_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transport Mode</Label>
                  <Select value={form.transport_mode} onValueChange={v => f("transport_mode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRANSPORT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle No</Label><Input value={form.vehicle_no} onChange={e => f("vehicle_no", e.target.value)} placeholder="MH12AB1234" /></div>
                <div><Label>Approx. Distance (km)</Label><Input type="number" value={form.distance} onChange={e => f("distance", e.target.value)} /></div>
                <div><Label>Invoice No</Label><Input value={form.invoice_no} onChange={e => f("invoice_no", e.target.value)} /></div>
                <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => f("invoice_date", e.target.value)} /></div>
                <div><Label>HSN Code</Label><Input value={form.hsn} onChange={e => f("hsn", e.target.value)} /></div>
                <div><Label>Invoice Value (₹)</Label><Input type="number" value={form.value} onChange={e => f("value", e.target.value)} /></div>
                <div><Label>Total Tax (₹)</Label><Input type="number" value={form.tax} onChange={e => f("tax", e.target.value)} /></div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <FileText className="w-4 h-4 mr-2" />
                  {generateMutation.isPending ? "Submitting..." : isConnected ? "Generate & Submit to NIC" : "Save E-Way Bill (Pending)"}
                </Button>
              </div>

              {generated && (
                <div className={`mt-4 p-4 border rounded ${generated.status === "generated" ? "bg-green-50 dark:bg-green-950" : "bg-yellow-50 dark:bg-yellow-950"}`}>
                  <div className={`font-bold ${generated.status === "generated" ? "text-green-700 dark:text-green-300" : "text-yellow-700"}`}>
                    {generated.status === "generated" ? "✅ E-Way Bill Generated on NIC Portal!" : "⏳ E-Way Bill Saved (Pending NIC submission)"}
                  </div>
                  {generated.ewb_number && <div>EWB No: <strong>{generated.ewb_number}</strong></div>}
                  {generated.ewb_valid_until && <div>Valid Upto: <strong>{new Date(generated.ewb_valid_until).toLocaleDateString("en-IN")}</strong></div>}
                  <div className="text-xs text-muted-foreground mt-1">Status: {generated.status}</div>
                  {generated.ewb_number && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => printEWB(generated)}>
                      <Printer className="w-3 h-3 mr-1" />Print EWB
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader><CardTitle>E-Way Bills</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EWB No</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>From GSTIN</TableHead>
                    <TableHead>To GSTIN</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Valid Upto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No E-Way Bills yet.</TableCell></TableRow>
                  ) : rows.map((ewb: any) => (
                    <TableRow key={ewb.id}>
                      <TableCell className="font-mono text-sm">{ewb.ewb_number ?? <span className="text-yellow-600 text-xs">PENDING</span>}</TableCell>
                      <TableCell className="text-xs">{ewb.doc_number ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{ewb.from_gstin ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{ewb.to_gstin ?? "—"}</TableCell>
                      <TableCell>{ewb.total_value ? `₹${Number(ewb.total_value).toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell>{ewb.ewb_valid_until ? new Date(ewb.ewb_valid_until).toLocaleDateString("en-IN") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ewb.status === "cancelled" ? "destructive" : ewb.status === "generated" ? "default" : "secondary"}>
                          {ewb.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => printEWB(ewb)}><Printer className="w-3 h-3" /></Button>
                          {ewb.status === "generated" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => extendMutation.mutate(ewb.id)}>
                                <RefreshCw className="w-3 h-3 mr-1" />Extend
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelMutation.mutate(ewb.id)}>
                                <XCircle className="w-3 h-3 mr-1" />Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
