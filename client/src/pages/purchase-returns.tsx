import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PackageX, Plus, Trash2, Loader2, IndianRupee, CheckCircle2, Clock } from "lucide-react";

const RETURN_REASONS = ["quality_issue", "excess_quantity", "wrong_item", "damaged", "other"];
const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending:    { label: "Pending",    variant: "outline" },
  approved:   { label: "Approved",   variant: "default" },
  dispatched: { label: "Dispatched", variant: "secondary" },
  credited:   { label: "Credited",   variant: "secondary" },
};

type PurchaseReturn = {
  id: string; returnNumber: string; returnDate: string; vendorName: string;
  returnReason: string; status: string; totalAmount: number; remarks?: string;
  purchaseOrderId?: string; vendorId?: string;
};

export default function PurchaseReturnsPage() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: returns = [], isLoading } = useQuery<PurchaseReturn[]>({ queryKey: ["/api/purchase-returns"] });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });
  const { data: rawMaterials = [] } = useQuery<any[]>({ queryKey: ["/api/raw-materials"] });
  const { data: purchaseOrders = [] } = useQuery<any[]>({ queryKey: ["/api/purchase-orders"] });

  type Item = { rawMaterialId: string; itemName: string; quantity: string; unitPrice: string };
  const [form, setForm] = useState({ returnDate: format(new Date(), "yyyy-MM-dd"), vendorId: "", vendorName: "", purchaseOrderId: "", returnReason: "", remarks: "" });
  const [items, setItems] = useState<Item[]>([{ rawMaterialId: "", itemName: "", quantity: "", unitPrice: "" }]);

  const addItemRow = () => setItems(prev => [...prev, { rawMaterialId: "", itemName: "", quantity: "", unitPrice: "" }]);
  const removeItemRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof Item, value: string) => setItems(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const pending = returns.filter(r => r.status === "pending");
  const approved = returns.filter(r => ["approved", "dispatched"].includes(r.status));
  const all = returns;

  const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const addMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(it => it.itemName && it.quantity && it.unitPrice);
      const totalAmount = validItems.reduce((sum, it) => sum + Math.round(parseInt(it.quantity) * parseFloat(it.unitPrice) * 100), 0);
      const res = await apiRequest("POST", "/api/purchase-returns", {
        ...form,
        totalAmount,
        items: validItems.map(it => ({
          rawMaterialId: it.rawMaterialId || null,
          itemName: it.itemName,
          quantity: parseInt(it.quantity),
          unitPrice: Math.round(parseFloat(it.unitPrice) * 100),
          totalAmount: Math.round(parseInt(it.quantity) * parseFloat(it.unitPrice) * 100),
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] });
      toast({ title: "Purchase return created" });
      setAddOpen(false);
      setForm({ returnDate: format(new Date(), "yyyy-MM-dd"), vendorId: "", vendorName: "", purchaseOrderId: "", returnReason: "", remarks: "" });
      setItems([{ rawMaterialId: "", itemName: "", quantity: "", unitPrice: "" }]);
    },
    onError: (e: any) => toast({ title: "Failed to create return", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/purchase-returns/${id}`, { status });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] }); toast({ title: "Status updated" }); setApproveId(null); },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const ReturnsTable = ({ items: rows }: { items: PurchaseReturn[] }) => (
    rows.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground text-sm"><PackageX className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No purchase returns found.</p></div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Return No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
            return (
              <TableRow key={r.id} data-testid={`row-return-${r.id}`}>
                <TableCell className="font-medium">{r.returnNumber}</TableCell>
                <TableCell>{r.returnDate ? format(new Date(r.returnDate), "dd MMM yyyy") : "-"}</TableCell>
                <TableCell>{r.vendorName}</TableCell>
                <TableCell className="capitalize">{(r.returnReason ?? "").replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right">{fmt(r.totalAmount ?? 0)}</TableCell>
                <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "approved" })} disabled={updateStatusMutation.isPending} data-testid={`button-approve-return-${r.id}`}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                  )}
                  {r.status === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "dispatched" })} disabled={updateStatusMutation.isPending} data-testid={`button-dispatch-return-${r.id}`}>
                      Mark Dispatched
                    </Button>
                  )}
                  {r.status === "dispatched" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "credited" })} disabled={updateStatusMutation.isPending} data-testid={`button-credit-return-${r.id}`}>
                      Mark Credited
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PackageX className="h-6 w-6 text-primary" />Purchase Returns</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track goods returned to vendors with full workflow</p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="button-add-purchase-return"><Plus className="h-4 w-4 mr-2" />New Return</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Returns", value: all.length, icon: <PackageX className="h-5 w-5" /> },
          { label: "Pending", value: pending.length, icon: <Clock className="h-5 w-5 text-amber-500" /> },
          { label: "Approved", value: approved.length, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
          { label: "Total Value", value: all.reduce((s, r) => s + (r.totalAmount ?? 0), 0), isAmount: true, icon: <IndianRupee className="h-5 w-5 text-blue-500" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.isAmount ? fmt(s.value as number) : s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">In Progress</TabsTrigger>
          <TabsTrigger value="all">All Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4"><Card><CardContent className="p-0">{isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : <ReturnsTable items={pending} />}</CardContent></Card></TabsContent>
        <TabsContent value="approved" className="mt-4"><Card><CardContent className="p-0"><ReturnsTable items={approved} /></CardContent></Card></TabsContent>
        <TabsContent value="all" className="mt-4"><Card><CardContent className="p-0"><ReturnsTable items={all} /></CardContent></Card></TabsContent>
      </Tabs>

      {/* Add Return Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-return">
          <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Return Date *</Label>
                <Input type="date" value={form.returnDate} onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))} data-testid="input-return-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Return Reason *</Label>
                <Select value={form.returnReason} onValueChange={v => setForm(f => ({ ...f, returnReason: v }))}>
                  <SelectTrigger data-testid="select-return-reason"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor *</Label>
              <Select value={form.vendorId} onValueChange={v => {
                const vnd = vendors.find((vd: any) => vd.id === v);
                setForm(f => ({ ...f, vendorId: v, vendorName: vnd?.vendorName || "" }));
              }}>
                <SelectTrigger data-testid="select-return-vendor"><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked Purchase Order (optional)</Label>
              <Select value={form.purchaseOrderId} onValueChange={v => setForm(f => ({ ...f, purchaseOrderId: v }))}>
                <SelectTrigger data-testid="select-return-po"><SelectValue placeholder="Select PO..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {purchaseOrders.filter((po: any) => !form.vendorId || po.vendorId === form.vendorId).map((po: any) => (
                    <SelectItem key={po.id} value={po.id}>PO-{po.poNumber || po.id.slice(-6)} — {po.vendorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label>Items Being Returned</Label>
                <Button size="sm" variant="outline" onClick={addItemRow} data-testid="button-add-return-item"><Plus className="h-3 w-3 mr-1" />Add Row</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                      {i === 0 && <Label className="text-xs text-muted-foreground">Item Name</Label>}
                      <Input placeholder="Item name" value={item.itemName} onChange={e => updateItem(i, "itemName", e.target.value)} data-testid={`input-return-item-name-${i}`} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      {i === 0 && <Label className="text-xs text-muted-foreground">Raw Material</Label>}
                      <Select value={item.rawMaterialId} onValueChange={v => {
                        const rm = rawMaterials.find((r: any) => r.id === v);
                        updateItem(i, "rawMaterialId", v);
                        if (rm) updateItem(i, "itemName", rm.name);
                      }}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Link RM..." /></SelectTrigger>
                        <SelectContent>{rawMaterials.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      {i === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                      <Input type="number" min="1" placeholder="0" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} data-testid={`input-return-qty-${i}`} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      {i === 0 && <Label className="text-xs text-muted-foreground">Rate (₹)</Label>}
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", e.target.value)} data-testid={`input-return-rate-${i}`} />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button size="icon" variant="outline" onClick={() => removeItemRow(i)} data-testid={`button-remove-return-item-${i}`}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} data-testid="input-return-remarks" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.vendorId || !form.returnReason || addMutation.isPending} data-testid="button-save-return">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
