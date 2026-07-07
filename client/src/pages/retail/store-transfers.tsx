import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Trash2 } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const STATUS_BADGE: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  draft: "secondary", in_transit: "default", received: "outline", partially_received: "destructive", cancelled: "destructive",
};
const BLANK_ITEM = { product_id: "", product_name: "", sku: "", requested_qty: "", unit_cost: "" };

export default function RetailStoreTransfersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"dispatch" | "receive" | null>(null);
  const [form, setForm] = useState<any>({ from_store_id: "", from_store_name: "", to_store_id: "", to_store_name: "", expected_arrival: "", dispatch_notes: "" });
  const [items, setItems] = useState<any[]>([{ ...BLANK_ITEM }]);
  const [qtyEdits, setQtyEdits] = useState<Record<number, string>>({});

  const { data: transfers = [] } = useQuery<any[]>({ queryKey: ["retail-transfers"], queryFn: () => api("GET", "/api/pos/store-transfers") });
  const { data: viewItems = [] } = useQuery<any[]>({
    queryKey: ["retail-transfer-items", viewId],
    queryFn: () => api("GET", `/api/pos/store-transfers/${viewId}/items`),
    enabled: !!viewId,
  });

  const createMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/store-transfers", { ...form, items: items.filter(i => i.product_id).map(i => ({ ...i, product_id: Number(i.product_id), requested_qty: Number(i.requested_qty), unit_cost: Number(i.unit_cost || 0) })) }),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["retail-transfers"] }); setOpen(false); setItems([{ ...BLANK_ITEM }]); toast({ title: `Transfer ${d.transfer_no} created` }); },
  });
  const dispatchMut = useMutation({
    mutationFn: () => api("POST", `/api/pos/store-transfers/${viewId}/dispatch`, {
      dispatched_items: viewItems.map((i: any) => ({ transfer_item_id: i.id, dispatched_qty: Number(qtyEdits[i.id] ?? i.requested_qty) })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-transfers"] }); setViewId(null); setViewMode(null); toast({ title: "Dispatched — stock deducted from source store" }); },
  });
  const receiveMut = useMutation({
    mutationFn: () => api("POST", `/api/pos/store-transfers/${viewId}/receive`, {
      received_items: viewItems.map((i: any) => ({ transfer_item_id: i.id, received_qty: Number(qtyEdits[i.id] ?? i.dispatched_qty) })),
    }),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["retail-transfers"] }); setViewId(null); setViewMode(null); toast({ title: d.has_shortage ? "Received with shortage — review items" : "Received — stock added at destination" }); },
  });
  const cancelMut = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/pos/store-transfers/${id}/cancel`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-transfers"] }); toast({ title: "Transfer cancelled" }); },
  });

  const setItem = (idx: number, k: string, v: string) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  const viewTransfer = transfers.find((t: any) => t.id === viewId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Truck className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">Store Transfer Orders</h1></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />New Transfer</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Transfer No.</TableHead><TableHead>From → To</TableHead><TableHead>Date</TableHead>
            <TableHead>Items</TableHead><TableHead>Qty</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {transfers.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.transfer_no}</TableCell>
                <TableCell className="text-sm">{t.from_store_name || `#${t.from_store_id}`} → {t.to_store_name || `#${t.to_store_id}`}</TableCell>
                <TableCell className="text-sm">{String(t.transfer_date).slice(0, 10)}</TableCell>
                <TableCell>{t.line_count ?? t.total_items}</TableCell>
                <TableCell>{Number(t.total_qty)}</TableCell>
                <TableCell>{fmt(t.total_value)}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[t.status] || "secondary"}>{t.status.replace("_", " ")}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {t.status === "draft" && <Button size="sm" variant="outline" onClick={() => { setViewId(t.id); setViewMode("dispatch"); setQtyEdits({}); }}>Dispatch</Button>}
                    {t.status === "in_transit" && <Button size="sm" variant="outline" onClick={() => { setViewId(t.id); setViewMode("receive"); setQtyEdits({}); }}>Receive</Button>}
                    {!["received", "cancelled"].includes(t.status) && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelMut.mutate(t.id)}><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!transfers.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No transfers yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Store Transfer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">From Store ID</Label><Input type="number" value={form.from_store_id} onChange={e => setForm((p: any) => ({ ...p, from_store_id: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">From Store Name</Label><Input value={form.from_store_name} onChange={e => setForm((p: any) => ({ ...p, from_store_name: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">To Store ID</Label><Input type="number" value={form.to_store_id} onChange={e => setForm((p: any) => ({ ...p, to_store_id: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">To Store Name</Label><Input value={form.to_store_name} onChange={e => setForm((p: any) => ({ ...p, to_store_name: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">Expected Arrival</Label><Input type="date" value={form.expected_arrival} onChange={e => setForm((p: any) => ({ ...p, expected_arrival: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.dispatch_notes} onChange={e => setForm((p: any) => ({ ...p, dispatch_notes: e.target.value }))} className="h-8" /></div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-semibold">Items</Label>
              <Button size="sm" variant="outline" onClick={() => setItems(p => [...p, { ...BLANK_ITEM }])}><Plus className="w-3 h-3" /></Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 mb-1">
                <Input placeholder="Product ID" type="number" value={it.product_id} onChange={e => setItem(idx, "product_id", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Name" value={it.product_name} onChange={e => setItem(idx, "product_name", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="SKU" value={it.sku} onChange={e => setItem(idx, "sku", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Qty" type="number" value={it.requested_qty} onChange={e => setItem(idx, "requested_qty", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Unit Cost" type="number" value={it.unit_cost} onChange={e => setItem(idx, "unit_cost", e.target.value)} className="h-8 text-sm" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.from_store_id || !form.to_store_id}>Create Transfer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={() => { setViewId(null); setViewMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{viewMode === "dispatch" ? "Dispatch" : "Receive"} — {viewTransfer?.transfer_no}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Requested</TableHead>{viewMode === "receive" && <TableHead>Dispatched</TableHead>}<TableHead>{viewMode === "dispatch" ? "Dispatch Qty" : "Received Qty"}</TableHead></TableRow></TableHeader>
            <TableBody>
              {viewItems.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{i.product_name || i.product_name_resolved || `#${i.product_id}`}</TableCell>
                  <TableCell>{Number(i.requested_qty)}</TableCell>
                  {viewMode === "receive" && <TableCell>{Number(i.dispatched_qty)}</TableCell>}
                  <TableCell>
                    <Input type="number" className="h-8 w-24" value={qtyEdits[i.id] ?? String(viewMode === "dispatch" ? i.requested_qty : i.dispatched_qty)} onChange={e => setQtyEdits(p => ({ ...p, [i.id]: e.target.value }))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => { setViewId(null); setViewMode(null); }}>Cancel</Button>
            {viewMode === "dispatch" && <Button onClick={() => dispatchMut.mutate()} disabled={dispatchMut.isPending}>Dispatch + Deduct Stock</Button>}
            {viewMode === "receive" && <Button onClick={() => receiveMut.mutate()} disabled={receiveMut.isPending}>Receive + Add Stock</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
