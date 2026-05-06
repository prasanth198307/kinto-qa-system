import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Warehouse, ArrowRightLeft, Package, Scale, Pencil } from "lucide-react";

// ─── Warehouses Tab ────────────────────────────────────────────────────────────
function WarehousesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", city: "", state: "", isDefault: false });
  const { data: warehouses = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/inventory/warehouses"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/inventory/warehouses/${editing.id}`, d)
      : apiRequest("POST", "/api/inventory/warehouses", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] }); toast({ title: editing ? "Warehouse updated" : "Warehouse created" }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/warehouses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/warehouses"] }); toast({ title: "Deleted" }); },
  });

  const openNew = () => { setEditing(null); setForm({ name: "", code: "", address: "", city: "", state: "", isDefault: false }); setDialogOpen(true); };
  const openEdit = (w: any) => { setEditing(w); setForm({ name: w.name, code: w.code || "", address: w.address || "", city: w.city || "", state: w.state || "", isDefault: w.is_default }); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} data-testid="button-new-warehouse"><Plus className="w-4 h-4 mr-1" />Add Warehouse</Button>
      </div>
      {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : warehouses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Warehouse className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No warehouses configured</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {warehouses.map((w: any) => (
            <Card key={w.id} data-testid={`card-warehouse-${w.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    {w.code && <p className="text-xs text-muted-foreground">Code: {w.code}</p>}
                    {(w.city || w.state) && <p className="text-xs text-muted-foreground">{[w.city, w.state].filter(Boolean).join(", ")}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {w.is_default && <Badge variant="default" className="text-xs">Default</Badge>}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(w.id)} data-testid={`button-delete-warehouse-${w.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Warehouse" : "New Warehouse"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-warehouse-name" /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} />
              <label htmlFor="isDefault" className="text-sm">Set as default warehouse</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} data-testid="button-save-warehouse">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stock Transfers Tab ──────────────────────────────────────────────────────
function StockTransfersTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fromWarehouseId: "", toWarehouseId: "", transferDate: new Date().toISOString().split("T")[0], referenceNo: "", notes: "" });
  const [lineItems, setLineItems] = useState([{ itemId: "", itemName: "", quantity: "", uom: "" }]);
  const { data: warehouses = [] } = useQuery<any[]>({ queryKey: ["/api/inventory/warehouses"] });
  const { data: rawMaterials = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: td } = useQuery<any>({ queryKey: ["/api/inventory/stock-transfers"] });
  const transfers = td?.transfers || [];
  const tItems = td?.items || [];

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inventory/stock-transfers", {
      fromWarehouseId: form.fromWarehouseId ? Number(form.fromWarehouseId) : null,
      toWarehouseId: Number(form.toWarehouseId), transferDate: form.transferDate,
      referenceNo: form.referenceNo || null, notes: form.notes || null,
      items: lineItems.filter(i => i.itemId && i.quantity).map(i => ({ ...i, quantity: Number(i.quantity) })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-transfers"] }); toast({ title: "Transfer completed" }); setDialogOpen(false); setLineItems([{ itemId: "", itemName: "", quantity: "", uom: "" }]); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addLine = () => setLineItems(p => [...p, { itemId: "", itemName: "", quantity: "", uom: "" }]);
  const removeLine = (i: number) => setLineItems(p => p.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-transfer"><Plus className="w-4 h-4 mr-1" />New Transfer</Button>
      </div>
      {transfers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No stock transfers yet</p></div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t: any) => {
            const items = tItems.filter((i: any) => i.transfer_id === t.id);
            return (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium">{t.from_warehouse_name || "External"} → {t.to_warehouse_name}</p>
                      <p className="text-sm text-muted-foreground">{new Date(t.transfer_date).toLocaleDateString("en-IN")}{t.reference_no ? ` · Ref: ${t.reference_no}` : ""}</p>
                    </div>
                    <Badge variant="default">{t.status}</Badge>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {items.map((it: any) => <p key={it.id} className="text-sm text-muted-foreground">{it.item_name || it.item_id} — {it.quantity} {it.uom || ""}</p>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>From Warehouse</Label>
                <Select value={form.fromWarehouseId||"__none__"} onValueChange={v => setForm(p => ({ ...p, fromWarehouseId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="External / New Stock" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">External / New Stock</SelectItem>
                    {(warehouses as any[]).map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Warehouse <span className="text-destructive">*</span></Label>
                <Select value={form.toWarehouseId} onValueChange={v => setForm(p => ({ ...p, toWarehouseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>{(warehouses as any[]).map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Transfer Date</Label><Input type="date" value={form.transferDate} onChange={e => setForm(p => ({ ...p, transferDate: e.target.value }))} /></div>
              <div><Label>Reference No</Label><Input value={form.referenceNo} onChange={e => setForm(p => ({ ...p, referenceNo: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" />Add</Button>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select value={item.itemId} onValueChange={v => {
                    const mat = (rawMaterials as any[]).find((m: any) => String(m.id) === v);
                    setLineItems(p => p.map((it, i) => i === idx ? { ...it, itemId: v, itemName: mat?.name || "", uom: mat?.unit || "" } : it));
                  }}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>{(rawMaterials as any[]).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="w-24" type="number" placeholder="Qty" value={item.quantity} onChange={e => setLineItems(p => p.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} />
                  <Input className="w-20" placeholder="UOM" value={item.uom} onChange={e => setLineItems(p => p.map((it, i) => i === idx ? { ...it, uom: e.target.value } : it))} />
                  {lineItems.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeLine(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.toWarehouseId} data-testid="button-save-transfer">
                {saveMutation.isPending ? "Processing..." : "Complete Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── UOM Conversions Tab ──────────────────────────────────────────────────────
function UOMConversionsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fromUom: "", toUom: "", factor: "" });
  const { data: conversions = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/inventory/uom-conversions"] });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inventory/uom-conversions", { fromUom: form.fromUom, toUom: form.toUom, factor: parseFloat(form.factor) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/uom-conversions"] }); toast({ title: "Conversion added" }); setDialogOpen(false); setForm({ fromUom: "", toUom: "", factor: "" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/uom-conversions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/uom-conversions"] }); toast({ title: "Deleted" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-uom"><Plus className="w-4 h-4 mr-1" />Add Conversion</Button>
      </div>
      {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : conversions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Scale className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No UOM conversions defined</p><p className="text-xs mt-1">Example: 1 kg = 1000 g</p></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="text-left p-3">From UOM</th><th className="text-left p-3">Factor</th><th className="text-left p-3">To UOM</th><th className="p-3"></th></tr></thead>
              <tbody>
                {(conversions as any[]).map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-mono font-medium">1 {c.from_uom}</td>
                    <td className="p-3 text-muted-foreground">= {c.factor}</td>
                    <td className="p-3 font-mono">{c.to_uom}</td>
                    <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add UOM Conversion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Define: 1 [From UOM] = [Factor] [To UOM]</p>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>From UOM</Label><Input value={form.fromUom} onChange={e => setForm(p => ({ ...p, fromUom: e.target.value }))} placeholder="kg" /></div>
              <div><Label>Factor</Label><Input type="number" value={form.factor} onChange={e => setForm(p => ({ ...p, factor: e.target.value }))} placeholder="1000" /></div>
              <div><Label>To UOM</Label><Input value={form.toUom} onChange={e => setForm(p => ({ ...p, toUom: e.target.value }))} placeholder="g" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.fromUom || !form.toUom || !form.factor} data-testid="button-save-uom">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Serial / Lot Tab ─────────────────────────────────────────────────────────
function SerialLotTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ itemId: "", serialNumber: "", lotNumber: "", batchNumber: "", manufacturedDate: "", expiryDate: "", quantity: "1", warehouseId: "" });
  const { data: register = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/inventory/serial-lot-register"] });
  const { data: rawMaterials = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: warehouses = [] } = useQuery<any[]>({ queryKey: ["/api/inventory/warehouses"] });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inventory/serial-lot-register", {
      itemId: form.itemId, serialNumber: form.serialNumber || null, lotNumber: form.lotNumber || null,
      batchNumber: form.batchNumber || null, manufacturedDate: form.manufacturedDate || null,
      expiryDate: form.expiryDate || null, quantity: Number(form.quantity), warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/serial-lot-register"] }); toast({ title: "Registered" }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/inventory/serial-lot-register/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory/serial-lot-register"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-serial"><Plus className="w-4 h-4 mr-1" />Register Serial/Lot</Button>
      </div>
      {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : register.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No serial/lot records yet</p></div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Item</th><th className="text-left p-3">Serial No</th>
                  <th className="text-left p-3">Lot/Batch</th><th className="text-left p-3">Mfg Date</th>
                  <th className="text-left p-3">Expiry</th><th className="text-left p-3">Warehouse</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(register as any[]).map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.item_name || r.item_id}</td>
                    <td className="p-3 font-mono text-xs">{r.serial_number || "—"}</td>
                    <td className="p-3 text-xs">{[r.lot_number, r.batch_number].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="p-3 text-xs">{r.manufactured_date ? new Date(r.manufactured_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="p-3 text-xs">{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="p-3 text-xs">{r.warehouse_name || "—"}</td>
                    <td className="p-3">
                      <Select value={r.status} onValueChange={v => statusMutation.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["in_stock", "consumed", "returned", "scrapped"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register Serial / Lot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item <span className="text-destructive">*</span></Label>
              <Select value={form.itemId} onValueChange={v => setForm(p => ({ ...p, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{(rawMaterials as any[]).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} /></div>
              <div><Label>Lot Number</Label><Input value={form.lotNumber} onChange={e => setForm(p => ({ ...p, lotNumber: e.target.value }))} /></div>
              <div><Label>Batch Number</Label><Input value={form.batchNumber} onChange={e => setForm(p => ({ ...p, batchNumber: e.target.value }))} /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              <div><Label>Mfg Date</Label><Input type="date" value={form.manufacturedDate} onChange={e => setForm(p => ({ ...p, manufacturedDate: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={v => setForm(p => ({ ...p, warehouseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>{(warehouses as any[]).map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.itemId} data-testid="button-save-serial">
                {saveMutation.isPending ? "Saving..." : "Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WarehousesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Warehouses & Stock</h1>
        <p className="text-sm text-muted-foreground">Multi-location inventory, stock transfers, serial/lot tracking, UOM conversions</p>
      </div>
      <Tabs defaultValue="warehouses">
        <TabsList className="flex-wrap">
          <TabsTrigger value="warehouses" data-testid="tab-warehouses"><Warehouse className="w-4 h-4 mr-1" />Warehouses</TabsTrigger>
          <TabsTrigger value="transfers" data-testid="tab-transfers"><ArrowRightLeft className="w-4 h-4 mr-1" />Stock Transfers</TabsTrigger>
          <TabsTrigger value="serial-lot" data-testid="tab-serial-lot"><Package className="w-4 h-4 mr-1" />Serial / Lot</TabsTrigger>
          <TabsTrigger value="uom" data-testid="tab-uom"><Scale className="w-4 h-4 mr-1" />UOM Conversions</TabsTrigger>
        </TabsList>
        <TabsContent value="warehouses" className="mt-4"><WarehousesTab /></TabsContent>
        <TabsContent value="transfers" className="mt-4"><StockTransfersTab /></TabsContent>
        <TabsContent value="serial-lot" className="mt-4"><SerialLotTab /></TabsContent>
        <TabsContent value="uom" className="mt-4"><UOMConversionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
