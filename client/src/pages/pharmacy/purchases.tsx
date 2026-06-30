import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface PO { id: number; po_number: string; supplier: string; items_count: number; total: number; status: string; expected_delivery: string; created_at: string; }
interface POItem { drug_id: string; drug_name: string; qty: number; rate: number; }

const statusColors: Record<string, string> = { draft: "secondary", ordered: "outline", received: "default" };

export default function PharmacyPurchases() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newPOOpen, setNewPOOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [supplier, setSupplier] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [poItems, setPOItems] = useState<POItem[]>([{ drug_id: "", drug_name: "", qty: 1, rate: 0 }]);
  const [grnItems, setGrnItems] = useState<any[]>([]);

  const { data: purchases = [], isLoading } = useQuery<PO[]>({
    queryKey: ["pharmacy-purchases"],
    queryFn: () => api("GET", "/api/pharmacy/purchases"),
  });

  const createPO = useMutation({
    mutationFn: (data: any) => api("POST", "/api/pharmacy/purchases", data),
    onSuccess: () => {
      toast({ title: "Purchase order created" });
      qc.invalidateQueries({ queryKey: ["pharmacy-purchases"] });
      setNewPOOpen(false);
      setSupplier(""); setExpectedDelivery(""); setNotes("");
      setPOItems([{ drug_id: "", drug_name: "", qty: 1, rate: 0 }]);
    },
    onError: () => toast({ title: "Failed to create PO", variant: "destructive" }),
  });

  const receiveGRN = useMutation({
    mutationFn: ({ id, items }: { id: number; items: any[] }) => api("PUT", `/api/pharmacy/purchases/${id}/receive`, { items }),
    onSuccess: () => {
      toast({ title: "GRN recorded — stock updated" });
      qc.invalidateQueries({ queryKey: ["pharmacy-purchases"] });
      setGrnOpen(false);
      setSelectedPO(null);
    },
    onError: () => toast({ title: "Failed to record GRN", variant: "destructive" }),
  });

  const addPOItem = () => setPOItems([...poItems, { drug_id: "", drug_name: "", qty: 1, rate: 0 }]);
  const removePOItem = (i: number) => setPOItems(poItems.filter((_, idx) => idx !== i));
  const updatePOItem = (i: number, k: string, v: any) => setPOItems(poItems.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const openGRN = (po: PO) => {
    setSelectedPO(po);
    setGrnItems([{ drug_name: "", batch_number: "", expiry_date: "", qty_received: 0, mrp: 0 }]);
    setGrnOpen(true);
  };

  const total = poItems.reduce((s, i) => s + i.qty * i.rate, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Management</h1>
        <Button onClick={() => setNewPOOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Purchase Order</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Items</TableHead>
                <TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Expected</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>}
              {!isLoading && Array.isArray(purchases) && purchases.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No purchase orders</TableCell></TableRow>}
              {Array.isArray(purchases) && purchases.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono">{po.po_number}</TableCell>
                  <TableCell>{po.supplier}</TableCell>
                  <TableCell>{po.items_count}</TableCell>
                  <TableCell>₹{Number(po.total).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={(statusColors[po.status] || "outline") as any} className="capitalize">{po.status}</Badge></TableCell>
                  <TableCell>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    {po.status !== "received" && (
                      <Button variant="outline" size="sm" onClick={() => openGRN(po)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Receive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={newPOOpen} onOpenChange={setNewPOOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Supplier *</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
              <div className="space-y-1"><Label>Expected Delivery</Label><Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Items</Label><Button variant="outline" size="sm" onClick={addPOItem}><Plus className="h-4 w-4" /> Add Item</Button></div>
              {poItems.map((item, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                  <Input className="col-span-2" placeholder="Drug name" value={item.drug_name} onChange={(e) => updatePOItem(i, "drug_name", e.target.value)} />
                  <Input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updatePOItem(i, "qty", Number(e.target.value))} />
                  <Input type="number" placeholder="Rate ₹" value={item.rate} onChange={(e) => updatePOItem(i, "rate", Number(e.target.value))} />
                  <Button variant="ghost" size="sm" onClick={() => removePOItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <div className="text-right font-medium mt-2">Total: ₹{total.toFixed(2)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPOOpen(false)}>Cancel</Button>
            <Button onClick={() => createPO.mutate({ supplier, expected_delivery: expectedDelivery, notes, items: poItems, total })} disabled={createPO.isPending || !supplier}>
              {createPO.isPending ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Goods Receipt Note — {selectedPO?.po_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setGrnItems([...grnItems, { drug_name: "", batch_number: "", expiry_date: "", qty_received: 0, mrp: 0 }])}><Plus className="h-4 w-4" /> Add Row</Button></div>
            {grnItems.map((row, i) => (
              <div key={i} className="grid grid-cols-5 gap-2">
                <Input placeholder="Drug name" value={row.drug_name} onChange={(e) => setGrnItems(grnItems.map((r, idx) => idx === i ? { ...r, drug_name: e.target.value } : r))} />
                <Input placeholder="Batch" value={row.batch_number} onChange={(e) => setGrnItems(grnItems.map((r, idx) => idx === i ? { ...r, batch_number: e.target.value } : r))} />
                <Input type="date" value={row.expiry_date} onChange={(e) => setGrnItems(grnItems.map((r, idx) => idx === i ? { ...r, expiry_date: e.target.value } : r))} />
                <Input type="number" placeholder="Qty" value={row.qty_received} onChange={(e) => setGrnItems(grnItems.map((r, idx) => idx === i ? { ...r, qty_received: Number(e.target.value) } : r))} />
                <Input type="number" placeholder="MRP ₹" value={row.mrp} onChange={(e) => setGrnItems(grnItems.map((r, idx) => idx === i ? { ...r, mrp: Number(e.target.value) } : r))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrnOpen(false)}>Cancel</Button>
            <Button onClick={() => selectedPO && receiveGRN.mutate({ id: selectedPO.id, items: grnItems })} disabled={receiveGRN.isPending}>
              {receiveGRN.isPending ? "Saving..." : "Confirm Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
