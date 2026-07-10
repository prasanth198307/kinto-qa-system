import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Ship, FileText, DollarSign, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const STATUS_COLOR: Record<string, string> = {
  booked: "bg-gray-100 text-gray-700",
  in_transit: "bg-blue-100 text-blue-700",
  customs_clearance: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  delayed: "bg-red-100 text-red-700",
};
const TRANSPORT_ICON: Record<string, string> = { sea: "🚢", air: "✈️", road: "🚛", rail: "🚂", courier: "📦" };
const DOC_TYPES = ["bill_of_lading", "commercial_invoice", "packing_list", "coo", "insurance_cert", "be_number", "iec_certificate", "msds"];

export default function SupplyChainPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [shipOpen, setShipOpen] = useState(false);
  const [landedOpen, setLandedOpen] = useState(false);
  const [docOpen, setDocOpen] = useState<number | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<number | null>(null);
  const [sForm, setSForm] = useState({ po_reference: "", shipment_no: "", origin_country: "", destination: "", mode_of_transport: "sea", vessel_flight: "", bl_no: "", awb_no: "", etd: "", eta: "", tracking_url: "", notes: "" });
  const [lForm, setLForm] = useState({ shipment_id: "", po_reference: "", freight_amount: "", insurance_amount: "", customs_duty: "", port_charges: "", cha_charges: "", other_charges: "", allocation_method: "value" });
  const [dForm, setDForm] = useState({ doc_type: "bill_of_lading", doc_no: "", doc_date: "", issuer: "" });

  const { data: shipments = [] } = useQuery<any[]>({ queryKey: ["shipments"], queryFn: () => fetch("/api/manufacturing/supply-chain/shipments").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: landedCosts = [] } = useQuery<any[]>({ queryKey: ["landed-costs"], queryFn: () => fetch("/api/manufacturing/supply-chain/landed-costs").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: importDocs = [] } = useQuery<any[]>({
    queryKey: ["import-docs", selectedShipment],
    queryFn: () => selectedShipment ? fetch(`/api/manufacturing/supply-chain/import-docs/${selectedShipment}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedShipment,
  });

  const totalFreight = (landedCosts as any[]).reduce((s: number, l: any) => s + Number(l.freight_amount || 0), 0);
  const totalDuty = (landedCosts as any[]).reduce((s: number, l: any) => s + Number(l.customs_duty || 0), 0);
  const totalLanded = (landedCosts as any[]).reduce((s: number, l: any) => s + Number(l.total_landed_cost || 0), 0);

  const addShipment = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/supply-chain/shipments", d),
    onSuccess: () => { toast({ title: "Shipment added" }); qc.invalidateQueries({ queryKey: ["shipments"] }); setShipOpen(false); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PATCH", `/api/manufacturing/supply-chain/shipments/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipments"] }); },
  });

  const addLandedCost = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/supply-chain/landed-costs", { ...d, freight_amount: Number(d.freight_amount || 0), insurance_amount: Number(d.insurance_amount || 0), customs_duty: Number(d.customs_duty || 0), port_charges: Number(d.port_charges || 0), cha_charges: Number(d.cha_charges || 0), other_charges: Number(d.other_charges || 0), shipment_id: d.shipment_id ? Number(d.shipment_id) : null }),
    onSuccess: () => { toast({ title: "Landed cost recorded · GL posted" }); qc.invalidateQueries({ queryKey: ["landed-costs"] }); setLandedOpen(false); },
  });

  const addDoc = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/supply-chain/import-docs", { ...d, shipment_id: selectedShipment }),
    onSuccess: () => { toast({ title: "Document added" }); qc.invalidateQueries({ queryKey: ["import-docs"] }); setDocOpen(null); },
  });

  const STATUS_OPTIONS = ["booked", "in_transit", "customs_clearance", "delivered", "delayed"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Supply Chain</h1>
          <p className="text-sm text-muted-foreground">Supplier shipment tracking · Import docs (BL/COO/CI/PL) · Landed cost with GL posting · Customs clearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLandedOpen(true)}><DollarSign className="h-3 w-3 mr-1" />Landed Cost</Button>
          <Button size="sm" onClick={() => setShipOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Shipment</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Shipments</p><p className="text-2xl font-bold">{(shipments as any[]).filter((s: any) => s.status !== "delivered").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Freight Cost</p><p className="text-xl font-bold text-blue-600">{fmt(totalFreight)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Customs Duty Paid</p><p className="text-xl font-bold text-amber-600">{fmt(totalDuty)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Landed Cost</p><p className="text-xl font-bold">{fmt(totalLanded)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList>
          <TabsTrigger value="shipments"><Ship className="h-3 w-3 mr-1" />Shipment Tracker</TabsTrigger>
          <TabsTrigger value="landed">Landed Cost Allocation</TabsTrigger>
          <TabsTrigger value="docs">Import Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments">
          <Table>
            <TableHeader><TableRow><TableHead>Shipment No</TableHead><TableHead>PO Ref</TableHead><TableHead>Mode</TableHead><TableHead>Origin</TableHead><TableHead>BL / AWB</TableHead><TableHead>ETD</TableHead><TableHead>ETA</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(shipments as any[]).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-semibold">{s.shipment_no || `SHP-${s.id}`}</TableCell>
                  <TableCell className="text-xs">{s.po_reference || "—"}</TableCell>
                  <TableCell className="text-center text-lg">{TRANSPORT_ICON[s.mode_of_transport] || "📦"}</TableCell>
                  <TableCell>{s.origin_country}</TableCell>
                  <TableCell className="font-mono text-xs">{s.bl_no || s.awb_no || "—"}</TableCell>
                  <TableCell className="text-xs">{s.etd ? new Date(s.etd).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell className={`text-xs ${s.status !== "delivered" && s.eta && new Date(s.eta) < new Date() ? "text-red-600 font-medium" : ""}`}>{s.eta ? new Date(s.eta).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>
                    <Select value={s.status} onValueChange={v => updateStatus.mutate({ id: s.id, status: v })}>
                      <SelectTrigger className={`h-7 text-xs w-36 ${STATUS_COLOR[s.status] || ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedShipment(s.id); setDocOpen(s.id); }} className="text-xs h-7"><FileText className="h-3 w-3" /></Button>
                      {s.tracking_url && <a href={s.tracking_url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" className="text-xs h-7"><ExternalLink className="h-3 w-3" /></Button></a>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(shipments as any[]).length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No shipments. Add a shipment to track global supply chain.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="landed" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            Landed cost = CIF value + customs duty + port charges + CHA + other. Each landed cost entry fires a GL journal: DR Inventory (1310) / CR Freight & Customs Payable (2210).
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Shipment</TableHead><TableHead>PO Ref</TableHead><TableHead className="text-right">Freight</TableHead><TableHead className="text-right">Insurance</TableHead><TableHead className="text-right">Customs</TableHead><TableHead className="text-right">Port</TableHead><TableHead className="text-right">CHA</TableHead><TableHead className="text-right">Total Landed</TableHead><TableHead>Method</TableHead><TableHead>GL</TableHead></TableRow></TableHeader>
            <TableBody>
              {(landedCosts as any[]).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.shipment_no || `SHP-${l.shipment_id}`}</TableCell>
                  <TableCell className="text-xs">{l.po_reference || "—"}</TableCell>
                  <TableCell className="text-right">{fmt(Number(l.freight_amount))}</TableCell>
                  <TableCell className="text-right">{fmt(Number(l.insurance_amount))}</TableCell>
                  <TableCell className="text-right">{fmt(Number(l.customs_duty))}</TableCell>
                  <TableCell className="text-right">{fmt(Number(l.port_charges))}</TableCell>
                  <TableCell className="text-right">{fmt(Number(l.cha_charges))}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(Number(l.total_landed_cost))}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{l.allocation_method}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${l.gl_posted ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{l.gl_posted ? "✓ Posted" : "Auto"}</Badge></TableCell>
                </TableRow>
              ))}
              {(landedCosts as any[]).length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No landed costs recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="docs" className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="w-64">
              <Label>Filter by Shipment</Label>
              <Select value={String(selectedShipment || "")} onValueChange={v => setSelectedShipment(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select shipment…" /></SelectTrigger>
                <SelectContent>{(shipments as any[]).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.shipment_no || `SHP-${s.id}`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedShipment && <Button size="sm" onClick={() => setDocOpen(selectedShipment)}><Plus className="h-3 w-3 mr-1" />Add Doc</Button>}
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Doc Type</TableHead><TableHead>Doc No</TableHead><TableHead>Date</TableHead><TableHead>Issuer</TableHead></TableRow></TableHeader>
            <TableBody>
              {(importDocs as any[]).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline" className="text-xs">{d.doc_type.replace(/_/g, " ").toUpperCase()}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{d.doc_no || "—"}</TableCell>
                  <TableCell className="text-xs">{d.doc_date ? new Date(d.doc_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell className="text-xs">{d.issuer || "—"}</TableCell>
                </TableRow>
              ))}
              {(importDocs as any[]).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">{selectedShipment ? "No documents for this shipment" : "Select a shipment to view documents"}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Supplier Shipment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>PO Reference</Label><Input value={sForm.po_reference} onChange={e => setSForm(f => ({ ...f, po_reference: e.target.value }))} placeholder="PO-2026-001" /></div>
            <div><Label>Shipment No</Label><Input value={sForm.shipment_no} onChange={e => setSForm(f => ({ ...f, shipment_no: e.target.value }))} placeholder="SHP-2026-001" /></div>
            <div><Label>Mode of Transport</Label>
              <Select value={sForm.mode_of_transport} onValueChange={v => setSForm(f => ({ ...f, mode_of_transport: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sea">🚢 Sea</SelectItem><SelectItem value="air">✈️ Air</SelectItem><SelectItem value="road">🚛 Road</SelectItem><SelectItem value="rail">🚂 Rail</SelectItem><SelectItem value="courier">📦 Courier</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Origin Country</Label><Input value={sForm.origin_country} onChange={e => setSForm(f => ({ ...f, origin_country: e.target.value }))} placeholder="China" /></div>
            <div><Label>BL / MBL No</Label><Input value={sForm.bl_no} onChange={e => setSForm(f => ({ ...f, bl_no: e.target.value }))} className="font-mono" /></div>
            <div><Label>AWB No</Label><Input value={sForm.awb_no} onChange={e => setSForm(f => ({ ...f, awb_no: e.target.value }))} className="font-mono" /></div>
            <div><Label>ETD</Label><Input type="date" value={sForm.etd} onChange={e => setSForm(f => ({ ...f, etd: e.target.value }))} /></div>
            <div><Label>ETA</Label><Input type="date" value={sForm.eta} onChange={e => setSForm(f => ({ ...f, eta: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Tracking URL (optional)</Label><Input value={sForm.tracking_url} onChange={e => setSForm(f => ({ ...f, tracking_url: e.target.value }))} placeholder="https://track.maersk.com/…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipOpen(false)}>Cancel</Button>
            <Button onClick={() => addShipment.mutate(sForm)} disabled={!sForm.origin_country || addShipment.isPending}>Add Shipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={landedOpen} onOpenChange={setLandedOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Landed Cost</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Shipment</Label>
              <Select value={lForm.shipment_id} onValueChange={v => setLForm(f => ({ ...f, shipment_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Link shipment (optional)" /></SelectTrigger>
                <SelectContent>{(shipments as any[]).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.shipment_no || `SHP-${s.id}`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>PO Reference</Label><Input value={lForm.po_reference} onChange={e => setLForm(f => ({ ...f, po_reference: e.target.value }))} /></div>
            {[
              ["Freight (₹)", "freight_amount"],
              ["Insurance (₹)", "insurance_amount"],
              ["Customs Duty (₹)", "customs_duty"],
              ["Port Charges (₹)", "port_charges"],
              ["CHA Charges (₹)", "cha_charges"],
              ["Other (₹)", "other_charges"],
            ].map(([label, key]) => (
              <div key={key}><Label>{label}</Label><Input type="number" value={(lForm as any)[key]} onChange={e => setLForm(f => ({ ...f, [key]: e.target.value }))} /></div>
            ))}
            <div><Label>Allocation Method</Label>
              <Select value={lForm.allocation_method} onValueChange={v => setLForm(f => ({ ...f, allocation_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="value">By Value</SelectItem><SelectItem value="weight">By Weight</SelectItem><SelectItem value="quantity">By Quantity</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLandedOpen(false)}>Cancel</Button>
            <Button onClick={() => addLandedCost.mutate(lForm)} disabled={addLandedCost.isPending}>
              {addLandedCost.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Record + Post GL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {docOpen !== null && (
        <Dialog open onOpenChange={() => setDocOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Import Document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Document Type</Label>
                <Select value={dForm.doc_type} onValueChange={v => setDForm(f => ({ ...f, doc_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Document No</Label><Input value={dForm.doc_no} onChange={e => setDForm(f => ({ ...f, doc_no: e.target.value }))} /></div>
              <div><Label>Document Date</Label><Input type="date" value={dForm.doc_date} onChange={e => setDForm(f => ({ ...f, doc_date: e.target.value }))} /></div>
              <div><Label>Issuer / Issuing Bank</Label><Input value={dForm.issuer} onChange={e => setDForm(f => ({ ...f, issuer: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocOpen(null)}>Cancel</Button>
              <Button onClick={() => addDoc.mutate(dForm)} disabled={!dForm.doc_type || addDoc.isPending}>Add Document</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
