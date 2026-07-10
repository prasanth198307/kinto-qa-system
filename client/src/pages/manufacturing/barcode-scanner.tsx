import { useState, useRef } from "react";
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
import { ScanLine, Search, Plus, Package, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MOVE_TYPES = ["grn_receive", "issue_to_production", "stock_transfer", "dispatch", "stock_adjustment"];
const MOVE_COLOR: Record<string, string> = {
  grn_receive: "bg-green-100 text-green-700",
  issue_to_production: "bg-blue-100 text-blue-700",
  stock_transfer: "bg-purple-100 text-purple-700",
  dispatch: "bg-orange-100 text-orange-700",
  stock_adjustment: "bg-gray-100 text-gray-700",
};

export default function BarcodeScannerPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanCode, setScanCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [looking, setLooking] = useState(false);
  const [moveForm, setMoveForm] = useState({ barcode: "", quantity: "1", movement_type: "grn_receive", from_location: "", to_location: "", reference_no: "" });
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({ barcode: "", item_type: "raw_material", item_id: "", item_name: "" });

  const { data: movements = [] } = useQuery<any[]>({ queryKey: ["barcode-movements"], queryFn: () => fetch("/api/manufacturing/barcode/movements").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: registry = [] } = useQuery<any[]>({ queryKey: ["barcode-registry"], queryFn: () => fetch("/api/manufacturing/barcode/registry").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const lookup = async (code?: string) => {
    const c = code || scanCode;
    if (!c) return;
    setLooking(true);
    const data = await fetch(`/api/manufacturing/barcode/lookup?code=${encodeURIComponent(c)}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
    setLookupResult(data);
    if (data.found) toast({ title: `Found: ${data.item?.item_name || data.item?.barcode_match}` });
    else toast({ title: "Barcode not found", variant: "destructive" });
    setLooking(false);
  };

  const recordMove = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/barcode/stock-move", { ...d, quantity: Number(d.quantity) }),
    onSuccess: () => { toast({ title: "Stock movement recorded" }); qc.invalidateQueries({ queryKey: ["barcode-movements"] }); setMoveForm(f => ({ ...f, barcode: "", quantity: "1", reference_no: "" })); },
  });

  const grnScan = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/barcode/grn-scan", { ...d, quantity: Number(d.quantity) }),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["barcode-movements"] }); },
  });

  const registerBarcode = useMutation({
    mutationFn: (d: any) => api("POST", "/api/manufacturing/barcode/register", { ...d, item_id: Number(d.item_id) }),
    onSuccess: () => { toast({ title: "Barcode registered" }); qc.invalidateQueries({ queryKey: ["barcode-registry"] }); setRegisterOpen(false); },
  });

  const handleScanEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { lookup(scanCode); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barcode / QR Scanner</h1>
          <p className="text-sm text-muted-foreground">GRN barcode scan · Stock movement tracking · Item registry · Keyboard wedge scanner compatible</p>
        </div>
        <Button size="sm" onClick={() => setRegisterOpen(true)}><Plus className="h-3 w-3 mr-1" />Register Barcode</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Movements</p><p className="text-2xl font-bold">{(movements as any[]).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Registered Barcodes</p><p className="text-2xl font-bold">{(registry as any[]).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Today's Scans</p><p className="text-2xl font-bold">{(movements as any[]).filter((m: any) => m.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan"><ScanLine className="h-3 w-3 mr-1" />Scan & Lookup</TabsTrigger>
          <TabsTrigger value="grn">GRN Receipt Scan</TabsTrigger>
          <TabsTrigger value="move">Stock Movement</TabsTrigger>
          <TabsTrigger value="log">Movement Log</TabsTrigger>
          <TabsTrigger value="registry">Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Barcode / QR Lookup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Scan or type barcode / item code</Label>
                  <Input
                    ref={scanRef}
                    value={scanCode}
                    onChange={e => setScanCode(e.target.value)}
                    onKeyDown={handleScanEnter}
                    placeholder="Scan barcode or type item code…"
                    autoFocus
                    className="font-mono text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Press Enter or click Search. Supports USB barcode scanner (keyboard wedge mode).</p>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => lookup()} disabled={!scanCode || looking}>
                    {looking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                    Search
                  </Button>
                </div>
              </div>
              {lookupResult && (
                <div className={`rounded border p-4 ${lookupResult.found ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  {lookupResult.found ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-green-700" />
                        <span className="font-bold text-green-800">{lookupResult.item?.item_name || "Item found"}</span>
                        <Badge className="bg-green-100 text-green-700">{lookupResult.item?.item_type}</Badge>
                      </div>
                      <div className="text-sm text-green-700 grid grid-cols-2 gap-1 mt-2">
                        <span>Item ID: {lookupResult.item?.item_id || lookupResult.item?.id}</span>
                        <span>Source: {lookupResult.source}</span>
                        <span>Barcode: <span className="font-mono">{lookupResult.item?.barcode || lookupResult.item?.barcode_match}</span></span>
                      </div>
                      <Button size="sm" className="mt-2" onClick={() => { setMoveForm(f => ({ ...f, barcode: scanCode })); }}>
                        <ArrowRight className="h-3 w-3 mr-1" />Log Movement for this Item
                      </Button>
                    </div>
                  ) : (
                    <p className="text-red-700">{lookupResult.message} — <button className="underline" onClick={() => { setRegForm(f => ({ ...f, barcode: scanCode })); setRegisterOpen(true); }}>Register this barcode</button></p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grn" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">GRN Receipt — Barcode Scan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Scan each item on inbound delivery to auto-update GRN received quantity.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Barcode / Item Code</Label><Input value={moveForm.barcode} onChange={e => setMoveForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Scan or type…" className="font-mono" /></div>
                <div><Label>Quantity Received</Label><Input type="number" value={moveForm.quantity} onChange={e => setMoveForm(f => ({ ...f, quantity: e.target.value }))} min="0.001" step="0.001" /></div>
                <div><Label>GRN Reference (optional)</Label><Input value={moveForm.reference_no} onChange={e => setMoveForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="GRN-2026-001" /></div>
                <div><Label>Receiving Location</Label><Input value={moveForm.to_location} onChange={e => setMoveForm(f => ({ ...f, to_location: e.target.value }))} placeholder="Warehouse A / Bin 3" /></div>
              </div>
              <Button onClick={() => grnScan.mutate({ barcode: moveForm.barcode, quantity: moveForm.quantity, grn_id: moveForm.reference_no?.replace("GRN-", "") || null, location: moveForm.to_location })} disabled={!moveForm.barcode || grnScan.isPending}>
                {grnScan.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Record GRN Receipt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="move" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Log Stock Movement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Barcode</Label><Input value={moveForm.barcode} onChange={e => setMoveForm(f => ({ ...f, barcode: e.target.value }))} className="font-mono" /></div>
                <div><Label>Quantity</Label><Input type="number" value={moveForm.quantity} onChange={e => setMoveForm(f => ({ ...f, quantity: e.target.value }))} min="0.001" step="0.001" /></div>
                <div><Label>Movement Type</Label>
                  <Select value={moveForm.movement_type} onValueChange={v => setMoveForm(f => ({ ...f, movement_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOVE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Reference</Label><Input value={moveForm.reference_no} onChange={e => setMoveForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="WO-001 / GRN-001" /></div>
                <div><Label>From Location</Label><Input value={moveForm.from_location} onChange={e => setMoveForm(f => ({ ...f, from_location: e.target.value }))} placeholder="Store" /></div>
                <div><Label>To Location</Label><Input value={moveForm.to_location} onChange={e => setMoveForm(f => ({ ...f, to_location: e.target.value }))} placeholder="Production Floor" /></div>
              </div>
              <Button onClick={() => recordMove.mutate(moveForm)} disabled={!moveForm.barcode || recordMove.isPending}>
                {recordMove.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Log Movement
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Barcode</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
            <TableBody>
              {(movements as any[]).slice(0, 100).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{m.created_at ? new Date(m.created_at).toLocaleString("en-IN") : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{m.barcode}</TableCell>
                  <TableCell><Badge className={`text-xs ${MOVE_COLOR[m.movement_type] || "bg-gray-100"}`}>{m.movement_type?.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-right">{Number(m.quantity).toFixed(3)}</TableCell>
                  <TableCell className="text-xs">{m.from_location || "—"}</TableCell>
                  <TableCell className="text-xs">{m.to_location || "—"}</TableCell>
                  <TableCell className="text-xs">{m.reference_no || "—"}</TableCell>
                </TableRow>
              ))}
              {(movements as any[]).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No movements recorded yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="registry">
          <Table>
            <TableHeader><TableRow><TableHead>Barcode</TableHead><TableHead>Item Type</TableHead><TableHead>Item Name</TableHead><TableHead>Item ID</TableHead><TableHead>Registered At</TableHead></TableRow></TableHeader>
            <TableBody>
              {(registry as any[]).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.barcode}</TableCell>
                  <TableCell><Badge variant="outline">{r.item_type}</Badge></TableCell>
                  <TableCell>{r.item_name || "—"}</TableCell>
                  <TableCell>{r.item_id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                </TableRow>
              ))}
              {(registry as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No barcodes registered</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Barcode / QR Code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Barcode / QR String</Label><Input value={regForm.barcode} onChange={e => setRegForm(f => ({ ...f, barcode: e.target.value }))} className="font-mono" placeholder="Scan or type" /></div>
            <div><Label>Item Type</Label>
              <Select value={regForm.item_type} onValueChange={v => setRegForm(f => ({ ...f, item_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="raw_material">Raw Material</SelectItem><SelectItem value="finished_goods">Finished Goods</SelectItem><SelectItem value="grn">GRN</SelectItem><SelectItem value="work_order">Work Order</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Item ID</Label><Input type="number" value={regForm.item_id} onChange={e => setRegForm(f => ({ ...f, item_id: e.target.value }))} /></div>
            <div><Label>Item Name (label)</Label><Input value={regForm.item_name} onChange={e => setRegForm(f => ({ ...f, item_name: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button onClick={() => registerBarcode.mutate(regForm)} disabled={!regForm.barcode || !regForm.item_id || registerBarcode.isPending}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
