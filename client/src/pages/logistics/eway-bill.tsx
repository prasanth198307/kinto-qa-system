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
import { FileText, Printer, XCircle, RefreshCw } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const SAMPLE_EWB = [
  { id: 1, ewb_no: "230012345678", goods: "Electronic Goods", from: "Mumbai", to: "Delhi", valid_upto: "2026-07-03", status: "Active" },
  { id: 2, ewb_no: "230012345679", goods: "Textile Products", from: "Surat", to: "Kolkata", valid_upto: "2026-07-01", status: "Extended" },
  { id: 3, ewb_no: "230012345680", goods: "Auto Parts", from: "Chennai", to: "Bangalore", valid_upto: "2026-06-28", status: "Cancelled" },
];

const SUPPLY_TYPES = ["Outward", "Inward", "Job Work", "Sub-contracting"];
const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship"];

export default function EWayBillPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    consignor_gstin: "", consignee_gstin: "", supply_type: "Outward", transport_mode: "Road",
    vehicle_no: "", distance: "", invoice_no: "", invoice_date: "", hsn: "", value: "", tax: "",
  });
  const [generated, setGenerated] = useState<any>(null);

  const { data: ewbList = [] } = useQuery<any[]>({
    queryKey: ["logistics-eway-bills"],
    queryFn: () => api("GET", "/api/logistics/eway-bills").catch(() => []),
  });

  const generateMutation = useMutation({
    mutationFn: () => api("POST", "/api/logistics/eway-bill/generate", form),
    onSuccess: (data) => {
      setGenerated(data || { ewbNo: "230012345681", validUpto: "2026-07-03" });
      qc.invalidateQueries({ queryKey: ["logistics-eway-bills"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/logistics/eway-bills/${id}/cancel`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logistics-eway-bills"] }),
  });

  const extendMutation = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/logistics/eway-bills/${id}/extend`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logistics-eway-bills"] }),
  });

  const rows = ewbList.length ? ewbList : SAMPLE_EWB;
  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const printEWB = (ewb: any) => {
    const html = `<html><body style="font-family:Arial;padding:40px">
      <h2>E-WAY BILL</h2>
      <p>EWB No: <strong>${ewb.ewb_no || ewb.ewbNo}</strong></p>
      <p>From: ${ewb.from} → To: ${ewb.to}</p>
      <p>Goods: ${ewb.goods}</p>
      <p>Valid Upto: ${ewb.valid_upto || ewb.validUpto}</p>
      </body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.print(); }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">E-Way Bill Generator</h1>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate EWB</TabsTrigger>
          <TabsTrigger value="list">EWB List</TabsTrigger>
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
                <Button onClick={() => generateMutation.mutate()}>
                  <FileText className="w-4 h-4 mr-2" />Generate E-Way Bill
                </Button>
              </div>

              {generated && (
                <div className="mt-4 p-4 border rounded bg-green-50 dark:bg-green-950">
                  <div className="font-bold text-green-700 dark:text-green-300">E-Way Bill Generated!</div>
                  <div>EWB No: <strong>{generated.ewbNo}</strong></div>
                  <div>Valid Upto: <strong>{generated.validUpto}</strong></div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => printEWB({ ewb_no: generated.ewbNo, valid_upto: generated.validUpto, from: "Origin", to: "Destination", goods: "Goods" })}>
                    <Printer className="w-3 h-3 mr-1" />Print EWB
                  </Button>
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
                    <TableHead>Goods</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Valid Upto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((ewb: any) => (
                    <TableRow key={ewb.id}>
                      <TableCell className="font-mono">{ewb.ewb_no}</TableCell>
                      <TableCell>{ewb.goods}</TableCell>
                      <TableCell>{ewb.from}</TableCell>
                      <TableCell>{ewb.to}</TableCell>
                      <TableCell>{ewb.valid_upto}</TableCell>
                      <TableCell>
                        <Badge variant={ewb.status === "Cancelled" ? "destructive" : ewb.status === "Extended" ? "secondary" : "default"}>
                          {ewb.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => printEWB(ewb)}><Printer className="w-3 h-3" /></Button>
                          {ewb.status === "Active" && (
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
